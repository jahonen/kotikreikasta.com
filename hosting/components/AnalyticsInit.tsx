'use client';

import { useEffect } from 'react';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { app } from '../lib/firebase-client';

export default function AnalyticsInit() {
  useEffect(() => {
    let mounted = true;
    isSupported()
      .then((supported) => {
        if (supported && mounted && app) {
          try {
            getAnalytics(app);
          } catch {
            // ignore analytics init errors silently
          }
        }
      })
      .catch(() => {
        // ignore analytics init errors silently
      });
    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
