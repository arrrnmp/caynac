#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { App } from './App.js';

const ALT_SCREEN_ENTER = '\u001B[?1049h\u001B[H';
const ALT_SCREEN_EXIT  = '\u001B[?1049l';
const MOUSE_DISABLE    = '\u001B[?1000l\u001B[?1002l\u001B[?1003l\u001B[?1005l\u001B[?1006l\u001B[?1015l';

function renderApp(element: React.ReactElement) {
  const useAltScreen = Boolean(process.stdout.isTTY);
  let restored = false;

  const restore = () => {
    if (!useAltScreen || restored) return;
    restored = true;
    process.stdout.write(MOUSE_DISABLE + ALT_SCREEN_EXIT);
  };

  if (useAltScreen) process.stdout.write(ALT_SCREEN_ENTER);

  try {
    const instance = render(element);
    process.once('exit', restore);
    void instance.waitUntilExit().finally(restore);
    return instance;
  } catch (error) {
    restore();
    throw error;
  }
}

const program = new Command();

program
  .name('caymann')
  .description('caymann — decrypt // decompress')
  .version('0.1.0');

program
  .command('decrypt [file]', { isDefault: false })
  .description('Decrypt a .pcv file')
  .action((file?: string) => {
    renderApp(<App initialScreen="decrypt" initialFile={file} />);
  });

program
  .command('decompress [archive]', { isDefault: false })
  .description('Extract a .7z archive')
  .action((archive?: string) => {
    renderApp(<App initialScreen="decompress" initialArchive={archive} />);
  });

program
  .action(() => {
    renderApp(<App />);
  });

program.parse();
