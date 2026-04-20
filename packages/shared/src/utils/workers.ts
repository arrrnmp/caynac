import { Worker } from 'node:worker_threads';

type WorkerMessage =
  | { type: 'progress'; payload: unknown }
  | { type: 'done'; payload?: unknown }
  | { type: 'error'; payload: string };

export interface RunInWorkerOptions<TProgress> {
  workerFile: string;
  handlerName: string;
  args: unknown[];
  onProgress?: (p: TProgress) => void;
  throttleMs?: number;
}

export function runInWorker<TProgress, TResult = void>({
  workerFile,
  handlerName,
  args,
  onProgress,
  throttleMs = 50,
}: RunInWorkerOptions<TProgress>): Promise<TResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerFile, {
      workerData: { handlerName, args },
    });

    let lastEmit = 0;
    let latestProgress: TProgress | undefined;
    let settled = false;

    const flush = () => {
      if (latestProgress !== undefined && onProgress) {
        onProgress(latestProgress);
        latestProgress = undefined;
      }
    };

    const finalize = (fn: () => void) => {
      if (settled) return;
      settled = true;
      flush();
      fn();
    };

    worker.on('message', (msg: WorkerMessage) => {
      if (msg.type === 'progress') {
        latestProgress = msg.payload as TProgress;
        const now = Date.now();
        if (onProgress && now - lastEmit >= throttleMs) {
          lastEmit = now;
          flush();
        }
      } else if (msg.type === 'done') {
        finalize(() => {
          const result = msg.payload as TResult | undefined;
          worker.terminate().then(
            () => resolve(result as TResult),
            () => resolve(result as TResult),
          );
        });
      } else if (msg.type === 'error') {
        finalize(() => {
          worker
            .terminate()
            .then(() => reject(new Error(msg.payload)), () =>
              reject(new Error(msg.payload)),
            );
        });
      }
    });

    worker.on('error', (err) => {
      finalize(() => reject(err));
    });

    worker.on('exit', (code) => {
      if (code !== 0 && !settled) {
        finalize(() =>
          reject(new Error(`Worker stopped with exit code ${code}`)),
        );
      }
    });
  });
}
