import { DelaGothicOne_400Regular } from '@expo-google-fonts/dela-gothic-one';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import CenteredMessage from '../src/components/CenteredMessage';
import { useDatabaseReady } from '../src/db/useDatabaseReady';
import type { ThemeColors } from '../src/theme/colors';
import { fonts } from '../src/theme/fonts';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

/**
 * すべての画面の「外枠」。
 * Stack = 画面を紙のように積み重ねる方式のナビゲーション。
 * 新しい画面を push すると上に重なり、戻るボタンで剥がれる。
 *
 * ここで screenOptions を設定しておくと、全画面のヘッダー見た目が揃う。
 *
 * アプリ起動時にまず DB のテーブル作成（マイグレーション）を待ってから画面を表示する。
 *
 * ThemeProvider で全体を包み、どの画面からも useTheme() でダーク/ライトの色を取得できる。
 */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { ready: dbReady, error: dbError } = useDatabaseReady();
  const [fontsLoaded] = useFonts({ DelaGothicOne_400Regular });

  if (dbError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>DB の初期化に失敗しました</Text>
        <Text style={styles.errorBody}>{dbError.message}</Text>
      </View>
    );
  }

  if (!dbReady || !fontsLoaded) {
    return <CenteredMessage loading text="準備中..." />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontFamily: fonts.display, fontSize: 18 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* name は app/ 以下のファイルパスと対応する */}
        <Stack.Screen name="index" options={{ title: 'トレーニング履歴' }} />
        <Stack.Screen name="workout/new" options={{ title: '記録を追加' }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'トレーニング詳細' }} />
        <Stack.Screen name="workout/[id]/edit" options={{ title: '記録を編集' }} />
        <Stack.Screen name="settings" options={{ title: '設定' }} />
        <Stack.Screen name="theme-preview" options={{ title: 'デザイン確認（開発用）' }} />
      </Stack>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
}
