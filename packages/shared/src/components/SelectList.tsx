import React, { useRef, useState } from 'react';
import { Box, Text, useInput, type DOMElement } from 'ink';
import { theme } from '../theme.js';
import { getAbsoluteRect, isMouseInRect, useMouse } from '../hooks/useMouse.js';

export interface SelectListOption {
  label: string;
  value: string;
}

interface SelectListProps {
  options: SelectListOption[];
  isActive?: boolean;
  onChange: (value: string) => void;
}

export function SelectList({ options, isActive = true, onChange }: SelectListProps) {
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<DOMElement>(null);

  useInput(
    (input, key) => {
      if (key.upArrow || input === 'k') {
        setCursor((c) => (c <= 0 ? options.length - 1 : c - 1));
        return;
      }

      if (key.downArrow || input === 'j') {
        setCursor((c) => (c >= options.length - 1 ? 0 : c + 1));
        return;
      }

if (key.return) {
      onChange(options[cursor]!.value);
    }
    },
    { isActive },
  );

  useMouse(
    (event) => {
      if (!isActive || options.length === 0) return;
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
          setCursor((c) => (c <= 0 ? options.length - 1 : c - 1));
        } else if (event.wheelDirection === 'down') {
          setCursor((c) => (c >= options.length - 1 ? 0 : c + 1));
        }
        return;
      }

if (event.kind !== 'down' || event.button !== 'left') return;

    setCursor(row);
    onChange(options[row]!.value);
    },
    { isActive },
  );

  return (
    <Box flexDirection="column" ref={listRef}>
      {options.map((option, idx) => {
        const isFocused = idx === cursor;
        return (
          <Box key={option.value} gap={1}>
            <Text color={isFocused ? theme.brand : theme.dim} backgroundColor={theme.panelBg}>
              {isFocused ? '›' : ' '}
            </Text>
            <Text
              color={isFocused ? theme.cyan : theme.text}
              backgroundColor={theme.panelBg}
            >
              {option.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
