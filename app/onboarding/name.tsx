import { View, Text, StyleSheet, Pressable, TextInput, Dimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { updateProfile } from '../../utils/storage';
import { randomName } from '../../constants/names';

const { height } = Dimensions.get('window');
const STEP = 6;
const TOTAL = 7;

export default function NameScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');

  async function roll() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setName(randomName());
  }

  async function next() {
    if (name.trim()) {
      await updateProfile({ name: name.trim() });
    }
    router.push('/onboarding/commitment');
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

      <View style={styles.top}>
        <Text style={[styles.title, { color: colors.text }]}>What do we call you?</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Enter a name or roll a random one.
        </Text>
      </View>

      <View style={styles.middle}>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
          placeholder="Your listener name"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          maxLength={32}
          returnKeyType="done"
        />
        <Pressable style={[styles.rollBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={roll}>
          <Text style={[styles.rollText, { color: colors.accent }]}>🎲  Roll random name</Text>
        </Pressable>
      </View>

      <View style={styles.bottom}>
        <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={next}>
          <Text style={styles.buttonText}>{name.trim() ? 'Continue' : 'Skip'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.07,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  back: { fontSize: 24, fontWeight: '300' },
  stepText: { fontSize: 13, fontWeight: '500' },
  progressTrack: { height: 3, borderRadius: 2, marginBottom: 36 },
  progressFill: { height: 3, borderRadius: 2 },
  top: { gap: 8 },
  title: { fontSize: 32, fontWeight: '600', letterSpacing: -0.5 },
  sub: { fontSize: 15 },
  middle: { gap: 12 },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 17,
  },
  rollBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  rollText: { fontSize: 16, fontWeight: '500' },
  bottom: {},
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});
