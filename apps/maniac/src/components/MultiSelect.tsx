import React, { useState } from 'react';
import { Box, Text, useInput, type DOMElement } from 'ink';
import { theme, getAbsoluteRect, isMouseInRect, useMouse } from '@caynac/shared';

export interface SelectOption {
  id: number;
  label: string;
  sublabel?: string;
}

interface MultiSelectProps {
  options: SelectOption[];
  isActive?: boolean;
  onSubmit: (selected: number[]) => void;
}

export function MultiSelect({ options, isActive = true, onSubmit }: MultiSelectProps) {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const listRef = React.useRef<DOMElement>(null);

  useInput(
    (input, key) => {
      if (key.upArrow) {
        setCursor((c) => Math.max(0, c - 1));
      } else if (key.downArrow) {
        setCursor((c) => Math.min(options.length - 1, c + 1));
      } else if (input === ' ') {
        setSelected((prev) => {
          const next = new Set(prev);
          const id = options[cursor]!.id;
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } else if (input === 'a') {
        setSelected(new Set(options.map((o) => o.id)));
      } else if (input === 'n') {
        setSelected(new Set());
      } else if (key.return) {
        const result =
          selected.size === 0
            ? options.map((o) => o.id)
            : Array.from(selected);
        onSubmit(result);
      }
    },
    { isActive },
  );

  useMouse(
    (event) => {
      const rect = getAbsoluteRect(listRef.current);
      if (!rect || !isMouseInRect(event, rect)) return;

      const row = (event.y - 1) - rect.y;
      if (row < 0 || row >= options.length) return;

      if (event.kind === 'move') {
        setCursor(row);
        return;
      }

      if (event.kind === 'wheel') {
        if (event.wheelDirection === 'up') {
          setCursor((c) => Math.max(0, c - 1));
        } else if (event.wheelDirection === 'down') {
          setCursor((c) => Math.min(options.length - 1, c + 1));
        }
        return;
      }

      if (event.kind !== 'down' || event.button !== 'left') return;

      setCursor(row);
      setSelected((prev) => {
        const next = new Set(prev);
        const id = options[row]!.id;
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    { isActive },
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Text color={theme.dim} backgroundColor={theme.panelBg}>
        ↑↓ navigate  <Text color={theme.brand} backgroundColor={theme.panelBg}>space</Text> toggle  <Text color={theme.brand} backgroundColor={theme.panelBg}>a</Text> all  <Text color={theme.brand} backgroundColor={theme.panelBg}>n</Text> none  <Text color={theme.brand} backgroundColor={theme.panelBg}>enter</Text> confirm
      </Text>
      <Box flexDirection="column" ref={listRef}>
        {options.map((opt, i) => {
          const isCursor = i === cursor;
          const isChecked = selected.has(opt.id);
          return (
            <Box key={opt.id} gap={1}>
              <Text color={isCursor ? theme.brand : theme.dim} backgroundColor={theme.panelBg}>
                {isCursor ? '›' : ' '}
              </Text>
              <Text color={isChecked ? theme.cyan : theme.muted} backgroundColor={theme.panelBg}>
                {isChecked ? '[✓]' : '[ ]'}
              </Text>
              <Text color={isCursor ? theme.text : theme.muted} backgroundColor={theme.panelBg}>{opt.label}</Text>
              {opt.sublabel && (
                <Text color={theme.dim} backgroundColor={theme.panelBg}>{opt.sublabel}</Text>
              )}
            </Box>
          );
        })}
      </Box>
      {selected.size === 0 && (
        <Text color={theme.dim} backgroundColor={theme.panelBg} italic>
          Nothing selected — pressing enter will select all
        </Text>
      )}
    </Box>
  );
}
