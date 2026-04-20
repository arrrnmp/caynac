import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
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

function downloadInWorker(
  url: string,
  destDir: string,
  filename: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const PROGRESS_EMIT_MS = 150;
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, filename);
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
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

    const req = protocol.get(url, (res) => {
      const statusCode = res.statusCode ?? 0;
      if ((statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) && res.headers.location) {
        const nextUrl = new URL(res.headers.location, url).toString();
        res.resume();
        file.close();
        fs.unlink(dest, () => {});
        downloadInWorker(nextUrl, destDir, filename)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`Download request failed with status code ${statusCode}`));
        return;
      }

      totalBytes = Number.parseInt(res.headers['content-length'] ?? '0', 10);

      res.on('data', (chunk: Buffer) => {
        bytesReceived += chunk.length;
        emitProgress();
      });

      res.pipe(file);

      file.on('finish', () => {
        emitProgress(true);
        file.close(() => resolve(dest));
      });
    });

    req.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
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
