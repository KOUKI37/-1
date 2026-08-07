import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import migrations from '../drizzle/migrations';
import CenteredMessage from '../src/components/CenteredMessage';
import { db } from '../src/db/client';
import { colors } from '../src/theme/colors';

/**
 * すべての画面の「外枠」。
 * Stack = 画面を紙のように積み重ねる方式のナビゲーション。
 * 新しい画面を push すると上に重なり、戻るボタンで剥がれる。
 *
 * ここで screenOptions を設定しておくと、全画面のヘッダー見た目が揃う。
 *
 * アプリ起動時にまず DB のテーブル作成（マイグレーション）を待ってから画面を表示する。
 */
export default function RootLayout() {
  const { success: migrationSuccess, error: migrationError } = useMigrations(db, migrations);

  if (migrationError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>DB の初期化に失敗しました</Text>
        <Text style={styles.errorBody}>{migrationError.message}</Text>
      </View>
    );
  }

  if (!migrationSuccess) {
    return <CenteredMessage loading text="準備中..." />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* name は app/ 以下のファイルパスと対応する */}
        <Stack.Screen name="index" options={{ title: 'トレーニング履歴' }} />
        <Stack.Screen name="workout/new" options={{ title: '記録を追加' }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'トレーニング詳細' }} />
        <Stack.Screen name="workout/[id]/edit" options={{ title: '記録を編集' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background,
    padding: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  errorBody: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
