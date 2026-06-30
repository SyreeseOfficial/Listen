import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { getProfile } from '../utils/storage';

const { height } = Dimensions.get('window');

const ARCHETYPES: Record<string, { emoji: string; tagline: string }> = {
  casual:     { emoji: '🌊', tagline: 'Let the music find you.' },
  curious:    { emoji: '🔭', tagline: "There's always more to hear." },
  dedicated:  { emoji: '🕯', tagline: 'Every session is a practice.' },
  audiophile: { emoji: '🎛', tagline: 'The details are everything.' },
};

export default function WelcomeHomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [archetype, setArchetype] = useState(ARCHETYPES.casual);

  const emojiOpacity = useRef(new Animated.Value(0)).current;
  const emojiY = useRef(new Animated.Value(12)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(10)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.name) setName(p.name);
      const key = p?.listenerType ?? 'casual';
      setArchetype(ARCHETYPES[key] ?? ARCHETYPES.casual);
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(emojiOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(emojiY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(textY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(400),
      Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  function enter() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Animated.Text style={[styles.emoji, { opacity: emojiOpacity, transform: [{ translateY: emojiY }] }]}>
          {archetype.emoji}
        </Animated.Text>

        <Animated.View style={[styles.textBlock, { opacity: textOpacity, transform: [{ translateY: textY }] }]}>
          <Text style={[styles.welcome, { color: colors.textSecondary }]}>Welcome{name ? `, ${name}` : ''}.</Text>
          <Text style={[styles.tagline, { color: colors.text }]}>{archetype.tagline}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Your listening journey starts now.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.btnWrap, { opacity: btnOpacity }]}>
        <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={enter}>
          <Text style={styles.buttonText}>Start listening →</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: height * 0.18,
    paddingBottom: 56,
    justifyContent: 'space-between',
  },
  content: { gap: 28 },
  emoji: { fontSize: 72 },
  textBlock: { gap: 10 },
  welcome: { fontSize: 20, fontWeight: '400' },
  tagline: { fontSize: 32, fontWeight: '600', letterSpacing: -0.5, lineHeight: 38 },
  sub: { fontSize: 16, lineHeight: 24, marginTop: 4 },
  btnWrap: {},
  button: { borderRadius: 14, paddingVertical: 20, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});
