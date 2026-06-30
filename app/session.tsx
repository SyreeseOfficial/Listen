import {
  View, Text, StyleSheet, Pressable, Animated, Dimensions, AppState, Alert,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import { useTheme } from '../context/ThemeContext';
import { saveSession, getProfile } from '../utils/storage';
import { formatCountdown } from '../utils/stats';

export default function SessionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { minutes, equipment } = useLocalSearchParams<{ minutes: string; equipment: string }>();
  const totalSeconds = parseInt(minutes ?? '30', 10) * 60;

  const [remaining, setRemaining] = useState(totalSeconds);
  const [paused, setPaused] = useState(false);
  const [sessionId] = useState(() => Date.now().toString());
  const effectiveTotalRef = useRef(totalSeconds);
  const remainingRef = useRef(totalSeconds);
  const autoCompleteRef = useRef(true);
  const appState = useRef(AppState.currentState);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  KeepAwake.useKeepAwake();

  useEffect(() => {
    getProfile().then((p) => { autoCompleteRef.current = p?.autoComplete ?? true; });
  }, []);

  useEffect(() => {
    if (paused) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          remainingRef.current = 0;
          if (autoCompleteRef.current) {
            finish(true);
          } else {
            Alert.alert(
              'Timer reached zero',
              'Finish your session or keep going?',
              [
                { text: 'Keep going', style: 'cancel' },
                { text: 'Finish session', onPress: () => finish(true) },
              ]
            );
          }
          return 0;
        }
        const next = prev - 1;
        remainingRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { appState.current = s; });
    return () => sub.remove();
  }, []);

  function togglePause() {
    Haptics.selectionAsync();
    setPaused((p) => !p);
  }

  function adjustTime(delta: number) {
    Haptics.selectionAsync();
    setRemaining((prev) => {
      const next = Math.max(60, prev + delta);
      effectiveTotalRef.current = Math.max(60, effectiveTotalRef.current + (next - prev));
      remainingRef.current = next;
      return next;
    });
  }

  async function finish(completed: boolean) {
    Haptics.notificationAsync(
      completed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    const elapsed = effectiveTotalRef.current - remainingRef.current;
    const equipmentUsed: string[] = equipment ? JSON.parse(equipment) : [];
    await saveSession({
      id: sessionId,
      duration: elapsed > 0 ? elapsed : effectiveTotalRef.current,
      completedAt: new Date().toISOString(),
      completed,
      equipmentUsed,
    });
    router.replace({
      pathname: '/complete',
      params: { minutes, completed: completed ? '1' : '0', sessionId, equipment: equipment ?? '[]' },
    });
  }

  function handleEnd() {
    Alert.alert(
      'End session?',
      'Your session will be saved as incomplete.',
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'End session', style: 'destructive', onPress: () => finish(false) },
      ]
    );
  }

  const progress = Math.max(0, 1 - remaining / effectiveTotalRef.current);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
      </View>

      <Animated.View style={[styles.timerSection, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={[styles.timer, { color: colors.text }]}>{formatCountdown(remaining)}</Text>
        <Text style={[styles.timerSub, { color: colors.textSecondary }]}>
          {paused ? 'paused' : 'listening'}
        </Text>
        <View style={styles.adjustRow}>
          <Pressable onPress={() => adjustTime(-300)} hitSlop={16}>
            <Text style={[styles.adjustText, { color: colors.textSecondary }]}>−5 min</Text>
          </Pressable>
          <View style={[styles.adjustDot, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => adjustTime(300)} hitSlop={16}>
            <Text style={[styles.adjustText, { color: colors.textSecondary }]}>+5 min</Text>
          </Pressable>
        </View>
      </Animated.View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.controlBtn, { borderColor: paused ? colors.accent : colors.border }]}
          onPress={togglePause}
        >
          <Text style={[styles.controlBtnText, { color: paused ? colors.accent : colors.text }]}>
            {paused ? 'Resume' : 'Pause'}
          </Text>
        </Pressable>
        <Pressable style={[styles.controlBtn, { borderColor: colors.border }]} onPress={handleEnd}>
          <Text style={[styles.controlBtnText, { color: colors.textSecondary }]}>End</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  progressFill: { height: 3, borderRadius: 2 },
  timerSection: { alignItems: 'center', gap: 12 },
  timer: { fontSize: 80, fontWeight: '200', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  timerSub: { fontSize: 14, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase' },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 4 },
  adjustText: { fontSize: 13, fontWeight: '500' },
  adjustDot: { width: 3, height: 3, borderRadius: 2 },
  controls: { position: 'absolute', bottom: 64, flexDirection: 'row', gap: 12 },
  controlBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  controlBtnText: { fontSize: 15, fontWeight: '500' },
});
