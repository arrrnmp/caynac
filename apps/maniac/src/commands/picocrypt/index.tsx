import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { theme, BLOCK_FULL, Spinner, ProgressBar, Badge, ErrorBox, PasswordInput, Divider, SelectList, runPicocrypt, type TransitionSnapshot, type ColoredGlyph, type Translations } from '@caynac/shared';
import { readConfig, mergeConfig } from '../../utils/config.js';

type Mode = 'encrypt' | 'decrypt';
type AuthMethod = 'password' | 'keyfile' | 'both';

type Step =
  | 'pick_mode'
  | 'enter_input'
  | 'enter_output'
  | 'pick_auth'
  | 'enter_password'
  | 'confirm_password'
  | 'enter_keyfile'
  | 'pick_reedsol'
  | 'pick_deniability'
  | 'enter_comment'
  | 'processing'
  | 'done'
  | 'error';

interface Props {
  initialFile?: string;
  onBack: () => void;
  registerSnapshot?: (fn: () => TransitionSnapshot) => void;
  t: Translations;
}

const cg = (text: string, color: string, bold?: boolean): ColoredGlyph[] =>
  [...text].map((ch) => ({ ch, color, bold }));

function autoOutput(file: string, mode: Mode): string {
  if (mode === 'encrypt') return file.endsWith('.pcv') ? file : `${file}.pcv`;
  return file.endsWith('.pcv') ? file.slice(0, -4) : `${file}.decrypted`;
}

export function PicocryptCommand({ initialFile, onBack, registerSnapshot, t }: Props) {
  const cfg = readConfig();
  const picocryptBin = cfg.picocryptPath ?? 'picocrypt-cli';

  const [step, setStep] = useState<Step>('pick_mode');
  const [mode, setMode] = useState<Mode>('encrypt');
  const [inputFile, setInputFile] = useState(initialFile ?? '');
  const [outputFile, setOutputFile] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [keyfiles, setKeyfiles] = useState<string[]>([]);
  const [reedsol, setReedsol] = useState(false);
  const [deniability, setDeniability] = useState(false);
  const [comment, setComment] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fillRow = BLOCK_FULL.repeat(220);

  const isBusy = step === 'processing';

  useEffect(() => {
    if (!registerSnapshot) return;
    const modeLabel = mode === 'encrypt' ? t.encryptMode : t.decryptMode;
    registerSnapshot(() => ({
      rows: [
        cg(t.picocryptTitle, theme.brand, true),
        cg('─'.repeat(9), theme.panelBorderSoft),
        [],
        cg(`${modeLabel} ${inputFile || '(no file yet)'}`, theme.text),
        ...(outputFile ? [cg(`→ ${outputFile}`, theme.cyan)] : []),
        ...(step === 'processing' ? [cg(`${modeLabel} ${Math.round(progress * 100)}%`, theme.purple)] : []),
        ...(step === 'done' ? [cg(`✔ ${modeLabel} ${t.extractedSuccess}`, theme.success, true)] : []),
        ...(step === 'error' ? [cg(`${t.errorLabel} ${error}`, theme.warning)] : []),
      ],
    }));
  }, [registerSnapshot, step, mode, inputFile, outputFile, progress, error, t]);

  useInput((_, key) => {
    if (key.escape && !isBusy) onBack();
  });

  const fail = (msg: string) => { setError(msg); setStep('error'); };

  const afterCredentials = () => {
    if (mode === 'encrypt') setStep('pick_reedsol');
    else setStep('processing');
  };

  useEffect(() => {
    if (step !== 'processing') return;

    if (mode === 'encrypt' && (authMethod === 'password' || authMethod === 'both') && password !== confirmPwd) {
      fail(t.passwordsDoNotMatch || 'Passwords do not match.');
      return;
    }

    void (async () => {
      try {
        await runPicocrypt(
          {
            mode,
            input: inputFile,
            output: outputFile,
            password: (authMethod === 'password' || authMethod === 'both') ? password : undefined,
            keyfiles: keyfiles.length > 0 ? keyfiles : undefined,
            reedsol: reedsol,
            deniability,
            comment: comment || undefined,
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
          <Text key={`picocrypt-fill-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
            {fillRow}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" gap={1} paddingX={2}>
        <Box gap={1}>
          <Badge variant="brand">{t.picocrypt}</Badge>
          <Text color={theme.dim} backgroundColor={theme.panelBg}>
            {mode === 'encrypt' ? t.encryptMode : t.decryptMode}{' '}
            <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.binaryLabel} </Text>
            <Text color={theme.muted} backgroundColor={theme.panelBg}>{picocryptBin}</Text>
          </Text>
        </Box>
        <Divider />

        {step === 'pick_mode' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.chooseOperation}
            </Text>
            <SelectList
              options={[
                { label: `${t.operationEncrypt} — ${t.operationEncryptDesc}`, value: 'encrypt' },
                { label: `${t.operationDecrypt} — ${t.operationDecryptDesc}`, value: 'decrypt' },
              ]}
              onChange={(v) => {
                const m = v as Mode;
                setMode(m);
                setStep('enter_input');
              }}
            />
          </Box>
        )}

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
                  setOutputFile(autoOutput(f, mode));
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
              <Text color={theme.dim} backgroundColor={theme.panelBg}>({t.autoPlaceholder}):</Text>
            </Text>
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder={autoOutput(inputFile, mode)}
                onSubmit={(v) => {
                  setOutputFile(v.trim() || autoOutput(inputFile, mode));
                  setStep('pick_auth');
                }}
              />
            </Box>
          </Box>
        )}

        {step === 'pick_auth' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.authMethodLabel}
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
                if (mode === 'encrypt') setStep('confirm_password');
                else if (authMethod === 'both') setStep('enter_keyfile');
                else afterCredentials();
              }}
            />
          </Box>
        )}

        {step === 'confirm_password' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.passwordConfirmLabel}</Text>
            </Text>
            <PasswordInput
              placeholder={t.passwordRepeatLabel}
              isActive
              onSubmit={(v) => {
                setConfirmPwd(v);
                if (authMethod === 'both') setStep('enter_keyfile');
                else afterCredentials();
              }}
            />
          </Box>
        )}

        {step === 'enter_keyfile' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.keyfilePathPrompt}</Text>{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>({t.keyfileDoneHint}):</Text>
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

        {step === 'pick_reedsol' && mode === 'encrypt' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.reedSolomonPrompt}</Text>{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.reedSolomonDesc}</Text>
            </Text>
            <SelectList
              options={[
                { label: t.reedSolomonYes, value: 'yes' },
                { label: t.reedSolomonNo, value: 'no' },
              ]}
              onChange={(v) => {
                setReedsol(v === 'yes');
                setStep('pick_deniability');
              }}
            />
          </Box>
        )}

        {step === 'pick_deniability' && mode === 'encrypt' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.deniabilityPrompt}</Text>{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.deniabilityDesc}</Text>
            </Text>
            <SelectList
              options={[
                { label: t.deniabilityNo, value: 'no' },
                { label: t.deniabilityYes, value: 'yes' },
              ]}
              onChange={(v) => {
                setDeniability(v === 'yes');
                setStep('enter_comment');
              }}
            />
          </Box>
        )}

        {step === 'enter_comment' && mode === 'encrypt' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.commentPrompt}</Text>{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.commentDesc}</Text>
            </Text>
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder=""
                onSubmit={(v) => {
                  setComment(v.trim());
                  setStep('processing');
                }}
              />
            </Box>
          </Box>
        )}

        {step === 'processing' && (
          <Box flexDirection="column" gap={1}>
            <Box gap={1}>
              <Spinner color={theme.purple} />
              <Text color={theme.text} backgroundColor={theme.panelBg} bold>
                {mode === 'encrypt' ? t.encrypting : t.decrypting}
              </Text>
            </Box>
            <ProgressBar value={progress} label={inputFile} />
            <Box flexDirection="column">
              <Text color={theme.dim} backgroundColor={theme.panelBg}> {t.authPrefix} {authMethod}</Text>
              {keyfiles.length > 0 && (
                <Text color={theme.dim} backgroundColor={theme.panelBg}>
                  {' '}✓ {keyfiles.length} {t.keyfileCount.replace('{N}', String(keyfiles.length))}
                </Text>
              )}
            </Box>
          </Box>
        )}

        {step === 'done' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.success} backgroundColor={theme.panelBg} bold>
              ✔ {mode === 'encrypt' ? t.encryptedSuccess : t.decryptedSuccess}
            </Text>
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
