import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const DEFAULT_MESSAGES = {
  reminder: [
    "You still have time, do it.",
    "Do it now or regret later.",
    "What better do you have apart from this?",
    "It won't take much time to finish this.",
    "No procrastination today.",
    "Don't be like this. Finish the task.",
  ],
  nearDeadline: [
    "You'll regret it later.",
    "Now or never.",
    "You got not much time left to finish.",
    "If you fail, you gonna regret.",
    "This is it.",
  ],
  postDeadline: [
    "You are such a waste.",
    "You are a loser.",
    "Can't even do one thing on time.",
    "What a disappointment.",
    "I knew you can't do nothing.",
    "People never change, not you at least.",
    "Not what I expected.",
    "This is why Sir Arthur Morgan hates you.",
    "Worthless scum.",
  ],
};

function pick(arr, seed) {
  const list = arr?.length ? arr : ['Do it.'];
  return list[((seed * 7 + 3) % list.length + list.length) % list.length];
}

export async function requestPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.MAX,
      sound: true,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminders(description, reminderTime, messages = DEFAULT_MESSAGES) {
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const pool = messages.reminder?.length ? messages.reminder : DEFAULT_MESSAGES.reminder;
  const ids = [];
  let dayOffset = 0;
  let scheduledDays = 0;

  while (scheduledDays < 3) {
    const base = new Date();
    base.setDate(base.getDate() + dayOffset);
    base.setHours(hours, minutes, 0, 0);
    const seed = dayOffset * 13 + description.length;

    if (base > new Date()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: description, body: pick(pool, seed), sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: base,
          channelId: 'task-reminders',
        },
      });
      ids.push(id);
      scheduledDays++;
    }

    dayOffset++;
    if (dayOffset > 10) break;
  }

  return ids;
}

export async function scheduleDeadlineNotifications(description, deadlineAt, messages = DEFAULT_MESSAGES) {
  const ids = [];
  const deadline = new Date(deadlineAt);
  const now = new Date();
  const seed = description.length;
  const nearPool = messages.nearDeadline?.length ? messages.nearDeadline : DEFAULT_MESSAGES.nearDeadline;
  const postPool = messages.postDeadline?.length ? messages.postDeadline : DEFAULT_MESSAGES.postDeadline;

  const beforeOffsets = [
    { hours: 12, msgIndex: 0 },
    { hours: 6,  msgIndex: 1 },
    { hours: 1,  msgIndex: 2 },
  ];

  for (const { hours, msgIndex } of beforeOffsets) {
    const triggerTime = new Date(deadline.getTime() - hours * 60 * 60 * 1000);
    if (triggerTime > now) {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: description, body: pick(nearPool, seed + msgIndex), sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
          channelId: 'task-reminders',
        },
      });
      ids.push(id);
    }
  }

  const postOffsets = [0, 3];
  let t = 3;
  while (t + 6 <= 48) { t += 6; postOffsets.push(t); }

  for (let i = 0; i < postOffsets.length; i++) {
    const triggerTime = new Date(deadline.getTime() + postOffsets[i] * 60 * 60 * 1000);
    if (triggerTime > now) {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: description, body: pick(postPool, seed + 3 + i), sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
          channelId: 'task-reminders',
        },
      });
      ids.push(id);
    }
  }

  return ids;
}

export async function cancelReminders(notificationIds) {
  if (!notificationIds?.length) return;
  await Promise.all(notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}
