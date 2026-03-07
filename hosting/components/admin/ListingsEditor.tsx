'use client';

import { FormEvent, useState } from 'react';
import { addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { getDbClient } from '../../lib/firebase-client';
import { slugify } from '../../lib/utils/slugify';

export default function ListingsEditor() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

      await addDoc(coll, {
        title: title.trim(),
        description: description.trim(),
        price: price ? Number(price) : undefined,
        location: { address: address || undefined },
        urlStub: finalStub,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

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
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" disabled={saving}>{saving ? 'Tallennetaan…' : 'Tallenna luonnos'}</button>
        </div>
        {message && <div style={{ marginTop: '0.25rem' }}>{message}</div>}
      </form>
    </section>
  );
}
