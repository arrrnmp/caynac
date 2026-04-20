import { spawn } from 'node:child_process';
import { parentPort, workerData } from 'node:worker_threads';

type CompressionAlgo = 'lzma2' | 'zstd';

interface CompressionOptions {
  sources: string[];
  output: string;
  algorithm: CompressionAlgo;
  level: number;
  password?: string;
  encryptFilenames?: boolean;
  splitSize?: string;
  binaryPath?: string;
}

interface CompressionTask {
  type: 'compress';
  options: CompressionOptions;
}

interface ExtractTask {
  type: 'extract';
  archive: string;
  outputDir: string;
  password?: string;
  binaryPath?: string;
}

type WorkerTask = CompressionTask | ExtractTask;

function postProgress(pct: number, file: string) {
  parentPort?.postMessage({ type: 'progress', progress: { pct, file } });
}

function runCompression(opts: CompressionOptions): Promise<void> {
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
      if (match) postProgress(Number.parseInt(match[1]!, 10), (match[2] ?? '').trim());
    });

    child.stderr.on('data', (d: Buffer) => {
      errBuf += d.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(errBuf.trim() || `${bin} exited with code ${code}`));
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to run ${bin}: ${err.message} — run onboarding to install 7-Zip.`));
    });
  });
}

function runExtraction(
  archive: string,
  outputDir: string,
  password: string | undefined,
  binaryPath: string | undefined,
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
      if (match) postProgress(Number.parseInt(match[1]!, 10), (match[2] ?? '').trim());
    });

    child.stderr.on('data', (d: Buffer) => {
      errBuf += d.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(errBuf.trim() || `${bin} exited with code ${code}`));
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to run ${bin}: ${err.message} — run onboarding to install 7-Zip.`));
    });
  });
}

async function main() {
  const task = workerData as WorkerTask;

  if (task.type === 'compress') {
    await runCompression(task.options);
  } else if (task.type === 'extract') {
    await runExtraction(task.archive, task.outputDir, task.password, task.binaryPath);
  } else {
    throw new Error('Unknown compression worker task.');
  }

  parentPort?.postMessage({ type: 'done', result: undefined });
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  parentPort?.postMessage({ type: 'error', message });
});
