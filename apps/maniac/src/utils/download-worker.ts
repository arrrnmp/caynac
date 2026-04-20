import { runInWorker } from '@caynac/shared';
import type { DownloadProgress } from '../utils/download.js';

export function downloadFileViaWorker(
  url: string,
  destDir: string,
  filename: string,
  onProgress: (p: DownloadProgress) => void,
): Promise<string> {
  const workerFile = new URL(
    '../workers/download-worker.ts',
    import.meta.url,
  );

  return runInWorker<DownloadProgress, string>({
    workerFile: workerFile.href,
    handlerName: 'downloadFile',
    args: [url, destDir, filename],
    onProgress,
  });
}
