"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import Link from "next/link";
import { getDbClient } from "../../lib/firebase-client";
import ListingWizard from "../../components/admin/ListingWizard";

interface Row {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

export default function ListingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  const reload = useCallback(async () => {
    const db = await getDbClient();
    if (!db) return;
    const snap = await getDocs(query(collection(db, "listings"), orderBy("updatedAt", "desc"), limit(100)));
    const out: Row[] = snap.docs.map((d) => {
      const data: any = d.data() || {};
      const ts = data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || null;
      return {
        id: d.id,
        title: data.title || "(nimetön)",
        status: data.status || "draft",
        updatedAt: ts ? new Date(ts).toLocaleString("fi-FI") : "-",
      };
    });
    setRows(out);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try { await reload(); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [reload]);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ margin: 0, marginBottom: 16 }}>Kohteet</h1>

      {/* Uusi kohdelistaus - avaa Wizard */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '10px 12px', fontWeight: 600, background: '#F9FAFB', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>Uusi kohdelistaus</div>
          <button className="btn-primary" onClick={() => setWizardOpen(true)}>+ Luo uusi</button>
        </div>
        <ListingWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onSaved={async () => { setWizardOpen(false); await reload(); }}
        />
      </div>

      {/* Listaus */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', fontWeight: 600, background: '#F9FAFB', borderBottom: '1px solid #e5e7eb' }}>Viimeisimmät</div>
        {loading ? (
          <div style={{ padding: 12, color: '#6b7280' }}>Ladataan…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 12, color: '#6b7280' }}>Ei listauksia vielä.</div>
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
                <tr key={r.id} style={{ cursor: 'pointer' }}>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>
                    <Link href={`/listings/${r.id}`} style={{ color: '#0B3D6B', textDecoration: 'none', fontWeight: 500 }}>
                      {r.title}
                    </Link>
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: r.status === 'published' ? '#dcfce7' : r.status === 'sold' ? '#fee2e2' : '#f3f4f6',
                      color: r.status === 'published' ? '#166534' : r.status === 'sold' ? '#b91c1c' : '#374151',
                    }}>
                      {r.status === 'published' ? 'Julkaistu' : r.status === 'sold' ? 'Myyty' : r.status === 'archived' ? 'Arkistoitu' : 'Luonnos'}
                    </span>
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{r.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
