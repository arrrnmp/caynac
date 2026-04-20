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
const DEBUG_INSANE = process.env.MANIAC_DOWNLOAD_INSANE_DEBUG === '1';

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

function summarizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function debug(message: string): void {
  if (!DEBUG_INSANE) return;
  parentPort?.postMessage({ type: 'debug', message });
}

function resolveWindowsPowerShellCommand(): string {
  const candidates = [process.env.SystemRoot, process.env.windir]
    .filter((value): value is string => Boolean(value))
    .map((root) => path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'));
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'powershell';
}

function bunVersion(): string {
  const versions = process.versions as Record<string, string | undefined>;
  return versions.bun ?? 'unknown';
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
  let chunkCount = 0;
  let lastDebugAt = startedAt;
  let lastDebugBytes = 0;
  debug(`fetch:start url=${summarizeUrl(url)} dest=${dest}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download request failed with status code ${response.status}`);
    }

    const contentLength = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
    const totalBytes = contentLength > 0 ? contentLength : expectedBytes;
    debug(
      `fetch:headers status=${response.status} content_length=${response.headers.get('content-length') ?? 'n/a'} content_type=${response.headers.get('content-type') ?? 'n/a'} server=${response.headers.get('server') ?? 'n/a'} via=${response.headers.get('via') ?? 'n/a'} cf_ray=${response.headers.get('cf-ray') ?? 'n/a'}`,
    );
    const body = response.body;
    if (!body) throw new Error('Download response has no body');

    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      bytesReceived += value.byteLength;
      chunkCount += 1;
      await writeChunk(file, value);
      emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef);
      const now = Date.now();
      if (DEBUG_INSANE && now - lastDebugAt >= 1000) {
        const deltaBytes = bytesReceived - lastDebugBytes;
        const deltaSec = Math.max(0.001, (now - lastDebugAt) / 1000);
        const instRate = deltaBytes / deltaSec;
        debug(
          `fetch:progress bytes=${bytesReceived} inst_bps=${Math.round(instRate)} avg_bps=${Math.round(bytesReceived / Math.max(0.001, (now - startedAt) / 1000))} chunks=${chunkCount}`,
        );
        lastDebugAt = now;
        lastDebugBytes = bytesReceived;
      }
    }

    await closeStream(file);
    emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef, true);
    const durationSec = Math.max(0.001, (Date.now() - startedAt) / 1000);
    debug(
      `fetch:done bytes=${bytesReceived} duration_s=${durationSec.toFixed(3)} avg_bps=${Math.round(bytesReceived / durationSec)} chunks=${chunkCount}`,
    );
    return dest;
  } catch (err) {
    file.destroy();
    await fs.promises.unlink(dest).catch(() => {});
    debug(`fetch:error message=${toMessage(err)}`);
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
  let lastDebugAt = startedAt;
  let lastDebugBytes = 0;
  debug(
    `process:start transport=${transport} command=${command} url=${summarizeUrl(url)} dest=${dest}`,
  );

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
      debug(`process:spawn transport=${transport} pid=${child.pid ?? -1}`);

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
        const now = Date.now();
        if (DEBUG_INSANE && now - lastDebugAt >= 1000) {
          const deltaBytes = bytesReceived - lastDebugBytes;
          const deltaSec = Math.max(0.001, (now - lastDebugAt) / 1000);
          const instRate = deltaBytes / deltaSec;
          debug(
            `process:progress transport=${transport} bytes=${bytesReceived} inst_bps=${Math.round(instRate)} avg_bps=${Math.round(bytesReceived / Math.max(0.001, (now - startedAt) / 1000))}`,
          );
          lastDebugAt = now;
          lastDebugBytes = bytesReceived;
        }
      }, PROGRESS_EMIT_MS);

      child.on('error', (err) => finish(() => reject(err)));
      child.on('exit', (code, signal) => {
        if (code === 0) {
          finish(() => resolve());
          return;
        }
        const detail = stderr.trim();
        if (detail) {
          debug(`process:exit transport=${transport} code=${code ?? -1} signal=${signal ?? 'none'} stderr=${detail}`);
          finish(() => reject(new Error(`${transport}: ${detail}`)));
          return;
        }
        debug(`process:exit transport=${transport} code=${code ?? -1} signal=${signal ?? 'none'} stderr=none`);
        finish(() => reject(new Error(`${transport} exited with code ${code ?? 'null'}${signal ? ` (signal ${signal})` : ''}`)));
      });
    });

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = undefined;
    bytesReceived = fs.statSync(dest).size;
    emitProgress(filename, bytesReceived, totalBytes, startedAt, lastEmitAtRef, true);
    const durationSec = Math.max(0.001, (Date.now() - startedAt) / 1000);
    debug(
      `process:done transport=${transport} bytes=${bytesReceived} duration_s=${durationSec.toFixed(3)} avg_bps=${Math.round(bytesReceived / durationSec)}`,
    );
    return dest;
  } catch (err) {
    if (pollTimer) clearInterval(pollTimer);
    await fs.promises.unlink(dest).catch(() => {});
    debug(`process:error transport=${transport} message=${toMessage(err)}`);
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
  debug(
    `download:start platform=${process.platform} bun=${bunVersion()} transports=${transports.join(',')} url=${summarizeUrl(url)} expected_bytes=${expectedBytes} dest_dir=${destDir} file=${filename}`,
  );
  const powershellCommand = resolveWindowsPowerShellCommand();

  for (const transport of transports) {
    const attemptStartedAt = Date.now();
    parentPort?.postMessage({ type: 'transport', transport });
    debug(`transport:attempt transport=${transport}`);
    try {
      if (transport === 'fetch') {
        const result = await downloadWithFetch(url, destDir, filename, expectedBytes);
        debug(`transport:success transport=${transport} duration_ms=${Date.now() - attemptStartedAt}`);
        return result;
      }
      if (transport === 'curl') {
        const result = await downloadWithExternalProcess(
          'curl',
          ['--location', '--fail', '--silent', '--show-error', '--output', path.join(destDir, filename), url],
          'curl',
          url,
          destDir,
          filename,
          expectedBytes,
        );
        debug(`transport:success transport=${transport} duration_ms=${Date.now() - attemptStartedAt}`);
        return result;
      }
      if (transport === 'powershell') {
        const result = await downloadWithExternalProcess(
          powershellCommand,
          ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', windowsPowerShellScript()],
          'powershell',
          url,
          destDir,
          filename,
          expectedBytes,
        );
        debug(`transport:success transport=${transport} duration_ms=${Date.now() - attemptStartedAt}`);
        return result;
      }
      const result = await downloadWithExternalProcess(
        'pwsh',
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', windowsPowerShellScript()],
        'pwsh',
        url,
        destDir,
        filename,
        expectedBytes,
      );
      debug(`transport:success transport=${transport} duration_ms=${Date.now() - attemptStartedAt}`);
      return result;
    } catch (err) {
      const message = toMessage(err);
      errors.push(message);
      parentPort?.postMessage({ type: 'transport_error', transport, message });
      debug(`transport:failure transport=${transport} duration_ms=${Date.now() - attemptStartedAt} message=${message}`);
      if (isErrno(err, 'ENOENT')) continue;
    }
  }

  debug(`download:failed errors=${errors.join(' | ')}`);
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
