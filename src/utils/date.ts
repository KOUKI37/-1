const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 'YYYY-MM-DD' への変換は必ずローカルの年月日から組み立てる。
 * Date#toISOString() は UTC に変換してしまうため、日本のような UTC+ のタイムゾーンでは
 * 日付が意図せず前日にずれる（例: 1日進めたつもりが変化なし、1日戻すと2日戻る）。
 */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

export function shiftDateString(date: string, deltaDays: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return toDateString(d);
}

/** 'YYYY-MM-DD' を「2026年8月6日（木）」のような表示用の文字列にする */
export function formatDateJa(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY_JA[d.getDay()]}）`;
}
