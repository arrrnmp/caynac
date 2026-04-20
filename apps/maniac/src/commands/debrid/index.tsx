import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { theme, BLOCK_FULL, Spinner, ProgressBar, Badge, ErrorBox, PasswordInput, Divider, type TransitionSnapshot, type ColoredGlyph, type Translations } from '@caynac/shared';
import { MultiSelect, type SelectOption } from '../../components/MultiSelect.js';
import {
  verifyToken,
  addMagnet,
  addTorrent,
  pollTorrent,
  selectFiles,
  selectAllFiles,
  unrestrictLink,
  type RDTorrentInfo,
  type RDUnrestricted,
} from '../../utils/realDebrid.js';
import { downloadFile, formatBytes, formatSpeed } from '../../utils/download.js';
import { readConfig, mergeConfig } from '../../utils/config.js';

type Step =
  | 'enter_token'
  | 'verify_token'
  | 'enter_input'
  | 'uploading'
  | 'waiting_info'
  | 'select_files'
  | 'rd_downloading'
  | 'unrestricting'
  | 'enter_dir'
  | 'downloading'
  | 'done'
  | 'error';

interface DownloadState {
  filename: string;
  pct: number;
  speed: number;
  total: number;
}

interface Props {
  initialToken?: string;
  initialMagnet?: string;
  initialOutputDir?: string;
  t: Translations;
  onBack: () => void;
  registerSnapshot?: (fn: () => TransitionSnapshot) => void;
}

const cg = (text: string, color: string, bold?: boolean): ColoredGlyph[] =>
  [...text].map((ch) => ({ ch, color, bold }));

export function DebridCommand({ initialToken, initialMagnet, initialOutputDir, t, onBack, registerSnapshot }: Props) {
  const cfg = readConfig();

  const [step, setStep] = useState<Step>(
    initialToken ?? cfg.rdToken ? 'enter_input' : 'enter_token',
  );
  const [token, setToken] = useState(initialToken ?? cfg.rdToken ?? '');
  const [rdUser, setRdUser] = useState('');
  const [input, setInput] = useState(initialMagnet ?? '');
  const [torrentId, setTorrentId] = useState('');
  const [torrentInfo, setTorrentInfo] = useState<RDTorrentInfo | null>(null);
  const [fileOptions, setFileOptions] = useState<SelectOption[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [unrestricted, setUnrestricted] = useState<RDUnrestricted[]>([]);
  const [outputDir, setOutputDir] = useState(initialOutputDir ?? cfg.defaultOutputDir ?? '');
  const [downloads, setDownloads] = useState<DownloadState[]>([]);
  const [currentDl, setCurrentDl] = useState(0);
  const [error, setError] = useState('');
  const fillRow = BLOCK_FULL.repeat(220);

  // Esc → menu when no async operation is running
  const isBusy = (
    step === 'uploading' ||
    step === 'waiting_info' ||
    step === 'rd_downloading' ||
    step === 'unrestricting' ||
    step === 'downloading'
  );
  useInput((_, key) => {
    if (key.escape && !isBusy) onBack();
  });

  const fail = (msg: string) => {
    setError(msg);
    setStep('error');
  };

  // ── Verify token ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'verify_token') return;
    void (async () => {
      try {
        const user = await verifyToken(token);
        setRdUser(user.username);
        mergeConfig({ rdToken: token });
        setStep('enter_input');
      } catch (err) {
        fail(`Token verification failed: ${(err as Error).message}`);
      }
    })();
  }, [step]);

  // ── Upload torrent/magnet ───────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'uploading') return;
    void (async () => {
      try {
        const isMagnet = input.startsWith('magnet:');
        const res = isMagnet
          ? await addMagnet(token, input)
          : await addTorrent(token, input);
        setTorrentId(res.id);
        setStep('waiting_info');
      } catch (err) {
        fail(`Upload failed: ${(err as Error).message}`);
      }
    })();
  }, [step]);

  // ── Poll until waiting_files_selection ─────────────────────────────────────
  useEffect(() => {
    if (step !== 'waiting_info') return;
    void (async () => {
      try {
        const info = await pollTorrent(
          token,
          torrentId,
          (i) => i.status === 'waiting_files_selection' || i.status === 'downloaded',
          (i) => setTorrentInfo(i),
        );
        setTorrentInfo(info);
        if (info.status === 'waiting_files_selection') {
          setFileOptions(
            info.files.map((f) => ({
              id: f.id,
              label: f.path.replace(/^\//, ''),
              sublabel: formatBytes(f.bytes),
            })),
          );
          setStep('select_files');
        } else {
          setLinks(info.links);
          setStep('unrestricting');
        }
      } catch (err) {
        fail((err as Error).message);
      }
    })();
  }, [step]);

  // ── After file selection — poll until downloaded ───────────────────────────
  useEffect(() => {
    if (step !== 'rd_downloading') return;
    void (async () => {
      try {
        const info = await pollTorrent(
          token,
          torrentId,
          (i) => i.status === 'downloaded',
          (i) => setTorrentInfo(i),
        );
        setLinks(info.links);
        setStep('unrestricting');
      } catch (err) {
        fail((err as Error).message);
      }
    })();
  }, [step]);

  // ── Unrestrict links ────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'unrestricting') return;
    void (async () => {
      try {
        const results: RDUnrestricted[] = [];
        for (const link of links) {
          results.push(await unrestrictLink(token, link));
        }
        setUnrestricted(results);
        if (!outputDir) {
          setStep('enter_dir');
        } else {
          setStep('downloading');
        }
      } catch (err) {
        fail(`Unrestrict failed: ${(err as Error).message}`);
      }
    })();
  }, [step]);

  // ── Download files ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'downloading') return;
    void (async () => {
      try {
        const UI_PROGRESS_EMIT_MS = 150;
        const states: DownloadState[] = unrestricted.map((u) => ({
          filename: u.filename,
          pct: 0,
          speed: 0,
          total: u.filesize,
        }));
        let lastUiEmitAt = 0;
        const flushDownloads = (force = false) => {
          const now = Date.now();
          if (!force && now - lastUiEmitAt < UI_PROGRESS_EMIT_MS) return;
          lastUiEmitAt = now;
          setDownloads(states.slice());
        };

        flushDownloads(true);

        for (let i = 0; i < unrestricted.length; i++) {
          setCurrentDl(i);
          const u = unrestricted[i]!;
          await downloadFile(u.download, outputDir, u.filename, (p) => {
            states[i] = {
              filename: u.filename,
              pct: p.percentage,
              speed: p.speed,
              total: p.totalBytes > 0 ? p.totalBytes : states[i]!.total,
            };
            flushDownloads();
          }, u.filesize);
          flushDownloads(true);
        }
        mergeConfig({ defaultOutputDir: outputDir });
        setStep('done');
      } catch (err) {
        fail(`Download failed: ${(err as Error).message}`);
      }
    })();
  }, [step]);

  const handleFileSelect = useCallback(
    async (ids: number[]) => {
      try {
        if (ids.length === fileOptions.length) {
          await selectAllFiles(token, torrentId);
        } else {
          await selectFiles(token, torrentId, ids);
        }
        setStep('rd_downloading');
      } catch (err) {
        fail(`File selection failed: ${(err as Error).message}`);
      }
    },
    [token, torrentId, fileOptions.length],
  );

  useEffect(() => {
    if (!registerSnapshot) return;
    const stepLabels: Record<Step, string> = {
      enter_token: 'Enter API token',
      verify_token: 'Verifying token…',
      enter_input: 'Enter magnet or torrent path',
      uploading: 'Uploading to Real-Debrid…',
      waiting_info: 'Processing torrent…',
      select_files: 'Select files to download',
      rd_downloading: `Downloading via Real-Debrid${torrentInfo ? ` · ${torrentInfo.progress}%` : ''}`,
      unrestricting: `Unrestricting ${links.length} link(s)…`,
      enter_dir: 'Enter output directory',
      downloading: `Downloading ${downloads.length} file(s) → ${outputDir}`,
      done: `Done — ${downloads.length} file(s) saved to ${outputDir}`,
      error: `Error: ${error}`,
    };
    registerSnapshot(() => ({
      rows: [
        cg('REAL-DEBRID', theme.brand, true),
        cg('─'.repeat(11), theme.panelBorderSoft),
        [],
        cg(stepLabels[step], theme.text),
        ...(torrentInfo ? [cg(torrentInfo.filename, theme.cyan)] : []),
        ...(rdUser ? [cg(`Logged in as ${rdUser}`, theme.dim)] : []),
      ],
    }));
  }, [registerSnapshot, step, torrentInfo, rdUser, downloads.length, outputDir, links.length, error]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box width="100%" height="100%" overflow="hidden">
      <Box position="absolute" width="100%" height="100%" overflow="hidden">
        {Array.from({ length: 56 }, (_, i) => (
          <Text key={`debrid-fill-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
            {fillRow}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" gap={1} paddingX={2}>
        <Box gap={1}>
          <Badge variant="brand">{t.debridBadge}</Badge>
        {rdUser && (
          <Text color={theme.dim} backgroundColor={theme.panelBg}>
            {t.debridLoggedInAs} <Text color={theme.cyan} backgroundColor={theme.panelBg}>{rdUser}</Text>
          </Text>
        )}
        </Box>
        <Divider />

        {step === 'enter_token' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              Enter your{' '}
              <Text color={theme.brand} backgroundColor={theme.panelBg} bold>Real-Debrid API token</Text>
              {' '}(found at real-debrid.com/apitoken):
            </Text>
            <PasswordInput
              placeholder="your-api-token"
              isActive
              onSubmit={(t) => {
                setToken(t);
                setStep('verify_token');
              }}
            />
          </Box>
        )}

        {step === 'verify_token' && (
          <Spinner label="Verifying token…" color={theme.purple} />
        )}

      {step === 'enter_input' && (
        <Box flexDirection="column" gap={1}>
          <Text color={theme.text} backgroundColor={theme.panelBg}>
            {t.debridMagnetPrompt}:
          </Text>
            <Box gap={1}>
              <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
              <TextInput
                placeholder="magnet:?xt=urn:btih:… or /path/to/file.torrent"
                onSubmit={(v) => {
                  setInput(v.trim());
                  setStep('uploading');
                }}
              />
            </Box>
          </Box>
        )}

      {step === 'uploading' && (
        <Spinner label="Uploading to Real-Debrid…" color={theme.purple} />
      )}

      {step === 'waiting_info' && (
        <Box flexDirection="column" gap={1}>
          <Spinner label="Processing torrent…" color={theme.purple} />
          {torrentInfo && (
            <Box flexDirection="column">
              <Text color={theme.muted} backgroundColor={theme.panelBg}>
                <Text color={theme.cyan} backgroundColor={theme.panelBg}>{torrentInfo.filename}</Text>
              </Text>
              <Text color={theme.dim} backgroundColor={theme.panelBg}>
                Status: <Text color={theme.text} backgroundColor={theme.panelBg}>{torrentInfo.status}</Text>
              </Text>
            </Box>
          )}
        </Box>
      )}

      {step === 'select_files' && torrentInfo && (
        <Box flexDirection="column" gap={1}>
          <Text color={theme.text} backgroundColor={theme.panelBg}>
            {t.debridSelectFiles}{' '}
            <Text color={theme.cyan} backgroundColor={theme.panelBg} bold>{torrentInfo.filename}</Text>:
          </Text>
          <MultiSelect
            options={fileOptions}
            isActive
            onSubmit={(ids) => void handleFileSelect(ids)}
          />
        </Box>
      )}

      {step === 'rd_downloading' && torrentInfo && (
        <Box flexDirection="column" gap={1}>
          <Spinner label={t.debridDownloading} color={theme.brand} />
          <ProgressBar
            value={torrentInfo.progress}
            label={torrentInfo.filename}
            sublabel={torrentInfo.speed ? formatSpeed(torrentInfo.speed) : undefined}
          />
        </Box>
      )}

      {step === 'unrestricting' && (
        <Spinner label={`Unrestricting ${links.length} link(s)…`} color={theme.cyan} />
      )}

      {step === 'enter_dir' && (
        <Box flexDirection="column" gap={1}>
          <Text color={theme.text} backgroundColor={theme.panelBg}>
            {t.debridEnterThe} <Text color={theme.brand} backgroundColor={theme.panelBg} bold>output directory</Text>:
          </Text>
          <Box gap={1}>
            <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
            <TextInput
              placeholder="/path/to/downloads"
              onSubmit={(v) => {
                setOutputDir(v.trim() || '.');
                setStep('downloading');
              }}
            />
          </Box>
        </Box>
      )}

      {step === 'downloading' && (
        <Box flexDirection="column" gap={1}>
          <Text color={theme.brand} backgroundColor={theme.panelBg} bold>
            Downloading {unrestricted.length} file(s) →{' '}
            <Text color={theme.cyan} backgroundColor={theme.panelBg}>{outputDir}</Text>
          </Text>
          {downloads.map((dl, i) => (
            <Box key={dl.filename} flexDirection="column">
              <ProgressBar
                value={dl.pct}
                label={`${i + 1}/${downloads.length} ${dl.filename}`}
                sublabel={
                  i === currentDl && dl.speed > 0
                    ? `${formatSpeed(dl.speed)} · ${formatBytes(dl.total)}`
                    : undefined
                }
              />
            </Box>
          ))}
        </Box>
      )}

      {step === 'done' && (
        <Box flexDirection="column" gap={1}>
          <Box gap={1}>
            <Text color={theme.success} backgroundColor={theme.panelBg} bold>✔ Done!</Text>
            <Text color={theme.text} backgroundColor={theme.panelBg}>
              {downloads.length} file(s) saved to{' '}
              <Text color={theme.cyan} backgroundColor={theme.panelBg}>{outputDir}</Text>
            </Text>
          </Box>
          {downloads.map((dl) => (
            <Text key={dl.filename} color={theme.muted} backgroundColor={theme.panelBg}>
              {'  '}✓ {dl.filename} <Text color={theme.dim} backgroundColor={theme.panelBg}>({formatBytes(dl.total)})</Text>
            </Text>
          ))}
          <Divider />
          <Text color={theme.dim} backgroundColor={theme.panelBg}>
            {t.debridPressQToReturn}
          </Text>
        </Box>
      )}

        {step === 'error' && <ErrorBox message={error} onBack={onBack} t={t} />}
      </Box>
    </Box>
  );
}
