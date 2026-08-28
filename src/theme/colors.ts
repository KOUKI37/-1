/**
 * アプリ全体で使う色を1か所にまとめたファイル。
 *
 * - lightColors / darkColors: 新しいダーク/ライト対応のパレット。
 *   共通コンポーネント（Button, Card, TextField など）や新しい画面はこちらを使う。
 *   実際に使うときは colors.ts を直接importせず、useTheme() 経由で取得する
 *   （テーマが切り替わったときに自動で正しい方を受け取れるようにするため）。
 * - colors: 移行前の画面がまだ参照している旧・単一パレット。
 *   既存画面をテーマ対応させ終えたら、このファイルごと整理する想定。
 */

export type ThemeColors = {
  /** 画面の下地 */
  background: string;
  /** カードなど、下地より一段手前の面 */
  surface: string;
  /** 区切り線・枠線 */
  border: string;
  /** ヘッダーバー。ライト/ダーク共通で暗色に固定し、モードが変わっても
   *  ブランドの「締まった印象」を保つ（意図的に background/surface とは連動させない） */
  headerBackground: string;
  headerText: string;
  /** 本文の文字色 */
  text: string;
  /** 補足・日付など、本文より弱く見せたい文字色 */
  textMuted: string;
  /** 「保存」「コピー」など主要な操作ボタンに使うアクセントカラー */
  accent: string;
  /** accent の上に乗る文字色 */
  accentText: string;
  /** accent の薄い背景色。バッジ・チップなど「主張しすぎない赤」に使う */
  accentBackground: string;
  /** 削除など破壊的な操作の枠線・文字色。accent と混同しないよう別トーンにする */
  danger: string;
  /** danger 系ボタンの薄い背景色 */
  dangerBackground: string;
};

export const lightColors: ThemeColors = {
  background: '#F1EDE6',
  surface: '#FFFFFF',
  border: '#DDD5C8',
  headerBackground: '#17130F',
  headerText: '#F1EDE6',
  text: '#1B1815',
  textMuted: '#6B6459',
  // WCAG AA（4.5:1）に届くよう、元の #E0432B よりわずかに濃くしている
  // （白文字の主要ボタンで 4.19:1 → 4.69:1 に改善。見た目の印象はほぼ変わらない）
  accent: '#D7381F',
  accentText: '#FFFFFF',
  accentBackground: '#D7381F06',
  danger: '#B23A2E',
  dangerBackground: '#B23A2E14',
};

export const darkColors: ThemeColors = {
  background: '#14110E',
  surface: '#1E1A16',
  border: '#332C24',
  headerBackground: '#17130F',
  headerText: '#F1EDE6',
  text: '#F3EFE8',
  // 濃いグレーだと暗い背景に同化して読みづらいため、text とほぼ同じ明るさの白系にする
  // （太さ・サイズの違いだけで本文との強弱をつける）
  textMuted: '#EDE9E1',
  // 前景（矢印・リンク的なテキスト）としての視認性を保つため、明るい赤のまま維持する
  accent: '#FF5A3C',
  // 上の明るい accent に白文字を乗せると 3.10:1 しか出ず読みにくいため、
  // 主要ボタンの文字はダークモードの背景色（濃色）を流用して確保する（6.07:1）
  accentText: '#14110E',
  accentBackground: '#FF5A3C1F',
  danger: '#E0665A',
  // 元の #E0665A1F は削除ボタンの文字コントラストが 4.39:1 とAA未達だったため、
  // 背景の重ねる濃さを少し弱めて 4.5:1 を確保する
  dangerBackground: '#E0665A17',
};

/**
 * @deprecated 旧・単一パレット。まだテーマ対応していない画面向けに残している。
 * 新しく書くコードはこれを使わず useTheme() の colors を使う。
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
