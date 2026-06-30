import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Props = {
  visible: boolean;
  xp: number;
  label?: string;
  levelUp?: string | null;
  onDone?: () => void;
};

export default function XpToast({ visible, xp, label = 'XP earned', levelUp, onDone }: Props) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.sequence([
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(levelUp ? 2200 : 1600),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      translateY.setValue(80);
      onDone?.();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.card, borderColor: levelUp ? colors.accent : colors.border },
        { transform: [{ translateY }], opacity },
      ]}
    >
      <Text style={[styles.xp, { color: colors.accent }]}>+{xp} XP</Text>
      {levelUp ? (
        <>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <Text style={[styles.label, { color: colors.text }]}>Level Up</Text>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <Text style={[styles.levelTitle, { color: colors.accent }]}>{levelUp}</Text>
        </>
      ) : (
        <>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  xp: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  label: { fontSize: 14 },
  levelTitle: { fontSize: 14, fontWeight: '600' },
});
