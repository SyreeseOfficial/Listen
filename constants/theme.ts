export const Colors = {
  light: {
    background: '#FAFAF8',
    card: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#6B6B6B',
    accent: '#9B7E5A',
    border: '#E8E8E4',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E8E8E4',
  },
  dark: {
    background: '#141414',
    card: '#1E1E1E',
    text: '#F5F5F0',
    textSecondary: '#8A8A8A',
    accent: '#C8A97A',
    border: '#2A2A2A',
    tabBar: '#1A1A1A',
    tabBarBorder: '#2A2A2A',
  },
} as const;

export type ThemeColors = {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  accent: string;
  border: string;
  tabBar: string;
  tabBarBorder: string;
};

export const ACCENT_THEMES = {
  default: { label: 'Sand',   light: '#9B7E5A', dark: '#C8A97A' },
  amber:   { label: 'Amber',  light: '#C07820', dark: '#E8A030' },
  sage:    { label: 'Sage',   light: '#4E7A52', dark: '#6EA074' },
  rose:    { label: 'Rose',   light: '#A84F5E', dark: '#C87082' },
  slate:   { label: 'Slate',  light: '#3E6080', dark: '#5E88AA' },
  terra:   { label: 'Terra',  light: '#A85030', dark: '#C87050' },
} as const;

export type AccentThemeKey = keyof typeof ACCENT_THEMES;
