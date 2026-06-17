import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';

export default function DailyCheckInModal() {
  const { theme, checkInTasks, addPendingReason, dismissCheckIn, moveTask } = useApp();
  const [reason, setReason] = useState('');

  const visible = checkInTasks.length > 0;
  const task = checkInTasks[0];
  const s = styles(theme);

  function handleMarkDone() {
    moveTask(task.id, 'done');
    setReason('');
  }

  function handleSubmitReason() {
    if (!reason.trim()) return;
    addPendingReason(task.id, reason.trim());
    setReason('');
  }

  function handleSkip() {
    dismissCheckIn(task.id);
    setReason('');
  }

  if (!task) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleSkip}>
      <KeyboardAvoidingView style={s.overlay} behavior="padding">
        <Pressable style={s.backdrop} onPress={handleSkip} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Still not done?</Text>
          <Text style={s.subtitle}>{task.description}</Text>

          <Text style={s.question}>Why hasn't this been done today?</Text>
          <TextInput
            style={s.input}
            placeholder="Be honest..."
            placeholderTextColor={theme.subtext}
            value={reason}
            onChangeText={setReason}
            maxLength={150}
            autoFocus
          />

          <TouchableOpacity
            style={[s.submitBtn, !reason.trim() && s.submitBtnDisabled]}
            onPress={handleSubmitReason}
            disabled={!reason.trim()}
          >
            <Text style={s.submitBtnText}>SUBMIT REASON</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.doneBtn} onPress={handleMarkDone}>
            <Text style={s.doneBtnText}>Actually, it's done — mark as done</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
            <Text style={s.skipText}>Skip for now</Text>
          </TouchableOpacity>

          {checkInTasks.length > 1 && (
            <Text style={s.counter}>{checkInTasks.length - 1} more pending after this</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = t =>
  StyleSheet.create({
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
      width: 36,
      height: 4,
      backgroundColor: t.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: { fontSize: 20, fontWeight: '800', color: t.accent, marginBottom: 6 },
    subtitle: { fontSize: 15, color: t.text, fontWeight: '600', marginBottom: 18 },
    question: { fontSize: 13, color: t.subtext, fontStyle: 'italic', marginBottom: 8 },
    input: {
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      color: t.text,
      fontSize: 14,
      padding: 12,
      marginBottom: 16,
    },
    submitBtn: {
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginBottom: 10,
    },
    submitBtnDisabled: { opacity: 0.35 },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
    doneBtn: { alignItems: 'center', paddingVertical: 10 },
    doneBtnText: { color: t.accent, fontSize: 14, fontWeight: '700' },
    skipBtn: { alignItems: 'center', paddingVertical: 8 },
    skipText: { color: t.subtext, fontSize: 14 },
    counter: { textAlign: 'center', color: t.subtext, fontSize: 11, marginTop: 8 },
  });
