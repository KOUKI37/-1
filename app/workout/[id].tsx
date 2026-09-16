import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '../../src/components/Button';
import Card from '../../src/components/Card';
import CenteredMessage from '../../src/components/CenteredMessage';
import { deleteWorkout, getWorkoutWithDetails, type WorkoutWithDetails } from '../../src/db/queries';
import type { ThemeColors } from '../../src/theme/colors';
import { useTheme } from '../../src/theme/ThemeProvider';
import { confirmAsync } from '../../src/utils/alert';
import { formatDateJa } from '../../src/utils/date';

/**
 * トレーニング詳細画面。
 * ファイル名の [id] は「ここは可変」という意味。/workout/1 でも /workout/42 でもこの画面が開き、
 * useLocalSearchParams() でその数字を文字列として受け取れる。
 */
export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);

  const [workout, setWorkout] = useState<WorkoutWithDetails | null | undefined>(undefined);

  const reload = useCallback(() => {
    getWorkoutWithDetails(workoutId).then((row) => setWorkout(row ?? null));
  }, [workoutId]);

  useFocusEffect(reload);

  const handleDelete = () => {
    confirmAsync('この記録を削除しますか？', '種目とセットの記録もすべて削除されます。', '削除する').then((confirmed) => {
      if (confirmed) deleteWorkout(workoutId).then(() => router.back());
    });
  };

  if (workout === undefined) {
    return <CenteredMessage loading text="読み込み中..." />;
  }

  if (workout === null) {
    return <CenteredMessage text="この記録は見つかりませんでした（削除済みの可能性があります）" />;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.date}>{formatDateJa(workout.date)}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{workout.exerciseEntries.length}種目</Text>
          </View>
        </View>

        {workout.exerciseEntries.length === 0 ? (
          <Text style={styles.emptyText}>種目がまだありません</Text>
        ) : (
          workout.exerciseEntries.map((entry, index) => (
            <Card key={entry.id} accent style={styles.exerciseCard}>
              <View style={styles.exerciseIndexBadge}>
                <Text style={styles.exerciseIndexText}>種目 {index + 1}</Text>
              </View>
              <Text style={styles.exerciseName}>{entry.name}</Text>
              <View style={styles.setList}>
                {entry.sets.map((set) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={styles.setNumber}>{set.setNumber}</Text>
                    <Text style={styles.setValue}>
                      {set.weight}
                      <Text style={styles.setUnit}>kg</Text> × {set.reps}
                      <Text style={styles.setUnit}>回</Text>
                    </Text>
                  </View>
                ))}
              </View>
              {entry.memo ? <Text style={styles.exerciseMemo}>メモ: {entry.memo}</Text> : null}
            </Card>
          ))
        )}
      </ScrollView>

      <View style={styles.actionArea}>
        <Button
          label="この内容をコピーして今日の記録にする"
          variant="primary"
          onPress={() => router.push({ pathname: '/workout/new', params: { copyFrom: String(workoutId) } })}
        />

        <View style={styles.actionRow}>
          <Button
            label="編集する"
            variant="outline"
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/workout/[id]/edit', params: { id: String(workoutId) } })}
          />
          <Button label="削除する" variant="danger" style={styles.actionButton} onPress={handleDelete} />
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    date: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    countBadge: {
      backgroundColor: colors.accentBackground,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    countBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
      letterSpacing: 0.2,
    },
    emptyText: {
      color: colors.textMuted,
    },
    exerciseCard: {
      gap: 10,
    },
    exerciseIndexBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accentBackground,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    exerciseIndexText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
      letterSpacing: 0.2,
    },
    exerciseName: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
    },
    setList: {
      gap: 6,
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    setNumber: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      minWidth: 20,
    },
    setValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    setUnit: {
      fontSize: 12,
      fontWeight: '600',
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
    actionArea: {
      margin: 16,
      gap: 12,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
    },
  });
}
