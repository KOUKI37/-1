import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import Card from '../src/components/Card';
import { listWorkoutsWithExerciseCount, type Workout } from '../src/db/queries';
import type { ThemeColors } from '../src/theme/colors';
import { fonts } from '../src/theme/fonts';
import { useTheme } from '../src/theme/ThemeProvider';
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      {/* このホーム画面だけヘッダー右に設定アイコンを出す */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={8} style={styles.settingsButton}>
              <Text style={styles.settingsIcon}>⚙</Text>
            </Pressable>
          ),
        }}
      />

      {!loading && workouts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>まだ記録がない</Text>
          <Text style={styles.emptyBody}>右下の「＋ 記録する」から、最初のトレーニングを記録しよう。</Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: String(item.id) } })}
              accent
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardDate}>{formatDateJa(item.date)}</Text>
                <View style={styles.cardRight}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.exerciseCount}種目</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </View>
            </Card>
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    settingsButton: {
      paddingHorizontal: 4,
    },
    settingsIcon: {
      fontSize: 20,
      color: colors.headerText,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 32,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    emptyBody: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    listContent: {
      padding: 16,
      paddingBottom: 96, // 下の丸ボタンにリスト末尾が隠れないよう余白を確保
      gap: 12,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    cardDate: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      flexShrink: 1,
    },
    cardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    badge: {
      backgroundColor: colors.accentBackground,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
      letterSpacing: 0.2,
    },
    chevron: {
      fontSize: 20,
      color: colors.textMuted,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 28,
      backgroundColor: colors.accent,
      paddingHorizontal: 22,
      paddingVertical: 15,
      borderRadius: 28,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    fabPressed: {
      opacity: 0.85,
    },
    fabText: {
      color: colors.accentText,
      fontSize: 15,
      fontFamily: fonts.display,
      letterSpacing: 0.3,
    },
  });
}
