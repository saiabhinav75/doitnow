import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { darkTheme, lightTheme } from '../theme';
import { cancelReminders, requestPermissions, scheduleReminders } from '../notifications';

const TASKS_KEY = '@doitorregret_tasks';
const THEME_KEY = '@doitorregret_dark';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(TASKS_KEY),
      AsyncStorage.getItem(THEME_KEY),
    ]).then(([tasksData, themeData]) => {
      if (tasksData) setTasks(JSON.parse(tasksData));
      if (themeData !== null) setIsDark(JSON.parse(themeData));
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

  async function addTask(description, reminderTime = null) {
    let notificationIds = [];
    if (reminderTime) {
      notificationIds = await scheduleReminders(description, reminderTime);
    }
    const task = {
      id: Date.now().toString(),
      description: description.trim(),
      status: 'todo',
      createdAt: Date.now(),
      completedAt: null,
      deletedAt: null,
      deleteReason: null,
      reminderTime,
      notificationIds,
    };
    setTasks(prev => [task, ...prev]);
  }

  async function editTask(id, description, reminderTime = null) {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (task) cancelReminders(task.notificationIds);
      return prev;
    });

    let notificationIds = [];
    if (reminderTime) {
      notificationIds = await scheduleReminders(description, reminderTime);
    }

    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, description: description.trim(), reminderTime, notificationIds } : t
      )
    );
  }

  function moveTask(id, newStatus) {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (task && newStatus === 'done') cancelReminders(task.notificationIds);
      return prev.map(t =>
        t.id === id
          ? {
              ...t,
              status: newStatus,
              completedAt: newStatus === 'done' ? Date.now() : t.completedAt,
              notificationIds: newStatus === 'done' ? [] : t.notificationIds,
            }
          : t
      );
    });
  }

  function deleteTask(id, reason) {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (task) cancelReminders(task.notificationIds);
      return prev.map(t =>
        t.id === id
          ? { ...t, status: 'deleted', deletedAt: Date.now(), deleteReason: reason, notificationIds: [] }
          : t
      );
    });
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
        tasks,
        isDark,
        theme,
        toggleTheme: () => setIsDark(d => !d),
        addTask,
        editTask,
        moveTask,
        deleteTask,
        permanentlyDeleteTask,
        emptyTrash,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
