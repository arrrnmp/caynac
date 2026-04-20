import React, { useState } from 'react';
import { Box, Text, useInput, type DOMElement } from 'ink';
import { theme, BLOCK_FULL, getAbsoluteRect, isMouseInRect, useMouse } from '../index.js';
import type { ColoredGlyph, TransitionSnapshot } from '../transition.js';
import type { Language, Translations } from '../i18n/index.js';
import { getTranslations } from '../i18n/index.js';

export interface LanguageOption {
  value: Language;
  label: string;
}

export interface LanguageMenuProps {
  currentLanguage: Language;
  onSelect: (language: Language, snapshot: TransitionSnapshot) => void;
  onBack: () => void;
  t: Translations;
  registerSnapshot?: (fn: () => TransitionSnapshot) => void;
}

const cg = (text: string, color: string, bold?: boolean): ColoredGlyph[] =>
  [...text].map((ch) => ({ ch, color, bold }));

export function createLanguageMenuSnapshot(
  t: Translations,
  options: ReadonlyArray<LanguageOption>,
  cursor: number,
): TransitionSnapshot {
  const selected = options[cursor] ?? options[0];
  if (!selected) return { rows: [] };

  return {
    rows: [
      cg(t.languageTitle, theme.title, true),
      cg(t.languageSubtitle, theme.muted),
      [],
      ...options.map((option, idx) => {
        const sel = idx === cursor;
        return cg(`${sel ? '▸' : ' '} ${option.label}`, sel ? theme.cyan : theme.text, sel);
      }),
      [],
      cg(`${t.selected}: ${selected.label}`, theme.title, true),
      [],
      cg(t.escToQuit, theme.dim),
    ],
  };
}

export function LanguageMenu({ currentLanguage, onSelect, onBack, t, registerSnapshot }: LanguageMenuProps) {
  const options: LanguageOption[] = [
    { value: 'es', label: t.spanish },
    { value: 'en', label: t.english },
  ];

  const initialCursor = options.findIndex((o) => o.value === currentLanguage);
  const [cursor, setCursor] = useState(initialCursor >= 0 ? initialCursor : 0);
  const optionsRef = React.useRef<DOMElement>(null);
  const selected = options[cursor];
  const fillRow = BLOCK_FULL.repeat(220);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    if (key.upArrow || input === 'k') {
      setCursor((c) => (c <= 0 ? options.length - 1 : c - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setCursor((c) => (c >= options.length - 1 ? 0 : c + 1));
      return;
    }

    if (key.return && selected) {
      onSelect(selected.value, createLanguageMenuSnapshot(t, options, cursor));
      return;
    }

    // Quick select by first letter
    const idx = options.findIndex((o) => o.value === input.toLowerCase());
    if (idx >= 0) {
      onSelect(options[idx]!.value, createLanguageMenuSnapshot(t, options, idx));
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
    onSelect(choice.value, createLanguageMenuSnapshot(t, options, row));
  });

  React.useEffect(() => {
    if (!registerSnapshot) return;
    registerSnapshot(() => createLanguageMenuSnapshot(t, options, cursor));
  }, [cursor, options, registerSnapshot, t]);

  return (
    <Box width="100%" height="100%" overflow="hidden">
      <Box position="absolute" width="100%" height="100%" overflow="hidden">
        {Array.from({ length: 36 }, (_, i) => (
          <Text key={`lang-menu-fill-${i}`} color={theme.panelBg} backgroundColor={theme.panelBg}>
            {fillRow}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" width="100%" height="100%" paddingX={2} paddingY={1} gap={1}>
        <Text color={theme.title} backgroundColor={theme.panelBg} bold>{t.languageTitle}</Text>
        <Text color={theme.muted} backgroundColor={theme.panelBg}>
          {t.languageSubtitle}
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
                {isSelected ? '▸' : ' '} {option.label}
              </Text>
            );
          })}
        </Box>

        {selected && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.title} backgroundColor={theme.panelBg} bold>
              {t.selected}: {selected.label}
            </Text>
          </Box>
        )}

        <Text color={theme.dim} backgroundColor={theme.panelBg}>{t.escToQuit}</Text>
      </Box>
    </Box>
  );
}
