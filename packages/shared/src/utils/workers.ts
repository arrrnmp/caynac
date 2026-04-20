import fs from 'node:fs';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

interface ProgressMessage<TProgress> {
  type: 'progress';
  progress: TProgress;
}

interface DoneMessage<TResult> {
  type: 'done';
  result: TResult;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

function isEntryPointModuleNotFound(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('ModuleNotFound') && message.includes('(entry point)');
}

function resolveWorkerUrl(moduleUrl: string, workerPathWithoutExt: string): URL {
  const jsUrl = new URL(`${workerPathWithoutExt}.js`, moduleUrl);
  if (fs.existsSync(fileURLToPath(jsUrl))) return jsUrl;
  return new URL(`${workerPathWithoutExt}.ts`, moduleUrl);
}

export function runWorkerTask<TPayload, TProgress, TResult>(
  moduleUrl: string,
  workerPathWithoutExt: string,
  payload: TPayload,
  onProgress: (progress: TProgress) => void,
  compiledWorkerEntry?: string,
): Promise<TResult> {
  return new Promise((resolve, reject) => {
    const workerCandidates: Array<URL | string> = [resolveWorkerUrl(moduleUrl, workerPathWithoutExt)];
    if (compiledWorkerEntry) workerCandidates.push(compiledWorkerEntry);

    let candidateIndex = 0;
    let worker: Worker | undefined;
    let settled = false;

    const startWorker = () => {
      worker = new Worker(workerCandidates[candidateIndex]!, { workerData: payload });
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
      const msg = message as { type?: string };

      if (msg.type === 'progress') {
        const progressMessage = message as ProgressMessage<TProgress>;
        onProgress(progressMessage.progress);
        return;
      }

      if (msg.type === 'done') {
        const doneMessage = message as DoneMessage<TResult>;
        settle(() => resolve(doneMessage.result));
        return;
      }

      if (msg.type === 'error') {
        const errorMessage = message as ErrorMessage;
        settle(() => reject(new Error(errorMessage.message)));
      }
    };

    const handleError = (err: Error) => {
      if (switchToFallbackWorker(err)) return;
      settle(() => reject(err));
    };

    const handleExit = (code: number) => {
      if (settled) return;
      if (code === 0) {
        settle(() => reject(new Error('Worker exited before completion.')));
        return;
      }
      settle(() => reject(new Error(`Worker exited with code ${code}`)));
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
