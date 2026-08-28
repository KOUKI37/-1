import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '../src/components/Button';
import Card from '../src/components/Card';
import TextField from '../src/components/TextField';
import type { ThemeColors } from '../src/theme/colors';
import { useTheme, type ThemePreference } from '../src/theme/ThemeProvider';

const PREFERENCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: '端末設定' },
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
];

/**
 * 共通スタイル（色・ボタン・カード・入力欄）の見た目を確認するための画面。
 * 実際の画面には組み込まない、確認専用。上のセグメントでライト/ダークを切り替えられる。
 */
export default function ThemePreviewScreen() {
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>テーマ</Text>
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

      <Text style={styles.sectionTitle}>ボタン</Text>
      <View style={styles.stack}>
        <Button label="この内容をコピーして今日の記録にする" variant="primary" onPress={() => {}} />
        <Button label="編集する" variant="outline" onPress={() => {}} />
        <Button label="削除する" variant="danger" onPress={() => {}} />
      </View>

      <Text style={styles.sectionTitle}>カード（履歴一覧を想定）</Text>
      <Card>
        <Text style={styles.cardDate}>2026年8月10日（月）</Text>
        <Text style={styles.cardMeta}>3種目</Text>
      </Card>

      <Text style={styles.sectionTitle}>種目カード（詳細画面を想定）</Text>
      <Card>
        <Text style={styles.exerciseName}>ベンチプレス</Text>
        <Text style={styles.setRow}>1セット目　60kg × 10回</Text>
        <Text style={styles.setRow}>2セット目　65kg × 8回</Text>
        <Text style={styles.setRow}>3セット目　65kg × 8回</Text>
        <Text style={styles.exerciseMemo}>メモ: フォームを意識した</Text>
      </Card>

      <Text style={styles.sectionTitle}>入力欄</Text>
      <View style={styles.stack}>
        <TextField placeholder="種目名（例: ベンチプレス）" />
        <TextField placeholder="この種目のメモ（任意）" />
      </View>
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
    stack: {
      gap: 10,
    },
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
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
    cardDate: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    cardMeta: {
      fontSize: 13,
      color: colors.textMuted,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    setRow: {
      fontSize: 14,
      color: colors.textMuted,
    },
    exerciseMemo: {
      marginTop: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
  });
}
