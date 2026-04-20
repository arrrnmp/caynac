import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { Translations } from '../i18n/index.js';

interface ErrorBoxProps {
  message: string;
  onBack?: () => void;
  t: Translations;
}

export function ErrorBox({ message, onBack, t }: ErrorBoxProps) {
  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      <Box gap={1}>
        <Text color={theme.error} backgroundColor={theme.panelBg} bold>{t.errorBoxTitle}</Text>
      </Box>
      <Text color={theme.text} backgroundColor={theme.panelBg}>{message}</Text>
      {onBack && (
        <Text color={theme.dim} backgroundColor={theme.panelBg}>
          {t.errorBoxGoBack}
        </Text>
      )}
    </Box>
  );
}
