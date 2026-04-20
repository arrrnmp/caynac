import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import path from 'node:path';
import fs from 'node:fs';
import { theme, BLOCK_FULL } from '../../theme.js';
import type { TransitionSnapshot, ColoredGlyph } from '../../transition.js';
import type { Translations } from '../../i18n/index.js';
import { Spinner } from '../../components/Spinner.js';
import { ProgressBar } from '../../components/ProgressBar.js';
import { Badge } from '../../components/Badge.js';
import { ErrorBox } from '../../components/ErrorBox.js';
import { PasswordInput } from '../../components/PasswordInput.js';
import { Divider } from '../../components/Divider.js';
import { SelectList } from '../../components/SelectList.js';
import { extractFiles, findArchiveParts } from '../../utils/compression.js';

type Step =
  | 'enter_archive'
  | 'enter_output'
  | 'enter_password'
  | 'ask_delete'
  | 'extracting'
  | 'done'
  | 'error';

interface Props {
  initialArchive?: string;
  sevenZipBin?: string;
  onBack: () => void;
  registerSnapshot?: (fn: () => TransitionSnapshot) => void;
  t: Translations;
}

const cg = (text: string, color: string, bold?: boolean): ColoredGlyph[] =>
  [...text].map((ch) => ({ ch, color, bold }));

export function DecompressCommand({ initialArchive, sevenZipBin = '7z', onBack, registerSnapshot, t }: Props) {
  const [step, setStep] = useState<Step>(initialArchive ? 'enter_output' : 'enter_archive');
  const [archive, setArchive] = useState(initialArchive ?? '');
  const [outputDir, setOutputDir] = useState('');
  const [password, setPassword] = useState('');
  const [deleteSource, setDeleteSource] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [deletedFiles, setDeletedFiles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fillRow = BLOCK_FULL.repeat(220);

  const isBusy = step === 'extracting';

  useEffect(() => {
    if (!registerSnapshot) return;
    registerSnapshot(() => ({
      rows: [
        cg(t.decompressorTitle, theme.brand, true),
        cg('─'.repeat(12), theme.panelBorderSoft),
        [],
        ...(archive ? [cg(`${t.archiveLabel} ${archive}`, theme.text)] : [cg(t.enterArchivePath, theme.text)]),
        ...(step === 'extracting' ? [cg(`${t.extracting} ${Math.round(progress * 100)}%`, theme.cyan)] : []),
        ...(step === 'done' ? [cg(`✔ ${t.extractedSuccess}`, theme.success, true)] : []),
        ...(step === 'error' ? [cg(`${t.errorLabel} ${error}`, theme.warning)] : []),
      ],
    }));
  }, [registerSnapshot, step, archive, progress, error, t]);

  useInput((_, key) => {
    if (key.escape && !isBusy) onBack();
  });

  const fail = (msg: string) => { setError(msg); setStep('error'); };

  useEffect(() => {
    if (step !== 'extracting') return;
    void (async () => {
      try {
        const out = outputDir.trim() || path.dirname(archive);
        await extractFiles(
          archive,
          out,
          password || undefined,
          (pct, file) => {
            setProgress(pct);
            setCurrentFile(file);
          },
          sevenZipBin,
        );

        if (deleteSource) {
          const parts = findArchiveParts(archive);
          for (const p of parts) {
            try { fs.unlinkSync(p); } catch { /* ignore */ }
          }
          setDeletedFiles(parts);
        }

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
          <Text key={`decompress-fill-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
            {fillRow}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" gap={1} paddingX={2}>
        <Box gap={1}>
          <Badge variant="brand">{t.decompressBadge}</Badge>
          <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.decompressDescShort}</Text>
        </Box>
        <Divider />

        {archive && step !== 'enter_archive' && (
          <Box gap={2}>
            <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.archiveLabel}</Text>
            <Text color={theme.cyan} backgroundColor={theme.panelBg}>{archive}</Text>
          </Box>
        )}

        {step === 'enter_archive' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.enterArchivePath}{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.archivePathHint}</Text>
            </Text>
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder={t.archivePathPlaceholder}
                onSubmit={(v) => {
                  setArchive(v.trim());
                  setStep('enter_output');
                }}
              />
            </Box>
          </Box>
        )}

        {step === 'enter_output' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.outputDirPrompt}</Text>{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.outputDirPlaceholder}</Text>
            </Text>
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder={path.dirname(archive) || '.'}
                onSubmit={(v) => {
                  setOutputDir(v.trim());
                  setStep('enter_password');
                }}
              />
            </Box>
          </Box>
        )}

        {step === 'enter_password' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.passwordPrompt}</Text>{' '}
              <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.passwordHint}</Text>
            </Text>
            <PasswordInput
              placeholder={t.passwordPlaceholder}
              isActive
              onSubmit={(v) => {
                setPassword(v);
                setStep('ask_delete');
              }}
            />
          </Box>
        )}

        {step === 'ask_delete' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>{t.deleteSourcePrompt}</Text>
            </Text>
            <SelectList
              options={[
                { label: t.deleteSourceYes, value: 'yes' },
                { label: t.deleteSourceNo, value: 'no' },
              ]}
              onChange={(v) => {
                setDeleteSource(v === 'yes');
                setStep('extracting');
              }}
            />
          </Box>
        )}

        {step === 'extracting' && (
          <Box flexDirection="column" gap={1}>
            <Box gap={1}>
              <Spinner color={theme.brand} />
              <Text color={theme.text} backgroundColor={theme.panelBg} bold>{t.extracting}</Text>
            </Box>
            <ProgressBar
              value={progress}
              label={currentFile || t.working}
            />
            {deleteSource && (
              <Text color={theme.dim} backgroundColor={theme.panelBg}> {t.sourceWillBeDeleted}</Text>
            )}
          </Box>
        )}

        {step === 'done' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.success} backgroundColor={theme.panelBg} bold>✔ {t.extractedSuccess}</Text>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {t.outputLabel}{' '}<Text color={theme.cyan} backgroundColor={theme.panelBg}>{outputDir.trim() || path.dirname(archive)}</Text>
            </Text>
            {deletedFiles.length > 0 && (
              <Box flexDirection="column">
                <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.deletedSourceLabel}</Text>
                {deletedFiles.map((f) => (
                  <Text key={f} color={theme.muted} backgroundColor={theme.panelBg}> ✗ {f}</Text>
                ))}
              </Box>
            )}
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
