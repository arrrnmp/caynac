import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { BLOCK_FULL, theme } from '../theme.js';
import type { TransitionSnapshot } from '../transition.js';

const SIPHON_MS = 1200;
const SMILE_MS = 650;
const WINK_MS = 650;
const SLEEP_MS = 1000;
const BLACKOUT_MS = 220;

export const GOODBYE_TOTAL_MS = SIPHON_MS + SMILE_MS + WINK_MS + SLEEP_MS + BLACKOUT_MS;

type Cell = {
  ch: string;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
};

const PARTICLE_CHARS = ['@', '#', '%', '&', '+', '*', '=', '-', ':', '.'] as const;
const FACE_W = 38;
const FACE_H = 22;

function noiseAt(x: number, y: number, seed: number): number {
  return (((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0) & 4095;
}

function sameStyle(a: Cell, b: Cell): boolean {
  return a.color === b.color && a.backgroundColor === b.backgroundColor && Boolean(a.bold) === Boolean(b.bold);
}

function place(grid: Cell[][], x: number, y: number, cell: Cell) {
  if (y < 0 || y >= grid.length) return;
  const row = grid[y];
  if (!row || x < 0 || x >= row.length) return;
  row[x] = cell;
}

function buildBlackGrid(width: number, height: number): Cell[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      ch: BLOCK_FULL,
      color: theme.bg,
      backgroundColor: theme.bg,
    })),
  );
}

function buildTransparentGrid(width: number, height: number): Cell[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ ch: ' ' })),
  );
}

function renderGrid(width: number, height: number, grid: Cell[][]) {
  const runs = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y]!;
    let x = 0;
    while (x < row.length) {
      const cell = row[x]!;
      if (cell.ch === ' ') {
        x++;
        continue;
      }
      const startX = x;
      let text = cell.ch;
      x++;
      while (x < row.length) {
        const next = row[x]!;
        if (next.ch === ' ' || !sameStyle(next, cell)) break;
        text += next.ch;
        x++;
      }
      runs.push({
        x: startX,
        y,
        text,
        color: cell.color,
        backgroundColor: cell.backgroundColor,
        bold: cell.bold,
      });
    }
  }

  return (
    <Box width={width} height={height} overflow="hidden">
      {runs.map((run, i) => (
        <Box key={`bye-run-${i}`} position="absolute" marginTop={run.y} marginLeft={run.x}>
          <Text color={run.color} backgroundColor={run.backgroundColor} bold={run.bold}>
            {run.text}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function drawSiphon(grid: Cell[][], width: number, height: number, progress: number) {
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;

  for (let y0 = 0; y0 < height; y0++) {
    for (let x0 = 0; x0 < width; x0++) {
      if ((noiseAt(x0, y0, 17) & 7) > 1) continue;

      const dx = x0 - cx;
      const dy = y0 - cy;
      const theta0 = Math.atan2(dy, dx);
      const radius0 = Math.hypot(dx * 0.5, dy);
      const turns = 1.8 + (noiseAt(x0, y0, 29) / 4095) * 2.9;
      const theta = theta0 + progress * turns * Math.PI * 2;
      const radius = radius0 * Math.pow(1 - progress, 1.18);
      const x = Math.round(cx + Math.cos(theta) * radius * 2);
      const y = Math.round(cy + Math.sin(theta) * radius);

      const ch = PARTICLE_CHARS[(noiseAt(x0, y0, 41) >>> 5) % PARTICLE_CHARS.length] ?? '.';
      const nearCenter = radius < Math.max(2.5, Math.min(width, height) * 0.13);
      place(grid, x, y, {
        ch,
        color: nearCenter ? '#FFFFFF' : (noiseAt(x0, y0, 59) & 1) === 0 ? theme.brand : theme.warning,
        bold: nearCenter,
      });
    }
  }
}

type SourceGlyph = {
  x: number;
  y: number;
  ch: string;
  color: string;
  bold?: boolean;
};

function extractSourceGlyphs(snapshot: TransitionSnapshot | undefined, width: number, height: number): SourceGlyph[] {
  if (!snapshot || snapshot.rows.length === 0) return [];
  const maxRowWidth = Math.max(...snapshot.rows.map((r) => r.length));
  const blockWidth = maxRowWidth + 4;
  const blockHeight = snapshot.rows.length + 2;
  const left = Math.max(0, Math.floor((width - blockWidth) / 2));
  const top = Math.max(0, Math.floor((height - blockHeight) / 2));

  const glyphs: SourceGlyph[] = [];
  snapshot.rows.forEach((row, gy) => {
    row.forEach((glyph, gx) => {
      if (glyph.ch === ' ') return;
      glyphs.push({
        x: left + gx + 2,
        y: top + gy + 1,
        ch: glyph.ch,
        color: glyph.color || theme.text,
        bold: glyph.bold,
      });
    });
  });
  return glyphs;
}

function drawGlyphSiphon(grid: Cell[][], width: number, height: number, progress: number, glyphs: SourceGlyph[]) {
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;

  glyphs.forEach((glyph, i) => {
    const dx = (glyph.x - cx) / 2;
    const dy = glyph.y - cy;
    const theta0 = Math.atan2(dy, dx);
    const radius0 = Math.hypot(dx, dy);
    const turns = 2.2 + (i % 7) * 0.18;
    const theta = theta0 + progress * turns * Math.PI * 2;
    const radius = radius0 * Math.pow(1 - progress, 1.2);
    const x = Math.round(cx + Math.cos(theta) * radius * 2);
    const y = Math.round(cy + Math.sin(theta) * radius);
    const nearCenter = radius < Math.max(2.4, Math.min(width, height) * 0.11);

    place(grid, x, y, {
      ch: glyph.ch,
      color: nearCenter ? '#FFFFFF' : glyph.color,
      bold: nearCenter || glyph.bold,
    });
  });
}

function drawCenterMass(grid: Cell[][], width: number, height: number, seed: number) {
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const rx = Math.max(6, Math.floor(width * 0.11));
  const ry = Math.max(4, Math.floor(height * 0.14));

  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      const nx = x / rx;
      const ny = y / ry;
      const d = Math.sqrt(nx * nx + ny * ny);
      if (d > 1) continue;
      if ((noiseAt(x + rx * 2, y + ry * 2, seed) & 3) !== 0) continue;
      place(grid, Math.round(cx + x), Math.round(cy + y), {
        ch: (noiseAt(x, y, seed + 13) & 1) === 0 ? '.' : ':',
        color: '#FFFFFF',
      });
    }
  }
}

function drawJoinedTextMass(grid: Cell[][], width: number, height: number, glyphs: SourceGlyph[]) {
  const usable = glyphs.filter((g) => g.ch !== ' ');
  if (usable.length === 0) return;
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const maxR = Math.max(3, Math.min(width, height) * 0.12);
  const golden = 2.399963229728653;

  usable.forEach((g, i) => {
    const t = (i + 1) / usable.length;
    const r = Math.sqrt(t) * maxR;
    const a = i * golden;
    const x = Math.round(cx + Math.cos(a) * r * 2);
    const y = Math.round(cy + Math.sin(a) * r);
    place(grid, x, y, {
      ch: g.ch,
      color: '#FFFFFF',
      bold: true,
    });
  });
}

function drawRect(grid: Cell[][], left: number, top: number, w: number, h: number, color: string) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      place(grid, left + x, top + y, {
        ch: BLOCK_FULL,
        color,
        bold: true,
      });
    }
  }
}

function faceOrigin(width: number, height: number) {
  return {
    left: Math.floor((width - FACE_W) / 2),
    top: Math.floor((height - FACE_H) / 2),
  };
}

function drawSmileMouth(grid: Cell[][], left: number, top: number) {
  // Curved smile using a more natural arc
  const mouthColor = '#FFFFFF';
  // Main smile curve - wider and more pronounced
  drawRect(grid, left + 7, top + 15, 22, 2, mouthColor);
  drawRect(grid, left + 5, top + 13, 3, 2, mouthColor);
  drawRect(grid, left + 28, top + 13, 3, 2, mouthColor);
  drawRect(grid, left + 4, top + 11, 2, 2, mouthColor);
  drawRect(grid, left + 30, top + 11, 2, 2, mouthColor);
  // Subtle cheek dimples
  drawRect(grid, left + 3, top + 12, 1, 1, mouthColor);
  drawRect(grid, left + 32, top + 12, 1, 1, mouthColor);
}

function drawDimmedHalo(grid: Cell[][], width: number, height: number) {
  const { left, top } = faceOrigin(width, height);
  const right = left + FACE_W - 1;
  const bottom = top + FACE_H - 1;

  // Create a gradient dim effect around the face
  // Layer 1: Closest to face - subtle dim
  const padX1 = 2;
  const padY1 = 1;
  for (let y = top - padY1; y <= bottom + padY1; y++) {
    for (let x = left - padX1; x <= right + padX1; x++) {
      if (y >= 0 && y < grid.length && x >= 0 && x < grid[y].length) {
        const cell = grid[y][x];
        if (cell && cell.ch !== ' ') {
          // Dim existing content by darkening
          cell.color = dimColor(cell.color, 0.6);
        }
      }
    }
  }

  // Layer 2: Medium distance - more dim
  const padX2 = 5;
  const padY2 = 2;
  for (let y = top - padY2; y <= bottom + padY2; y++) {
    for (let x = left - padX2; x <= right + padX2; x++) {
      // Skip the inner layer
      if (y >= top - padY1 && y <= bottom + padY1 && x >= left - padX1 && x <= right + padX1) continue;
      if (y >= 0 && y < grid.length && x >= 0 && x < grid[y].length) {
        const cell = grid[y][x];
        if (cell && cell.ch !== ' ') {
          cell.color = dimColor(cell.color, 0.35);
        }
      }
    }
  }

  // Layer 3: Outer edge - heaviest dim
  const padX3 = 10;
  const padY3 = 4;
  for (let y = top - padY3; y <= bottom + padY3; y++) {
    for (let x = left - padX3; x <= right + padX3; x++) {
      // Skip inner layers
      if (y >= top - padY2 && y <= bottom + padY2 && x >= left - padX2 && x <= right + padX2) continue;
      if (y >= 0 && y < grid.length && x >= 0 && x < grid[y].length) {
        const cell = grid[y][x];
        if (cell && cell.ch !== ' ') {
          cell.color = dimColor(cell.color, 0.15);
        }
      }
    }
  }
}

function dimColor(color: string | undefined, factor: number): string {
  if (!color || color === ' ') return color ?? theme.muted;
  // Handle hex colors
  if (color.startsWith('#')) {
    const r = Math.max(0, Math.floor(parseInt(color.slice(1, 3), 16) * factor));
    const g = Math.max(0, Math.floor(parseInt(color.slice(3, 5), 16) * factor));
    const b = Math.max(0, Math.floor(parseInt(color.slice(5, 7), 16) * factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  // For named colors or other formats, return a dimmed gray
  const dimValue = Math.floor(128 * factor);
  return `#${dimValue.toString(16).padStart(2, '0').repeat(3)}`;
}

function drawFace(grid: Cell[][], width: number, height: number, pose: 'smile' | 'wink' | 'sleep') {
  const { left, top } = faceOrigin(width, height);

  if (pose === 'smile') {
    // Happy eyes - gentle upward curve
    const eyeColor = '#FFFFFF';
    // Left eye (happy arc)
    drawRect(grid, left + 5, top + 6, 8, 2, eyeColor);
    drawRect(grid, left + 4, top + 5, 3, 2, eyeColor);
    drawRect(grid, left + 11, top + 5, 3, 2, eyeColor);
    // Right eye (happy arc)
    drawRect(grid, left + 25, top + 6, 8, 2, eyeColor);
    drawRect(grid, left + 24, top + 5, 3, 2, eyeColor);
    drawRect(grid, left + 31, top + 5, 3, 2, eyeColor);
    drawSmileMouth(grid, left, top);
    return;
  }

  if (pose === 'wink') {
    const eyeColor = '#FFFFFF';
    // Left eye - same happy arc as smile
    drawRect(grid, left + 5, top + 6, 8, 2, eyeColor);
    drawRect(grid, left + 4, top + 5, 3, 2, eyeColor);
    drawRect(grid, left + 11, top + 5, 3, 2, eyeColor);
    // Right eye - winking (angled line suggesting closed eye with a playful tilt)
    drawRect(grid, left + 24, top + 5, 10, 2, eyeColor);
    drawRect(grid, left + 23, top + 6, 3, 2, eyeColor);
    drawRect(grid, left + 32, top + 4, 3, 2, eyeColor);
    drawSmileMouth(grid, left, top);
    return;
  }

  // Closed eyes - peaceful curved lines
  const eyeColor = '#FFFFFF';
  // Left closed eye (gentle downward curve)
  drawRect(grid, left + 4, top + 6, 10, 1, eyeColor);
  drawRect(grid, left + 5, top + 7, 8, 1, eyeColor);
  drawRect(grid, left + 3, top + 5, 2, 2, eyeColor);
  drawRect(grid, left + 13, top + 5, 2, 2, eyeColor);
  // Right closed eye (gentle downward curve)
  drawRect(grid, left + 24, top + 6, 10, 1, eyeColor);
  drawRect(grid, left + 25, top + 7, 8, 1, eyeColor);
  drawRect(grid, left + 23, top + 5, 2, 2, eyeColor);
  drawRect(grid, left + 33, top + 5, 2, 2, eyeColor);

  // Peaceful small smile for sleep
  drawRect(grid, left + 14, top + 14, 10, 1, eyeColor);
  drawRect(grid, left + 12, top + 13, 3, 1, eyeColor);
  drawRect(grid, left + 23, top + 13, 3, 1, eyeColor);

  // Big Z (stylized)
  drawRect(grid, left + 28, top + 9, 7, 2, eyeColor);
  drawRect(grid, left + 34, top + 11, 2, 2, eyeColor);
  drawRect(grid, left + 33, top + 12, 2, 2, eyeColor);
  drawRect(grid, left + 32, top + 13, 2, 2, eyeColor);
  drawRect(grid, left + 27, top + 14, 8, 2, eyeColor);

  // Small z (stylized)
  drawRect(grid, left + 24, top + 11, 4, 1, eyeColor);
  drawRect(grid, left + 27, top + 12, 1, 1, eyeColor);
  drawRect(grid, left + 26, top + 13, 4, 1, eyeColor);
}

export interface GoodbyeOverlayProps {
  width: number;
  height: number;
  elapsedMs: number;
  snapshot?: TransitionSnapshot;
}

export function GoodbyeOverlay({ width, height, elapsedMs, snapshot }: GoodbyeOverlayProps) {
  const phase = elapsedMs < SIPHON_MS
    ? 'siphon'
    : elapsedMs < SIPHON_MS + SMILE_MS
      ? 'smile'
      : elapsedMs < SIPHON_MS + SMILE_MS + WINK_MS
      ? 'wink'
      : elapsedMs < SIPHON_MS + SMILE_MS + WINK_MS + SLEEP_MS
        ? 'sleep'
        : 'blackout';

  const sourceGlyphs = useMemo(
    () => extractSourceGlyphs(snapshot, width, height),
    [height, snapshot, width],
  );

  const grid = useMemo(() => {
    const frame = phase === 'blackout' ? buildBlackGrid(width, height) : buildTransparentGrid(width, height);

    if (phase === 'siphon') {
      const p = Math.max(0, Math.min(1, elapsedMs / SIPHON_MS));
      if (sourceGlyphs.length > 0) {
        drawGlyphSiphon(frame, width, height, p, sourceGlyphs);
      } else {
        drawSiphon(frame, width, height, p);
      }
      return frame;
    }

    if (phase === 'smile') {
      if (sourceGlyphs.length > 0) {
        drawJoinedTextMass(frame, width, height, sourceGlyphs);
      } else {
        drawCenterMass(frame, width, height, 73);
      }
      drawDimmedHalo(frame, width, height);
      drawFace(frame, width, height, 'smile');
      return frame;
    }

    if (phase === 'wink') {
      if (sourceGlyphs.length > 0) {
        drawJoinedTextMass(frame, width, height, sourceGlyphs);
      } else {
        drawCenterMass(frame, width, height, 97);
      }
      drawDimmedHalo(frame, width, height);
      drawFace(frame, width, height, 'wink');
      return frame;
    }

    if (phase === 'sleep') {
      if (sourceGlyphs.length > 0) {
        drawJoinedTextMass(frame, width, height, sourceGlyphs);
      } else {
        drawCenterMass(frame, width, height, 163);
      }
      drawDimmedHalo(frame, width, height);
      drawFace(frame, width, height, 'sleep');
      return frame;
    }

    return frame;
  }, [elapsedMs, height, phase, sourceGlyphs, width]);

  return renderGrid(width, height, grid);
}
