import { spawn } from 'node:child_process';

export interface PicocryptOptions {
  mode: 'encrypt' | 'decrypt';
  input: string;
  output: string;
  /** Password — omit or leave undefined for keyfile-only mode. */
  password?: string;
  keyfiles?: string[];
  reedsol?: boolean;       // Reed-Solomon error correction
  deniability?: boolean;   // Plausible Deniability
  comment?: string;        // Embed a comment (encrypt only)
  /**
   * Path to the picocrypt-cli binary.
   * Picocrypt (GUI) and Picocrypt-NG are UI-only — use the CLI tool:
   *   https://github.com/picocrypt/cli
   * Defaults to 'picocrypt-cli'.
   */
  binaryPath?: string;
}

export function runPicocrypt(
  opts: PicocryptOptions,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = opts.binaryPath ?? 'picocrypt-cli';
    const args: string[] = [];

    args.push(opts.mode === 'encrypt' ? '-e' : '-d');

    // Password is optional — keyfile-only mode skips -p entirely
    if (opts.password) args.push('-p', opts.password);

    for (const kf of opts.keyfiles ?? []) {
      args.push('-k', kf);
    }

    if (opts.reedsol)    args.push('-r');
    if (opts.deniability) args.push('-D');
    if (opts.comment)    args.push('-c', opts.comment);

    args.push('-o', opts.output);
    args.push(opts.input);

    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let errBuf = '';

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
      if (match) onProgress(parseFloat(match[1]!));
    });

    child.stderr.on('data', (d: Buffer) => { errBuf += d.toString(); });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(errBuf.trim() || `${bin} exited with code ${code}`));
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
