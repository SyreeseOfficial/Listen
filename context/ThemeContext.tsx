import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, ACCENT_THEMES, type ThemeColors, type AccentThemeKey } from '../constants/theme';
import { getProfile, updateProfile } from '../utils/storage';

type ThemePref = 'light' | 'dark' | 'system';

type ThemeContextType = {
  colors: ThemeColors;
  pref: ThemePref;
  isDark: boolean;
  setPref: (pref: ThemePref) => Promise<void>;
  accentTheme: AccentThemeKey;
  setAccentTheme: (key: AccentThemeKey) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  colors: Colors.light,
  pref: 'light',
  isDark: false,
  setPref: async () => {},
  accentTheme: 'default',
  setAccentTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('light');
  const [accentThemeState, setAccentThemeState] = useState<AccentThemeKey>('default');

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.theme) setPrefState(p.theme);
      const key = p?.accentTheme as AccentThemeKey;
      if (key && key in ACCENT_THEMES) setAccentThemeState(key);
    });
  }, []);

  const resolved = pref === 'system' ? (systemScheme ?? 'light') : pref;
  const isDark = resolved === 'dark';
  const pair = ACCENT_THEMES[accentThemeState] ?? ACCENT_THEMES.default;
  const colors: ThemeColors = {
    ...(isDark ? Colors.dark : Colors.light),
    accent: isDark ? pair.dark : pair.light,
  };

  async function setPref(next: ThemePref) {
    setPrefState(next);
    await updateProfile({ theme: next });
  }

  async function setAccentTheme(next: AccentThemeKey) {
    setAccentThemeState(next);
    await updateProfile({ accentTheme: next });
  }

  return (
    <ThemeContext.Provider value={{ colors, pref, isDark, setPref, accentTheme: accentThemeState, setAccentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
