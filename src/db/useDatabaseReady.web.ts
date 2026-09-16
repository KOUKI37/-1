/**
 * Web 版。データは queries.web.ts が AsyncStorage（ブラウザの localStorage）に
 * 保存する形式のため、SQLite のようなマイグレーション待ちは不要で常に準備完了。
 */
export function useDatabaseReady(): { ready: boolean; error: Error | undefined } {
  return { ready: true, error: undefined };
}
