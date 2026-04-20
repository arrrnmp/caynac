import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';

const DEFAULT_LOGO_COLORS = [
  '#FF5A52',
  '#FF6A46',
  '#FF7C3A',
  '#FF9142',
  '#FFAD4A',
] as const;

const HEADER_BG = theme.bg;

export interface HeaderProps {
  /** ASCII art logo lines */
  logo: readonly string[];
  /** Tagline displayed below the logo */
  tagline: string;
  /** Optional custom gradient colors for the logo. Defaults to warm orange/red gradient. */
  logoColors?: readonly string[];
  /** Center the header horizontally */
  centered?: boolean;
  /** Top margin offset in lines */
  topOffset?: number;
}

export function Header({
  logo,
  tagline,
  logoColors = DEFAULT_LOGO_COLORS,
  centered = false,
  topOffset = 0,
}: HeaderProps) {
  const logoWidth = Math.max(...logo.map((l) => l.length));

  const pad = (s: string) => s.padEnd(logoWidth, ' ');

  const block = (
    <Box flexDirection="column">
      <Text color={theme.panelBorderSoft} backgroundColor={HEADER_BG}>{'─'.repeat(logoWidth)}</Text>
      {logo.map((line, row) => (
        <Text
          key={row}
          color={logoColors[row % logoColors.length]}
          backgroundColor={HEADER_BG}
          bold
        >
          {pad(line)}
        </Text>
      ))}
      <Text color={theme.panelBorderSoft} backgroundColor={HEADER_BG}>{'─'.repeat(logoWidth)}</Text>
      <Text color={theme.muted} backgroundColor={HEADER_BG}>{pad(tagline)}</Text>
    </Box>
  );

  if (!centered && topOffset === 0) return block;

  return (
    <Box width="100%" justifyContent={centered ? 'center' : 'flex-start'} marginTop={topOffset}>
      {block}
    </Box>
  );
}
