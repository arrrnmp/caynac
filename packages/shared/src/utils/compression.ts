import fs from 'node:fs';
import path from 'node:path';
import { runWorkerTask } from './workers.js';

export type CompressionAlgo = 'lzma2' | 'zstd';

export interface CompressionOptions {
  sources: string[];
  output: string;
  algorithm: CompressionAlgo;
  level: number; // 1–9
  password?: string;
  encryptFilenames?: boolean;
  splitSize?: string; // e.g. '4g', '700m', '100m'
  binaryPath?: string;
}

interface CompressionWorkerPayload {
  type: 'compress';
  options: CompressionOptions;
}

interface ExtractWorkerPayload {
  type: 'extract';
  archive: string;
  outputDir: string;
  password?: string;
  binaryPath?: string;
}

interface CompressionWorkerProgress {
  pct: number;
  file: string;
}

export function compressFiles(
  opts: CompressionOptions,
  onProgress: (pct: number, file: string) => void,
): Promise<void> {
  return runWorkerTask<CompressionWorkerPayload, CompressionWorkerProgress, void>(
    import.meta.url,
    '../workers/compression.worker',
    { type: 'compress', options: opts },
    (progress) => onProgress(progress.pct, progress.file),
    './packages/shared/src/workers/compression.worker.ts',
  );
}

export function extractFiles(
  archive: string,
  outputDir: string,
  password: string | undefined,
  onProgress: (pct: number, file: string) => void,
  binaryPath?: string,
): Promise<void> {
  return runWorkerTask<ExtractWorkerPayload, CompressionWorkerProgress, void>(
    import.meta.url,
    '../workers/compression.worker',
    { type: 'extract', archive, outputDir, password, binaryPath },
    (progress) => onProgress(progress.pct, progress.file),
    './packages/shared/src/workers/compression.worker.ts',
  );
}

/** Returns the archive file(s) to delete — handles split archives (.7z.001 etc). */
export function findArchiveParts(archivePath: string): string[] {
  const dir  = path.dirname(archivePath);
  const base = path.basename(archivePath);

  // Split archive: archive.7z.001 / archive.7z.002 …
  const splitMatch = base.match(/^(.+)\.\d{3}$/);
  if (splitMatch) {
    const prefix = splitMatch[1]!;
    return fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(prefix + '.') && /\.\d+$/.test(f))
      .map((f) => path.join(dir, f))
      .sort();
  }

  return [archivePath];
}
