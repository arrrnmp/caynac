import { spawn } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

export type DependencyId = 'sevenZip' | 'picocrypt';

export interface DependencyStatus {
  id: DependencyId;
  label: string;
  installed: boolean;
  path?: string;
  details?: string;
}

export interface DependencyCheckResult {
  platform: NodeJS.Platform;
  platformLabel: string;
  platformSupported: boolean;
  statuses: DependencyStatus[];
}

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  assets: GitHubReleaseAsset[];
}

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

const RELEASE_URL = 'https://api.github.com/repos/Picocrypt/CLI/releases/latest';

export function platformLabel(platform: NodeJS.Platform): string {
  if (platform === 'darwin') return 'macOS';
  if (platform === 'win32') return 'Windows';
  if (platform === 'linux') return 'Linux';
  return platform;
}

export function configuredBinary(pathFromConfig?: string): string | undefined {
  if (!pathFromConfig) return undefined;
  const resolved = path.resolve(pathFromConfig);
  return fs.existsSync(resolved) ? resolved : undefined;
}

export function trimLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

export function findFirstLine(text: string): string | undefined {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

export function runCommand(
  command: string,
  args: string[],
  onLog?: (line: string) => void,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      if (onLog) {
        for (const line of text.split(/\r?\n/)) {
          const clean = trimLine(line);
          if (clean) onLog(clean);
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      if (onLog) {
        for (const line of text.split(/\r?\n/)) {
          const clean = trimLine(line);
          if (clean) onLog(clean);
        }
      }
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

export async function findCommandOnPath(name: string): Promise<string | undefined> {
  const lookup = process.platform === 'win32' ? 'where' : 'which';
  const res = await runCommand(lookup, [name]);
  if (res.code !== 0) return undefined;
  return findFirstLine(res.stdout);
}

export async function detectSevenZipPath(configPath?: string): Promise<string | undefined> {
  const fromConfig = configuredBinary(configPath);
  if (fromConfig) return fromConfig;
  return (await findCommandOnPath('7z')) ?? (await findCommandOnPath('7zz'));
}

export async function detectPicocryptPath(configPath?: string): Promise<string | undefined> {
  const fromConfig = configuredBinary(configPath);
  if (fromConfig) return fromConfig;

  const names = process.platform === 'win32'
    ? ['picocrypt-cli.exe', 'picocrypt.exe', 'picocrypt-cli', 'picocrypt']
    : ['picocrypt-cli', 'picocrypt'];

  for (const name of names) {
    const found = await findCommandOnPath(name);
    if (found) return found;
  }
  return undefined;
}

export function pickPicocryptAsset(): string {
  if (process.platform === 'darwin') {
    if (process.arch === 'arm64') return 'picocrypt-macos-arm64';
    if (process.arch === 'x64') return 'picocrypt-macos-amd64';
  }

  if (process.platform === 'win32') {
    if (process.arch === 'arm64') return 'picocrypt-windows-arm64.exe';
    if (process.arch === 'x64') return 'picocrypt-windows-amd64.exe';
  }

  if (process.platform === 'linux') {
    if (process.arch === 'arm64') return 'picocrypt-linux-arm64';
    if (process.arch === 'x64') return 'picocrypt-linux-amd64';
  }

  throw new Error(
    `No Picocrypt CLI release asset for platform ${process.platform} (${process.arch}).`,
  );
}

function httpsJson<T>(url: string, userAgent: string, redirects = 0): Promise<T> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error('Too many redirects while fetching JSON.'));
      return;
    }

    https
      .get(
        url,
        {
          headers: {
            'User-Agent': userAgent,
            Accept: 'application/vnd.github+json',
          },
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400 && res.headers.location) {
            resolve(httpsJson<T>(res.headers.location, userAgent, redirects + 1));
            return;
          }

          if (status < 200 || status >= 300) {
            reject(new Error(`Request failed (${status}) for ${url}`));
            return;
          }

          let raw = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            raw += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(raw) as T);
            } catch (error) {
              reject(new Error(`Failed to parse JSON: ${(error as Error).message}`));
            }
          });
        },
      )
      .on('error', reject);
  });
}

function downloadFile(url: string, destination: string, userAgent: string, redirects = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error('Too many redirects while downloading file.'));
      return;
    }

    const tmpFile = `${destination}.tmp`;

    const cleanupAndReject = (error: Error) => {
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {
        // best effort cleanup
      }
      reject(error);
    };

    https
      .get(
        url,
        {
          headers: {
            'User-Agent': userAgent,
            Accept: 'application/octet-stream',
          },
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400 && res.headers.location) {
            resolve(downloadFile(res.headers.location, destination, userAgent, redirects + 1));
            return;
          }

          if (status < 200 || status >= 300) {
            cleanupAndReject(new Error(`Download failed (${status}) for ${url}`));
            return;
          }

          const out = fs.createWriteStream(tmpFile);
          out.on('error', (err) => cleanupAndReject(err));
          res.on('error', (err) => cleanupAndReject(err));

          out.on('finish', () => {
            out.close((err) => {
              if (err) {
                cleanupAndReject(err);
                return;
              }
              fs.rename(tmpFile, destination, (renameErr) => {
                if (renameErr) {
                  cleanupAndReject(renameErr);
                  return;
                }
                resolve();
              });
            });
          });

          res.pipe(out);
        },
      )
      .on('error', (err) => cleanupAndReject(err));
  });
}

export interface CheckDependenciesOptions {
  sevenZipPath?: string;
  picocryptPath?: string;
}

export async function checkDependencies(options: CheckDependenciesOptions): Promise<DependencyCheckResult> {
  const sevenZip = await detectSevenZipPath(options.sevenZipPath);
  const picocrypt = await detectPicocryptPath(options.picocryptPath);
  const supported = process.platform === 'darwin' || process.platform === 'win32';

  return {
    platform: process.platform,
    platformLabel: platformLabel(process.platform),
    platformSupported: supported,
    statuses: [
      {
        id: 'sevenZip',
        label: '7-Zip binary (7z / 7zz)',
        installed: Boolean(sevenZip),
        path: sevenZip,
      },
      {
        id: 'picocrypt',
        label: 'Picocrypt CLI binary',
        installed: Boolean(picocrypt),
        path: picocrypt,
      },
    ],
  };
}

export interface InstallOptions {
  userAgent?: string;
}

export async function installSevenZip(onLog?: (line: string) => void, options: InstallOptions = {}): Promise<string> {
  const userAgent = options.userAgent ?? 'dependency-installer';

  if (process.platform === 'darwin') {
    const brew = await findCommandOnPath('brew');
    if (!brew) {
      throw new Error('Homebrew is not installed. Install Homebrew first to install 7-Zip on macOS.');
    }

    onLog?.('Installing 7-Zip via Homebrew…');
    const first = await runCommand(brew, ['install', 'sevenzip'], onLog);
    if (first.code !== 0) {
      onLog?.('Homebrew formula "sevenzip" failed, trying "p7zip"…');
      const fallback = await runCommand(brew, ['install', 'p7zip'], onLog);
      if (fallback.code !== 0) {
        throw new Error(
          `7-Zip install failed: ${trimLine(fallback.stderr || fallback.stdout || 'unknown error')}`,
        );
      }
    }

    const sevenZip = await detectSevenZipPath();
    if (!sevenZip) throw new Error('7-Zip install completed but no 7z/7zz command was found in PATH.');
    return sevenZip;
  }

  if (process.platform === 'win32') {
    const winget = await findCommandOnPath('winget');
    if (winget) {
      onLog?.('Installing 7-Zip via winget…');
      const wingetInstall = await runCommand(
        winget,
        [
          'install',
          '--id',
          '7zip.7zip',
          '-e',
          '--silent',
          '--accept-package-agreements',
          '--accept-source-agreements',
        ],
        onLog,
      );
      if (wingetInstall.code === 0) {
        const sevenZip = await detectSevenZipPath();
        if (sevenZip) return sevenZip;
      } else {
        onLog?.('winget install failed, trying Chocolatey if available…');
      }
    }

    const choco = await findCommandOnPath('choco');
    if (choco) {
      onLog?.('Installing 7-Zip via Chocolatey…');
      const chocoInstall = await runCommand(choco, ['install', '-y', '7zip'], onLog);
      if (chocoInstall.code !== 0) {
        throw new Error(`Chocolatey install failed: ${trimLine(chocoInstall.stderr || chocoInstall.stdout)}`);
      }
      const sevenZip = await detectSevenZipPath();
      if (sevenZip) return sevenZip;
      throw new Error('7-Zip installation finished but 7z command is still unavailable.');
    }

    throw new Error('No supported Windows package manager found (winget/choco) to install 7-Zip.');
  }

  throw new Error('Automatic 7-Zip installation is supported on macOS and Windows only.');
}

export async function installPicocrypt(binDir: string, onLog?: (line: string) => void, options: InstallOptions = {}): Promise<string> {
  const userAgent = options.userAgent ?? 'dependency-installer';

  onLog?.('Resolving latest Picocrypt CLI release…');
  const release = await httpsJson<GitHubRelease>(RELEASE_URL, userAgent);
  const assetName = pickPicocryptAsset();
  const asset = release.assets.find((candidate) => candidate.name === assetName);
  if (!asset) {
    throw new Error(
      `Release ${release.tag_name} does not contain asset "${assetName}".`,
    );
  }

  fs.mkdirSync(binDir, { recursive: true });
  const localName = process.platform === 'win32' ? 'picocrypt-cli.exe' : 'picocrypt-cli';
  const destination = path.join(binDir, localName);
  onLog?.(`Downloading ${asset.name} from GitHub releases…`);
  await downloadFile(asset.browser_download_url, destination, userAgent);

  if (process.platform !== 'win32') {
    fs.chmodSync(destination, 0o755);
  }

  onLog?.(`Installed Picocrypt CLI to ${destination}`);
  return destination;
}
