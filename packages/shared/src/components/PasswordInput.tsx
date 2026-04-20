import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';

interface PasswordInputProps {
  placeholder?: string;
  label?: string;
  isActive?: boolean;
  onSubmit: (value: string) => void;
}

export function PasswordInput({
  placeholder = 'Enter password…',
  label,
  isActive = true,
  onSubmit,
}: PasswordInputProps) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useInput(
    (input, key) => {
      if (submitted) return;

      if (key.return) {
        setSubmitted(true);
        onSubmit(value);
        return;
      }

      if (key.backspace || key.delete) {
        setValue((v) => v.slice(0, -1));
        return;
      }

      if (!key.ctrl && !key.escape && !key.tab && input) {
        setValue((v) => v + input);
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column" gap={0}>
      {label && <Text color={theme.muted} backgroundColor={theme.panelBg}>{label}</Text>}
      <Box gap={1}>
        <Text color={theme.brand} backgroundColor={theme.panelBg}>›</Text>
        <Text backgroundColor={theme.panelBg}>
          {value.length > 0 ? (
            <Text color={theme.text} backgroundColor={theme.panelBg}>{'•'.repeat(value.length)}</Text>
          ) : (
            <Text color={theme.dim} backgroundColor={theme.panelBg}>{placeholder}</Text>
          )}
          {isActive && !submitted && <Text color={theme.brand} backgroundColor={theme.panelBg}>▌</Text>}
        </Text>
      </Box>
    </Box>
  );
}
