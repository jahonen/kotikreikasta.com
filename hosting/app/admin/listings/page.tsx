"use client";

import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { getDbClient } from '../../../lib/firebase-client';
import AdminShell from '../../../components/admin/AdminShell';
import ListingWizard from '../../../components/admin/ListingWizard';

interface Row {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

export default function ListingsAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  const loadRows = useCallback(async () => {
    const db = await getDbClient();
    if (!db) return;
    const snap = await getDocs(query(collection(db, 'listings'), orderBy('updatedAt', 'desc'), limit(25)));
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
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try { await loadRows(); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [loadRows]);

  return (
    <AdminShell>
      <div style={{ display: 'grid', gap: 24 }}>
        {/* New listing action opens the existing ListingWizard */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--sand)' }}>
            <div style={{ fontWeight: 700 }}>Uusi kohdelistaus</div>
            <button className="btn-primary" onClick={() => setWizardOpen(true)}>+ Luo uusi</button>
          </div>
          <ListingWizard
            open={wizardOpen}
            onClose={() => setWizardOpen(false)}
            onSaved={async () => { setWizardOpen(false); await loadRows(); }}
          />
        </div>

        {/* Recent listings (renders even when empty) */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', fontWeight: 700, background: 'var(--sand)' }}>Viimeisimmät</div>
          {loading ? (
            <div style={{ padding: 12, color: 'var(--text-muted)' }}>Ladataan…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 12, color: 'var(--text-muted)' }}>Ei listauksia vielä.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#fafafa' }}>
                  <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>Otsikko</th>
                  <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>Tila</th>
                  <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>Päivitetty</th>
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
    </AdminShell>
  );
}
