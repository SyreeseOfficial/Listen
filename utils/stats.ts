import type { Session } from './storage';

export type Stats = {
  totalSeconds: number;
  sessionsCompleted: number;
  weekSeconds: number;
  currentStreak: number;
  longestStreak: number;
  avgSeconds: number;
  shieldsConsumed: number;
};

export function computeStats(sessions: Session[], shields = 0): Stats {
  const completed = sessions.filter((s) => s.completed);

  const totalSeconds = completed.reduce((sum, s) => sum + s.duration, 0);
  const sessionsCompleted = completed.length;
  const avgSeconds = sessionsCompleted > 0 ? Math.round(totalSeconds / sessionsCompleted) : 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSeconds = completed
    .filter((s) => new Date(s.completedAt) >= weekAgo)
    .reduce((sum, s) => sum + s.duration, 0);

  const { streak: currentStreak, shieldsConsumed } = calcStreak(completed, shields);
  const longestStreak = calcLongestStreak(completed);

  return { totalSeconds, sessionsCompleted, weekSeconds, currentStreak, longestStreak, avgSeconds, shieldsConsumed };
}

function calcStreak(sessions: Session[], shields: number): { streak: number; shieldsConsumed: number } {
  if (sessions.length === 0) return { streak: 0, shieldsConsumed: 0 };

  const days = new Set(sessions.map((s) => new Date(s.completedAt).toDateString()));
  let streak = 0;
  let shieldsLeft = shields;
  let shieldsConsumed = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) {
      streak++;
    } else if (i > 0 && shieldsLeft > 0) {
      shieldsLeft--;
      shieldsConsumed++;
      streak++;
    } else {
      break;
    }
  }

  return { streak, shieldsConsumed };
}

function calcLongestStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;

  const days = [...new Set(sessions.map((s) => new Date(s.completedAt).toDateString()))]
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);

  let longest = 1;
  let current = 1;
  const DAY = 86400000;

  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] === DAY) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
