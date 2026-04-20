export { theme, SPINNER_FRAMES, BLOCK_FULL, BLOCK_EMPTY } from './theme.js';
export type { ColoredGlyph, TransitionSnapshot, MenuTransitionSnapshot } from './transition.js';
export { uiTheme } from './uiTheme.js';

export type { Language, Translations } from './i18n/index.js';
export { getTranslations, getDefaultLanguage, isValidLanguage } from './i18n/index.js';

export { useMouse, getAbsoluteRect, isMouseInRect } from './hooks/useMouse.js';
export type { MouseEvent, Rect } from './hooks/useMouse.js';
export {
  useScreenTransition,
  useBackdropWipe,
  useOnboardingOutro,
  buildGravitationRows,
  groupByColor,
  lerp,
  clamp01,
  easeInOutCubic,
  cg,
} from './hooks/useScreenTransition.js';
export { cg as createColoredGlyphs } from './hooks/useScreenTransition.js';
export type {
  TransitionState,
  AnimCell,
  BackdropKind,
  BackdropWipeState,
  OnboardingOutroState,
  UseScreenTransitionOptions,
  UseScreenTransitionReturn,
  UseBackdropWipeOptions,
  UseBackdropWipeReturn,
  UseOnboardingOutroOptions,
  UseOnboardingOutroReturn,
  BuildGravitationOptions,
} from './hooks/useScreenTransition.js';

export { StarfieldBackdrop } from './components/StarfieldBackdrop.js';
export { Spinner } from './components/Spinner.js';
export { ProgressBar } from './components/ProgressBar.js';
export { Badge } from './components/Badge.js';
export { Divider } from './components/Divider.js';
export { ErrorBox } from './components/ErrorBox.js';
export { PasswordInput } from './components/PasswordInput.js';
export { SelectList } from './components/SelectList.js';
export { Header } from './components/Header.js';
export { MatrixParallaxBackdrop } from './components/MatrixParallaxBackdrop.js';
export { GoodbyeOverlay, GOODBYE_TOTAL_MS } from './components/GoodbyeOverlay.js';
export { BaseMenu, createMenuTransitionSnapshot } from './components/BaseMenu.js';
export type { MenuOption, BaseMenuProps } from './components/BaseMenu.js';
export { LanguageMenu, createLanguageMenuSnapshot } from './components/LanguageMenu.js';
export type { LanguageMenuProps, LanguageOption } from './components/LanguageMenu.js';

export { DecompressCommand } from './commands/decompress/index.js';
export { PicocryptDecryptCommand } from './commands/picocrypt-decrypt/index.js';
export { OnboardingCommand } from './commands/onboarding/index.js';

export { compressFiles, extractFiles, findArchiveParts } from './utils/compression.js';
export type { CompressionOptions, CompressionAlgo } from './utils/compression.js';
export { runPicocrypt } from './utils/picocrypt.js';
export type { PicocryptOptions } from './utils/picocrypt.js';

export {
  checkDependencies,
  installSevenZip,
  installPicocrypt,
  detectSevenZipPath,
  detectPicocryptPath,
  runCommand,
  findCommandOnPath,
  trimLine,
  findFirstLine,
  configuredBinary,
  platformLabel,
} from './utils/dependencies.js';
export type {
  DependencyId,
  DependencyStatus,
  DependencyCheckResult,
  GitHubRelease,
  GitHubReleaseAsset,
  CommandResult,
} from './utils/dependencies.js';
