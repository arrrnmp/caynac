import fs from 'node:fs';

const RD_BASE = 'https://api.real-debrid.com/rest/1.0';

export interface RDUser {
  username: string;
  email: string;
  expiration: string;
  points: number;
  type: string;
}

export interface RDFile {
  id: number;
  path: string;
  bytes: number;
  selected: number;
}

export type RDTorrentStatus =
  | 'magnet_error'
  | 'magnet_conversion'
  | 'waiting_files_selection'
  | 'queued'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'virus'
  | 'compressing'
  | 'uploading'
  | 'dead';

export interface RDTorrentInfo {
  id: string;
  filename: string;
  original_filename: string;
  hash: string;
  bytes: number;
  progress: number;
  status: RDTorrentStatus;
  added: string;
  files: RDFile[];
  links: string[];
  speed?: number;
  seeders?: number;
  ended?: string;
}

export interface RDUnrestricted {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  download: string;
}

async function rdFetch<T>(
  token: string,
  endpoint: string,
  opts: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${RD_BASE}${endpoint}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Real-Debrid API ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function verifyToken(token: string): Promise<RDUser> {
  return rdFetch<RDUser>(token, '/user');
}

export async function addMagnet(
  token: string,
  magnet: string,
): Promise<{ id: string; uri: string }> {
  return rdFetch(token, '/torrents/addMagnet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ magnet }).toString(),
  });
}

export async function addTorrent(
  token: string,
  torrentPath: string,
): Promise<{ id: string; uri: string }> {
  const data = fs.readFileSync(torrentPath);
  return rdFetch(token, '/torrents/addTorrent', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-bittorrent' },
    body: data,
  });
}

export async function getTorrentInfo(
  token: string,
  id: string,
): Promise<RDTorrentInfo> {
  return rdFetch<RDTorrentInfo>(token, `/torrents/info/${id}`);
}

export async function selectAllFiles(token: string, id: string): Promise<void> {
  return rdFetch(token, `/torrents/selectFiles/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'files=all',
  });
}

export async function selectFiles(
  token: string,
  id: string,
  fileIds: number[],
): Promise<void> {
  return rdFetch(token, `/torrents/selectFiles/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `files=${fileIds.join(',')}`,
  });
}

export async function unrestrictLink(
  token: string,
  link: string,
): Promise<RDUnrestricted> {
  return rdFetch(token, '/unrestrict/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ link }).toString(),
  });
}

export async function pollTorrent(
  token: string,
  id: string,
  until: (info: RDTorrentInfo) => boolean,
  onTick: (info: RDTorrentInfo) => void,
  intervalMs = 2000,
): Promise<RDTorrentInfo> {
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const info = await getTorrentInfo(token, id);
        onTick(info);
        if (info.status === 'error' || info.status === 'magnet_error' || info.status === 'dead' || info.status === 'virus') {
          reject(new Error(`Torrent entered status: ${info.status}`));
          return;
        }
        if (until(info)) {
          resolve(info);
          return;
        }
        setTimeout(check, intervalMs);
      } catch (err) {
        reject(err);
      }
    };
    void check();
  });
}
