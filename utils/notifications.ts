import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('listen-default', {
      name: 'Listen',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour = 20): Promise<void> {
  await ensureChannel();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.content.data as any)?.tag === 'daily-reminder') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to listen',
      body: "You haven't had a session today. Put something on.",
      data: { tag: 'daily-reminder' },
    },
    trigger: { hour, minute: 0, repeats: true, type: Notifications.SchedulableTriggerInputTypes.DAILY },
  });
}

export async function scheduleWeeklyRecap(): Promise<void> {
  await ensureChannel();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.content.data as any)?.tag === 'weekly-recap') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your week in sound',
      body: 'See how much you listened this week — open Listen for your recap.',
      data: { tag: 'weekly-recap' },
    },
    // Sunday = 1 in iOS weekday convention
    trigger: { weekday: 1, hour: 10, minute: 0, repeats: true, type: Notifications.SchedulableTriggerInputTypes.WEEKLY },
  });
}

export async function cancelAllListenNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const tag = (n.content.data as any)?.tag;
    if (tag === 'daily-reminder' || tag === 'weekly-recap') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}
