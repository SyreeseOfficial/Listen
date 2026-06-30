import type { Session } from '../utils/storage';
import type { Stats } from '../utils/stats';

export type TimeBadge = {
  templateId: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  check: (weekSessions: Session[], stats: Stats) => boolean;
};

export const WEEKLY_BADGE_TEMPLATES: TimeBadge[] = [
  {
    templateId: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Complete 2 sessions this weekend.',
    icon: '⚡',
    xpReward: 100,
    check: (weekSessions) => {
      const weekend = weekSessions.filter((s) => {
        const d = new Date(s.completedAt).getDay();
        return d === 0 || d === 6;
      });
      return weekend.length >= 2;
    },
  },
  {
    templateId: 'deep_focus',
    title: 'Deep Focus',
    description: 'Complete a session of 45+ minutes this week.',
    icon: '◐',
    xpReward: 80,
    check: (weekSessions) => weekSessions.some((s) => s.duration >= 45 * 60),
  },
  {
    templateId: 'night_sessions',
    title: 'Night Sessions',
    description: 'Complete a session after 10pm this week.',
    icon: '◑',
    xpReward: 75,
    check: (weekSessions) => weekSessions.some((s) => new Date(s.completedAt).getHours() >= 22),
  },
  {
    templateId: 'morning_ritual',
    title: 'Morning Ritual',
    description: 'Complete a session before 8am this week.',
    icon: '◐',
    xpReward: 75,
    check: (weekSessions) => weekSessions.some((s) => new Date(s.completedAt).getHours() < 8),
  },
  {
    templateId: 'the_critic',
    title: 'The Critic',
    description: 'Rate 3 sessions this week.',
    icon: '★',
    xpReward: 90,
    check: (weekSessions) => weekSessions.filter((s) => s.rating != null).length >= 3,
  },
  {
    templateId: 'chronicler',
    title: 'The Chronicler',
    description: 'Add notes to 3 sessions this week.',
    icon: '✎',
    xpReward: 90,
    check: (weekSessions) => weekSessions.filter((s) => !!s.notes?.trim()).length >= 3,
  },
  {
    templateId: 'album_deep_dive',
    title: 'Album Deep Dive',
    description: 'Log an album in 2 sessions this week.',
    icon: '♫',
    xpReward: 85,
    check: (weekSessions) => weekSessions.filter((s) => !!s.album?.trim()).length >= 2,
  },
  {
    templateId: 'devoted',
    title: 'The Devoted',
    description: 'Listen 4 days in a row this week.',
    icon: '🔥',
    xpReward: 120,
    check: (_, stats) => stats.currentStreak >= 4,
  },
];

export function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getCurrentWeekBadge(): { badge: TimeBadge; weekId: string; daysLeft: number } {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const weekOfYear = Math.floor((now.getTime() - yearStart.getTime()) / (7 * 24 * 3600 * 1000));
  const badge = WEEKLY_BADGE_TEMPLATES[weekOfYear % WEEKLY_BADGE_TEMPLATES.length];
  const day = now.getDay();
  const daysLeft = day === 0 ? 0 : 7 - day;
  const weekId = `weekly_${now.getFullYear()}_${weekOfYear}`;
  return { badge, weekId, daysLeft };
}

export function checkWeeklyBadge(badge: TimeBadge, allSessions: Session[], stats: Stats): boolean {
  const weekStart = getWeekStart();
  const weekSessions = allSessions.filter(
    (s) => s.completed && new Date(s.completedAt) >= weekStart
  );
  return badge.check(weekSessions, stats);
}
