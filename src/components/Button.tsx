import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/colors';

export type ButtonVariant = 'primary' | 'outline' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  /**
   * primary: 赤の塗りつぶし。「保存」「コピー」など主要な操作専用
   * outline: 赤の枠線。次点の操作（「編集する」など）
   * danger:  赤系だが枠線のみ・トーンも別。「削除する」など破壊的な操作専用
   */
  variant?: ButtonVariant;
  disabled?: boolean;
  /** 横並びで幅を揃えたい場合などに { flex: 1 } などを渡す */
  style?: StyleProp<ViewStyle>;
};

/** アプリ全体で使う共通ボタン。色は useTheme() から取るので呼び出し側で指定しない */
export default function Button({ label, onPress, variant = 'primary', disabled = false, style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      borderRadius: 8,
      paddingVertical: 15,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.7,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      fontSize: 16,
      fontWeight: '700',
    },
    primary: {
      backgroundColor: colors.accent,
    },
    primaryLabel: {
      color: colors.accentText,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    outlineLabel: {
      color: colors.accent,
    },
    danger: {
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    dangerLabel: {
      color: colors.danger,
    },
  });
}
