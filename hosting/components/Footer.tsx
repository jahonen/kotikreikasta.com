import Link from 'next/link';

export default function Footer() {
  return (
    <footer>
      <div className="footer-top container">
        <div className="footer-col">
          <h4>Kotikreikasta</h4>
          <p style={{ color: 'rgba(255,255,255,0.45)' }}>
            Löydä kotisi auringon maasta – asiantuntevasti ja suomen kielellä.
          </p>
        </div>
        <div className="footer-col">
          <h4>Palvelut</h4>
          <ul>
            <li><a href="#listings">Kohteet</a></li>
            <li><a href="#process">Ostoprosessi</a></li>
            <li><a href="#concierge">Konsierge</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Tietoa</h4>
          <ul>
            <li><Link href="/privacy">Tietosuoja</Link></li>
            <li><a href="#newsletter">Uutiskirje</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Yhteys</h4>
          <ul>
            <li><a href="mailto:info@kotikreikasta.com">info@kotikreikasta.com</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom container">
        <div className="footer-copy">© {new Date().getFullYear()} Kotikreikasta</div>
        <div className="footer-legal" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <a
            href="https://bsky.app/profile/kotikreikasta.com"
            target="_none"
            rel="noopener noreferrer"
            aria-label="Bluesky – Kotikreikasta"
            title="Bluesky – Kotikreikasta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M14.5 4.5c1.9 1.7 3.7 3.2 5 3.4 1.2.2 2-.7 2-.7s-.2 2-1.4 3.2c-1.1 1.2-3.2 1.4-4.9.8 2 1.4 3 3.3 2.6 5.1-.4 1.9-2.1 3.4-4.7 3.4-1.6 0-2.7-.6-3.1-1.2-.4.6-1.5 1.2-3.1 1.2-2.6 0-4.3-1.5-4.7-3.4-.4-1.8.6-3.7 2.6-5.1-1.7.6-3.8.4-4.9-.8C.7 8.2.5 6.2.5 6.2s.8.9 2 .7c1.3-.2 3.1-1.7 5-3.4 1.7-1.5 2.5-2.3 3.5-2.3s1.8.8 3.5 2.3z" fill="currentColor"/>
            </svg>
            <span>Bluesky</span>
          </a>
          <a
            href="https://www.facebook.com/kotikreikasta"
            target="_none"
            rel="noopener noreferrer"
            aria-label="Facebook – Kotikreikasta"
            title="Facebook – Kotikreikasta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="currentColor" d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.21 10.44 22v-7.02H7.9v-2.92h2.54V9.84c0-2.5 1.49-3.88 3.77-3.88 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.92h-2.34V22C18.34 21.21 22 17.08 22 12.06Z"/>
            </svg>
            <span>Facebook</span>
          </a>
          <Link href="/privacy">Tietosuoja</Link>
        </div>
      </div>
    </footer>
  );
}
