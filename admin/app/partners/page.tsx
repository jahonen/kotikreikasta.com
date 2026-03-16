"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getDbClient } from "../../lib/firebase-client";
import type { Organization } from "../../lib/models/partners";
import { fetchHomeOwnerServices, type HomeOwnerService } from "../../lib/data/services";

function stripDiacritics(s: string): string {
  try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return s; }
}
function canon(s: string): string { return stripDiacritics(String(s || "")).toLocaleLowerCase('fi'); }

export default function PartnersPage() {
  const [items, setItems] = useState<Organization[]>([]);
  const [services, setServices] = useState<HomeOwnerService[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getDbClient();
      if (!db) { setError("Firebase init failed"); setLoading(false); return; }
      try {
        const [svc, snap] = await Promise.all([
          fetchHomeOwnerServices(),
          getDocs(query(collection(db, "organizations"), orderBy("displayName"), limit(500)))
        ]);
        const arr: Organization[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (!cancelled) { setServices(svc); setItems(arr); }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const idToLabel = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of services) m.set(s.id, s?.name?.finnish || s?.name?.english || s?.name?.greek || `#${s.id}`);
    return m;
  }, [services]);

  type Row = { id: string; name: string; city: string; serviceIds: number[]; servicesLabel: string };
  const rows: Row[] = useMemo(() => items.map((o) => {
    const ids: number[] = Array.isArray((o as any).serviceIds) ? ((o as any).serviceIds as number[]) : [];
    const labels = ids.map((id) => idToLabel.get(id) || `#${id}`);
    return {
      id: o.id,
      name: String(o.displayName || ""),
      city: String((o as any)?.primaryLocation?.city || ""),
      serviceIds: ids,
      servicesLabel: labels.join(", ")
    };
  }), [items, idToLabel]);

  // Elastic-like client search: AND all query tokens across name, city, and services; score by prefix and substring matches
  const filtered = useMemo(() => {
    const cq = canon(q).trim();
    if (!cq) return rows;
    const tokens = cq.split(/\s+/).filter(Boolean);
    const scored = rows.map((r) => {
      const hay = `${r.name} ${r.city} ${r.servicesLabel}`;
      const ch = canon(hay);
      let ok = true; let score = 0;
      for (const t of tokens) {
        const idx = ch.indexOf(t);
        if (idx === -1) { ok = false; break; }
        score += (idx === 0 ? 3 : 1); // prefix match gets extra weight
      }
      return { r, ok, score };
    }).filter(x => x.ok)
      .sort((a, b) => (b.score - a.score) || a.r.name.localeCompare(b.r.name, 'fi'))
      .map(x => x.r);
    return scored;
  }, [q, rows]);

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Kumppanit</h1>
        <Link href="/partners/new" style={{ background: '#0B3D6B', color: '#fff', padding: '10px 14px', borderRadius: 8, textDecoration: 'none' }}>+ Uusi kumppani</Link>
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Hae nimellä, palvelulla tai kaupungilla (esim. 'siivous athena')"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <p>Ladataan…</p>}
      {error && <p style={{ color: '#b00020' }}>Virhe: {error}</p>}
      {!loading && !error && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F9FAFB', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Nimi</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Palvelut</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Kaupunki</th>
                <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 12 }}>{r.name}</td>
                  <td style={{ padding: 12 }}>{r.servicesLabel}</td>
                  <td style={{ padding: 12 }}>{r.city}</td>
                  <td style={{ padding: 12 }}>
                    <Link href={`/partners/${encodeURIComponent(r.id)}`} style={{ color: '#0B3D6B' }}>Muokkaa</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 16, color: '#6b7280' }}>Ei osumia haulle.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
