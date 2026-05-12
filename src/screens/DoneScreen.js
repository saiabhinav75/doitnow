import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import TaskCard from '../components/TaskCard';

function getDayLabel(ts) {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDay(tasks) {
  const groups = {};
  for (const task of tasks) {
    const label = getDayLabel(task.completedAt);
    if (!groups[label]) groups[label] = { label, ts: task.completedAt, tasks: [] };
    groups[label].tasks.push(task);
  }
  return Object.values(groups)
    .sort((a, b) => b.ts - a.ts)
    .map(g => ({ title: g.label, data: g.tasks.sort((a, b) => b.completedAt - a.completedAt) }));
}

export default function DoneScreen() {
  const { theme, tasks } = useApp();

  const doneTasks = tasks.filter(t => t.status === 'done');
  const sections = groupByDay(doneTasks);
  const totalDone = doneTasks.length;

  const s = styles(theme);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Done</Text>
        {totalDone > 0 && (
          <Text style={s.headerCount}>{totalDone} completed</Text>
        )}
      </View>

      {sections.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyTitle}>Nothing done yet.</Text>
          <Text style={s.emptySubtitle}>Go finish something.</Text>
        </View>
      ) : (
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
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = t =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    headerTitle: { fontSize: 26, fontWeight: '800', color: t.text },
    headerCount: { fontSize: 13, color: t.subtext },
    list: { padding: 16, paddingBottom: 40 },
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
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text },
    emptySubtitle: { fontSize: 14, color: t.subtext },
  });
