'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { getDbClient } from '../../lib/firebase-client';
import { slugify } from '../../lib/utils/slugify';
import MapPicker from './MapPicker';
import PointsOfInterestPicker, { type PoiItem } from './PointsOfInterestPicker';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (id: string) => void;
};

const STEPS = [
  'Perustiedot',
  'Sijainti',
  'Lähellä olevat palvelut',
  'Varustelu & Kuvaus',
  'Media',
  'Myynti & Kumppanit',
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
  const [formattedAddress, setFormattedAddress] = useState('');
  // Canonical Google Maps fields for location (used for Firestore storage & display)
  const [streetAddress, setStreetAddress] = useState('');
  const [routeOnly, setRouteOnly] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [locality, setLocality] = useState('');
  const [admin1, setAdmin1] = useState('');
  const [admin2, setAdmin2] = useState('');
  const [admin3, setAdmin3] = useState('');
  const [admin4, setAdmin4] = useState('');
  const [country, setCountry] = useState('');
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
  

  const [locationNotes, setLocationNotes] = useState('');
  const [pois, setPois] = useState<PoiItem[]>([]);

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

  // Varustelu (checkbox-ryhmät) ja lämmitys (dropdown)
  const AMENITY_OPTIONS = ['Parveke', 'Puutarha', 'Uima-allas', 'Takka', 'Pysäköinti', 'Hissi', 'Varasto', 'Kellari', 'Merinäköala', 'Vuoristonäköala'];
  const APPLIANCE_OPTIONS = ['Jääkaappi', 'Pakastin', 'Uuni', 'Mikroaaltouuni', 'Astianpesukone', 'Pyykinpesukone', 'Kuivausrumpu', 'Ilmalämpöpumppu'];
  const HEATING_OPTIONS = ['Öljylämmitys', 'Keskuslämmitys', 'Vain ilmalämpöpumppu', 'Ei lämmitystä'];
  const [amenitiesSelected, setAmenitiesSelected] = useState<string[]>([]);
  const [appliancesSelected, setAppliancesSelected] = useState<string[]>([]);
  const [heating, setHeating] = useState<string>('');

  // Myyntiedustaja & kumppanit
  const [adminOptions, setAdminOptions] = useState<{ uid: string; label: string }[]>([]);
  const [selectedAdminUid, setSelectedAdminUid] = useState<string>('');
  const [partnerOptions] = useState<{ id: string; label: string }[]>([{ id: '', label: '— Valitse kumppani (tulossa) —' }]);
  const [selectedPartner, setSelectedPartner] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setStep(0);
      setSaving(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    const parseNum = (s: string) => {
      if (!s) return NaN;
      const cleaned = s.replace(/[^0-9,\.\-]/g, '').replace(/,/g, '.');
      return Number(cleaned);
    };
    const p = parseNum(price);
    const a = parseNum(floorArea);
    if (isFinite(p) && p > 0 && isFinite(a) && a > 0) {
      const v = Math.round(p / a);
      if (!Number.isNaN(v) && Number.isFinite(v)) setPricePerSqm(String(v));
    } else {
      setPricePerSqm('');
    }
  }, [price, floorArea]);

  // Lataa admin-käyttäjien UID-lista rooleista (role == 'admin') sivun avautuessa
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const db = await getDbClient();
        if (!db) return;
        const rolesColl = collection(db, 'roles');
        const qy = query(rolesColl, where('role', '==', 'admin'));
        const snap = await getDocs(qy);
        if (!active) return;
        const opts = snap.docs.map((d) => ({ uid: d.id, label: d.id }));
        setAdminOptions(opts);
      } catch {
        // ignore
      }
    })();
    return () => { active = false; };
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
          formatted_address: formattedAddress || undefined,
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
        locationNotes: locationNotes || undefined,
        nearbyPois: pois && pois.length ? pois : undefined,
        attributes: {
          style: style || undefined,
          amenities: amenities || undefined,
          amenitiesList: amenitiesSelected && amenitiesSelected.length ? amenitiesSelected : undefined,
          appliancesList: appliancesSelected && appliancesSelected.length ? appliancesSelected : undefined,
          heating: heating || undefined,
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
          fiAgentUid: selectedAdminUid || undefined,
          partnerId: selectedPartner || undefined,
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
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>*-merkityt kentät ovat pakollisia</div>
              <input className="input" placeholder="Kiinteistön nimi *" value={name} onChange={(e) => setName(e.target.value)} />
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Kiinteistötyyppi *</option>
                <option value="Kerrostalo">Kerrostalo</option>
                <option value="Rivitalo">Rivitalo</option>
                <option value="Paritalo">Paritalo</option>
                <option value="Omakotitalo">Omakotitalo</option>
                <option value="Huvila / vapaa-ajan asunto">Huvila / vapaa-ajan asunto</option>
                <option value="Tontti">Tontti</option>
                <option value="Erillistalo">Erillistalo</option>
                <option value="Ateljee / studio">Ateljee / studio</option>
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input className="input" placeholder="Koko (m²)" value={floorArea} onChange={(e) => setFloorArea(e.target.value)} />
                <input className="input" placeholder="Tontin koko (m²)" value={lotSize} onChange={(e) => setLotSize(e.target.value)} />
                <select className="input" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
                  <option value="">Makuuhuoneet (0–10)</option>
                  {Array.from({ length: 11 }).map((_, i) => (
                    <option key={i} value={String(i)}>{i}</option>
                  ))}
                </select>
                <select className="input" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)}>
                  <option value="">Kylpyhuoneet (0–10)</option>
                  {Array.from({ length: 11 }).map((_, i) => (
                    <option key={i} value={String(i)}>{i}</option>
                  ))}
                </select>
                <input className="input" placeholder="Rakennusvuosi" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
                <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option value="">Kunto</option>
                  <option value="Uusi">Uusi</option>
                  <option value="Erinomainen">Erinomainen</option>
                  <option value="Hyvä">Hyvä</option>
                  <option value="Tyydyttävä">Tyydyttävä</option>
                  <option value="Välttävä">Välttävä</option>
                  <option value="Huono">Huono</option>
                  <option value="Remontoitava / peruskorjattava">Remontoitava / peruskorjattava</option>
                  <option value="Peruskorjattu">Peruskorjattu</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input className="input" placeholder="Hinta (€) *" value={price} onChange={(e) => setPrice(e.target.value)} />
                <input className="input" placeholder="Hinta / m² (€) (automaattinen)" value={pricePerSqm} readOnly />
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
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
                      const norm = (s?: string) => (s || '').trim().toLowerCase();

                      const streetAddr = pick('street_address');
                      const routeC = pick('route');
                      const streetNo = pick('street_number', 'streetNumber');
                      const pc = pick('postal_code', 'postalCode');
                      const loc = pick('locality', 'postal_town', 'postalTown');
                      const adm1C = pick('administrative_area_level_1', 'administrativeAreaLevel1');
                      const adm2C = pick('administrative_area_level_2', 'administrativeAreaLevel2');
                      const adm3C = pick('administrative_area_level_3', 'administrativeAreaLevel3');
                      const adm4C = pick('administrative_area_level_4', 'administrativeAreaLevel4');
                      const subloc = pick('sublocality_level_1', 'sublocalityLevel1', 'sublocality');
                      const isl = pick('island', 'archipelago');
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

                      // Back-compat: keep broad area/city/island filled for now
                      const municipality = text(adm3C) || text(loc);
                      if (municipality) setCity(municipality);
                      const regionCandidates = [text(adm1C), text(adm2C), text(isl), text(adm4C), text(subloc)];
                      const region = regionCandidates.find((v) => v && norm(v) !== norm(municipality)) || '';
                      if (region) setArea(region);
                      if (isl) setIsland(text(isl));
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
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Lähellä olevat palvelut (POI)</label>
                <PointsOfInterestPicker
                  center={lat && lng ? { lat: Number(lat), lng: Number(lng) } : null}
                  onChange={(list) => setPois(list)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <input className="input" placeholder="Rakennuksen tyyli" value={style} onChange={(e) => setStyle(e.target.value)} />
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Varustelu</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Ominaisuudet</div>
                    {AMENITY_OPTIONS.map((opt) => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={amenitiesSelected.includes(opt)}
                          onChange={(e) =>
                            setAmenitiesSelected((prev) => e.target.checked ? [...prev, opt] : prev.filter((x) => x !== opt))
                          }
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Kodinkoneet</div>
                    {APPLIANCE_OPTIONS.map((opt) => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={appliancesSelected.includes(opt)}
                          onChange={(e) =>
                            setAppliancesSelected((prev) => e.target.checked ? [...prev, opt] : prev.filter((x) => x !== opt))
                          }
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input className="input" placeholder="Ulkotilat (teksti)" value={outdoor} onChange={(e) => setOutdoor(e.target.value)} />
                <input className="input" placeholder="Näkymät (teksti)" value={views} onChange={(e) => setViews(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select className="input" value={heating} onChange={(e) => setHeating(e.target.value)}>
                  <option value="">Lämmitys</option>
                  {HEATING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <input className="input" placeholder="Energiatehokkuus / aurinkopaneelit" value={energy} onChange={(e) => setEnergy(e.target.value)} />
              </div>
              <textarea className="input" rows={8} placeholder="Kuvaus" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <input className="input" placeholder="Nostokuvan URL" value={featuredImageUrl} onChange={(e) => setFeaturedImageUrl(e.target.value)} />
              <input className="input" placeholder="Gallerian kuvat (URL, pilkulla erotettuna)" value={galleryUrls} onChange={(e) => setGalleryUrls(e.target.value)} />
              <input className="input" placeholder="Street View -linkki (valinnainen)" value={streetViewUrl} onChange={(e) => setStreetViewUrl(e.target.value)} />
            </div>
          )}

          {step === 5 && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <input className="input" placeholder="Vuokrausmahdollisuudet" value={rentalPotential} onChange={(e) => setRentalPotential(e.target.value)} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={goldenVisaEligible} onChange={(e) => setGoldenVisaEligible(e.target.checked)} />
                Golden Visa -kelpoinen
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select className="input" value={selectedAdminUid} onChange={(e) => setSelectedAdminUid(e.target.value)}>
                  <option value="">Myyntiedustaja (admin-käyttäjä)</option>
                  {adminOptions.map((o) => (
                    <option key={o.uid} value={o.uid}>{o.label}</option>
                  ))}
                </select>
                <select className="input" value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)}>
                  <option value="">Kumppani</option>
                  {partnerOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
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
