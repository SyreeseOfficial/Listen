import {
  View, Text, StyleSheet, Pressable, ScrollView, Alert, Dimensions,
  Modal, Animated,
} from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { getProfile, getSessions, getPendingSession, clearPendingSession } from '../../utils/storage';
import { computeStats, formatDuration } from '../../utils/stats';
import { getFakeListenerCount, getMilestone, computeArchetype, getIdentityMessage, getRegretInjection, getParasocialBuddy } from '../../utils/engagement';
import { getLevelInfo, getStreakMultiplierLabel } from '../../utils/xp';
import { getFakeSocialCard } from '../../utils/social';
import { getCurrentWeekBadge, checkWeeklyBadge } from '../../constants/timeBadges';
import * as Haptics from '../../utils/haptics';
import { scheduleStreakRiskTonight } from '../../utils/notifications';

const { height, width } = Dimensions.get('window');
const DURATIONS = Array.from({ length: 120 }, (_, i) => i + 1);
const ITEM_HEIGHT = 52;
const CARD_W = width * 0.62;

const RAW_TICKER = [
  'Marcus T. just hit a 21-day streak',
  'Priya K. unlocked "The Regular"',
  'Jordan L. logged their 50th session',
  'Sam R. is on a 9-day streak',
  'Alex M. reached Level 7',
  'Riley B. hit 10 hours of listening',
  'Morgan C. earned "Iron Ears"',
  'Casey D. just finished a 90-minute session',
  'Jamie L. completed their 100th session',
  'Taylor S. has listened 14 days straight',
  'Drew P. just hit Level 5',
  'Quinn A. logged 25 total hours',
  'Blake N. completed a perfect week',
  'Avery W. unlocked "Century"',
  'Charlie T. just hit a 30-day streak',
  'Sage L. rated 10 sessions this month',
  'River S. unlocked "Deep Dive"',
];

function getTimeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type InsightCard = {
  id: string; tag: string; title: string; body: string;
  cta?: string; onPress?: () => void; urgent?: boolean;
};

type StreakInfo = { streak: number; mult: string; hasListenedToday: boolean };

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const pickerRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tickerOpacity = useRef(new Animated.Value(1)).current;
  const tickerY = useRef(new Animated.Value(0)).current;
  const tickerIndexRef = useRef(0);
  const tickerEvents = useRef([...RAW_TICKER].sort(() => Math.random() - 0.5)).current;

  const [showPicker, setShowPicker] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [listenerCount, setListenerCount] = useState(getFakeListenerCount());
  const [tickerText, setTickerText] = useState(tickerEvents[0]);

  const [userName, setUserName] = useState('');
  const [levelInfo, setLevelInfo] = useState(getLevelInfo(0));
  const [identityMessage, setIdentityMessage] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [cards, setCards] = useState<InsightCard[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<{ done: number; total: number } | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight());

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [profile, sessions] = await Promise.all([getProfile(), getSessions()]);
        const p = profile!;
        const stats = computeStats(sessions, p?.streakShields ?? 0);
        const li = getLevelInfo(p?.xp ?? 0);
        const name = p?.name ?? '';
        const archetype = computeArchetype(sessions);

        const totalH = Math.floor(stats.totalSeconds / 3600);
        const totalM = Math.floor((stats.totalSeconds % 3600) / 60);
        const sunkStr = totalH > 0 ? `${totalH}h ${totalM}m` : totalM > 0 ? `${totalM}m` : null;
        const defaultMins = p?.defaultSessionMinutes ?? 30;
        const todayStr = new Date().toDateString();
        const hasListenedToday = sessions.some(
          (s) => s.completed && new Date(s.completedAt).toDateString() === todayStr
        );

        setUserName(name);
        setLevelInfo(li);
        setIdentityMessage(getIdentityMessage(archetype.title));
        setMilestone(getMilestone(stats));
        setSelectedMinutes(defaultMins);
        setStreakInfo({
          streak: stats.currentStreak,
          mult: getStreakMultiplierLabel(stats.currentStreak),
          hasListenedToday,
        });

        const built: InsightCard[] = [];

        if (stats.currentStreak >= 1) {
          built.push({
            id: 'streak', tag: 'XP BONUS',
            title: `${getStreakMultiplierLabel(stats.currentStreak)} bonus active`,
            body: `Your ${stats.currentStreak}-day streak is boosting every session. Don't miss tonight.`,
            urgent: true,
          });
        } else if (stats.longestStreak >= 3) {
          built.push({
            id: 'resurrection', tag: 'STREAK LOST',
            title: 'Your streak broke.',
            body: `Your ${stats.longestStreak}-day best is gone. Every day you wait costs momentum.`,
            cta: '→ Revive with Pro',
            onPress: () => Alert.alert('Listen Pro', 'Streak revival, unlimited freezes, and more.\n\nComing soon.', [{ text: 'Got it' }]),
          });
        }

        const regret = getRegretInjection(sessions, p?.xp ?? 0);
        if (regret) {
          built.push({ id: 'regret', tag: 'MISSED YESTERDAY', title: 'That session is gone.', body: regret });
        }

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

        if (name) {
          const buddy = getParasocialBuddy(name, stats.currentStreak);
          built.push({ id: 'buddy', tag: 'YOUR PARTNER', title: buddy.name, body: buddy.message });
        }

        const social = getFakeSocialCard(li.level);
        built.push({
          id: 'social', tag: 'LISTENERS',
          title: `${social.name} from ${social.city}`,
          body: `${social.name} ${social.action} You're at Level ${li.level}.`,
        });

        if (sunkStr && stats.sessionsCompleted > 0) {
          built.push({
            id: 'sunk', tag: 'YOUR JOURNEY',
            title: `${sunkStr} invested`,
            body: `${stats.sessionsCompleted} sessions of dedicated listening. You've built something real.`,
          });
        }

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

        const commitment = p?.weeklyCommitment;
        if (commitment) {
          const now = new Date();
          const daysToMonday = (now.getDay() + 6) % 7;
          const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
          const done = sessions.filter((s) => s.completed && new Date(s.completedAt) >= weekStart).length;
          setWeeklyGoal({ done: Math.min(done, commitment), total: commitment });
        } else {
          setWeeklyGoal(null);
        }

        if (p?.notificationsEnabled && !hasListenedToday) {
          scheduleStreakRiskTonight(p?.notificationHour ?? 21);
        }
      }
      load();
    }, [])
  );

  // Live listener count
  useEffect(() => {
    const interval = setInterval(() => setListenerCount(getFakeListenerCount()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Streak countdown — only ticks when at risk
  useEffect(() => {
    if (!streakInfo?.streak || streakInfo.hasListenedToday) return;
    const interval = setInterval(() => setTimeLeft(getTimeUntilMidnight()), 60000);
    return () => clearInterval(interval);
  }, [streakInfo]);

  // Vertical ticker
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(tickerOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(tickerY, { toValue: -10, duration: 280, useNativeDriver: true }),
      ]).start(() => {
        tickerIndexRef.current = (tickerIndexRef.current + 1) % tickerEvents.length;
        setTickerText(tickerEvents[tickerIndexRef.current]);
        tickerY.setValue(10);
        Animated.parallel([
          Animated.timing(tickerOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(tickerY, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]).start();
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Session resume prompt
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
          : 'Your timer ran out while the app was closed.',
        [
          { text: 'Discard', style: 'destructive', onPress: () => clearPendingSession() },
          {
            text: adjustedRemaining > 0 ? 'Resume' : 'Finish session',
            onPress: () => router.push({
              pathname: '/session',
              params: {
                minutes: pending.minutes, equipment: pending.equipment,
                resumeRemaining: String(adjustedRemaining), resumeTotal: String(pending.totalSeconds),
                sessionId: pending.sessionId,
              },
            }),
          },
        ],
        { cancelable: false }
      );
    });
  }, []);

  function openPicker() {
    Haptics.impact();
    setShowPicker(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      pickerRef.current?.scrollTo({ y: (selectedMinutes - 1) * ITEM_HEIGHT, animated: false });
    }, 60);
  }

  function closePicker() {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowPicker(false));
  }

  function handleStart() {
    closePicker();
    setTimeout(() => {
      router.push({ pathname: '/pre-session', params: { minutes: selectedMinutes } });
    }, 200);
  }

  const showCountdown = streakInfo && streakInfo.streak >= 1;

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.wordmarkRow}>
            <Text style={[styles.wordmark, { color: colors.accent }]}>Listen</Text>
            <View style={[styles.levelPill, { borderColor: colors.accent }]}>
              <Text style={[styles.levelPillText, { color: colors.accent }]}>Lv.{levelInfo.level}</Text>
            </View>
          </View>
          {userName ? <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hey, {userName}</Text> : null}
          {identityMessage ? <Text style={[styles.identityMsg, { color: colors.accent }]}>{identityMessage}</Text> : null}
          <Text style={[styles.liveCount, { color: colors.textSecondary }]}>
            ◎ {listenerCount.toLocaleString()} listening now
          </Text>
        </View>

        {/* Flex middle — button + countdown */}
        <View style={styles.middle}>
          <Pressable style={[styles.startButton, { backgroundColor: colors.accent }]} onPress={openPicker}>
            <Text style={styles.startText}>Begin Session</Text>
          </Pressable>

          {showCountdown && (
            <Text style={[styles.countdown, { color: streakInfo.hasListenedToday ? colors.accent : colors.text }]}>
              {streakInfo.hasListenedToday
                ? `🔥 ${streakInfo.mult} XP active · safe today ✓`
                : `🔥 ${streakInfo.mult} XP resets in ${timeLeft}`}
            </Text>
          )}

          {milestone && (
            <Text style={[styles.milestone, { color: colors.textSecondary }]}>↑ {milestone}</Text>
          )}
        </View>

        {/* Live ticker */}
        <View style={[styles.tickerWrap, { borderTopColor: colors.border }]}>
          <Animated.Text
            style={[styles.tickerText, { color: colors.textSecondary, opacity: tickerOpacity, transform: [{ translateY: tickerY }] }]}
            numberOfLines={1}
          >
            ◎  {tickerText}
          </Animated.Text>
        </View>

        {/* Weekly goal */}
        {weeklyGoal && (
          <View style={styles.goalSection}>
            <View style={styles.goalHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>WEEKLY GOAL</Text>
              <Text style={[styles.goalCount, { color: weeklyGoal.done >= weeklyGoal.total ? colors.accent : colors.text }]}>
                {weeklyGoal.done}/{weeklyGoal.total}{weeklyGoal.done >= weeklyGoal.total ? '  ✓' : ''}
              </Text>
            </View>
            <View style={[styles.goalTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.goalFill, { backgroundColor: colors.accent, width: `${Math.min((weeklyGoal.done / weeklyGoal.total) * 100, 100)}%` }]} />
            </View>
          </View>
        )}

        {/* Insight cards */}
        {cards.length > 0 && (
          <View style={styles.cardsSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 10 }]}>YOUR INSIGHTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
              {cards.map((card) => (
                <Pressable
                  key={card.id}
                  style={[styles.insightCard, { backgroundColor: colors.card, borderColor: card.urgent ? colors.accent : colors.border }]}
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
          </View>
        )}

      </View>

      {/* Duration picker bottom sheet */}
      <Modal visible={showPicker} transparent animationType="none" onRequestClose={closePicker}>
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closePicker} />
          </Animated.View>
          <Animated.View style={[styles.sheet, { backgroundColor: colors.background, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>SESSION LENGTH</Text>
            <View style={styles.pickerWrapper}>
              <View style={[styles.pickerHighlight, { borderColor: colors.border }]} />
              <ScrollView
                ref={pickerRef}
                style={styles.pickerScroll}
                showsVerticalScrollIndicator={false}
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
                    <Text style={[
                      styles.pickerItemText,
                      { color: min === selectedMinutes ? colors.text : colors.textSecondary },
                      min === selectedMinutes && styles.pickerItemSelected,
                    ]}>
                      {formatDuration(min * 60)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            <Pressable style={[styles.sheetBtn, { backgroundColor: colors.accent }]} onPress={handleStart}>
              <Text style={styles.sheetBtnText}>Start — {formatDuration(selectedMinutes * 60)}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52, paddingBottom: 20 },
  header: { paddingHorizontal: 28, gap: 4, marginBottom: 4 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontSize: 36, fontWeight: '300', letterSpacing: 4 },
  levelPill: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  levelPillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  greeting: { fontSize: 15 },
  identityMsg: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  liveCount: { fontSize: 12, marginTop: 2 },
  middle: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  startButton: { borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  startText: { color: '#FFF', fontSize: 18, fontWeight: '600', letterSpacing: 0.3 },
  countdown: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  milestone: { fontSize: 13, textAlign: 'center' },
  tickerWrap: {
    paddingHorizontal: 28, paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  tickerText: { fontSize: 13 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase' },
  goalSection: { paddingHorizontal: 28, marginTop: 14, marginBottom: 2, gap: 8 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalCount: { fontSize: 13, fontWeight: '600' },
  goalTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  goalFill: { height: 5, borderRadius: 3 },
  cardsSection: { paddingTop: 14 },
  cardsRow: { paddingHorizontal: 28, gap: 10, paddingRight: 36 },
  insightCard: { width: CARD_W, borderWidth: 1.5, borderRadius: 18, padding: 18, gap: 6 },
  cardTag: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  cardTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, lineHeight: 22 },
  cardBody: { fontSize: 13, lineHeight: 19 },
  cardCta: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  // bottom sheet
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 28, paddingBottom: 40, paddingTop: 14, gap: 20,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },
  pickerWrapper: { height: ITEM_HEIGHT * 5, position: 'relative' },
  pickerHighlight: {
    position: 'absolute', top: ITEM_HEIGHT * 2, left: 0, right: 0,
    height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, zIndex: 1,
    pointerEvents: 'none',
  },
  pickerScroll: { flex: 1 },
  pickerItem: { justifyContent: 'center', alignItems: 'center' },
  pickerItemText: { fontSize: 22, fontWeight: '300' },
  pickerItemSelected: { fontSize: 26, fontWeight: '500' },
  sheetBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  sheetBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
});
