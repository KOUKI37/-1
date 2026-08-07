import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import { db } from './client';
import { exerciseEntries, setEntries, workouts } from './schema';

/**
 * データアクセス層。
 *
 * 画面（app/ 配下）は SQL や drizzle を直接触らず、必ずこの関数群を経由して DB を読み書きする。
 * こうしておくと、後で DB の実装を変えたくなっても画面側は修正不要になる。
 */

// ---- 型 -----------------------------------------------------------------
// $inferSelect: DB から読んだときの型 / $inferInsert: 新規作成時に渡す型
export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;

export type ExerciseEntry = typeof exerciseEntries.$inferSelect;
export type NewExerciseEntry = typeof exerciseEntries.$inferInsert;

export type SetEntry = typeof setEntries.$inferSelect;
export type NewSetEntry = typeof setEntries.$inferInsert;

export type WorkoutWithDetails = Workout & {
  exerciseEntries: (ExerciseEntry & { sets: SetEntry[] })[];
};

// ---- workout --------------------------------------------------------------

/** 全ワークアウトを新しい日付順に取得する（履歴一覧用） */
export async function listWorkouts(): Promise<Workout[]> {
  return db.select().from(workouts).orderBy(desc(workouts.date), desc(workouts.id));
}

/** 全ワークアウトを、種目数つきで新しい日付順に取得する（履歴一覧のカード表示用） */
export async function listWorkoutsWithExerciseCount(): Promise<(Workout & { exerciseCount: number })[]> {
  const rows = await db.query.workouts.findMany({
    orderBy: [desc(workouts.date), desc(workouts.id)],
    with: { exerciseEntries: true },
  });
  return rows.map(({ exerciseEntries: entries, ...workout }) => ({
    ...workout,
    exerciseCount: entries.length,
  }));
}

/** ワークアウトを1件取得する（見つからなければ undefined） */
export async function getWorkout(id: number): Promise<Workout | undefined> {
  return db.query.workouts.findFirst({ where: eq(workouts.id, id) });
}

/** ワークアウトを、種目とセットまで含めてまとめて取得する（詳細画面用） */
export async function getWorkoutWithDetails(id: number): Promise<WorkoutWithDetails | undefined> {
  return db.query.workouts.findFirst({
    where: eq(workouts.id, id),
    with: {
      exerciseEntries: {
        orderBy: asc(exerciseEntries.order),
        with: {
          sets: { orderBy: asc(setEntries.setNumber) },
        },
      },
    },
  });
}

/** ワークアウトを新規作成する */
export async function createWorkout(input: { date: string }): Promise<Workout> {
  const [row] = await db.insert(workouts).values({ date: input.date }).returning();
  return row;
}

/** ワークアウトの日付を更新する */
export async function updateWorkout(id: number, input: Partial<{ date: string }>): Promise<Workout | undefined> {
  const [row] = await db.update(workouts).set(input).where(eq(workouts.id, id)).returning();
  return row;
}

/** ワークアウトを削除する。紐づく種目・セットも（外部キーの cascade で）一緒に消える */
export async function deleteWorkout(id: number): Promise<void> {
  await db.delete(workouts).where(eq(workouts.id, id));
}

/** 記録の入力フォームで扱う「種目とセット」の下書き形式。メモは種目ごとに持つ */
export type ExerciseDraft = {
  name: string;
  memo: string | null;
  sets: { weight: number; reps: number }[];
};

/**
 * 新規ワークアウトを、種目・セットも含めて丸ごと保存する（記録の入力画面用）。
 * 1つのトランザクションで実行するので、途中で失敗した場合は何も保存されない。
 */
export async function createWorkoutWithDetails(input: { date: string; exercises: ExerciseDraft[] }): Promise<number> {
  return db.transaction(async (tx) => {
    const [workout] = await tx.insert(workouts).values({ date: input.date }).returning();

    for (const [exerciseIndex, exercise] of input.exercises.entries()) {
      const [entry] = await tx
        .insert(exerciseEntries)
        .values({ workoutId: workout.id, name: exercise.name, memo: exercise.memo, order: exerciseIndex })
        .returning();

      for (const [setIndex, set] of exercise.sets.entries()) {
        await tx.insert(setEntries).values({
          exerciseEntryId: entry.id,
          weight: set.weight,
          reps: set.reps,
          setNumber: setIndex + 1,
        });
      }
    }

    return workout.id;
  });
}

/**
 * 既存ワークアウトの内容を、種目・セットごと丸ごと置き換える（記録の編集画面用）。
 * 一度すべての種目を削除してから作り直すので、順番や増減があっても迷わず保存できる。
 */
export async function updateWorkoutWithDetails(
  workoutId: number,
  input: { date: string; exercises: ExerciseDraft[] }
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(workouts).set({ date: input.date }).where(eq(workouts.id, workoutId));
    await tx.delete(exerciseEntries).where(eq(exerciseEntries.workoutId, workoutId)); // セットも cascade で消える

    for (const [exerciseIndex, exercise] of input.exercises.entries()) {
      const [entry] = await tx
        .insert(exerciseEntries)
        .values({ workoutId, name: exercise.name, memo: exercise.memo, order: exerciseIndex })
        .returning();

      for (const [setIndex, set] of exercise.sets.entries()) {
        await tx.insert(setEntries).values({
          exerciseEntryId: entry.id,
          weight: set.weight,
          reps: set.reps,
          setNumber: setIndex + 1,
        });
      }
    }
  });
}

/** 過去によく使われている種目名を、使用回数の多い順に取得する（入力時の候補表示用） */
export async function listFrequentExerciseNames(limit = 8): Promise<string[]> {
  const rows = await db
    .select({ name: exerciseEntries.name })
    .from(exerciseEntries)
    .groupBy(exerciseEntries.name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows.map((r) => r.name);
}

export type NextExerciseSuggestion = { name: string; count: number };

/**
 * ある種目の「直後」に記録されている種目を、多い順に取得する（次の種目の提案用）。
 *
 * ロジックはシンプルな数え上げ: 同じワークアウト内で order が1つ後ろの種目を
 * 全履歴から集計するだけ（AI・機械学習は使わない）。履歴が少なければ結果は
 * 0件で返る（無理に何かを提案しない）。
 */
export async function listNextExerciseSuggestions(afterName: string, limit = 5): Promise<NextExerciseSuggestion[]> {
  const current = alias(exerciseEntries, 'current');
  const next = alias(exerciseEntries, 'next');

  const rows = await db
    .select({ name: next.name, count: sql<number>`count(*)`.as('count') })
    .from(current)
    .innerJoin(next, and(eq(current.workoutId, next.workoutId), eq(next.order, sql`${current.order} + 1`)))
    .where(eq(current.name, afterName))
    .groupBy(next.name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows;
}

export type ExercisePerformance = {
  date: string;
  sets: { weight: number; reps: number }[];
};

/**
 * ある種目名の、最も新しい記録（日付とセットの重量・レップ数）を取得する。
 * 種目を追加したとき「前回はどうだったか」を表示し、その場でコピーできるようにするために使う。
 * 一度も記録がなければ undefined を返す。
 */
export async function getLastExercisePerformance(name: string): Promise<ExercisePerformance | undefined> {
  const [latest] = await db
    .select({ id: exerciseEntries.id, date: workouts.date })
    .from(exerciseEntries)
    .innerJoin(workouts, eq(exerciseEntries.workoutId, workouts.id))
    .where(eq(exerciseEntries.name, name))
    .orderBy(desc(workouts.date), desc(exerciseEntries.id))
    .limit(1);

  if (!latest) return undefined;

  const sets = await db
    .select({ weight: setEntries.weight, reps: setEntries.reps })
    .from(setEntries)
    .where(eq(setEntries.exerciseEntryId, latest.id))
    .orderBy(asc(setEntries.setNumber));

  return { date: latest.date, sets };
}

// ---- exercise_entry ---------------------------------------------------------

/** あるワークアウト内の種目を、表示順に取得する */
export async function listExerciseEntries(workoutId: number): Promise<ExerciseEntry[]> {
  return db
    .select()
    .from(exerciseEntries)
    .where(eq(exerciseEntries.workoutId, workoutId))
    .orderBy(asc(exerciseEntries.order));
}

/** ワークアウトに種目を1つ追加する */
export async function createExerciseEntry(input: {
  workoutId: number;
  name: string;
  order: number;
  memo?: string | null;
}): Promise<ExerciseEntry> {
  const [row] = await db.insert(exerciseEntries).values(input).returning();
  return row;
}

/** 種目名・表示順・メモを更新する */
export async function updateExerciseEntry(
  id: number,
  input: Partial<{ name: string; order: number; memo: string | null }>
): Promise<ExerciseEntry | undefined> {
  const [row] = await db.update(exerciseEntries).set(input).where(eq(exerciseEntries.id, id)).returning();
  return row;
}

/** 種目を削除する。紐づくセットも一緒に消える */
export async function deleteExerciseEntry(id: number): Promise<void> {
  await db.delete(exerciseEntries).where(eq(exerciseEntries.id, id));
}

// ---- set_entry ----------------------------------------------------------

/** ある種目のセットを、セット番号順に取得する */
export async function listSetEntries(exerciseEntryId: number): Promise<SetEntry[]> {
  return db
    .select()
    .from(setEntries)
    .where(eq(setEntries.exerciseEntryId, exerciseEntryId))
    .orderBy(asc(setEntries.setNumber));
}

/** 種目にセットを1つ追加する */
export async function createSetEntry(input: {
  exerciseEntryId: number;
  weight: number;
  reps: number;
  setNumber: number;
}): Promise<SetEntry> {
  const [row] = await db.insert(setEntries).values(input).returning();
  return row;
}

/** セットの重量・レップ数・セット番号を更新する */
export async function updateSetEntry(
  id: number,
  input: Partial<{ weight: number; reps: number; setNumber: number }>
): Promise<SetEntry | undefined> {
  const [row] = await db.update(setEntries).set(input).where(eq(setEntries.id, id)).returning();
  return row;
}

/** セットを削除する */
export async function deleteSetEntry(id: number): Promise<void> {
  await db.delete(setEntries).where(eq(setEntries.id, id));
}
