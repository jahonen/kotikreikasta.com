'use client';

import { FormEvent, useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDbClient } from '../lib/firebase-client';
import './ContactForm.scss';

export type LeadSource =
  | { type: 'listing'; listingId: string; title: string; url: string; price: number }
  | { type: 'content'; slug: string; title: string; url: string };

interface ContactFormProps {
  source: LeadSource;
}

export default function ContactForm({ source }: ContactFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [status, setStatus] = useState<'idle'|'submitting'|'success'|'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const tcv = useMemo(() => {
    if (source.type === 'listing') {
      const p = Number(source.price || 0);
      if (!isFinite(p) || p <= 0) return 0;
      return Math.round(p * 0.02);
    }
    return 0;
  }, [source]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!terms) {
      setError('Hyväksy palveluehdot jatkaaksesi.');
      return;
    }
    const hasPhone = String(phone).trim().length > 0;
    const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    if (!hasPhone && !hasEmail) {
      setError('Anna vähintään puhelin tai sähköpostiosoite.');
      return;
    }
    if (String(message).trim().length < 3) {
      setError('Kerro lyhyesti tarpeestasi.');
      return;
    }

    try {
      setStatus('submitting');
      const db = await getDbClient();
      if (!db) throw new Error('Palvelu ei ole saatavilla juuri nyt.');

      const statusKey = 'lead';
      const statusPct = 0.10;
      const currentValue = Math.round(tcv * statusPct);
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null;

      const payload: any = {
        source,
        contact: {
          name: fullName,
          phone: hasPhone ? phone : null,
          email: hasEmail ? email : null,
        },
        subject: subject || null,
        message,
        consents: {
          termsAccepted: true,
          marketingOptIn: !!marketing,
        },
        status: statusKey,
        statusPct,
        tcv,
        currentValue,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const writeWithRetry = async <T,>(fn: () => Promise<T>, attempts = 3): Promise<T> => {
        let lastErr: any;
        for (let i = 0; i < attempts; i++) {
          try { return await fn(); } catch (e: any) {
            lastErr = e;
            await new Promise((r) => setTimeout(r, 250 * (i + 1)));
          }
        }
        throw lastErr;
      };

      await writeWithRetry(() => addDoc(collection(db, 'leads'), payload));

      if (marketing && hasEmail) {
        try {
          await writeWithRetry(() => addDoc(collection(db, 'newsletterSubscriptions'), {
            email,
            consent: true,
            source: source.type === 'listing' ? `lead-listing-${source.listingId}` : `lead-content-${source.slug}`,
            createdAt: serverTimestamp(),
          }));
        } catch {}
      }

      setStatus('success');
      setFirstName(''); setLastName(''); setPhone(''); setEmail(''); setSubject(''); setMessage(''); setTerms(false); setMarketing(false);
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Lähetys epäonnistui. Yritä pian uudelleen.');
    }
  };

  if (status === 'success') {
    return (
      <div className="contact-form-success">
        <p className="success-message">
          <span className="success-icon">✓</span>
          Kiitos! Otamme sinuun yhteyttä pian.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="contact-form">
      <div className="form-grid-2">
        <div className="form-field">
          <label htmlFor="firstName">Etunimi</label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Matti"
          />
        </div>
        <div className="form-field">
          <label htmlFor="lastName">Sukunimi</label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Virtanen"
          />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field">
          <label htmlFor="email">Sähköposti</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="matti@esimerkki.fi"
          />
        </div>
        <div className="form-field">
          <label htmlFor="phone">Puhelin</label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+358 40 123 4567"
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="subject">Miten voimme auttaa?</label>
        <div className="select-wrap">
          <select
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">Valitse kiinnostuksen kohde</option>
            <option value="lomakoti">Etsin lomakotia omaan käyttöön</option>
            <option value="sijoitus">Haen sijoituskiinteistöä Kreikasta</option>
            <option value="prosessi">Haluan tietoa ostoprosessista ja verotuksesta</option>
            <option value="apu">Olen jo löytänyt kohteen – tarvitsen apua</option>
            <option value="muu">Muu asia</option>
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="message">Viesti</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Kerro vapaasti mitä etsit – budjetti, alue, aikataulu tai muut toiveet. Mitä enemmän tiedämme, sitä paremmin osaamme auttaa."
        />
      </div>

      <div className="checkboxes">
        <div className="check-row">
          <input
            type="checkbox"
            id="terms"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          <label className="check-label" htmlFor="terms">
            Hyväksyn <a href="/palveluehdot">palveluehdot</a> ja tietosuojakäytännön
          </label>
        </div>
        <div className="check-row">
          <input
            type="checkbox"
            id="marketing"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
          />
          <label className="check-label" htmlFor="marketing">
            Haluan saada ajankohtaisia kohde-esittelyjä ja markkinakatsauksia sähköpostiini
            <span className="opt-tag">vapaaehtoinen</span>
          </label>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" className="submit-btn" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Lähetetään…' : 'Lähetä viesti'}
      </button>

      <p className="trust-line">
        <span>✓</span> Vastaus 24 tunnissa
        <span className="separator">·</span>
        <span>✓</span> Ei sitoumuksia
        <span className="separator">·</span>
        <span>✓</span> Luottamuksellinen
      </p>
    </form>
  );
}
