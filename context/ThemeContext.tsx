import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, type ThemeColors } from '../constants/theme';
import { getProfile, updateProfile } from '../utils/storage';

type ThemePref = 'light' | 'dark' | 'system';

type ThemeContextType = {
  colors: ThemeColors;
  pref: ThemePref;
  isDark: boolean;
  setPref: (pref: ThemePref) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  colors: Colors.light,
  pref: 'light',
  isDark: false,
  setPref: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('light');

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.theme) setPrefState(p.theme);
    });
  }, []);

  const resolved = pref === 'system' ? (systemScheme ?? 'light') : pref;
  const isDark = resolved === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  async function setPref(next: ThemePref) {
    setPrefState(next);
    await updateProfile({ theme: next });
  }

  return (
    <ThemeContext.Provider value={{ colors, pref, isDark, setPref }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
