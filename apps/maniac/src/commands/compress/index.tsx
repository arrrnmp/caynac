import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { theme, BLOCK_FULL, Spinner, ProgressBar, Badge, ErrorBox, PasswordInput, Divider, SelectList, compressFiles, type CompressionAlgo, type TransitionSnapshot, type ColoredGlyph, type Translations } from '@caynac/shared';
import { readConfig } from '../../utils/config.js';

type Step =
  | 'enter_source'
  | 'enter_output'
  | 'pick_algo'
  | 'pick_level'
  | 'enter_password'
  | 'pick_encrypt_names'
  | 'enter_split'
  | 'compressing'
  | 'done'
  | 'error';

interface Props {
  initialSource?: string;
  onBack: () => void;
  registerSnapshot?: (fn: () => TransitionSnapshot) => void;
  t: Translations;
}

const cg = (text: string, color: string, bold?: boolean): ColoredGlyph[] =>
  [...text].map((ch) => ({ ch, color, bold }));

export function CompressCommand({ initialSource, onBack, registerSnapshot, t }: Props) {
  const cfg = readConfig();
  const sevenZipBin = cfg.sevenZipPath ?? '7z';
  const [step, setStep] = useState<Step>(initialSource ? 'enter_output' : 'enter_source');
  const [source, setSource] = useState(initialSource ?? '');
  const [output, setOutput] = useState('');
  const [algo, setAlgo] = useState<CompressionAlgo>('lzma2');
  const [level, setLevel] = useState(5);
  const [password, setPassword] = useState('');
  const [encryptNames, setEncryptNames] = useState(false);
  const [splitSize, setSplitSize] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [error, setError] = useState('');
  const fillRow = BLOCK_FULL.repeat(220);

  useEffect(() => {
    if (!registerSnapshot) return;
    const outPath = output ? (output.endsWith('.7z') ? output : `${output}.7z`) : '';
    registerSnapshot(() => ({
      rows: [
        cg(t.compressorTitle, theme.brand, true),
        cg('─'.repeat(10), theme.panelBorderSoft),
        [],
        ...(source ? [cg(`${t.sourceLabel} ${source}`, theme.text)] : [cg(t.enterSourcePath, theme.text)]),
        ...(outPath ? [cg(`output ${outPath}`, theme.cyan)] : []),
        ...(step === 'compressing' ? [cg(`${algo.toUpperCase()} · ${t.levelLabel} ${level} · ${Math.round(progress * 100)}%`, theme.dim)] : []),
        ...(step === 'done' ? [cg(`✔ ${t.compressSuccess}`, theme.success, true)] : []),
        ...(step === 'error' ? [cg(`${t.errorLabel} ${error}`, theme.warning)] : []),
      ],
    }));
  }, [registerSnapshot, step, source, output, algo, level, progress, error, t]);

  useInput((_, key) => {
    if (key.escape && step !== 'compressing') onBack();
  });

  const fail = (msg: string) => { setError(msg); setStep('error'); };

  useEffect(() => {
    if (step !== 'compressing') return;
    void (async () => {
      try {
        const sources = source.split(/\s+/).filter(Boolean);
        const out = output.endsWith('.7z') ? output : `${output}.7z`;
        await compressFiles(
          {
            sources,
            output: out,
            algorithm: algo,
            level,
            password: password || undefined,
            encryptFilenames: encryptNames,
            splitSize: splitSize || undefined,
            binaryPath: sevenZipBin,
          },
          (pct, file) => {
            setProgress(pct);
            setCurrentFile(file);
          },
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
          <Text key={`compress-fill-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
            {fillRow}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" gap={1} paddingX={2}>
        <Box gap={1}>
          <Badge variant="brand">{t.compressBadge}</Badge>
          <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.compressDescShort}</Text>
        </Box>
        <Divider />

        {/* Summary of selections so far */}
        {step !== 'enter_source' && source && (
          <Box gap={2}>
            <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.sourceLabel}</Text>
            <Text color={theme.cyan} backgroundColor={theme.panelBg}>{source}</Text>
          </Box>
        )}
        {output && step !== 'enter_output' && (
          <Box gap={2}>
            <Text color={theme.dim} backgroundColor={theme.panelBg}>output</Text>
            <Text color={theme.cyan} backgroundColor={theme.panelBg}>{output.endsWith('.7z') ? output : `${output}.7z`}</Text>
          </Box>
        )}

        {step === 'enter_source' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.sourcePathPrompt}{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.sourcePathHint}</Text>
            </Text>
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder="/path/to/files or /dir"
                onSubmit={(v) => {
                  setSource(v.trim());
                  setStep('enter_output');
                }}
              />
            </Box>
          </Box>
        )}

        {step === 'enter_output' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.outputArchivePrompt}{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.outputArchiveHint}</Text>
            </Text>
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder="/path/to/archive.7z"
                onSubmit={(v) => {
                  setOutput(v.trim());
                  setStep('pick_algo');
                }}
              />
            </Box>
          </Box>
        )}

        {step === 'pick_algo' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.chooseOperation}
            </Text>
            <SelectList
              options={[
                { label: `${t.algoLzma2} — ${t.algoLzma2Desc}`, value: 'lzma2' },
                { label: `${t.algoZstd} — ${t.algoZstdDesc}`, value: 'zstd' },
              ]}
              onChange={(v) => {
                setAlgo(v as CompressionAlgo);
                setStep('pick_level');
              }}
            />
          </Box>
        )}

        {step === 'pick_level' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.levelLabel}
            </Text>
            <SelectList
              options={[
                { label: t.level1, value: '1' },
                { label: t.level3, value: '3' },
                { label: t.level5, value: '5' },
                { label: t.level7, value: '7' },
                { label: t.level9, value: '9' },
              ]}
              onChange={(v) => {
                setLevel(parseInt(v, 10));
                setStep('enter_password');
              }}
            />
          </Box>
        )}

        {step === 'enter_password' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.passwordEncryptLabel}</Text>{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.passwordEncryptHint}</Text>
            </Text>
            <PasswordInput
              placeholder={t.splitSizePlaceholder}
              isActive
              onSubmit={(v) => {
                setPassword(v);
                if (v) {
                  setStep('pick_encrypt_names');
                } else {
                  setStep('enter_split');
                }
              }}
            />
          </Box>
        )}

        {step === 'pick_encrypt_names' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.encryptFilenamesPrompt}</Text>{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.encryptFilenamesHint}</Text>
            </Text>
            <SelectList
              options={[
                { label: t.encryptFilenamesYes, value: 'yes' },
                { label: t.encryptFilenamesNo, value: 'no' },
              ]}
              onChange={(v) => {
                setEncryptNames(v === 'yes');
                setStep('enter_split');
              }}
            />
          </Box>
        )}

        {step === 'enter_split' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.splitSizePrompt}</Text>{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.splitSizeHint}</Text>
            </Text>
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder={t.splitSizePlaceholder}
                onSubmit={(v) => {
                  setSplitSize(v.trim());
                  setStep('compressing');
                }}
              />
            </Box>
          </Box>
        )}

        {step === 'compressing' && (
          <Box flexDirection="column" gap={1}>
            <Box gap={1}>
              <Spinner color={theme.brand} />
              <Text color={theme.text} backgroundColor={theme.panelBg} bold>{t.compressing}</Text>
            </Box>
            <ProgressBar
              value={progress}
              label={currentFile || t.working}
            />
            <Text color={theme.dim} backgroundColor={theme.panelBg}>
              {algo.toUpperCase()} · {t.levelLabel} {level}
              {password ? ` · ${t.compressStatusEncrypted}` : ''}
              {encryptNames ? ` · ${t.compressStatusFilenamesHidden}` : ''}
              {splitSize ? ` · ${t.compressStatusSplit.replace('{size}', splitSize)}` : ''}
            </Text>
          </Box>
        )}

        {step === 'done' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.success} backgroundColor={theme.panelBg} bold>✔ {t.compressSuccess}</Text>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.compressSavedTo}{' '}
              <Text color={theme.cyan} backgroundColor={theme.panelBg}>{output.endsWith('.7z') ? output : `${output}.7z`}</Text>
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
