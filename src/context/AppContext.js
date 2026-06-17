import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { darkTheme, lightTheme } from '../theme';
import {
  cancelReminders,
  DEFAULT_MESSAGES,
  requestPermissions,
  scheduleDeadlineNotifications,
  scheduleReminders,
} from '../notifications';
import {
  deleteAllTrashedRows,
  deleteTaskRow,
  getSetting,
  insertTask,
  loadTasks,
  openDb,
  setupDb,
  setSetting,
  updateTask,
} from '../database/db';

const AppContext = createContext(null);

function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function AppProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [checkInTasks, setCheckInTasks] = useState([]);
  const tasksRef = useRef(tasks);
  const messagesRef = useRef(messages);
  const dbRef = useRef(null);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    (async () => {
      const db = await openDb();
      await setupDb(db);
      dbRef.current = db;

      const [allTasks, isDarkVal, messagesVal] = await Promise.all([
        loadTasks(db),
        getSetting(db, 'isDark'),
        getSetting(db, 'messages'),
      ]);

      const loadedMessages = messagesVal ? JSON.parse(messagesVal) : DEFAULT_MESSAGES;
      setMessages(loadedMessages);
      if (isDarkVal !== null) setIsDark(isDarkVal === 'true');

      // Auto-activate any "later" tasks whose laterUntil has passed
      const now = Date.now();
      const activatedTasks = await Promise.all(
        allTasks.map(async t => {
          if (t.status === 'later' && t.laterUntil && t.laterUntil <= now) {
            await cancelReminders([t.laterActivateNotifId].filter(Boolean));
            const [reminderIds, deadlineIds] = await Promise.all([
              t.reminderTime ? scheduleReminders(t.description, t.reminderTime, loadedMessages, t.deadlineAt) : Promise.resolve([]),
              t.deadlineAt   ? scheduleDeadlineNotifications(t.description, t.deadlineAt, loadedMessages) : Promise.resolve([]),
            ]);
            const updated = {
              ...t,
              status: 'todo',
              movedToLaterAt: null,
              laterUntil: null,
              laterActivateNotifId: null,
              notificationIds: [...reminderIds, ...deadlineIds],
            };
            await updateTask(db, updated);
            return updated;
          }
          return t;
        })
      );

      // Reset daily tasks that were completed on a previous day
      const today = dateKey(now);
      const resetTasks = await Promise.all(
        activatedTasks.map(async t => {
          if (t.isDaily && t.status === 'done' && t.completedAt && dateKey(t.completedAt) !== today) {
            const updated = { ...t, status: 'todo' };
            await updateTask(db, updated);
            return updated;
          }
          return t;
        })
      );

      setTasks(resetTasks);
      setLoaded(true);

      // Daily check-in: ask about tasks still pending today (once per day)
      const lastCheckin = await getSetting(db, 'lastCheckinDate');
      if (lastCheckin !== today) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const pending = resetTasks.filter(t =>
          t.status === 'todo' &&
          (t.isDaily || t.createdAt < todayStart.getTime()) &&
          !(t.pendingReasons ?? []).some(r => r.date === today)
        );
        if (pending.length > 0) setCheckInTasks(pending);
        await setSetting(db, 'lastCheckinDate', today);
      }
    })();
    requestPermissions();
  }, []);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  async function updateMessages(category, newList) {
    let updated;
    if (category === '__reset__') {
      updated = DEFAULT_MESSAGES;
      setMessages(DEFAULT_MESSAGES);
    } else {
      updated = { ...messagesRef.current, [category]: newList };
      setMessages(updated);
    }
    if (dbRef.current) {
      await setSetting(dbRef.current, 'messages', JSON.stringify(updated));
    }
  }

  async function addTask(description, reminderTime = null, deadlineAt = null, isDaily = false) {
    const [reminderIds, deadlineIds] = await Promise.all([
      reminderTime ? scheduleReminders(description, reminderTime, messagesRef.current, deadlineAt) : Promise.resolve([]),
      deadlineAt   ? scheduleDeadlineNotifications(description, deadlineAt, messagesRef.current) : Promise.resolve([]),
    ]);
    const task = {
      id: Date.now().toString(),
      description: description.trim(),
      status: 'todo',
      createdAt: Date.now(),
      completedAt: null,
      deletedAt: null,
      deleteReason: null,
      reminderTime,
      deadlineAt,
      notificationIds: [...reminderIds, ...deadlineIds],
      movedToLaterAt: null,
      laterUntil: null,
      laterActivateNotifId: null,
      isDaily,
      pendingReasons: [],
    };
    setTasks(prev => [task, ...prev]);
    if (dbRef.current) await insertTask(dbRef.current, task);
    showToast('Task added');
  }

  async function editTask(id, description, reminderTime = null, deadlineAt = null, isDaily = false) {
    const existing = tasksRef.current.find(t => t.id === id);
    if (existing) {
      const allIds = [...(existing.notificationIds || []), existing.laterActivateNotifId].filter(Boolean);
      await cancelReminders(allIds);
    }

    const [reminderIds, deadlineIds] = await Promise.all([
      reminderTime ? scheduleReminders(description, reminderTime, messagesRef.current, deadlineAt) : Promise.resolve([]),
      deadlineAt   ? scheduleDeadlineNotifications(description, deadlineAt, messagesRef.current) : Promise.resolve([]),
    ]);

    const updated = {
      ...existing,
      description: description.trim(),
      reminderTime,
      deadlineAt,
      notificationIds: [...reminderIds, ...deadlineIds],
      isDaily,
    };

    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    if (dbRef.current) await updateTask(dbRef.current, updated);
    showToast('Task updated');
  }

  async function addPendingReason(id, reason) {
    const task = tasksRef.current.find(t => t.id === id);
    if (!task) return;
    const today = dateKey(Date.now());
    const updated = {
      ...task,
      pendingReasons: [...(task.pendingReasons ?? []), { date: today, reason }],
    };
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    if (dbRef.current) await updateTask(dbRef.current, updated);
    setCheckInTasks(prev => prev.filter(t => t.id !== id));
  }

  function dismissCheckIn(id) {
    setCheckInTasks(prev => prev.filter(t => t.id !== id));
  }

  async function moveTask(id, newStatus) {
    const task = tasksRef.current.find(t => t.id === id);
    if (!task) return;

    const allIds = [...(task.notificationIds || []), task.laterActivateNotifId].filter(Boolean);
    await cancelReminders(allIds);

    let newNotificationIds = [];
    let extraFields = {};

    if (newStatus === 'later') {
      const now = Date.now();
      const laterUntil = now + 30 * 24 * 60 * 60 * 1000;
      const activateNotif = await Notifications.scheduleNotificationAsync({
        content: {
          title: task.description,
          body: 'This task has been reactivated to your Todo list.',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(laterUntil),
          channelId: 'task-reminders',
        },
      });
      extraFields = { movedToLaterAt: now, laterUntil, laterActivateNotifId: activateNotif };
    } else if (newStatus === 'todo') {
      const [reminderIds, deadlineIds] = await Promise.all([
        task.reminderTime ? scheduleReminders(task.description, task.reminderTime, messagesRef.current, task.deadlineAt) : Promise.resolve([]),
        task.deadlineAt   ? scheduleDeadlineNotifications(task.description, task.deadlineAt, messagesRef.current) : Promise.resolve([]),
      ]);
      newNotificationIds = [...reminderIds, ...deadlineIds];
      extraFields = { movedToLaterAt: null, laterUntil: null, laterActivateNotifId: null };
    }

    const updated = {
      ...task,
      status: newStatus,
      completedAt: newStatus === 'done' ? Date.now() : task.completedAt,
      notificationIds: newNotificationIds,
      ...extraFields,
    };

    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    if (dbRef.current) await updateTask(dbRef.current, updated);
    if (newStatus === 'done') setCheckInTasks(prev => prev.filter(t => t.id !== id));
  }

  async function deleteTask(id, reason) {
    const task = tasksRef.current.find(t => t.id === id);
    if (task) {
      const allIds = [...(task.notificationIds || []), task.laterActivateNotifId].filter(Boolean);
      cancelReminders(allIds);
    }
    const updated = {
      ...task,
      status: 'deleted',
      deletedAt: Date.now(),
      deleteReason: reason,
      notificationIds: [],
      laterActivateNotifId: null,
    };
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    if (dbRef.current) await updateTask(dbRef.current, updated);
  }

  async function permanentlyDeleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (dbRef.current) await deleteTaskRow(dbRef.current, id);
  }

  async function emptyTrash() {
    setTasks(prev => prev.filter(t => t.status !== 'deleted'));
    if (dbRef.current) await deleteAllTrashedRows(dbRef.current);
  }

  async function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (dbRef.current) await setSetting(dbRef.current, 'isDark', String(next));
  }

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <AppContext.Provider
      value={{
        tasks, isDark, theme, messages, toast, loaded, checkInTasks,
        toggleTheme,
        updateMessages, showToast,
        addTask, editTask, moveTask, deleteTask, permanentlyDeleteTask, emptyTrash,
        addPendingReason, dismissCheckIn,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
