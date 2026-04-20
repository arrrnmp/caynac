import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { theme } from '../theme.js';
import type { ColoredGlyph, TransitionSnapshot } from '../transition.js';

export type AnimCell = { ch: string; color: string; bold?: boolean };

export interface TransitionState {
  target: string;
  snapshot: TransitionSnapshot;
  startedAt: number;
  progress: number;
  frame: number;
}

export interface UseScreenTransitionOptions {
  transitionMs?: number;
}

export interface UseScreenTransitionReturn {
  transition: TransitionState | null;
  startTransition: (target: string, snapshot: TransitionSnapshot) => void;
  clearTransition: () => void;
}

const DEFAULT_TRANSITION_MS = 520;

export function useScreenTransition(options: UseScreenTransitionOptions = {}): UseScreenTransitionReturn {
  const { transitionMs = DEFAULT_TRANSITION_MS } = options;
  const [transition, setTransition] = useState<TransitionState | null>(null);

  const startTransition = useCallback((target: string, snapshot: TransitionSnapshot) => {
    setTransition({
      target,
      snapshot,
      startedAt: Date.now(),
      progress: 0,
      frame: 0,
    });
  }, []);

  const clearTransition = useCallback(() => {
    setTransition(null);
  }, []);

  useEffect(() => {
    if (!transition) return;
    const startedAt = transition.startedAt;

    const tick = setInterval(() => {
      setTransition((prev) => {
        if (!prev || prev.startedAt !== startedAt) return prev;
        const elapsed = Date.now() - startedAt;
        return {
          ...prev,
          frame: prev.frame + 1,
          progress: Math.min(1, elapsed / transitionMs),
        };
      });
    }, 24);

    return () => {
      clearInterval(tick);
    };
  }, [transition?.startedAt, transition?.target, transitionMs]);

  return { transition, startTransition, clearTransition };
}

// Animation utilities
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Helper: build colored glyphs from text
export const cg = (text: string, color: string, bold?: boolean): ColoredGlyph[] =>
  [...text].map((ch) => ({ ch, color, bold }));

export interface BuildGravitationOptions {
  width: number;
  height: number;
  transition: TransitionState;
  targetSnapshot: TransitionSnapshot;
  sourceDotChar?: string;
  targetDotChar?: string;
}

export function buildGravitationRows(options: BuildGravitationOptions): AnimCell[][] {
  const { width, height, transition, targetSnapshot, sourceDotChar = '•', targetDotChar = '•' } = options;
  const w = Math.max(8, width);
  const h = Math.max(6, height);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const grid: (AnimCell | null)[][] = Array.from({ length: h }, () => Array(w).fill(null));

  const place = (x: number, y: number, cell: AnimCell) => {
    if (cell.ch === ' ') return;
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (yi < 0 || yi >= h || xi < 0 || xi >= w) return;
    grid[yi]![xi] = cell;
  };

  // Source glyphs - carry their snapshot colors
  const sourceGlyphs: Array<{ cell: AnimCell; x: number; y: number; i: number }> = [];
  let glyphIndex = 0;
  for (let gy = 0; gy < transition.snapshot.rows.length; gy++) {
    const row = transition.snapshot.rows[gy]!;
    let gx = 0;
    for (const glyph of row) {
      if (glyph.ch !== ' ') {
        sourceGlyphs.push({
          cell: { ch: glyph.ch, color: glyph.color, bold: glyph.bold },
          x: gx + 2,
          y: gy + 1,
          i: glyphIndex++,
        });
      }
      gx++;
    }
  }

  // Target glyphs - carry arrival colors
  const targetGlyphs: Array<{ cell: AnimCell; x: number; y: number; i: number }> = [];
  glyphIndex = 0;
  for (let gy = 0; gy < targetSnapshot.rows.length; gy++) {
    const row = targetSnapshot.rows[gy]!;
    let gx = 0;
    for (const glyph of row) {
      if (glyph.ch !== ' ') {
        targetGlyphs.push({
          cell: { ch: glyph.ch, color: glyph.color, bold: glyph.bold },
          x: gx + 2,
          y: gy + 1,
          i: glyphIndex++,
        });
      }
      gx++;
    }
  }

  const collapseT = easeInOutCubic(clamp01(transition.progress / 0.64));
  for (const { cell, x, y, i } of sourceGlyphs) {
    const wobble = (1 - collapseT) * (0.7 + (i % 3) * 0.45);
    const angle = transition.frame * 0.27 + i * 0.14;
    place(
      lerp(x, cx, collapseT) + Math.cos(angle) * wobble,
      lerp(y, cy, collapseT) + Math.sin(angle) * wobble * 0.7,
      cell,
    );
  }

  const buildT = easeInOutCubic(clamp01((transition.progress - 0.18) / 0.82));
  for (const { cell, x, y, i } of targetGlyphs) {
    const wobble = (1 - buildT) * (0.6 + (i % 4) * 0.4);
    const angle = -transition.frame * 0.3 - i * 0.18;
    place(
      lerp(cx, x, buildT) + Math.cos(angle) * wobble,
      lerp(cy, y, buildT) + Math.sin(angle) * wobble * 0.65,
      cell,
    );
  }

  if (transition.progress < 0.9) {
    const radius = Math.max(1, (1 - transition.progress) * 2.8);
    const dot: AnimCell = { ch: sourceDotChar, color: theme.brand };
    place(cx + Math.cos(transition.frame * 0.5) * radius, cy + Math.sin(transition.frame * 0.5) * radius * 0.55, dot);
    place(
      cx + Math.cos(transition.frame * 0.5 + Math.PI) * radius,
      cy + Math.sin(transition.frame * 0.5 + Math.PI) * radius * 0.55,
      dot,
    );
  }

  // Fill null cells with panelBg
  return grid.map((row) => row.map((cell) => cell ?? { ch: ' ', color: theme.panelBg }));
}

export function groupByColor(row: AnimCell[]): Array<{ text: string; color: string; bold?: boolean }> {
  const spans: Array<{ text: string; color: string; bold?: boolean }> = [];
  for (const cell of row) {
    const last = spans[spans.length - 1];
    if (last && last.color === cell.color && Boolean(last.bold) === Boolean(cell.bold)) {
      last.text += cell.ch;
    } else {
      spans.push({ text: cell.ch, color: cell.color, bold: cell.bold });
    }
  }
  return spans;
}

// Backdrop wipe animation hook
export type BackdropKind = 'matrix' | 'starfield';

export interface BackdropWipeState {
  from: BackdropKind;
  to: BackdropKind;
  startedAt: number;
  progress: number;
}

export interface UseBackdropWipeOptions {
  wipeMs?: number;
}

export interface UseBackdropWipeReturn {
  backdropWipe: BackdropWipeState | null;
  wipeT: number;
  startBackdropWipe: (from: BackdropKind, to: BackdropKind) => void;
}

const DEFAULT_WIPE_MS = 1200;

export function useBackdropWipe(options: UseBackdropWipeOptions = {}): UseBackdropWipeReturn {
  const { wipeMs = DEFAULT_WIPE_MS } = options;
  const [backdropWipe, setBackdropWipe] = useState<BackdropWipeState | null>(null);
  const prevBackdropRef = useRef<BackdropKind>('starfield');

  const startBackdropWipe = (from: BackdropKind, to: BackdropKind) => {
    setBackdropWipe({ from, to, startedAt: Date.now(), progress: 0 });
  };

  useEffect(() => {
    if (!backdropWipe) return;
    const startedAt = backdropWipe.startedAt;
    const tick = setInterval(() => {
      setBackdropWipe((prev) => {
        if (!prev || prev.startedAt !== startedAt) return prev;
        return { ...prev, progress: Math.min(1, (Date.now() - startedAt) / wipeMs) };
      });
    }, 30);
    const finish = setTimeout(() => setBackdropWipe(null), wipeMs + 32);
    return () => {
      clearInterval(tick);
      clearTimeout(finish);
    };
  }, [backdropWipe?.startedAt, wipeMs]);

  const wipeT = backdropWipe
    ? easeInOutCubic(backdropWipe.progress < 0.5 ? backdropWipe.progress * 2 : (1 - backdropWipe.progress) * 2)
    : 0;

  return { backdropWipe, wipeT, startBackdropWipe };
}

// Onboarding outro animation hook
export interface OnboardingOutroState {
  startedAt: number;
  progress: number;
}

export interface UseOnboardingOutroOptions {
  outroMs?: number;
}

export interface UseOnboardingOutroReturn {
  onboardingOutro: OnboardingOutroState | null;
  startOnboardingOutro: () => void;
  clearOnboardingOutro: () => void;
  onboardingFadeOutT: number;
  onboardingFadeInT: number;
}

const DEFAULT_OUTRO_MS = 1080;

export function useOnboardingOutro(options: UseOnboardingOutroOptions = {}): UseOnboardingOutroReturn {
  const { outroMs = DEFAULT_OUTRO_MS } = options;
  const [onboardingOutro, setOnboardingOutro] = useState<OnboardingOutroState | null>(null);

  const startOnboardingOutro = () => {
    setOnboardingOutro({ startedAt: Date.now(), progress: 0 });
  };

  const clearOnboardingOutro = () => {
    setOnboardingOutro(null);
  };

  useEffect(() => {
    if (!onboardingOutro) return;
    const startedAt = onboardingOutro.startedAt;

    const tick = setInterval(() => {
      setOnboardingOutro((prev) => {
        if (!prev || prev.startedAt !== startedAt) return prev;
        const elapsed = Date.now() - startedAt;
        return { ...prev, progress: Math.min(1, elapsed / outroMs) };
      });
    }, 24);

    const finish = setTimeout(() => {
      setOnboardingOutro(null);
    }, outroMs);

    return () => {
      clearInterval(tick);
      clearTimeout(finish);
    };
  }, [onboardingOutro?.startedAt, outroMs]);

  const onboardingFadeOutT = onboardingOutro ? clamp01(onboardingOutro.progress / 0.58) : 0;
  const onboardingFadeInT = onboardingOutro ? clamp01((onboardingOutro.progress - 0.58) / 0.42) : 0;

  return {
    onboardingOutro,
    startOnboardingOutro,
    clearOnboardingOutro,
    onboardingFadeOutT,
    onboardingFadeInT,
  };
}
