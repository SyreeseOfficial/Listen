import AsyncStorage from '@react-native-async-storage/async-storage';

export type Session = {
  id: string;
  duration: number; // seconds
  completedAt: string; // ISO string
  completed: boolean;
  equipmentUsed?: string[];
  rating?: number; // 1–5
  album?: string;
  notes?: string;
};

export type UserProfile = {
  name: string;
  theme: 'light' | 'dark' | 'system';
  equipment: string[];
  onboardingDone: boolean;
  streakShields: number;
  lastShieldStreak: number;
  xp: number;
  achievements: string[];
  defaultSessionMinutes?: number;
  hapticsEnabled?: boolean;
  weekStartsOn?: 'monday' | 'sunday';
  listenerType?: string;
  listeningGoal?: string;
  listeningFrequency?: string;
  listeningStyle?: string;
  weeklyCommitment?: number;
  notificationsEnabled?: boolean;
  notificationHour?: number;
  autoComplete?: boolean;
  isPremium?: boolean;
  accentTheme?: string;
};

const KEYS = {
  sessions: 'sessions',
  profile: 'profile',
  pendingSession: 'pendingSession',
} as const;

export type PendingSession = {
  sessionId: string;
  minutes: string;
  totalSeconds: number;
  remainingSeconds: number;
  equipment: string;
  savedAt: string;
};

export async function savePendingSession(s: PendingSession): Promise<void> {
  await AsyncStorage.setItem(KEYS.pendingSession, JSON.stringify(s));
}

export async function getPendingSession(): Promise<PendingSession | null> {
  const raw = await AsyncStorage.getItem(KEYS.pendingSession);
  return raw ? JSON.parse(raw) : null;
}

export async function clearPendingSession(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.pendingSession);
}

export async function getSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(KEYS.sessions);
  return raw ? JSON.parse(raw) : [];
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  sessions.unshift(session);
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
}

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.profile);
  return raw ? JSON.parse(raw) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export async function updateSession(id: string, partial: Partial<Session>): Promise<void> {
  const sessions = await getSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx !== -1) {
    sessions[idx] = { ...sessions[idx], ...partial };
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
  }
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(sessions.filter((s) => s.id !== id)));
}

export async function updateProfile(partial: Partial<UserProfile>): Promise<void> {
  const existing = await getProfile();
  const updated = { ...(existing ?? {}), ...partial } as UserProfile;
  await saveProfile(updated);
}
