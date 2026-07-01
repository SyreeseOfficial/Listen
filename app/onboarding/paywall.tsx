import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { updateProfile } from '../../utils/storage';

const { height } = Dimensions.get('window');

const BENEFITS = [
  { icon: '📊', title: 'Full stats', sub: 'Monthly & all-time breakdowns' },
  { icon: '🛡', title: 'Unlimited freezes', sub: 'Never lose a streak again' },
  { icon: '📝', title: 'Session notes', sub: 'Log every listening moment' },
  { icon: '∞', title: 'Unlimited gear', sub: 'Track your whole setup' },
];

export default function TrialScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  async function handleStartTrial() {
    // ponytail: stub — wire RevenueCat trial purchase here
    await updateProfile({ isPremium: true });
    router.replace('/welcome-home');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.logo, { color: colors.accent }]}>◎</Text>

        <Text style={[styles.headline, { color: colors.text }]}>
          {'Try Listen Pro\nfree for 3 days.'}
        </Text>

        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Full access, zero charge. Then $7.99 — one time, yours forever.
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View
              key={b.title}
              style={[styles.benefitRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={styles.benefitIcon}>{b.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>{b.title}</Text>
                <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={[styles.trialBtn, { backgroundColor: colors.accent }]} onPress={handleStartTrial}>
          <Text style={styles.trialBtnText}>Start Free Trial →</Text>
        </Pressable>

        <Text style={[styles.noCharge, { color: colors.textSecondary }]}>
          No payment now · Cancel anytime
        </Text>

        <Pressable hitSlop={12} onPress={() => router.replace('/onboarding/downsell')}>
          <Text style={[styles.skip, { color: colors.textSecondary }]}>Continue with free</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  content: { gap: 16 },
  logo: { fontSize: 36, textAlign: 'center' },
  headline: {
    fontSize: 30, fontWeight: '700', letterSpacing: -0.5,
    textAlign: 'center', lineHeight: 38,
  },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  benefits: { gap: 10, marginVertical: 4 },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderRadius: 14, padding: 16,
  },
  benefitIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  benefitTitle: { fontSize: 15, fontWeight: '600' },
  benefitSub: { fontSize: 12, marginTop: 1 },
  trialBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  trialBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  noCharge: { fontSize: 12, textAlign: 'center', marginTop: -8 },
  skip: { fontSize: 14, textAlign: 'center', textDecorationLine: 'underline' },
});
