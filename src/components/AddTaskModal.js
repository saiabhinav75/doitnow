import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';

const ITEM_H = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// 3 repeats — enough to scroll freely; silently re-centers on each stop
const REPEAT = 3;

function TimeColumn({ items, selectedIndex, onSelect, theme }) {
  const ref = useRef(null);
  const multiplied = [...items, ...items, ...items];
  const s = colStyles(theme);

  // Subtract ITEM_H so the selected item lands on the middle row, not the top
  function centerY(idx) {
    return (items.length + idx - 1) * ITEM_H;
  }

  useEffect(() => {
    ref.current?.scrollTo({ y: centerY(selectedIndex), animated: false });
  }, [selectedIndex]);

  function onMomentumScrollEnd(e) {
    const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    // +1 because contentOffset points to the top row; selected is the middle row
    const actual = (((raw + 1) % items.length) + items.length) % items.length;
    ref.current?.scrollTo({ y: centerY(actual), animated: false });
    onSelect(actual);
  }

  return (
    <View style={s.column}>
      <ScrollView
        ref={ref}
        style={s.scroll}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
      >
        {multiplied.map((item, i) => {
          const actualIdx = i % items.length;
          return (
            <View key={i} style={s.item}>
              <Text style={[s.itemText, actualIdx === selectedIndex && s.itemTextSelected]}>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={s.highlight} pointerEvents="none" />
    </View>
  );
}

function TimePicker({ hour, minute, onHourChange, onMinuteChange, theme }) {
  const s = pickerStyles(theme);
  return (
    <View style={s.picker}>
      <TimeColumn items={HOURS} selectedIndex={hour} onSelect={onHourChange} theme={theme} />
      <Text style={s.colon}>:</Text>
      <TimeColumn items={MINUTES} selectedIndex={minute} onSelect={onMinuteChange} theme={theme} />
    </View>
  );
}

function toHHMM(hour, minute) {
  return `${HOURS[hour]}:${MINUTES[minute]}`;
}

function fromHHMM(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return { hourIdx: h, minIdx: m };
}

function formatDisplay(hour, minute) {
  return `${HOURS[hour]}:${MINUTES[minute]}`;
}

export default function AddTaskModal({ visible, onClose, task = null }) {
  const { theme, addTask, editTask } = useApp();
  const isEdit = task !== null;

  const [text, setText] = useState('');
  const [reminderOn, setReminderOn] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (isEdit) {
      setText(task.description);
      if (task.reminderTime) {
        const { hourIdx, minIdx } = fromHHMM(task.reminderTime);
        setReminderOn(true);
        setHour(hourIdx);
        setMinute(minIdx);
      } else {
        setReminderOn(false);
        setHour(9); setMinute(0);
      }
    } else {
      setText('');
      setReminderOn(false);
      setShowPicker(false);
      setHour(9); setMinute(0);
    }
  }, [visible]);

  function handleSubmit() {
    if (!text.trim()) return;
    const reminderTime = reminderOn ? toHHMM(hour, minute) : null;
    if (isEdit) editTask(task.id, text.trim(), reminderTime);
    else addTask(text.trim(), reminderTime);
    handleClose();
  }

  function handleClose() {
    setShowPicker(false);
    onClose();
  }

  const s = styles(theme);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>{isEdit ? 'Edit Task' : 'New Task'}</Text>
          <Text style={s.subtitle}>
            {isEdit ? 'Update what needs to be done.' : 'What will you regret not doing?'}
          </Text>

          <TextInput
            style={s.input}
            placeholder="Describe the task..."
            placeholderTextColor={theme.subtext}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={300}
            returnKeyType="done"
          />

          <View style={s.reminderRow}>
            <Text style={s.reminderLabel}>🔔  Remind me</Text>
            <Switch
              value={reminderOn}
              onValueChange={v => { setReminderOn(v); if (!v) setShowPicker(false); }}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor={reminderOn ? '#fff' : theme.subtext}
            />
          </View>

          {reminderOn && (
            <View style={s.reminderDetail}>
              <TouchableOpacity
                style={s.timeBtn}
                onPress={() => setShowPicker(p => !p)}
                activeOpacity={0.8}
              >
                <Text style={s.timeBtnText}>{formatDisplay(hour, minute)}</Text>
                <Text style={s.timeBtnChevron}>{showPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              <Text style={s.reminderHint}>Daily for 3 days starting tomorrow</Text>

              {showPicker && (
                <TimePicker
                  hour={hour} minute={minute}
                  onHourChange={setHour} onMinuteChange={setMinute}
                  theme={theme}
                />
              )}
            </View>
          )}

          <TouchableOpacity
            style={[s.submitBtn, !text.trim() && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!text.trim()}
            activeOpacity={0.8}
          >
            <Text style={s.submitBtnText}>{isEdit ? 'SAVE CHANGES' : 'ADD TASK'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const colStyles = t => StyleSheet.create({
  column: { position: 'relative' },
  scroll: { height: ITEM_H * 3, width: 64 },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 20, color: t.subtext, fontWeight: '500' },
  itemTextSelected: { color: t.text, fontWeight: '800', fontSize: 23 },
  highlight: {
    position: 'absolute',
    top: ITEM_H,
    left: 4,
    right: 4,
    height: ITEM_H,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: t.accent,
    borderRadius: 4,
  },
});

const pickerStyles = t => StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    paddingVertical: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  colon: { fontSize: 26, fontWeight: '900', color: t.text, marginHorizontal: 2, marginBottom: 2 },
});

const styles = t => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: t.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: t.border,
  },
  handle: {
    width: 36, height: 4, backgroundColor: t.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: t.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: t.subtext, fontStyle: 'italic', marginBottom: 16 },
  input: {
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    color: t.text,
    fontSize: 15,
    padding: 14,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  reminderLabel: { fontSize: 15, color: t.text, fontWeight: '600' },
  reminderDetail: { marginBottom: 16, gap: 6 },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: t.accentLight, borderWidth: 1, borderColor: t.accent,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, gap: 8,
  },
  timeBtnText: { fontSize: 16, fontWeight: '700', color: t.accent },
  timeBtnChevron: { fontSize: 10, color: t.accent },
  reminderHint: { fontSize: 12, color: t.subtext, fontStyle: 'italic' },
  submitBtn: {
    backgroundColor: t.accent, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: t.subtext, fontSize: 14 },
});
