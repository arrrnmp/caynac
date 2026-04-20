import fs from 'node:fs';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

export interface DownloadProgress {
  filename: string;
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes/sec
}

interface DownloadWorkerPayload {
  url: string;
  destDir: string;
  filename: string;
}

interface DownloadWorkerProgressMessage {
  type: 'progress';
  progress: DownloadProgress;
}

interface DownloadWorkerDoneMessage {
  type: 'done';
  result: {
    dest: string;
  };
}

interface DownloadWorkerErrorMessage {
  type: 'error';
  message: string;
}

type DownloadWorkerMessage =
  | DownloadWorkerProgressMessage
  | DownloadWorkerDoneMessage
  | DownloadWorkerErrorMessage;

function resolveWorkerUrl(): URL {
  const jsUrl = new URL('../workers/download.worker.js', import.meta.url);
  if (fs.existsSync(fileURLToPath(jsUrl))) return jsUrl;
  return new URL('../workers/download.worker.ts', import.meta.url);
}

export function downloadFile(
  url: string,
  destDir: string,
  filename: string,
  onProgress: (p: DownloadProgress) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(resolveWorkerUrl(), {
      workerData: { url, destDir, filename } as DownloadWorkerPayload,
    });
    let settled = false;

    const settle = (finalize: () => void) => {
      if (settled) return;
      settled = true;
      worker.off('message', handleMessage);
      worker.off('error', handleError);
      worker.off('exit', handleExit);
      void worker.terminate().catch(() => {});
      finalize();
    };

    const handleMessage = (message: unknown) => {
      if (!message || typeof message !== 'object') return;
      const msg = message as DownloadWorkerMessage;
      if (msg.type === 'progress') {
        onProgress(msg.progress);
        return;
      }
      if (msg.type === 'done') {
        settle(() => resolve(msg.result.dest));
        return;
      }
      if (msg.type === 'error') {
        settle(() => reject(new Error(msg.message)));
      }
    };

    const handleError = (err: Error) => {
      settle(() => reject(err));
    };

    const handleExit = (code: number) => {
      if (settled) return;
      if (code === 0) {
        settle(() => reject(new Error('Download worker exited before completion.')));
        return;
      }
      settle(() => reject(new Error(`Download worker exited with code ${code}`)));
    };

    worker.on('message', handleMessage);
    worker.on('error', handleError);
    worker.on('exit', handleExit);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}
