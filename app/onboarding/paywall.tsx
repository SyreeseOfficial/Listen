import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function PaywallRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace({ pathname: '/paywall', params: { from: 'onboarding' } });
  }, []);
  return null;
}
