import React from 'react';
import { Text } from 'ink';
import { theme } from '../theme.js';

interface DividerProps {
  width?: number;
  color?: string;
}

export function Divider({ width = 51, color = theme.dim }: DividerProps) {
  return <Text color={color} backgroundColor={theme.panelBg}>{'─'.repeat(width)}</Text>;
}
