import { spawn } from 'node:child_process';
import { parentPort, workerData } from 'node:worker_threads';

interface PicocryptOptions {
  mode: 'encrypt' | 'decrypt';
  input: string;
  output: string;
  password?: string;
  keyfiles?: string[];
  reedsol?: boolean;
  deniability?: boolean;
  comment?: string;
  binaryPath?: string;
}

interface WorkerTask {
  options: PicocryptOptions;
}

function runPicocryptTask(opts: PicocryptOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = opts.binaryPath ?? 'picocrypt-cli';
    const args: string[] = [];

    args.push(opts.mode === 'encrypt' ? '-e' : '-d');

    if (opts.password) args.push('-p', opts.password);

    for (const kf of opts.keyfiles ?? []) {
      args.push('-k', kf);
    }

    if (opts.reedsol) args.push('-r');
    if (opts.deniability) args.push('-D');
    if (opts.comment) args.push('-c', opts.comment);

    args.push('-o', opts.output);
    args.push(opts.input);

    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let errBuf = '';

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
      if (!match) return;
      parentPort?.postMessage({
        type: 'progress',
        progress: { pct: Number.parseFloat(match[1]!) },
      });
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
      reject(
        new Error(
          `Failed to run ${bin}: ${err.message}\n` +
          `Tip: run "maniac onboarding" to install dependencies automatically\n` +
          `or install picocrypt-cli from https://github.com/picocrypt/cli\n` +
          `Or set picocryptPath in ~/.config/maniac/config.json`,
        ),
      );
    });
  });
}

async function main() {
  const task = workerData as WorkerTask;
  await runPicocryptTask(task.options);
  parentPort?.postMessage({ type: 'done', result: undefined });
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  parentPort?.postMessage({ type: 'error', message });
});
