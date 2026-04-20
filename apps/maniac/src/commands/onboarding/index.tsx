import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  theme,
  BLOCK_FULL,
  Badge,
  Divider,
  ErrorBox,
  SelectList,
  Spinner,
  type TransitionSnapshot,
  type ColoredGlyph,
  installSevenZip as sharedInstallSevenZip,
  installPicocrypt as sharedInstallPicocrypt,
  checkDependencies,
  type DependencyCheckResult,
  type Translations,
} from '@caynac/shared';
import { mergeConfig, readConfig, CONFIG_BIN_DIR } from '../../utils/config.js';

type Step = 'checking' | 'ready' | 'installing' | 'done' | 'error';

interface Props {
  onBack: () => void;
  onComplete?: () => void;
  disableInput?: boolean;
  registerSnapshot?: (fn: () => TransitionSnapshot) => void;
  autoCompleteOnDone?: boolean;
  t: Translations;
}

const cg = (text: string, color: string, bold?: boolean): ColoredGlyph[] =>
  [...text].map((ch) => ({ ch, color, bold }));

const LOG_LINES = 10;

export function OnboardingCommand({
  onBack,
  onComplete,
  disableInput = false,
  registerSnapshot,
  autoCompleteOnDone = true,
  t,
}: Props) {
  const [step, setStep] = useState<Step>('checking');
  const [status, setStatus] = useState<DependencyCheckResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [autoCompleted, setAutoCompleted] = useState(false);
  const fillRow = BLOCK_FULL.repeat(220);

  const pushLog = (line: string) => {
    const clean = line.trim();
    if (!clean) return;
    setLogs((prev) => [...prev, clean].slice(-LOG_LINES));
  };

  const fail = (message: string) => { setError(message); setStep('error'); };

  const missingCount = useMemo(
    () => status?.statuses.filter((dep) => !dep.installed).length ?? 0,
    [status],
  );

  useEffect(() => {
    if (!registerSnapshot) return;
    registerSnapshot(() => ({
      rows: [
        cg(t.onboardingTitle, theme.brand, true),
        cg('─'.repeat(10), theme.panelBorderSoft),
        [],
        ...(step === 'checking' ? [cg(t.checkingDependencies, theme.muted)] : []),
        ...(step === 'installing' ? [cg('Installing dependencies…', theme.purple)] : []),
        ...(step === 'done' ? [cg(`✔ ${t.depsInstalled}`, theme.success, true)] : []),
        ...(step === 'error' ? [cg(`${t.errorLabel} ${error}`, theme.warning)] : []),
        ...(status ? status.statuses.map((dep) =>
          cg(`${dep.installed ? '✔' : '•'} ${dep.label}`, dep.installed ? theme.success : theme.warning)
        ) : []),
      ],
    }));
  }, [registerSnapshot, step, status, error, t]);

  const isBusy = step === 'checking' || step === 'installing';
  useInput((_, key) => {
    if (disableInput) return;
    if (key.escape && !isBusy) onBack();
  });

  useEffect(() => {
    if (step !== 'checking') return;
    void (async () => {
      try {
        setLogs([]);
        const cfg = readConfig();
        const deps = await checkDependencies(cfg);
        setStatus(deps);
        setStep('ready');
      } catch (err) {
        fail((err as Error).message);
      }
    })();
  }, [step]);

  useEffect(() => {
    if (step !== 'installing') return;
    if (!status) {
      fail('Dependency status is not available yet.');
      return;
    }
    if (!status.platformSupported) {
      fail(t.onboardingPlatformWarning);
      return;
    }

    void (async () => {
      try {
        const missing = status.statuses.filter((dep) => !dep.installed);
        if (missing.length === 0) {
          setStep('ready');
          return;
        }

        for (const dep of missing) {
          pushLog(`Installing ${dep.label}…`);
          let path = '';
          if (dep.id === 'sevenZip') {
            path = await sharedInstallSevenZip(pushLog, { userAgent: 'maniac' });
            mergeConfig({ sevenZipPath: path });
          } else if (dep.id === 'picocrypt') {
            path = await sharedInstallPicocrypt(CONFIG_BIN_DIR, pushLog, { userAgent: 'maniac' });
            mergeConfig({ picocryptPath: path });
          }
          pushLog(`${dep.label} ready: ${path}`);
        }

        const cfg = readConfig();
        const refreshed = await checkDependencies(cfg);
        setStatus(refreshed);
        const remaining = refreshed.statuses.filter((dep) => !dep.installed);
        if (remaining.length > 0) {
          fail(`Installation completed with missing dependencies: ${remaining.map((dep) => dep.label).join(', ')}`);
          return;
        }
        setStep('done');
      } catch (err) {
        fail((err as Error).message);
      }
    })();
  }, [step, status, t]);

  useEffect(() => {
    if (!autoCompleteOnDone || !onComplete || autoCompleted || step !== 'done') return;
    setAutoCompleted(true);
    const timer = setTimeout(() => {
      onComplete();
    }, 450);
    return () => clearTimeout(timer);
  }, [autoCompleteOnDone, autoCompleted, onComplete, step]);

  return (
    <Box width="100%" height="100%" overflow="hidden">
      <Box position="absolute" width="100%" height="100%" overflow="hidden">
        {Array.from({ length: 56 }, (_, i) => (
          <Text key={`onboarding-fill-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
            {fillRow}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" gap={1} paddingX={2}>
        <Box gap={1}>
          <Badge variant="brand">{t.onboardingBadge}</Badge>
          <Text color={theme.dim} backgroundColor={theme.panelBg}>
            {t.onboardingDescShort}
          </Text>
        </Box>
        <Divider />

        {step === 'checking' && (
          <Spinner label={t.checkingDependencies} color={theme.brand} />
        )}

        {(step === 'ready' || step === 'done' || step === 'installing') && status && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.onboardingPlatform}{' '}
              <Text color={theme.cyan} backgroundColor={theme.panelBg} bold>{status.platformLabel}</Text>
            </Text>

            {!status.platformSupported && (
              <Text color={theme.warning} backgroundColor={theme.panelBg}>
                {t.onboardingPlatformWarning}
              </Text>
            )}

            <Box flexDirection="column">
              {status.statuses.map((dep) => (
                <Box key={dep.id} gap={1}>
                  <Text
                    color={dep.installed ? theme.success : theme.warning}
                    backgroundColor={theme.panelBg}
                    bold
                  >
                    {dep.installed ? '✔' : '•'}
                  </Text>
                  <Text color={theme.text} backgroundColor={theme.panelBg}>{dep.label}</Text>
                  <Text color={theme.dim} backgroundColor={theme.panelBg}>
                    {dep.path ? `(${dep.path})` : t.missing}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {step === 'ready' && status && (
          <Box flexDirection="column" gap={1}>
            {missingCount > 0 ? (
              <Text color={theme.warning} backgroundColor={theme.panelBg}>
                {missingCount === 1 ? t.depsMissing.replace('{N}', String(missingCount)) : t.depsMissingPlural.replace('{N}', String(missingCount))}
              </Text>
            ) : (
              <Text color={theme.success} backgroundColor={theme.panelBg}>
                {t.depsInstalled}
              </Text>
            )}

            <SelectList
              options={[
                ...(status.platformSupported && missingCount > 0
                  ? [{ label: t.installMissingDeps, value: 'install' }]
                  : []),
                { label: t.rerunChecks, value: 'refresh' },
                { label: t.backToMenuOption, value: 'back' },
              ]}
              onChange={(value) => {
                if (value === 'install') {
                  setLogs([]);
                  setStep('installing');
                  return;
                }
                if (value === 'refresh') {
                  setStep('checking');
                  return;
                }
                onBack();
              }}
            />
          </Box>
        )}

        {step === 'installing' && (
          <Box flexDirection="column" gap={1}>
            <Spinner label="Installing dependencies…" color={theme.purple} />
            <Box flexDirection="column">
              {logs.length === 0 ? (
                <Text color={theme.dim} backgroundColor={theme.panelBg}>
                  {t.waitingForInstaller}
                </Text>
              ) : (
                logs.map((line, idx) => (
                  <Text key={`${idx}-${line}`} color={theme.muted} backgroundColor={theme.panelBg}>
                    {line}
                  </Text>
                ))
              )}
            </Box>
          </Box>
        )}

        {step === 'done' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.success} backgroundColor={theme.panelBg} bold>
              ✔ {t.onboardingComplete}
            </Text>
            <Text color={theme.dim} backgroundColor={theme.panelBg}>
              {t.preparingMenu}
            </Text>
          </Box>
        )}

        {step === 'error' && <ErrorBox message={error} onBack={onBack} t={t} />}
      </Box>
    </Box>
  );
}
