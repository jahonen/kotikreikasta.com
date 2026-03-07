'use client';

import { onAuthStateChanged, signOut, type User, type Auth } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { getAuthClient, getDbClient } from '../../lib/firebase-client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AdminLogin from '../../components/AdminLogin';
import ListingsEditor from '../../components/admin/ListingsEditor';
import BlogEditor from '../../components/admin/BlogEditor';
import ListingWizard from '../../components/admin/ListingWizard';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);
  const authRef = useRef<Auth | null>(null);
  const [installNonce, setInstallNonce] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;
    (async () => {
      const auth = await getAuthClient();
      if (!mounted) return;
      authRef.current = auth;
      if (!auth) {
        // Retry shortly; Firebase init.json may not yet be available on first tick
        setTimeout(() => {
          if (mounted) {
            setInstallNonce((v) => v + 1);
          }
        }, 300);
        return; // keep loading until we retry
      }
      unsub = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        const allowed = !!u?.email && u.email.endsWith('@kotikreikasta.com');
        if (u && allowed) {
          try {
            const db = await getDbClient();
            if (db) {
              // Attempt self-provisioning of roles/{uid} on first login; ignore if it already exists
              await setDoc(doc(db, 'roles', u.uid), { role: 'admin', createdAt: serverTimestamp() });
            }
          } catch {}
        }
        if (!allowed && u) {
          setNotAllowed(true);
          try {
            await signOut(auth);
          } catch {}
        }
        setLoading(false);
      });
    })();
    return () => {
      mounted = false;
      unsub?.();
    };
  }, [installNonce]);

  if (loading) {
    return <main style={{ padding: '2rem' }}>Ladataan…</main>;
  }

  if (!user) {
    return (
      <AdminLogin
        onSignedIn={() => {
          // Re-run listener installation and show loading until auth state arrives
          setLoading(true);
          setInstallNonce((v) => v + 1);
        }}
      />
    );
  }

  return (
    <main className="container" style={{ padding: '2rem 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="section-title">Ylläpito</h1>
        <button className="btn-primary" onClick={() => authRef.current && signOut(authRef.current)}>Kirjaudu ulos</button>
      </header>

      <section style={{ marginTop: '2rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.4rem' }}>Sisällönhallinta</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <a className="btn-primary" href="#blog">Blogikirjoitukset</a>
          <a className="btn-primary" href="#listings">Kohdelistaukset</a>
          <a className="btn-primary" href="#newsletter">Uutiskirjeet</a>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button className="btn-primary" onClick={() => setWizardOpen(true)}>Lisää kiinteistökohde (ohjattu)</button>
        </div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
          Huom. Toiminnot ovat toistaiseksi paikkamerkkejä. Rakennetaan Firestore/Storage -pohjaiset näkymät seuraavassa vaiheessa.
        </p>
        <ListingsEditor />
        <BlogEditor />
        {notAllowed && (
          <p style={{ marginTop: '0.5rem', color: '#b00020' }}>
            Pääsy sallittu vain @kotikreikasta.com-sähköpostiosoitteille.
          </p>
        )}
        {toast && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6 }}>
            {toast}
          </div>
        )}
      </section>
      <ListingWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setWizardOpen(false);
          setToast('Luonnos tallennettu.');
          setTimeout(() => setToast(null), 4000);
        }}
      />
    </main>
  );
}
