import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const { height } = Dimensions.get('window');

const FEATURES = [
  { icon: '📊', label: 'Advanced stats & insights' },
  { icon: '🎯', label: 'Custom listening goals' },
  { icon: '🏆', label: 'Exclusive achievements' },
  { icon: '☁️', label: 'Cloud backup & sync' },
  { icon: '🎨', label: 'Premium themes' },
  { icon: '🔕', label: 'Ad-free forever' },
];

export default function PaywallScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
          <Text style={[styles.badgeText, { color: colors.accent }]}>COMING SOON</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Listen Pro</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Everything you need to take your listening seriously.
        </Text>

        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureLabel, { color: colors.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.pricePlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.priceText, { color: colors.textSecondary }]}>Pricing TBA — stay tuned</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.button, { backgroundColor: colors.border }]} disabled>
          <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Get Listen Pro (Coming Soon)</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/onboarding/downsell')}>
          <Text style={[styles.skip, { color: colors.textSecondary }]}>Maybe later</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: height * 0.1, paddingBottom: 48, justifyContent: 'space-between' },
  content: { gap: 16 },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 36, fontWeight: '700', letterSpacing: -0.5 },
  sub: { fontSize: 16, lineHeight: 24 },
  featureList: { gap: 12, marginTop: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { fontSize: 20, width: 28 },
  featureLabel: { fontSize: 16 },
  pricePlaceholder: { borderWidth: 1.5, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  priceText: { fontSize: 15, fontStyle: 'italic' },
  actions: { gap: 14 },
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  skip: { textAlign: 'center', fontSize: 15, paddingVertical: 4 },
});
