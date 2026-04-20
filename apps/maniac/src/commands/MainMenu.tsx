import { BaseMenu, createMenuTransitionSnapshot, type MenuOption, type Translations } from '@caynac/shared';
import type { TransitionSnapshot } from '@caynac/shared';

export type MenuChoice = 'debrid' | 'compress' | 'decompress' | 'picocrypt' | 'onboarding' | 'language' | 'exit';
export type { TransitionSnapshot as MenuTransitionSnapshot } from '@caynac/shared';

interface MainMenuProps {
  onSelect: (choice: MenuChoice, snapshot: TransitionSnapshot) => void;
  t: Translations;
  registerSnapshot?: (fn: () => TransitionSnapshot) => void;
}

export function createMenuSnapshot(t: Translations, cursor: number): TransitionSnapshot {
  const options: MenuOption<MenuChoice>[] = [
    { value: 'debrid', hotkey: '1', label: t.realDebrid, desc: t.realDebridDesc },
    { value: 'compress', hotkey: '2', label: t.compressor, desc: t.compressorDesc },
    { value: 'decompress', hotkey: '3', label: t.decompressor, desc: t.decompressorDesc },
    { value: 'picocrypt', hotkey: '4', label: t.picocrypt, desc: t.picocryptDesc },
    { value: 'onboarding', hotkey: '5', label: t.onboarding, desc: t.onboardingDesc },
    { value: 'language', hotkey: '6', label: t.language, desc: t.languageDesc },
    { value: 'exit', hotkey: '7', label: t.exit, desc: t.exitManiac },
  ];
  return createMenuTransitionSnapshot(
    `MANIAC ${t.menuTitle}`,
    `1-7 ${t.menuSubtitle}`,
    options,
    cursor,
    '▸'
  );
}

export function MainMenu({ onSelect, t, registerSnapshot }: MainMenuProps) {
  const MENU_OPTIONS: ReadonlyArray<MenuOption<MenuChoice>> = [
    { value: 'debrid', hotkey: '1', label: t.realDebrid, desc: t.realDebridDesc },
    { value: 'compress', hotkey: '2', label: t.compressor, desc: t.compressorDesc },
    { value: 'decompress', hotkey: '3', label: t.decompressor, desc: t.decompressorDesc },
    { value: 'picocrypt', hotkey: '4', label: t.picocrypt, desc: t.picocryptDesc },
    { value: 'onboarding', hotkey: '5', label: t.onboarding, desc: t.onboardingDesc },
    { value: 'language', hotkey: '6', label: t.language, desc: t.languageDesc },
    { value: 'exit', hotkey: '7', label: t.exit, desc: t.exitManiac },
  ];

  return (
    <BaseMenu
      title={`MANIAC ${t.menuTitle}`}
      subtitle={`1-7 ${t.menuSubtitle}`}
      options={MENU_OPTIONS}
      onSelect={onSelect}
      exitValue="exit"
      cursorChar="▸"
      registerSnapshot={registerSnapshot}
    />
  );
}
