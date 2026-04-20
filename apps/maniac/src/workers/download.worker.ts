import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { parentPort, workerData } from 'node:worker_threads';

interface DownloadWorkerPayload {
  url: string;
  destDir: string;
  filename: string;
}

interface DownloadProgress {
  filename: string;
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
  speed: number;
}

const PROGRESS_EMIT_MS = 150;
const MAX_REDIRECTS = 8;
const WRITE_HIGH_WATER_MARK = 1024 * 1024;

async function fetchWithRedirects(url: string, redirects = 0): Promise<Response> {
  const response = await fetch(url, { redirect: 'manual' });
  if (response.status === 301 || response.status === 302 || response.status === 303 || response.status === 307 || response.status === 308) {
    const location = response.headers.get('location');
    if (!location) throw new Error(`Redirect response (${response.status}) missing Location header`);
    if (redirects >= MAX_REDIRECTS) throw new Error(`Too many redirects while downloading ${url}`);
    return fetchWithRedirects(new URL(location, url).toString(), redirects + 1);
  }
  return response;
}

async function writeChunk(stream: fs.WriteStream, chunk: Uint8Array): Promise<void> {
  if (stream.write(chunk)) return;
  await once(stream, 'drain');
}

async function closeStream(stream: fs.WriteStream): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const handleError = (err: Error) => {
      stream.off('error', handleError);
      reject(err);
    };
    stream.on('error', handleError);
    stream.end(() => {
      stream.off('error', handleError);
      resolve();
    });
  });
}

async function downloadInWorker(url: string, destDir: string, filename: string): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, filename);
  const file = fs.createWriteStream(dest, { highWaterMark: WRITE_HIGH_WATER_MARK });

  const startTime = Date.now();
  let bytesReceived = 0;
  let totalBytes = 0;
  let lastProgressEmitAt = 0;

  const emitProgress = (force = false) => {
    const now = Date.now();
    if (!force && now - lastProgressEmitAt < PROGRESS_EMIT_MS) return;
    lastProgressEmitAt = now;
    const elapsed = (now - startTime) / 1000;
    const speed = elapsed > 0 ? bytesReceived / elapsed : 0;
    const percentage = totalBytes > 0 ? (bytesReceived / totalBytes) * 100 : 0;
    const progress: DownloadProgress = { filename, bytesReceived, totalBytes, percentage, speed };
    parentPort?.postMessage({ type: 'progress', progress });
  };

  try {
    const response = await fetchWithRedirects(url);
    if (!response.ok) {
      throw new Error(`Download request failed with status code ${response.status}`);
    }

    totalBytes = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
    const body = response.body;
    if (!body) throw new Error('Download response has no body');

    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      bytesReceived += value.byteLength;
      await writeChunk(file, value);
      emitProgress();
    }

    emitProgress(true);
    await closeStream(file);
    return dest;
  } catch (err) {
    file.destroy();
    await fs.promises.unlink(dest).catch(() => {});
    throw err;
  }
}

async function main() {
  const payload = workerData as DownloadWorkerPayload;
  const dest = await downloadInWorker(payload.url, payload.destDir, payload.filename);
  parentPort?.postMessage({
    type: 'done',
    result: { dest },
  });
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  parentPort?.postMessage({ type: 'error', message });
});
