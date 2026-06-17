import { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import DeleteReasonModal from './DeleteReasonModal';
import AddTaskModal from './AddTaskModal';

export default function TaskCard({ task }) {
  const { theme, moveTask, deleteTask } = useApp();
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const dotsRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function openMenu() {
    dotsRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPos({ top: y + height + 4, right: 16 });
      setMenuVisible(true);
    });
  }

  function handleMove(status) {
    setMenuVisible(false);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start(() => moveTask(task.id, status));
  }

  function handleEditPress() {
    setMenuVisible(false);
    setEditVisible(true);
  }

  function handleDeletePress() {
    setMenuVisible(false);
    setDeleteModalVisible(true);
  }

  function handleDeleteConfirm(reason) {
    setDeleteModalVisible(false);
    deleteTask(task.id, reason);
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDeadline(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      + '  ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  const isLater = task.status === 'later';
  const isDone  = task.status === 'done';
  const isOverdue = task.deadlineAt && task.deadlineAt < Date.now() && !isDone;
  const canEdit = task.status === 'todo' || task.status === 'later';
  const s = styles(theme);

  const menuOptions = [];
  if (canEdit) {
    menuOptions.push({ label: 'Edit Task', onPress: handleEditPress });
  }
  if (task.status === 'todo') {
    menuOptions.push({ label: 'Move to Done', onPress: () => handleMove('done') });
    menuOptions.push({ label: 'Move to Later', onPress: () => handleMove('later') });
  }
  if (task.status === 'later') {
    menuOptions.push({ label: 'Move to Todo', onPress: () => handleMove('todo') });
    menuOptions.push({ label: 'Move to Done', onPress: () => handleMove('done') });
  }
  if (task.status === 'done') {
    menuOptions.push({ label: 'Move to Todo', onPress: () => handleMove('todo') });
  }
  menuOptions.push({ label: 'Delete Task', onPress: handleDeletePress, destructive: true });

  return (
    <>
      <Animated.View style={[s.card, isLater && s.cardLater, { transform: [{ scale: scaleAnim }] }]}>
        <View style={s.content}>
          <Text style={[s.description, isDone && s.descriptionDone, isLater && s.descriptionLater]}>
            {task.description}
          </Text>
          <View style={s.metaRow}>
            <Text style={s.meta}>
              {isDone
                ? `Completed ${formatDate(task.completedAt)}`
                : `Added ${formatDate(task.createdAt)}`}
            </Text>
            {task.reminderTime && !isDone && (
              <View style={s.reminderBadge}>
                <Text style={s.reminderBadgeText}>🔔 {task.reminderTime}</Text>
              </View>
            )}
            {task.isDaily && (
              <View style={s.reminderBadge}>
                <Text style={s.reminderBadgeText}>🔁 Daily</Text>
              </View>
            )}
          </View>
          {task.deadlineAt && !isDone && (
            <View style={[s.deadlineRow, isOverdue && s.deadlineRowOverdue]}>
              <Text style={[s.deadlineText, isOverdue && s.deadlineTextOverdue]}>
                {isOverdue ? '⚠️ Overdue · ' : '📅 Due · '}
                {formatDeadline(task.deadlineAt)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          ref={dotsRef}
          style={s.dotsBtn}
          onPress={openMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.dotsText}>⋮</Text>
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
        <View style={[s.menu, { top: menuPos.top, right: menuPos.right }]}>
          {menuOptions.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[s.menuItem, i < menuOptions.length - 1 && s.menuItemBorder]}
              onPress={opt.onPress}
            >
              <Text style={[s.menuItemText, opt.destructive && s.menuItemDestructive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      <AddTaskModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        task={task}
      />

      <DeleteReasonModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

const styles = t =>
  StyleSheet.create({
    card: {
      backgroundColor: t.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingLeft: 16,
      paddingRight: 8,
      marginBottom: 10,
    },
    cardLater: { backgroundColor: t.laterTint, opacity: 0.75 },
    content: { flex: 1, gap: 5 },
    description: { fontSize: 15, color: t.text, fontWeight: '500', lineHeight: 21 },
    descriptionDone: { textDecorationLine: 'line-through', color: t.subtext },
    descriptionLater: { color: t.subtext },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    meta: { fontSize: 11, color: t.subtext, letterSpacing: 0.3 },
    reminderBadge: {
      backgroundColor: t.accentLight,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    reminderBadgeText: { fontSize: 10, color: t.accent, fontWeight: '600' },
    deadlineRow: {
      alignSelf: 'flex-start',
      backgroundColor: t.sectionHeader,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    deadlineRowOverdue: { backgroundColor: t.accentLight },
    deadlineText: { fontSize: 10, color: t.subtext, fontWeight: '600' },
    deadlineTextOverdue: { color: t.accent },
    dotsBtn: { paddingHorizontal: 10, paddingVertical: 4 },
    dotsText: { fontSize: 22, color: t.subtext, lineHeight: 26 },
    menu: {
      position: 'absolute',
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      minWidth: 180,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
      overflow: 'hidden',
    },
    menuItem: { paddingVertical: 14, paddingHorizontal: 18 },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: t.border },
    menuItemText: { fontSize: 14, color: t.text, fontWeight: '500' },
    menuItemDestructive: { color: t.destructive },
  });
