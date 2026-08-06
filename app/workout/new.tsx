import { useRouter } from 'expo-router';

import WorkoutForm from '../../src/components/WorkoutForm';
import { createWorkoutWithDetails } from '../../src/db/queries';

/** 記録の入力画面（新規作成）。保存すると DB に書き込まれ、一覧に戻る。 */
export default function NewWorkoutScreen() {
  const router = useRouter();

  return (
    <WorkoutForm
      submitLabel="保存する"
      onSubmit={async (input) => {
        await createWorkoutWithDetails(input);
        router.back();
      }}
    />
  );
}
