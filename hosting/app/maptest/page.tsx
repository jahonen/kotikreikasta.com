'use client';

import React, { useMemo, useState } from 'react';
import PointsOfInterestPicker, { type PoiItem } from '../../components/admin/PointsOfInterestPicker';
import MapPicker from '../../components/admin/MapPicker';

type AddressComponent = { types: string[]; longText?: string; shortText?: string };

type LocationState = {
  lat: number;
  lng: number;
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  geocodeResults?: any[];
};

function toSnakeCaseType(t: string): string {
  if (!t) return t;
  if (t.includes('_')) return t.toLowerCase();
  return t.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}
function normalizeStr(s?: string): string {
  return (s || '').trim().toLowerCase();
}
function toCamelCaseType(t: string): string {
  if (!t) return t;
  if (!t.includes('_')) return t;
  return t.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function hasType(c: AddressComponent, type: string): boolean {
  const wantSnake = toSnakeCaseType(type);
  const wantCamel = toCamelCaseType(type);
  return !!c?.types?.some((t) => t === type || t === wantSnake || t === wantCamel);
}
function pick(ac: AddressComponent[] | undefined, type: string): string | undefined {
  const item = ac?.find((c) => hasType(c, type));
  return item?.longText || item?.shortText || undefined;
}
function pickAny(ac: AddressComponent[] | undefined, types: string[]): string | undefined {
  for (const t of types) {
    const v = pick(ac, t);
    if (v) return v;
  }
  return undefined;
}

function formatCoords(lat?: number, lng?: number): string {
  if (typeof lat !== 'number' || typeof lng !== 'number') return '';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export default function Page() {
  const [loc, setLoc] = useState<LocationState | null>(null);
  const [pois, setPois] = useState<PoiItem[]>([]);

  const details = useMemo(() => {
    const ac = loc?.addressComponents;
    const route = pickAny(ac, ['route', 'street_address']);
    const streetNumber = pickAny(ac, ['street_number', 'streetNumber']);
    const postalCode = pickAny(ac, ['postal_code', 'postalCode']);
    const municipality = pickAny(ac, [
      'administrative_area_level_3',
      'administrativeAreaLevel3',
      'locality',
      'postal_town',
      'postalTown',
    ]);
    const localityRaw = pickAny(ac, ['locality', 'postal_town', 'postalTown']);
    const admin2 = pickAny(ac, ['administrative_area_level_2', 'administrativeAreaLevel2']);
    const admin1 = pickAny(ac, ['administrative_area_level_1', 'administrativeAreaLevel1']);
    const admin4 = pickAny(ac, ['administrative_area_level_4', 'administrativeAreaLevel4']);
    const sublocal = pickAny(ac, ['sublocality_level_1', 'sublocalityLevel1', 'sublocality']);
    const island = pickAny(ac, ['island', 'archipelago']);
    // Etusijalla maakunta (admin1), sitten alue/yksikkö (admin2), saari/admin4, ja vasta
    // jos mitään ei löydy, locality/sublocality. Vältä duplikaatti kunta == alue.
    const regionCandidates = [admin1, admin2, island, admin4, localityRaw, sublocal];
    const region = regionCandidates.find((val) => val && normalizeStr(val) !== normalizeStr(municipality));
    const country = pickAny(ac, ['country']);
    const kyla = admin4 || sublocal;

    const streetAddressDirect = pickAny(ac, ['street_address']);
    const katuosoite = (streetAddressDirect || [route, streetNumber].filter(Boolean).join(' ')).trim();

    return {
      coords: formatCoords(loc?.lat, loc?.lng),
      katuosoite: katuosoite || undefined,
      postinumero: postalCode,
      kunta: municipality,
      alue: region,
      kyla,
      maa: country,
      kokoOsoite: loc?.formattedAddress,
      admin1Only: admin1,
      admin2Only: admin2,
      admin3Only: pickAny(ac, ['administrative_area_level_3', 'administrativeAreaLevel3']),
      admin4Only: admin4,
      routeOnly: route,
      streetNumberOnly: streetNumber,
      postalCodeOnly: postalCode,
      countryOnly: country,
      localityOnly: localityRaw,
    };
  }, [loc]);

  return (
    <main style={{ maxWidth: 960, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Karttakomponentin testi</h1>
      <p style={{ marginBottom: 16 }}>
        Valitse sijainti kartalta tai haun avulla. Alla näytetään kaikki saatavilla olevat osoitetiedot suomeksi.
      </p>

      <MapPicker onChange={(v) => setLoc(v)} />

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Selkokielinen näyttö</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 16 }}>
          <div style={{ fontWeight: 600 }} title="Οδός + Αριθμός">Katuosoite</div>
          <div>{details.katuosoite || '—'}</div>

          <div style={{ fontWeight: 600 }} title="Τοπική Κοινότητα">Kylä/Lähiö</div>
          <div>{details.localityOnly || '—'}</div>

          <div style={{ fontWeight: 600 }} title="Δήμος">Kunta</div>
          <div>{details.kunta || '—'}</div>

          <div style={{ fontWeight: 600 }} title="Περιφέρεια">Lääni</div>
          <div>{details.alue || '—'}</div>

          <div style={{ fontWeight: 600 }} title="Ταχυδρομικός Κώδικας">Postinumero</div>
          <div>{details.postinumero || '—'}</div>

          <div style={{ fontWeight: 600 }} title="Χώρα">Maa</div>
          <div>{details.maa || '—'}</div>
        </div>

        <div style={{ marginTop: 8 }}>
          <PointsOfInterestPicker
            center={loc ? { lat: loc.lat, lng: loc.lng } : null}
            onChange={setPois}
          />
          {pois.length > 0 ? (
            <div style={{ marginTop: 8, color: '#555' }}>Valittuja kohteita: {pois.length}</div>
          ) : null}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Geokoodauksen koko vastaus</h2>
        <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, background: '#fafafa' }}>
          {loc?.geocodeResults ? (
            <pre style={{ margin: 0, maxHeight: 360, overflow: 'auto' }}>{JSON.stringify(loc.geocodeResults, null, 2)}</pre>
          ) : (
            <div style={{ color: '#666' }}>— Ei vielä dataa —</div>
          )}
        </div>
      </section>
    </main>
  );
}
