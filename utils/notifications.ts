// expo-notifications is not fully supported in Expo Go (SDK 53+).
// Static import so Metro can resolve the module; all API calls wrapped in
// try/catch so the app doesn't crash at runtime in Expo Go.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch (_) {}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('listen-default', {
      name: 'Listen',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (_) {}
}

export async function requestPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (_) { return false; }
}

export async function scheduleDailyReminder(hour = 20): Promise<void> {
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

export async function scheduleStreakRiskTonight(hour = 21): Promise<void> {
  try {
    await ensureChannel();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if ((n.content.data as any)?.tag === 'streak-risk') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    const now = new Date();
    const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
    if (tonight.getTime() <= now.getTime()) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your streak is at risk',
        body: "You haven't listened today. Keep your streak alive.",
        data: { tag: 'streak-risk' },
      },
      trigger: { date: tonight, type: Notifications.SchedulableTriggerInputTypes.DATE },
    });
  } catch (_) {}
}

export async function cancelStreakRiskNotification(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if ((n.content.data as any)?.tag === 'streak-risk') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (_) {}
}

export async function cancelAllListenNotifications(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      const tag = (n.content.data as any)?.tag;
      if (tag === 'daily-reminder' || tag === 'weekly-recap' || tag === 'streak-risk') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (_) {}
}
