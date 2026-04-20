import React from 'react';
import { Text } from 'ink';
import { theme } from '../theme.js';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'brand';

const VARIANT_COLOR: Record<BadgeVariant, string> = {
  success: theme.success,
  error:   theme.error,
  warning: theme.warning,
  info:    theme.cyan,
  brand:   theme.brand,
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: string;
}

export function Badge({ variant = 'info', children }: BadgeProps) {
  const color = VARIANT_COLOR[variant];
  return (
    <Text backgroundColor={theme.panelBg}>
      <Text color={color} backgroundColor={theme.panelBg} bold>[</Text>
      <Text color={color} backgroundColor={theme.panelBg}>{children}</Text>
      <Text color={color} backgroundColor={theme.panelBg} bold>]</Text>
    </Text>
  );
}
