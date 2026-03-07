'use client';

import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase-client';

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
      await signInWithPopup(auth, provider);
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
        <button className="btn-primary" onClick={signIn} disabled={loading}>
          {loading ? 'Kirjaudutaan…' : 'Kirjaudu Google-tilillä'}
        </button>
        {error && <div style={{ color: '#b00020', marginTop: '0.75rem' }}>{error}</div>}
      </div>
    </div>
  );
}
