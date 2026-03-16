"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDbClient } from "../../lib/firebase-client";

type Lead = {
  id: string;
  source?: { type: 'listing'|'content'; title?: string; url?: string; listingId?: string; slug?: string; price?: number };
  contact?: { name?: string|null; email?: string|null; phone?: string|null };
  message?: string;
  tcv?: number;
  status?: 'lead'|'prospect'|'proposal'|'contracting'|'closed';
  statusPct?: number;
  currentValue?: number;
  createdAt?: any;
};

const STATUS_OPTIONS: Array<{ key: Lead['status']; label: string; pct: number }> = [
  { key: 'lead', label: 'Lead (10%)', pct: 0.10 },
  { key: 'prospect', label: 'Prospect (25%)', pct: 0.25 },
  { key: 'proposal', label: 'Tarjous (50%)', pct: 0.50 },
  { key: 'contracting', label: 'Sopimusneuvottelu (80%)', pct: 0.80 },
  { key: 'closed', label: 'Suljettu (100%)', pct: 1.00 },
];

export default function MarketingLeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getDbClient();
      if (!db) { setError("Firebase init failed"); setLoading(false); return; }
      try {
        const snap = await getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(200)));
        const arr: Lead[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (!cancelled) setItems(arr);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => items.map((l) => {
    const status = (l.status || 'lead') as NonNullable<Lead['status']>;
    const opt = STATUS_OPTIONS.find(o => o.key === status) || STATUS_OPTIONS[0];
    const price = Number(l?.source?.price || 0);
    const tcv = Number(l.tcv || (l?.source?.type === 'listing' && price > 0 ? Math.round(price * 0.02) : 0));
    const currentValue = Number(l.currentValue ?? Math.round(tcv * opt.pct));
    return { ...l, status, tcv, currentValue } as Lead & { tcv: number; status: NonNullable<Lead['status']>; currentValue: number };
  }), [items]);

  const onChangeStatus = async (leadId: string, newStatus: Lead['status']) => {
    const db = await getDbClient();
    if (!db) return;
    try {
      const opt = STATUS_OPTIONS.find(o => o.key === newStatus) || STATUS_OPTIONS[0];
      const lead = rows.find(r => r.id === leadId);
      const tcv = Number(lead?.tcv || 0);
      const currentValue = Math.round(tcv * opt.pct);
      await updateDoc(doc(db, 'leads', leadId), {
        status: newStatus,
        statusPct: opt.pct,
        currentValue,
        updatedAt: serverTimestamp(),
      } as any);
      setItems(prev => prev.map(it => it.id === leadId ? { ...it, status: newStatus, statusPct: opt.pct, currentValue } : it));
    } catch (e) {
      // ignore
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Markkinointi</h1>
      {loading && <p>Ladataan…</p>}
      {error && <p style={{ color: '#b00020' }}>Virhe: {error}</p>}
      {!loading && !error && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F9FAFB', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Aika</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Lähde</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Yhteystiedot</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Viesti</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>TCV</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Nykyarvo</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} style={{ borderTop: '1px solid #e5e7eb', verticalAlign: 'top' }}>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString('fi-FI') : '-'}</td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{l.source?.title || (l.source?.type === 'listing' ? `Kohde ${l.source?.listingId || ''}` : 'Sisältösivu')}</div>
                    {l.source?.url && (
                      <a href={l.source.url} target="_blank" rel="noopener" style={{ color: '#0B3D6B' }}>{l.source.url}</a>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div>{l.contact?.name || '-'}</div>
                    <div>{l.contact?.email ? <a href={`mailto:${l.contact.email}`}>{l.contact.email}</a> : '-'}</div>
                    <div>{l.contact?.phone || '-'}</div>
                  </td>
                  <td style={{ padding: 12, maxWidth: 320 }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{l.message || '-'}</div>
                  </td>
                  <td style={{ padding: 12 }}>{(l.tcv || 0).toLocaleString('fi-FI')} €</td>
                  <td style={{ padding: 12 }}>{(l.currentValue || 0).toLocaleString('fi-FI')} €</td>
                  <td style={{ padding: 12 }}>
                    <select value={l.status || 'lead'} onChange={(e) => onChangeStatus(l.id, e.target.value as any)}>
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.key} value={opt.key!}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 16, color: '#6b7280' }}>Ei viestejä vielä.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
