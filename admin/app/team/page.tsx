"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getDbClient } from "../../lib/firebase-client";

interface AdminUser {
  id: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export default function TeamPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getDbClient();
      if (!db) { setError("Firebase init failed"); setLoading(false); return; }
      try {
        const snap = await getDocs(query(collection(db, "users"), orderBy("displayName"), limit(500)));
        const arr: AdminUser[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (!cancelled) setItems(arr);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Tiimi</h1>

      {loading && <p>Ladataan…</p>}
      {error && <p style={{ color: '#b00020' }}>Virhe: {error}</p>}

      {!loading && !error && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F9FAFB', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Kuva</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Nimi</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Sähköposti</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 12 }}>
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt={u.displayName || u.email || 'user'}
                        width={40}
                        height={40}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          const fallback = `data:image/svg+xml;utf8,${encodeURIComponent(
                            `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>\n<rect width='40' height='40' rx='20' fill='#e5e7eb'/></svg>`
                          )}`;
                          // prevent loop
                          e.currentTarget.onerror = null as any;
                          e.currentTarget.src = fallback;
                        }}
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : null}
                    {!u.photoURL && (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e5e7eb' }} />
                    )}
                  </td>
                  <td style={{ padding: 12 }}>{u.displayName || '-'}</td>
                  <td style={{ padding: 12 }}>
                    {u.email ? (
                      <a href={`mailto:${u.email}`}>{u.email}</a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 16, color: '#6b7280' }}>Ei käyttäjiä.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
