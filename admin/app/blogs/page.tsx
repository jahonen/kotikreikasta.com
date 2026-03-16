'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, deleteField } from 'firebase/firestore';
import { getDbClient, getAuthClient } from '../../lib/firebase-client';

interface Row {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

export default function BlogsDashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const db = await getDbClient();
        if (!db) return;
        const snap = await getDocs(query(collection(db, 'blog_posts'), orderBy('updatedAt', 'desc'), limit(25)));
        if (!active) return;
        const out: Row[] = snap.docs.map((d) => {
          const data: any = d.data() || {};
          const ts = data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || null;
          return {
            id: d.id,
            title: data.title || '(untitled)',
            status: data.status || 'draft',
            updatedAt: ts ? new Date(ts).toLocaleString('fi-FI') : '-',
          };
        });
        setRows(out);
      } finally {
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Blogit</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>Kirjoita ja hallitse artikkeleita</p>
        </div>
        <Link href="/blogs/new" className="btn-primary">+ Uusi blogikirjoitus</Link>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', fontWeight: 600, background: 'var(--sand)', borderBottom: '1px solid #e5e7eb' }}>Viimeisimmät</div>
        {loading ? (
          <div style={{ padding: 12, color: 'var(--text-muted)' }}>Ladataan…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 12, color: 'var(--text-muted)' }}>Ei blogikirjoituksia vielä.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#fafafa' }}>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>Otsikko</th>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>Tila</th>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>Päivitetty</th>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>Toiminnot</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{r.title}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{r.status}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{r.updatedAt}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Link href={`/blogs/${r.id}`} aria-label="Muokkaa" title="Muokkaa">✏️</Link>
                      {r.status === 'published' || r.status === 'queued' ? (
                        <button
                          aria-label="Palauta luonnokseksi"
                          title="Palauta luonnokseksi"
                          disabled={!!busy[r.id]}
                          onClick={async () => {
                            setBusy((b) => ({ ...b, [r.id]: true }));
                            try {
                              const db = await getDbClient();
                              if (!db) return;
                              await updateDoc(doc(collection(db, 'blog_posts'), r.id), {
                                status: 'draft',
                                publishedAt: deleteField(),
                                updatedAt: serverTimestamp(),
                              });
                              setRows((rows) => rows.map((x) => x.id === r.id ? { ...x, status: 'draft' } : x));
                            } finally {
                              setBusy((b) => ({ ...b, [r.id]: false }));
                            }
                          }}
                          className="link-button"
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          {busy[r.id] ? '…' : '🚫'}
                        </button>
                      ) : (
                        <button
                          aria-label="Julkaise"
                          title="Julkaise"
                          disabled={!!busy[r.id]}
                          onClick={async () => {
                            setBusy((b) => ({ ...b, [r.id]: true }));
                            try {
                              const db = await getDbClient();
                              if (!db) return;
                              const snap = await getDoc(doc(collection(db, 'blog_posts'), r.id));
                              if (!snap.exists()) return;
                              const data: any = snap.data() || {};
                              const title = String(data.title || '');
                              const contentMd = String(data.contentMd || '');
                              if (!title || !contentMd) return;
                              const imageUrl = data.featuredImage?.url || undefined;
                              const auth = await getAuthClient();
                              const token = await auth?.currentUser?.getIdToken(true);
                              const res = await fetch('/api/blogs/publish', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...(token ? { 'x-firebase-auth': token } : {}) },
                                body: JSON.stringify({ id: r.id, title, contentMd, imageUrl }),
                                credentials: 'include',
                              });
                              if (!res.ok) {
                                // Best-effort: do not update UI if failed
                              } else {
                                setRows((rows) => rows.map((x) => x.id === r.id ? { ...x, status: 'queued' } : x));
                              }
                            } finally {
                              setBusy((b) => ({ ...b, [r.id]: false }));
                            }
                          }}
                          className="link-button"
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          {busy[r.id] ? '…' : '🚀'}
                        </button>
                      )}
                      <button
                        aria-label="Poista"
                        title="Poista"
                        disabled={!!busy[r.id]}
                        onClick={async () => {
                          if (!confirm('Poistetaanko tämä blogikirjoitus?')) return;
                          setBusy((b) => ({ ...b, [r.id]: true }));
                          try {
                            const db = await getDbClient();
                            if (!db) return;
                            await deleteDoc(doc(collection(db, 'blog_posts'), r.id));
                            setRows((rows) => rows.filter((x) => x.id !== r.id));
                          } finally {
                            setBusy((b) => ({ ...b, [r.id]: false }));
                          }
                        }}
                        className="link-button"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        {busy[r.id] ? '…' : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
