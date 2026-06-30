import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const { height } = Dimensions.get('window');

const TESTIMONIALS = [
  { quote: 'I finally feel like I\'m actually listening, not just playing music in the background.', name: 'Marcus T.' },
  { quote: 'The streak system pushed me to sit down and really listen. My taste has changed.', name: 'Priya K.' },
  { quote: 'Three months in, I\'ve hit 100 sessions. I didn\'t think I had that kind of patience.', name: 'Sam L.' },
];

const TESTIMONIAL = TESTIMONIALS[Math.floor(Math.random() * TESTIMONIALS.length)];

export default function SocialProofScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.stat, { color: colors.accent }]}>12,847</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>listeners tracking sessions this week</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.quote, { color: colors.text }]}>"{TESTIMONIAL.quote}"</Text>
          <Text style={[styles.author, { color: colors.textSecondary }]}>— {TESTIMONIAL.name}</Text>
        </View>

        <View style={styles.pillRow}>
          {['100+ sessions', '7-day streaks', '500h logged'].map((pill) => (
            <View key={pill} style={[styles.pill, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '40' }]}>
              <Text style={[styles.pillText, { color: colors.accent }]}>{pill}</Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={() => router.push('/onboarding/notifications')}
      >
        <Text style={styles.buttonText}>Join them →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: height * 0.15, paddingBottom: 48, justifyContent: 'space-between' },
  content: { gap: 24 },
  stat: { fontSize: 52, fontWeight: '700', letterSpacing: -1 },
  statLabel: { fontSize: 16, lineHeight: 22, marginTop: -8 },
  card: { borderWidth: 1.5, borderRadius: 16, padding: 20, gap: 12 },
  quote: { fontSize: 17, lineHeight: 26, fontStyle: 'italic' },
  author: { fontSize: 14, fontWeight: '500' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { fontSize: 13, fontWeight: '600' },
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});
