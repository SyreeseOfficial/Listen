export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  hidden?: boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_session',  title: 'First Listen',      description: 'Complete your first session.',              icon: '◎',  xpReward: 50 },
  { id: 'sessions_10',    title: 'Getting Started',   description: 'Complete 10 sessions.',                     icon: '◈',  xpReward: 75 },
  { id: 'sessions_25',    title: 'The Regular',       description: 'Complete 25 sessions.',                     icon: '◉',  xpReward: 150 },
  { id: 'sessions_50',    title: 'The Purist',        description: 'Complete 50 sessions.',                     icon: '◆',  xpReward: 300 },
  { id: 'sessions_100',   title: 'Century',           description: 'Complete 100 sessions.',                    icon: '◇',  xpReward: 600 },
  { id: 'streak_3',       title: 'Three Peat',        description: 'Maintain a 3-day streak.',                  icon: '🔥', xpReward: 30 },
  { id: 'streak_7',       title: 'Ritual',            description: 'Maintain a 7-day streak.',                  icon: '🔥', xpReward: 100 },
  { id: 'streak_14',      title: 'Committed',         description: 'Maintain a 14-day streak.',                 icon: '🔥', xpReward: 200 },
  { id: 'streak_30',      title: 'Devotee',           description: 'Maintain a 30-day streak.',                 icon: '🔥', xpReward: 500 },
  { id: 'hours_5',        title: 'Iron Ears',         description: 'Listen for 5 total hours.',                 icon: '⬥',  xpReward: 100 },
  { id: 'hours_10',       title: 'Deep Ears',         description: 'Listen for 10 total hours.',                icon: '⬦',  xpReward: 200 },
  { id: 'hours_50',       title: 'Hi-Fi Soul',        description: 'Listen for 50 total hours.',                icon: '✦',  xpReward: 500 },
  { id: 'long_60',        title: 'Deep Dive',         description: 'Complete a session over 60 minutes.',       icon: '◐',  xpReward: 75 },
  { id: 'long_120',       title: 'Marathon',          description: 'Complete a session over 2 hours.',          icon: '◑',  xpReward: 150 },
  { id: 'gear_3',         title: 'The Collector',     description: 'Add 3 pieces of gear.',                     icon: '⊞',  xpReward: 50 },
  { id: 'gear_5',         title: 'Gearhead',          description: 'Add 5 pieces of gear.',                     icon: '⊟',  xpReward: 100 },
  { id: 'rated_10',       title: 'Critic',            description: 'Rate 10 sessions.',                         icon: '★',  xpReward: 75 },
  { id: 'noted_10',       title: 'Chronicler',        description: 'Add notes to 10 sessions.',                 icon: '✎',  xpReward: 75 },
  { id: 'album_10',       title: 'Archivist',         description: 'Log 10 different albums.',                  icon: '♫',  xpReward: 75 },
  { id: 'night_5',        title: 'Night Owl',         description: 'Complete 5 sessions after 10pm.',           icon: '◑',  xpReward: 75 },
  { id: 'early_5',        title: 'Early Riser',       description: 'Complete 5 sessions before 8am.',           icon: '◐',  xpReward: 75 },
  { id: 'midnight',       title: 'Midnight Oil',      description: 'Start a session after midnight.',           icon: '◌',  xpReward: 50,  hidden: true },
  { id: 'perfect_week',   title: 'Perfect Week',      description: 'Listen every day for a full week.',         icon: '✦',  xpReward: 200, hidden: true },
  { id: 'perfectionist',  title: 'Perfectionist',     description: 'Fill out all session details 5 times.',     icon: '◎',  xpReward: 100, hidden: true },
];
