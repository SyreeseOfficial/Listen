import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { getSessions, getProfile, updateProfile, type Session } from '../../utils/storage';
import { computeStats, formatDuration } from '../../utils/stats';
import {
  computeArchetype, getEgoFuel, getMilestone,
  getPhantomInsights, getFakeLeaderboard, getFakeGlobalRank,
} from '../../utils/engagement';
import { getNearMissAchievements, getEndowedProgress, getLevelInfo as getLvl } from '../../utils/xp';
import type { Achievement } from '../../constants/achievements';
import type { Archetype } from '../../utils/engagement';

const { height, width: SCREEN_W } = Dimensions.get('window');
const SEED_DAY = Math.floor(Date.now() / 86400000);
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HEATMAP_WEEKS = 18;
const HEATMAP_GAP = 2;
const HEATMAP_CELL = Math.floor((SCREEN_W - 48 - (HEATMAP_WEEKS - 1) * HEATMAP_GAP) / HEATMAP_WEEKS);

function getHeatmapWeeks(sessions: Session[]) {
  const today = new Date();
  const todayDay = today.getDay();
  const daysToMonday = (todayDay + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysToMonday);

  const sessionDates = new Set(
    sessions
      .filter((s) => s.completed)
      .map((s) => { const d = new Date(s.completedAt); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; })
  );

  return Array.from({ length: HEATMAP_WEEKS }, (_, wi) => {
    const weekOffset = HEATMAP_WEEKS - 1 - wi;
    return Array.from({ length: 7 }, (_, di) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() - weekOffset * 7 + di);
      const isFuture = d > today;
      const isToday = d.toDateString() === today.toDateString();
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return { date: new Date(d), hasSession: !isFuture && sessionDates.has(key), isFuture, isToday };
    });
  });
}
const BAR_H = 72;
type Period = 'week' | 'month' | 'all';

function getWeekChart(sessions: Session[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const y = d.getFullYear(), mo = d.getMonth(), day = d.getDate();
    const mins = sessions
      .filter((s) => {
        if (!s.completed) return false;
        const sd = new Date(s.completedAt);
        return sd.getFullYear() === y && sd.getMonth() === mo && sd.getDate() === day;
      })
      .reduce((sum, s) => sum + Math.floor(s.duration / 60), 0);
    return { label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()], mins, isToday: i === 6 };
  });
}

function getMonthChart(sessions: Session[]) {
  return Array.from({ length: 4 }, (_, i) => {
    const now = Date.now();
    const weekEndMs = now - (3 - i) * 7 * 86400000;
    const weekStartMs = weekEndMs - 7 * 86400000;
    const mins = sessions
      .filter((s) => {
        if (!s.completed) return false;
        const t = new Date(s.completedAt).getTime();
        return t >= weekStartMs && t < weekEndMs;
      })
      .reduce((sum, s) => sum + Math.floor(s.duration / 60), 0);
    return { label: `W${i + 1}`, mins, isToday: i === 3 };
  });
}

function getAllTimeChart(sessions: Session[]) {
  const MONTH_LABELS = 'JFMAMJJASOND';
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const y = d.getFullYear(), mo = d.getMonth();
    const mins = sessions
      .filter((s) => {
        if (!s.completed) return false;
        const sd = new Date(s.completedAt);
        return sd.getFullYear() === y && sd.getMonth() === mo;
      })
      .reduce((sum, s) => sum + Math.floor(s.duration / 60), 0);
    return { label: MONTH_LABELS[mo], mins, isToday: i === 5 };
  });
}

function getChartData(sessions: Session[], period: Period) {
  if (period === 'month') return getMonthChart(sessions);
  if (period === 'all') return getAllTimeChart(sessions);
  return getWeekChart(sessions);
}

function getChartFooter(chartData: { mins: number }[], period: Period): string {
  const total = chartData.reduce((s, d) => s + d.mins, 0);
  if (period === 'week') return `${total} min this week`;
  if (period === 'month') return `${total} min this month`;
  return `${total} min over 6 months`;
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState({
    totalSeconds: 0, sessionsCompleted: 0, weekSeconds: 0,
    currentStreak: 0, longestStreak: 0, avgSeconds: 0, shieldsConsumed: 0,
  });
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [egoFuel, setEgoFuel] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [shields, setShields] = useState(0);
  const [phantomInsights, setPhantomInsights] = useState<string[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReturnType<typeof getFakeLeaderboard>>([]);
  const [globalRank, setGlobalRank] = useState({ rank: 0, pct: 0 });
  const [userLevel, setUserLevel] = useState(1);
  const [rawSessions, setRawSessions] = useState<Session[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [nearMiss, setNearMiss] = useState<Array<{ achievement: Achievement; progress: number }>>([]);
  const router = useRouter();
  const heatmapWeeks = useMemo(() => getHeatmapWeeks(rawSessions), [rawSessions]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [sessions, profile] = await Promise.all([getSessions(), getProfile()]);
        setRawSessions(sessions);
        const availableShields = profile?.streakShields ?? 0;
        const s = computeStats(sessions, availableShields);
        setStats(s);
        setArchetype(computeArchetype(sessions));
        setEgoFuel(getEgoFuel(s));
        setMilestone(getMilestone(s));
        setPhantomInsights(getPhantomInsights(sessions));

        setIsPremiumUser(profile?.isPremium ?? false);
        const lvl = getLvl(profile?.xp ?? 0).level;
        const raw = getNearMissAchievements(sessions, profile!, s);
        const sessionCount = sessions.filter((sess) => sess.completed).length;
        setNearMiss(raw.map((item) => ({
          ...item,
          progress: getEndowedProgress(item.achievement.id, item.progress, sessionCount),
        })));
        setUserLevel(lvl);
        setLeaderboard(getFakeLeaderboard(lvl, profile?.name ?? 'You'));
        setGlobalRank(getFakeGlobalRank(SEED_DAY + lvl));

        if (s.shieldsConsumed > 0) {
          const remaining = Math.max(0, availableShields - s.shieldsConsumed);
          setShields(remaining);
          await updateProfile({ streakShields: remaining });
        } else {
          setShields(availableShields);
        }
      }
      load();
    }, [])
  );

  const tiles = [
    { label: 'Total Time', value: formatDuration(stats.totalSeconds), sub: 'all time' },
    { label: 'Sessions', value: String(stats.sessionsCompleted), sub: 'completed' },
    { label: 'This Week', value: formatDuration(stats.weekSeconds), sub: 'last 7 days' },
    { label: 'Streak', value: `${stats.currentStreak}`, sub: stats.currentStreak === 1 ? 'day' : 'days' },
    { label: 'Average', value: formatDuration(stats.avgSeconds), sub: 'per session' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.pageTitle, { color: colors.text }]}>Stats</Text>

      {/* Phantom completion — "AI" insights after 15+ sessions */}
      {phantomInsights && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTag, { color: colors.accent }]}>YOUR LISTENING PROFILE</Text>
          {phantomInsights.map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <Text style={[styles.insightDot, { color: colors.accent }]}>●</Text>
              <Text style={[styles.insightText, { color: colors.text }]}>{insight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Archetype */}
      {archetype && (
        <View style={[styles.archetypeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.archetypeIcon, { color: colors.accent }]}>{archetype.icon}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.archetypeTitle, { color: colors.text }]}>{archetype.title}</Text>
            <Text style={[styles.archetypeDesc, { color: colors.textSecondary }]}>{archetype.description}</Text>
          </View>
        </View>
      )}

      {/* Ego fuel */}
      {egoFuel && (
        <View style={[styles.egoCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
          <Text style={[styles.egoText, { color: colors.accent }]}>{egoFuel}</Text>
        </View>
      )}

      {/* Shields */}
      <Pressable
        style={[styles.shieldRow, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => { if (!isPremiumUser) router.push('/paywall'); }}
      >
        <View style={styles.shieldSlots}>
          {Array.from({ length: 3 }).map((_, i) => {
            const filled = isPremiumUser ? i < shields : i === 0 && shields > 0;
            const locked = !isPremiumUser && i > 0;
            return (
              <Text key={i} style={[styles.shieldIcon, { opacity: filled ? 1 : 0.2 }]}>
                {locked ? '🔒' : '🛡'}
              </Text>
            );
          })}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.shieldLabel, { color: colors.text }]}>
            {shields > 0 ? `${isPremiumUser ? shields : Math.min(shields, 1)} streak freeze${shields !== 1 ? 's' : ''}` : 'No freezes'}
          </Text>
          <Text style={[styles.shieldSub, { color: colors.textSecondary }]}>
            {isPremiumUser
              ? 'Earn 1 every 4-day streak. Protects against a missed day.'
              : 'Unlock unlimited freezes with Pro →'}
          </Text>
        </View>
      </Pressable>

      {/* Stats grid */}
      <View style={styles.grid}>
        {tiles.map((tile, i) => (
          <View
            key={tile.label}
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }, i === 0 && styles.tileWide]}
          >
            <Text style={[styles.tileLabel, { color: colors.textSecondary }]}>{tile.label}</Text>
            <Text style={[styles.tileValue, { color: colors.text }]}>{tile.value}</Text>
            <Text style={[styles.tileSub, { color: colors.textSecondary }]}>{tile.sub}</Text>
          </View>
        ))}
      </View>

      {/* Chart with period toggle */}
      {stats.totalSeconds > 0 && (() => {
        const chartData = getChartData(rawSessions, period);
        const totalMins = chartData.reduce((s, d) => s + d.mins, 0);
        const maxMins = Math.max(...chartData.map((d) => d.mins), 1);
        return (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.periodRow}>
              {(['week', 'month', 'all'] as Period[]).map((p) => {
                const locked = !isPremiumUser && (p === 'month' || p === 'all');
                return (
                  <Pressable
                    key={p}
                    onPress={() => {
                      if (locked) { router.push('/paywall'); return; }
                      setPeriod(p);
                    }}
                    style={styles.periodBtn}
                  >
                    <Text style={[styles.periodBtnText, {
                      color: locked ? colors.border : period === p ? colors.accent : colors.textSecondary,
                      fontWeight: period === p ? '600' : '400',
                    }]}>
                      {p === 'week' ? 'Week' : p === 'month' ? 'Month 🔒' : 'All Time 🔒'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {totalMins === 0 ? (
              <Text style={[styles.chartEmpty, { color: colors.textSecondary }]}>No sessions in this period</Text>
            ) : (
              <>
                <View style={styles.chartRow}>
                  {chartData.map(({ label, mins, isToday }, i) => (
                    <View key={i} style={styles.chartCol}>
                      <View style={styles.chartBarArea}>
                        <View
                          style={[
                            styles.chartBar,
                            {
                              height: mins > 0 ? Math.max(4, (mins / maxMins) * BAR_H) : 0,
                              backgroundColor: colors.accent,
                              opacity: isToday ? 1 : 0.4,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.chartLabel, { color: isToday ? colors.accent : colors.textSecondary, fontWeight: isToday ? '700' : '500' }]}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.chartFooter, { color: colors.textSecondary }]}>
                  {getChartFooter(chartData, period)}
                </Text>
              </>
            )}
          </View>
        );
      })()}

      {/* Fake leaderboard */}
      {leaderboard.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTag, { color: colors.accent }]}>TOP LISTENERS THIS WEEK</Text>
          {leaderboard.map((entry, i) => (
            <View
              key={i}
              style={[
                styles.lbRow,
                entry.isUser && { backgroundColor: colors.accent + '18', borderRadius: 8 },
              ]}
            >
              <Text style={[styles.lbRank, { color: entry.isUser ? colors.accent : colors.textSecondary }]}>
                {i + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lbName, { color: entry.isUser ? colors.accent : colors.text }]}>
                  {entry.isUser ? 'You' : entry.name}{entry.city ? ` · ${entry.city}` : ''}
                </Text>
                <View style={[styles.lbBarTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.lbBarFill,
                      {
                        backgroundColor: entry.isUser ? colors.accent : colors.textSecondary,
                        width: `${entry.barWidth * 100}%`,
                        opacity: entry.isUser ? 1 : 0.5,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.lbLevel, { color: entry.isUser ? colors.accent : colors.textSecondary }]}>
                Lv.{entry.level}
              </Text>
            </View>
          ))}
          <Text style={[styles.lbFooter, { color: colors.textSecondary }]}>
            You rank #{globalRank.rank} globally · Top {globalRank.pct}% of listeners
          </Text>
        </View>
      )}

      {/* Milestone */}
      {milestone && (
        <View style={[styles.milestoneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.milestoneText, { color: colors.text }]}>↑ {milestone}</Text>
        </View>
      )}

      {/* Streak banner */}
      {stats.currentStreak >= 3 && (
        <View style={[styles.streakBanner, { backgroundColor: colors.card, borderColor: colors.accent }]}>
          <Text style={[styles.streakText, { color: colors.accent }]}>
            🔥 {stats.currentStreak} day streak — keep it going
          </Text>
        </View>
      )}

      {/* Near-miss achievements */}
      {nearMiss.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTag, { color: colors.accent }]}>ALMOST THERE</Text>
          {nearMiss.map(({ achievement, progress }) => (
            <View key={achievement.id} style={styles.nearMissRow}>
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

      {/* Calendar heatmap — Pro */}
      {isPremiumUser ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 0 }]}>
          <Text style={[styles.cardTag, { color: colors.accent, marginBottom: 12 }]}>LISTENING CALENDAR</Text>
          <View style={styles.heatmapGrid}>
            {heatmapWeeks.map((week, wi) => {
              const firstDay = week[0];
              const showMonth = wi === 0 || firstDay.date.getMonth() !== heatmapWeeks[wi - 1][0].date.getMonth();
              return (
                <View key={wi} style={styles.heatmapCol}>
                  <Text style={[styles.heatmapMonth, { color: showMonth ? colors.textSecondary : 'transparent' }]}>
                    {MONTH_ABBR[firstDay.date.getMonth()]}
                  </Text>
                  {week.map((day, di) => (
                    <View
                      key={di}
                      style={[
                        styles.heatmapCell,
                        {
                          backgroundColor: day.isFuture
                            ? 'transparent'
                            : day.hasSession
                              ? colors.accent
                              : colors.accent + '22',
                          borderWidth: day.isToday ? 1.5 : 0,
                          borderColor: colors.accent,
                        },
                      ]}
                    />
                  ))}
                </View>
              );
            })}
          </View>
          <View style={styles.heatmapLegend}>
            <Text style={[styles.heatmapLegendText, { color: colors.textSecondary }]}>Less</Text>
            {[0.15, 0.35, 0.6, 0.8, 1].map((op, i) => (
              <View key={i} style={[styles.heatmapLegendCell, { backgroundColor: colors.accent, opacity: op }]} />
            ))}
            <Text style={[styles.heatmapLegendText, { color: colors.textSecondary }]}>More</Text>
          </View>
        </View>
      ) : (
        <Pressable
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', gap: 6 }]}
          onPress={() => router.push('/paywall')}
        >
          <Text style={[styles.cardTag, { color: colors.accent }]}>LISTENING CALENDAR</Text>
          <Text style={[styles.heatmapLockText, { color: colors.textSecondary }]}>
            🔒 See your full listening history as a calendar heatmap
          </Text>
          <Text style={[styles.heatmapLockCta, { color: colors.accent }]}>Unlock with Pro →</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: height * 0.09, paddingBottom: 48, gap: 12 },
  pageTitle: { fontSize: 32, fontWeight: '600', marginBottom: 4 },
  card: { borderWidth: 1.5, borderRadius: 16, padding: 18, gap: 10 },
  cardTag: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  insightRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  insightDot: { fontSize: 8, marginTop: 5 },
  insightText: { flex: 1, fontSize: 14, lineHeight: 20 },
  archetypeCard: {
    borderWidth: 1.5, borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  archetypeIcon: { fontSize: 36 },
  archetypeTitle: { fontSize: 18, fontWeight: '600' },
  archetypeDesc: { fontSize: 13, lineHeight: 19 },
  egoCard: { borderWidth: 1.5, borderRadius: 14, padding: 16 },
  egoText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  shieldRow: {
    borderWidth: 1.5, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  shieldSlots: { flexDirection: 'row', gap: 4 },
  shieldIcon: { fontSize: 18 },
  shieldLabel: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  shieldSub: { fontSize: 12, lineHeight: 16 },
  periodRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  periodBtn: { paddingVertical: 2 },
  periodBtnText: { fontSize: 13 },
  chartEmpty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '47%', borderWidth: 1.5, borderRadius: 16, padding: 20, gap: 4 },
  tileWide: { width: '100%' },
  tileLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  tileValue: { fontSize: 36, fontWeight: '600', letterSpacing: -1 },
  tileSub: { fontSize: 13 },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 4 },
  lbRank: { fontSize: 13, fontWeight: '700', width: 20, textAlign: 'center' },
  lbName: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  lbBarTrack: { height: 3, borderRadius: 2, overflow: 'hidden' },
  lbBarFill: { height: 3, borderRadius: 2 },
  lbLevel: { fontSize: 12, fontWeight: '600', width: 36, textAlign: 'right' },
  lbFooter: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  milestoneCard: { borderWidth: 1.5, borderRadius: 14, padding: 16 },
  milestoneText: { fontSize: 14, fontWeight: '500' },
  streakBanner: { borderWidth: 1.5, borderRadius: 14, padding: 18, alignItems: 'center' },
  streakText: { fontSize: 15, fontWeight: '500' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  chartCol: { flex: 1, alignItems: 'center', gap: 6 },
  chartBarArea: { height: BAR_H, justifyContent: 'flex-end', width: '100%' },
  chartBar: { borderRadius: 4, width: '100%' },
  chartLabel: { fontSize: 11 },
  chartFooter: { fontSize: 12, textAlign: 'center', marginTop: 2 },
  heatmapGrid: { flexDirection: 'row', gap: HEATMAP_GAP },
  heatmapCol: { flexDirection: 'column', gap: HEATMAP_GAP },
  heatmapMonth: { fontSize: 8, fontWeight: '500', height: 14, textAlign: 'center' },
  heatmapCell: { width: HEATMAP_CELL, height: HEATMAP_CELL, borderRadius: 2 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' },
  heatmapLegendText: { fontSize: 10 },
  heatmapLegendCell: { width: 10, height: 10, borderRadius: 2 },
  heatmapLockText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  heatmapLockCta: { fontSize: 13, fontWeight: '600' },
  nearMissRow: { gap: 8 },
  nearMissMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nearMissIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  nearMissTitle: { fontSize: 14, fontWeight: '600' },
  nearMissDesc: { fontSize: 12, marginTop: 1 },
  nearMissPct: { fontSize: 14, fontWeight: '700', minWidth: 38, textAlign: 'right' },
  nearMissTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  nearMissFill: { height: 4, borderRadius: 2 },
});
