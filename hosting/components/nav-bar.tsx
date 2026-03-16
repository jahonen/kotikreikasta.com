'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import logo from '../assets/kotikreikasta_com.png';

interface NavBarProps {}

export default function NavBar(_props: NavBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <Link href="/">
          {(() => {
            const h = 56;
            const lw = (logo as any).width as number;
            const lh = (logo as any).height as number;
            const w = Math.round(lw * (h / lh));
            const href = (logo as any).src || (logo as unknown as string);
            return (
              <svg
                width={w}
                height={h}
                viewBox={`0 0 ${lw} ${lh}`}
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Kotikreikasta.com"
                role="img"
                style={{ display: 'block' }}
              >
                <defs>
                  <filter id="kr-invert" colorInterpolationFilters="sRGB">
                    <feComponentTransfer>
                      <feFuncR type="table" tableValues="1 0" />
                      <feFuncG type="table" tableValues="1 0" />
                      <feFuncB type="table" tableValues="1 0" />
                    </feComponentTransfer>
                  </filter>
                  <mask id="kr-mask" maskUnits="userSpaceOnUse">
                    <image
                      href={href}
                      x={0}
                      y={0}
                      width={lw}
                      height={lh}
                      preserveAspectRatio="xMidYMid meet"
                      filter="url(#kr-invert)"
                    />
                  </mask>
                </defs>
                <rect x={0} y={0} width={lw} height={lh} fill="#ffffff" mask="url(#kr-mask)" />
              </svg>
            );
          })()}
        </Link>

        {/* Mobile hamburger button */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>

        {/* Desktop navigation */}
        <ul className="nav-links desktop-nav">
          <li><Link href="/ostoprosessi">Ostoprosessi</Link></li>
          <li><Link href="/alueet">Alueet</Link></li>
          <li><Link href="/tasmahaku">Täsmähaku</Link></li>
          <li><Link href="/konsierge">Konsierge</Link></li>
          <li><Link href="/#listings">Kohteet</Link></li>
          <li><Link href="/#latest-blogs">Blogi</Link></li>
          <li><Link href="/#newsletter" className="nav-cta">Ota yhteyttä</Link></li>
        </ul>
      </nav>

      {/* Mobile navigation overlay - moved outside navbar */}
      {mobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-nav-menu" onClick={(e) => e.stopPropagation()}>
            <ul className="mobile-nav-links">
              <li>
                <Link href="/ostoprosessi" onClick={() => setMobileMenuOpen(false)}>
                  Ostoprosessi
                </Link>
              </li>
              <li>
                <Link href="/alueet" onClick={() => setMobileMenuOpen(false)}>
                  Alueet
                </Link>
              </li>
              <li>
                <Link href="/tasmahaku" onClick={() => setMobileMenuOpen(false)}>
                  Täsmähaku
                </Link>
              </li>
              <li>
                <Link href="/konsierge" onClick={() => setMobileMenuOpen(false)}>
                  Konsierge
                </Link>
              </li>
              <li>
                <Link href="/#listings" onClick={() => setMobileMenuOpen(false)}>
                  Kohteet
                </Link>
              </li>
              <li>
                <Link href="/#latest-blogs" onClick={() => setMobileMenuOpen(false)}>
                  Blogi
                </Link>
              </li>
              <li>
                <Link href="/#newsletter" className="mobile-nav-cta" onClick={() => setMobileMenuOpen(false)}>
                  Ota yhteyttä
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
