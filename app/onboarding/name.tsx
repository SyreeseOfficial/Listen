import { View, Text, StyleSheet, Pressable, TextInput, Dimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { updateProfile } from '../../utils/storage';
import { randomName } from '../../constants/names';

const { height } = Dimensions.get('window');

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
    router.push('/onboarding/equipment');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Text style={[styles.step, { color: colors.textSecondary }]}>2 of 4</Text>
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
    paddingHorizontal: 32,
    paddingTop: height * 0.14,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  top: { gap: 8 },
  step: { fontSize: 13, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '600', letterSpacing: -0.5, marginTop: 8 },
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
