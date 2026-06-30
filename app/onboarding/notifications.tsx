import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { updateProfile } from '../../utils/storage';
import { requestPermission, scheduleDailyReminder, scheduleWeeklyRecap } from '../../utils/notifications';

const { height } = Dimensions.get('window');

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  async function respond(enabled: boolean) {
    await updateProfile({ notificationsEnabled: enabled });
    if (enabled) {
      const granted = await requestPermission();
      if (granted) {
        await scheduleDailyReminder();
        await scheduleWeeklyRecap();
      }
    }
    router.push('/onboarding/theme');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.bigEmoji}>🔔</Text>
        <Text style={[styles.title, { color: colors.text }]}>Stay on track</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Get a gentle nudge when it's time to listen. No noise — just a reminder to slow down.
        </Text>

        <View style={[styles.exampleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.notifRow}>
            <Text style={styles.notifIcon}>🎧</Text>
            <View>
              <Text style={[styles.notifTitle, { color: colors.text }]}>Time to listen</Text>
              <Text style={[styles.notifBody, { color: colors.textSecondary }]}>You haven't had a session today. Put something on.</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={() => respond(true)}>
          <Text style={styles.buttonText}>Enable notifications</Text>
        </Pressable>
        <Pressable onPress={() => respond(false)}>
          <Text style={[styles.skip, { color: colors.textSecondary }]}>Maybe later</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: height * 0.14, paddingBottom: 48, justifyContent: 'space-between' },
  content: { gap: 18 },
  bigEmoji: { fontSize: 52 },
  title: { fontSize: 32, fontWeight: '600', letterSpacing: -0.5 },
  sub: { fontSize: 16, lineHeight: 24 },
  exampleCard: { borderWidth: 1.5, borderRadius: 14, padding: 16 },
  notifRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  notifIcon: { fontSize: 22 },
  notifTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  notifBody: { fontSize: 13, lineHeight: 18 },
  actions: { gap: 14 },
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  skip: { textAlign: 'center', fontSize: 15, paddingVertical: 4 },
});
