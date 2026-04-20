import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { ThemeProvider } from '@inkjs/ui';
import {
  theme,
  uiTheme,
  BLOCK_FULL,
  StarfieldBackdrop,
  MatrixParallaxBackdrop,
  GoodbyeOverlay,
  GOODBYE_TOTAL_MS,
  Spinner,
  DecompressCommand,
  Header,
  cg,
  buildGravitationRows,
  groupByColor,
  useScreenTransition,
  useBackdropWipe,
  useOnboardingOutro,
  LanguageMenu,
  getTranslations,
  type TransitionSnapshot,
  type TransitionState,
  type BackdropKind,
  type Language,
} from '@caynac/shared';
import { MainMenu, type MenuChoice, createMenuSnapshot } from './commands/MainMenu.js';
import { DebridCommand } from './commands/debrid/index.js';
import { CompressCommand } from './commands/compress/index.js';
import { PicocryptCommand } from './commands/picocrypt/index.js';
import { OnboardingCommand } from './commands/onboarding/index.js';
import { readConfig, mergeConfig, getLanguage } from './utils/config.js';
import { checkExternalDependencies } from './utils/dependencies.js';

type Screen = 'menu' | 'debrid' | 'compress' | 'decompress' | 'picocrypt' | 'onboarding' | 'language';

// figlet -f poison "MANIAC"
const LOGO_LINES: readonly string[] = [
  '@@@@@@@@@@    @@@@@@   @@@  @@@  @@@   @@@@@@    @@@@@@@',
  '@@@@@@@@@@@  @@@@@@@@  @@@@ @@@  @@@  @@@@@@@@  @@@@@@@@',
  '@@! @@! @@!  @@!  @@@  @@!@!@@@  @@!  @@!  @@@  !@@',
  '!@! !@! !@!  !@!  @!@  !@!!@!@!  !@!  !@!  @!@  !@!',
  '@!! !!@ @!@  @!@!@!@!  @!@ !!@!  !!@  @!@!@!@!  !@!',
  '!@!   ! !@!  !!!@!!!!  !@!  !!!  !!!  !!!@!!!!  !!!',
  '!!:     !!:  !!:  !!!  !!:  !!!  !!:  !!:  !!!  :!!',
  ':!:     :!:  :!:  !:!  :!:  !:!  :!:  :!:  !:!  :!:',
  ':::     ::   ::   :::   ::   ::   ::  ::   :::   ::: :::',
  ' :      :     :   : :  ::    :   :     :   : :   :: :: :',
];

const TAGLINE = '[ unrestrict // compress // encrypt ]';

export interface AppProps {
  initialScreen?: Screen;
  initialMagnet?: string;
  initialSource?: string;
  initialArchive?: string;
  initialFile?: string;
  rdToken?: string;
  outputDir?: string;
}

export function App({
  initialScreen = 'menu',
  initialMagnet,
  initialSource,
  initialArchive,
  initialFile,
  rdToken,
  outputDir,
}: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [startupChecking, setStartupChecking] = useState(initialScreen === 'menu');
  const [startupOnboarding, setStartupOnboarding] = useState(false);
  const [exitStartedAt, setExitStartedAt] = useState<number | null>(null);
  const [exitElapsedMs, setExitElapsedMs] = useState(0);

  const { transition, startTransition, clearTransition } = useScreenTransition();
  const { onboardingOutro, startOnboardingOutro, clearOnboardingOutro, onboardingFadeOutT, onboardingFadeInT } = useOnboardingOutro();
  const { backdropWipe, startBackdropWipe } = useBackdropWipe();

  const prevBackdropRef = useRef<BackdropKind>(initialScreen === 'onboarding' ? 'matrix' : 'starfield');
  const currentBackdrop: BackdropKind =
    (onboardingOutro != null || (transition?.target ?? screen) === 'onboarding') ? 'matrix' : 'starfield';

  const snapshotRef = useRef<(() => TransitionSnapshot) | null>(null);

  // Language state
  const config = readConfig();
  const [language, setLanguage] = useState<Language>(getLanguage(config));
  const t = getTranslations(language);
  const isExiting = exitStartedAt !== null;

  useEffect(() => { snapshotRef.current = null; }, [screen]);

  useEffect(() => {
    if (exitStartedAt === null) return;
    setExitElapsedMs(0);
    const tick = setInterval(() => {
      setExitElapsedMs(Date.now() - exitStartedAt);
    }, 33);
    const done = setTimeout(() => {
      exit();
    }, GOODBYE_TOTAL_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [exit, exitStartedAt]);

  const startExitOutro = () => {
    if (isExiting) return;
    setExitStartedAt(Date.now());
  };

  const goToMenu = () => {
    if (screen === 'menu') return;
    const snapshot = snapshotRef.current?.() ?? createMenuSnapshot(t, 0);
    startTransition('menu', snapshot);
  };

  useInput((_, key) => {
    if (isExiting) return;
    if (key.escape && screen === 'menu') startExitOutro();
  });

  const handleMenuSelect = (choice: MenuChoice, snapshot: TransitionSnapshot) => {
    if (isExiting) return;
    if (choice === 'exit') {
      startExitOutro();
      return;
    }
    startTransition(choice, snapshot);
  };

  const handleLanguageSelect = (lang: Language, _snapshot: TransitionSnapshot) => {
    setLanguage(lang);
    mergeConfig({ language: lang });
    goToMenu();
  };

  useEffect(() => {
    if (initialScreen !== 'menu') return;
    let cancelled = false;
    void (async () => {
      try {
        const deps = await checkExternalDependencies(readConfig());
        if (cancelled) return;
        if (deps.statuses.some((dep) => !dep.installed)) {
          setStartupOnboarding(true);
          setScreen('onboarding');
        }
      } finally {
        if (!cancelled) setStartupChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialScreen]);

  useEffect(() => {
    if (!transition) return;
    const target = transition.target as Screen;
    const timer = setTimeout(() => {
      setScreen(target);
      clearTransition();
    }, 520);
    return () => clearTimeout(timer);
  }, [transition?.startedAt, transition?.target, clearTransition]);

  useEffect(() => {
    if (!onboardingOutro) return;
    const timer = setTimeout(() => {
      setScreen('menu');
      clearOnboardingOutro();
    }, 1080);
    return () => clearTimeout(timer);
  }, [onboardingOutro, clearOnboardingOutro]);

  useEffect(() => {
    if (currentBackdrop === prevBackdropRef.current) return;
    const from = prevBackdropRef.current;
    prevBackdropRef.current = currentBackdrop;
    startBackdropWipe(from, currentBackdrop);
  }, [currentBackdrop, startBackdropWipe]);

  const cols = Math.max(80, stdout.columns ?? 100);
  const rows = Math.max(28, stdout.rows ?? 30);
  const headerOffset = Math.max(1, Math.min(4, Math.floor(rows * 0.09)));
  const panelOffset = Math.max(1, Math.min(3, Math.floor(rows * 0.05)));
  const panelWidth = Math.max(86, Math.min(112, cols - 8));
  const panelHeight = Math.max(18, Math.min(24, rows - headerOffset - panelOffset - 6));
  const panelFillRow = BLOCK_FULL.repeat(panelWidth);
  const panelInnerWidth = Math.max(1, panelWidth - 2);
  const panelInnerHeight = Math.max(1, panelHeight - 2);

  const activeScreen = transition?.target ?? screen;
  const promptTitle =
    activeScreen === 'debrid' ? t.realDebridTitle :
    activeScreen === 'compress' ? t.compressorTitle :
    activeScreen === 'decompress' ? t.decompressorTitle :
    activeScreen === 'onboarding' ? t.onboardingTitle :
    activeScreen === 'language' ? t.languageTitle :
    t.picocryptTitle;

  const sourceBackdrop: BackdropKind = screen === 'onboarding' ? 'matrix' : 'starfield';
  const activeBackdrop: BackdropKind =
    backdropWipe
      ? (backdropWipe.progress < 0.5 ? backdropWipe.from : backdropWipe.to)
      : (onboardingOutro != null ? 'matrix' : sourceBackdrop);
  const mouseReactive = !isExiting && (transition
    ? (transition.progress < 0.5 ? screen === 'menu' : transition.target === 'menu')
    : screen === 'menu');
  const backdropMaskQuarters = backdropWipe
    ? (() => {
      const p = Math.max(0, Math.min(1, backdropWipe.progress));
      const step = Math.min(8, Math.floor(p * 9));
      if (step <= 4) return step;
      return 8 - step;
    })()
    : 0;

  const baseBgRows = useMemo(
    () => Array.from({ length: rows }, (_, i) => (
      <Text key={`base-${i}`} backgroundColor={theme.bg}>{' '.repeat(cols)}</Text>
    )),
    [cols, rows],
  );

  const maskedBackdropRows = useMemo(() => {
    if (backdropMaskQuarters <= 0) return [];
    return Array.from({ length: rows }, (_, y) => y).filter((y) => (y & 3) < backdropMaskQuarters);
  }, [backdropMaskQuarters, rows]);

  // Build transition animation rows
  const transitionRows = useMemo(() => {
    if (!transition) return [];
    const targetSnap = buildTargetSnapshot(transition.target as Screen);
    return buildGravitationRows({
      width: panelInnerWidth,
      height: panelInnerHeight,
      transition: transition as TransitionState,
      targetSnapshot: targetSnap,
    });
  }, [panelInnerHeight, panelInnerWidth, transition]);

  // Onboarding outro rows
  const onboardingOutroRows = useMemo(() => {
    const snapshot = createMenuSnapshot(t, 0);
    const rows = Array.from({ length: panelInnerHeight }, () => ' '.repeat(panelInnerWidth));
    const offsetY = 1;
    const offsetX = 2;

    const place = (line: string, text: string, start: number) => {
      if (start >= line.length) return line;
      const left = line.slice(0, start);
      const rightStart = Math.min(line.length, start + text.length);
      const right = line.slice(rightStart);
      const fitted = text.slice(0, Math.max(0, line.length - start));
      return left + fitted + right;
    };

    snapshot.rows.forEach((source, idx) => {
      const y = idx + offsetY;
      if (y < 0 || y >= rows.length) return;
      rows[y] = place(rows[y]!, source.map((g) => g.ch).join(''), offsetX);
    });
    return rows;
  }, [panelInnerHeight, panelInnerWidth, t]);

  // Helper to build target snapshot for transitions
  function buildTargetSnapshot(screenName: Screen): TransitionSnapshot {
    if (screenName === 'menu') return createMenuSnapshot(t, 0);

    const titles: Record<Exclude<Screen, 'menu'>, string> = {
      debrid: t.realDebridTitle,
      compress: t.compressorTitle,
      decompress: t.decompressorTitle,
      picocrypt: t.picocryptTitle,
      onboarding: t.onboardingTitle,
      language: t.languageTitle,
    };
    const prompts: Record<Exclude<Screen, 'menu'>, string> = {
      debrid: t.enterToken,
      compress: t.enterSourcePath,
      decompress: t.enterArchivePath,
      picocrypt: t.chooseOperation,
      onboarding: t.checkingDependencies,
      language: t.selectLanguage,
    };
    const title = titles[screenName];
    const prompt = prompts[screenName];
    return {
      rows: [
        cg(title, theme.brand, true),
        cg('─'.repeat(title.length), theme.panelBorderSoft),
        [],
        cg('› ' + prompt, theme.text),
      ],
    };
  }

  return (
    <ThemeProvider theme={uiTheme}>
      <Box width={cols} height={rows} overflow="hidden">
        <Box position="absolute" width={cols} height={rows} flexDirection="column">
          {baseBgRows}
        </Box>
        <Box position="absolute" width={cols} height={rows}>
          {activeBackdrop === 'starfield' ? (
            <>
              <Box key="matrix-backdrop" position="absolute" width={cols} height={rows}>
                <MatrixParallaxBackdrop width={cols} height={rows} frozen />
              </Box>
              <Box key="starfield-backdrop" position="absolute" width={cols} height={rows}>
                <StarfieldBackdrop
                  width={cols}
                  height={rows}
                  mouseReactive={mouseReactive}
                  frozen={backdropWipe !== null}
                />
              </Box>
            </>
          ) : (
            <>
              <Box key="starfield-backdrop" position="absolute" width={cols} height={rows}>
                <StarfieldBackdrop width={cols} height={rows} mouseReactive={false} frozen />
              </Box>
              <Box key="matrix-backdrop" position="absolute" width={cols} height={rows}>
                <MatrixParallaxBackdrop width={cols} height={rows} frozen={backdropWipe !== null} />
              </Box>
            </>
          )}
        </Box>
        {maskedBackdropRows.length > 0 && (
          <Box position="absolute" width={cols} height={rows} overflow="hidden">
            {maskedBackdropRows.map((row) => (
              <Box key={`bw-${row}`} position="absolute" width={cols} marginTop={row}>
                <Text color={theme.bg} backgroundColor={theme.bg}>
                  {BLOCK_FULL.repeat(cols)}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {!isExiting && (
          <Box flexDirection="column" width={cols} height={rows} alignItems="center">
          <Header logo={LOGO_LINES} tagline={TAGLINE} centered topOffset={headerOffset} />

          <Box marginTop={panelOffset} width={panelWidth} height={panelHeight} overflow="hidden">
            <Box position="absolute" width={panelWidth} height={panelHeight} overflow="hidden">
              {Array.from({ length: panelHeight }, (_, i) => (
                <Text key={i} color={theme.panelBg} backgroundColor={theme.panelBg}>
                  {panelFillRow}
                </Text>
              ))}
            </Box>

            <Box width="100%" height="100%" borderStyle="round" borderColor={theme.panelBg} overflow="hidden">
              {transition ? (
                <Box flexDirection="column" width="100%" height="100%" overflow="hidden">
                  <Box position="absolute" width={panelInnerWidth} height={panelInnerHeight} overflow="hidden">
                    {Array.from({ length: panelInnerHeight }, (_, i) => (
                      <Text key={`transition-fill-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
                        {BLOCK_FULL.repeat(panelInnerWidth)}
                      </Text>
                    ))}
                  </Box>
                  {transitionRows.map((row, i) => (
                    <Text key={i} backgroundColor={theme.panelBg}>
                      {groupByColor(row).map((span, si) => (
                        <Text key={si} color={span.color} bold={span.bold ?? false} backgroundColor={theme.panelBg}>
                          {span.text}
                        </Text>
                      ))}
                    </Text>
                  ))}
                </Box>
) : screen === 'menu' ? (
          startupChecking ? (
            <Box flexDirection="column" width="100%" height="100%" overflow="hidden" paddingX={2} paddingTop={1}>
              <Text backgroundColor={theme.panelBg} color={theme.title} bold>{t.startupTitle}</Text>
              <Text backgroundColor={theme.panelBg} color={theme.muted}>{t.checkingRequiredDeps}</Text>
              <Box marginTop={1}>
                <Spinner label={t.scanningDeps} color={theme.brand} />
              </Box>
            </Box>
          ) : (
            <MainMenu
              onSelect={handleMenuSelect}
              t={t}
              registerSnapshot={(fn) => { snapshotRef.current = fn; }}
            />
          )
        ) : screen === 'language' ? (
          <LanguageMenu
            currentLanguage={language}
            onSelect={handleLanguageSelect}
            onBack={goToMenu}
            t={t}
            registerSnapshot={(fn) => { snapshotRef.current = fn; }}
          />
        ) : (
          <Box flexDirection="column" width="100%" height="100%" overflow="hidden">
            <Box flexDirection="column" paddingX={2} paddingTop={1}>
              <Text backgroundColor={theme.panelBg} color={theme.title} bold>{promptTitle}</Text>
              <Text backgroundColor={theme.panelBg} color={theme.muted}>{t.escReturnsToMenu}</Text>
            </Box>
                  <Box flexGrow={1} overflow="hidden">
          {screen === 'debrid' && (
            <DebridCommand
              initialToken={rdToken}
              initialMagnet={initialMagnet}
              initialOutputDir={outputDir}
              t={t}
              onBack={goToMenu}
              registerSnapshot={(fn) => { snapshotRef.current = fn; }}
            />
          )}
          {screen === 'compress' && (
            <CompressCommand
              initialSource={initialSource}
              t={t}
              onBack={goToMenu}
              registerSnapshot={(fn) => { snapshotRef.current = fn; }}
            />
          )}
          {screen === 'decompress' && (
            <DecompressCommand
              initialArchive={initialArchive}
              sevenZipBin={readConfig().sevenZipPath ?? '7z'}
              t={t}
              onBack={goToMenu}
              registerSnapshot={(fn) => { snapshotRef.current = fn; }}
            />
          )}
          {screen === 'picocrypt' && (
            <PicocryptCommand
              initialFile={initialFile}
              t={t}
              onBack={goToMenu}
              registerSnapshot={(fn) => { snapshotRef.current = fn; }}
            />
          )}
          {screen === 'onboarding' && (
            <OnboardingCommand
              onBack={goToMenu}
              onComplete={() => {
                if (!onboardingOutro) {
                  startOnboardingOutro();
                }
              }}
              disableInput={Boolean(onboardingOutro)}
              registerSnapshot={(fn) => { snapshotRef.current = fn; }}
              autoCompleteOnDone={startupOnboarding}
              t={t}
            />
          )}
                  </Box>
                </Box>
              )}

              {onboardingOutro && (
                <Box position="absolute" width={panelInnerWidth} height={panelInnerHeight} overflow="hidden">
                  {onboardingFadeInT <= 0 ? (
                    <>
                      {Array.from({ length: Math.floor(panelInnerHeight * onboardingFadeOutT) }, (_, i) => (
                        <Text key={`onboarding-wipe-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
                          {BLOCK_FULL.repeat(panelInnerWidth)}
                        </Text>
                      ))}
                    </>
                  ) : (
                    <>
                      {Array.from({ length: panelInnerHeight }, (_, i) => (
                        <Text key={`onboarding-menu-fill-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
                          {BLOCK_FULL.repeat(panelInnerWidth)}
                        </Text>
                      ))}
                      {onboardingOutroRows.map((row, i) => {
                        const low = onboardingFadeInT < 0.34;
                        const mid = onboardingFadeInT >= 0.34 && onboardingFadeInT < 0.68;
                        const color = low ? theme.dim : mid ? theme.muted : i <= 1 ? theme.title : theme.text;
                        return (
                          <Text
                            key={`onboarding-menu-${i}`}
                            backgroundColor={theme.panelBg}
                            color={color}
                            bold={onboardingFadeInT > 0.7 && i <= 1}
                          >
                            {row}
                          </Text>
                        );
                      })}
                    </>
                  )}
                </Box>
              )}
            </Box>
          </Box>
          </Box>
        )}
        {isExiting && (
          <Box position="absolute" width={cols} height={rows}>
            <GoodbyeOverlay
              width={cols}
              height={rows}
              elapsedMs={exitElapsedMs}
            />
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
