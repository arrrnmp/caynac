import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export interface DownloadProgress {
  filename: string;
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes/sec
}

export function downloadFile(
  url: string,
  destDir: string,
  filename: string,
  onProgress: (p: DownloadProgress) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, filename);
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    const startTime = Date.now();
    let bytesReceived = 0;

    const req = protocol.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(dest, () => {});
        downloadFile(res.headers.location!, destDir, filename, onProgress)
          .then(resolve)
          .catch(reject);
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'] ?? '0', 10);

      res.on('data', (chunk: Buffer) => {
        bytesReceived += chunk.length;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? bytesReceived / elapsed : 0;
        const percentage = totalBytes > 0 ? (bytesReceived / totalBytes) * 100 : 0;
        onProgress({ filename, bytesReceived, totalBytes, percentage, speed });
      });

      res.pipe(file);

      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    });

    req.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}
