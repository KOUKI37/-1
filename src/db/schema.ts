import { relations } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * テーブル定義。
 *
 * 補足: 当初の README では種目を別テーブル（種目マスタ）に分ける設計を書いていたが、
 * 今回のシンプルな仕様（exercise_entry に種目名を直接持つ）に合わせて変更した。
 * 「次の種目の提案」は、この name（文字列）ごとの集計で実現する。
 */

export const workouts = sqliteTable('workout', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** 'YYYY-MM-DD' 形式の文字列で保存する */
  date: text('date').notNull(),
  memo: text('memo'),
});

export const exerciseEntries = sqliteTable('exercise_entry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workoutId: integer('workout_id')
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  /** 同じワークアウト内での表示順（0始まり） */
  order: integer('sort_order').notNull(),
});

export const setEntries = sqliteTable('set_entry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exerciseEntryId: integer('exercise_entry_id')
    .notNull()
    .references(() => exerciseEntries.id, { onDelete: 'cascade' }),
  weight: real('weight').notNull(),
  reps: integer('reps').notNull(),
  setNumber: integer('set_number').notNull(),
});

// 以下は db.query.workouts.findMany({ with: { ... } }) のようなネスト取得を可能にするための関連定義。
// テーブルそのものには影響しない（DB上のカラムは増えない）。

export const workoutsRelations = relations(workouts, ({ many }) => ({
  exerciseEntries: many(exerciseEntries),
}));

export const exerciseEntriesRelations = relations(exerciseEntries, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [exerciseEntries.workoutId],
    references: [workouts.id],
  }),
  sets: many(setEntries),
}));

export const setEntriesRelations = relations(setEntries, ({ one }) => ({
  exerciseEntry: one(exerciseEntries, {
    fields: [setEntries.exerciseEntryId],
    references: [exerciseEntries.id],
  }),
}));
