import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text } from 'ink';
import { useMouse } from '../hooks/useMouse.js';

interface StarfieldBackdropProps {
  width: number;
  height: number;
  mouseReactive?: boolean;
  frozen?: boolean;
}

type StarLayer = 0 | 1 | 2;

interface Star {
  active: boolean;
  spawnAt: number;
  layer: StarLayer;
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: number;
  char: string;
  color: string;
  twinkleAt: number;
}

interface Comet {
  active: boolean;
  spawnAt: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  swayAmp: number;
  swayFreq: number;
  age: number;
  radius: number;
  tailLen: number;
}

type OrbiterKind = 'satellite' | 'debris' | 'iss' | 'starlink' | 'ufo';

interface Orbiter {
  active: boolean;
  spawnAt: number;
  kind: OrbiterKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spriteRows: string[];
  color: string;
  bright: boolean;
  blinkAt: number;
}

interface BlackHole {
  active: boolean;
  x: number;
  y: number;
  lastSeen: number;
}

interface NebulaCloud {
  active: boolean;
  spawnAt: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rx: number;
  ry: number;
  age: number;
  life: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  palette: readonly [string, string, string];
}

type PlanetKind =
  | 'mercury'
  | 'moon'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

interface PlanetVisitor {
  active: boolean;
  spawnAt: number;
  kind: PlanetKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  scale: number;
  pad: number;
}

interface Cell {
  char: string;
  color?: string;
  backgroundColor: string;
  bold?: boolean;
  priority: number;
}

const BACKGROUND = '#000000';
const NEBULA_PALETTES = [
  ['#060712', '#0C1030', '#131A42'],
  ['#070A0F', '#0C1E2D', '#123042'],
  ['#09070F', '#1B0E2A', '#28163E'],
  ['#060B0A', '#102018', '#173527'],
] as const;

const STAR_LAYER_CONFIG = [
  {
    speedMin: 1.2,
    speedMax: 2.7,
    driftMin: -0.3,
    driftMax: 0.3,
    trail: 0,
    chars: ['·', '⋅'] as const,
    colors: ['#6D768A', '#7A8498', '#6B7F95'] as const,
  },
  {
    speedMin: 2.4,
    speedMax: 5.0,
    driftMin: -0.9,
    driftMax: 0.9,
    trail: 1,
    chars: ['•', '✧', '⋆'] as const,
    colors: ['#9AA7C0', '#A8B7CF', '#AAB2D2'] as const,
  },
  {
    speedMin: 4.8,
    speedMax: 8.8,
    driftMin: -1.8,
    driftMax: 1.8,
    trail: 2,
    chars: ['✦', '★', '✶'] as const,
    colors: ['#C4D4F2', '#CFE2FF', '#D1D7FF'] as const,
  },
] as const;

const ORBITER_MODELS = [
  {
    kind: 'satellite' as const,
    rowsForward: [
      '   ╭─┬──◎──┬─╮   ',
      '═══╡░│  ║  │░╞═══',
      '   ╰─┴──█──┴─╯   ',
    ],
    color: '#9DB6D9',
    speedMin: 4.8,
    speedMax: 7.3,
    yMin: 0.08,
    yMax: 0.68,
  },
  {
    kind: 'starlink' as const,
    rowsForward: [
      '  ◉─┬─◉─┬─◉  ',
      '━━━╾┼═█═┼╼━━━',
      '  ◉─┴─◉─┴─◉  ',
    ],
    color: '#90A8D1',
    speedMin: 5.2,
    speedMax: 8.8,
    yMin: 0.05,
    yMax: 0.62,
  },
  {
    kind: 'iss' as const,
    rowsForward: [
      '▮▮▮▮▮═══╦═══▮▮▮▮▮',
      '▮▮▮▮▮───╬───▮▮▮▮▮',
      '█████═══█═══█████',
      '▮▮▮▮▮───╬───▮▮▮▮▮',
      '▮▮▮▮▮═══╩═══▮▮▮▮▮',
    ],
    color: '#B9C8DD',
    speedMin: 3.8,
    speedMax: 5.9,
    yMin: 0.12,
    yMax: 0.54,
  },
  {
    kind: 'ufo' as const,
    rowsForward: [
      '      ╭──────╮      ',
      '   ╭──╯ ╭──╮ ╰──╮   ',
      '═══╡░░░░│◉◉│░░░░╞═══',
      '   ╰──╮ ╰──╯ ╭──╯   ',
      '      ╰──────╯      ',
    ],
    color: '#A285FF',
    speedMin: 4.3,
    speedMax: 6.8,
    yMin: 0.05,
    yMax: 0.5,
  },
  {
    kind: 'debris' as const,
    rowsForward: ['✶'],
    color: '#6E7890',
    speedMin: 5,
    speedMax: 18,
    yMin: 0.0,
    yMax: 0.84,
  },
] as const;

const COMET_NUCLEUS = '#FFFFFF';
const COMET_CORE    = '#C8F0FF';
const COMET_INNER   = '#60CCFF';
const COMET_MID     = '#2880E0';
const COMET_OUTER   = '#144CA8';
const COMET_HALO    = '#0A2868';
const COMET_TAIL    = ['#70D8FF', '#40A8E0', '#2068B8', '#103880', '#081848'] as const;
const PLANET_KINDS: readonly PlanetKind[] = [
  'mercury',
  'moon',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;
const GAS_GIANT_KINDS = new Set<PlanetKind>(['jupiter', 'saturn', 'uranus', 'neptune']);

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand(0, arr.length))] ?? arr[0];
const speed = (vx: number, vy: number) => Math.sqrt(vx * vx + vy * vy);
const isGasGiant = (kind: PlanetKind) => GAS_GIANT_KINDS.has(kind);
const isRockyPlanet = (kind: PlanetKind) => !isGasGiant(kind);

function dormantStar(layer: StarLayer, now: number): Star {
  return {
    active: false,
    spawnAt: now + rand(60, 3800),
    layer,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    trail: STAR_LAYER_CONFIG[layer].trail,
    char: STAR_LAYER_CONFIG[layer].chars[0]!,
    color: STAR_LAYER_CONFIG[layer].colors[0]!,
    twinkleAt: now + rand(200, 1200),
  };
}

function spawnStar(star: Star, width: number, height: number, now: number): Star {
  const cfg = STAR_LAYER_CONFIG[star.layer];
  return {
    ...star,
    active: true,
    spawnAt: 0,
    x: rand(0, Math.max(1, width - 1)),
    y: rand(-Math.max(6, height * 0.7), -1),
    vx: rand(cfg.driftMin, cfg.driftMax),
    vy: rand(cfg.speedMin, cfg.speedMax),
    trail: cfg.trail,
    char: pick(cfg.chars),
    color: pick(cfg.colors),
    twinkleAt: now + rand(160, 1200),
  };
}

function dormantComet(now: number): Comet {
  return {
    active: false,
    spawnAt: now + rand(3500, 11000),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    swayAmp: 0,
    swayFreq: 0,
    age: 0,
    radius: 0,
    tailLen: 0,
  };
}

function spawnComet(width: number, height: number): Comet {
  const fromLeft = Math.random() < 0.5;
  const radius = Math.floor(rand(2, 5));
  const vx = rand(20, 42) * (fromLeft ? 1 : -1);
  return {
    active: true,
    spawnAt: 0,
    x: fromLeft ? -rand(12, 24) : width + rand(12, 24),
    y: rand(0, Math.max(2, height * 0.45)),
    vx,
    vy: rand(2.4, 7.8),
    swayAmp: rand(2.4, 6.4),
    swayFreq: rand(1.2, 2.6),
    age: 0,
    radius,
    tailLen: Math.floor(rand(radius * 8, radius * 13)),
  };
}

function dormantCloud(now: number): NebulaCloud {
  return {
    active: false,
    spawnAt: now + rand(500, 4400),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rx: 0,
    ry: 0,
    age: 0,
    life: 0,
    swayAmp: 0,
    swayFreq: 0,
    phase: 0,
    palette: NEBULA_PALETTES[0]!,
  };
}

function spawnCloud(width: number, height: number): NebulaCloud {
  const rx = rand(Math.max(8, width * 0.16), Math.max(16, width * 0.35));
  const ry = rand(Math.max(4, height * 0.18), Math.max(8, height * 0.42));
  const fromEdge = Math.random() < 0.7;
  const fromLeft = Math.random() < 0.5;

  const x = fromEdge
    ? (fromLeft ? -rx * rand(0.5, 1.1) : width + rx * rand(0.5, 1.1))
    : rand(-rx * 0.4, width + rx * 0.4);
  const y = rand(height * 0.05, height * 0.95);

  return {
    active: true,
    spawnAt: 0,
    x,
    y,
    vx: rand(-0.95, 0.95),
    vy: rand(-0.22, 0.22),
    rx,
    ry,
    age: 0,
    life: rand(16, 38),
    swayAmp: rand(0.06, 0.28),
    swayFreq: rand(0.25, 0.7),
    phase: rand(0, Math.PI * 2),
    palette: pick(NEBULA_PALETTES),
  };
}

function buildNebulaFrame(width: number, height: number, clouds: NebulaCloud[]): string[][] {
  const scaleX = 4;
  const scaleY = 2;
  const coarseW = Math.max(1, Math.ceil(width / scaleX));
  const coarseH = Math.max(1, Math.ceil(height / scaleY));

  const coarse: string[][] = Array.from({ length: coarseH }, () =>
    Array.from({ length: coarseW }, () => BACKGROUND),
  );
  const influence: number[][] = Array.from({ length: coarseH }, () =>
    Array.from({ length: coarseW }, () => 0),
  );

  for (const cloud of clouds) {
    if (!cloud.active || cloud.life <= 0) continue;
    const lifeT = clamp(cloud.age / cloud.life, 0, 1);
    const fade = Math.sin(lifeT * Math.PI);
    if (fade <= 0.03) continue;

    const cx = cloud.x / scaleX;
    const cy = cloud.y / scaleY;
    const rx = cloud.rx / scaleX;
    const ry = cloud.ry / scaleY;
    const [outer, mid, core] = cloud.palette;

    const minX = Math.max(0, Math.floor(cx - rx * 1.2));
    const maxX = Math.min(coarseW - 1, Math.ceil(cx + rx * 1.2));
    const minY = Math.max(0, Math.floor(cy - ry * 1.2));
    const maxY = Math.min(coarseH - 1, Math.ceil(cy + ry * 1.2));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (dist > 1) continue;

        const power = Math.pow(1 - dist, 1.85) * fade * 0.92;
        if (power <= influence[y]![x]!) continue;

        influence[y]![x] = power;
        coarse[y]![x] = power > 0.56 ? core : power > 0.30 ? mid : power > 0.13 ? outer : BACKGROUND;
      }
    }
  }

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => coarse[Math.floor(y / scaleY)]![Math.floor(x / scaleX)]!),
  );
}

function planetSpawnPad(kind: PlanetKind, scale: number) {
  if (kind === 'saturn') return Math.round(44 * scale);
  if (kind === 'jupiter') return Math.round(22 * scale);
  if (kind === 'moon') return Math.round(11 * scale);
  if (kind === 'uranus' || kind === 'neptune') return Math.round(19 * scale);
  if (kind === 'earth' || kind === 'venus') return Math.round(16 * scale);
  return Math.round(13 * scale);
}

function dormantPlanet(now: number, kind: PlanetKind = 'earth'): PlanetVisitor {
  return {
    active: false,
    spawnAt: now + rand(2500, 9000),
    kind,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    phase: rand(0, Math.PI * 2),
    scale: 1,
    pad: 30,
  };
}

function pickNextPlanet(previous: PlanetKind, options?: { rockyOnly?: boolean }): PlanetKind {
  const pool = PLANET_KINDS.filter(
    (k) => k !== previous && (!options?.rockyOnly || isRockyPlanet(k)),
  );
  if (pool.length === 0) return previous;
  return pick(pool);
}

function spawnPlanet(kind: PlanetKind, width: number, height: number): PlanetVisitor {
  const fromLeft = Math.random() < 0.5;
  const baseScale = clamp(width / 110, 0.82, 1.38);
  const sizeBias =
    kind === 'jupiter' ? 1.12 :
    kind === 'saturn' ? 1.08 :
    kind === 'moon' ? 0.74 :
    kind === 'mercury' ? 0.82 :
    kind === 'mars' ? 0.88 :
    1.0;
  const scale = baseScale * sizeBias * rand(0.94, 1.08);
  const pad = planetSpawnPad(kind, scale);
  const speedMag = rand(2.0, 3.8) * (kind === 'saturn' ? 0.75 : kind === 'jupiter' ? 0.82 : 1);

  return {
    active: true,
    spawnAt: 0,
    kind,
    x: fromLeft ? -pad : width + pad,
    y: rand(height * 0.12, Math.max(height * 0.16, height * 0.44)),
    vx: speedMag * (fromLeft ? 1 : -1),
    vy: rand(-0.08, 0.08),
    phase: rand(0, Math.PI * 2),
    scale,
    pad,
  };
}

function dormantOrbiter(now: number): Orbiter {
  return {
    active: false,
    spawnAt: now + rand(1800, 9000),
    kind: 'debris',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    spriteRows: ['•'],
    color: '#6E7890',
    bright: false,
    blinkAt: now + rand(300, 1600),
  };
}

function spawnOrbiter(width: number, height: number, now: number): Orbiter {
  const model = pick(ORBITER_MODELS);
  const fromLeft = Math.random() < 0.5;
  const vx = rand(model.speedMin, model.speedMax) * (fromLeft ? 1 : -1);
  let spriteRows: string[];
  if (model.kind === 'debris' && Math.random() < 0.5) {
    spriteRows = [pick(['·', '•', '*', '+', '✶', '✦'])];
  } else if (fromLeft) {
    spriteRows = [...model.rowsForward];
  } else {
    spriteRows = model.rowsForward.map((row) => row.split('').reverse().join(''));
  }
  const spriteW = Math.max(...spriteRows.map((row) => row.length));
  const spriteH = spriteRows.length;
  const spawnPad = spriteW + rand(4, 12);

  return {
    active: true,
    spawnAt: 0,
    kind: model.kind,
    x: fromLeft ? -spawnPad : width + spawnPad,
    y: rand(height * model.yMin, height * model.yMax) - spriteH * 0.5,
    vx,
    vy: rand(-0.7, 0.7),
    spriteRows,
    color: model.color,
    bright: Math.random() < 0.24,
    blinkAt: now + rand(200, 1400),
  };
}

function placeCell(rows: Cell[][], width: number, height: number, x: number, y: number, next: Partial<Cell> & Pick<Cell, 'char' | 'priority'>) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const cur = rows[y]![x]!;
  if (cur.priority > next.priority) return;
  rows[y]![x] = {
    char: next.char,
    color: next.color ?? cur.color,
    backgroundColor: next.backgroundColor ?? cur.backgroundColor,
    bold: next.bold ?? false,
    priority: next.priority,
  };
}

function applyGravity(
  x: number,
  y: number,
  vx: number,
  vy: number,
  dt: number,
  blackHole: BlackHole,
  strength: number,
  maxAccel: number,
  radius: number,
) {
  if (!blackHole.active) return { vx, vy };

  const dx = blackHole.x - x;
  const dy = blackHole.y - y;
  const dist2 = dx * dx + dy * dy;
  if (dist2 > radius * radius || dist2 < 0.8) return { vx, vy };

  const dist = Math.sqrt(dist2);
  const accel = Math.min(maxAccel, strength / (dist2 + 18));
  return {
    vx: vx + (dx / dist) * accel * dt,
    vy: vy + (dy / dist) * accel * dt,
  };
}

function drawPlasmaComet(rows: Cell[][], width: number, height: number, comet: Comet) {
  const sway = Math.sin(comet.age * comet.swayFreq) * comet.swayAmp;
  const vxNow = comet.vx + sway * 0.22;
  const vyNow = comet.vy + sway;
  const velocityLen = Math.max(1, Math.sqrt(vxNow * vxNow + vyNow * vyNow));
  const ux = vxNow / velocityLen;
  const uy = vyNow / velocityLen;
  const px = -uy;
  const py = ux;

  const cx = Math.round(comet.x);
  const cy = Math.round(comet.y);
  const r = comet.radius;
  // rx:ry = 2:1 so the ellipse looks circular given terminal cell aspect ratio
  const comaRx = Math.round(r * 2.0);
  const comaRy = Math.round(r * 1.0);

  // Tail — drawn first so the coma overwrites its root
  for (let t = 1; t <= comet.tailLen; t++) {
    const frac = t / comet.tailLen;
    const baseX = comet.x - ux * (t * 1.1);
    const baseY = comet.y - uy * (t * 1.1);
    // Gentle taper: starts at full r width, narrows toward the end
    const halfWidth = Math.max(0, Math.round(r * Math.pow(1 - frac, 0.55)));

    for (let w = -halfWidth; w <= halfWidth; w++) {
      const tx = Math.round(baseX + px * w);
      const ty = Math.round(baseY + py * w);
      const edgeFrac = halfWidth > 0 ? Math.abs(w) / halfWidth : 0;

      let char: string;
      let color: string;
      let priority: number;
      let bold = false;

      if (frac < 0.16) {
        char = edgeFrac < 0.45 ? '▓' : '▒';
        color = COMET_TAIL[0];
        priority = 27;
        bold = edgeFrac < 0.2;
      } else if (frac < 0.33) {
        char = edgeFrac < 0.45 ? '▒' : '░';
        color = COMET_TAIL[1];
        priority = 24;
      } else if (frac < 0.52) {
        char = edgeFrac < 0.5 ? '░' : '∙';
        color = COMET_TAIL[2];
        priority = 21;
      } else if (frac < 0.72) {
        char = '∙';
        color = COMET_TAIL[3];
        priority = 16;
      } else {
        char = '·';
        color = COMET_TAIL[4];
        priority = 12;
      }

      placeCell(rows, width, height, tx, ty, { char, color, priority, bold });
    }
  }

  // Outer diffuse halo — a faint glow ring beyond the solid coma
  const haloRx = Math.round(r * 3.6);
  const haloRy = Math.round(r * 1.8);
  for (let dy = -haloRy; dy <= haloRy; dy++) {
    for (let dx = -haloRx; dx <= haloRx; dx++) {
      const nx = dx / haloRx;
      const ny = dy / haloRy;
      const dist = Math.sqrt(nx * nx + ny * ny);
      if (dist > 1 || dist < 0.55) continue;
      const inner = 1 - (dist - 0.55) / 0.45;
      placeCell(rows, width, height, cx + dx, cy + dy, {
        char: inner > 0.5 ? '∙' : '·',
        color: COMET_HALO,
        priority: 22,
      });
    }
  }

  // Coma — the solid glowing head, circular in visual space
  for (let dy = -comaRy; dy <= comaRy; dy++) {
    for (let dx = -comaRx; dx <= comaRx; dx++) {
      const nx = dx / comaRx;
      const ny = dy / comaRy;
      const dist = Math.sqrt(nx * nx + ny * ny);
      if (dist > 1) continue;

      let char: string;
      let color: string;
      let priority: number;
      let bold = false;

      if (dist < 0.18) {
        char = '█'; color = COMET_NUCLEUS; priority = 40; bold = true;
      } else if (dist < 0.34) {
        char = '▓'; color = COMET_CORE;    priority = 38; bold = true;
      } else if (dist < 0.54) {
        char = '▒'; color = COMET_INNER;   priority = 36;
      } else if (dist < 0.74) {
        char = '░'; color = COMET_MID;     priority = 34;
      } else {
        char = '∙'; color = COMET_OUTER;   priority = 32;
      }

      placeCell(rows, width, height, cx + dx, cy + dy, { char, color, priority, bold });
    }
  }

  // Ablation sparks — bright particles orbiting/flaring off the nucleus
  for (let s = 0; s < 6; s++) {
    const t = comet.age * (1.1 + s * 0.18) + s * 1.26;
    const sparkDist = comaRx * (0.85 + Math.abs(Math.sin(t * 1.4)) * 0.4);
    const angle = t * 0.6 + s * ((Math.PI * 2) / 6);
    const sx = Math.round(cx + Math.cos(angle) * sparkDist);
    const sy = Math.round(cy + Math.sin(angle) * sparkDist * 0.5);
    if (Math.sin(t * 2.8) > -0.2) {
      placeCell(rows, width, height, sx, sy, {
        char: s % 3 === 0 ? '✦' : s % 3 === 1 ? '*' : '·',
        color: s % 3 === 0 ? COMET_CORE : COMET_INNER,
        bold: s % 3 === 0,
        priority: 33,
      });
    }
  }
}

function drawOrbiter(rows: Cell[][], width: number, height: number, orbiter: Orbiter) {
  const startY = Math.round(orbiter.y);
  const startX = Math.round(orbiter.x);
  for (let rowIdx = 0; rowIdx < orbiter.spriteRows.length; rowIdx++) {
    const spriteRow = orbiter.spriteRows[rowIdx]!;
    for (let col = 0; col < spriteRow.length; col++) {
      const ch = spriteRow[col] ?? ' ';
      if (ch === ' ') continue;
      const x = startX + col;
      const y = startY + rowIdx;
      placeCell(rows, width, height, x, y, {
        char: ch,
        color: orbiter.bright ? '#E8F4FF' : orbiter.color,
        bold: orbiter.bright,
        priority: orbiter.kind === 'debris' ? 12 : 24,
      });
    }
  }
}

function drawNebulaWisps(rows: Cell[][], width: number, height: number, clouds: NebulaCloud[]) {
  for (const cloud of clouds) {
    if (!cloud.active || cloud.life <= 0) continue;
    const lifeT = clamp(cloud.age / cloud.life, 0, 1);
    const fade = Math.sin(lifeT * Math.PI);
    if (fade <= 0.03) continue;

    const [outer, mid, core] = cloud.palette;
    const minX = Math.max(0, Math.floor(cloud.x - cloud.rx * 1.05));
    const maxX = Math.min(width - 1, Math.ceil(cloud.x + cloud.rx * 1.05));
    const minY = Math.max(0, Math.floor(cloud.y - cloud.ry * 1.05));
    const maxY = Math.min(height - 1, Math.ceil(cloud.y + cloud.ry * 1.05));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - cloud.x) / cloud.rx;
        const ny = (y - cloud.y) / cloud.ry;
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (dist > 1) continue;

        const ripples = (Math.sin((x + cloud.phase * 8) * 0.18 + y * 0.11) + 1) * 0.5;
        const power = Math.pow(1 - dist, 1.75) * fade * (0.72 + ripples * 0.28);
        if (power < 0.14) continue;

        let char = '░';
        let color = outer;
        let priority = 1;

        if (power > 0.54) {
          char = '▓';
          color = core;
          priority = 3;
        } else if (power > 0.32) {
          char = '▒';
          color = mid;
          priority = 2;
        } else if (power > 0.22) {
          char = '░';
          color = outer;
          priority = 1;
        } else {
          continue;
        }

        placeCell(rows, width, height, x, y, {
          char,
          color,
          backgroundColor: rows[y]![x]!.backgroundColor,
          priority,
        });
      }
    }
  }
}

function drawSaturn(rows: Cell[][], width: number, height: number, saturn: PlanetVisitor) {
  const cx = Math.round(saturn.x);
  const cy = Math.round(saturn.y);
  const pulse = 1 + Math.sin(saturn.phase * 0.7) * 0.03;

  const planetRx = Math.max(10, Math.round(13 * saturn.scale * pulse));
  const planetRy = Math.max(5, Math.round(6.5 * saturn.scale * pulse));

  const ringOuterX = Math.max(18, Math.round(planetRx * 2.65));
  const ringOuterY = Math.max(4, Math.round(planetRy * 1.05));
  const ringInnerX = Math.max(12, Math.round(planetRx * 1.33));
  const ringInnerY = Math.max(2, Math.round(planetRy * 0.57));

  const tilt = -0.42;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const ringPad = 3;

  const minX = Math.max(0, cx - ringOuterX - ringPad);
  const maxX = Math.min(width - 1, cx + ringOuterX + ringPad);
  const minY = Math.max(0, cy - ringOuterY - planetRy - ringPad);
  const maxY = Math.min(height - 1, cy + ringOuterY + planetRy + ringPad);

  const ringColors = ['#A58E6A', '#B89E73', '#C8AF84', '#978460'] as const;
  const planetColors = ['#7F6541', '#9B7C50', '#B8915E', '#D1AE79', '#E7C793'] as const;
  const planetChars = ['.', ':', '-', '=', '+', '*', '#', '%', '@'] as const;

  const ringShadeAt = (yrAbsN: number) => {
    if (yrAbsN < 0.18) return { char: '=', color: ringColors[2], priority: 7 };
    if (yrAbsN < 0.34) return { char: '~', color: ringColors[1], priority: 6 };
    if (yrAbsN < 0.58) return { char: '-', color: ringColors[0], priority: 5 };
    return { char: '.', color: ringColors[3], priority: 4 };
  };

  // Back ring
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tx = x - cx;
      const ty = y - cy;
      const xr = tx * cosT + ty * sinT;
      const yr = -tx * sinT + ty * cosT;
      const outer = (xr * xr) / (ringOuterX * ringOuterX) + (yr * yr) / (ringOuterY * ringOuterY);
      const inner = (xr * xr) / (ringInnerX * ringInnerX) + (yr * yr) / (ringInnerY * ringInnerY);
      if (outer > 1 || inner < 1) continue;
      if (yr > 0) continue;

      const shade = ringShadeAt(Math.abs(yr) / ringOuterY);
      placeCell(rows, width, height, x, y, {
        char: shade.char,
        color: shade.color,
        priority: shade.priority,
      });
    }
  }

  // Planet body with strong ASCII detail + cloud bands + ring shadow.
  for (let y = Math.max(0, cy - planetRy - 1); y <= Math.min(height - 1, cy + planetRy + 1); y++) {
    for (let x = Math.max(0, cx - planetRx - 1); x <= Math.min(width - 1, cx + planetRx + 1); x++) {
      const tx = x - cx;
      const ty = y - cy;
      const nx = tx / planetRx;
      const ny = ty / planetRy;
      const dist = nx * nx + ny * ny;
      if (dist > 1) continue;

      // Ring shadow projected over top hemisphere.
      const xr = tx * cosT + ty * sinT;
      const yr = -tx * sinT + ty * cosT;
      const ringBand = Math.abs(yr) < 0.7 && Math.abs(xr) < ringOuterX * 0.92 && ty < 0;

      const light = (-(nx + 0.34) * 0.75) + (-(ny + 0.18) * 0.45);
      const rim = Math.pow(1 - dist, 0.68);
      const banding = (Math.sin((ty * 1.55) + saturn.phase * 1.6) + 1) * 0.5;
      let shade = clamp(0.14 + rim * 0.64 + light * 0.28 + (banding - 0.5) * 0.2, 0, 1);
      if (ringBand) shade = clamp(shade - 0.22, 0, 1);

      const charIdx = Math.min(planetChars.length - 1, Math.floor(shade * (planetChars.length - 1)));
      const colorIdx = Math.min(planetColors.length - 1, Math.floor(shade * (planetColors.length - 1)));

      placeCell(rows, width, height, x, y, {
        char: planetChars[charIdx]!,
        color: planetColors[colorIdx]!,
        bold: shade > 0.75,
        priority: 6,
      });
    }
  }

  // Front ring
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tx = x - cx;
      const ty = y - cy;
      const xr = tx * cosT + ty * sinT;
      const yr = -tx * sinT + ty * cosT;
      const outer = (xr * xr) / (ringOuterX * ringOuterX) + (yr * yr) / (ringOuterY * ringOuterY);
      const inner = (xr * xr) / (ringInnerX * ringInnerX) + (yr * yr) / (ringInnerY * ringInnerY);
      if (outer > 1 || inner < 1) continue;
      if (yr <= 0) continue;

      const shade = ringShadeAt(Math.abs(yr) / ringOuterY);
      placeCell(rows, width, height, x, y, {
        char: shade.char,
        color: shade.color,
        priority: shade.priority + 2,
      });
    }
  }

  // Small moons for fidelity hints (Titan + Rhea-ish dots).
  const moon1x = Math.round(cx + ringOuterX * 0.82 + Math.sin(saturn.phase * 0.42) * 2);
  const moon1y = Math.round(cy - ringOuterY * 0.75);
  placeCell(rows, width, height, moon1x, moon1y, { char: 'o', color: '#D7C49A', priority: 8 });
  const moon2x = Math.round(cx - ringOuterX * 0.74 + Math.cos(saturn.phase * 0.57) * 2);
  const moon2y = Math.round(cy + ringOuterY * 0.4);
  placeCell(rows, width, height, moon2x, moon2y, { char: '.', color: '#BCA980', priority: 8 });
}

function drawSpheroidPlanet(rows: Cell[][], width: number, height: number, planet: PlanetVisitor) {
  const cx = Math.round(planet.x);
  const cy = Math.round(planet.y);
  const pulse = 1 + Math.sin(planet.phase * 0.7) * 0.02;

  const baseRx =
    planet.kind === 'jupiter' ? 12 :
    planet.kind === 'neptune' ? 9 :
    planet.kind === 'uranus' ? 9 :
    planet.kind === 'earth' ? 9 :
    planet.kind === 'venus' ? 8 :
    planet.kind === 'moon' ? 5 :
    planet.kind === 'mars' ? 6 :
    5;
  const baseRyRatio = 0.5;
  const baseRy = Math.max(3, Math.round(baseRx * baseRyRatio));
  const rx = Math.max(4, Math.round(baseRx * planet.scale * pulse));
  const ry = Math.max(3, Math.round(baseRy * planet.scale * pulse));

  const minX = Math.max(0, cx - rx - 1);
  const maxX = Math.min(width - 1, cx + rx + 1);
  const minY = Math.max(0, cy - ry - 1);
  const maxY = Math.min(height - 1, cy + ry + 1);

  const palettes: Record<Exclude<PlanetKind, 'saturn'>, readonly string[]> = {
    mercury: ['#6D6760', '#817A71', '#9A8F84', '#B4A697', '#C6B7A8'],
    moon: ['#5D5F66', '#72757E', '#8E929D', '#ADB2BC', '#CBD1DB'],
    venus: ['#7E5C34', '#A8743B', '#C08B4A', '#D9A75D', '#EDC16F'],
    earth: ['#1E4764', '#2F6C8C', '#3B88A3', '#5BAA79', '#8DD0A1'],
    mars: ['#6C3223', '#8A3F2A', '#A85334', '#C86945', '#DC8360'],
    jupiter: ['#6D4A2E', '#8B613A', '#A67A4C', '#C29563', '#D8B580'],
    uranus: ['#3A6874', '#4D8793', '#63A4B0', '#79BDC7', '#8FD0D8'],
    neptune: ['#2B396A', '#35508A', '#3E69A8', '#4E83BF', '#6DA5D8'],
  };
  const chars = ['.', ':', '-', '=', '+', '*', '#', '%', '@'] as const;
  const palette = palettes[planet.kind as Exclude<PlanetKind, 'saturn'>];

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tx = x - cx;
      const ty = y - cy;
      const nx = tx / rx;
      const ny = ty / ry;
      const dist = nx * nx + ny * ny;
      if (dist > 1) continue;

      const light = (-(nx + 0.33) * 0.76) + (-(ny + 0.2) * 0.42);
      const rim = Math.pow(1 - dist, 0.7);
      const bands = (Math.sin((ty * 1.45) + planet.phase * 1.5) + 1) * 0.5;
      let shade = clamp(0.12 + rim * 0.66 + light * 0.28 + (bands - 0.5) * 0.15, 0, 1);

      let color = palette[Math.min(palette.length - 1, Math.floor(shade * (palette.length - 1)))]!;
      let char: string = chars[Math.min(chars.length - 1, Math.floor(shade * (chars.length - 1)))]!;
      let priority = 7;

      if (planet.kind === 'earth') {
        const continents = Math.sin(nx * 7.2 + planet.phase * 0.9) + Math.cos(ny * 8.3 - planet.phase * 0.7);
        if (continents > 0.7) {
          color = '#5CB783';
          char = '#';
          priority = 8;
        } else if (continents > 0.45) {
          color = '#6FCB94';
          char = '*';
          priority = 8;
        } else if (Math.abs(ny) > 0.85) {
          color = '#DCEAF4';
          char = '•';
          priority = 9;
        }
      } else if (planet.kind === 'jupiter') {
        const stripe = Math.sin((ty * 2.2) + planet.phase * 1.4);
        if (stripe > 0.45) {
          color = '#D7B07F';
          char = '=';
        } else if (stripe < -0.35) {
          color = '#8F653E';
          char = '-';
        }
        const gx = (x - (cx + rx * 0.18)) / (rx * 0.28);
        const gy = (y - (cy + ry * 0.18)) / (ry * 0.26);
        if (gx * gx + gy * gy < 1) {
          color = '#B65D42';
          char = '@';
          priority = 9;
        }
      } else if (planet.kind === 'venus') {
        const cloud = Math.sin(nx * 4.4 + ny * 3.2 + planet.phase * 1.6);
        if (cloud > 0.55) {
          color = '#F0CB7E';
          char = '▒';
        } else if (cloud > 0.2) {
          color = '#D8A85E';
          char = '░';
        }
      } else if (planet.kind === 'mars') {
        const crater = Math.sin(nx * 10.5 + 0.6) + Math.cos(ny * 12.2 - 0.4);
        if (crater > 1.2) {
          color = '#7A3B28';
          char = 'o';
          priority = 8;
        }
        if (Math.abs(ny) > 0.9) {
          color = '#D6B1A3';
          char = '•';
        }
      } else if (planet.kind === 'mercury') {
        const crater = Math.sin(nx * 13.0 + 1.3) + Math.cos(ny * 11.0 - 2.1);
        if (crater > 1.1) {
          color = '#7C756C';
          char = 'o';
          priority = 8;
        }
      } else if (planet.kind === 'moon') {
        const mare = Math.sin(nx * 5.1 + 1.7) + Math.cos(ny * 4.8 - 0.8);
        if (mare > 1.0) {
          color = '#666A73';
          char = '▒';
          priority = 8;
        } else if (mare > 0.62) {
          color = '#737883';
          char = '░';
          priority = 8;
        }

        const craterA = (nx - 0.28) * (nx - 0.28) + (ny + 0.16) * (ny + 0.16);
        const craterB = (nx + 0.34) * (nx + 0.34) + (ny - 0.24) * (ny - 0.24);
        const craterC = (nx + 0.05) * (nx + 0.05) + (ny + 0.39) * (ny + 0.39);
        if (craterA < 0.08 || craterB < 0.05 || craterC < 0.045) {
          color = '#565A63';
          char = 'o';
          priority = 9;
        }
      } else if (planet.kind === 'uranus') {
        const stripe = Math.sin((ty * 1.5) + planet.phase);
        if (stripe > 0.5) {
          color = '#9DE0E6';
          char = '=';
        }
      } else if (planet.kind === 'neptune') {
        const stripe = Math.sin((ty * 1.9) + planet.phase * 1.2);
        if (stripe > 0.4) {
          color = '#6FA9DB';
          char = '=';
        }
        const sx = (x - (cx + rx * 0.2)) / (rx * 0.26);
        const sy = (y - (cy - ry * 0.15)) / (ry * 0.22);
        if (sx * sx + sy * sy < 1) {
          color = '#B8DDF7';
          char = '@';
          priority = 9;
        }
      }

      placeCell(rows, width, height, x, y, {
        char,
        color,
        bold: shade > 0.78,
        priority,
      });
    }
  }
}

function drawPlanetVisitor(rows: Cell[][], width: number, height: number, planet: PlanetVisitor) {
  if (!planet.active) return;
  if (planet.kind === 'saturn') {
    drawSaturn(rows, width, height, planet);
    return;
  }
  drawSpheroidPlanet(rows, width, height, planet);
}

function drawRows(
  stars: Star[],
  comets: Comet[],
  orbiters: Orbiter[],
  clouds: NebulaCloud[],
  planets: PlanetVisitor[],
  width: number,
  height: number,
  blackHole: BlackHole,
): Cell[][] {
  const nebula = buildNebulaFrame(width, height, clouds);
  const rows: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      char: ' ',
      color: undefined,
      backgroundColor: nebula[y]![x]!,
      priority: 0,
    })),
  );

  drawNebulaWisps(rows, width, height, clouds);
  for (const planet of planets) drawPlanetVisitor(rows, width, height, planet);

  for (const star of stars) {
    if (!star.active) continue;
    const x = Math.round(star.x);
    const y = Math.round(star.y);
    const layerPriority = 8 + star.layer * 2;

    placeCell(rows, width, height, x, y, {
      char: star.char,
      color: star.color,
      bold: star.layer >= 1,
      priority: layerPriority,
    });

    for (let t = 1; t <= star.trail; t++) {
      placeCell(rows, width, height, x, y - t, {
        char: t === star.trail ? '·' : '∙',
        color: star.layer === 2 ? '#6D7FA6' : '#4B5876',
        priority: 3,
      });
    }

    if (star.layer === 2) {
      placeCell(rows, width, height, x - 1, y, { char: '✦', color: '#7B8FC0', priority: 2 });
      placeCell(rows, width, height, x + 1, y, { char: '✦', color: '#7B8FC0', priority: 2 });
    }
  }

  for (const orbiter of orbiters) {
    if (!orbiter.active) continue;
    drawOrbiter(rows, width, height, orbiter);
  }

  for (const comet of comets) {
    if (!comet.active) continue;
    drawPlasmaComet(rows, width, height, comet);
  }

  if (blackHole.active) {
    const cx = Math.round(blackHole.x);
    const cy = Math.round(blackHole.y);
    placeCell(rows, width, height, cx, cy, { char: '◉', color: '#22114A', priority: 12 });
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const rx = Math.round(cx + Math.cos(angle) * 4);
      const ry = Math.round(cy + Math.sin(angle) * 2);
      placeCell(rows, width, height, rx, ry, { char: '·', color: '#26164F', priority: 7 });
    }
  }

  return rows;
}

export function StarfieldBackdrop({ width, height, mouseReactive = false, frozen = false }: StarfieldBackdropProps) {
  const [tick, setTick] = useState(0);
  const starsRef = useRef<Star[]>([]);
  const cometsRef = useRef<Comet[]>([]);
  const orbitersRef = useRef<Orbiter[]>([]);
  const cloudsRef = useRef<NebulaCloud[]>([]);
  const planetsRef = useRef<PlanetVisitor[]>([]);
  const previousPlanetRef = useRef<PlanetKind>('saturn');
  const nextPlanetSpawnAtRef = useRef<number>(Date.now() + rand(2500, 9000));
  const blackHoleRef = useRef<BlackHole>({ active: false, x: 0, y: 0, lastSeen: 0 });

  useMouse(
    (event) => {
      if (event.kind === 'move' || event.kind === 'down') {
        blackHoleRef.current = {
          active: true,
          x: event.x - 1,
          y: event.y - 1,
          lastSeen: Date.now(),
        };
      }
    },
    { isActive: mouseReactive },
  );

  useEffect(() => {
    const now = Date.now();
    const totalStars = Math.max(34, Math.min(130, Math.floor((width * height) / 92)));
    const layerCounts: [number, number, number] = [
      Math.floor(totalStars * 0.44),
      Math.floor(totalStars * 0.34),
      totalStars - Math.floor(totalStars * 0.44) - Math.floor(totalStars * 0.34),
    ];

    const rebuiltStars: Star[] = [];
    for (let l = 0; l < 3; l++) {
      const layer = l as StarLayer;
      for (let i = 0; i < layerCounts[layer]; i++) {
        rebuiltStars.push(dormantStar(layer, now + rand(0, 2200)));
      }
    }
    starsRef.current = rebuiltStars;

    const cometCount = Math.max(1, Math.min(3, Math.floor(width / 85)));
    cometsRef.current = Array.from({ length: cometCount }, () => dormantComet(now));

    const orbiterCount = Math.max(3, Math.min(9, Math.floor(width / 26)));
    orbitersRef.current = Array.from({ length: orbiterCount }, () => dormantOrbiter(now));

    const cloudCount = Math.max(3, Math.min(8, Math.floor((width * height) / 430)));
    cloudsRef.current = Array.from({ length: cloudCount }, (_, i) => {
      if (i < Math.ceil(cloudCount * 0.55)) {
        const cloud = spawnCloud(width, height);
        cloud.age = rand(0, cloud.life * 0.8);
        return cloud;
      }
      return dormantCloud(now + rand(0, 2200));
    });

    planetsRef.current = [];
    nextPlanetSpawnAtRef.current = now + rand(200, 1800);
    // Force one render with the initialized refs so the component shows a proper
    // frame even when frozen=true stops the animation interval from ever firing.
    setTick((v) => v + 1);
  }, [width, height]);

  useEffect(() => {
    if (frozen) return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.18, (now - last) / 1000);
      last = now;

      if (blackHoleRef.current.active && now - blackHoleRef.current.lastSeen > 1200) {
        blackHoleRef.current.active = false;
      }

      for (let i = 0; i < starsRef.current.length; i++) {
        const star = starsRef.current[i]!;
        if (!star.active) {
          if (now >= star.spawnAt) starsRef.current[i] = spawnStar(star, width, height, now);
          continue;
        }

        const gravity = applyGravity(
          star.x,
          star.y,
          star.vx,
          star.vy,
          dt,
          blackHoleRef.current,
          420,
          14,
          28,
        );
        star.vx = gravity.vx;
        star.vy = gravity.vy;

        const maxVel = star.layer === 0 ? 4.2 : star.layer === 1 ? 7.5 : 12.0;
        const vel = speed(star.vx, star.vy);
        if (vel > maxVel) {
          star.vx = (star.vx / vel) * maxVel;
          star.vy = (star.vy / vel) * maxVel;
        }

        star.x += star.vx * dt;
        star.y += star.vy * dt;

        if (now >= star.twinkleAt) {
          const cfg = STAR_LAYER_CONFIG[star.layer];
          star.char = pick(cfg.chars);
          if (Math.random() < 0.55) star.color = pick(cfg.colors);
          star.twinkleAt = now + rand(170, 1300);
        }

        if (Math.random() < 0.008) {
          const cfg = STAR_LAYER_CONFIG[star.layer];
          star.vx = clamp(star.vx + rand(-0.22, 0.22), cfg.driftMin * 2.2, cfg.driftMax * 2.2);
          star.vy = clamp(star.vy + rand(-0.4, 0.55), cfg.speedMin * 0.8, cfg.speedMax * 1.35);
        }

        const offscreen =
          star.y - star.trail > height + 1 ||
          star.x < -3 ||
          star.x > width + 3;
        if (offscreen) {
          starsRef.current[i] = dormantStar(star.layer, now);
        }
      }

      for (let i = 0; i < cometsRef.current.length; i++) {
        const comet = cometsRef.current[i]!;
        if (!comet.active) {
          if (now >= comet.spawnAt) cometsRef.current[i] = spawnComet(width, height);
          continue;
        }

        comet.age += dt;
        const gravity = applyGravity(
          comet.x,
          comet.y,
          comet.vx,
          comet.vy,
          dt,
          blackHoleRef.current,
          1150,
          24,
          34,
        );
        comet.vx = gravity.vx;
        comet.vy = gravity.vy;

        const sway = Math.sin(comet.age * comet.swayFreq) * comet.swayAmp;
        comet.x += (comet.vx + sway * 0.22) * dt;
        comet.y += (comet.vy + sway) * dt;

        const offscreen =
          comet.x < -comet.tailLen - 26 ||
          comet.x > width + comet.tailLen + 26 ||
          comet.y > height + comet.tailLen ||
          comet.y < -18;
        if (offscreen) cometsRef.current[i] = dormantComet(now);
      }

      for (let i = 0; i < orbitersRef.current.length; i++) {
        const orbiter = orbitersRef.current[i]!;
        if (!orbiter.active) {
          if (now >= orbiter.spawnAt) orbitersRef.current[i] = spawnOrbiter(width, height, now);
          continue;
        }

        if (now >= orbiter.blinkAt) {
          orbiter.bright = !orbiter.bright;
          orbiter.blinkAt = now + rand(150, 1500);
        }

        const gravity = applyGravity(
          orbiter.x,
          orbiter.y,
          orbiter.vx,
          orbiter.vy,
          dt,
          blackHoleRef.current,
          760,
          18,
          32,
        );
        orbiter.vx = gravity.vx;
        orbiter.vy = gravity.vy;
        orbiter.x += orbiter.vx * dt;
        orbiter.y += orbiter.vy * dt;

        const spriteW = Math.max(...orbiter.spriteRows.map((row) => row.length));
        const spriteH = orbiter.spriteRows.length;
        const offscreen =
          orbiter.x < -spriteW - 8 ||
          orbiter.x > width + spriteW + 8 ||
          orbiter.y < -spriteH - 3 ||
          orbiter.y > height + 3;
        if (offscreen) orbitersRef.current[i] = dormantOrbiter(now);
      }

      for (let i = 0; i < cloudsRef.current.length; i++) {
        const cloud = cloudsRef.current[i]!;
        if (!cloud.active) {
          if (now >= cloud.spawnAt) cloudsRef.current[i] = spawnCloud(width, height);
          continue;
        }

        cloud.age += dt;
        cloud.x += cloud.vx * dt;
        cloud.y += (cloud.vy + Math.sin(cloud.age * cloud.swayFreq + cloud.phase) * cloud.swayAmp) * dt;

        const offscreen =
          cloud.x < -cloud.rx * 1.8 ||
          cloud.x > width + cloud.rx * 1.8 ||
          cloud.y < -cloud.ry * 1.8 ||
          cloud.y > height + cloud.ry * 1.8;

        if (cloud.age >= cloud.life || offscreen) {
          cloudsRef.current[i] = dormantCloud(now);
        }
      }

      for (let i = planetsRef.current.length - 1; i >= 0; i--) {
        const planet = planetsRef.current[i]!;
        planet.phase += dt;
        planet.x += planet.vx * dt;
        planet.y += (planet.vy + Math.sin(planet.phase * 0.8) * 0.03) * dt;

        const gravity = applyGravity(
          planet.x,
          planet.y,
          planet.vx,
          planet.vy,
          dt,
          blackHoleRef.current,
          180,
          2.4,
          26,
        );
        planet.vx = gravity.vx;
        planet.vy = gravity.vy;

        const offscreen =
          planet.x < -planet.pad - 10 ||
          planet.x > width + planet.pad + 10 ||
          planet.y < -planet.pad * 0.5 ||
          planet.y > height + planet.pad * 0.5;
        if (offscreen) {
          planetsRef.current.splice(i, 1);
        }
      }

      if (now >= nextPlanetSpawnAtRef.current) {
        const activePlanets = planetsRef.current;
        const hasGasGiant = activePlanets.some((planet) => isGasGiant(planet.kind));
        const canSpawnPrimary = activePlanets.length === 0;
        const canSpawnRockyCompanion =
          activePlanets.length === 1 &&
          isRockyPlanet(activePlanets[0]!.kind) &&
          !hasGasGiant;

        if (canSpawnPrimary || canSpawnRockyCompanion) {
          const rockyOnly = canSpawnRockyCompanion;
          const kind = pickNextPlanet(previousPlanetRef.current, { rockyOnly });
          const planet = spawnPlanet(kind, width, height);

          if (canSpawnRockyCompanion) {
            const anchor = activePlanets[0]!;
            if (Math.sign(planet.vx) === Math.sign(anchor.vx)) {
              planet.vx *= -1;
              planet.x = planet.vx > 0 ? -planet.pad : width + planet.pad;
            }
            const jitter = Math.max(1.2, height * 0.08);
            planet.y = clamp(
              anchor.y + rand(-jitter, jitter),
              height * 0.14,
              Math.max(height * 0.2, height * 0.5),
            );
          }

          activePlanets.push(planet);
          previousPlanetRef.current = kind;

          nextPlanetSpawnAtRef.current = activePlanets.length >= 2
            ? now + rand(9500, 14500)
            : now + rand(3600, 7600);
        } else {
          nextPlanetSpawnAtRef.current = now + rand(900, 2400);
        }
      }

      setTick((v) => v + 1);
    }, 90);

    return () => clearInterval(timer);
  }, [width, height, frozen]);

  const rows = useMemo(
    () =>
      drawRows(
        starsRef.current,
        cometsRef.current,
        orbitersRef.current,
        cloudsRef.current,
        planetsRef.current,
        width,
        height,
        blackHoleRef.current,
      ),
    [tick, width, height],
  );

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      {rows.map((row, rowIdx) => {
        const segs: Array<{ text: string; color?: string; bold?: boolean; backgroundColor: string }> = [];
        let curText = '';
        let curColor = row[0]?.color;
        let curBold = row[0]?.bold;
        let curBg = row[0]?.backgroundColor ?? BACKGROUND;

        for (const cell of row) {
          if (cell.color === curColor && cell.bold === curBold && cell.backgroundColor === curBg) {
            curText += cell.char;
          } else {
            segs.push({
              text: curText,
              color: curColor,
              bold: curBold,
              backgroundColor: curBg,
            });
            curText = cell.char;
            curColor = cell.color;
            curBold = cell.bold;
            curBg = cell.backgroundColor;
          }
        }

        segs.push({
          text: curText,
          color: curColor,
          bold: curBold,
          backgroundColor: curBg,
        });

        return (
          <Box key={rowIdx}>
            {segs.map((seg, i) => (
              <Text key={i} color={seg.color} bold={seg.bold} backgroundColor={seg.backgroundColor}>
                {seg.text}
              </Text>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
