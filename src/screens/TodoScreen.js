import { useState } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import AddTaskModal from '../components/AddTaskModal';
import TaskCard from '../components/TaskCard';
import TrashModal from '../components/TrashModal';
import MessagesModal from '../components/MessagesModal';

export default function TodoScreen({ navigation }) {
  const { theme, tasks, isDark, toggleTheme } = useApp();
  const [addVisible, setAddVisible] = useState(false);
  const [trashVisible, setTrashVisible] = useState(false);
  const [messagesVisible, setMessagesVisible] = useState(false);

  const todoTasks = tasks
    .filter(t => t.status === 'todo')
    .sort((a, b) => b.createdAt - a.createdAt);

  const laterTasks = tasks
    .filter(t => t.status === 'later')
    .sort((a, b) => b.createdAt - a.createdAt);

  const sections = [
    { title: 'Todo', data: todoTasks },
    { title: 'Todo Later', data: laterTasks },
  ].filter(s => s.data.length > 0 || s.title === 'Todo');

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.appTitle}>DO IT</Text>
          <Text style={s.appSub}>or regret it</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={toggleTheme} style={s.iconBtn}>
            <Text style={s.iconBtnText}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMessagesVisible(true)} style={s.iconBtn}>
            <Text style={s.iconBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTrashVisible(true)} style={s.iconBtn}>
            <Text style={s.iconBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TaskCard task={item} />}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <Text style={s.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <View style={s.emptySectionState}>
              <Text style={s.emptySectionText}>Nothing here yet. Add something.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      <TouchableOpacity style={s.fab} onPress={() => setAddVisible(true)} activeOpacity={0.85}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <AddTaskModal visible={addVisible} onClose={() => setAddVisible(false)} />
      <TrashModal visible={trashVisible} onClose={() => setTrashVisible(false)} />
      <MessagesModal visible={messagesVisible} onClose={() => setMessagesVisible(false)} />
    </SafeAreaView>
  );
}

const styles = t =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    appTitle: { fontSize: 36, fontWeight: '900', color: t.accent, letterSpacing: 3 },
    appSub: { fontSize: 11, color: t.subtext, letterSpacing: 3, textTransform: 'uppercase' },
    headerActions: { flexDirection: 'row', gap: 4, marginTop: 4 },
    iconBtn: { padding: 8 },
    iconBtnText: { fontSize: 20 },
    list: { padding: 16, paddingBottom: 100 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.sectionHeader,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginBottom: 10,
      marginTop: 4,
    },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: t.subtext, letterSpacing: 1.5, textTransform: 'uppercase' },
    sectionCount: { fontSize: 12, fontWeight: '700', color: t.subtext },
    emptySectionState: { paddingVertical: 24, alignItems: 'center', marginBottom: 8 },
    emptySectionText: { fontSize: 14, color: t.subtext, fontStyle: 'italic' },
    fab: {
      position: 'absolute',
      bottom: 28,
      right: 24,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 8,
    },
    fabText: { fontSize: 30, color: '#fff', lineHeight: 34 },
  });
