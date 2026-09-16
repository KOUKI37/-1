import { Alert, Platform } from 'react-native';

/**
 * react-native-web の Alert.alert は何もしない空実装（ボタンのコールバックも一切呼ばれない）。
 * そのため確認・通知ダイアログは、この薄いラッパー経由でのみ使う。
 * Web ではブラウザ標準の window.alert / window.confirm にフォールバックする。
 */

/** 単純な通知ダイアログ。 */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** 「キャンセル / 実行」の2択確認ダイアログ。選んだ結果を Promise で返す。 */
export function confirmAsync(title: string, message: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
