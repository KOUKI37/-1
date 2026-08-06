import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { deleteWorkout, getWorkoutWithDetails, type WorkoutWithDetails } from '../../src/db/queries';
import { colors } from '../../src/theme/colors';

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
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>読み込み中...</Text>
      </View>
    );
  }

  if (workout === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>この記録は見つかりませんでした（削除済みの可能性があります）</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.date}>{workout.date}</Text>
          {workout.memo ? <Text style={styles.memo}>{workout.memo}</Text> : null}
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
            </View>
          ))
        )}
      </ScrollView>

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
  loading: {
    padding: 24,
    textAlign: 'center',
    color: colors.textMuted,
  },
  header: {
    gap: 4,
    marginBottom: 8,
  },
  date: {
    fontSize: 15,
    color: colors.textMuted,
  },
  memo: {
    fontSize: 16,
    color: colors.text,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    margin: 16,
  },
  editButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  editButtonPressed: {
    opacity: 0.8,
  },
  editButtonText: {
    color: colors.accentText,
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
