import {
  View, Text, StyleSheet, Pressable, ScrollView, Alert, Dimensions,
} from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { getProfile, getSessions, getPendingSession, clearPendingSession } from '../../utils/storage';
import { computeStats, formatDuration } from '../../utils/stats';
import { getFakeListenerCount, getMilestone, computeArchetype, getIdentityMessage, getRegretInjection, getParasocialBuddy } from '../../utils/engagement';
import { getLevelInfo, getStreakMultiplierLabel, getNearMissAchievements, getEndowedProgress } from '../../utils/xp';
import { getFakeSocialCard } from '../../utils/social';
import { getCurrentWeekBadge, checkWeeklyBadge } from '../../constants/timeBadges';
import * as Haptics from '../../utils/haptics';

const { height, width } = Dimensions.get('window');
const DURATIONS = Array.from({ length: 120 }, (_, i) => i + 1);
const ITEM_HEIGHT = 52;
const CARD_W = width * 0.62;

type InsightCard = {
  id: string;
  tag: string;
  title: string;
  body: string;
  cta?: string;
  onPress?: () => void;
  urgent?: boolean;
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const pickerRef = useRef<ScrollView>(null);
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [listenerCount, setListenerCount] = useState(getFakeListenerCount());

  const [userName, setUserName] = useState('');
  const [levelInfo, setLevelInfo] = useState(getLevelInfo(0));
  const [identityMessage, setIdentityMessage] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [cards, setCards] = useState<InsightCard[]>([]);
  const [nearMiss, setNearMiss] = useState<ReturnType<typeof getNearMissAchievements>>([]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [profile, sessions] = await Promise.all([getProfile(), getSessions()]);
        const p = profile!;
        const stats = computeStats(sessions, p?.streakShields ?? 0);
        const li = getLevelInfo(p?.xp ?? 0);
        const name = p?.name ?? '';
        const archetype = computeArchetype(sessions);

        // Sunk cost string
        const totalH = Math.floor(stats.totalSeconds / 3600);
        const totalM = Math.floor((stats.totalSeconds % 3600) / 60);
        const sunkStr = totalH > 0 ? `${totalH}h ${totalM}m` : totalM > 0 ? `${totalM}m` : null;

        // Default session length
        const defaultMins = p?.defaultSessionMinutes ?? 30;

        setUserName(name);
        setLevelInfo(li);
        setIdentityMessage(getIdentityMessage(archetype.title));
        setMilestone(getMilestone(stats));

        // Near-miss with endowed progress for new users
        const raw = getNearMissAchievements(sessions, p as any, stats);
        const sessionCount = sessions.filter(s => s.completed).length;
        const endowed = raw.map(item => ({
          ...item,
          progress: getEndowedProgress(item.achievement.id, item.progress, sessionCount),
        }));
        setNearMiss(endowed);

        // Scroll picker to default
        setSelectedMinutes(defaultMins);
        setTimeout(() => {
          pickerRef.current?.scrollTo({ y: (defaultMins - 1) * ITEM_HEIGHT, animated: false });
        }, 80);

        // Build insight cards using only local vars (no stale state)
        const built: InsightCard[] = [];

        // 1. Streak XP decay / resurrection
        if (stats.currentStreak >= 1) {
          const mult = getStreakMultiplierLabel(stats.currentStreak);
          built.push({
            id: 'streak', tag: 'XP BONUS',
            title: `${mult} bonus active`,
            body: `Your ${stats.currentStreak}-day streak is boosting every session. Don't miss tonight.`,
            urgent: true,
          });
        } else if (stats.longestStreak >= 3) {
          built.push({
            id: 'resurrection', tag: 'STREAK LOST',
            title: 'Your streak broke.',
            body: `Your ${stats.longestStreak}-day best is gone. Every day you wait costs momentum.`,
            cta: '→ Revive with Pro',
            onPress: () => Alert.alert('Listen Pro', 'Streak revival, unlimited shields, and more.\n\nComing soon.', [{ text: 'Got it' }]),
          });
        }

        // 2. Regret injection — targeted, only when they missed yesterday
        const regret = getRegretInjection(sessions, p?.xp ?? 0);
        if (regret) {
          built.push({ id: 'regret', tag: 'MISSED YESTERDAY', title: 'That session is gone.', body: regret, urgent: false });
        }

        // 3. Grief — fallback if no regret card
        if (!regret) {
          const sorted = [...sessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
          if (sorted.length > 0) {
            const daysSince = (Date.now() - new Date(sorted[0].completedAt).getTime()) / 86400000;
            if (daysSince >= 2) {
              built.push({
                id: 'grief', tag: 'BEEN A WHILE',
                title: `${Math.floor(daysSince)} days without listening.`,
                body: "That's your longest gap recently. Your ears are waiting.",
              });
            }
          }
        }

        // 4. Hot hand
        const sorted2 = [...sessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        const last = sorted2[0];
        if (last && (last.rating ?? 0) >= 4) {
          const hoursAgo = (Date.now() - new Date(last.completedAt).getTime()) / 3600000;
          if (hoursAgo < 48) {
            built.push({
              id: 'hothand', tag: 'ON A ROLL',
              title: "You're on a hot streak.",
              body: 'Listeners who follow up within 24h rate their next session 18% higher on average.',
              urgent: true,
            });
          }
        }

        // 5. Parasocial buddy
        if (name) {
          const buddy = getParasocialBuddy(name, stats.currentStreak);
          built.push({ id: 'buddy', tag: 'YOUR PARTNER', title: buddy.name, body: buddy.message });
        }

        // 6. Social obligation
        const social = getFakeSocialCard(li.level);
        built.push({
          id: 'social', tag: 'LISTENERS',
          title: `${social.name} from ${social.city}`,
          body: `${social.name} ${social.action} You're at Level ${li.level}.`,
        });

        // 7. Sunk cost
        if (sunkStr && stats.sessionsCompleted > 0) {
          built.push({
            id: 'sunk', tag: 'YOUR JOURNEY',
            title: `${sunkStr} invested`,
            body: `${stats.sessionsCompleted} sessions of dedicated listening. You've built something real.`,
          });
        }

        // 8. Weekly badge
        const { badge, weekId, daysLeft } = getCurrentWeekBadge();
        const weekEarned = (p?.achievements ?? []).includes(weekId) || checkWeeklyBadge(badge, sessions, stats);
        built.push({
          id: 'weekly', tag: 'THIS WEEK ONLY',
          title: badge.title,
          body: `${badge.description} +${badge.xpReward} XP · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`,
          cta: weekEarned ? '✓ Earned' : undefined,
          urgent: !weekEarned && daysLeft <= 1,
        });

        setCards(built);
      }
      load();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(() => setListenerCount(getFakeListenerCount()), 30000);
    return () => clearInterval(interval);
  }, []);

  // One-time check on app open: resume an interrupted session
  useEffect(() => {
    getPendingSession().then((pending) => {
      if (!pending) return;
      const elapsedSinceSave = Math.floor((Date.now() - new Date(pending.savedAt).getTime()) / 1000);
      const adjustedRemaining = Math.max(0, pending.remainingSeconds - elapsedSinceSave);
      const minsLeft = Math.ceil(adjustedRemaining / 60);

      Alert.alert(
        'Resume session?',
        adjustedRemaining > 0
          ? `You have ${minsLeft} minute${minsLeft !== 1 ? 's' : ''} left in an active session.`
          : "Your timer ran out while the app was closed.",
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => clearPendingSession(),
          },
          {
            text: adjustedRemaining > 0 ? 'Resume' : 'Finish session',
            onPress: () => {
              router.push({
                pathname: '/session',
                params: {
                  minutes: pending.minutes,
                  equipment: pending.equipment,
                  resumeRemaining: String(adjustedRemaining),
                  resumeTotal: String(pending.totalSeconds),
                  sessionId: pending.sessionId,
                },
              });
            },
          },
        ],
        { cancelable: false }
      );
    });
  }, []);

  function handleStart() {
    Haptics.impact();
    router.push({ pathname: '/pre-session', params: { minutes: selectedMinutes } });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {/* Hero section */}
      <View style={[styles.hero, { minHeight: height * 0.86 }]}>
        <View style={styles.header}>
          <View style={styles.wordmarkRow}>
            <Text style={[styles.wordmark, { color: colors.accent }]}>Listen</Text>
            <View style={[styles.levelPill, { borderColor: colors.accent }]}>
              <Text style={[styles.levelPillText, { color: colors.accent }]}>Lv.{levelInfo.level}</Text>
            </View>
          </View>
          {userName ? <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hey, {userName}</Text> : null}
          {identityMessage ? (
            <Text style={[styles.identityMsg, { color: colors.accent }]}>{identityMessage}</Text>
          ) : null}
          <Text style={[styles.liveCount, { color: colors.textSecondary }]}>
            ◎ {listenerCount.toLocaleString()} listening now
          </Text>
        </View>

        <View style={styles.pickerSection}>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>SESSION LENGTH</Text>
          <View style={styles.pickerWrapper}>
            <View style={[styles.pickerHighlight, { borderColor: colors.border }]} />
            <ScrollView
              ref={pickerRef}
              style={styles.pickerScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                const clamped = Math.max(0, Math.min(index, DURATIONS.length - 1));
                setSelectedMinutes(DURATIONS[clamped]);
                Haptics.selection();
              }}
            >
              {DURATIONS.map((min) => (
                <View key={min} style={[styles.pickerItem, { height: ITEM_HEIGHT }]}>
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: min === selectedMinutes ? colors.text : colors.textSecondary },
                      min === selectedMinutes && styles.pickerItemSelected,
                    ]}
                  >
                    {formatDuration(min * 60)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.startSection}>
          <Pressable style={[styles.startButton, { backgroundColor: colors.accent }]} onPress={handleStart}>
            <Text style={styles.startText}>Begin Session</Text>
          </Pressable>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {selectedMinutes} minute{selectedMinutes !== 1 ? 's' : ''} of focused listening
          </Text>
          {milestone && <Text style={[styles.milestone, { color: colors.accent }]}>↑ {milestone}</Text>}
        </View>
      </View>

      {/* Insight cards */}
      {cards.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>YOUR INSIGHTS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
          >
            {cards.map((card) => (
              <Pressable
                key={card.id}
                style={[styles.insightCard, {
                  backgroundColor: colors.card,
                  borderColor: card.urgent ? colors.accent : colors.border,
                }]}
                onPress={card.onPress}
                disabled={!card.onPress}
              >
                <Text style={[styles.cardTag, { color: colors.accent }]}>{card.tag}</Text>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{card.title}</Text>
                <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={3}>{card.body}</Text>
                {card.cta && <Text style={[styles.cardCta, { color: colors.accent }]}>{card.cta}</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {/* Near-miss achievements */}
      {nearMiss.length > 0 && (
        <View style={styles.nearMissSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 12 }]}>ALMOST THERE</Text>
          {nearMiss.map(({ achievement, progress }) => (
            <View
              key={achievement.id}
              style={[styles.nearMissRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.nearMissMeta}>
                <Text style={styles.nearMissIcon}>{achievement.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nearMissTitle, { color: colors.text }]}>{achievement.title}</Text>
                  <Text style={[styles.nearMissDesc, { color: colors.textSecondary }]}>{achievement.description}</Text>
                </View>
                <Text style={[styles.nearMissPct, { color: colors.accent }]}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={[styles.nearMissTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.nearMissFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 32,
    paddingTop: height * 0.1,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  header: { gap: 3 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontSize: 36, fontWeight: '300', letterSpacing: 4 },
  levelPill: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  levelPillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  greeting: { fontSize: 15 },
  identityMsg: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  liveCount: { fontSize: 12, marginTop: 2 },
  pickerSection: { alignItems: 'center', gap: 16 },
  pickerLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase' },
  pickerWrapper: { height: ITEM_HEIGHT * 5, width: 160, position: 'relative' },
  pickerHighlight: {
    position: 'absolute', top: ITEM_HEIGHT * 2, left: 0, right: 0,
    height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, zIndex: 1,
    pointerEvents: 'none',
  },
  pickerScroll: { flex: 1 },
  pickerItem: { justifyContent: 'center', alignItems: 'center' },
  pickerItemText: { fontSize: 22, fontWeight: '300' },
  pickerItemSelected: { fontSize: 26, fontWeight: '500' },
  startSection: { gap: 12, alignItems: 'center' },
  startButton: { borderRadius: 16, paddingVertical: 20, paddingHorizontal: 64 },
  startText: { color: '#FFF', fontSize: 18, fontWeight: '600', letterSpacing: 0.3 },
  hint: { fontSize: 14 },
  milestone: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase',
    paddingHorizontal: 24, marginBottom: 10,
  },
  cardsRow: { paddingHorizontal: 24, gap: 10, paddingBottom: 4, paddingRight: 32 },
  insightCard: {
    width: CARD_W, borderWidth: 1.5, borderRadius: 18, padding: 18, gap: 6,
  },
  cardTag: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  cardTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, lineHeight: 22 },
  cardBody: { fontSize: 13, lineHeight: 19 },
  cardCta: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  nearMissSection: { paddingHorizontal: 24, paddingTop: 24 },
  nearMissRow: { borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 10 },
  nearMissMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  nearMissIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  nearMissTitle: { fontSize: 14, fontWeight: '600' },
  nearMissDesc: { fontSize: 12, marginTop: 1 },
  nearMissPct: { fontSize: 14, fontWeight: '700', minWidth: 38, textAlign: 'right' },
  nearMissTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  nearMissFill: { height: 4, borderRadius: 2 },
});
