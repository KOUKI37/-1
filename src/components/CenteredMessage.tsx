import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

/**
 * 「読み込み中」「見つかりません」など、画面いっぱいに中央寄せで
 * メッセージだけを出したいときの共通部品。画面ごとに中央寄せの実装が
 * ばらつく（センタリングが漏れる・スピナーの有無が揃わない）のを防ぐ。
 */
export default function CenteredMessage({ text, loading }: { text: string; loading?: boolean }) {
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background,
    padding: 24,
  },
  text: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
});
