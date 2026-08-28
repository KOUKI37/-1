import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/colors';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 指定すると、カード全体がタップ可能になる（履歴一覧の項目など） */
  onPress?: () => void;
  /** true にすると枠線をアクセントカラー（赤）にする */
  accent?: boolean;
};

/** 履歴一覧の各項目、種目カードなど、繰り返し使う「面」の共通コンポーネント */
export default function Card({ children, style, onPress, accent = false }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, accent && styles.cardAccent, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, accent && styles.cardAccent, style]}>{children}</View>;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 16,
      gap: 6,
    },
    cardAccent: {
      borderColor: colors.accent,
    },
    pressed: {
      opacity: 0.65,
    },
  });
}
