import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { listFrequentExerciseNames, type ExerciseDraft } from '../db/queries';
import { colors } from '../theme/colors';

/**
 * 記録の入力フォーム（新規作成・編集の両方で使う共通部品）。
 *
 * 呼び出し側は「保存時に何をするか」(onSubmit) だけを渡す。
 * 新規作成なら createWorkoutWithDetails、編集なら updateWorkoutWithDetails を
 * onSubmit の中で呼んでもらう想定。
 */

type DraftSet = { key: string; weight: string; reps: string };
type DraftExercise = { key: string; name: string; sets: DraftSet[] };

export type WorkoutFormInitial = {
  date: string;
  memo: string | null;
  exercises: ExerciseDraft[];
};

type Props = {
  initial?: WorkoutFormInitial;
  /** フォーム上部に出す案内文（例: 「複製元」の説明）。不要なら省略する */
  banner?: string;
  submitLabel: string;
  onSubmit: (input: { date: string; memo: string | null; exercises: ExerciseDraft[] }) => Promise<void>;
};

let keySeed = 0;
function makeKey(): string {
  keySeed += 1;
  return `k${keySeed}`;
}

function emptySet(): DraftSet {
  return { key: makeKey(), weight: '', reps: '' };
}

function emptyExercise(): DraftExercise {
  return { key: makeKey(), name: '', sets: [emptySet()] };
}

// 'YYYY-MM-DD' への変換は必ずローカルの年月日から組み立てる。
// Date#toISOString() は UTC に変換してしまうため、日本のような UTC+ のタイムゾーンでは
// 日付が意図せず前日にずれる（例: 1日進めたつもりが変化なし、1日戻すと2日戻る）。
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayString(): string {
  return toDateString(new Date());
}

function shiftDateString(date: string, deltaDays: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return toDateString(d);
}

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

function formatDateJa(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY_JA[d.getDay()]}）`;
}

function draftExercisesFromInitial(initial: WorkoutFormInitial | undefined): DraftExercise[] {
  if (!initial || initial.exercises.length === 0) return [emptyExercise()];
  return initial.exercises.map((ex) => ({
    key: makeKey(),
    name: ex.name,
    sets: ex.sets.length > 0 ? ex.sets.map((s) => ({ key: makeKey(), weight: String(s.weight), reps: String(s.reps) })) : [emptySet()],
  }));
}

export default function WorkoutForm({ initial, banner, submitLabel, onSubmit }: Props) {
  const [date, setDate] = useState(initial?.date ?? todayString());
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [exercises, setExercises] = useState<DraftExercise[]>(() => draftExercisesFromInitial(initial));
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  function openDatePicker() {
    if (Platform.OS === 'android') {
      // Android はダイアログ形式。開いたその場で完結し、コンポーネントの表示状態は不要
      DateTimePickerAndroid.open({
        value: new Date(`${date}T00:00:00`),
        mode: 'date',
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) setDate(toDateString(selected));
        },
      });
    } else {
      // iOS はインラインカレンダーをその場に展開する。もう一度タップすると閉じる
      setShowCalendar((v) => !v);
    }
  }

  useEffect(() => {
    listFrequentExerciseNames().then(setSuggestions);
  }, []);

  function updateExercise(key: string, patch: Partial<DraftExercise>) {
    setExercises((prev) => prev.map((ex) => (ex.key === key ? { ...ex, ...patch } : ex)));
  }

  function removeExercise(key: string) {
    setExercises((prev) => prev.filter((ex) => ex.key !== key));
  }

  function addExercise() {
    setExercises((prev) => [...prev, emptyExercise()]);
  }

  function updateSet(exerciseKey: string, setKey: string, patch: Partial<DraftSet>) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.key !== exerciseKey ? ex : { ...ex, sets: ex.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)) }
      )
    );
  }

  function removeSet(exerciseKey: string, setKey: string) {
    setExercises((prev) =>
      prev.map((ex) => (ex.key !== exerciseKey ? ex : { ...ex, sets: ex.sets.filter((s) => s.key !== setKey) }))
    );
  }

  function addSet(exerciseKey: string) {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.key !== exerciseKey) return ex;
        // 直前のセットと同じ重量・回数を初期値にしておくと、同じセットを繰り返すときに入力が減る
        const last = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { key: makeKey(), weight: last?.weight ?? '', reps: last?.reps ?? '' }] };
      })
    );
  }

  async function handleSave() {
    const cleaned: ExerciseDraft[] = exercises
      .map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets
          .map((s) => ({ weight: Number(s.weight) || 0, reps: Math.trunc(Number(s.reps)) || 0 }))
          .filter((s) => s.reps > 0),
      }))
      .filter((ex) => ex.name !== '' && ex.sets.length > 0);

    if (cleaned.length === 0) {
      Alert.alert('保存できません', '種目名と、レップ数を入力したセットを1つ以上入力してください。');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ date, memo: memo.trim() === '' ? null : memo.trim(), exercises: cleaned });
    } catch (e) {
      Alert.alert('保存に失敗しました', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {banner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}

        <View style={styles.dateRow}>
          <Pressable style={styles.dateArrow} onPress={() => setDate((d) => shiftDateString(d, -1))} hitSlop={8}>
            <Text style={styles.dateArrowText}>◀</Text>
          </Pressable>
          <Pressable style={styles.dateLabelWrap} onPress={openDatePicker}>
            <Text style={styles.dateLabel}>{formatDateJa(date)}</Text>
            <Text style={styles.dateHint}>タップして日付を選択</Text>
          </Pressable>
          <Pressable style={styles.dateArrow} onPress={() => setDate((d) => shiftDateString(d, 1))} hitSlop={8}>
            <Text style={styles.dateArrowText}>▶</Text>
          </Pressable>
        </View>

        {Platform.OS === 'ios' && showCalendar ? (
          <View style={styles.calendarWrap}>
            <DateTimePicker
              value={new Date(`${date}T00:00:00`)}
              mode="date"
              display="inline"
              onChange={(event, selected) => {
                if (event.type === 'set' && selected) setDate(toDateString(selected));
              }}
            />
          </View>
        ) : null}

        <TextInput
          style={styles.memoInput}
          placeholder="メモ（任意）"
          placeholderTextColor={colors.textMuted}
          value={memo}
          onChangeText={setMemo}
        />

        {exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.key}
            index={index}
            exercise={exercise}
            suggestions={suggestions}
            canRemove={exercises.length > 1}
            onChangeName={(name) => updateExercise(exercise.key, { name })}
            onRemoveExercise={() => removeExercise(exercise.key)}
            onChangeSet={(setKey, patch) => updateSet(exercise.key, setKey, patch)}
            onRemoveSet={(setKey) => removeSet(exercise.key, setKey)}
            onAddSet={() => addSet(exercise.key)}
          />
        ))}

        <Pressable style={({ pressed }) => [styles.addExerciseButton, pressed && styles.pressed]} onPress={addExercise}>
          <Text style={styles.addExerciseButtonText}>＋ 種目を追加</Text>
        </Pressable>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? '保存中...' : submitLabel}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

function ExerciseCard({
  index,
  exercise,
  suggestions,
  canRemove,
  onChangeName,
  onRemoveExercise,
  onChangeSet,
  onRemoveSet,
  onAddSet,
}: {
  index: number;
  exercise: DraftExercise;
  suggestions: string[];
  canRemove: boolean;
  onChangeName: (name: string) => void;
  onRemoveExercise: () => void;
  onChangeSet: (setKey: string, patch: Partial<DraftSet>) => void;
  onRemoveSet: (setKey: string) => void;
  onAddSet: () => void;
}) {
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseIndex}>種目 {index + 1}</Text>
        {canRemove ? (
          <Pressable onPress={onRemoveExercise} hitSlop={8}>
            <Text style={styles.removeExerciseText}>種目を削除</Text>
          </Pressable>
        ) : null}
      </View>

      <TextInput
        style={styles.nameInput}
        placeholder="種目名（例: ベンチプレス）"
        placeholderTextColor={colors.textMuted}
        value={exercise.name}
        onChangeText={onChangeName}
      />

      {exercise.name.trim() === '' && suggestions.length > 0 ? (
        <View style={styles.suggestionRow}>
          {suggestions.map((s) => (
            <Pressable key={s} style={styles.suggestionChip} onPress={() => onChangeName(s)}>
              <Text style={styles.suggestionChipText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.setHeaderRow}>
        <Text style={[styles.setHeaderText, styles.setNumberCol]}>セット</Text>
        <Text style={[styles.setHeaderText, styles.setInputCol]}>重量(kg)</Text>
        <Text style={[styles.setHeaderText, styles.setInputCol]}>回数</Text>
        <View style={styles.setRemoveCol} />
      </View>

      {exercise.sets.map((set, setIndex) => (
        <View key={set.key} style={styles.setRow}>
          <Text style={[styles.setNumberText, styles.setNumberCol]}>{setIndex + 1}</Text>
          <TextInput
            style={[styles.setInput, styles.setInputCol]}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={set.weight}
            onChangeText={(weight) => onChangeSet(set.key, { weight })}
          />
          <TextInput
            style={[styles.setInput, styles.setInputCol]}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={set.reps}
            onChangeText={(reps) => onChangeSet(set.key, { reps })}
          />
          <View style={styles.setRemoveCol}>
            {exercise.sets.length > 1 ? (
              <Pressable onPress={() => onRemoveSet(set.key)} hitSlop={8}>
                <Text style={styles.removeSetText}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}

      <Pressable style={({ pressed }) => [styles.addSetButton, pressed && styles.pressed]} onPress={onAddSet}>
        <Text style={styles.addSetButtonText}>＋ セットを追加</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  banner: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bannerText: {
    fontSize: 13,
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
  },
  dateArrow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dateArrowText: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '600',
  },
  dateLabelWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dateHint: {
    fontSize: 11,
    color: colors.accent,
  },
  calendarWrap: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  memoInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseIndex: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  removeExerciseText: {
    fontSize: 13,
    color: '#FF3B30',
  },
  nameInput: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionChipText: {
    fontSize: 13,
    color: colors.text,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setHeaderText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  setNumberCol: {
    width: 40,
  },
  setInputCol: {
    flex: 1,
  },
  setRemoveCol: {
    width: 28,
    alignItems: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumberText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  setInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 15,
    color: colors.text,
  },
  removeSetText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  addSetButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  addSetButtonText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  addExerciseButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addExerciseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  saveButton: {
    margin: 16,
    marginTop: 0,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: '600',
  },
});
