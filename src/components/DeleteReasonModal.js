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

const REASONS = ['Done elsewhere', 'Not relevant', 'Added by mistake', 'I am a LOSER!', 'Just cannot do it!!!'];

export default function DeleteReasonModal({ visible, onClose, onConfirm }) {
  const { theme } = useApp();
  const [selected, setSelected] = useState(null);
  const [customReason, setCustomReason] = useState('');

  function handleConfirm() {
    const reason = customReason.trim() || selected;
    onConfirm(reason);
    reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function reset() {
    setSelected(null);
    setCustomReason('');
  }

  const canConfirm = selected !== null || customReason.trim().length > 0;
  const s = styles(theme);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.overlay} behavior="padding">
        <Pressable style={s.backdrop} onPress={handleClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Why are you deleting this?</Text>
          <Text style={s.subtitle}>Be honest with yourself.</Text>

          <View style={s.chipsRow}>
            {REASONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[s.chip, selected === r && s.chipSelected]}
                onPress={() => setSelected(prev => prev === r ? null : r)}
              >
                <Text style={[s.chipText, selected === r && s.chipTextSelected]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={s.input}
            placeholder="Or type your own reason..."
            placeholderTextColor={theme.subtext}
            value={customReason}
            onChangeText={setCustomReason}
            maxLength={150}
          />

          <TouchableOpacity
            style={[s.deleteBtn, !canConfirm && s.deleteBtnDisabled]}
            onPress={handleConfirm}
            disabled={!canConfirm}
          >
            <Text style={s.deleteBtnText}>DELETE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
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
    title: { fontSize: 20, fontWeight: '800', color: t.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: t.subtext, fontStyle: 'italic', marginBottom: 20 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: t.border,
    },
    chipSelected: { backgroundColor: t.accentLight, borderColor: t.accent },
    chipText: { fontSize: 13, color: t.subtext, fontWeight: '600' },
    chipTextSelected: { color: t.accent },
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
    deleteBtn: {
      backgroundColor: t.destructive,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginBottom: 10,
    },
    deleteBtnDisabled: { opacity: 0.35 },
    deleteBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
    cancelBtn: { alignItems: 'center', paddingVertical: 8 },
    cancelText: { color: t.subtext, fontSize: 14 },
  });
