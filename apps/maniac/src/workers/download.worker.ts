import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { parentPort, workerData } from 'node:worker_threads';

interface DownloadWorkerPayload {
  url: string;
  destDir: string;
  filename: string;
  expectedBytes?: number;
}

interface DownloadProgress {
  filename: string;
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
  speed: number;
}

const PROGRESS_EMIT_MS = 150;
const WRITE_HIGH_WATER_MARK = 1024 * 1024;
const POWERSHELL_CHUNK_SIZE = 1024 * 1024;

type DownloadTransport = 'powershell' | 'pwsh' | 'curl' | 'fetch';

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isErrno(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === code
  );
}

function emitProgress(
  filename: string,
  bytesReceived: number,
  totalBytes: number,
  startedAt: number,
  lastEmitAtRef: { value: number },
  force = false,
) {
  const now = Date.now();
  if (!force && now - lastEmitAtRef.value < PROGRESS_EMIT_MS) return;
  lastEmitAtRef.value = now;
  const elapsed = (now - startedAt) / 1000;
  const speed = elapsed > 0 ? bytesReceived / elapsed : 0;
  const percentage = totalBytes > 0 ? (bytesReceived / totalBytes) * 100 : 0;
  const progress: DownloadProgress = { filename, bytesReceived, totalBytes, percentage, speed };
  parentPort?.postMessage({ type: 'progress', progress });
}

async function writeChunk(stream: fs.WriteStream, chunk: Uint8Array): Promise<void> {
  if (stream.write(chunk)) return;
  await once(stream, 'drain');
}

async function closeStream(stream: fs.WriteStream): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const handleError = (err: Error) => {
      stream.off('error', handleError);
      reject(err);
    };
    stream.on('error', handleError);
    stream.end(() => {
      stream.off('error', handleError);
      resolve();
    });
  });
}

async function downloadWithFetch(
  url: string,
  destDir: string,
  filename: string,
  expectedBytes = 0,
): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, filename);
  const file = fs.createWriteStream(dest, { highWaterMark: WRITE_HIGH_WATER_MARK });

  const startedAt = Date.now();
  const lastEmitAtRef = { value: 0 };
  let bytesReceived = 0;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download request failed with status code ${response.status}`);
    }

    const contentLength = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
    const totalBytes = contentLength > 0 ? contentLength : expectedBytes;
    const body = response.body;
    if (!body) throw new Error('Download response has no body');

    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      bytesReceived += value.byteLength;
      await writeChunk(file, value);
      emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef);
    }

    await closeStream(file);
    emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef, true);
    return dest;
  } catch (err) {
    file.destroy();
    await fs.promises.unlink(dest).catch(() => {});
    throw err;
  }
}

function windowsPowerShellScript(): string {
  return [
    "$ErrorActionPreference='Stop'",
    "$url=$env:MANIAC_URL",
    "$dest=$env:MANIAC_DEST",
    "if ([string]::IsNullOrWhiteSpace($url)) { throw 'MANIAC_URL is empty' }",
    "if ([string]::IsNullOrWhiteSpace($dest)) { throw 'MANIAC_DEST is empty' }",
    '$handler=[System.Net.Http.HttpClientHandler]::new()',
    '$handler.AutomaticDecompression=[System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate',
    '$client=[System.Net.Http.HttpClient]::new($handler)',
    '$client.Timeout=[TimeSpan]::FromMinutes(30)',
    '$response=$client.GetAsync($url,[System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()',
    '$response.EnsureSuccessStatusCode()',
    '$src=$response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()',
    '$dst=[System.IO.File]::Open($dest,[System.IO.FileMode]::Create,[System.IO.FileAccess]::Write,[System.IO.FileShare]::Read)',
    `$buffer=New-Object byte[] (${POWERSHELL_CHUNK_SIZE})`,
    'while (($read=$src.Read($buffer,0,$buffer.Length)) -gt 0) { $dst.Write($buffer,0,$read) }',
    '$dst.Flush()',
    '$dst.Dispose()',
    '$src.Dispose()',
    '$response.Dispose()',
    '$client.Dispose()',
    '$handler.Dispose()',
  ].join('; ');
}

async function downloadWithExternalProcess(
  command: string,
  args: string[],
  transport: DownloadTransport,
  url: string,
  destDir: string,
  filename: string,
  expectedBytes = 0,
): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, filename);

  const startedAt = Date.now();
  const lastEmitAtRef = { value: 0 };
  const totalBytes = expectedBytes > 0 ? expectedBytes : 0;
  let bytesReceived = 0;

  let pollTimer: NodeJS.Timeout | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
        env: {
          ...process.env,
          MANIAC_URL: url,
          MANIAC_DEST: dest,
        },
      });
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
        if (stderr.length > 5000) stderr = stderr.slice(-5000);
      });

      pollTimer = setInterval(() => {
        try {
          bytesReceived = fs.statSync(dest).size;
        } catch (err) {
          if (!isErrno(err, 'ENOENT')) {
            if (pollTimer) clearInterval(pollTimer);
            child.kill();
            finish(() => reject(err));
            return;
          }
          bytesReceived = 0;
        }
        emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef);
      }, PROGRESS_EMIT_MS);

      child.on('error', (err) => finish(() => reject(err)));
      child.on('exit', (code, signal) => {
        if (code === 0) {
          finish(() => resolve());
          return;
        }
        const detail = stderr.trim();
        if (detail) {
          finish(() => reject(new Error(`${transport}: ${detail}`)));
          return;
        }
        finish(() => reject(new Error(`${transport} exited with code ${code ?? 'null'}${signal ? ` (signal ${signal})` : ''}`)));
      });
    });

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = undefined;
    bytesReceived = fs.statSync(dest).size;
    emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef, true);
    return dest;
  } catch (err) {
    if (pollTimer) clearInterval(pollTimer);
    await fs.promises.unlink(dest).catch(() => {});
    throw err;
  }
}

function transportOrder(): DownloadTransport[] {
  const forced = process.env.MANIAC_DOWNLOAD_TRANSPORT?.trim().toLowerCase();
  if (forced === 'fetch') return ['fetch'];
  if (forced === 'curl') return ['curl'];
  if (forced === 'powershell') return ['powershell'];
  if (forced === 'pwsh') return ['pwsh'];

  if (process.platform === 'win32') return ['powershell', 'pwsh', 'curl', 'fetch'];
  return ['fetch'];
}

async function downloadInWorker(
  url: string,
  destDir: string,
  filename: string,
  expectedBytes = 0,
): Promise<string> {
  const transports = transportOrder();
  const errors: string[] = [];

  for (const transport of transports) {
    parentPort?.postMessage({ type: 'transport', transport });
    try {
      if (transport === 'fetch') {
        return await downloadWithFetch(url, destDir, filename, expectedBytes);
      }
      if (transport === 'curl') {
        return await downloadWithExternalProcess(
          'curl',
          ['--location', '--fail', '--silent', '--show-error', '--output', path.join(destDir, filename), url],
          'curl',
          url,
          destDir,
          filename,
          expectedBytes,
        );
      }
      if (transport === 'powershell') {
        return await downloadWithExternalProcess(
          'powershell',
          ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', windowsPowerShellScript()],
          'powershell',
          url,
          destDir,
          filename,
          expectedBytes,
        );
      }
      return await downloadWithExternalProcess(
        'pwsh',
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', windowsPowerShellScript()],
        'pwsh',
        url,
        destDir,
        filename,
        expectedBytes,
      );
    } catch (err) {
      errors.push(toMessage(err));
      if (isErrno(err, 'ENOENT')) continue;
    }
  }

  throw new Error(`Download failed across transports: ${errors.join(' | ')}`);
}

async function main() {
  const payload = workerData as DownloadWorkerPayload;
  const dest = await downloadInWorker(
    payload.url,
    payload.destDir,
    payload.filename,
    payload.expectedBytes ?? 0,
  );
  parentPort?.postMessage({
    type: 'done',
    result: { dest },
  });
}

void main().catch((err: unknown) => {
  parentPort?.postMessage({ type: 'error', message: toMessage(err) });
});
