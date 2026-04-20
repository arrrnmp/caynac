import { spawn } from 'node:child_process';
import { parentPort, workerData } from 'node:worker_threads';

interface PicocryptOptions {
  mode: 'encrypt' | 'decrypt';
  input: string;
  output: string;
  password?: string;
  keyfiles?: string[];
  reedsol?: boolean;
  paranoid?: boolean;
  deniability?: boolean;
  comment?: string;
  binaryPath?: string;
}

interface WorkerTask {
  options: PicocryptOptions;
}

function runPicocryptTask(opts: PicocryptOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = opts.binaryPath ?? 'picocrypt-ng-cli';
    const args: string[] = [opts.mode, '-i', opts.input];

    if (opts.output) args.push('-o', opts.output);
    if (opts.password) args.push('-p', opts.password);

    for (const kf of opts.keyfiles ?? []) {
      args.push('-k', kf);
    }

    if (opts.mode === 'encrypt') {
      if (opts.reedsol) args.push('--reed-solomon');
      if (opts.paranoid) args.push('--paranoid');
      if (opts.deniability) args.push('--deniability');
      if (opts.comment) args.push('--comments', opts.comment);
    } else if (opts.deniability) {
      args.push('--deniability');
    }

    // Worker mode is non-interactive; always overwrite existing targets.
    args.push('-y');

    const child = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let outBuf = '';
    let errBuf = '';

    const parseProgress = (text: string) => {
      for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) {
        const pct = Number.parseFloat(match[1] ?? '');
        if (!Number.isFinite(pct)) continue;
        parentPort?.postMessage({
          type: 'progress',
          progress: { pct },
        });
      }
    };

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      outBuf += text;
      parseProgress(text);
    });

    child.stderr.on('data', (d: Buffer) => {
      const text = d.toString();
      errBuf += text;
      parseProgress(text);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(errBuf.trim() || outBuf.trim() || `${bin} exited with code ${code}`));
    });

  child.on('error', (err) => {
    reject(
      new Error(
        `Failed to run ${bin}: ${err.message}\n` +
        `Tip: run "maniac onboarding" to install dependencies automatically\n` +
        `or install Picocrypt NG CLI from https://github.com/Picocrypt-NG/Picocrypt-NG\n` +
        `Or set picocryptPath in ~/.config/maniac/config.json`,
      ),
    );
  });

  if (!opts.password && (opts.keyfiles?.length ?? 0) > 0) {
    child.stdin.write('\n');
  }
  child.stdin.end();
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
