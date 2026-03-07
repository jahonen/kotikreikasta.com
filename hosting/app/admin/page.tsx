'use client';

import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase-client';
import AdminLogin from '../../components/AdminLogin';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      const allowed = !!u?.email && u.email.endsWith('@kotikreikasta.com');
      if (!allowed && u) {
        setNotAllowed(true);
        await signOut(auth);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <main style={{ padding: '2rem' }}>Ladataan…</main>;
  }

  if (!user) {
    return <AdminLogin onSignedIn={() => setLoading(true)} />;
  }

  return (
    <main className="container" style={{ padding: '2rem 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="section-title">Ylläpito</h1>
        <button className="btn-primary" onClick={() => signOut(auth)}>Kirjaudu ulos</button>
      </header>

      <section style={{ marginTop: '2rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.4rem' }}>Sisällönhallinta</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <a className="btn-primary" href="#blog">Blogikirjoitukset</a>
          <a className="btn-primary" href="#listings">Kohdelistaukset</a>
          <a className="btn-primary" href="#newsletter">Uutiskirjeet</a>
        </div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
          Huom. Toiminnot ovat toistaiseksi paikkamerkkejä. Rakennetaan Firestore/Storage -pohjaiset näkymät seuraavassa vaiheessa.
        </p>
        {notAllowed && (
          <p style={{ marginTop: '0.5rem', color: '#b00020' }}>
            Pääsy sallittu vain @kotikreikasta.com-sähköpostiosoitteille.
          </p>
        )}
      </section>
    </main>
  );
}
