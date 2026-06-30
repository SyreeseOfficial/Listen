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
