import React from 'react';
import { Box, Text } from 'ink';
import { theme, BLOCK_FULL, BLOCK_EMPTY } from '../theme.js';

interface ProgressBarProps {
  value: number;   // 0–100
  width?: number;
  label?: string;
  sublabel?: string;
}

export function ProgressBar({ value, width = 36, label, sublabel }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;

  return (
    <Box flexDirection="column" gap={0}>
      {label && (
        <Box gap={1}>
          <Text color={theme.muted} backgroundColor={theme.panelBg}>{label}</Text>
          {sublabel && <Text color={theme.dim} backgroundColor={theme.panelBg}>{sublabel}</Text>}
        </Box>
      )}
      <Box gap={1}>
        <Text backgroundColor={theme.panelBg}>
          <Text color={theme.brand} backgroundColor={theme.panelBg}>{BLOCK_FULL.repeat(filled)}</Text>
          <Text color={theme.dim} backgroundColor={theme.panelBg}>{BLOCK_EMPTY.repeat(empty)}</Text>
        </Text>
        <Text color={theme.cyan} backgroundColor={theme.panelBg} bold>
          {clamped.toFixed(1)}%
        </Text>
      </Box>
    </Box>
  );
}
