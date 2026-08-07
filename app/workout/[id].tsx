import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import CenteredMessage from '../../src/components/CenteredMessage';
import { deleteWorkout, getWorkoutWithDetails, type WorkoutWithDetails } from '../../src/db/queries';
import { colors } from '../../src/theme/colors';
import { formatDateJa } from '../../src/utils/date';

/**
 * トレーニング詳細画面。
 * ファイル名の [id] は「ここは可変」という意味。/workout/1 でも /workout/42 でもこの画面が開き、
 * useLocalSearchParams() でその数字を文字列として受け取れる。
 */
export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);

  const [workout, setWorkout] = useState<WorkoutWithDetails | null | undefined>(undefined);

  const reload = useCallback(() => {
    getWorkoutWithDetails(workoutId).then((row) => setWorkout(row ?? null));
  }, [workoutId]);

  useFocusEffect(reload);

  const handleDelete = () => {
    Alert.alert('この記録を削除しますか？', '種目とセットの記録もすべて削除されます。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () => deleteWorkout(workoutId).then(() => router.back()),
      },
    ]);
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
        </View>

        {workout.exerciseEntries.length === 0 ? (
          <Text style={styles.emptyText}>種目がまだありません</Text>
        ) : (
          workout.exerciseEntries.map((entry) => (
            <View key={entry.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{entry.name}</Text>
              {entry.sets.map((set) => (
                <Text key={set.id} style={styles.setRow}>
                  {set.setNumber}セット目　{set.weight}kg × {set.reps}回
                </Text>
              ))}
              {entry.memo ? <Text style={styles.exerciseMemo}>メモ: {entry.memo}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.actionArea}>
        <Pressable
          style={({ pressed }) => [styles.copyButton, pressed && styles.copyButtonPressed]}
          onPress={() => router.push({ pathname: '/workout/new', params: { copyFrom: String(workoutId) } })}
        >
          <Text style={styles.copyButtonText}>この内容をコピーして今日の記録にする</Text>
        </Pressable>

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
            onPress={() => router.push({ pathname: '/workout/[id]/edit', params: { id: String(workoutId) } })}
          >
            <Text style={styles.editButtonText}>編集する</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>削除する</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
    marginBottom: 8,
  },
  date: {
    fontSize: 15,
    color: colors.textMuted,
  },
  emptyText: {
    color: colors.textMuted,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
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
  actionArea: {
    margin: 16,
    gap: 12,
  },
  copyButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  copyButtonPressed: {
    opacity: 0.85,
  },
  copyButtonText: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  editButtonPressed: {
    backgroundColor: colors.background,
  },
  editButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonPressed: {
    backgroundColor: '#FF3B3020',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});
