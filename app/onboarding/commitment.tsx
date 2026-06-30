import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { updateProfile } from '../../utils/storage';

const { height } = Dimensions.get('window');
const STEP = 7;
const TOTAL = 7;

const OPTIONS = [
  { key: 2, icon: '🌱', label: '2 days', sub: 'A light, sustainable start' },
  { key: 4, icon: '🔥', label: '4 days', sub: 'A solid habit in the making' },
  { key: 7, icon: '💎', label: 'Every day', sub: 'Full commitment, full reward' },
];

export default function CommitmentScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);

  async function next() {
    if (selected === null) return;
    await updateProfile({ weeklyCommitment: selected });
    router.push('/onboarding/building-profile');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topNav}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: colors.textSecondary }]}>←</Text>
        </Pressable>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>{STEP} of {TOTAL}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${(STEP / TOTAL) * 100}%` }]} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>How many days this week?</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Set a goal. We'll help you stick to it.
        </Text>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.option, {
              backgroundColor: selected === opt.key ? colors.accent + '18' : colors.card,
              borderColor: selected === opt.key ? colors.accent : colors.border,
            }]}
            onPress={() => { Haptics.selectionAsync(); setSelected(opt.key); }}
          >
            <Text style={styles.optionIcon}>{opt.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
              <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{opt.sub}</Text>
            </View>
            {selected === opt.key && <Text style={[styles.check, { color: colors.accent }]}>✓</Text>}
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: selected !== null ? colors.accent : colors.border }]}
        onPress={next}
        disabled={selected === null}
      >
        <Text style={styles.buttonText}>Start listening →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: height * 0.07, paddingBottom: 40 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  back: { fontSize: 24, fontWeight: '300' },
  stepText: { fontSize: 13, fontWeight: '500' },
  progressTrack: { height: 3, borderRadius: 2, marginBottom: 36 },
  progressFill: { height: 3, borderRadius: 2 },
  header: { gap: 6, marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '600', letterSpacing: -0.5 },
  sub: { fontSize: 15, lineHeight: 22 },
  options: { gap: 10, flex: 1 },
  option: { borderWidth: 1.5, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  optionIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  optionLabel: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  optionSub: { fontSize: 13, lineHeight: 18 },
  check: { fontSize: 16, fontWeight: '700' },
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});
