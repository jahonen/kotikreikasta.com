'use client';

import { useEffect } from 'react';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirebaseApp } from '../lib/firebase-client';

export default function AnalyticsInit() {
  useEffect(() => {
    let mounted = true;

    const tryInit = async () => {
      try {
        const supported = await isSupported();
        if (!mounted || !supported) return;
        // Respect cookie consent: only initialize when accepted
        const consent = typeof window !== 'undefined' ? localStorage.getItem('cookieConsent') : null;
        if (consent === 'accepted') {
          try {
            const app = await getFirebaseApp();
            if (app) {
              getAnalytics(app);
            }
          } catch {
            // ignore analytics init errors silently
          }
        }
      } catch {
        // ignore analytics support errors silently
      }
    };

    // Attempt initialization on mount (if consent already granted)
    tryInit();

    // Re-attempt initialization when consent changes to accepted
    const onConsent = (e: any) => {
      if (e?.detail?.value === 'accepted') {
        tryInit();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('cookie-consent-changed', onConsent as EventListener);
    }

    return () => {
      mounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('cookie-consent-changed', onConsent as EventListener);
      }
    };
  }, []);

  return null;
}
