import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

function TrashItem({ task, theme }) {
  const { permanentlyDeleteTask } = useApp();

  function handleDelete() {
    Alert.alert('Delete Forever', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => permanentlyDeleteTask(task.id) },
    ]);
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const s = styles(theme);

  return (
    <View style={s.item}>
      <View style={s.itemContent}>
        <Text style={s.itemDesc} numberOfLines={2}>{task.description}</Text>
        <Text style={s.itemMeta}>Deleted {formatDate(task.deletedAt)}</Text>
        {task.deleteReason && (
          <View style={s.reasonPill}>
            <Text style={s.reasonText}>{task.deleteReason}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={s.deleteForeverBtn} onPress={handleDelete}>
        <Text style={s.deleteForeverText}>Delete Forever</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TrashModal({ visible, onClose }) {
  const { theme, tasks, emptyTrash } = useApp();
  const deleted = tasks.filter(t => t.status === 'deleted').sort((a, b) => b.deletedAt - a.deletedAt);

  function handleEmptyTrash() {
    Alert.alert('Empty Trash', `Permanently delete all ${deleted.length} items?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Empty Trash', style: 'destructive', onPress: emptyTrash },
    ]);
  }

  const s = styles(theme);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Trash</Text>
          {deleted.length > 0 && (
            <TouchableOpacity onPress={handleEmptyTrash} style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>Empty</Text>
            </TouchableOpacity>
          )}
        </View>

        {deleted.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🗑️</Text>
            <Text style={s.emptyTitle}>Trash is empty.</Text>
            <Text style={s.emptySubtitle}>Nothing to regret here.</Text>
          </View>
        ) : (
          <FlatList
            data={deleted}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <TrashItem task={item} theme={theme} />}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = t =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    backBtn: { paddingRight: 16 },
    backText: { fontSize: 15, color: t.accent, fontWeight: '600' },
    title: { flex: 1, fontSize: 18, fontWeight: '800', color: t.text, textAlign: 'center' },
    emptyBtn: { paddingLeft: 16 },
    emptyBtnText: { fontSize: 14, color: t.destructive, fontWeight: '600' },
    list: { padding: 16, paddingBottom: 40 },
    item: {
      backgroundColor: t.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      padding: 14,
      marginBottom: 10,
      gap: 10,
    },
    itemContent: { gap: 5 },
    itemDesc: { fontSize: 14, color: t.subtext, lineHeight: 20 },
    itemMeta: { fontSize: 11, color: t.subtext },
    reasonPill: {
      alignSelf: 'flex-start',
      backgroundColor: t.sectionHeader,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 2,
    },
    reasonText: { fontSize: 11, color: t.subtext, fontStyle: 'italic' },
    deleteForeverBtn: {
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.destructive,
    },
    deleteForeverText: { fontSize: 12, color: t.destructive, fontWeight: '600' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text },
    emptySubtitle: { fontSize: 14, color: t.subtext },
  });
