import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { updateProfile } from '../../utils/storage';

const { height } = Dimensions.get('window');

const INCLUDED = [
  { icon: '📅', label: 'Unlimited session tracking' },
  { icon: '🔥', label: 'Streaks and XP' },
  { icon: '🎧', label: 'Full equipment library' },
  { icon: '📈', label: '7-day listening chart' },
];

export default function DownsellScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  async function finish() {
    await updateProfile({ onboardingDone: true });
    router.replace('/welcome-home');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
          <Text style={[styles.badgeText, { color: colors.accent }]}>COMING SOON</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Free is pretty good too.</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          No credit card, no catch. Everything you need to start listening intentionally.
        </Text>

        <View style={styles.featureList}>
          {INCLUDED.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureLabel, { color: colors.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={finish}>
          <Text style={styles.buttonText}>Continue without Pro</Text>
        </Pressable>
        <Pressable style={[styles.proBtn, { borderColor: colors.border }]} disabled>
          <Text style={[styles.proBtnText, { color: colors.textSecondary }]}>Upgrade to Pro (Coming Soon)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: height * 0.12, paddingBottom: 48, justifyContent: 'space-between' },
  content: { gap: 16 },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '600', letterSpacing: -0.5 },
  sub: { fontSize: 16, lineHeight: 24 },
  featureList: { gap: 12, marginTop: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { fontSize: 20, width: 28 },
  featureLabel: { fontSize: 16 },
  actions: { gap: 12 },
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  proBtn: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  proBtnText: { fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});
