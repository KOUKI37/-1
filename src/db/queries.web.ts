import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Web 版のデータアクセス層。
 *
 * expo-sqlite の Web 実装は「同期 API を Worker + WASM + SharedArrayBuffer の
 * ビジーウェイトで疑似的に再現する」方式で、初回アクセスだけで簡単にタイムアウト
 * （Sync operation timeout）する。加えて drizzle-orm の expo-sqlite ドライバは
 * 同期専用実装のため、Web では実質使い物にならないと判断した。
 *
 * そこでネイティブ（iOS/Android）はこれまで通り SQLite（queries.ts）を使い、
 * Web だけはこのファイル（同じファイル名 + .web.ts）に自動的に差し替わるように
 * している（Metro のプラットフォーム別拡張子解決）。保存先は AsyncStorage
 * （Web ではブラウザの localStorage を使う）に、1つの JSON として保存する。
 *
 * 画面側は queries.ts と全く同じ関数名・型をこのファイルからも呼び出すだけなので、
 * app/ 配下のコードは一切変更していない。
 */

// ---- 型 -----------------------------------------------------------------
// schema.ts の drizzle テーブル定義と同じ形を、drizzle に依存せずに素の型として持つ。

export type Workout = { id: number; date: string };
export type NewWorkout = { date: string };

export type ExerciseEntry = { id: number; workoutId: number; name: string; order: number; memo: string | null };
export type NewExerciseEntry = { workoutId: number; name: string; order: number; memo?: string | null };

export type SetEntry = { id: number; exerciseEntryId: number; weight: number; reps: number; setNumber: number };
export type NewSetEntry = { exerciseEntryId: number; weight: number; reps: number; setNumber: number };

export type WorkoutWithDetails = Workout & {
  exerciseEntries: (ExerciseEntry & { sets: SetEntry[] })[];
};

export type ExerciseDraft = {
  name: string;
  memo: string | null;
  sets: { weight: number; reps: number }[];
};

export type NextExerciseSuggestion = { name: string; count: number };

export type ExercisePerformance = {
  date: string;
  sets: { weight: number; reps: number }[];
};

// ---- 保存の実体 -----------------------------------------------------------

const STORAGE_KEY = 'muscle-log/web-db/v1';

type Store = {
  nextId: { workout: number; exerciseEntry: number; setEntry: number };
  workouts: Workout[];
  exerciseEntries: ExerciseEntry[];
  setEntries: SetEntry[];
};

function emptyStore(): Store {
  return {
    nextId: { workout: 1, exerciseEntry: 1, setEntry: 1 },
    workouts: [],
    exerciseEntries: [],
    setEntries: [],
  };
}

// 個人利用の単一タブ前提のシンプルな実装。呼び出しごとに読み込み→書き込みするため、
// 同時に複数の保存処理が競合する状況は想定していない。
async function loadStore(): Promise<Store> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();
  return JSON.parse(raw) as Store;
}

async function saveStore(store: Store): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function compareWorkoutDesc(a: Workout, b: Workout): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return b.id - a.id;
}

// ---- workout --------------------------------------------------------------

export async function listWorkouts(): Promise<Workout[]> {
  const store = await loadStore();
  return [...store.workouts].sort(compareWorkoutDesc);
}

export async function listWorkoutsWithExerciseCount(): Promise<(Workout & { exerciseCount: number })[]> {
  const store = await loadStore();
  return [...store.workouts].sort(compareWorkoutDesc).map((w) => ({
    ...w,
    exerciseCount: store.exerciseEntries.filter((e) => e.workoutId === w.id).length,
  }));
}

export async function getWorkout(id: number): Promise<Workout | undefined> {
  const store = await loadStore();
  return store.workouts.find((w) => w.id === id);
}

export async function getWorkoutWithDetails(id: number): Promise<WorkoutWithDetails | undefined> {
  const store = await loadStore();
  const workout = store.workouts.find((w) => w.id === id);
  if (!workout) return undefined;

  const exerciseEntries = store.exerciseEntries
    .filter((e) => e.workoutId === id)
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      ...entry,
      sets: store.setEntries
        .filter((s) => s.exerciseEntryId === entry.id)
        .sort((a, b) => a.setNumber - b.setNumber),
    }));

  return { ...workout, exerciseEntries };
}

export async function createWorkout(input: { date: string }): Promise<Workout> {
  const store = await loadStore();
  const workout: Workout = { id: store.nextId.workout++, date: input.date };
  store.workouts.push(workout);
  await saveStore(store);
  return workout;
}

export async function updateWorkout(id: number, input: Partial<{ date: string }>): Promise<Workout | undefined> {
  const store = await loadStore();
  const workout = store.workouts.find((w) => w.id === id);
  if (!workout) return undefined;
  if (input.date !== undefined) workout.date = input.date;
  await saveStore(store);
  return workout;
}

export async function deleteWorkout(id: number): Promise<void> {
  const store = await loadStore();
  const entryIds = new Set(store.exerciseEntries.filter((e) => e.workoutId === id).map((e) => e.id));
  store.workouts = store.workouts.filter((w) => w.id !== id);
  store.exerciseEntries = store.exerciseEntries.filter((e) => e.workoutId !== id);
  store.setEntries = store.setEntries.filter((s) => !entryIds.has(s.exerciseEntryId));
  await saveStore(store);
}

function insertExercisesWithSets(store: Store, workoutId: number, exercises: ExerciseDraft[]): void {
  exercises.forEach((exercise, exerciseIndex) => {
    const exerciseEntryId = store.nextId.exerciseEntry++;
    store.exerciseEntries.push({
      id: exerciseEntryId,
      workoutId,
      name: exercise.name,
      order: exerciseIndex,
      memo: exercise.memo,
    });

    exercise.sets.forEach((set, setIndex) => {
      store.setEntries.push({
        id: store.nextId.setEntry++,
        exerciseEntryId,
        weight: set.weight,
        reps: set.reps,
        setNumber: setIndex + 1,
      });
    });
  });
}

export async function createWorkoutWithDetails(input: { date: string; exercises: ExerciseDraft[] }): Promise<number> {
  const store = await loadStore();
  const workoutId = store.nextId.workout++;
  store.workouts.push({ id: workoutId, date: input.date });
  insertExercisesWithSets(store, workoutId, input.exercises);
  await saveStore(store);
  return workoutId;
}

export async function updateWorkoutWithDetails(
  workoutId: number,
  input: { date: string; exercises: ExerciseDraft[] }
): Promise<void> {
  const store = await loadStore();
  const workout = store.workouts.find((w) => w.id === workoutId);
  if (workout) workout.date = input.date;

  const oldEntryIds = new Set(store.exerciseEntries.filter((e) => e.workoutId === workoutId).map((e) => e.id));
  store.exerciseEntries = store.exerciseEntries.filter((e) => e.workoutId !== workoutId);
  store.setEntries = store.setEntries.filter((s) => !oldEntryIds.has(s.exerciseEntryId));

  insertExercisesWithSets(store, workoutId, input.exercises);
  await saveStore(store);
}

export async function listFrequentExerciseNames(limit = 8): Promise<string[]> {
  const store = await loadStore();
  const counts = new Map<string, number>();
  for (const e of store.exerciseEntries) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

export async function listNextExerciseSuggestions(afterName: string, limit = 5): Promise<NextExerciseSuggestion[]> {
  const store = await loadStore();
  const counts = new Map<string, number>();

  for (const current of store.exerciseEntries) {
    if (current.name !== afterName) continue;
    const next = store.exerciseEntries.find(
      (e) => e.workoutId === current.workoutId && e.order === current.order + 1
    );
    if (next) counts.set(next.name, (counts.get(next.name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getLastExercisePerformance(name: string): Promise<ExercisePerformance | undefined> {
  const store = await loadStore();

  const candidates = store.exerciseEntries
    .filter((e) => e.name === name)
    .map((entry) => ({ entry, workout: store.workouts.find((w) => w.id === entry.workoutId) }))
    .filter((c): c is { entry: ExerciseEntry; workout: Workout } => c.workout !== undefined);

  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    if (a.workout.date !== b.workout.date) return a.workout.date < b.workout.date ? 1 : -1;
    return b.entry.id - a.entry.id;
  });

  const latest = candidates[0];
  const sets = store.setEntries
    .filter((s) => s.exerciseEntryId === latest.entry.id)
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((s) => ({ weight: s.weight, reps: s.reps }));

  return { date: latest.workout.date, sets };
}

// ---- exercise_entry ---------------------------------------------------------

export async function listExerciseEntries(workoutId: number): Promise<ExerciseEntry[]> {
  const store = await loadStore();
  return store.exerciseEntries.filter((e) => e.workoutId === workoutId).sort((a, b) => a.order - b.order);
}

export async function createExerciseEntry(input: {
  workoutId: number;
  name: string;
  order: number;
  memo?: string | null;
}): Promise<ExerciseEntry> {
  const store = await loadStore();
  const entry: ExerciseEntry = {
    id: store.nextId.exerciseEntry++,
    workoutId: input.workoutId,
    name: input.name,
    order: input.order,
    memo: input.memo ?? null,
  };
  store.exerciseEntries.push(entry);
  await saveStore(store);
  return entry;
}

export async function updateExerciseEntry(
  id: number,
  input: Partial<{ name: string; order: number; memo: string | null }>
): Promise<ExerciseEntry | undefined> {
  const store = await loadStore();
  const entry = store.exerciseEntries.find((e) => e.id === id);
  if (!entry) return undefined;
  if (input.name !== undefined) entry.name = input.name;
  if (input.order !== undefined) entry.order = input.order;
  if (input.memo !== undefined) entry.memo = input.memo;
  await saveStore(store);
  return entry;
}

export async function deleteExerciseEntry(id: number): Promise<void> {
  const store = await loadStore();
  store.exerciseEntries = store.exerciseEntries.filter((e) => e.id !== id);
  store.setEntries = store.setEntries.filter((s) => s.exerciseEntryId !== id);
  await saveStore(store);
}

// ---- set_entry ----------------------------------------------------------

export async function listSetEntries(exerciseEntryId: number): Promise<SetEntry[]> {
  const store = await loadStore();
  return store.setEntries
    .filter((s) => s.exerciseEntryId === exerciseEntryId)
    .sort((a, b) => a.setNumber - b.setNumber);
}

export async function createSetEntry(input: {
  exerciseEntryId: number;
  weight: number;
  reps: number;
  setNumber: number;
}): Promise<SetEntry> {
  const store = await loadStore();
  const set: SetEntry = { id: store.nextId.setEntry++, ...input };
  store.setEntries.push(set);
  await saveStore(store);
  return set;
}

export async function updateSetEntry(
  id: number,
  input: Partial<{ weight: number; reps: number; setNumber: number }>
): Promise<SetEntry | undefined> {
  const store = await loadStore();
  const set = store.setEntries.find((s) => s.id === id);
  if (!set) return undefined;
  if (input.weight !== undefined) set.weight = input.weight;
  if (input.reps !== undefined) set.reps = input.reps;
  if (input.setNumber !== undefined) set.setNumber = input.setNumber;
  await saveStore(store);
  return set;
}

export async function deleteSetEntry(id: number): Promise<void> {
  const store = await loadStore();
  store.setEntries = store.setEntries.filter((s) => s.id !== id);
  await saveStore(store);
}
