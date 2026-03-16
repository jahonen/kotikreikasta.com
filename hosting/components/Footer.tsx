import Link from 'next/link';
import { SiFacebook, SiThreads, SiX, SiInstagram } from 'react-icons/si';

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
            <li><Link href="/ostoprosessi">Ostoprosessi</Link></li>
            <li><Link href="/alueet">Alueet</Link></li>
            <li><Link href="/tasmahaku">Täsmähaku</Link></li>
            <li><Link href="/konsierge">Konsierge</Link></li>
            <li><a href="#listings">Kohteet</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Tietoa</h4>
          <ul>
            <li><Link href="/privacy">Tietosuoja</Link></li>
            <li><Link href="/palveluehdot">Palveluehdot</Link></li>
            <li><a href="#latest-blogs">Blogi</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Hyödyllistä</h4>
          <ul>
            <li>
              <a 
                href="https://en.aegeanair.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
              >
                <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>✈ Lennä Aegeanilla</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Suorat lennot Helsingistä alle 4h</span>
              </a>
            </li>
            <li style={{ marginTop: '0.75rem' }}>
              <a 
                href="https://finlandabroad.fi/web/grc/edustusto" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
              >
                <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>🇫🇮 Suomen Suurlähetystö</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Ateena, Kreikka</span>
              </a>
            </li>
            <li style={{ marginTop: '1rem' }}>
              <a href="mailto:info@kotikreikasta.com">info@kotikreikasta.com</a>
            </li>
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
              <path d="M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026" fill="currentColor"/>
            </svg>
          </a>
          <a
            href="https://www.facebook.com/kotikreikasta"
            target="_none"
            rel="noopener noreferrer"
            aria-label="Facebook – Kotikreikasta"
            title="Facebook – Kotikreikasta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            <SiFacebook size={20} aria-hidden="true" />
          </a>
          <a
            href="https://www.threads.com/@kotikreikasta"
            target="_none"
            rel="noopener noreferrer"
            aria-label="Threads – Kotikreikasta"
            title="Threads – Kotikreikasta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            <SiThreads size={20} aria-hidden="true" />
          </a>
          <a
            href="https://x.com/kotikreikasta"
            target="_none"
            rel="noopener noreferrer"
            aria-label="X (Twitter) – Kotikreikasta"
            title="X (Twitter) – Kotikreikasta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            <SiX size={20} aria-hidden="true" />
          </a>
          <a
            href="https://www.instagram.com/kotikreikasta/"
            target="_none"
            rel="noopener noreferrer"
            aria-label="Instagram – Kotikreikasta"
            title="Instagram – Kotikreikasta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            <SiInstagram size={20} aria-hidden="true" />
          </a>
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Tietosuoja</Link>
        </div>
      </div>
    </footer>
  );
}
