import type { Session } from './storage';
import type { Stats } from './stats';
import { getLevelInfo } from './xp';
import { NAMES, CITIES } from './social';

export type Archetype = {
  title: string;
  description: string;
  icon: string;
};

export function computeArchetype(sessions: Session[]): Archetype {
  const done = sessions.filter((s) => s.completed);

  if (done.length < 3) {
    return { title: 'New Listener', description: 'Just getting started. Every session counts.', icon: '◌' };
  }

  const avg = done.reduce((s, x) => s + x.duration, 0) / done.length;
  const nightCount = done.filter((s) => new Date(s.completedAt).getHours() >= 21).length;
  const morningCount = done.filter((s) => new Date(s.completedAt).getHours() < 10).length;
  const nightRatio = nightCount / done.length;
  const morningRatio = morningCount / done.length;

  if (avg > 50 * 60) return { title: 'Deep Diver', description: 'Long, uninterrupted sessions. You give music the time it deserves.', icon: '◉' };
  if (nightRatio > 0.45) return { title: 'Night Owl', description: 'The world is quieter after midnight. You know this better than most.', icon: '◑' };
  if (morningRatio > 0.45) return { title: 'Early Riser', description: 'Music before the noise. You start your days with intention.', icon: '◐' };
  if (done.length >= 30) return { title: 'The Dedicated', description: "Consistency is your thing. You show up for the music no matter what.", icon: '◆' };
  if (avg > 35 * 60) return { title: 'The Focused', description: 'Quality over quantity. Your sessions are deliberate and long.', icon: '◈' };
  return { title: 'The Regular', description: "You've made listening a part of your life. That's more than most.", icon: '◎' };
}

// Seeded by minute so it changes live but feels organic
export function getFakeListenerCount(): number {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const base = h >= 19 && h <= 22 ? 1840 : h >= 2 && h <= 5 ? 340 : 960;
  const drift = Math.round(Math.sin(m * 0.31) * 140 + Math.cos(m * 0.19) * 90);
  return Math.max(180, base + drift);
}

const SESSION_MILESTONES = [5, 10, 25, 50, 100, 250, 500];
const TIME_MILESTONES_H = [5, 10, 25, 50, 100, 250];

export function getMilestone(stats: Stats): string | null {
  const nextSessions = SESSION_MILESTONES.find((m) => m > stats.sessionsCompleted);
  if (nextSessions) {
    const left = nextSessions - stats.sessionsCompleted;
    if (left <= 5) return `${left} session${left === 1 ? '' : 's'} until you hit ${nextSessions} total.`;
  }

  const totalHours = stats.totalSeconds / 3600;
  const nextHours = TIME_MILESTONES_H.find((m) => m > totalHours);
  if (nextHours) {
    const minsLeft = Math.round((nextHours - totalHours) * 60);
    if (minsLeft <= 120) return `${minsLeft} more minutes until ${nextHours} total hours.`;
  }

  if (stats.longestStreak > 0 && stats.currentStreak > 0) {
    const left = stats.longestStreak - stats.currentStreak;
    if (left > 0 && left <= 3) return `${left} more day${left === 1 ? '' : 's'} to beat your longest streak ever.`;
  }

  return null;
}

const FAKE_AVG_WEEK_SECONDS = 192 * 60; // 192 min/week
const FAKE_AVG_SESSION_SECONDS = 34 * 60;

// ── Manufactured identity ─────────────────────────────────────────────────────
export function getIdentityMessage(archetypeTitle: string): string | null {
  const map: Record<string, string> = {
    'Night Owl':     'Your listening window opens after 9pm. The night is yours.',
    'Early Riser':   'Your best sessions happen in the morning. Right now is prime time.',
    'Deep Diver':    'You thrive in long sessions. Push for 45+ minutes today.',
    'The Dedicated': "You've built rare consistency. Every session protects what you've earned.",
    'The Focused':   'Quality over quantity. Your sessions are longer than most.',
    'The Regular':   'Regularity is your edge. Show up again today.',
  };
  return map[archetypeTitle] ?? null;
}

// ── Regret injection ──────────────────────────────────────────────────────────
export function getRegretInjection(sessions: Session[], currentXp: number): string | null {
  if (!sessions.length) return null;
  const sorted = [...sessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  const todayStr   = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
  const lastStr = new Date(sorted[0].completedAt).toDateString();
  // Only show if they missed yesterday and haven't listened today
  if (lastStr === todayStr || lastStr === yesterdayStr) return null;
  const projectedXp = currentXp + 80;
  const projectedLevel = getLevelInfo(projectedXp).level;
  const currentLevel  = getLevelInfo(currentXp).level;
  if (projectedLevel > currentLevel) {
    return `Yesterday could have pushed you to Level ${projectedLevel}. That window is gone.`;
  }
  const xpToNext = getLevelInfo(currentXp).nextLevelXp;
  if (xpToNext) {
    const xpNeeded = xpToNext - getLevelInfo(currentXp).currentXp;
    return `You missed ~80 XP yesterday. You're ${xpNeeded} away from the next level.`;
  }
  return `You missed a session yesterday. 80+ XP you'll never get back.`;
}

// ── Parasocial buddy ──────────────────────────────────────────────────────────
export function getParasocialBuddy(seed: string, userStreak: number): { name: string; city: string; streak: number; message: string } {
  const h = seed.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);
  const nameIdx = Math.abs(h) % NAMES.length;
  const cityIdx = Math.abs(h * 7) % CITIES.length;
  const name = NAMES[nameIdx];
  const city = CITIES[cityIdx];
  const buddyStreak = userStreak + 1 + (Math.abs(h * 3) % 2);
  const messages = [
    `${name} from ${city} has listened ${buddyStreak} days in a row. You're at ${userStreak}.`,
    `Your partner ${name} just kept their ${buddyStreak}-day streak alive. Yours is at ${userStreak}.`,
    `${name} from ${city} hasn't missed a day this week. You've missed one.`,
  ];
  return { name, city, streak: buddyStreak, message: messages[Math.abs(h * 11) % messages.length] };
}

// ── Session ranking sycophancy ────────────────────────────────────────────────
export function getSessionRanking(durationSeconds: number): string {
  const mins = durationSeconds / 60;
  if (mins >= 90) return 'top 3%';
  if (mins >= 60) return 'top 8%';
  if (mins >= 45) return 'top 15%';
  if (mins >= 30) return 'top 24%';
  if (mins >= 20) return 'top 38%';
  return 'top 52%';
}

// ── Phantom completion (15+ sessions) ────────────────────────────────────────
export function getPhantomInsights(sessions: Session[]): string[] | null {
  const done = sessions.filter((s) => s.completed);
  if (done.length < 15) return null;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayCounts = Array(7).fill(0);
  done.forEach((s) => dayCounts[new Date(s.completedAt).getDay()]++);
  const peakDay = days[dayCounts.indexOf(Math.max(...dayCounts))];

  const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  done.forEach((s) => {
    const h = new Date(s.completedAt).getHours();
    if (h < 12) buckets.morning++;
    else if (h < 17) buckets.afternoon++;
    else if (h < 21) buckets.evening++;
    else buckets.night++;
  });
  const peakPeriod = (Object.entries(buckets).sort((a, b) => b[1] - a[1])[0][0]) as keyof typeof buckets;
  const periodLabel = { morning: 'mornings', afternoon: 'afternoons', evening: 'evenings', night: 'late nights' }[peakPeriod];

  const avgMins = Math.round(done.reduce((s, x) => s + x.duration, 0) / done.length / 60);
  const vs = avgMins >= 40 ? 'well above' : avgMins >= 25 ? 'near' : 'below';

  return [
    `You listen most on ${peakDay}s — your most consistent day by far.`,
    `Your sessions peak in the ${periodLabel}. That's when you go deepest.`,
    `Your average session is ${avgMins} minutes — ${vs} the global average of 34.`,
  ];
}

// ── Fake leaderboard ──────────────────────────────────────────────────────────
export type LeaderboardEntry = {
  name: string;
  city: string;
  level: number;
  barWidth: number; // 0–1 relative
  isUser: boolean;
};

export function getFakeLeaderboard(userLevel: number, userName: string): LeaderboardEntry[] {
  const seed = Math.floor(Date.now() / 86400000); // daily seed
  const entries: LeaderboardEntry[] = [];

  const above = 3;
  for (let i = 0; i < above; i++) {
    const ni = (seed + i * 7 + 1) % NAMES.length;
    const ci = (seed + i * 11 + 3) % CITIES.length;
    const lvl = Math.min(userLevel + Math.ceil((above - i) / 2), 10);
    entries.push({ name: NAMES[ni], city: CITIES[ci], level: lvl, barWidth: 0.95 - i * 0.08, isUser: false });
  }
  entries.push({ name: userName || 'You', city: '', level: userLevel, barWidth: 0.65, isUser: true });
  for (let i = 0; i < 3; i++) {
    const ni = (seed + (i + 4) * 7) % NAMES.length;
    const ci = (seed + (i + 4) * 11) % CITIES.length;
    const lvl = Math.max(userLevel - Math.floor(i / 2), 1);
    entries.push({ name: NAMES[ni], city: CITIES[ci], level: lvl, barWidth: 0.55 - i * 0.09, isUser: false });
  }
  return entries;
}

export function getFakeGlobalRank(seed: number): { rank: number; pct: number } {
  const base = 800 + (seed % 400);
  return { rank: base, pct: 30 + (seed % 20) };
}

export function getEgoFuel(stats: Stats): string | null {
  if (stats.sessionsCompleted < 3) return null;

  if (stats.currentStreak >= 14) return "Your streak puts you in the top 3% of all listeners.";
  if (stats.currentStreak >= 7) return "Your streak puts you in the top 8% of all listeners.";
  if (stats.weekSeconds > FAKE_AVG_WEEK_SECONDS * 1.8) return "You're in the top 10% of listeners this week.";
  if (stats.weekSeconds > FAKE_AVG_WEEK_SECONDS) return "You're listening more than 70% of users this week.";
  if (stats.avgSeconds > FAKE_AVG_SESSION_SECONDS * 1.4) return "Your average session is longer than 85% of listeners.";
  if (stats.avgSeconds > FAKE_AVG_SESSION_SECONDS) return "Your sessions run longer than the average listener's.";

  return null;
}
