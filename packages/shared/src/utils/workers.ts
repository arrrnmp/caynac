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
): Promise<TResult> {
  return new Promise((resolve, reject) => {
    const workerUrl = resolveWorkerUrl(moduleUrl, workerPathWithoutExt);
    const worker = new Worker(workerUrl, { workerData: payload });
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

    worker.on('message', handleMessage);
    worker.on('error', handleError);
    worker.on('exit', handleExit);
  });
}
