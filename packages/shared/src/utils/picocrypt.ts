import { runWorkerTask } from './workers.js';

export interface PicocryptOptions {
  mode: 'encrypt' | 'decrypt';
  input: string;
  output: string;
  /** Password — omit or leave undefined for keyfile-only mode. */
  password?: string;
  keyfiles?: string[];
  reedsol?: boolean;       // Reed-Solomon error correction
  paranoid?: boolean;      // Serpent+XChaCha20 cascade mode
  deniability?: boolean;   // Plausible Deniability
  comment?: string;        // Embed a header comment (encrypt only)
  /**
   * Path to the Picocrypt NG CLI binary.
   *   https://github.com/Picocrypt-NG/Picocrypt-NG
   * Defaults to 'picocrypt-ng-cli'.
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
    './packages/shared/src/workers/picocrypt.worker.ts',
  );
}
