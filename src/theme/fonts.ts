/**
 * 見出し・強調表示専用の書体。
 *
 * 「力強い・ワイルド」の方向性を出すための極太ゴシック（Dela Gothic One）。
 * 短い見出し・ラベル専用。文章量の多い本文やボタンの説明文には使わない
 * （非常に太い書体なので、長い文だと潰れて読みにくくなるため）。
 * 本文は通常どおり端末の標準フォントを使い、太さ（fontWeight）で強弱をつける。
 */
export const fonts = {
  display: 'DelaGothicOne_400Regular',
} as const;
