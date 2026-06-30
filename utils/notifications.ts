// expo-notifications is not supported in Expo Go (SDK 53+).
// All calls are wrapped in try/catch so the app doesn't crash in Go.
// Everything works correctly in development builds and production.
import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch (_) {}

async function ensureChannel() {
  if (Platform.OS === 'android' && Notifications) {
    try {
      await Notifications.setNotificationChannelAsync('listen-default', {
        name: 'Listen',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch (_) {}
  }
}

export async function requestPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (_) { return false; }
}

export async function scheduleDailyReminder(hour = 20): Promise<void> {
  if (!Notifications) return;
  try {
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
  } catch (_) {}
}

export async function scheduleWeeklyRecap(): Promise<void> {
  if (!Notifications) return;
  try {
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
      trigger: { weekday: 1, hour: 10, minute: 0, repeats: true, type: Notifications.SchedulableTriggerInputTypes.WEEKLY },
    });
  } catch (_) {}
}

export async function cancelAllListenNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      const tag = (n.content.data as any)?.tag;
      if (tag === 'daily-reminder' || tag === 'weekly-recap') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (_) {}
}
