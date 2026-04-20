import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Language } from '@caynac/shared';
import { getDefaultLanguage, isValidLanguage } from '@caynac/shared';

export const CONFIG_DIR = path.join(os.homedir(), '.config', 'maniac');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export const CONFIG_BIN_DIR = path.join(CONFIG_DIR, 'bin');

export interface Config {
  rdToken?: string;
  defaultOutputDir?: string;
  picocryptPath?: string;
  sevenZipPath?: string;
  language?: Language;
}

export function getLanguage(config: Config): Language {
  if (config.language && isValidLanguage(config.language)) {
    return config.language;
  }
  return getDefaultLanguage();
}

export function readConfig(): Config {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as Config;
  } catch {
    return {};
  }
}

export function writeConfig(config: Config): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function mergeConfig(partial: Partial<Config>): void {
  writeConfig({ ...readConfig(), ...partial });
}
