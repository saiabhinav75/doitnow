import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
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
const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const DAYS    = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getYears() {
  const y = new Date().getFullYear();
  return [y, y + 1, y + 2];
}

function TimeColumn({ items, selectedIndex, onSelect, theme, width = 64 }) {
  const ref = useRef(null);
  const multiplied = [...items, ...items, ...items];
  const s = colStyles(theme);

  function centerY(idx) {
    return (items.length + idx - 1) * ITEM_H;
  }

  useEffect(() => {
    ref.current?.scrollTo({ y: centerY(selectedIndex), animated: false });
  }, [selectedIndex]);

  function onMomentumScrollEnd(e) {
    const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const actual = (((raw + 1) % items.length) + items.length) % items.length;
    ref.current?.scrollTo({ y: centerY(actual), animated: false });
    onSelect(actual);
  }

  return (
    <View style={[s.column, { width }]}>
      <ScrollView
        ref={ref}
        style={[s.scroll, { width }]}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
      >
        {multiplied.map((item, i) => {
          const actualIdx = i % items.length;
          return (
            <View key={i} style={[s.item, { width }]}>
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
      <Text style={s.sep}>:</Text>
      <TimeColumn items={MINUTES} selectedIndex={minute} onSelect={onMinuteChange} theme={theme} />
    </View>
  );
}

function DeadlinePicker({ day, month, year, hour, minute, onDayChange, onMonthChange, onYearChange, onHourChange, onMinuteChange, theme }) {
  const years = getYears();
  const s = pickerStyles(theme);
  const ds = deadlinePickerStyles(theme);

  return (
    <View style={ds.container}>
      <View style={s.picker}>
        <TimeColumn items={DAYS}   selectedIndex={day}   onSelect={onDayChange}   theme={theme} width={52} />
        <TimeColumn items={MONTHS} selectedIndex={month} onSelect={onMonthChange} theme={theme} width={56} />
        <View style={ds.yearPicker}>
          <TouchableOpacity onPress={() => onYearChange(Math.max(0, year - 1))} style={ds.yearBtn}>
            <Text style={ds.yearBtnText}>▲</Text>
          </TouchableOpacity>
          <Text style={ds.yearText}>{years[year]}</Text>
          <TouchableOpacity onPress={() => onYearChange(Math.min(years.length - 1, year + 1))} style={ds.yearBtn}>
            <Text style={ds.yearBtnText}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={[s.picker, { marginTop: 6 }]}>
        <TimeColumn items={HOURS}   selectedIndex={hour}   onSelect={onHourChange}   theme={theme} />
        <Text style={s.sep}>:</Text>
        <TimeColumn items={MINUTES} selectedIndex={minute} onSelect={onMinuteChange} theme={theme} />
      </View>
    </View>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function toHHMM(h, m) {
  return `${HOURS[h]}:${MINUTES[m]}`;
}

function fromHHMM(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return { h, m };
}

function toDeadlineTs(day, month, yearIdx, hour, minute) {
  const years = getYears();
  const d = new Date(years[yearIdx], month, day + 1, hour, minute, 0, 0);
  return d.getTime();
}

function fromDeadlineTs(ts) {
  const d = new Date(ts);
  const years = getYears();
  const yearIdx = Math.max(0, years.indexOf(d.getFullYear()));
  return {
    day:    d.getDate() - 1,
    month:  d.getMonth(),
    yearIdx: yearIdx < 0 ? 0 : yearIdx,
    hour:   d.getHours(),
    minute: d.getMinutes(),
  };
}

function formatDeadline(day, month, yearIdx, hour, minute) {
  const years = getYears();
  return `${DAYS[day]} ${MONTHS[month]} ${years[yearIdx]}  ${HOURS[hour]}:${MINUTES[minute]}`;
}

function formatReminderDisplay(h, m) {
  return `${HOURS[h]}:${MINUTES[m]}`;
}

// ── main component ────────────────────────────────────────────────────────────

export default function AddTaskModal({ visible, onClose, task = null }) {
  const { theme, addTask, editTask } = useApp();
  const isEdit = task !== null;

  const [text, setText] = useState('');
  const [isDaily, setIsDaily] = useState(false);

  const [reminderOn, setReminderOn] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [rHour, setRHour] = useState(9);
  const [rMinute, setRMinute] = useState(0);

  const [deadlineOn, setDeadlineOn] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [dDay,    setDDay]    = useState(new Date().getDate() - 1);
  const [dMonth,  setDMonth]  = useState(new Date().getMonth());
  const [dYear,   setDYear]   = useState(0);
  const [dHour,   setDHour]   = useState(23);
  const [dMinute, setDMinute] = useState(59);

  useEffect(() => {
    if (!visible) return;
    if (isEdit) {
      setText(task.description);
      setIsDaily(!!task.isDaily);
      if (task.reminderTime) {
        const { h, m } = fromHHMM(task.reminderTime);
        setReminderOn(true); setRHour(h); setRMinute(m);
      } else {
        setReminderOn(false); setRHour(9); setRMinute(0);
      }
      if (task.deadlineAt) {
        const { day, month, yearIdx, hour, minute } = fromDeadlineTs(task.deadlineAt);
        setDeadlineOn(true);
        setDDay(day); setDMonth(month); setDYear(yearIdx);
        setDHour(hour); setDMinute(minute);
      } else {
        setDeadlineOn(false);
        setDDay(new Date().getDate() - 1); setDMonth(new Date().getMonth());
        setDYear(0); setDHour(23); setDMinute(59);
      }
    } else {
      setText('');
      setIsDaily(false);
      setReminderOn(false); setShowReminderPicker(false); setRHour(9); setRMinute(0);
      setDeadlineOn(false); setShowDeadlinePicker(false);
      setDDay(new Date().getDate() - 1); setDMonth(new Date().getMonth());
      setDYear(0); setDHour(23); setDMinute(59);
    }
  }, [visible]);

  function handleSubmit() {
    if (!canSubmit) return;
    Keyboard.dismiss();
    const reminderTime = reminderOn ? toHHMM(rHour, rMinute) : null;
    const deadlineAt   = deadlineOn ? toDeadlineTs(dDay, dMonth, dYear, dHour, dMinute) : null;
    if (isEdit) editTask(task.id, text.trim(), reminderTime, deadlineAt, isDaily);
    else addTask(text.trim(), reminderTime, deadlineAt, isDaily);
    handleClose();
  }

  function handleClose() {
    Keyboard.dismiss();
    setShowReminderPicker(false);
    setShowDeadlinePicker(false);
    onClose();
  }

  function openReminderPicker() {
    Keyboard.dismiss();
    setShowReminderPicker(p => !p);
  }

  function openDeadlinePicker() {
    Keyboard.dismiss();
    setShowDeadlinePicker(p => !p);
  }

  const deadlineTs = deadlineOn ? toDeadlineTs(dDay, dMonth, dYear, dHour, dMinute) : null;
  const deadlineIsPast = deadlineTs !== null && deadlineTs <= Date.now();
  const canSubmit = text.trim() && !deadlineIsPast;

  const s = styles(theme);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.overlay} behavior="padding">
        <Pressable style={s.backdrop} onPress={handleClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled={true}
          >
            <Text style={s.title}>{isEdit ? 'Edit Task' : 'New Task'}</Text>
            <Text style={s.subtitle}>
              {isEdit ? 'Update what needs to be done.' : 'What will you regret not doing?'}
            </Text>

            <View style={s.inputWrapper}>
              <TextInput
                style={s.input}
                placeholder="Describe the task..."
                placeholderTextColor={theme.subtext}
                value={text}
                onChangeText={setText}
                multiline
                autoFocus
                maxLength={300}
                blurOnSubmit={true}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                textAlignVertical="top"
              />
              <TouchableOpacity style={s.dismissKeyboardBtn} onPress={Keyboard.dismiss}>
                <Text style={s.dismissKeyboardText}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* ── Repeat daily ── */}
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>🔁  Repeat daily</Text>
              <Switch
                value={isDaily}
                onValueChange={setIsDaily}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={isDaily ? '#fff' : theme.subtext}
              />
            </View>
            {isDaily && (
              <Text style={[s.hint, { marginBottom: 10 }]}>
                Resets to Todo each day after you mark it done. You'll be asked daily if it's still pending.
              </Text>
            )}

            {/* ── Reminder ── */}
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>🔔  Daily reminder</Text>
              <Switch
                value={reminderOn}
                onValueChange={v => { setReminderOn(v); if (!v) setShowReminderPicker(false); }}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={reminderOn ? '#fff' : theme.subtext}
              />
            </View>
            {reminderOn && (
              <View style={s.pickerSection}>
                <TouchableOpacity style={s.timeBtn} onPress={openReminderPicker}>
                  <Text style={s.timeBtnText}>{formatReminderDisplay(rHour, rMinute)}</Text>
                  <Text style={s.timeBtnChevron}>{showReminderPicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                <Text style={s.hint}>Reminds you daily for 3 days</Text>
                {showReminderPicker && (
                  <TimePicker
                    hour={rHour} minute={rMinute}
                    onHourChange={setRHour} onMinuteChange={setRMinute}
                    theme={theme}
                  />
                )}
              </View>
            )}

            {/* ── Deadline ── */}
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>📅  Set deadline</Text>
              <Switch
                value={deadlineOn}
                onValueChange={v => { setDeadlineOn(v); if (!v) setShowDeadlinePicker(false); }}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={deadlineOn ? '#fff' : theme.subtext}
              />
            </View>
            {deadlineOn && (
              <View style={s.pickerSection}>
                <TouchableOpacity style={s.timeBtn} onPress={openDeadlinePicker}>
                  <Text style={s.timeBtnText}>{formatDeadline(dDay, dMonth, dYear, dHour, dMinute)}</Text>
                  <Text style={s.timeBtnChevron}>{showDeadlinePicker ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {deadlineIsPast
                  ? <Text style={s.deadlineError}>Deadline must be in the future</Text>
                  : <Text style={s.hint}>Notifies 12h, 6h, 1h before · every 6h after for 2 days</Text>
                }
                {showDeadlinePicker && (
                  <DeadlinePicker
                    day={dDay} month={dMonth} year={dYear} hour={dHour} minute={dMinute}
                    onDayChange={setDDay} onMonthChange={setDMonth} onYearChange={setDYear}
                    onHourChange={setDHour} onMinuteChange={setDMinute}
                    theme={theme}
                  />
                )}
              </View>
            )}

            <TouchableOpacity
              style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              <Text style={s.submitBtnText}>{isEdit ? 'SAVE CHANGES' : 'ADD TASK'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const colStyles = t => StyleSheet.create({
  column: { position: 'relative' },
  scroll: { height: ITEM_H * 3 },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 18, color: t.subtext, fontWeight: '500' },
  itemTextSelected: { color: t.text, fontWeight: '800', fontSize: 20 },
  highlight: {
    position: 'absolute', top: ITEM_H, left: 4, right: 4, height: ITEM_H,
    borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: t.accent, borderRadius: 4,
  },
});

const pickerStyles = t => StyleSheet.create({
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: t.border,
    paddingVertical: 4, overflow: 'hidden',
  },
  sep: { fontSize: 24, fontWeight: '900', color: t.text, marginHorizontal: 2, marginBottom: 2 },
});

const deadlinePickerStyles = t => StyleSheet.create({
  container: { gap: 0 },
  yearPicker: {
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
    height: ITEM_H * 3,
  },
  yearBtn: { padding: 6 },
  yearBtnText: { fontSize: 12, color: t.accent, fontWeight: '700' },
  yearText: { fontSize: 16, fontWeight: '800', color: t.text, marginVertical: 4 },
});

const styles = t => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: t.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderColor: t.border,
    maxHeight: '92%',
  },
  handle: {
    width: 36, height: 4, backgroundColor: t.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: t.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: t.subtext, fontStyle: 'italic', marginBottom: 16 },
  inputWrapper: { marginBottom: 16 },
  input: {
    backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12,
    color: t.text, fontSize: 15, padding: 14, minHeight: 90,
    textAlignVertical: 'top',
  },
  dismissKeyboardBtn: {
    alignSelf: 'flex-end', marginTop: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: t.sectionHeader, borderRadius: 8,
  },
  dismissKeyboardText: { fontSize: 13, color: t.accent, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  toggleLabel: { fontSize: 15, color: t.text, fontWeight: '600' },
  pickerSection: { marginBottom: 16, gap: 6 },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: t.accentLight, borderWidth: 1, borderColor: t.accent,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, gap: 8,
  },
  timeBtnText: { fontSize: 15, fontWeight: '700', color: t.accent },
  timeBtnChevron: { fontSize: 10, color: t.accent },
  hint: { fontSize: 12, color: t.subtext, fontStyle: 'italic' },
  deadlineError: { fontSize: 12, color: t.destructive, fontWeight: '600' },
  submitBtn: {
    backgroundColor: t.accent, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10, marginTop: 6,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: t.subtext, fontSize: 14 },
});
