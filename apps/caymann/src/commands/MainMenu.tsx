import { BaseMenu, createMenuTransitionSnapshot, type MenuOption, type Translations } from '@caynac/shared';
import type { TransitionSnapshot } from '@caynac/shared';

export type MenuChoice = 'decrypt' | 'decompress' | 'onboarding' | 'language' | 'exit';
export type { TransitionSnapshot as MenuTransitionSnapshot } from '@caynac/shared';

interface MainMenuProps {
  onSelect: (choice: MenuChoice, snapshot: TransitionSnapshot) => void;
  t: Translations;
  registerSnapshot?: (fn: () => TransitionSnapshot) => void;
}

export function createMenuSnapshot(t: Translations, cursor: number): TransitionSnapshot {
  const options: MenuOption<MenuChoice>[] = [
    { value: 'decrypt', hotkey: 'D', label: t.decrypt, desc: t.decryptDesc },
    { value: 'decompress', hotkey: 'X', label: t.decompress, desc: t.decompressDesc },
    { value: 'onboarding', hotkey: 'O', label: t.onboarding, desc: t.onboardingDesc },
    { value: 'language', hotkey: 'L', label: t.language, desc: t.languageDesc },
    { value: 'exit', hotkey: 'Q', label: t.quit, desc: t.quitDesc },
  ];
  return createMenuTransitionSnapshot(
    `CAYMANN ${t.menuTitle}`,
    'D/X/O/L/Q ' + t.menuSubtitle.replace('1-6', '').replace('1-7', ''),
    options,
    cursor,
    '>'
  );
}

export function MainMenu({ onSelect, t, registerSnapshot }: MainMenuProps) {
  const MENU_OPTIONS: ReadonlyArray<MenuOption<MenuChoice>> = [
    { value: 'decrypt', hotkey: 'D', label: t.decrypt, desc: t.decryptDesc },
    { value: 'decompress', hotkey: 'X', label: t.decompress, desc: t.decompressDesc },
    { value: 'onboarding', hotkey: 'O', label: t.onboarding, desc: t.onboardingDesc },
    { value: 'language', hotkey: 'L', label: t.language, desc: t.languageDesc },
    { value: 'exit', hotkey: 'Q', label: t.quit, desc: t.quitDesc },
  ];

  return (
    <BaseMenu
      title={`CAYMANN ${t.menuTitle}`}
      subtitle={'D/X/O/L/Q ' + t.menuSubtitle.replace('1-6', '').replace('1-7', '')}
      options={MENU_OPTIONS}
      onSelect={onSelect}
      exitValue="exit"
      caseInsensitiveHotkeys={true}
      cursorChar=">"
      registerSnapshot={registerSnapshot}
    />
  );
}
