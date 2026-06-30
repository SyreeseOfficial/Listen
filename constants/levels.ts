export type Level = {
  level: number;
  title: string;
  minXp: number;
};

export const LEVELS: Level[] = [
  { level: 1,  title: 'Fresh Ears',        minXp: 0 },
  { level: 2,  title: 'Casual Listener',   minXp: 150 },
  { level: 3,  title: 'Enthusiast',        minXp: 400 },
  { level: 4,  title: 'Regular',           minXp: 900 },
  { level: 5,  title: 'Audiophile',        minXp: 2000 },
  { level: 6,  title: 'Critical Listener', minXp: 4000 },
  { level: 7,  title: 'Reference Grade',   minXp: 8000 },
  { level: 8,  title: 'Hi-Fi Devotee',     minXp: 15000 },
  { level: 9,  title: 'Master Listener',   minXp: 30000 },
  { level: 10, title: 'Legend',            minXp: 60000 },
];
