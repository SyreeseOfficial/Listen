import {
  View, Text, StyleSheet, Pressable, Animated, Dimensions, AppState, Alert,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import { useTheme } from '../context/ThemeContext';
import { saveSession } from '../utils/storage';
import { formatCountdown } from '../utils/stats';

const { height, width } = Dimensions.get('window');

export default function SessionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { minutes, equipment } = useLocalSearchParams<{ minutes: string; equipment: string }>();
  const totalSeconds = (parseInt(minutes ?? '30', 10)) * 60;

  const [remaining, setRemaining] = useState(totalSeconds);
  const [paused, setPaused] = useState(false);
  const [sessionId] = useState(() => Date.now().toString());
  const startedAt = useRef(Date.now());
  const pausedAt = useRef<number | null>(null);
  const pausedTotal = useRef(0);
  const appState = useRef(AppState.currentState);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  KeepAwake.useKeepAwake();

  // Pulse animation
  useEffect(() => {
    if (paused) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [paused]);

  // Countdown tick
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finish(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  // App state: background = keep running, closed/inactive = pause
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'active' && nextState !== 'active') {
        // App closed/minimized heavily — pause
        if (nextState === 'background') {
          // Background = user switching apps, keep running
          // We do nothing
        }
      }
      if (nextState === 'active' && appState.current !== 'active') {
        // Came back — if was paused via close, show resume prompt
        if (pausedAt.current !== null) {
          // already paused, prompt handled
        }
      }
      appState.current = nextState;
    });

    return () => sub.remove();
  }, []);

  // On mount, check if there's a pending session (app killed mid-session)
  // ponytail: skip for MVP — AppState 'background' keeps timer running, full kill loses state

  async function finish(completed: boolean) {
    Haptics.notificationAsync(
      completed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    const elapsed = totalSeconds - remaining;
    const equipmentUsed: string[] = equipment ? JSON.parse(equipment) : [];
    await saveSession({
      id: sessionId,
      duration: elapsed > 0 ? elapsed : totalSeconds,
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

  const progress = 1 - remaining / totalSeconds;

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
      </Animated.View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.endBtn, { borderColor: colors.border }]}
          onPress={handleEnd}
        >
          <Text style={[styles.endBtnText, { color: colors.textSecondary }]}>End</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
  },
  progressFill: { height: 3, borderRadius: 2 },
  timerSection: { alignItems: 'center', gap: 12 },
  timer: { fontSize: 80, fontWeight: '200', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  timerSub: { fontSize: 14, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase' },
  controls: { position: 'absolute', bottom: 64, alignItems: 'center' },
  endBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  endBtnText: { fontSize: 15, fontWeight: '500' },
});
