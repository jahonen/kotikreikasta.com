'use client';

import { signInWithCustomToken, signOut, type User, type Auth } from 'firebase/auth';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { getAuthClient, getDbClient } from '../lib/firebase-client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AdminShell from '../components/admin/AdminShell';
import '../styles/main.scss';

export default function RootLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authRef = useRef<Auth | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const auth = await getAuthClient();
        if (!mounted || !auth) return;
        authRef.current = auth;

        const res = await fetch('/api/auth/iap-signin', { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `IAP sign-in failed (${res.status})`);
        }
        const { customToken, email } = await res.json();

        const cred = await signInWithCustomToken(auth, customToken);
        const u = cred.user;

        try {
          const db = await getDbClient();
          if (db) {
            await setDoc(doc(db, 'roles', u.uid), { role: 'admin', createdAt: serverTimestamp() });
            await setDoc(doc(db, 'users', u.uid), {
              uid: u.uid,
              email: email ?? u.email ?? null,
              displayName: u.displayName ?? null,
              photoURL: u.photoURL ?? null,
              createdAt: serverTimestamp(),
            }, { merge: true });
          }
        } catch {}

        try {
          const idToken = await u.getIdToken(true);
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
            credentials: 'include',
          });
        } catch {}

        if (mounted) setUser(u);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Kirjautuminen epäonnistui');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <html lang="fi"><body><main style={{ padding: '2rem' }}>Ladataan…</main></body></html>;
  if (error) return <html lang="fi"><body><main style={{ padding: '2rem', color: 'red' }}>Virhe: {error}</main></body></html>;

  return (
    <html lang="fi">
      <body>
        <AdminShell
          onSignOut={async () => {
            if (authRef.current) await signOut(authRef.current);
            try { await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' }); } catch {}
          }}
          subscriberId={user?.uid ?? null}
        >
          {children}
        </AdminShell>
      </body>
    </html>
  );
}
