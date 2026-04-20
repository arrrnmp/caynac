import { runInWorker } from './workers.js';
import type { PicocryptOptions } from './picocrypt.js';

export function runPicocrypt(
  opts: PicocryptOptions,
  onProgress: (pct: number) => void,
): Promise<void> {
  const workerFile = new URL(
    '../workers/picocrypt-worker.ts',
    import.meta.url,
  );
  return runInWorker<{ pct: number }>({
    workerFile: workerFile.href,
    handlerName: 'runPicocrypt',
    args: [opts],
    onProgress: ({ pct }) => onProgress(pct),
  });
}
