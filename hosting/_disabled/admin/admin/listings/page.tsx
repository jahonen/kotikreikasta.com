'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { getDbClient } from '../../../lib/firebase-client';

interface Row {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

export default function ListingsDashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const db = await getDbClient();
        if (!db) return;
        const snap = await getDocs(query(collection(db, 'listings'), orderBy('updatedAt', 'desc'), limit(25)));
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
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Listings</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>Manage property listings</p>
        </div>
        <Link href="/admin/listings/new" className="btn-primary">+ New listing</Link>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', fontWeight: 600, background: 'var(--sand)', borderBottom: '1px solid #e5e7eb' }}>Recent</div>
        {loading ? (
          <div style={{ padding: 12, color: 'var(--text-muted)' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 12, color: 'var(--text-muted)' }}>No listings yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#fafafa' }}>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>Title</th>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>Status</th>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{r.title}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{r.status}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{r.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
