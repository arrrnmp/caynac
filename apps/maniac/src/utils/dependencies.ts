import {
  checkDependencies as sharedCheckDependencies,
  installSevenZip as sharedInstallSevenZip,
  installPicocrypt as sharedInstallPicocrypt,
  type DependencyCheckResult,
} from '@caynac/shared';
import { CONFIG_BIN_DIR } from './config.js';

export type { DependencyCheckResult } from '@caynac/shared';

export async function checkExternalDependencies(config: {
  sevenZipPath?: string;
  picocryptPath?: string;
}): Promise<DependencyCheckResult> {
  return sharedCheckDependencies({
    sevenZipPath: config.sevenZipPath,
    picocryptPath: config.picocryptPath,
  });
}

export async function installSevenZip(onLog?: (line: string) => void): Promise<string> {
  return sharedInstallSevenZip(onLog, { userAgent: 'maniac' });
}

export async function installPicocrypt(onLog?: (line: string) => void): Promise<string> {
  return sharedInstallPicocrypt(CONFIG_BIN_DIR, onLog, { userAgent: 'maniac' });
}
