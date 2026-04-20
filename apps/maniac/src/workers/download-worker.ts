import { parentPort, workerData } from 'node:worker_threads';
import { downloadFile } from '../utils/download.js';
import type { DownloadProgress } from '../utils/download.js';

if (!parentPort) process.exit(1);
const port = parentPort;

const { handlerName, args } = workerData as {
  handlerName: string;
  args: unknown[];
};

const postProgress = (payload: unknown) => {
  port.postMessage({ type: 'progress', payload });
};

void (async () => {
  try {
    if (handlerName === 'downloadFile') {
      const [url, destDir, filename] = args as [string, string, string];
      const dest = await downloadFile(url, destDir, filename, (p: DownloadProgress) =>
        postProgress(p),
      );
      port.postMessage({ type: 'done', payload: dest });
    } else {
      port.postMessage({
        type: 'error',
        payload: `Unknown handler: ${handlerName}`,
      });
    }
  } catch (err) {
    port.postMessage({
      type: 'error',
      payload: err instanceof Error ? err.message : String(err),
    });
  }
})();
