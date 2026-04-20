import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text } from 'ink';
import { useMouse } from '../hooks/useMouse.js';

const BG = '#000000';
const EXCITE_RADIUS = 14;
const IS_WINDOWS = process.platform === 'win32';
const MATRIX_TICK_MS = IS_WINDOWS ? 130 : 90;

// Characters per layer — increasing richness toward the foreground
const CHARS_BY_LAYER = [
  '01234567890.=-+:!',
  '01234567890@#$%&|+-=<>[]{}!?',
  '01234567890ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ@#$%&|+-=<>[]{}!?',
] as const;

type LayerIdx = 0 | 1 | 2;

interface LayerCfg {
  speedMin: number;
  speedMax: number;
  colStep: number;
  colOffset: number;
  trailMin: number;
  trailMax: number;
  // shades[0] = head colour, [1..4] = trail from near to far
  shades: [string, string, string, string, string];
  shadesBright: [string, string, string, string, string];
  glitchMin: number;
  glitchMax: number;
  parallaxShift: number; // max column offset from mouse parallax
  priority: number; // base render priority (higher = front)
}

const LAYER_CFG: [LayerCfg, LayerCfg, LayerCfg] = [
  {
    // Layer 0 — background: slow, dense, very dim
    speedMin: 3, speedMax: 7,
    colStep: 2, colOffset: 0,
    trailMin: 5, trailMax: 14,
    shades: ['#1E7A28', '#155A1E', '#0F4017', '#0A2B10', '#061A0A'],
    shadesBright:['#4CD45E', '#30A040', '#1E7028', '#134818', '#0A2E10'],
    glitchMin: 350, glitchMax: 900,
    parallaxShift: 2,
    priority: 10,
  },
  {
    // Layer 1 — midground: medium speed and density
    speedMin: 9, speedMax: 18,
    colStep: 3, colOffset: 1,
    trailMin: 7, trailMax: 20,
    shades: ['#4ED658', '#2AAA38', '#1B7028', '#124818', '#0C2E10'],
    shadesBright:['#90FF9E', '#60E070', '#38A848', '#20682C', '#0E3818'],
    glitchMin: 180, glitchMax: 550,
    parallaxShift: 5,
    priority: 20,
  },
  {
    // Layer 2 — foreground: fast, sparse, bright
    speedMin: 18, speedMax: 32,
    colStep: 5, colOffset: 2,
    trailMin: 9, trailMax: 24,
    shades: ['#C7FFD3', '#57F069', '#30BB40', '#1E7C2A', '#124D1A'],
    shadesBright:['#FFFFFF', '#AFFFC0', '#70F480', '#40C050', '#208030'],
    glitchMin: 70, glitchMax: 280,
    parallaxShift: 10,
    priority: 30,
  },
];

interface Drop {
  active: boolean;
  col: number; // base column in layer-space
  head: number; // y position of head (float)
  speed: number; // cells per second
  trailLen: number;
  layer: LayerIdx;
  headChar: string;
  trailChars: string[];
  glitchAt: number;
  spawnAt: number;
}

interface Cell {
  char: string;
  color: string;
  bold: boolean;
  priority: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pickChar = (chars: string) => chars[Math.floor(Math.random() * chars.length)] ?? '0';

function dormantDrop(col: number, layer: LayerIdx, spawnAt: number): Drop {
  return {
    active: false,
    col,
    head: 0,
    speed: 0,
    trailLen: 0,
    layer,
    headChar: '0',
    trailChars: [],
    glitchAt: 0,
    spawnAt,
  };
}

function spawnDrop(drop: Drop, now: number): Drop {
  const cfg = LAYER_CFG[drop.layer];
  const chars = CHARS_BY_LAYER[drop.layer];
  const trailLen = Math.max(
    3,
    Math.floor(rand(cfg.trailMin, cfg.trailMax) * (IS_WINDOWS ? 0.7 : 1)),
  );
  return {
    ...drop,
    active: true,
    head: rand(-trailLen - 2, -1),
    speed: rand(cfg.speedMin, cfg.speedMax),
    trailLen,
    headChar: pickChar(chars),
    trailChars: Array.from({ length: trailLen }, () => pickChar(chars)),
    glitchAt: now + rand(cfg.glitchMin, cfg.glitchMax),
    spawnAt: 0,
  };
}

function initLayer(layer: LayerIdx, width: number, height: number, now: number): Drop[] {
  const cfg = LAYER_CFG[layer];
  const drops: Drop[] = [];
  for (let col = cfg.colOffset; col < width; col += cfg.colStep * (IS_WINDOWS ? 2 : 1)) {
    const dormant = dormantDrop(col, layer, now + rand(200, 3500));
    if (Math.random() < 0.6) {
      // Pre-spawn with head scattered across the visible area so the matrix
      // looks active immediately when it's first revealed.
      const spawned = spawnDrop(dormant, now);
      drops.push({ ...spawned, head: rand(0, height + spawned.trailLen) });
    } else {
      drops.push(dormant);
    }
  }
  return drops;
}

function screenCol(col: number, layer: LayerIdx, mouseX: number, width: number): number {
  const cfg = LAYER_CFG[layer];
  const norm = (mouseX - width / 2) / Math.max(1, width / 2); // −1..1
  return col + Math.round(norm * cfg.parallaxShift);
}

function buildFrame(
  drops: Drop[][],
  width: number,
  height: number,
  mouseX: number,
  mouseActive: boolean,
): Cell[][] {
  const grid: Cell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      char: ' ',
      color: BG,
      bold: false,
      priority: 0,
    })),
  );

  const place = (x: number, y: number, cell: Omit<Cell, 'priority'> & { priority: number }) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const cur = grid[y]![x]!;
    if (cell.priority <= cur.priority) return;
    grid[y]![x] = cell;
  };

  const mx = mouseActive ? mouseX : width / 2;

  const layerCount = IS_WINDOWS ? 2 : 3;
  for (let l = 0 as LayerIdx; l < layerCount; l++) {
    const layer = l as LayerIdx;
    const cfg = LAYER_CFG[layer];

    for (const drop of drops[layer]!) {
      if (!drop.active) continue;

      const sc = screenCol(drop.col, layer, mx, width);
      if (sc < 0 || sc >= width) continue;

      const excite = mouseActive
        ? Math.max(0, 1 - Math.abs(sc - mouseX) / EXCITE_RADIUS)
        : 0;
      const shades = excite > 0.3 ? cfg.shadesBright : cfg.shades;
      const headY = Math.floor(drop.head);

      if (headY >= 0 && headY < height) {
        place(sc, headY, {
          char: drop.headChar,
          color: shades[0],
          bold: layer === 2 || excite > 0.5,
          priority: cfg.priority + drop.trailLen + 5,
        });
      }

      for (let d = 1; d <= drop.trailLen; d++) {
        const ty = headY - d;
        if (ty < 0 || ty >= height) continue;

        const t = d / drop.trailLen;
        const shadeIdx = Math.min(4, Math.floor(t * 4) + 1) as 1 | 2 | 3 | 4;
        place(sc, ty, {
          char: drop.trailChars[d - 1] ?? '0',
          color: shades[shadeIdx],
          bold: false,
          priority: cfg.priority + (drop.trailLen - d),
        });
      }
    }
  }

  return grid;
}

export interface MatrixParallaxBackdropProps {
  width: number;
  height: number;
  frozen?: boolean;
}

export function MatrixParallaxBackdrop({ width, height, frozen = false }: MatrixParallaxBackdropProps) {
  const [tick, setTick] = useState(0);
  const dropsRef = useRef<Drop[][]>([[], [], []]);
  const mouseRef = useRef({ x: width / 2, active: false, lastSeen: 0 });

  useMouse((event) => {
    if (event.kind === 'move' || event.kind === 'down') {
      mouseRef.current = { x: event.x - 1, active: true, lastSeen: Date.now() };
    }
  }, { isActive: !frozen });

  useEffect(() => {
    const now = Date.now();
    dropsRef.current = [
      initLayer(0, width, height, now),
      initLayer(1, width, height, now),
      initLayer(2, width, height, now),
    ];
    setTick((v) => v + 1);
  }, [width, height]);

  useEffect(() => {
    if (frozen) return;
    let last = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.2, (now - last) / 1000);
      last = now;

      if (mouseRef.current.active && now - mouseRef.current.lastSeen > 1500) {
        mouseRef.current.active = false;
      }

      for (let l = 0; l < 3; l++) {
        const layer = l as LayerIdx;
        const cfg = LAYER_CFG[layer];
        const chars = CHARS_BY_LAYER[layer];
        const layerDrops = dropsRef.current[l]!;

        for (let i = 0; i < layerDrops.length; i++) {
          const drop = layerDrops[i]!;

          if (!drop.active) {
            if (now >= drop.spawnAt) layerDrops[i] = spawnDrop(drop, now);
            continue;
          }

          const mx = mouseRef.current.active ? mouseRef.current.x : width / 2;
          const sc = screenCol(drop.col, layer, mx, width);
          const excite = mouseRef.current.active
            ? Math.max(0, 1 - Math.abs(sc - mouseRef.current.x) / EXCITE_RADIUS)
            : 0;

          drop.head += drop.speed * (1 + excite * 2) * dt;

          if (now >= drop.glitchAt) {
            drop.headChar = pickChar(chars);
            if (drop.trailChars.length > 0) {
              drop.trailChars[Math.floor(Math.random() * drop.trailChars.length)] = pickChar(chars);
            }
            drop.glitchAt = now + rand(cfg.glitchMin, cfg.glitchMax);
          }

          if (drop.head - drop.trailLen > height + 2) {
            layerDrops[i] = dormantDrop(drop.col, layer, now + rand(300, 2800));
          }
        }
      }

      setTick((v) => v + 1);
    }, MATRIX_TICK_MS);

    return () => clearInterval(timer);
  }, [width, height, frozen]);

  const grid = useMemo(
    () =>
      buildFrame(
        dropsRef.current,
        width,
        height,
        mouseRef.current.x,
        mouseRef.current.active,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, width, height],
  );

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      {grid.map((row, rowIdx) => {
        const segs: Array<{ text: string; color: string; bold: boolean }> = [];
        let cur = { text: '', color: row[0]?.color ?? BG, bold: row[0]?.bold ?? false };

        for (const cell of row) {
          if (cell.color === cur.color && cell.bold === cur.bold) {
            cur.text += cell.char;
          } else {
            if (cur.text) segs.push({ ...cur });
            cur = { text: cell.char, color: cell.color, bold: cell.bold };
          }
        }
        if (cur.text) segs.push({ ...cur });

        return (
          <Box key={rowIdx}>
            {segs.map((seg, i) => (
              <Text key={i} color={seg.color} bold={seg.bold} backgroundColor={BG}>
                {seg.text}
              </Text>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
