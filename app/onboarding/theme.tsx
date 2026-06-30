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
      <View style={styles.topNav}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: colors.textSecondary }]}>←</Text>
        </Pressable>
      </View>

      <View style={styles.top}>
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
        onPress={() => router.push('/onboarding/equipment')}
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
    paddingTop: height * 0.1,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  topNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { fontSize: 24, fontWeight: '300' },
  top: { gap: 8 },
  title: { fontSize: 32, fontWeight: '600', letterSpacing: -0.5 },
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
