import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { darkTheme, lightTheme } from '../theme';
import {
  cancelReminders,
  DEFAULT_MESSAGES,
  requestPermissions,
  scheduleDeadlineNotifications,
  scheduleReminders,
} from '../notifications';

const TASKS_KEY    = '@doitorregret_tasks';
const THEME_KEY    = '@doitorregret_dark';
const MESSAGES_KEY = '@doitorregret_messages';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const tasksRef = useRef(tasks);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(TASKS_KEY),
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(MESSAGES_KEY),
    ]).then(([tasksData, themeData, messagesData]) => {
      if (tasksData)          setTasks(JSON.parse(tasksData));
      if (themeData !== null) setIsDark(JSON.parse(themeData));
      if (messagesData)       setMessages(JSON.parse(messagesData));
      setLoaded(true);
    });
    requestPermissions();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks, loaded]);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(THEME_KEY, JSON.stringify(isDark));
  }, [isDark, loaded]);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages, loaded]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  function updateMessages(category, newList) {
    if (category === '__reset__') {
      setMessages(DEFAULT_MESSAGES);
    } else {
      setMessages(prev => ({ ...prev, [category]: newList }));
    }
  }

  async function addTask(description, reminderTime = null, deadlineAt = null) {
    const [reminderIds, deadlineIds] = await Promise.all([
      reminderTime ? scheduleReminders(description, reminderTime, messages) : Promise.resolve([]),
      deadlineAt   ? scheduleDeadlineNotifications(description, deadlineAt, messages) : Promise.resolve([]),
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
    };
    setTasks(prev => [task, ...prev]);
    showToast('Task added');
  }

  async function editTask(id, description, reminderTime = null, deadlineAt = null) {
    const existing = tasksRef.current.find(t => t.id === id);
    if (existing) cancelReminders(existing.notificationIds);

    const [reminderIds, deadlineIds] = await Promise.all([
      reminderTime ? scheduleReminders(description, reminderTime, messages) : Promise.resolve([]),
      deadlineAt   ? scheduleDeadlineNotifications(description, deadlineAt, messages) : Promise.resolve([]),
    ]);

    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, description: description.trim(), reminderTime, deadlineAt, notificationIds: [...reminderIds, ...deadlineIds] }
          : t
      )
    );
    showToast('Task updated');
  }

  function moveTask(id, newStatus) {
    const task = tasksRef.current.find(t => t.id === id);
    if (task && newStatus === 'done') cancelReminders(task.notificationIds);
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              status: newStatus,
              completedAt: newStatus === 'done' ? Date.now() : t.completedAt,
              notificationIds: newStatus === 'done' ? [] : t.notificationIds,
            }
          : t
      )
    );
  }

  function deleteTask(id, reason) {
    const task = tasksRef.current.find(t => t.id === id);
    if (task) cancelReminders(task.notificationIds);
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, status: 'deleted', deletedAt: Date.now(), deleteReason: reason, notificationIds: [] }
          : t
      )
    );
  }

  function permanentlyDeleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function emptyTrash() {
    setTasks(prev => prev.filter(t => t.status !== 'deleted'));
  }

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <AppContext.Provider
      value={{
        tasks, isDark, theme, messages, toast,
        toggleTheme: () => setIsDark(d => !d),
        updateMessages, showToast,
        addTask, editTask, moveTask, deleteTask, permanentlyDeleteTask, emptyTrash,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
