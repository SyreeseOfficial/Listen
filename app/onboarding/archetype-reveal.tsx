import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { getProfile } from '../../utils/storage';
import { useState } from 'react';

const { height } = Dimensions.get('window');

const ARCHETYPES: Record<string, { name: string; emoji: string; tagline: string; desc: string }> = {
  casual:    { name: 'The Wanderer',   emoji: '🌊', tagline: 'Music finds you.',         desc: 'You let music happen organically — a soundtrack to whatever life brings. You\'re not chasing playlists, you\'re in the moment.' },
  curious:   { name: 'The Explorer',   emoji: '🔭', tagline: 'Always one more album.',   desc: 'You hear details others miss. Every track is a door. You\'re building taste, not just hours.' },
  dedicated: { name: 'The Ritualist',  emoji: '🕯', tagline: 'Listening is a practice.', desc: 'You make time. Sit down, hit play, disappear. Music isn\'t background — it\'s the whole point.' },
  audiophile: { name: 'The Purist',    emoji: '🎛', tagline: 'Every detail matters.',    desc: 'You hear the room, the mic, the pressing. You\'re not just listening to music — you\'re listening to sound itself.' },
};

export default function ArchetypeRevealScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const [archetype, setArchetype] = useState(ARCHETYPES.casual);

  useEffect(() => {
    getProfile().then((p) => {
      const key = p?.listenerType ?? 'casual';
      setArchetype(ARCHETYPES[key] ?? ARCHETYPES.casual);
    });
    Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity }]}>
      <View style={styles.content}>
        <Text style={styles.bigEmoji}>{archetype.emoji}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Your listener type</Text>
        <Text style={[styles.name, { color: colors.text }]}>{archetype.name}</Text>
        <Text style={[styles.tagline, { color: colors.accent }]}>{archetype.tagline}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{archetype.desc}</Text>
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={() => router.push('/onboarding/social-proof')}
      >
        <Text style={styles.buttonText}>This is me →</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingTop: height * 0.12, paddingBottom: 48, justifyContent: 'space-between' },
  content: { gap: 12 },
  bigEmoji: { fontSize: 64, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  name: { fontSize: 36, fontWeight: '700', letterSpacing: -0.5 },
  tagline: { fontSize: 18, fontWeight: '500', fontStyle: 'italic', marginBottom: 4 },
  desc: { fontSize: 16, lineHeight: 24 },
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});
