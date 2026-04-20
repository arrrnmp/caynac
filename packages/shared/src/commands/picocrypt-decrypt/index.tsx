import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { theme, BLOCK_FULL } from '../../theme.js';
import { Spinner } from '../../components/Spinner.js';
import { ProgressBar } from '../../components/ProgressBar.js';
import { Badge } from '../../components/Badge.js';
import { ErrorBox } from '../../components/ErrorBox.js';
import { PasswordInput } from '../../components/PasswordInput.js';
import { Divider } from '../../components/Divider.js';
import { SelectList } from '../../components/SelectList.js';
import { runPicocrypt } from '../../utils/picocrypt.js';
import type { TransitionSnapshot, ColoredGlyph } from '../../transition.js';
import type { Translations } from '../../i18n/index.js';

type AuthMethod = 'password' | 'keyfile' | 'both';

type Step =
  | 'enter_input'
  | 'enter_output'
  | 'pick_auth'
  | 'enter_password'
  | 'enter_keyfile'
  | 'processing'
  | 'done'
  | 'error';

interface Props {
  initialFile?: string;
  picocryptBin?: string;
  onBack: () => void;
  registerSnapshot?: (fn: () => TransitionSnapshot) => void;
  t: Translations;
}

const cg = (text: string, color: string, bold?: boolean): ColoredGlyph[] =>
  [...text].map((ch) => ({ ch, color, bold }));

function autoOutput(file: string): string {
  return file.endsWith('.pcv') ? file.slice(0, -4) : `${file}.decrypted`;
}

export function PicocryptDecryptCommand({ initialFile, picocryptBin = 'picocrypt-cli', onBack, registerSnapshot, t }: Props) {
  const [step, setStep] = useState<Step>(initialFile ? 'enter_output' : 'enter_input');
  const [inputFile, setInputFile] = useState(initialFile ?? '');
  const [outputFile, setOutputFile] = useState(initialFile ? autoOutput(initialFile) : '');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');
  const [password, setPassword] = useState('');
  const [keyfiles, setKeyfiles] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fillRow = BLOCK_FULL.repeat(220);

  const isBusy = step === 'processing';

  useInput((_, key) => {
    if (key.escape && !isBusy) onBack();
  });

  const fail = (msg: string) => { setError(msg); setStep('error'); };

  const afterCredentials = () => setStep('processing');

  useEffect(() => {
    if (!registerSnapshot) return;
    registerSnapshot(() => ({
      rows: [
        cg(t.decryptTitle, theme.brand, true),
        cg('─'.repeat(7), theme.panelBorderSoft),
        [],
        ...(step === 'enter_input' ? [cg(t.inputFilePathPrompt, theme.muted)] : []),
        ...(step === 'enter_output' ? [cg(t.outputPathPrompt, theme.muted)] : []),
        ...(step === 'pick_auth' ? [cg(t.authMethodLabel, theme.muted)] : []),
        ...(step === 'enter_password' || step === 'enter_keyfile' ? [cg('Enter credentials', theme.muted)] : []),
        ...(step === 'processing' ? [cg(`${t.decrypting} ${Math.round(progress * 100)}%`, theme.text)] : []),
        ...(step === 'done' ? [cg(t.decryptedSuccess, theme.success, true)] : []),
        ...(step === 'error' ? [cg(`${t.errorLabel} ${error}`, theme.warning)] : []),
      ],
    }));
  }, [registerSnapshot, step, progress, error, t]);

  useEffect(() => {
    if (step !== 'processing') return;

    void (async () => {
      try {
        await runPicocrypt(
          {
            mode: 'decrypt',
            input: inputFile,
            output: outputFile,
            password: (authMethod === 'password' || authMethod === 'both') ? password : undefined,
            keyfiles: keyfiles.length > 0 ? keyfiles : undefined,
            binaryPath: picocryptBin,
          },
          setProgress,
        );
        setStep('done');
      } catch (err) {
        fail((err as Error).message);
      }
    })();
  }, [step]);

  return (
    <Box width="100%" height="100%" overflow="hidden">
      <Box position="absolute" width="100%" height="100%" overflow="hidden">
        {Array.from({ length: 56 }, (_, i) => (
          <Text key={`picocrypt-decrypt-fill-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
            {fillRow}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" gap={1} paddingX={2}>
        <Box gap={1}>
          <Badge variant="brand">{t.picocryptDecryptBadge}</Badge>
          <Text color={theme.dim} backgroundColor={theme.panelBg}>
            {t.decryptMode}{' '}
            <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.binaryLabel} </Text>
            <Text color={theme.muted} backgroundColor={theme.panelBg}>{picocryptBin}</Text>
          </Text>
        </Box>
        <Divider />

        {step === 'enter_input' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.enterPcvPath}
            </Text>
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder={t.inputFilePathPlaceholder}
                onSubmit={(v) => {
                  const f = v.trim();
                  setInputFile(f);
                  setOutputFile(autoOutput(f));
                  setStep('enter_output');
                }}
              />
            </Box>
          </Box>
        )}

        {step === 'enter_output' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.outputPathPrompt}</Text>{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>({t.outputPathPlaceholder}):</Text>
            </Text>
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder={autoOutput(inputFile)}
                onSubmit={(v) => {
                  setOutputFile(v.trim() || autoOutput(inputFile));
                  setStep('pick_auth');
                }}
              />
            </Box>
          </Box>
        )}

        {step === 'pick_auth' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.chooseOperation}
            </Text>
            <SelectList
              options={[
                { label: t.authPasswordOnly, value: 'password' },
                { label: t.authKeyfileOnly, value: 'keyfile' },
                { label: t.authPasswordKeyfile, value: 'both' },
              ]}
              onChange={(v) => {
                const m = v as AuthMethod;
                setAuthMethod(m);
                if (m === 'keyfile') setStep('enter_keyfile');
                else setStep('enter_password');
              }}
            />
          </Box>
        )}

        {step === 'enter_password' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.passwordLabel}
            </Text>
            <PasswordInput
              placeholder={t.passwordLabel}
              isActive
              onSubmit={(v) => {
                setPassword(v);
                if (authMethod === 'both') setStep('enter_keyfile');
                else afterCredentials();
              }}
            />
          </Box>
        )}

        {step === 'enter_keyfile' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.keyfilePathPrompt}{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.keyfileHint}</Text>
            </Text>
            {keyfiles.length > 0 && (
              <Box flexDirection="column">
                {keyfiles.map((kf) => (
                  <Text key={kf} color={theme.cyan} backgroundColor={theme.panelBg}> ✓ {kf}</Text>
                ))}
              </Box>
            )}
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder={t.keyfilePlaceholder}
                onSubmit={(v) => {
                  const kf = v.trim();
                  if (kf) {
                    setKeyfiles((prev) => [...prev, kf]);
                  } else {
                    afterCredentials();
                  }
                }}
              />
            </Box>
          </Box>
        )}

        {step === 'processing' && (
          <Box flexDirection="column" gap={1}>
            <Box gap={1}>
              <Spinner color={theme.purple} />
              <Text color={theme.text} backgroundColor={theme.panelBg} bold>{t.decrypting}</Text>
            </Box>
            <ProgressBar value={progress} label={inputFile} />
            <Box flexDirection="column">
              <Text color={theme.dim} backgroundColor={theme.panelBg}> {t.authPrefix} {authMethod}</Text>
              {keyfiles.length > 0 && <Text color={theme.dim} backgroundColor={theme.panelBg}> ✓ {keyfiles.length} {t.keyfileCount.replace('{N}', String(keyfiles.length))}</Text>}
            </Box>
          </Box>
        )}

        {step === 'done' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.success} backgroundColor={theme.panelBg} bold>✔ {t.decryptedSuccess}</Text>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.outputLabel}{' '}<Text color={theme.cyan} backgroundColor={theme.panelBg}>{outputFile}</Text>
            </Text>
            <Divider />
            <Text color={theme.dim} backgroundColor={theme.panelBg}>
              {t.escReturnsToMenu}
            </Text>
          </Box>
        )}

        {step === 'error' && <ErrorBox message={error} onBack={onBack} t={t} />}
      </Box>
    </Box>
  );
}
