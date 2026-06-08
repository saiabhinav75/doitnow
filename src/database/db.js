import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { DEFAULT_MESSAGES } from '../notifications';

const DB_NAME = 'doitnow.db';

const ASYNC_TASKS_KEY    = '@doitorregret_tasks';
const ASYNC_THEME_KEY    = '@doitorregret_dark';
const ASYNC_MESSAGES_KEY = '@doitorregret_messages';

export async function openDb() {
  return await SQLite.openDatabaseAsync(DB_NAME);
}

export async function setupDb(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tasks (
      id                   TEXT PRIMARY KEY,
      description          TEXT NOT NULL,
      status               TEXT NOT NULL,
      createdAt            INTEGER NOT NULL,
      completedAt          INTEGER,
      deletedAt            INTEGER,
      deleteReason         TEXT,
      reminderTime         TEXT,
      deadlineAt           INTEGER,
      notificationIds      TEXT,
      movedToLaterAt       INTEGER,
      laterUntil           INTEGER,
      laterActivateNotifId TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await migrateFromAsyncStorage(db);
}

async function migrateFromAsyncStorage(db) {
  const already = await getSetting(db, 'migrated');
  if (already) return;

  const [tasksData, themeData, messagesData] = await Promise.all([
    AsyncStorage.getItem(ASYNC_TASKS_KEY),
    AsyncStorage.getItem(ASYNC_THEME_KEY),
    AsyncStorage.getItem(ASYNC_MESSAGES_KEY),
  ]);

  if (tasksData) {
    const tasks = JSON.parse(tasksData);
    for (const task of tasks) {
      await insertTask(db, task);
    }
  }

  const isDark = themeData !== null ? themeData : 'true';
  await setSetting(db, 'isDark', isDark);

  const messages = messagesData ?? JSON.stringify(DEFAULT_MESSAGES);
  await setSetting(db, 'messages', messages);

  await setSetting(db, 'migrated', 'true');
}

// ── Task helpers ──────────────────────────────────────────────────────────────

function taskToRow(task) {
  return {
    $id:                   task.id,
    $description:          task.description,
    $status:               task.status,
    $createdAt:            task.createdAt,
    $completedAt:          task.completedAt ?? null,
    $deletedAt:            task.deletedAt ?? null,
    $deleteReason:         task.deleteReason ?? null,
    $reminderTime:         task.reminderTime ?? null,
    $deadlineAt:           task.deadlineAt ?? null,
    $notificationIds:      JSON.stringify(task.notificationIds ?? []),
    $movedToLaterAt:       task.movedToLaterAt ?? null,
    $laterUntil:           task.laterUntil ?? null,
    $laterActivateNotifId: task.laterActivateNotifId ?? null,
  };
}

function rowToTask(row) {
  return {
    id:                   row.id,
    description:          row.description,
    status:               row.status,
    createdAt:            row.createdAt,
    completedAt:          row.completedAt ?? null,
    deletedAt:            row.deletedAt ?? null,
    deleteReason:         row.deleteReason ?? null,
    reminderTime:         row.reminderTime ?? null,
    deadlineAt:           row.deadlineAt ?? null,
    notificationIds:      row.notificationIds ? JSON.parse(row.notificationIds) : [],
    movedToLaterAt:       row.movedToLaterAt ?? null,
    laterUntil:           row.laterUntil ?? null,
    laterActivateNotifId: row.laterActivateNotifId ?? null,
  };
}

export async function loadTasks(db) {
  const rows = await db.getAllAsync('SELECT * FROM tasks');
  return rows.map(rowToTask);
}

export async function insertTask(db, task) {
  const r = taskToRow(task);
  await db.runAsync(
    `INSERT OR REPLACE INTO tasks
      (id, description, status, createdAt, completedAt, deletedAt, deleteReason,
       reminderTime, deadlineAt, notificationIds, movedToLaterAt, laterUntil, laterActivateNotifId)
     VALUES
      ($id, $description, $status, $createdAt, $completedAt, $deletedAt, $deleteReason,
       $reminderTime, $deadlineAt, $notificationIds, $movedToLaterAt, $laterUntil, $laterActivateNotifId)`,
    r
  );
}

export async function updateTask(db, task) {
  const r = taskToRow(task);
  await db.runAsync(
    `UPDATE tasks SET
      description = $description,
      status = $status,
      createdAt = $createdAt,
      completedAt = $completedAt,
      deletedAt = $deletedAt,
      deleteReason = $deleteReason,
      reminderTime = $reminderTime,
      deadlineAt = $deadlineAt,
      notificationIds = $notificationIds,
      movedToLaterAt = $movedToLaterAt,
      laterUntil = $laterUntil,
      laterActivateNotifId = $laterActivateNotifId
     WHERE id = $id`,
    r
  );
}

export async function deleteTaskRow(db, id) {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function deleteAllTrashedRows(db) {
  await db.runAsync("DELETE FROM tasks WHERE status = 'deleted'");
}

// ── Settings helpers ──────────────────────────────────────────────────────────

export async function getSetting(db, key) {
  const row = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(db, key, value) {
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, String(value)]
  );
}
