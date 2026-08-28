import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './colors';

/**
 * テーマ（ダーク/ライト）の状態管理。
 *
 * - 'system': 端末のダーク/ライト設定に従う（初期値）
 * - 'light' / 'dark': アプリ内で明示的に選んだ設定。端末の設定より優先される
 *
 * 選んだ設定は端末に保存し、次回起動時も引き継ぐ。
 */

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  colors: ThemeColors;
  /** 実際に適用されている見た目（'system' は解決済みの 'light' | 'dark' になる） */
  scheme: 'light' | 'dark';
  /** ユーザーが選んだ設定そのもの（切り替えUIの選択状態表示に使う） */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const STORAGE_KEY = 'muscle-log/theme-preference';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null（端末の現在設定）
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // 起動時に、前回選んだ設定を端末から読み出す
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setPreferenceState(saved);
      }
    });
  }, []);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const scheme: 'light' | 'dark' = preference === 'system' ? (systemScheme ?? 'light') : preference;
  const colors = scheme === 'dark' ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, scheme, preference, setPreference }),
    [colors, scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme は ThemeProvider の内側でのみ使える（app/_layout.tsx を確認）');
  }
  return value;
}
