import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

export async function scheduleReminders(description, reminderTime) {
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const ids = [];

  for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
    const trigger = new Date();
    trigger.setDate(trigger.getDate() + dayOffset);
    trigger.setHours(hours, minutes, 0, 0);

    if (trigger > new Date()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Do it or Regret It!',
          body: description,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger,
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
