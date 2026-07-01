import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { updateProfile } from '../utils/storage';

const { height } = Dimensions.get('window');

const BENEFITS = [
  { icon: '📊', title: 'Full stats', sub: 'Monthly & all-time breakdowns' },
  { icon: '🛡', title: 'Unlimited freezes', sub: 'Never lose a streak again' },
  { icon: '📝', title: 'Session notes', sub: 'Log every listening moment' },
  { icon: '∞', title: 'Unlimited gear', sub: 'Track your whole setup' },
];

export default function PaywallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isOnboarding = from === 'onboarding';

  function handleClose() {
    if (isOnboarding) {
      router.replace('/onboarding/downsell');
    } else {
      router.back();
    }
  }

  async function handlePurchase() {
    await updateProfile({ isPremium: true });
    if (isOnboarding) {
      router.replace('/welcome-home');
    } else {
      router.back();
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={16}>
        <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.logo, { color: colors.accent }]}>◎</Text>
        <Text style={[styles.headline, { color: colors.text }]}>Own your listening journey.</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>One-time · Yours forever · No subscription</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={[styles.benefitRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.benefitIcon}>{b.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>{b.title}</Text>
                <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={[styles.purchaseBtn, { backgroundColor: colors.accent }]} onPress={handlePurchase}>
          <Text style={styles.purchaseBtnText}>Unlock for $7.99</Text>
        </Pressable>

        <Text style={[styles.indieLine, { color: colors.textSecondary }]}>
          Built by one person. For the love of audio.
        </Text>

        <Pressable hitSlop={12} onPress={handlePurchase}>
          <Text style={[styles.restore, { color: colors.textSecondary }]}>Restore Purchase</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { position: 'absolute', top: height * 0.07, right: 24, zIndex: 10 },
  closeText: { fontSize: 18 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 20 },
  logo: { fontSize: 40, textAlign: 'center' },
  headline: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', marginTop: -8 },
  benefits: { gap: 10, marginVertical: 4 },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderRadius: 14, padding: 16,
  },
  benefitIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  benefitTitle: { fontSize: 15, fontWeight: '600' },
  benefitSub: { fontSize: 12, marginTop: 1 },
  purchaseBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  purchaseBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  indieLine: { fontSize: 12, textAlign: 'center', marginTop: -8 },
  restore: { fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' },
});
