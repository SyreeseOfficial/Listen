import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const PHRASES = [
  'Analyzing your listening style…',
  'Mapping your sonic preferences…',
  'Calibrating session defaults…',
  'Crafting your listener profile…',
  'Almost ready…',
];

const DURATION = 2500;

export default function BuildingProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION - 100,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setPhraseIdx((i) => Math.min(i + 1, PHRASES.length - 1));
    }, DURATION / PHRASES.length);

    const timer = setTimeout(() => {
      router.replace('/onboarding/archetype-reveal');
    }, DURATION);

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Text style={[styles.emoji]}>✨</Text>
        <Text style={[styles.phrase, { color: colors.text }]}>{PHRASES[phraseIdx]}</Text>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.fill, { backgroundColor: colors.accent, width: barWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  center: { width: width * 0.75, alignItems: 'center', gap: 20 },
  emoji: { fontSize: 48 },
  phrase: { fontSize: 17, fontWeight: '500', textAlign: 'center', lineHeight: 24 },
  track: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
