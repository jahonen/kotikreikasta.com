'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type LatLng = { lat: number; lng: number };

export type PoiItem = {
  place_id: string;
  name?: string;
  types?: string[];
  location?: LatLng;
};

export default function PointsOfInterestPicker({
  center,
  radius = 2000,
  onChange,
}: {
  center?: LatLng | null;
  radius?: number;
  onChange?: (selected: PoiItem[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [pois, setPois] = useState<PoiItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const lastKeyRef = useRef<string>('');
  const PLACES_ENDPOINT = (process as any)?.env?.NEXT_PUBLIC_PLACES_ENDPOINT || '/api/places/nearby';

  const TYPE_LABEL_FI: Record<string, string> = {
    restaurant: 'Ravintola',
    cafe: 'Kahvila',
    bar: 'Baari',
    bakery: 'Leipomo',
    supermarket: 'Supermarket',
    grocery_or_supermarket: 'Ruokakauppa',
    convenience_store: 'Lähikauppa',
    pharmacy: 'Apteekki',
    hospital: 'Sairaala',
    doctor: 'Lääkäri',
    dentist: 'Hammaslääkäri',
    school: 'Koulu',
    primary_school: 'Alakoulu',
    secondary_school: 'Yläkoulu',
    university: 'Yliopisto',
    bus_station: 'Bussiasema',
    subway_station: 'Metroasema',
    train_station: 'Rautatieasema',
    light_rail_station: 'Raitiovaunupysäkki',
    transit_station: 'Joukkoliikenneasema',
    airport: 'Lentoasema',
    parking: 'Pysäköinti',
    park: 'Puisto',
    beach: 'Ranta',
    museum: 'Museo',
    art_gallery: 'Taidegalleria',
    gym: 'Kuntosali',
    stadium: 'Stadion',
    police: 'Poliisi',
    bank: 'Pankki',
    atm: 'Otto-automaatti',
    post_office: 'Posti',
    shopping_mall: 'Ostoskeskus',
    hardware_store: 'Rautakauppa',
    home_goods_store: 'Sisustuskauppa',
    library: 'Kirjasto',
    church: 'Kirkko',
    mosque: 'Moskeija',
    synagogue: 'Synagoga',
    zoo: 'Eläintarha',
    aquarium: 'Akvaario',
    night_club: 'Yökerho',
    movie_theater: 'Elokuvateatteri',
    lodging: 'Majoitus',
    hotel: 'Hotelli',
    hostel: 'Hostelli',
    spa: 'Kylpylä',
    tourist_attraction: 'Nähtävyys',
  };

  const tLabel = (types?: string[]) => {
    if (!types || types.length === 0) return undefined;
    for (const t of types) {
      if (TYPE_LABEL_FI[t]) return TYPE_LABEL_FI[t];
    }
    return types[0];
  };

  useEffect(() => {
    let aborted = false;
    const lat = center?.lat;
    const lng = center?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setPois([]);
      return;
    }
    const key = `${lat.toFixed(6)}|${lng.toFixed(6)}|${radius}`;
    if (lastKeyRef.current === key) {
      return;
    }
    lastKeyRef.current = key;
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const run = async () => {
      setLoading(true);
      try {
        const resp = await fetch(PLACES_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ center: { lat, lng }, radius }),
          signal: ctrl.signal,
        });
        if (!resp.ok) {
          setPois([]);
          return;
        }
        const data: any = await resp.json().catch(() => ({}));
        const list: any[] = Array.isArray(data?.places) ? data.places : [];
        const mapped: PoiItem[] = list.map((p: any) => ({
          place_id: p?.id || p?.name || '',
          name: p?.displayName?.text || p?.displayName || '',
          types: Array.isArray(p?.types) && p.types.length ? p.types : (p?.primaryType ? [p.primaryType] : undefined),
          location: (p?.location && typeof p.location.latitude === 'number' && typeof p.location.longitude === 'number')
            ? { lat: p.location.latitude, lng: p.location.longitude }
            : undefined,
        })).filter((p: PoiItem) => p.place_id);
        if (!aborted) setPois(mapped);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (!aborted) setPois([]);
      } finally {
        if (!aborted) setLoading(false);
        if (abortRef.current === ctrl) {
          abortRef.current = null;
        }
      }
    };
    run();
    return () => { aborted = true; };
  }, [center?.lat, center?.lng, radius]);

  const selectedList = useMemo(() => pois.filter((p) => selectedIds.has(p.place_id)), [pois, selectedIds]);

  useEffect(() => {
    onChange?.(selectedList);
  }, [onChange, selectedList]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div ref={containerRef} style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden />
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '16px 0 8px' }}>Lähellä olevat kohteet (POI)</h2>
      {!center ? (
        <div style={{ color: '#666' }}>Valitse sijainti kartalta nähdäksesi lähellä olevat kohteet.</div>
      ) : loading ? (
        <div style={{ color: '#666' }}>Ladataan lähellä olevia kohteita…</div>
      ) : pois.length === 0 ? (
        <div style={{ color: '#666' }}>Ei tuloksia tältä alueelta.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
          {pois.map((p) => (
            <label key={p.place_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={selectedIds.has(p.place_id)}
                onChange={() => toggle(p.place_id)}
              />
              <span style={{ fontWeight: 600 }}>{p.name || '—'}</span>
              {p.types?.length ? (
                <span style={{ color: '#666' }}>({tLabel(p.types)})</span>
              ) : null}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
