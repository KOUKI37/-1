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

import {
  getLastExercisePerformance,
  listFrequentExerciseNames,
  listNextExerciseSuggestions,
  type ExerciseDraft,
  type ExercisePerformance,
  type NextExerciseSuggestion,
} from '../db/queries';
import { colors } from '../theme/colors';
import { formatDateJa, shiftDateString, toDateString, todayString } from '../utils/date';

/**
 * 記録の入力フォーム（新規作成・編集の両方で使う共通部品）。
 *
 * 呼び出し側は「保存時に何をするか」(onSubmit) だけを渡す。
 * 新規作成なら createWorkoutWithDetails、編集なら updateWorkoutWithDetails を
 * onSubmit の中で呼んでもらう想定。
 */

type DraftSet = { key: string; weight: string; reps: string };
type DraftExercise = { key: string; name: string; memo: string; sets: DraftSet[] };

export type WorkoutFormInitial = {
  date: string;
  exercises: ExerciseDraft[];
};

type Props = {
  initial?: WorkoutFormInitial;
  /** フォーム上部に出す案内文（例: 「複製元」の説明）。不要なら省略する */
  banner?: string;
  submitLabel: string;
  onSubmit: (input: { date: string; exercises: ExerciseDraft[] }) => Promise<void>;
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
  return { key: makeKey(), name: '', memo: '', sets: [emptySet()] };
}

function draftExercisesFromInitial(initial: WorkoutFormInitial | undefined): DraftExercise[] {
  if (!initial || initial.exercises.length === 0) return [emptyExercise()];
  return initial.exercises.map((ex) => ({
    key: makeKey(),
    name: ex.name,
    memo: ex.memo ?? '',
    sets: ex.sets.length > 0 ? ex.sets.map((s) => ({ key: makeKey(), weight: String(s.weight), reps: String(s.reps) })) : [emptySet()],
  }));
}

export default function WorkoutForm({ initial, banner, submitLabel, onSubmit }: Props) {
  const [date, setDate] = useState(initial?.date ?? todayString());
  const [exercises, setExercises] = useState<DraftExercise[]>(() => draftExercisesFromInitial(initial));
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [nextSuggestionsByName, setNextSuggestionsByName] = useState<Record<string, NextExerciseSuggestion[]>>({});
  const [previousPerformanceByName, setPreviousPerformanceByName] = useState<Record<string, ExercisePerformance | null>>({});
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

  // 名前が未入力の種目カードそれぞれについて、「直前の種目の次によく行う種目」を取得する。
  // 直前の種目名ごとに1回だけ問い合わせ、結果は名前をキーにキャッシュして使い回す。
  useEffect(() => {
    const namesToFetch = new Set<string>();
    exercises.forEach((ex, i) => {
      if (ex.name.trim() !== '' || i === 0) return;
      const prevName = exercises[i - 1].name.trim();
      if (prevName !== '' && !(prevName in nextSuggestionsByName)) {
        namesToFetch.add(prevName);
      }
    });
    namesToFetch.forEach((name) => {
      listNextExerciseSuggestions(name).then((rows) => {
        setNextSuggestionsByName((prev) => ({ ...prev, [name]: rows }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises]);

  // 種目名が入力されたら、その種目の前回の記録（重量・レップ数）を調べる。
  // 入力中の1文字ごとに問い合わせないよう、少し待ってから（入力が落ち着いてから）まとめて取得する。
  useEffect(() => {
    const timer = setTimeout(() => {
      const namesToFetch = new Set<string>();
      exercises.forEach((ex) => {
        const name = ex.name.trim();
        if (name !== '' && !(name in previousPerformanceByName)) namesToFetch.add(name);
      });
      namesToFetch.forEach((name) => {
        getLastExercisePerformance(name).then((perf) => {
          setPreviousPerformanceByName((prev) => ({ ...prev, [name]: perf ?? null }));
        });
      });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises]);

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

  function copyPreviousSets(exerciseKey: string, sets: { weight: number; reps: number }[]) {
    const apply = () => {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.key !== exerciseKey
            ? ex
            : { ...ex, sets: sets.map((s) => ({ key: makeKey(), weight: String(s.weight), reps: String(s.reps) })) }
        )
      );
    };

    // すでに何か入力済みなら、無言で上書きせず確認する。まだ空欄（デフォルトの1セットのみ）なら
    // 失うものがないので、確認なしでそのまま反映する。
    const target = exercises.find((ex) => ex.key === exerciseKey);
    const hasEnteredValues = !!target && target.sets.some((s) => s.weight.trim() !== '' || s.reps.trim() !== '');

    if (hasEnteredValues) {
      Alert.alert('入力内容を上書きしますか？', '入力済みのセットが前回の記録に置き換わります。', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '上書きする', style: 'destructive', onPress: apply },
      ]);
    } else {
      apply();
    }
  }

  async function handleSave() {
    const cleaned: ExerciseDraft[] = exercises
      .map((ex) => ({
        name: ex.name.trim(),
        memo: ex.memo.trim() === '' ? null : ex.memo.trim(),
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
      await onSubmit({ date, exercises: cleaned });
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

        {exercises.map((exercise, index) => {
          const prevName = index > 0 ? exercises[index - 1].name.trim() : '';
          const currentName = exercise.name.trim();
          return (
            <ExerciseCard
              key={exercise.key}
              index={index}
              exercise={exercise}
              suggestions={suggestions}
              nextExerciseName={prevName || undefined}
              nextExerciseSuggestions={prevName ? nextSuggestionsByName[prevName] : undefined}
              previousPerformance={currentName ? previousPerformanceByName[currentName] : undefined}
              canRemove={exercises.length > 1}
              onChangeName={(name) => updateExercise(exercise.key, { name })}
              onChangeMemo={(memo) => updateExercise(exercise.key, { memo })}
              onRemoveExercise={() => removeExercise(exercise.key)}
              onChangeSet={(setKey, patch) => updateSet(exercise.key, setKey, patch)}
              onRemoveSet={(setKey) => removeSet(exercise.key, setKey)}
              onAddSet={() => addSet(exercise.key)}
              onCopyPreviousSets={(sets) => copyPreviousSets(exercise.key, sets)}
            />
          );
        })}

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
  nextExerciseName,
  nextExerciseSuggestions,
  previousPerformance,
  canRemove,
  onChangeName,
  onChangeMemo,
  onRemoveExercise,
  onChangeSet,
  onRemoveSet,
  onAddSet,
  onCopyPreviousSets,
}: {
  index: number;
  exercise: DraftExercise;
  suggestions: string[];
  /** 1つ前の種目の名前（あれば）。「◯◯の次によく行う種目」の見出しに使う */
  nextExerciseName?: string;
  /** nextExerciseName の次によく行われる種目。未取得なら undefined、取得済みで0件なら空配列 */
  nextExerciseSuggestions?: NextExerciseSuggestion[];
  /** この種目名での前回の記録。未取得なら undefined、記録なしなら null */
  previousPerformance?: ExercisePerformance | null;
  canRemove: boolean;
  onChangeName: (name: string) => void;
  onChangeMemo: (memo: string) => void;
  onRemoveExercise: () => void;
  onChangeSet: (setKey: string, patch: Partial<DraftSet>) => void;
  onRemoveSet: (setKey: string) => void;
  onAddSet: () => void;
  onCopyPreviousSets: (sets: { weight: number; reps: number }[]) => void;
}) {
  // 「次の種目」の提案があればそれを優先する。なければ、履歴が少ない場合も含めて
  // 「よく使う種目」にフォールバックする。
  const hasNextSuggestions = !!nextExerciseSuggestions && nextExerciseSuggestions.length > 0;
  const suggestionCaption = hasNextSuggestions ? `「${nextExerciseName}」の次によく行う種目` : 'よく使う種目';
  const suggestionChips: { key: string; label: string; onPress: () => void }[] = hasNextSuggestions
    ? nextExerciseSuggestions!.map((s) => ({ key: s.name, label: s.name, onPress: () => onChangeName(s.name) }))
    : suggestions.map((s) => ({ key: s, label: s, onPress: () => onChangeName(s) }));

  const hasPreviousPerformance = !!previousPerformance && previousPerformance.sets.length > 0;

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

      {exercise.name.trim() === '' && suggestionChips.length > 0 ? (
        <View style={styles.suggestionBlock}>
          <Text style={styles.suggestionCaption}>{suggestionCaption}</Text>
          <View style={styles.suggestionRow}>
            {suggestionChips.map((chip) => (
              <Pressable key={chip.key} style={styles.suggestionChip} onPress={chip.onPress}>
                <Text style={styles.suggestionChipText}>{chip.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {exercise.name.trim() !== '' && hasPreviousPerformance ? (
        <View style={styles.previousBlock}>
          <Text style={styles.previousCaption}>前回（{formatDateJa(previousPerformance!.date)}）</Text>
          <Text style={styles.previousValues}>
            {previousPerformance!.sets.map((s) => `${s.weight}kg×${s.reps}回`).join('、')}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.previousCopyButton, pressed && styles.pressed]}
            onPress={() => onCopyPreviousSets(previousPerformance!.sets)}
            hitSlop={8}
          >
            <Text style={styles.previousCopyButtonText}>この内容をコピー</Text>
          </Pressable>
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

      <Pressable style={({ pressed }) => [styles.addSetButton, pressed && styles.pressed]} onPress={onAddSet} hitSlop={8}>
        <Text style={styles.addSetButtonText}>＋ セットを追加</Text>
      </Pressable>

      <TextInput
        style={styles.exerciseMemoInput}
        placeholder="この種目のメモ（任意）"
        placeholderTextColor={colors.textMuted}
        value={exercise.memo}
        onChangeText={onChangeMemo}
      />
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
  suggestionBlock: {
    gap: 6,
  },
  suggestionCaption: {
    fontSize: 12,
    color: colors.textMuted,
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
  previousBlock: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  previousCaption: {
    fontSize: 12,
    color: colors.textMuted,
  },
  previousValues: {
    fontSize: 14,
    color: colors.text,
  },
  previousCopyButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  previousCopyButtonText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
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
  exerciseMemoInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
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
