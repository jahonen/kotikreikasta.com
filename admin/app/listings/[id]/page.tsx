'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getDbClient } from '../../../lib/firebase-client';
import ListingMediaEditor from '../../../components/admin/ListingMediaEditor';

type Tab = 'perustiedot' | 'media' | 'julkaisu';

interface ListingMedia {
  featured?: { url: string; alt?: string; crops?: any };
  gallery?: any[];
  videos?: any[];
  streetViewUrl?: string;
}

interface ListingData {
  id: string;
  title: string;
  type: string;
  price: number;
  pricePerSqm: number;
  size: number;
  lotSize?: number;
  yearBuilt?: number;
  bedrooms: number;
  bathrooms: number;
  condition: string;
  description: string;
  amenitiesList: string[];
  appliancesList: string[];
  heating: string;
  locality: string;
  status: string;
  urlStub: string;
  media: ListingMedia;
  seoTitle: string;
  seoDescription: string;
  rentalPotential: string;
  goldenVisaEligible: boolean;
  fiAgentUid: string;
  partnerId: string;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Luonnos' },
  { value: 'published', label: 'Julkaistu' },
  { value: 'sold', label: 'Myyty' },
  { value: 'archived', label: 'Arkistoitu' },
];

const AMENITY_OPTIONS = ['Parveke', 'Puutarha', 'Uima-allas', 'Takka', 'Pysäköinti', 'Hissi', 'Varasto', 'Kellari', 'Merinäköala', 'Vuoristonäköala'];
const APPLIANCE_OPTIONS = ['Jääkaappi', 'Pakastin', 'Uuni', 'Mikroaaltouuni', 'Astianpesukone', 'Pyykinpesukone', 'Kuivausrumpu', 'Ilmalämpöpumppu'];

export default function ListingEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [tab, setTab] = useState<Tab>('perustiedot');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ListingData | null>(null);
  const [adminOptions, setAdminOptions] = useState<{ uid: string; label: string }[]>([]);
  const [partnerOptions, setPartnerOptions] = useState<{ id: string; label: string }[]>([{ id: '', label: '— Valitse kumppani —' }]);

  const load = useCallback(async () => {
    if (!id) return;
    const db = await getDbClient();
    if (!db) { setLoading(false); return; }
    const snap = await getDoc(doc(db, 'listings', id));
    if (!snap.exists()) { setLoading(false); return; }
    const d: any = snap.data() || {};
    setData({
      id: snap.id,
      title: d.title || '',
      type: d.type || '',
      price: d.price || 0,
      pricePerSqm: d.pricePerSqm || 0,
      size: d.size || 0,
      lotSize: d.lotSize,
      yearBuilt: d.yearBuilt,
      bedrooms: d.attributes?.bedrooms || d.bedrooms || 0,
      bathrooms: d.attributes?.bathrooms || d.bathrooms || 0,
      condition: d.attributes?.condition || d.condition || '',
      heating: d.attributes?.heating || d.heating || '',
      amenitiesList: d.attributes?.amenitiesList || [],
      appliancesList: d.attributes?.appliancesList || [],
      description: d.description || '',
      locality: d.location?.locality || '',
      status: d.status || 'draft',
      urlStub: d.urlStub || '',
      media: d.media || {},
      seoTitle: d.seo?.metaTitle || '',
      seoDescription: d.seo?.metaDescription || '',
      rentalPotential: d.extras?.rentalPotential || '',
      goldenVisaEligible: d.extras?.goldenVisaEligible || false,
      fiAgentUid: d.extras?.fiAgentUid || '',
      partnerId: d.extras?.partnerId || '',
    });
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const db = await getDbClient();
        if (!db) return;
        // Fetch admin users from users collection
        const usersColl = collection(db, 'users');
        const snap = await getDocs(query(usersColl, orderBy('displayName')));
        if (!active) return;
        const opts = snap.docs.map((d) => {
          const data = d.data();
          const email = data?.email || '';
          const name = data?.displayName || data?.name || '';
          const label = name && email ? `${name} (${email})` : name || email || d.id;
          return { uid: d.id, label };
        });
        setAdminOptions(opts);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const db = await getDbClient();
        if (!db) return;
        // Fetch partners from organizations collection
        const orgsColl = collection(db, 'organizations');
        const snap = await getDocs(orgsColl);
        if (!active) return;
        const opts = snap.docs.map((d) => {
          const data = d.data();
          const name = data?.displayName || data?.legalName || d.id;
          return { id: d.id, label: name };
        }).sort((a, b) => a.label.localeCompare(b.label, 'fi'));
        setPartnerOptions([{ id: '', label: '— Valitse kumppani —' }, ...opts]);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  async function save() {
    if (!data || !id) return;
    setSaving(true);
    setError(null);
    try {
      const db = await getDbClient();
      if (!db) throw new Error('Tietokanta ei ole käytettävissä');
      await updateDoc(doc(db, 'listings', id), {
        title: data.title,
        type: data.type,
        price: Number(data.price),
        pricePerSqm: Number(data.pricePerSqm),
        size: Number(data.size),
        lotSize: data.lotSize ? Number(data.lotSize) : null,
        yearBuilt: data.yearBuilt ? Number(data.yearBuilt) : null,
        description: data.description,
        status: data.status,
        urlStub: data.urlStub,
        'attributes.bedrooms': Number(data.bedrooms),
        'attributes.bathrooms': Number(data.bathrooms),
        'attributes.condition': data.condition,
        'attributes.heating': data.heating,
        'attributes.amenitiesList': data.amenitiesList,
        'attributes.appliancesList': data.appliancesList,
        'location.locality': data.locality,
        media: data.media,
        'seo.metaTitle': data.seoTitle || null,
        'seo.metaDescription': data.seoDescription || null,
        'extras.rentalPotential': data.rentalPotential || null,
        'extras.goldenVisaEligible': data.goldenVisaEligible,
        'extras.fiAgentUid': data.fiAgentUid || null,
        'extras.partnerId': data.partnerId || null,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Tallennus epäonnistui');
    } finally {
      setSaving(false);
    }
  }

  function field(label: string, child: React.ReactNode) {
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{label}</label>
        {child}
      </div>
    );
  }

  const inp = (val: string | number, onChange: (v: string) => void, type = 'text') => (
    <input
      type={type}
      value={val}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }}
    />
  );

  const tabStyle = (t: Tab) => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: tab === t ? '2px solid #0B3D6B' : '2px solid transparent',
    background: 'none',
    fontWeight: tab === t ? 700 : 400,
    color: tab === t ? '#0B3D6B' : '#555',
    cursor: 'pointer',
    fontSize: 14,
  });

  if (loading) return <main style={{ padding: 32 }}><p>Ladataan…</p></main>;
  if (!data) return <main style={{ padding: 32 }}><p>Kohdetta ei löydy.</p></main>;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => router.push('/listings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#555', padding: 0 }}
          aria-label="Takaisin"
        >←</button>
        <h1 style={{ margin: 0, fontSize: 20, flex: 1 }}>{data.title || '(nimetön)'}</h1>
        <span style={{
          padding: '3px 10px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          background: data.status === 'published' ? '#dcfce7' : data.status === 'sold' ? '#fee2e2' : '#f3f4f6',
          color: data.status === 'published' ? '#166534' : data.status === 'sold' ? '#b91c1c' : '#374151',
        }}>{STATUS_OPTIONS.find(s => s.value === data.status)?.label || data.status}</span>
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving}
          style={{ minWidth: 100 }}
        >
          {saving ? 'Tallennetaan…' : saved ? '✓ Tallennettu' : 'Tallenna'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
        <button style={tabStyle('perustiedot')} onClick={() => setTab('perustiedot')}>Perustiedot</button>
        <button style={tabStyle('media')} onClick={() => setTab('media')}>
          Media {((data.media.gallery?.length || 0) + (data.media.videos?.length || 0)) > 0
            ? `(${(data.media.gallery?.length || 0) + (data.media.videos?.length || 0)})`
            : ''}
        </button>
        <button style={tabStyle('julkaisu')} onClick={() => setTab('julkaisu')}>Julkaisu & SEO</button>
      </div>

      {tab === 'perustiedot' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            {field('Otsikko', inp(data.title, v => setData(d => d && ({ ...d, title: v }))))}
          </div>
          {field('Tyyppi', (
            <select
              value={data.type}
              onChange={(e) => setData(d => d && ({ ...d, type: e.target.value }))}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
            >
              {['Huvila', 'Asunto', 'Townhouse', 'Maatila', 'Tontti', 'Liikekiinteistö'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          ))}
          {field('Hinta (€)', inp(data.price, v => setData(d => d && ({ ...d, price: Number(v) })), 'number'))}
          {field('Hinta/m² (€)', inp(data.pricePerSqm, v => setData(d => d && ({ ...d, pricePerSqm: Number(v) })), 'number'))}
          {field('Asuinpinta-ala (m²)', inp(data.size, v => setData(d => d && ({ ...d, size: Number(v) })), 'number'))}
          {field('Tonttipinta-ala (m²)', inp(data.lotSize ?? '', v => setData(d => d && ({ ...d, lotSize: v ? Number(v) : undefined })), 'number'))}
          {field('Makuuhuoneet', inp(data.bedrooms, v => setData(d => d && ({ ...d, bedrooms: Number(v) })), 'number'))}
          {field('Kylpyhuoneet', inp(data.bathrooms, v => setData(d => d && ({ ...d, bathrooms: Number(v) })), 'number'))}
          {field('Rakennusvuosi', inp(data.yearBuilt ?? '', v => setData(d => d && ({ ...d, yearBuilt: v ? Number(v) : undefined })), 'number'))}
          {field('Kunto', inp(data.condition, v => setData(d => d && ({ ...d, condition: v }))))}
          {field('Sijainti (kaupunki/alue)', inp(data.locality, v => setData(d => d && ({ ...d, locality: v }))))}
          {field('Lämmitys', (
            <select
              value={data.heating}
              onChange={(e) => setData(d => d && ({ ...d, heating: e.target.value }))}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
            >
              <option value="">— Valitse —</option>
              {['Öljylämmitys', 'Keskuslämmitys', 'Vain ilmalämpöpumppu', 'Ei lämmitystä'].map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            {field('Kuvaus', (
              <textarea
                value={data.description}
                onChange={(e) => setData(d => d && ({ ...d, description: e.target.value }))}
                rows={6}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
              />
            ))}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            {field('Mukavuudet', (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AMENITY_OPTIONS.map(a => (
                  <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={data.amenitiesList.includes(a)}
                      onChange={(e) => setData(d => {
                        if (!d) return d;
                        const list = e.target.checked
                          ? [...d.amenitiesList, a]
                          : d.amenitiesList.filter(x => x !== a);
                        return { ...d, amenitiesList: list };
                      })}
                    />
                    {a}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            {field('Kodinkoneet', (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {APPLIANCE_OPTIONS.map(a => (
                  <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={data.appliancesList.includes(a)}
                      onChange={(e) => setData(d => {
                        if (!d) return d;
                        const list = e.target.checked
                          ? [...d.appliancesList, a]
                          : d.appliancesList.filter(x => x !== a);
                        return { ...d, appliancesList: list };
                      })}
                    />
                    {a}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            {field('Vuokrapotentiaali', inp(data.rentalPotential, v => setData(d => d && ({ ...d, rentalPotential: v }))))}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={data.goldenVisaEligible}
                onChange={(e) => setData(d => d && ({ ...d, goldenVisaEligible: e.target.checked }))}
              />
              <span style={{ fontWeight: 600 }}>Golden Visa -kelpoinen</span>
            </label>
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {field('Myyntiedustaja', (
              <select
                value={data.fiAgentUid}
                onChange={(e) => setData(d => d && ({ ...d, fiAgentUid: e.target.value }))}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
              >
                <option value="">— Valitse edustaja —</option>
                {adminOptions.map(o => <option key={o.uid} value={o.uid}>{o.label}</option>)}
              </select>
            ))}
            {field('Kumppani', (
              <select
                value={data.partnerId}
                onChange={(e) => setData(d => d && ({ ...d, partnerId: e.target.value }))}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
              >
                {partnerOptions.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            ))}
          </div>
        </div>
      )}

      {tab === 'media' && (
        <ListingMediaEditor
          listingId={id}
          media={data.media}
          onChange={(media) => setData(d => d && ({ ...d, media }))}
          saving={saving}
        />
      )}

      {tab === 'julkaisu' && (
        <div style={{ maxWidth: 600 }}>
          {field('Tila', (
            <select
              value={data.status}
              onChange={(e) => setData(d => d && ({ ...d, status: e.target.value }))}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
            >
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          ))}
          {field('URL-polku', (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{ padding: '8px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRight: 'none', borderRadius: '6px 0 0 6px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                /listings/
              </span>
              <input
                type="text"
                value={data.urlStub}
                onChange={(e) => setData(d => d && ({ ...d, urlStub: e.target.value }))}
                style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: '0 6px 6px 0', padding: '8px 10px', fontSize: 14 }}
              />
            </div>
          ))}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>SEO</div>
            {field('Meta-otsikko', inp(data.seoTitle, v => setData(d => d && ({ ...d, seoTitle: v }))))}
            {field('Meta-kuvaus', (
              <textarea
                value={data.seoDescription}
                onChange={(e) => setData(d => d && ({ ...d, seoDescription: e.target.value }))}
                rows={3}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
              />
            ))}
          </div>
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Julkinen linkki</div>
            <a
              href={`https://kotikreikasta.com/listings/${data.urlStub}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0B3D6B', fontSize: 13, wordBreak: 'break-all' }}
            >
              https://kotikreikasta.com/listings/{data.urlStub}
            </a>
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 12 }}>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Tallennetaan…' : saved ? '✓ Tallennettu' : 'Tallenna muutokset'}
        </button>
        <button
          onClick={() => router.push('/listings')}
          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 16px', background: '#fff', cursor: 'pointer', fontSize: 14 }}
        >
          Takaisin
        </button>
      </div>
    </main>
  );
}
