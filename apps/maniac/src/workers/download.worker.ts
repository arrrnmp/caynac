import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { parentPort, workerData } from 'node:worker_threads';

interface DownloadWorkerPayload {
  url: string;
  destDir: string;
  filename: string;
  expectedBytes?: number;
}

interface DownloadProgress {
  filename: string;
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
  speed: number;
}

const PROGRESS_EMIT_MS = 150;
const WRITE_HIGH_WATER_MARK = 1024 * 1024;

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isErrno(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === code
  );
}

function emitProgress(
  filename: string,
  bytesReceived: number,
  totalBytes: number,
  startedAt: number,
  lastEmitAtRef: { value: number },
  force = false,
) {
  const now = Date.now();
  if (!force && now - lastEmitAtRef.value < PROGRESS_EMIT_MS) return;
  lastEmitAtRef.value = now;
  const elapsed = (now - startedAt) / 1000;
  const speed = elapsed > 0 ? bytesReceived / elapsed : 0;
  const percentage = totalBytes > 0 ? (bytesReceived / totalBytes) * 100 : 0;
  const progress: DownloadProgress = { filename, bytesReceived, totalBytes, percentage, speed };
  parentPort?.postMessage({ type: 'progress', progress });
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

async function downloadWithFetch(
  url: string,
  destDir: string,
  filename: string,
  expectedBytes = 0,
): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, filename);
  const file = fs.createWriteStream(dest, { highWaterMark: WRITE_HIGH_WATER_MARK });

  const startedAt = Date.now();
  const lastEmitAtRef = { value: 0 };
  let bytesReceived = 0;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download request failed with status code ${response.status}`);
    }

    const contentLength = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
    const totalBytes = contentLength > 0 ? contentLength : expectedBytes;
    const body = response.body;
    if (!body) throw new Error('Download response has no body');

    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      bytesReceived += value.byteLength;
      await writeChunk(file, value);
      emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef);
    }

    await closeStream(file);
    emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef, true);
    return dest;
  } catch (err) {
    file.destroy();
    await fs.promises.unlink(dest).catch(() => {});
    throw err;
  }
}

async function downloadWithCurl(
  url: string,
  destDir: string,
  filename: string,
  expectedBytes = 0,
): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, filename);

  const startedAt = Date.now();
  const lastEmitAtRef = { value: 0 };
  const totalBytes = expectedBytes > 0 ? expectedBytes : 0;
  let bytesReceived = 0;

  let pollTimer: NodeJS.Timeout | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'curl',
        ['--location', '--fail', '--silent', '--show-error', '--output', dest, url],
        { stdio: ['ignore', 'ignore', 'pipe'] },
      );
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
        if (stderr.length > 5000) stderr = stderr.slice(-5000);
      });

      pollTimer = setInterval(() => {
        try {
          bytesReceived = fs.statSync(dest).size;
        } catch (err) {
          if (!isErrno(err, 'ENOENT')) {
            if (pollTimer) clearInterval(pollTimer);
            child.kill();
            finish(() => reject(err));
            return;
          }
          bytesReceived = 0;
        }
        emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef);
      }, PROGRESS_EMIT_MS);

      child.on('error', (err) => finish(() => reject(err)));
      child.on('exit', (code, signal) => {
        if (code === 0) {
          finish(() => resolve());
          return;
        }
        const detail = stderr.trim();
        if (detail) {
          finish(() => reject(new Error(detail)));
          return;
        }
        finish(() => reject(new Error(`curl exited with code ${code ?? 'null'}${signal ? ` (signal ${signal})` : ''}`)));
      });
    });

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = undefined;
    bytesReceived = fs.statSync(dest).size;
    emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef, true);
    return dest;
  } catch (err) {
    if (pollTimer) clearInterval(pollTimer);
    await fs.promises.unlink(dest).catch(() => {});
    throw err;
  }
}

async function downloadInWorker(
  url: string,
  destDir: string,
  filename: string,
  expectedBytes = 0,
): Promise<string> {
  if (process.platform === 'win32') {
    try {
      return await downloadWithCurl(url, destDir, filename, expectedBytes);
    } catch (err) {
      if (!isErrno(err, 'ENOENT')) throw err;
      return downloadWithFetch(url, destDir, filename, expectedBytes);
    }
  }

  return downloadWithFetch(url, destDir, filename, expectedBytes);
}

async function main() {
  const payload = workerData as DownloadWorkerPayload;
  const dest = await downloadInWorker(
    payload.url,
    payload.destDir,
    payload.filename,
    payload.expectedBytes ?? 0,
  );
  parentPort?.postMessage({
    type: 'done',
    result: { dest },
  });
}

void main().catch((err: unknown) => {
  parentPort?.postMessage({ type: 'error', message: toMessage(err) });
});
