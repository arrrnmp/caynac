import { defaultTheme, extendTheme } from '@inkjs/ui';
import { theme } from './theme.js';

export const uiTheme = extendTheme(defaultTheme, {
  components: {
    TextInput: {
      styles: {
        value: () => ({
          color: theme.text,
          backgroundColor: theme.panelBg,
        }),
      },
    },
    Select: {
      styles: {
        option: ({ isFocused }: { isFocused: boolean }) => ({
          gap: 1,
          paddingLeft: isFocused ? 0 : 2,
          backgroundColor: theme.panelBg,
        }),
        selectedIndicator: () => ({
          color: theme.success,
          backgroundColor: theme.panelBg,
        }),
        focusIndicator: () => ({
          color: theme.brand,
          backgroundColor: theme.panelBg,
        }),
        label: ({
          isFocused,
          isSelected,
        }: {
          isFocused: boolean;
          isSelected: boolean;
        }) => ({
          color: isFocused ? theme.cyan : isSelected ? theme.success : theme.text,
          backgroundColor: theme.panelBg,
        }),
        highlightedText: () => ({
          bold: true,
          backgroundColor: theme.panelBg,
        }),
      },
    },
  },
});
