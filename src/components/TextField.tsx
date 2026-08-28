import { useMemo } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/colors';

/**
 * アプリ全体で使う共通の入力欄。
 * TextInput の props はそのまま全部渡せるので、使い方は通常の <TextInput> と同じ。
 */
export default function TextField({ style, ...props }: TextInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return <TextInput placeholderTextColor={colors.textMuted} style={[styles.field, style]} {...props} />;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    field: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
  });
}
