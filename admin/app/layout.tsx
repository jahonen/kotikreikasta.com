'use client';

import { onAuthStateChanged, signOut, type User, type Auth } from 'firebase/auth';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { getAuthClient, getDbClient } from '../lib/firebase-client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AdminLogin from '../components/AdminLogin';
import AdminShell from '../components/admin/AdminShell';
import '../styles/main.scss';

export default function RootLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authRef = useRef<Auth | null>(null);
  const [installNonce, setInstallNonce] = useState(0);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;
    (async () => {
      const auth = await getAuthClient();
      if (!mounted) return;
      authRef.current = auth;
      if (!auth) {
        setTimeout(() => { if (mounted) setInstallNonce((v) => v + 1); }, 300);
        return;
      }
      unsub = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        const allowed = !!u?.email && u.email.endsWith('@kotikreikasta.com');
        if (u && allowed) {
          try {
            const db = await getDbClient();
            if (db) {
              await setDoc(doc(db, 'roles', u.uid), { role: 'admin', createdAt: serverTimestamp() });
              await setDoc(doc(db, 'users', u.uid), {
                uid: u.uid,
                email: u.email ?? null,
                displayName: u.displayName ?? null,
                photoURL: u.photoURL ?? null,
                createdAt: serverTimestamp(),
              }, { merge: true });
            }
          } catch {}
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
        }
        setLoading(false);
      });
    })();
    return () => { mounted = false; unsub?.(); };
  }, [installNonce]);

  if (loading) return <html lang="fi"><body><main style={{ padding: '2rem' }}>Ladataan…</main></body></html>;
  if (!user) return <html lang="fi"><body><AdminLogin onSignedIn={() => { setLoading(true); setInstallNonce((v) => v + 1); }} /></body></html>;

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
