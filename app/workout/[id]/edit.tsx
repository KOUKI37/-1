import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import CenteredMessage from '../../../src/components/CenteredMessage';
import WorkoutForm, { type WorkoutFormInitial } from '../../../src/components/WorkoutForm';
import { getWorkoutWithDetails, updateWorkoutWithDetails } from '../../../src/db/queries';

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
        exercises: workout.exerciseEntries.map((entry) => ({
          name: entry.name,
          memo: entry.memo,
          sets: entry.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
        })),
      });
    });
  }, [workoutId]);

  if (initial === undefined) {
    return <CenteredMessage loading text="読み込み中..." />;
  }

  if (initial === null) {
    return <CenteredMessage text="この記録は見つかりませんでした" />;
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
