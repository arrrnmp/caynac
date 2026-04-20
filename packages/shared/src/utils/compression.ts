import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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

export function compressFiles(
  opts: CompressionOptions,
  onProgress: (pct: number, file: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = opts.binaryPath ?? '7z';
    const args: string[] = ['a', '-t7z', '-bsp1'];

    if (opts.algorithm === 'lzma2') {
      args.push('-m0=lzma2', `-mx=${opts.level}`);
    } else {
      args.push('-m0=zstd', `-mx=${opts.level}`);
    }

    if (opts.password) {
      args.push(`-p${opts.password}`);
      if (opts.encryptFilenames) args.push('-mhe=on');
    }

    if (opts.splitSize) args.push(`-v${opts.splitSize}`);

    args.push(opts.output, ...opts.sources);

    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let errBuf = '';

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/^\s*(\d+)%\s*(?:-\s*(.+))?/m);
      if (match) onProgress(parseInt(match[1]!, 10), (match[2] ?? '').trim());
    });

    child.stderr.on('data', (d: Buffer) => { errBuf += d.toString(); });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(errBuf.trim() || `${bin} exited with code ${code}`));
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to run ${bin}: ${err.message} — run onboarding to install 7-Zip.`));
    });
  });
}

export function extractFiles(
  archive: string,
  outputDir: string,
  password: string | undefined,
  onProgress: (pct: number, file: string) => void,
  binaryPath?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = binaryPath ?? '7z';
    const args = ['x', archive, `-o${outputDir}`, '-y', '-bsp1'];
    if (password) args.push(`-p${password}`);

    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let errBuf = '';

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/^\s*(\d+)%\s*(?:-\s*(.+))?/m);
      if (match) onProgress(parseInt(match[1]!, 10), (match[2] ?? '').trim());
    });

    child.stderr.on('data', (d: Buffer) => { errBuf += d.toString(); });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(errBuf.trim() || `${bin} exited with code ${code}`));
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to run ${bin}: ${err.message} — run onboarding to install 7-Zip.`));
    });
  });
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
