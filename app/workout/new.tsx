import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import CenteredMessage from '../../src/components/CenteredMessage';
import WorkoutForm, { type WorkoutFormInitial } from '../../src/components/WorkoutForm';
import { createWorkoutWithDetails, getWorkoutWithDetails } from '../../src/db/queries';
import { formatDateJa, todayString } from '../../src/utils/date';

/**
 * 記録の入力画面（新規作成）。
 *
 * 通常は空のフォームだが、`?copyFrom=<workoutId>` 付きで開かれた場合は
 * そのワークアウトの種目・セット構成を「今日の日付」で複製した状態から始める
 * （前回のコピー機能）。日付は複製せず、種目名とセットの重量・レップ数だけを引き継ぐ
 * （種目ごとのメモは前回の内容のままだと紛らわしいため引き継がない）。
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
          exercises: source.exerciseEntries.map((entry) => ({
            name: entry.name,
            memo: null,
            sets: entry.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
          })),
        });
        setBanner(`${formatDateJa(source.date)} の内容をコピーしました。重量・レップ数は変更できます。`);
      })
      .finally(() => setLoading(false));
  }, [copyFromId]);

  if (loading) {
    return <CenteredMessage loading text="前回の内容を読み込み中..." />;
  }

  return (
    <WorkoutForm
      initial={initial}
      banner={banner}
      submitLabel="保存する"
      onSubmit={async (input) => {
        const newId = await createWorkoutWithDetails(input);
        // 履歴の一覧やコピー元の詳細画面ではなく、今保存したばかりの記録を直接表示する
        router.replace({ pathname: '/workout/[id]', params: { id: String(newId) } });
      }}
    />
  );
}
