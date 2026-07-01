import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, Dimensions, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { updateSession, getSessions, getProfile, updateProfile } from '../utils/storage';
import { computeStats, formatDuration } from '../utils/stats';
import { DISCOVERIES } from '../constants/discoveries';
import {
  calcSessionXp, calcPostSessionXp, totalXp, getLevelInfo, checkAchievements,
} from '../utils/xp';
import { getSessionRanking } from '../utils/engagement';
import * as Haptics from '../utils/haptics';
import XpToast from '../components/XpToast';
import { cancelStreakRiskNotification } from '../utils/notifications';

const { height } = Dimensions.get('window');
const STARS = [1, 2, 3, 4, 5];

const INTENTION_LABELS: Record<string, string> = {
  enjoy: '🎵 Just enjoy',
  critical: '🔍 Listen critically',
  relax: '😌 Wind down',
  focus: '💪 Focus session',
  discover: '✨ Discover',
};

function getStartOfWeek(): Date {
  const now = new Date();
  const daysToMonday = (now.getDay() + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
}

export default function CompleteScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { minutes, completed, sessionId, equipment, intention } = useLocalSearchParams<{
    minutes: string; completed: string; sessionId: string; equipment: string; intention?: string;
  }>();
  const isCompleted = completed === '1';
  const mins = parseInt(minutes ?? '0', 10);
  const equipmentUsed: string[] = equipment ? JSON.parse(equipment) : [];
  const intentionKey = intention || null;
  const intentionDisplay = intentionKey ? (INTENTION_LABELS[intentionKey] ?? intentionKey) : null;

  const [rating, setRating] = useState(0);
  const [album, setAlbum] = useState('');
  const [notes, setNotes] = useState('');
  const [discovery] = useState(() => DISCOVERIES[Math.floor(Math.random() * DISCOVERIES.length)]);
  const [freezeEarned, setFreezeEarned] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [goalHit, setGoalHit] = useState(false);
  const [toastXp, setToastXp] = useState(0);
  const [toastLabel, setToastLabel] = useState('');
  const [toastLevelUp, setToastLevelUp] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const iconScale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.spring(iconScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!isCompleted) return;
    Haptics.notification();
    cancelStreakRiskNotification();

    async function onLoad() {
      const [sessions, profile] = await Promise.all([getSessions(), getProfile()]);
      const shields = profile?.streakShields ?? 0;
      const stats = computeStats(sessions, shields);
      const lastShieldStreak = profile?.lastShieldStreak ?? 0;
      setCurrentStreak(stats.currentStreak);

      // Freeze award
      if (stats.currentStreak > 0 && stats.currentStreak % 4 === 0 && stats.currentStreak > lastShieldStreak) {
        await updateProfile({ streakShields: shields + 1, lastShieldStreak: stats.currentStreak });
        setFreezeEarned(true);
      }

      // Session XP
      const events = calcSessionXp(mins * 60, isCompleted, stats.currentStreak);
      const earned = totalXp(events);
      const prevXp = profile?.xp ?? 0;
      const newXp = prevXp + earned;
      const prevLevel = getLevelInfo(prevXp);
      const newLevel = getLevelInfo(newXp);
      const leveledUp = newLevel.level > prevLevel.level;

      // Achievement XP
      const newAchievements = checkAchievements(sessions, { ...profile } as any, stats);
      const achXp = newAchievements.reduce((s, a) => s + a.xpReward, 0);
      let finalXp = newXp + achXp;

      // Weekly goal bonus (+50 XP when goal is exactly met)
      const weeklyCommitment = profile?.weeklyCommitment;
      let bonusXp = 0;
      if (weeklyCommitment) {
        const weekStart = getStartOfWeek();
        const sessionsThisWeek = sessions.filter(
          (s) => s.completed && new Date(s.completedAt) >= weekStart
        ).length;
        if (sessionsThisWeek === weeklyCommitment) {
          bonusXp = 50;
          finalXp += bonusXp;
          setGoalHit(true);
        }
      }

      await updateProfile({
        xp: finalXp,
        achievements: [...(profile?.achievements ?? []), ...newAchievements.map((a) => a.id)],
      });

      if (newAchievements.length > 0) Haptics.heavy();
      if (leveledUp) setTimeout(() => Haptics.notification(), 400);

      setToastXp(earned + achXp + bonusXp);
      setToastLabel(
        bonusXp > 0
          ? 'Weekly goal hit! +50 XP bonus'
          : newAchievements.length > 0
            ? `+${newAchievements.length} achievement${newAchievements.length > 1 ? 's' : ''}`
            : 'Session complete'
      );
      setToastLevelUp(leveledUp ? newLevel.title : null);
      setToastVisible(true);
    }
    onLoad();
  }, []);

  async function handleDone() {
    if (navigating) return;

    const postEvents = calcPostSessionXp(rating || undefined, album, notes);
    const postXp = totalXp(postEvents);

    if (sessionId && (rating || album.trim() || notes.trim())) {
      await updateSession(sessionId, {
        rating: rating || undefined,
        album: album.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    if (postXp > 0) {
      const profile = await getProfile();
      await updateProfile({ xp: (profile?.xp ?? 0) + postXp });
      setToastXp(postXp);
      setToastLabel('Session logged');
      setToastLevelUp(null);
      setToastVisible(true);
      setNavigating(true);
    } else {
      router.replace('/(tabs)');
    }
  }

  function handleStar(star: number) {
    Haptics.selection();
    setRating((prev) => (prev === star ? 0 : star));
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Animated.Text style={[styles.icon, { color: colors.accent, transform: [{ scale: iconScale }] }]}>
            {isCompleted ? '◎' : '◌'}
          </Animated.Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {isCompleted ? 'Session complete.' : 'Session ended.'}
          </Text>
          {isCompleted && currentStreak > 0 && (
            <Text style={[styles.streakBadge, { color: colors.accent }]}>
              🔥 Day {currentStreak} streak
            </Text>
          )}
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {isCompleted
              ? `You listened for ${formatDuration(mins * 60)}. Time well spent.`
              : 'You disconnected for a bit. Every session counts.'}
          </Text>
        </View>

        {/* Weekly goal hit */}
        {goalHit && (
          <View style={[styles.banner, { backgroundColor: colors.accent + '18', borderColor: colors.accent }]}>
            <Text style={[styles.bannerText, { color: colors.accent }]}>
              🎯  Weekly goal reached — +50 XP bonus
            </Text>
          </View>
        )}

        {/* Freeze earned */}
        {freezeEarned && (
          <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.accent }]}>
            <Text style={[styles.bannerText, { color: colors.accent }]}>
              🛡  Streak freeze earned — your streak is protected for one missed day
            </Text>
          </View>
        )}

        {/* Intention */}
        {intentionDisplay ? (
          <View style={[styles.intentionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.intentionLabel, { color: colors.textSecondary }]}>INTENTION</Text>
            <Text style={[styles.intentionValue, { color: colors.text }]}>{intentionDisplay}</Text>
          </View>
        ) : null}

        {/* Stats */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Duration" value={formatDuration(mins * 60)} colors={colors} />
          <Divider color={colors.border} />
          <Row label="Status" value={isCompleted ? 'Complete' : 'Partial'}
            valueColor={isCompleted ? colors.accent : colors.textSecondary} colors={colors} />
          {equipmentUsed.length > 0 && (
            <>
              <Divider color={colors.border} />
              <Row label="Gear"
                value={equipmentUsed.map((g) => g.includes(': ') ? g.split(': ')[1] : g).join(', ')}
                colors={colors} />
            </>
          )}
        </View>

        {/* Session ranking */}
        {isCompleted && (
          <View style={[styles.rankCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
            <Text style={[styles.rankLabel, { color: colors.accent }]}>SESSION RANKING</Text>
            <Text style={[styles.rankText, { color: colors.text }]}>
              Your {mins}-minute session ranks in the{' '}
              <Text style={{ color: colors.accent, fontWeight: '700' }}>
                {getSessionRanking(mins * 60)}
              </Text>{' '}
              of all Listen sessions this week.
            </Text>
          </View>
        )}

        {/* Discovery */}
        {isCompleted && (
          <View style={[styles.discoveryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.discoveryLabel, { color: colors.accent }]}>LISTENER INSIGHT</Text>
            <Text style={[styles.discoveryText, { color: colors.text }]}>{discovery}</Text>
          </View>
        )}

        {/* Log section */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LOG THIS SESSION</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 12 }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>How was it?</Text>
          <View style={styles.stars}>
            {STARS.map((star) => (
              <Pressable key={star} onPress={() => handleStar(star)}>
                <Text style={[styles.star, { color: star <= rating ? colors.accent : colors.border }]}>★</Text>
              </Pressable>
            ))}
            {rating > 0 && <Text style={[styles.xpHint, { color: colors.accent }]}>+15 XP</Text>}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 12 }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {`What did you listen to?  `}{album.trim() ? <Text style={{ color: colors.accent }}>+10 XP</Text> : null}
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Album, artist, or playlist"
            placeholderTextColor={colors.textSecondary}
            value={album}
            onChangeText={setAlbum}
            returnKeyType="next"
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 32 }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {`${intentionDisplay ? 'What did you notice?' : 'Notes'}  `}{notes.trim() ? <Text style={{ color: colors.accent }}>+20 XP</Text> : null}
          </Text>
          <TextInput
            style={[styles.input, styles.notesInput, { color: colors.text }]}
            placeholder={intentionDisplay ? 'Anything that stood out' : 'Anything worth remembering'}
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            returnKeyType="done"
          />
        </View>

        <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleDone}>
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </ScrollView>

      <XpToast
        visible={toastVisible}
        xp={toastXp}
        label={toastLabel}
        levelUp={toastLevelUp}
        onDone={() => {
          setToastVisible(false);
          if (navigating) router.replace('/(tabs)');
        }}
      />
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, valueColor, colors }: {
  label: string; value: string; valueColor?: string;
  colors: { text: string; textSecondary: string };
}) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: height * 0.1, paddingBottom: 48 },
  header: { alignItems: 'center', gap: 10, marginBottom: 20 },
  icon: { fontSize: 52 },
  title: { fontSize: 28, fontWeight: '600', letterSpacing: -0.5, textAlign: 'center' },
  streakBadge: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 280 },
  banner: { borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12 },
  bannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  intentionCard: { borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 12, gap: 4 },
  intentionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  intentionValue: { fontSize: 15, fontWeight: '500' },
  card: { borderWidth: 1.5, borderRadius: 16, padding: 18, marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 15, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, marginVertical: 10 },
  rankCard: { borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, gap: 6 },
  rankLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  rankText: { fontSize: 14, lineHeight: 21 },
  discoveryCard: { borderWidth: 1.5, borderRadius: 16, padding: 18, marginBottom: 20, gap: 8 },
  discoveryLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  discoveryText: { fontSize: 15, lineHeight: 22 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, marginTop: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  stars: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  star: { fontSize: 32 },
  xpHint: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  input: { fontSize: 16, paddingVertical: 4 },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  button: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});
