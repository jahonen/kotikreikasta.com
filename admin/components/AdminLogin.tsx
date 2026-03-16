'use client';

import { useState, useEffect } from 'react';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInWithPopup } from 'firebase/auth';
import { getAuthClient } from '../lib/firebase-client';
import LoadingButton from './ui/LoadingButton';

interface AdminLoginProps {
  onSignedIn?: () => void;
}

export default function AdminLogin({ onSignedIn }: AdminLoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for redirect result on component mount
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const auth = await getAuthClient();
        if (!auth) return;
        
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setLoading(true);
          try {
            const idToken = await result.user.getIdToken(true);
            if (idToken) {
              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
                credentials: 'include'
              });
            }
            onSignedIn?.();
          } catch (err) {
            console.error('Session creation failed:', err);
            setError('Istunnon luominen epäonnistui. Yritä uudelleen.');
          } finally {
            setLoading(false);
          }
        }
      } catch (err: any) {
        console.error('Redirect result error:', err);
        if (err?.code !== 'auth/popup-closed-by-user') {
          setError('Kirjautuminen epäonnistui. Yritä uudelleen.');
        }
      }
    };
    
    handleRedirectResult();
  }, [onSignedIn]);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: 'kotikreikasta.com', prompt: 'select_account' });
      const auth = await getAuthClient();
      if (!auth) {
        setError('Palvelu ei ole saatavilla juuri nyt. Yritä hetken kuluttua.');
        setLoading(false);
        return;
      }
      
      // Detect if we're on mobile or in a browser that doesn't support popups well
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Use redirect on mobile for better compatibility
        await signInWithRedirect(auth, provider);
        // Loading state will persist until redirect completes
      } else {
        // Use popup on desktop
        try {
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
        } catch (popupErr: any) {
          // If popup fails, fall back to redirect
          if (popupErr?.code === 'auth/popup-blocked') {
            await signInWithRedirect(auth, provider);
          } else {
            throw popupErr;
          }
        } finally {
          setLoading(false);
        }
      }
    } catch (e: any) {
      console.error('Sign in error:', e);
      if (e?.code !== 'auth/popup-closed-by-user') {
        setError('Kirjautuminen epäonnistui. Yritä uudelleen.');
      }
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
