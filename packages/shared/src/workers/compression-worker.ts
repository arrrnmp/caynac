import { parentPort, workerData } from 'node:worker_threads';
import { compressFiles, extractFiles } from '../utils/compression.js';
import type { CompressionOptions } from '../utils/compression.js';

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
    if (handlerName === 'compressFiles') {
      const [opts] = args as [CompressionOptions];
      await compressFiles(opts, (pct, file) =>
        postProgress({ pct, file }),
      );
    } else if (handlerName === 'extractFiles') {
      const [archive, outputDir, password, binaryPath] = args as [
        string,
        string,
        string | undefined,
        string | undefined,
      ];
      await extractFiles(
        archive,
        outputDir,
        password,
        (pct, file) => postProgress({ pct, file }),
        binaryPath,
      );
    } else {
      port.postMessage({
        type: 'error',
        payload: `Unknown handler: ${handlerName}`,
      });
      return;
    }
    port.postMessage({ type: 'done' });
  } catch (err) {
    port.postMessage({
      type: 'error',
      payload: err instanceof Error ? err.message : String(err),
    });
  }
})();
