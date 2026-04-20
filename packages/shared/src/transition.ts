export interface ColoredGlyph {
  ch: string;
  color: string;
  bold?: boolean;
}

export interface TransitionSnapshot {
  rows: ColoredGlyph[][];
}

/** Backward-compat alias used by MainMenu. */
export type MenuTransitionSnapshot = TransitionSnapshot;
