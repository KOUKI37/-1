import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import CenteredMessage from '../src/components/CenteredMessage';
import { listWorkoutsWithExerciseCount, type Workout } from '../src/db/queries';
import { colors } from '../src/theme/colors';
import { formatDateJa } from '../src/utils/date';

type WorkoutRow = Workout & { exerciseCount: number };

/**
 * ホーム画面（トレーニング履歴の一覧）。SQLite から実データを読んで表示する。
 *
 * useFocusEffect: この画面が表示されるたび（詳細画面から戻ってきた時なども含む）に実行される。
 * 削除や追加をした直後でも一覧が最新の状態になるよう、毎回読み直している。
 */
export default function HomeScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    listWorkoutsWithExerciseCount()
      .then(setWorkouts)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(reload);

  return (
    <View style={styles.container}>
      {!loading && workouts.length === 0 ? (
        <CenteredMessage text="まだ記録がありません" />
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              // 詳細画面へ。pathname と params を分けて書くと打ち間違いを型チェックできる
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: String(item.id) } })}
            >
              <Text style={styles.cardDate}>{formatDateJa(item.date)}</Text>
              <Text style={styles.cardMeta}>{item.exerciseCount} 種目</Text>
            </Pressable>
          )}
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/workout/new')}
      >
        <Text style={styles.fabText}>＋ 記録する</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 96, // 下の丸ボタンにリスト末尾が隠れないよう余白を確保
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  cardPressed: {
    opacity: 0.6,
  },
  cardDate: {
    fontSize: 13,
    color: colors.textMuted,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
  },
  fabPressed: {
    opacity: 0.8,
  },
  fabText: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: '600',
  },
});
