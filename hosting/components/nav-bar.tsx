'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import logo from '../assets/kotikreikasta_com.png';

interface NavBarProps {}

export default function NavBar(_props: NavBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
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
      <ul className="nav-links">
        <li><a href="#listings">Kohteet</a></li>
        <li><a href="#regions">Alueet</a></li>
        <li><a href="#process">Ostoprosessi</a></li>
        <li><a href="#concierge">Konsierge</a></li>
        <li><a href="#newsletter" className="nav-cta">Tilaa uutiskirje</a></li>
      </ul>
    </nav>
  );
}
