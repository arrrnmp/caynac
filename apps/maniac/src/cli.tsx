#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { App } from './App.js';

const ALT_SCREEN_ENTER = '\u001B[?1049h\u001B[H';
const ALT_SCREEN_EXIT = '\u001B[?1049l';
const MOUSE_DISABLE = '\u001B[?1000l\u001B[?1002l\u001B[?1003l\u001B[?1005l\u001B[?1006l\u001B[?1015l';

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
  .name('maniac')
  .description('Your maniacal toolkit — unrestrict, compress, encrypt')
  .version('1.0.0')
  .action(() => {
    renderApp(<App />);
  });

program
  .command('debrid [magnet]')
  .description('Unrestrict a torrent via Real-Debrid and download it')
  .option('-t, --token <token>', 'Real-Debrid API token')
  .option('-o, --output <dir>', 'Output directory for downloads')
  .action((magnet: string | undefined, opts: { token?: string; output?: string }) => {
    renderApp(
      <App
        initialScreen="debrid"
        initialMagnet={magnet}
        rdToken={opts.token}
        outputDir={opts.output}
      />,
    );
  });

program
  .command('compress [source]')
  .description('Compress files into a 7z archive with LZMA2 or ZSTD')
  .action((source: string | undefined) => {
    renderApp(<App initialScreen="compress" initialSource={source} />);
  });

program
  .command('decompress [archive]')
  .description('Extract a 7z archive and optionally delete the source')
  .action((archive: string | undefined) => {
    renderApp(<App initialScreen="decompress" initialArchive={archive} />);
  });

program
  .command('picocrypt [file]')
  .description('Encrypt or decrypt a file with Picocrypt NG CLI (PV2)')
  .action((file: string | undefined) => {
    renderApp(<App initialScreen="picocrypt" initialFile={file} />);
  });

program
  .command('onboarding')
  .alias('setup')
  .description('Install required external dependencies (7-Zip and Picocrypt NG CLI)')
  .action(() => {
    renderApp(<App initialScreen="onboarding" />);
  });

program.parse(process.argv);
