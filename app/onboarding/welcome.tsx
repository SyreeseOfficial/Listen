import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const { height } = Dimensions.get('window');

export default function Welcome() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Text style={[styles.wordmark, { color: colors.accent }]}>Listen</Text>
        <Text style={[styles.tagline, { color: colors.text }]}>
          Your music deserves your{'\n'}full attention.
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Step away from the noise. Put on your best gear.{'\n'}
          Be present with the music.
        </Text>
      </View>

      <View style={styles.bottom}>
        <Pressable
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/onboarding/theme')}
        >
          <Text style={styles.buttonText}>Get started</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: height * 0.18,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  top: {
    gap: 24,
  },
  wordmark: {
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  bottom: {},
  button: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
