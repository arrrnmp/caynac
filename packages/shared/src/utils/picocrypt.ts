import { runWorkerTask } from './workers.js';

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

interface PicocryptProgress {
  pct: number;
}

interface PicocryptWorkerPayload {
  options: PicocryptOptions;
}

export function runPicocrypt(
  opts: PicocryptOptions,
  onProgress: (pct: number) => void,
): Promise<void> {
  return runWorkerTask<PicocryptWorkerPayload, PicocryptProgress, void>(
    import.meta.url,
    '../workers/picocrypt.worker',
    { options: opts },
    (progress) => onProgress(progress.pct),
  );
}
