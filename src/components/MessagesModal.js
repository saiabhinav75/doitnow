import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

const SECTIONS = [
  { key: 'reminder',     label: 'Reminder',      hint: 'Sent at your daily reminder time' },
  { key: 'nearDeadline', label: 'Near Deadline',  hint: '12h, 6h and 1h before deadline' },
  { key: 'postDeadline', label: 'Post Deadline',  hint: '1 hour after deadline passes' },
];

function MessageSection({ section, messages, onAdd, onDelete, theme }) {
  const [input, setInput] = useState('');
  const s = sectionStyles(theme);
  const list = messages[section.key] || [];

  function handleAdd() {
    if (!input.trim()) return;
    onAdd(section.key, input.trim());
    setInput('');
  }

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{section.label}</Text>
        <Text style={s.sectionCount}>{list.length} messages</Text>
      </View>
      <Text style={s.sectionHint}>{section.hint}</Text>

      {list.map((msg, i) => (
        <View key={i} style={s.msgRow}>
          <Text style={s.msgText} numberOfLines={3}>{msg}</Text>
          {list.length > 1 && (
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={() => onDelete(section.key, i)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <View style={s.addRow}>
        <TextInput
          style={s.addInput}
          placeholder="Add a message..."
          placeholderTextColor={theme.subtext}
          value={input}
          onChangeText={setInput}
          maxLength={120}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[s.addBtn, !input.trim() && s.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!input.trim()}
        >
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MessagesModal({ visible, onClose }) {
  const { theme, messages, updateMessages } = useApp();
  const s = styles(theme);

  function handleAdd(category, text) {
    updateMessages(category, [...(messages[category] || []), text]);
  }

  function handleDelete(category, index) {
    const updated = (messages[category] || []).filter((_, i) => i !== index);
    updateMessages(category, updated);
  }

  function handleReset() {
    Alert.alert('Reset Messages', 'Restore all messages to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => updateMessages('__reset__', null) },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Messages</Text>
          <TouchableOpacity onPress={handleReset} style={s.resetBtn}>
            <Text style={s.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={SECTIONS}
          keyExtractor={item => item.key}
          renderItem={({ item }) => (
            <MessageSection
              section={item}
              messages={messages}
              onAdd={handleAdd}
              onDelete={handleDelete}
              theme={theme}
            />
          )}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const sectionStyles = t => StyleSheet.create({
  section: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: t.text, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionCount: { fontSize: 11, color: t.subtext },
  sectionHint: { fontSize: 11, color: t.subtext, fontStyle: 'italic', marginBottom: 12 },
  msgRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border, gap: 8,
  },
  msgText: { flex: 1, fontSize: 14, color: t.text, lineHeight: 20 },
  deleteBtn: { paddingTop: 2 },
  deleteBtnText: { fontSize: 14, color: t.subtext },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  addInput: {
    flex: 1, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border,
    borderRadius: 10, color: t.text, fontSize: 14, paddingHorizontal: 12, paddingVertical: 9,
  },
  addBtn: {
    backgroundColor: t.accent, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  addBtnDisabled: { opacity: 0.35 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

const styles = t => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: t.border,
  },
  backBtn: { paddingRight: 16 },
  backText: { fontSize: 15, color: t.accent, fontWeight: '600' },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: t.text, textAlign: 'center' },
  resetBtn: { paddingLeft: 16 },
  resetText: { fontSize: 14, color: t.subtext },
  list: { padding: 16, paddingBottom: 40 },
});
