import { runInWorker } from './workers.js';
import type { CompressionAlgo, CompressionOptions } from './compression.js';

export type { CompressionAlgo, CompressionOptions };

export function compressFiles(
  opts: CompressionOptions,
  onProgress: (pct: number, file: string) => void,
): Promise<void> {
  const workerFile = new URL(
    '../workers/compression-worker.ts',
    import.meta.url,
  );
  return runInWorker<{ pct: number; file: string }>({
    workerFile: workerFile.href,
    handlerName: 'compressFiles',
    args: [opts],
    onProgress: ({ pct, file }) => onProgress(pct, file),
  });
}

export function extractFiles(
  archive: string,
  outputDir: string,
  password: string | undefined,
  onProgress: (pct: number, file: string) => void,
  binaryPath?: string,
): Promise<void> {
  const workerFile = new URL(
    '../workers/compression-worker.ts',
    import.meta.url,
  );
  return runInWorker<{ pct: number; file: string }>({
    workerFile: workerFile.href,
    handlerName: 'extractFiles',
    args: [archive, outputDir, password, binaryPath],
    onProgress: ({ pct, file }) => onProgress(pct, file),
  });
}

export { findArchiveParts } from './compression.js';
