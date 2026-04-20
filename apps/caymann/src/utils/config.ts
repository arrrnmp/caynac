import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Language } from '@caynac/shared';
import { getDefaultLanguage, isValidLanguage } from '@caynac/shared';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'caymann');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const CONFIG_BIN_DIR = path.join(CONFIG_DIR, 'bin');

export interface CaymannConfig {
  picocryptPath?: string;
  sevenZipPath?: string;
  language?: Language;
}

export function getLanguage(config: CaymannConfig): Language {
  if (config.language && isValidLanguage(config.language)) {
    return config.language;
  }
  return getDefaultLanguage();
}

export function readConfig(): CaymannConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw) as CaymannConfig;
  } catch {
    return {};
  }
}

export function mergeConfig(patch: Partial<CaymannConfig>): void {
  const current = readConfig();
  const next = { ...current, ...patch };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
}

export { CONFIG_BIN_DIR, CONFIG_DIR };
