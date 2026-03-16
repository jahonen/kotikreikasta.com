"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MapPicker from "../../../components/admin/MapPicker";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDbClient } from "../../../lib/firebase-client";
import type { Organization, PartnerCategory, OrganizationLocation, OrganizationLocationAddress } from "../../../lib/models/partners";
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

export default function NewPartnerPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [descriptionMd, setDescriptionMd] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [categories, setCategories] = useState<PartnerCategory[]>([]);
  const [allServices, setAllServices] = useState<HomeOwnerService[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceIds, setServiceIds] = useState<number[]>([]);

  const [loc, setLoc] = useState<{ lat: number; lng: number; formattedAddress?: string | null; addressComponents?: Array<{ types: string[]; longText?: string; shortText?: string }> } | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onToggleCategory = useCallback((c: PartnerCategory) => {
    setCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }, []);

  const canSave = useMemo(() => displayName.trim().length > 1, [displayName]);

  // Load services once
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

  const onSave = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      const db = await getDbClient();
      if (!db) throw new Error("Firebase init failed");

      const base: Partial<Organization> = {
        displayName: displayName.trim(),
        descriptionMd: descriptionMd || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        categories,
        serviceIds,
        status: 'active',
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      } as any;

      const orgRef = await addDoc(collection(db, "organizations"), base as any);

      // Create primary location if provided
      if (loc) {
        const address: OrganizationLocationAddress = {
          ...(normalizeAddressComponents(loc.addressComponents) as any),
          formatted: loc.formattedAddress || null,
        };
        const locData: Partial<OrganizationLocation> = {
          lat: loc.lat,
          lng: loc.lng,
          address,
          label: 'Päätoimipaikka',
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        };
        const locRef = await addDoc(collection(db, "organizations", orgRef.id, "locations"), locData as any);
        await setDoc(doc(db, "organizations", orgRef.id), {
          primaryLocationId: locRef.id,
          primaryLocation: {
            lat: loc.lat,
            lng: loc.lng,
            city: address.locality || null,
            a1: address.administrativeAreaLevel1 || null,
            a2: address.administrativeAreaLevel2 || null,
          },
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      router.push(`/partners/${encodeURIComponent(orgRef.id)}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }, [displayName, descriptionMd, email, phone, website, categories, loc, router]);

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Uusi kumppani</h1>
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Yrityksen nimi</label>
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Esim. Athene Real Estate" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Sähköposti</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@example.com" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Puhelin</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+30 ..." />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Verkkosivu</label>
          <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Kuvaus (Markdown)</label>
          <textarea className="input" rows={6} value={descriptionMd} onChange={(e) => setDescriptionMd(e.target.value)} placeholder="Lyhyt kuvaus palveluista..." />
        </div>
      </section>

      {/* Palvelukategoriat section removed as redundant; using explicit services */}

      <h2 style={{ marginTop: 24 }}>Palvelut</h2>
      <p style={{ color: '#6b7280', marginTop: 4 }}>Valitse palvelut listalta. Haku on joustava (kirjoita osa nimestä). Tallennamme vain palvelun tunnisteen.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        <input
          className="input"
          placeholder="Hae palvelua (esim. siivous, sähkö, puutarha)"
          value={serviceQuery}
          onChange={(e) => setServiceQuery(e.target.value)}
        />
        {/* Selected chips */}
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
        {/* Results list */}
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

      <h2 style={{ marginTop: 24 }}>Päätoimipaikka</h2>
      <MapPicker onChange={(v) => setLoc({ lat: v.lat, lng: v.lng, formattedAddress: v.formattedAddress || null, addressComponents: v.addressComponents })} />
      {loc?.formattedAddress && <p style={{ color: '#6b7280', marginTop: 8 }}>Osoite: {loc.formattedAddress}</p>}

      {error && <p style={{ color: '#b00020', marginTop: 16 }}>Virhe: {error}</p>}
      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <button onClick={() => router.push('/partners')} style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Peruuta</button>
        <button onClick={onSave} disabled={!canSave || saving} className="btn-primary" style={{ opacity: saving ? 0.85 : 1 }}>{saving ? 'Tallennetaan…' : 'Luo kumppani'}</button>
      </div>
    </main>
  );
}
