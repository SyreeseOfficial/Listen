export const NAMES = [
  'Marcus', 'Priya', 'James', 'Sofia', 'Chen Wei', 'Aisha', 'Luca', 'Nina',
  'Tariq', 'Elena', 'Dario', 'Mira', 'Kai', 'Fatima', 'Ezra', 'Yuki',
  'Anton', 'Layla', 'Finn', 'Zoe', 'Omar', 'Isla', 'Rafael', 'Ava',
  'Sebastien', 'Nadia', 'Hugo', 'Chloe', 'Arjun', 'Leah',
];

export const CITIES = [
  'Austin', 'Tokyo', 'London', 'Berlin', 'Sydney', 'Seoul', 'Paris',
  'Amsterdam', 'Toronto', 'Singapore', 'Oslo', 'Chicago', 'Lisbon',
  'Melbourne', 'Stockholm', 'New York', 'Munich', 'Montreal', 'Dublin',
  'Copenhagen', 'Barcelona', 'Portland', 'Vienna', 'Cape Town',
];

export type SocialCard = {
  name: string;
  city: string;
  level: number;
  action: string;
};

// Seed by 5-min intervals — changes periodically without user action
export function getFakeSocialCard(userLevel: number): SocialCard {
  const seed = Math.floor(Date.now() / (5 * 60 * 1000));
  const nameIdx = seed % NAMES.length;
  const cityIdx = (seed * 7 + 3) % CITIES.length;
  // Always show someone 1–3 levels ahead to trigger comparison
  const targetLevel = Math.min(userLevel + 1 + (seed % 3), 10);
  const actions = [
    `just hit Level ${targetLevel}.`,
    `reached Level ${targetLevel}.`,
    `unlocked Level ${targetLevel}.`,
  ];
  return {
    name: NAMES[nameIdx],
    city: CITIES[cityIdx],
    level: targetLevel,
    action: actions[seed % actions.length],
  };
}
