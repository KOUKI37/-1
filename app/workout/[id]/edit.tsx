import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import WorkoutForm, { type WorkoutFormInitial } from '../../../src/components/WorkoutForm';
import { getWorkoutWithDetails, updateWorkoutWithDetails } from '../../../src/db/queries';
import { colors } from '../../../src/theme/colors';

/** 記録の編集画面。既存の内容を読み込んでフォームに渡し、保存すると丸ごと置き換える。 */
export default function EditWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);

  const [initial, setInitial] = useState<WorkoutFormInitial | null | undefined>(undefined);

  useEffect(() => {
    getWorkoutWithDetails(workoutId).then((workout) => {
      if (!workout) {
        setInitial(null);
        return;
      }
      setInitial({
        date: workout.date,
        memo: workout.memo,
        exercises: workout.exerciseEntries.map((entry) => ({
          name: entry.name,
          sets: entry.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
        })),
      });
    });
  }, [workoutId]);

  if (initial === undefined) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>読み込み中...</Text>
      </View>
    );
  }

  if (initial === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>この記録は見つかりませんでした</Text>
      </View>
    );
  }

  return (
    <WorkoutForm
      initial={initial}
      submitLabel="更新する"
      onSubmit={async (input) => {
        await updateWorkoutWithDetails(workoutId, input);
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
    backgroundColor: colors.background,
  },
  centerText: {
    color: colors.textMuted,
  },
});
