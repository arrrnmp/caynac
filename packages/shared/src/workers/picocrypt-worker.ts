import { parentPort, workerData } from 'node:worker_threads';
import { runPicocrypt } from '../utils/picocrypt.js';
import type { PicocryptOptions } from '../utils/picocrypt.js';

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
    if (handlerName === 'runPicocrypt') {
      const [opts] = args as [PicocryptOptions];
      await runPicocrypt(opts, (pct) => postProgress({ pct }));
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
