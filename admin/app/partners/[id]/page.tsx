"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDbClient } from "../../../lib/firebase-client";
import MapPicker from "../../../components/admin/MapPicker";
import type { Organization, OrganizationLocation, OrganizationLocationAddress, PartnerCategory } from "../../../lib/models/partners";
import { normalizeAddressComponents } from "../../../lib/models/partners";
import { fetchHomeOwnerServices, searchServices, type HomeOwnerService } from "../../../lib/data/services";

const CATEGORY_OPTIONS: PartnerCategory[] = [
  "real_estate_agent",
  "accountant",
  "gardener",
  "electrician",
  "plumber",
  "general_contractor",
  "cleaning",
  "property_management",
  "legal",
  "other",
];

export default function EditPartnerPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => (params?.id ? String(params.id) : null), [params]);
  const router = useRouter();

  const [org, setOrg] = useState<Organization | null>(null);
  const [locs, setLocs] = useState<OrganizationLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [descriptionMd, setDescriptionMd] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "archived">("active");
  const [categories, setCategories] = useState<PartnerCategory[]>([]);
  const [allServices, setAllServices] = useState<HomeOwnerService[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceIds, setServiceIds] = useState<number[]>([]);

  const [addingLoc, setAddingLoc] = useState(false);
  const [newLoc, setNewLoc] = useState<{ lat: number; lng: number; formattedAddress?: string | null; addressComponents?: Array<{ types: string[]; longText?: string; shortText?: string }> } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      const db = await getDbClient();
      if (!db) { setError("Firebase init failed"); setLoading(false); return; }
      try {
        const d = await getDoc(doc(db, "organizations", id));
        if (!d.exists()) { setError("Kumppania ei löytynyt"); setLoading(false); return; }
        const o = { id: d.id, ...(d.data() as any) } as Organization;
        if (!cancelled) {
          setOrg(o);
          setDisplayName(o.displayName || "");
          setDescriptionMd(o.descriptionMd || "");
          setEmail(o.email || "");
          setPhone(o.phone || "");
          setWebsite(o.website || "");
          setStatus((o as any).status || "active");
          setCategories(Array.isArray(o.categories) ? o.categories : []);
          setServiceIds(Array.isArray((o as any).serviceIds) ? (o as any).serviceIds as number[] : []);
        }
        // load locations
        const snap = await getDocs(query(collection(db, "organizations", id, "locations"), orderBy("createdAt")));
        const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrganizationLocation[];
        if (!cancelled) setLocs(arr);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Load shared services list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const arr = await fetchHomeOwnerServices();
      if (!cancelled) setAllServices(arr);
    })();
    return () => { cancelled = true; };
  }, []);

  const results = useMemo(() => searchServices(allServices, serviceQuery), [allServices, serviceQuery]);
  const selected = useMemo(() => new Set<number>(serviceIds), [serviceIds]);
  const idToService = useMemo(() => {
    const m = new Map<number, HomeOwnerService>();
    for (const s of allServices) m.set(s.id, s);
    return m;
  }, [allServices]);

  const onToggleCategory = useCallback((c: PartnerCategory) => {
    setCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }, []);

  const onSave = useCallback(async () => {
    if (!id) return;
    setSaving(true); setError(null);
    try {
      const db = await getDbClient();
      if (!db) throw new Error("Firebase init failed");
      const payload: Partial<Organization> = {
        displayName: displayName.trim(),
        descriptionMd: descriptionMd || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        categories,
        serviceIds,
        status,
        updatedAt: serverTimestamp() as any,
      } as any;
      await updateDoc(doc(db, "organizations", id), payload as any);
      router.refresh?.();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }, [id, displayName, descriptionMd, email, phone, website, categories, status, router]);

  const onAddLocation = useCallback(async () => {
    if (!id || !newLoc) return;
    setSaving(true); setError(null);
    try {
      const db = await getDbClient();
      if (!db) throw new Error("Firebase init failed");
      const address: OrganizationLocationAddress = {
        ...(normalizeAddressComponents(newLoc.addressComponents) as any),
        formatted: newLoc.formattedAddress || null,
      };
      const locData: Partial<OrganizationLocation> = {
        lat: newLoc.lat,
        lng: newLoc.lng,
        address,
        label: 'Toimipaikka',
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      const ref = await setDoc(doc(collection(db, "organizations", id, "locations")), locData as any);
      // refresh list
      const snap = await getDocs(query(collection(db, "organizations", id, "locations"), orderBy("createdAt")));
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrganizationLocation[];
      setLocs(arr);
      setAddingLoc(false);
      setNewLoc(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }, [id, newLoc]);

  const onSetPrimary = useCallback(async (loc: OrganizationLocation) => {
    if (!id || !loc) return;
    setSaving(true);
    try {
      const db = await getDbClient();
      if (!db) throw new Error("Firebase init failed");
      await updateDoc(doc(db, "organizations", id), {
        primaryLocationId: loc.id,
        primaryLocation: {
          lat: loc.lat,
          lng: loc.lng,
          city: loc.address?.locality || null,
          a1: loc.address?.administrativeAreaLevel1 || null,
          a2: loc.address?.administrativeAreaLevel2 || null,
        },
        updatedAt: serverTimestamp(),
      } as any);
      router.refresh?.();
    } catch {}
    setSaving(false);
  }, [id, router]);

  const onDeleteLocation = useCallback(async (loc: OrganizationLocation) => {
    if (!id || !loc) return;
    if (!confirm("Poista toimipaikka?")) return;
    setSaving(true);
    try {
      const db = await getDbClient();
      if (!db) throw new Error("Firebase init failed");
      await deleteDoc(doc(db, "organizations", id, "locations", loc.id));
      const snap = await getDocs(query(collection(db, "organizations", id, "locations"), orderBy("createdAt")));
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrganizationLocation[];
      setLocs(arr);
    } catch {}
    setSaving(false);
  }, [id]);

  if (loading) return <main style={{ padding: 24 }}><p>Ladataan…</p></main>;
  if (error) return <main style={{ padding: 24 }}><p style={{ color: '#b00020' }}>Virhe: {error}</p></main>;
  if (!org) return <main style={{ padding: 24 }}><p>Ei löytynyt.</p></main>;

  return (
    <main style={{ padding: 24, maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{org.displayName}</h1>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Yrityksen nimi</label>
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Sähköposti</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Puhelin</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Verkkosivu</label>
          <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Kuvaus (Markdown)</label>
          <textarea className="input" rows={6} value={descriptionMd} onChange={(e) => setDescriptionMd(e.target.value)} />
        </div>
      </section>

      <h2 style={{ marginTop: 24 }}>Palvelukategoriat</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {CATEGORY_OPTIONS.map((c) => (
          <label key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', padding: '6px 10px', borderRadius: 8 }}>
            <input type="checkbox" checked={categories.includes(c)} onChange={() => onToggleCategory(c)} /> {c}
          </label>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>Palvelut</h2>
      <p style={{ color: '#6b7280', marginTop: 4 }}>Haku on joustava (fuzzily). Näytämme suomenkieliset nimet, mutta tallennamme vain tunnisteet.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        <input
          className="input"
          placeholder="Hae palvelua (esim. siivous, sähkö, puutarha)"
          value={serviceQuery}
          onChange={(e) => setServiceQuery(e.target.value)}
        />
        {serviceIds.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {serviceIds.map((id) => {
              const s = idToService.get(id);
              const label = s?.name?.finnish || `#${id}`;
              return (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EEF2FF', color: '#1E3A8A', borderRadius: 16, padding: '4px 10px' }}>
                  {label}
                  <button
                    onClick={() => setServiceIds((prev) => prev.filter((x) => x !== id))}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1E3A8A' }}
                    aria-label={`Poista ${label}`}
                  >×</button>
                </span>
              );
            })}
          </div>
        )}
        <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          {results.map((s) => {
            const id = s.id;
            const label = s?.name?.finnish || s?.name?.english || s?.name?.greek || `#${id}`;
            const checked = selected.has(id);
            return (
              <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setServiceIds((prev) => e.target.checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id))}
                />
                <span>{label}</span>
              </label>
            );
          })}
          {results.length === 0 && (
            <div style={{ padding: 12, color: '#6b7280' }}>Ei osumia haulle.</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
        <button onClick={() => router.push('/partners')} style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Peruuta</button>
        <button onClick={onSave} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.85 : 1 }}>{saving ? 'Tallennetaan…' : 'Tallenna muutokset'}</button>
      </div>

      <h2 style={{ marginTop: 28 }}>Toimipaikat</h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#F9FAFB', textAlign: 'left' }}>
            <tr>
              <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Osoite</th>
              <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Kaupunki</th>
              <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>Label</th>
              <th style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}></th>
            </tr>
          </thead>
          <tbody>
            {locs.map((l) => (
              <tr key={l.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: 12 }}>{l.address?.formatted || ''}</td>
                <td style={{ padding: 12 }}>{l.address?.locality || ''}</td>
                <td style={{ padding: 12 }}>{l.label || ''}</td>
                <td style={{ padding: 12, display: 'flex', gap: 10 }}>
                  <button onClick={() => onSetPrimary(l)} style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Aseta ensisijaiseksi</button>
                  <button onClick={() => onDeleteLocation(l)} style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#b00020' }}>Poista</button>
                </td>
              </tr>
            ))}
            {locs.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, color: '#6b7280' }}>Ei toimipaikkoja.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!addingLoc && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setAddingLoc(true)} style={{ background: '#0B3D6B', color: '#fff', borderRadius: 8, padding: '10px 14px', border: 'none', cursor: 'pointer' }}>+ Lisää toimipaikka</button>
        </div>
      )}

      {addingLoc && (
        <section style={{ marginTop: 16 }}>
          <MapPicker onChange={(v) => setNewLoc({ lat: v.lat, lng: v.lng, formattedAddress: v.formattedAddress || null, addressComponents: v.addressComponents })} />
          {newLoc?.formattedAddress && <p style={{ color: '#6b7280', marginTop: 8 }}>Osoite: {newLoc.formattedAddress}</p>}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => setAddingLoc(false)} style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Peruuta</button>
            <button onClick={onAddLocation} disabled={!newLoc || saving} className="btn-primary" style={{ opacity: saving ? 0.85 : 1 }}>{saving ? 'Tallennetaan…' : 'Tallenna toimipaikka'}</button>
          </div>
        </section>
      )}
    </main>
  );
}
