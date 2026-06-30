import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const { height } = Dimensions.get('window');

const OPTIONS = [
  { label: 'Light', value: 'light' as const, desc: 'Bright & clean' },
  { label: 'Dark', value: 'dark' as const, desc: 'Easy on the eyes' },
  { label: 'System', value: 'system' as const, desc: 'Follows your device' },
];

export default function ThemeScreen() {
  const { colors, pref, setPref } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Text style={[styles.step, { color: colors.textSecondary }]}>1 of 4</Text>
        <Text style={[styles.title, { color: colors.text }]}>Pick your look</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>You can change this anytime.</Text>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((opt) => {
          const selected = pref === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.option,
                { borderColor: selected ? colors.accent : colors.border, backgroundColor: colors.card },
              ]}
              onPress={() => setPref(opt.value)}
            >
              <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
              {selected && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={() => router.push('/onboarding/name')}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
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
  options: { gap: 12 },
  option: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: { fontSize: 17, fontWeight: '500' },
  optionDesc: { fontSize: 14, flex: 1, marginLeft: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});
