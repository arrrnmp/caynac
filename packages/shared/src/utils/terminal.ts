export function isWezTermTerminal(env: NodeJS.ProcessEnv = process.env): boolean {
  const termProgram = env.TERM_PROGRAM?.toLowerCase();
  return (
    termProgram === 'wezterm' ||
    Boolean(env.WEZTERM_EXECUTABLE) ||
    Boolean(env.WEZTERM_PANE)
  );
}

export function isWindowsReducedEffects(env: NodeJS.ProcessEnv = process.env): boolean {
  return process.platform === 'win32' && !isWezTermTerminal(env);
}
