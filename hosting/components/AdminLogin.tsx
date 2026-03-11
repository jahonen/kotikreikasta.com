'use client';

import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getAuthClient } from '../lib/firebase-client';
import LoadingButton from './ui/LoadingButton';

interface AdminLoginProps {
  onSignedIn?: () => void;
}

export default function AdminLogin({ onSignedIn }: AdminLoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Prefer kotikreikasta.com accounts in the account chooser
      provider.setCustomParameters({ hd: 'kotikreikasta.com', prompt: 'select_account' });
      const auth = await getAuthClient();
      if (!auth) {
        setError('Palvelu ei ole saatavilla juuri nyt. Yritä hetken kuluttua.');
        return;
      }
      await signInWithPopup(auth, provider);
      try {
        const idToken = await auth.currentUser?.getIdToken(true);
        if (idToken) {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
            credentials: 'include'
          });
        }
      } catch {}
      onSignedIn?.();
    } catch (e) {
      setError('Kirjautuminen epäonnistui. Yritä uudelleen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
      <div>
        <h1 className="section-title" style={{ marginBottom: '1rem' }}>Ylläpito</h1>
        <p style={{ marginBottom: '1rem' }}>Kirjaudu Google-tunnuksella jatkaaksesi.</p>
        <LoadingButton className="btn-primary" onClick={signIn} loading={loading}>
          Kirjaudu Google-tilillä
        </LoadingButton>
        {error && <div style={{ color: '#b00020', marginTop: '0.75rem' }}>{error}</div>}
      </div>
    </div>
  );
}
