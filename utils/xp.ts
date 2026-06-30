import { LEVELS } from '../constants/levels';
import { ACHIEVEMENTS, type Achievement } from '../constants/achievements';
import type { Session, UserProfile } from './storage';
import type { Stats } from './stats';

export type XpEvent = { label: string; xp: number };

export type LevelInfo = {
  level: number;
  title: string;
  currentXp: number;
  nextLevelXp: number | null;
  progress: number; // 0–1
};

export function getLevelInfo(totalXp: number): LevelInfo {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (totalXp >= l.minXp) current = l;
    else break;
  }
  const next = LEVELS.find((l) => l.level === current.level + 1) ?? null;
  const currentXp = totalXp - current.minXp;
  const nextLevelXp = next ? next.minXp - current.minXp : null;
  const progress = nextLevelXp ? Math.min(currentXp / nextLevelXp, 1) : 1;
  return { level: current.level, title: current.title, currentXp, nextLevelXp, progress };
}

export function calcSessionXp(durationSeconds: number, completed: boolean, streak: number): XpEvent[] {
  const events: XpEvent[] = [];
  const mins = Math.floor(durationSeconds / 60);
  events.push({ label: 'Session', xp: Math.max(10, mins * 2) });
  if (completed) events.push({ label: 'Completed', xp: 20 });
  if (streak >= 2) events.push({ label: `${streak}× streak bonus`, xp: Math.min(streak * 5, 50) });
  // Intermittent variable reward — fires ~20% of the time
  if (Math.random() < 0.2) events.push({ label: 'Bonus XP!', xp: 25 });
  return events;
}

export function calcPostSessionXp(rating?: number, album?: string, notes?: string): XpEvent[] {
  const events: XpEvent[] = [];
  if (rating) events.push({ label: 'Rated session', xp: 15 });
  if (album?.trim()) events.push({ label: 'Logged album', xp: 10 });
  if (notes?.trim()) events.push({ label: 'Added notes', xp: 20 });
  return events;
}

export function calcEquipmentXp(count: number): XpEvent[] {
  if (count === 0) return [];
  return [{ label: `Added ${count} piece${count !== 1 ? 's' : ''} of gear`, xp: count * 30 }];
}

export function totalXp(events: XpEvent[]): number {
  return events.reduce((sum, e) => sum + e.xp, 0);
}

// Artificially boost progress display for new users on starter achievements
export function getEndowedProgress(id: string, real: number, sessionCount: number): number {
  if (sessionCount > 5 || real >= 0.4) return real;
  const boosts: Record<string, number> = { sessions_10: 0.42, streak_3: 0.40, hours_5: 0.38, gear_3: 0.45 };
  return Math.max(real, boosts[id] ?? real);
}

export function getStreakMultiplierLabel(streak: number): string {
  if (streak >= 14) return '2.5×';
  if (streak >= 7) return '2×';
  if (streak >= 3) return '1.5×';
  if (streak >= 1) return '1.2×';
  return '1×';
}

export function getAchievementProgress(
  id: string,
  sessions: Session[],
  profile: UserProfile,
  stats: Stats
): number {
  const completed = sessions.filter((s) => s.completed);
  const equipment = profile.equipment ?? [];
  const nightSessions = sessions.filter((s) => new Date(s.completedAt).getHours() >= 22 && s.completed);
  const earlySessions = sessions.filter((s) => new Date(s.completedAt).getHours() < 8 && s.completed);
  const ratedSessions = sessions.filter((s) => s.rating != null);
  const notedSessions = sessions.filter((s) => !!s.notes?.trim());
  const uniqueAlbums = new Set(sessions.map((s) => s.album?.trim().toLowerCase()).filter(Boolean));
  const fullDetailSessions = sessions.filter((s) => s.rating && s.album?.trim() && s.notes?.trim());
  const map: Record<string, number> = {
    first_session:  Math.min(completed.length, 1),
    sessions_10:    Math.min(completed.length / 10, 1),
    sessions_25:    Math.min(completed.length / 25, 1),
    sessions_50:    Math.min(completed.length / 50, 1),
    sessions_100:   Math.min(completed.length / 100, 1),
    streak_3:       Math.min(stats.currentStreak / 3, 1),
    streak_7:       Math.min(stats.currentStreak / 7, 1),
    streak_14:      Math.min(stats.currentStreak / 14, 1),
    streak_30:      Math.min(stats.currentStreak / 30, 1),
    hours_5:        Math.min(stats.totalSeconds / (5 * 3600), 1),
    hours_10:       Math.min(stats.totalSeconds / (10 * 3600), 1),
    hours_50:       Math.min(stats.totalSeconds / (50 * 3600), 1),
    long_60:        completed.some((s) => s.duration >= 60 * 60) ? 1 : 0,
    long_120:       completed.some((s) => s.duration >= 120 * 60) ? 1 : 0,
    gear_3:         Math.min(equipment.length / 3, 1),
    gear_5:         Math.min(equipment.length / 5, 1),
    rated_10:       Math.min(ratedSessions.length / 10, 1),
    noted_10:       Math.min(notedSessions.length / 10, 1),
    album_10:       Math.min(uniqueAlbums.size / 10, 1),
    night_5:        Math.min(nightSessions.length / 5, 1),
    early_5:        Math.min(earlySessions.length / 5, 1),
    midnight:       0,
    perfect_week:   Math.min(stats.currentStreak / 7, 1),
    perfectionist:  Math.min(fullDetailSessions.length / 5, 1),
  };
  return map[id] ?? 0;
}

export function getNearMissAchievements(
  sessions: Session[],
  profile: UserProfile,
  stats: Stats
): Array<{ achievement: Achievement; progress: number }> {
  const unlocked = new Set(profile.achievements ?? []);
  return ACHIEVEMENTS
    .filter((a) => !unlocked.has(a.id) && !a.hidden)
    .map((a) => ({ achievement: a, progress: getAchievementProgress(a.id, sessions, profile, stats) }))
    .filter(({ progress }) => progress >= 0.4 && progress < 1)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
}

export function checkAchievements(
  sessions: Session[],
  profile: UserProfile,
  stats: Stats
): Achievement[] {
  const unlocked = new Set(profile.achievements ?? []);
  const equipment = profile.equipment ?? [];

  const nightSessions = sessions.filter((s) => new Date(s.completedAt).getHours() >= 22 && s.completed);
  const earlySessions = sessions.filter((s) => new Date(s.completedAt).getHours() < 8 && s.completed);
  const ratedSessions = sessions.filter((s) => s.rating != null);
  const notedSessions = sessions.filter((s) => !!s.notes?.trim());
  const uniqueAlbums = new Set(sessions.map((s) => s.album?.trim().toLowerCase()).filter(Boolean));
  const fullDetailSessions = sessions.filter((s) => s.rating && s.album?.trim() && s.notes?.trim());
  const midnightSessions = sessions.filter((s) => {
    const h = new Date(s.completedAt).getHours();
    return h >= 0 && h < 3 && s.completed;
  });

  const completed = sessions.filter((s) => s.completed);

  const checks: Record<string, boolean> = {
    first_session:  completed.length >= 1,
    sessions_10:    completed.length >= 10,
    sessions_25:    completed.length >= 25,
    sessions_50:    completed.length >= 50,
    sessions_100:   completed.length >= 100,
    streak_3:       stats.currentStreak >= 3,
    streak_7:       stats.currentStreak >= 7,
    streak_14:      stats.currentStreak >= 14,
    streak_30:      stats.currentStreak >= 30,
    hours_5:        stats.totalSeconds >= 5 * 3600,
    hours_10:       stats.totalSeconds >= 10 * 3600,
    hours_50:       stats.totalSeconds >= 50 * 3600,
    long_60:        completed.some((s) => s.duration >= 60 * 60),
    long_120:       completed.some((s) => s.duration >= 120 * 60),
    gear_3:         equipment.length >= 3,
    gear_5:         equipment.length >= 5,
    rated_10:       ratedSessions.length >= 10,
    noted_10:       notedSessions.length >= 10,
    album_10:       uniqueAlbums.size >= 10,
    night_5:        nightSessions.length >= 5,
    early_5:        earlySessions.length >= 5,
    midnight:       midnightSessions.length >= 1,
    perfect_week:   stats.currentStreak >= 7,
    perfectionist:  fullDetailSessions.length >= 5,
  };

  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && checks[a.id]);
}
