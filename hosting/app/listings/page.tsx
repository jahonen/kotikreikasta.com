'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NavBar from '../../components/nav-bar';
import Footer from '../../components/Footer';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { getDbClient } from '../../lib/firebase-client';

interface ListingDoc {
  id: string;
  title?: string;
  price?: number;
  urlStub?: string;
  location?: { locality?: string; administrative_area_level_3?: string; country?: string };
  updatedAt?: any;
}

export default function ListingsPage() {
  const [items, setItems] = useState<ListingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await getDbClient();
        if (!db) { setError('Palvelu ei ole saatavilla juuri nyt.'); return; }
        const q = query(
          collection(db, 'listings'),
          where('status', '==', 'published'),
          orderBy('updatedAt', 'desc'),
          limit(100)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const arr: ListingDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setItems(arr);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: '6rem 0 3rem', maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ marginTop: 0 }}>Kohdelistaukset</h1>
        <p style={{ color: 'var(--text-muted)' }}>Julkaistut kohteet</p>

        {loading && <div style={{ marginTop: 16 }}>Ladataan…</div>}
        {error && <div style={{ marginTop: 16, color: '#b00020' }}>Virhe: {error}</div>}

        {!loading && !error && (
          items.length === 0 ? (
            <div style={{ marginTop: 16, color: 'var(--text-muted)' }}>Ei julkaistuja kohteita juuri nyt.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 16 }}>
              {items.map((l) => (
                <article key={l.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fff' }}>
                  <h3 style={{ margin: '0 0 6px' }}>{l.title || 'Kohde'}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    {(l.location?.locality || l.location?.administrative_area_level_3 || l.location?.country) || ''}
                  </div>
                  {typeof l.price === 'number' && (
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{l.price.toLocaleString('fi-FI')} €</div>
                  )}
                  {l.urlStub ? (
                    <div style={{ marginTop: 10 }}>
                      <Link href={`/#listings`} style={{ color: '#0B3D6B' }}>Tutustu</Link>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )
        )}
      </main>
      <Footer />
    </>
  );
}
