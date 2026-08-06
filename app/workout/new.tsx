import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import WorkoutForm, { type WorkoutFormInitial } from '../../src/components/WorkoutForm';
import { createWorkoutWithDetails, getWorkoutWithDetails } from '../../src/db/queries';
import { colors } from '../../src/theme/colors';

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

function formatDateJa(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY_JA[d.getDay()]}）`;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 記録の入力画面（新規作成）。
 *
 * 通常は空のフォームだが、`?copyFrom=<workoutId>` 付きで開かれた場合は
 * そのワークアウトの種目・セット構成を「今日の日付」で複製した状態から始める
 * （前回のコピー機能）。日付とメモは複製せず、種目とセットの重量・レップ数だけを引き継ぐ。
 */
export default function NewWorkoutScreen() {
  const router = useRouter();
  const { copyFrom } = useLocalSearchParams<{ copyFrom?: string }>();
  const copyFromId = copyFrom ? Number(copyFrom) : null;

  const [initial, setInitial] = useState<WorkoutFormInitial | undefined>(undefined);
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(copyFromId !== null);

  useEffect(() => {
    if (copyFromId === null) return;
    getWorkoutWithDetails(copyFromId)
      .then((source) => {
        if (!source) return;
        setInitial({
          date: todayString(),
          memo: null,
          exercises: source.exerciseEntries.map((entry) => ({
            name: entry.name,
            sets: entry.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
          })),
        });
        setBanner(`${formatDateJa(source.date)} の内容をコピーしました。重量・レップ数は変更できます。`);
      })
      .finally(() => setLoading(false));
  }, [copyFromId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>前回の内容を読み込み中...</Text>
      </View>
    );
  }

  return (
    <WorkoutForm
      initial={initial}
      banner={banner}
      submitLabel="保存する"
      onSubmit={async (input) => {
        await createWorkoutWithDetails(input);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  centerText: {
    color: colors.textMuted,
  },
});
