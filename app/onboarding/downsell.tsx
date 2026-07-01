import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { updateProfile } from '../../utils/storage';

const { height } = Dimensions.get('window');

const FREE_ITEMS = [
  { icon: '⏱', text: 'Session timer — unlimited' },
  { icon: '📈', text: 'XP & leveling — up to Level 3' },
  { icon: '📋', text: 'Listening history' },
  { icon: '🎧', text: 'Gear tracking — up to 3 items' },
];

export default function DownsellScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  async function handleStart() {
    await updateProfile({ onboardingDone: true });
    router.replace('/welcome-home');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.headline, { color: colors.text }]}>No worries.</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          {"Here's what you get on the free plan:"}
        </Text>

        <View style={styles.list}>
          {FREE_ITEMS.map((item) => (
            <View key={item.text} style={styles.freeRow}>
              <Text style={styles.freeIcon}>{item.icon}</Text>
              <Text style={[styles.freeText, { color: colors.text }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.upgradeLine, { color: colors.textSecondary }]}>
          Upgrade anytime from Settings.
        </Text>

        <Pressable style={[styles.startBtn, { backgroundColor: colors.accent }]} onPress={handleStart}>
          <Text style={styles.startBtnText}>Start listening →</Text>
        </Pressable>

        <Pressable hitSlop={12} onPress={() => router.replace('/onboarding/paywall')}>
          <Text style={[styles.trialLink, { color: colors.textSecondary }]}>
            Changed your mind? Try 3 days free →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  content: { gap: 20 },
  headline: { fontSize: 36, fontWeight: '700', letterSpacing: -0.5 },
  sub: { fontSize: 16, marginTop: -8 },
  list: { gap: 14, marginVertical: 4 },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  freeIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  freeText: { fontSize: 15, fontWeight: '500' },
  upgradeLine: { fontSize: 13 },
  startBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  startBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  trialLink: { fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' },
});
