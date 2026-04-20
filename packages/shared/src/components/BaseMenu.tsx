import React, { useState } from 'react';
import { Box, Text, useInput, type DOMElement } from 'ink';
import { theme, BLOCK_FULL, getAbsoluteRect, isMouseInRect, useMouse } from '../index.js';
import type { ColoredGlyph, TransitionSnapshot } from '../transition.js';

export interface MenuOption<T extends string = string> {
  value: T;
  hotkey: string;
  label: string;
  desc: string;
}

export interface BaseMenuProps<T extends string = string> {
  /** Menu title displayed at the top */
  title: string;
  /** Subtitle/hint text displayed below the title */
  subtitle: string;
  /** Menu options to display */
  options: ReadonlyArray<MenuOption<T>>;
  /** Callback when an option is selected */
  onSelect: (choice: T, snapshot: TransitionSnapshot) => void;
  /** Custom exit option (defaults to last option if not provided) */
  exitValue?: T;
  /** Whether hotkey matching should be case-insensitive */
  caseInsensitiveHotkeys?: boolean;
  /** Custom cursor character */
  cursorChar?: string;
  /** Register a live snapshot builder for external transitions/effects */
  registerSnapshot?: (fn: () => TransitionSnapshot) => void;
}

const cg = (text: string, color: string, bold?: boolean): ColoredGlyph[] =>
  [...text].map((ch) => ({ ch, color, bold }));

export function createMenuTransitionSnapshot<T extends string>(
  title: string,
  subtitle: string,
  options: ReadonlyArray<MenuOption<T>>,
  cursor: number,
  cursorChar: string = '▸',
): TransitionSnapshot {
  const selected = options[cursor] ?? options[0];
  if (!selected) return { rows: [] };

  return {
    rows: [
      cg(title, theme.title, true),
      cg(subtitle, theme.muted),
      [],
      ...options.map((option, idx) => {
        const sel = idx === cursor;
        return cg(`${sel ? cursorChar : ' '} ${option.hotkey}. ${option.label}`, sel ? theme.cyan : theme.text, sel);
      }),
      [],
      cg(`Selected: ${selected.label}`, theme.title, true),
      cg(selected.desc, theme.muted),
      [],
      cg('Esc to quit', theme.dim),
    ],
  };
}

export function BaseMenu<T extends string = string>({
  title,
  subtitle,
  options,
  onSelect,
  exitValue,
  caseInsensitiveHotkeys = false,
  cursorChar = '▸',
  registerSnapshot,
}: BaseMenuProps<T>) {
  const [cursor, setCursor] = useState(0);
  const optionsRef = React.useRef<DOMElement>(null);
  const selected = options[cursor];
  const fillRow = BLOCK_FULL.repeat(220);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setCursor((c) => (c <= 0 ? options.length - 1 : c - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setCursor((c) => (c >= options.length - 1 ? 0 : c + 1));
      return;
    }

    if (key.return && selected) {
      onSelect(selected.value, createMenuTransitionSnapshot(title, subtitle, options, cursor, cursorChar));
      return;
    }

    const idx = options.findIndex((o) => {
      if (caseInsensitiveHotkeys) {
        return o.hotkey.toLowerCase() === input.toLowerCase();
      }
      return o.hotkey === input;
    });
    if (idx >= 0) {
      onSelect(options[idx]!.value, createMenuTransitionSnapshot(title, subtitle, options, idx, cursorChar));
    }
  });

  useMouse((event) => {
    const rect = getAbsoluteRect(optionsRef.current);
    if (!rect || !isMouseInRect(event, rect)) return;

    const row = (event.y - 1) - rect.y;
    if (row < 0 || row >= options.length) return;

    if (event.kind === 'move') {
      setCursor(row);
      return;
    }

    if (event.kind === 'wheel') {
      if (event.wheelDirection === 'up') {
        setCursor((c) => (c <= 0 ? options.length - 1 : c - 1));
      } else if (event.wheelDirection === 'down') {
        setCursor((c) => (c >= options.length - 1 ? 0 : c + 1));
      }
      return;
    }

    if (event.kind !== 'down' || event.button !== 'left') return;

    const choice = options[row];
    if (!choice) return;
    setCursor(row);
    onSelect(choice.value, createMenuTransitionSnapshot(title, subtitle, options, row, cursorChar));
  });

  React.useEffect(() => {
    if (!registerSnapshot) return;
    registerSnapshot(() => createMenuTransitionSnapshot(title, subtitle, options, cursor, cursorChar));
  }, [cursor, cursorChar, options, registerSnapshot, subtitle, title]);

  return (
    <Box width="100%" height="100%" overflow="hidden">
      <Box position="absolute" width="100%" height="100%" overflow="hidden">
        {Array.from({ length: 36 }, (_, i) => (
          <Text key={`menu-fill-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
            {fillRow}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" width="100%" height="100%" paddingX={2} paddingY={1} gap={1}>
        <Text color={theme.title} backgroundColor={theme.panelBg} bold>{title}</Text>
        <Text color={theme.muted} backgroundColor={theme.panelBg}>
          {subtitle}
        </Text>

        <Box flexDirection="column" marginTop={1} ref={optionsRef}>
          {options.map((option, idx) => {
            const isSelected = idx === cursor;
            return (
              <Text
                key={option.value}
                color={isSelected ? theme.cyan : theme.text}
                backgroundColor={theme.panelBg}
                bold={isSelected}
              >
                {isSelected ? cursorChar : ' '} {option.hotkey}. {option.label}
              </Text>
            );
          })}
        </Box>

        {selected && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.title} backgroundColor={theme.panelBg} bold>Selected: {selected.label}</Text>
            <Text color={theme.muted} backgroundColor={theme.panelBg}>{selected.desc}</Text>
          </Box>
        )}

        <Text color={theme.dim} backgroundColor={theme.panelBg}>Esc to quit</Text>
      </Box>
    </Box>
  );
}
