import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
  expectedBytes?: number;
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

interface DownloadWorkerTransportMessage {
  type: 'transport';
  transport: string;
}

interface DownloadWorkerTransportErrorMessage {
  type: 'transport_error';
  transport: string;
  message: string;
}

interface DownloadWorkerDebugMessage {
  type: 'debug';
  message: string;
}

type DownloadWorkerMessage =
  | DownloadWorkerProgressMessage
  | DownloadWorkerDoneMessage
  | DownloadWorkerErrorMessage
  | DownloadWorkerTransportMessage
  | DownloadWorkerTransportErrorMessage
  | DownloadWorkerDebugMessage;

function isTransportDebugEnabled(): boolean {
  return process.env.MANIAC_DOWNLOAD_DEBUG_TRANSPORT === '1';
}

function isInsaneDebugEnabled(): boolean {
  return process.env.MANIAC_DOWNLOAD_INSANE_DEBUG === '1';
}

function resolveDownloadDebugLogPath(): string {
  const configured = process.env.MANIAC_DOWNLOAD_DEBUG_LOG?.trim();
  if (configured) return configured;
  if (isInsaneDebugEnabled()) {
    return path.join(os.homedir(), '.config', 'maniac', 'download-debug.log');
  }
  return path.join(os.homedir(), '.config', 'maniac', 'download-transport.log');
}

function appendDownloadDebugLog(line: string): void {
  try {
    const logPath = resolveDownloadDebugLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${line}\n`, 'utf8');
  } catch {
    // Keep download flow resilient even if debug logging fails.
  }
}

function isEntryPointModuleNotFound(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('ModuleNotFound') && message.includes('(entry point)');
}

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
  expectedBytes?: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const workerCandidates: Array<URL | string> = [
      resolveWorkerUrl(),
      './apps/maniac/src/workers/download.worker.ts',
    ];

    let candidateIndex = 0;
    let worker: Worker | undefined;
    let settled = false;

    const startWorker = () => {
      worker = new Worker(workerCandidates[candidateIndex]!, {
        workerData: { url, destDir, filename, expectedBytes } as DownloadWorkerPayload,
      });
      worker.on('message', handleMessage);
      worker.on('error', handleError);
      worker.on('exit', handleExit);
    };

    const switchToFallbackWorker = (reason: unknown): boolean => {
      if (settled) return false;
      if (!isEntryPointModuleNotFound(reason)) return false;
      if (candidateIndex + 1 >= workerCandidates.length) return false;

      if (worker) {
        worker.off('message', handleMessage);
        worker.off('error', handleError);
        worker.off('exit', handleExit);
        void worker.terminate().catch(() => {});
      }

      candidateIndex += 1;
      try {
        startWorker();
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        settle(() => reject(normalized));
      }
      return true;
    };

    const settle = (finalize: () => void) => {
      if (settled) return;
      settled = true;
      if (worker) {
        worker.off('message', handleMessage);
        worker.off('error', handleError);
        worker.off('exit', handleExit);
        void worker.terminate().catch(() => {});
      }
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
        return;
      }
      if (msg.type === 'transport') {
        if (isTransportDebugEnabled() || isInsaneDebugEnabled()) {
          appendDownloadDebugLog(
            `[maniac] pid=${process.pid} file=${filename} transport=${msg.transport}`,
          );
        }
        return;
      }
      if (msg.type === 'transport_error') {
        if (isInsaneDebugEnabled()) {
          appendDownloadDebugLog(
            `[maniac] pid=${process.pid} file=${filename} transport_error=${msg.transport} message=${msg.message}`,
          );
        }
        return;
      }
      if (msg.type === 'debug') {
        if (isInsaneDebugEnabled()) {
          appendDownloadDebugLog(`[maniac] pid=${process.pid} file=${filename} ${msg.message}`);
        }
      }
    };

    const handleError = (err: Error) => {
      if (switchToFallbackWorker(err)) return;
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
    try {
      startWorker();
    } catch (err) {
      if (switchToFallbackWorker(err)) return;
      const normalized = err instanceof Error ? err : new Error(String(err));
      settle(() => reject(normalized));
    }
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
