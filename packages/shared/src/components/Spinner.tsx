import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { theme, SPINNER_FRAMES } from '../theme.js';

interface SpinnerProps {
  label?: string;
  color?: string;
}

export function Spinner({ label, color = theme.brand }: SpinnerProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(t);
  }, []);

  const char = SPINNER_FRAMES[frame]!;

  return (
    <Text backgroundColor={theme.panelBg}>
      <Text color={color} backgroundColor={theme.panelBg}>{char}</Text>
      {label ? <Text color={theme.text} backgroundColor={theme.panelBg}> {label}</Text> : null}
    </Text>
  );
}
