import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { getProfile } from '../utils/storage';
import { setHapticsEnabled } from '../utils/haptics';

function RootNavigator() {
  const { isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    getProfile().then((profile) => {
      if (!profile?.onboardingDone) router.replace('/onboarding/welcome');
      setHapticsEnabled(profile?.hapticsEnabled ?? true);
    });
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="pre-session" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="session" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="complete" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
