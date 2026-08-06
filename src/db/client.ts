import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// アプリ内で1つだけ開く SQLite 接続。ファイル名がそのまま端末内の保存ファイル名になる。
export const expoDb = openDatabaseSync('muscle-log.db', { enableChangeListener: true });

// SQLite は外部キー制約をデフォルトで無視する。
// これを ON にしないと、schema.ts の onDelete: 'cascade'（親を消したら子も消える）が効かない。
expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });
