'use client';

import { FormEvent, useState } from 'react';
import { addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { getAuthClient, getDbClient } from '../../lib/firebase-client';
import { slugify } from '../../lib/utils/slugify';
import MapPicker from './MapPicker';
import LoadingButton from '../ui/LoadingButton';

export default function ListingsEditor() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Sijainti (Google Maps -kentät)
  const [formattedAddress, setFormattedAddress] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [routeOnly, setRouteOnly] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [locality, setLocality] = useState(''); // Paikka
  const [admin1, setAdmin1] = useState(''); // Alue (admin1)
  const [admin2, setAdmin2] = useState(''); // Seutu (admin2)
  const [admin3, setAdmin3] = useState(''); // Kunta (admin3)
  const [admin4, setAdmin4] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!title.trim() || !description.trim()) {
      setMessage('Täytä otsikko ja kuvaus.');
      return;
    }

    const db = await getDbClient();
    if (!db) {
      setMessage('Palvelu ei ole saatavilla juuri nyt. Yritä myöhemmin.');
      return;
    }

    setSaving(true);
    try {
      let baseStub = slugify(title).slice(0, 80);
      if (!baseStub) baseStub = 'kohde';
      let finalStub = baseStub;

      const coll = collection(db, 'listings');
      // Check for urlStub collision
      const q = query(coll, where('urlStub', '==', finalStub));
      const existing = await getDocs(q);
      if (!existing.empty) {
        finalStub = `${baseStub}-2`;
      }

      const auth = await getAuthClient();
      const createdBy = auth?.currentUser?.uid || null;
      const docRef = await addDoc(coll, {
        title: title.trim(),
        description: description.trim(),
        price: price ? Number(price) : undefined,
        location: {
          street_address: streetAddress || undefined,
          route: routeOnly || undefined,
          street_number: streetNumber || undefined,
          locality: locality || undefined,
          administrative_area_level_3: admin3 || undefined,
          administrative_area_level_2: admin2 || undefined,
          administrative_area_level_1: admin1 || undefined,
          administrative_area_level_4: admin4 || undefined,
          postal_code: postalCode || undefined,
          country: country || undefined,
          formatted_address: formattedAddress || (address || undefined),
          coordinates: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : undefined,
        },
        urlStub: finalStub,
        status: 'draft',
        createdBy: createdBy || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Fire production Novu event (best-effort, non-blocking)
      try {
        const token = await auth?.currentUser?.getIdToken?.(true);
        await fetch('/api/novu/events/listing-created', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'x-firebase-auth': token } : {}),
          },
          body: JSON.stringify({
            listingId: docRef.id,
            title: title.trim(),
          }),
          credentials: 'include',
        });
      } catch {}

      setMessage('Tallennettu luonnoksena.');
      setTitle('');
      setDescription('');
      setPrice('');
      setAddress('');
    } catch (err: any) {
      setMessage('Tallennus epäonnistui. Varmista käyttöoikeudet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="listings" style={{ marginTop: '2rem' }}>
      <h3 className="section-title" style={{ fontSize: '1.2rem' }}>Uusi kohdelistaus</h3>
      <form onSubmit={onSubmit} className="form-column" style={{ display: 'grid', gap: '0.75rem', maxWidth: 720 }}>
        <input className="input" placeholder="Otsikko" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" placeholder="Kuvaus" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input className="input" placeholder="Hinta (€)" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          <input className="input" placeholder="Osoite (valinnainen)" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Valitse sijainti kartalta</label>
          <MapPicker
            lat={lat ? Number(lat) : undefined}
            lng={lng ? Number(lng) : undefined}
            onChange={({ lat: plat, lng: plng, formattedAddress: fa, addressComponents }) => {
              setLat(String(plat));
              setLng(String(plng));
              if (fa) setFormattedAddress(fa);
              if (addressComponents && addressComponents.length) {
                const toSnakeCaseType = (t: string) => (!t ? t : t.includes('_') ? t.toLowerCase() : t.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''));
                const toCamelCaseType = (t: string) => (!t ? t : !t.includes('_') ? t : t.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase()));
                const hasType = (c: any, type: string) => {
                  const wantSnake = toSnakeCaseType(type);
                  const wantCamel = toCamelCaseType(type);
                  return Array.isArray(c?.types) && c.types.some((tt: string) => tt === type || tt === wantSnake || tt === wantCamel);
                };
                const pick = (...types: string[]) => addressComponents.find((c: any) => types.some((t) => hasType(c, t))) as any;
                const text = (comp: any) => (comp?.longText || comp?.shortText || '').trim();

                const streetAddr = pick('street_address');
                const routeC = pick('route');
                const streetNo = pick('street_number', 'streetNumber');
                const pc = pick('postal_code', 'postalCode');
                const loc = pick('locality', 'postal_town', 'postalTown');
                const adm1C = pick('administrative_area_level_1', 'administrativeAreaLevel1');
                const adm2C = pick('administrative_area_level_2', 'administrativeAreaLevel2');
                const adm3C = pick('administrative_area_level_3', 'administrativeAreaLevel3');
                const adm4C = pick('administrative_area_level_4', 'administrativeAreaLevel4');
                const countryC = pick('country');

                const katuosoite = (text(streetAddr) || [text(routeC), text(streetNo)].filter(Boolean).join(' ')).trim();
                setStreetAddress(katuosoite);
                setRouteOnly(text(routeC));
                setStreetNumber(text(streetNo));
                if (pc) setPostalCode(text(pc));
                setLocality(text(loc));
                setAdmin1(text(adm1C));
                setAdmin2(text(adm2C));
                setAdmin3(text(adm3C));
                setAdmin4(text(adm4C));
                setCountry(text(countryC));
              }
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: 8 }}>
            <input className="input" placeholder="Katuosoite" value={streetAddress} readOnly />
            <input className="input" placeholder="Paikka" title="Τοπική Κοινότητα" value={locality} readOnly />
            <input className="input" placeholder="Kunta" title="Δήμος" value={admin3} readOnly />
            <input className="input" placeholder="Seutu" title="Περιφερειακή Ενότητα" value={admin2} readOnly />
            <input className="input" placeholder="Alue" title="Περιφέρεια" value={admin1} readOnly />
            <input className="input" placeholder="Postinumero" value={postalCode} readOnly />
            <input className="input" placeholder="Maa" value={country} readOnly />
            <input className="input" placeholder="Koko osoite (formatted)" value={formattedAddress} readOnly />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input className="input" placeholder="Leveysaste (lat)" value={lat} readOnly />
              <input className="input" placeholder="Pituusaste (lng)" value={lng} readOnly />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <LoadingButton className="btn-primary" loading={saving} type="submit">Tallenna luonnos</LoadingButton>
        </div>
        {message && <div style={{ marginTop: '0.25rem' }}>{message}</div>}
      </form>
    </section>
  );
}
