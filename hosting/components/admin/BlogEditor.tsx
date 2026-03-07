'use client';

import { FormEvent, useState } from 'react';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { getDbClient } from '../../lib/firebase-client';
import { slugify } from '../../lib/utils/slugify';

export default function BlogEditor() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState(''); // comma-separated
  const [featuredImage, setFeaturedImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!title.trim() || !content.trim()) {
      setMessage('Täytä otsikko ja sisältö.');
      return;
    }

    const db = await getDbClient();
    if (!db) {
      setMessage('Palvelu ei ole saatavilla juuri nyt. Yritä myöhemmin.');
      return;
    }

    setSaving(true);
    try {
      let baseStub = slugify(title).slice(0, 80) || 'artikkeli';
      let finalStub = baseStub;

      const coll = collection(db, 'blog_posts');
      const q = query(coll, where('urlStub', '==', finalStub));
      const existing = await getDocs(q);
      if (!existing.empty) {
        finalStub = `${baseStub}-2`;
      }

      const cats = categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await addDoc(coll, {
        title: title.trim(),
        content: content.trim(),
        categories: cats.length ? cats : undefined,
        featuredImage: featuredImage ? { url: featuredImage } : undefined,
        urlStub: finalStub,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessage('Tallennettu luonnoksena.');
      setTitle('');
      setContent('');
      setCategories('');
      setFeaturedImage('');
    } catch (err) {
      setMessage('Tallennus epäonnistui. Varmista käyttöoikeudet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="blog" style={{ marginTop: '2rem' }}>
      <h3 className="section-title" style={{ fontSize: '1.2rem' }}>Uusi blogikirjoitus</h3>
      <form onSubmit={onSubmit} className="form-column" style={{ display: 'grid', gap: '0.75rem', maxWidth: 720 }}>
        <input className="input" placeholder="Otsikko" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" placeholder="Sisältö" rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
        <input className="input" placeholder="Kategoriat (pilkulla erotettuna)" value={categories} onChange={(e) => setCategories(e.target.value)} />
        <input className="input" placeholder="Nostokuvan URL (valinnainen)" value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" disabled={saving}>{saving ? 'Tallennetaan…' : 'Tallenna luonnos'}</button>
        </div>
        {message && <div style={{ marginTop: '0.25rem' }}>{message}</div>}
      </form>
    </section>
  );
}
