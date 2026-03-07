'use client';

import { FormEvent, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDbClient } from '../lib/firebase-client';

interface NewsletterCtaProps {}

export default function NewsletterCta(_props: NewsletterCtaProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setError('Anna kelvollinen sähköpostiosoite');
      return;
    }
    try {
      setStatus('submitting');
      const db = await getDbClient();
      if (!db) {
        setStatus('error');
        setError('Palvelu ei ole saatavilla juuri nyt. Yritä uudelleen myöhemmin.');
        return;
      }
      await addDoc(collection(db, 'newsletterSubscriptions'), {
        email,
        consent: true,
        source: 'landing-cta',
        createdAt: serverTimestamp(),
      });
      setStatus('success');
      setEmail('');
    } catch (e) {
      setStatus('error');
      setError('Tallennus epäonnistui. Yritä uudelleen.');
    }
  };

  return (
    <section id="newsletter" className="cta-band">
      <div
        className="cta-bg"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1600&q=80')",
        }}
      />
      <div className="cta-overlay" />
      <div className="cta-content">
        <span className="section-label">Uutiskirje</span>
        <h2 className="cta-title">
          Saat parhaat kohteet ja <em>vinkit Kreikkaan</em> kuukausittain
        </h2>
        <p>Liity listalle – voit perua milloin tahansa.</p>
        <form onSubmit={onSubmit} className="form-row" style={{ marginTop: '1rem' }}>
          <input
            className="input"
            type="email"
            placeholder="sähköposti@osoite.fi"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
            required
          />
          <button className="btn-primary" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Tallennetaan…' : 'Tilaa uutiskirje'}
          </button>
        </form>
        {error && (
          <div style={{ color: '#ffd7d7', marginTop: '0.75rem' }}>{error}</div>
        )}
        {status === 'success' && (
          <div style={{ color: '#e8d5a3', marginTop: '0.75rem' }}>
            Kiitos! Vahvistusviesti lähetetään tarvittaessa.
          </div>
        )}
      </div>
    </section>
  );
}
