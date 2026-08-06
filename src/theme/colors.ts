/**
 * アプリ全体で使う色を1か所にまとめたファイル。
 * 画面ごとに色コードを直書きすると後で変更が大変になるので、
 * 必ずここを経由して使う。
 */
export const colors = {
  background: '#F5F5F7',
  surface: '#FFFFFF',
  border: '#E2E2E7',

  headerBackground: '#1C1C1E',
  headerText: '#FFFFFF',

  text: '#1C1C1E',
  textMuted: '#8A8A8E',

  accent: '#0A84FF',
  accentText: '#FFFFFF',
} as const;
