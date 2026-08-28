import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '../src/theme/colors';
import { useTheme, type ThemePreference } from '../src/theme/ThemeProvider';

const PREFERENCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: '端末設定' },
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
];

/** 設定画面。今のところ外観（ダーク/ライト）の切り替えのみ。 */
export default function SettingsScreen() {
  const router = useRouter();
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>外観</Text>
      <View style={styles.card}>
        <Text style={styles.rowLabel}>ダーク / ライトモード</Text>
        <View style={styles.segmentRow}>
          {PREFERENCE_OPTIONS.map((opt) => {
            const active = preference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPreference(opt.value)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.rowHint}>
          「端末設定」を選ぶと、スマホ本体のダーク/ライト設定に自動で合わせる。選んだ内容は次回アプリを開いたときも引き継がれる。
        </Text>
      </View>

      <Text style={styles.sectionTitle}>開発用</Text>
      <Pressable style={styles.linkRow} onPress={() => router.push('/theme-preview')}>
        <Text style={styles.linkText}>🎨 デザイン確認（共通スタイルのサンプル）</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 48,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 16,
      gap: 10,
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
    },
    segmentActive: {
      backgroundColor: colors.accent,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: colors.accentText,
    },
    rowHint: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 18,
    },
    linkRow: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 14,
    },
    linkText: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });
}
