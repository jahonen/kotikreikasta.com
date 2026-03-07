'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import logo from '../assets/kotikreikasta.png';

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
        <Image src={logo} alt="Kotikreikasta" height={28} className="logo-mono" />
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
