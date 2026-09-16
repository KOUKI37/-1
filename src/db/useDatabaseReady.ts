import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../../drizzle/migrations';
import { db } from './client';

/**
 * ネイティブ（iOS/Android）版。SQLite のテーブル作成（マイグレーション）が
 * 終わるまで待つ。Web 版（useDatabaseReady.web.ts）は SQLite を使わないため、
 * このファイルごと別実装に差し替わる。
 */
export function useDatabaseReady(): { ready: boolean; error: Error | undefined } {
  const { success, error } = useMigrations(db, migrations);
  return { ready: success, error };
}
