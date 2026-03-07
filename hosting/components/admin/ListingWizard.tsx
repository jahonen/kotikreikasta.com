'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDbClient } from '../../lib/firebase-client';
import { slugify } from '../../lib/utils/slugify';
import MapPicker from './MapPicker';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (id: string) => void;
};

const STEPS = [
  'Perustiedot',
  'Sijainti ja palvelut',
  'Kuvaus',
  'Media',
  'Lisätiedot ja UKK',
];

export default function ListingWizard({ open, onClose, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [island, setIsland] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [floorArea, setFloorArea] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [pricePerSqm, setPricePerSqm] = useState('');
  const [transferTax, setTransferTax] = useState('');
  const [enfia, setEnfia] = useState('');
  const [maintenance, setMaintenance] = useState('');

  const [locationNotes, setLocationNotes] = useState('');

  const [style, setStyle] = useState('');
  const [amenities, setAmenities] = useState('');
  const [outdoor, setOutdoor] = useState('');
  const [views, setViews] = useState('');
  const [energy, setEnergy] = useState('');
  const [description, setDescription] = useState('');

  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState('');
  const [streetViewUrl, setStreetViewUrl] = useState('');

  const [rentalPotential, setRentalPotential] = useState('');
  const [goldenVisaEligible, setGoldenVisaEligible] = useState(false);
  const [fiAgent, setFiAgent] = useState('');
  const [localAgent, setLocalAgent] = useState('');
  const [faq, setFaq] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(0);
      setSaving(false);
      setError(null);
    }
  }, [open]);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(name && type && price);
    return true;
  }, [step, name, type, price]);

  if (!open) return null;

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const db = await getDbClient();
      if (!db) throw new Error('Palvelu ei ole käytettävissä.');
      const stubBase = slugify(name || 'kohde');
      const media = galleryUrls
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({ url }));
      const payload: any = {
        title: name,
        type,
        location: {
          area: area || undefined,
          city: city || undefined,
          island: island || undefined,
          postalCode: postalCode || undefined,
          coordinates: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : undefined,
        },
        size: floorArea ? Number(floorArea) : undefined,
        lotSize: lotSize ? Number(lotSize) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
        condition: condition || undefined,
        price: price ? Number(price) : undefined,
        pricePerSqm: pricePerSqm ? Number(pricePerSqm) : undefined,
        taxes: {
          transferTax: transferTax ? Number(transferTax) : undefined,
          enfia: enfia ? Number(enfia) : undefined,
          maintenance: maintenance ? Number(maintenance) : undefined,
        },
        locationNotes: locationNotes || undefined,
        attributes: {
          style: style || undefined,
          amenities: amenities || undefined,
          outdoor: outdoor || undefined,
          views: views || undefined,
          energy: energy || undefined,
        },
        description: description || undefined,
        media: {
          featured: featuredImageUrl ? { url: featuredImageUrl } : undefined,
          gallery: media.length ? media : undefined,
          streetViewUrl: streetViewUrl || undefined,
        },
        extras: {
          rentalPotential: rentalPotential || undefined,
          goldenVisaEligible: goldenVisaEligible || undefined,
          fiAgent: fiAgent || undefined,
          localAgent: localAgent || undefined,
          faq: faq || undefined,
        },
        urlStub: stubBase,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'listings'), payload);
      if (onSaved) onSaved(ref.id);
      onClose();
    } catch (e: any) {
      setError('Tallennus epäonnistui. Tarkista käyttöoikeudet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--background, #fff)', color: 'var(--text, #111)', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>Uusi kiinteistökohde</h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{STEPS[step]} — {step + 1}/{STEPS.length}</div>
          </div>
          <button className="btn-primary" onClick={onClose}>Sulje</button>
        </div>

        <div style={{ padding: '1rem 1.25rem', maxWidth: 900, margin: '0 auto' }}>
          {step === 0 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <input className="input" placeholder="Kiinteistön nimi" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input" placeholder="Kiinteistötyyppi (asunto, huvila, rivitalo, tontti)" value={type} onChange={(e) => setType(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input className="input" placeholder="Alue" value={area} onChange={(e) => setArea(e.target.value)} />
                <input className="input" placeholder="Kaupunki" value={city} onChange={(e) => setCity(e.target.value)} />
                <input className="input" placeholder="Saari" value={island} onChange={(e) => setIsland(e.target.value)} />
                <input className="input" placeholder="Postinumero" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                <input className="input" placeholder="Leveysaste (lat)" value={lat} onChange={(e) => setLat(e.target.value)} />
                <input className="input" placeholder="Pituusaste (lng)" value={lng} onChange={(e) => setLng(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input className="input" placeholder="Koko (m²)" value={floorArea} onChange={(e) => setFloorArea(e.target.value)} />
                <input className="input" placeholder="Tontin koko (m²)" value={lotSize} onChange={(e) => setLotSize(e.target.value)} />
                <input className="input" placeholder="Makuuhuoneet" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
                <input className="input" placeholder="Kylpyhuoneet" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
                <input className="input" placeholder="Rakennusvuosi" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
                <input className="input" placeholder="Kunto (uusi, remontoitu, alkuperäinen)" value={condition} onChange={(e) => setCondition(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input className="input" placeholder="Hinta (€)" value={price} onChange={(e) => setPrice(e.target.value)} />
                <input className="input" placeholder="Hinta / m² (€)" value={pricePerSqm} onChange={(e) => setPricePerSqm(e.target.value)} />
                <input className="input" placeholder="Siirtovero (€)" value={transferTax} onChange={(e) => setTransferTax(e.target.value)} />
                <input className="input" placeholder="ENFIA (€/v)" value={enfia} onChange={(e) => setEnfia(e.target.value)} />
                <input className="input" placeholder="Ylläpitokulut (€/kk)" value={maintenance} onChange={(e) => setMaintenance(e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <textarea className="input" rows={6} placeholder="Sijainnin ja palveluiden lisätiedot (haetaan myöhemmin Google API:sta)" value={locationNotes} onChange={(e) => setLocationNotes(e.target.value)} />
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Valitse sijainti kartalta</label>
                <MapPicker
                  lat={lat ? Number(lat) : undefined}
                  lng={lng ? Number(lng) : undefined}
                  onChange={({ lat: plat, lng: plng }) => {
                    setLat(String(plat));
                    setLng(String(plng));
                  }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 8 }}>
                  <input className="input" placeholder="Leveysaste (lat)" value={lat} onChange={(e) => setLat(e.target.value)} />
                  <input className="input" placeholder="Pituusaste (lng)" value={lng} onChange={(e) => setLng(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <input className="input" placeholder="Rakennuksen tyyli" value={style} onChange={(e) => setStyle(e.target.value)} />
              <input className="input" placeholder="Varustelu (pilkulla erotettuna)" value={amenities} onChange={(e) => setAmenities(e.target.value)} />
              <input className="input" placeholder="Ulkotilat (pilkulla erotettuna)" value={outdoor} onChange={(e) => setOutdoor(e.target.value)} />
              <input className="input" placeholder="Näkymät" value={views} onChange={(e) => setViews(e.target.value)} />
              <input className="input" placeholder="Energiatehokkuus / aurinkopaneelit" value={energy} onChange={(e) => setEnergy(e.target.value)} />
              <textarea className="input" rows={8} placeholder="Kuvaus" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <input className="input" placeholder="Nostokuvan URL" value={featuredImageUrl} onChange={(e) => setFeaturedImageUrl(e.target.value)} />
              <input className="input" placeholder="Gallerian kuvat (URL, pilkulla erotettuna)" value={galleryUrls} onChange={(e) => setGalleryUrls(e.target.value)} />
              <input className="input" placeholder="Street View -linkki (valinnainen)" value={streetViewUrl} onChange={(e) => setStreetViewUrl(e.target.value)} />
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <input className="input" placeholder="Vuokrausmahdollisuudet" value={rentalPotential} onChange={(e) => setRentalPotential(e.target.value)} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={goldenVisaEligible} onChange={(e) => setGoldenVisaEligible(e.target.checked)} />
                Golden Visa -kelpoinen
              </label>
              <input className="input" placeholder="Suomenkielinen myyntiedustaja" value={fiAgent} onChange={(e) => setFiAgent(e.target.value)} />
              <input className="input" placeholder="Paikallinen asiamies" value={localAgent} onChange={(e) => setLocalAgent(e.target.value)} />
              <textarea className="input" rows={6} placeholder="UKK (yksi kysymys/vastaus per rivi)" value={faq} onChange={(e) => setFaq(e.target.value)} />
            </div>
          )}

          {error && <div style={{ color: '#b00020', marginTop: '1rem' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button className="btn-primary" onClick={onClose} type="button">Peruuta</button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} type="button">Edellinen</button>
              {step < STEPS.length - 1 ? (
                <button className="btn-primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canNext} type="button">Seuraava</button>
              ) : (
                <button className="btn-primary" onClick={onSave} disabled={saving || !canNext} type="button">{saving ? 'Tallennetaan…' : 'Tallenna luonnos'}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
