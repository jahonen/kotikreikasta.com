import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Konsierge-palvelu – Kotikreikasta',
  description: 'Kerro meille tarpeesi suomeksi. Selvitämme tilanteen, löydämme luotettavan paikallisen ammattilaisen ja varmistamme, että työ tulee tehdyksi oikein. Ensimmäiset 12 kuukautta veloituksetta ostajille.',
  keywords: 'konsierge, concierge, kiinteistönhoito, korjauspalvelut, Kreikka, suomenkielinen palvelu, paikallinen ammattilainen, kiinteistöpalvelut',
  authors: [{ name: 'Kotikreikasta' }],
  publisher: 'Kotikreikasta',
  alternates: {
    canonical: 'https://kotikreikasta.com/konsierge'
  },
  openGraph: {
    title: 'Konsierge-palvelu – Kotikreikasta',
    description: 'Kerro meille tarpeesi suomeksi. Selvitämme tilanteen, löydämme luotettavan paikallisen ammattilaisen ja varmistamme, että työ tulee tehdyksi oikein.',
    url: 'https://kotikreikasta.com/konsierge',
    siteName: 'Kotikreikasta',
    images: [
      {
        url: 'https://kotikreikasta.com/og-image.jpg',
        alt: 'Kotikreikasta Konsierge-palvelu'
      }
    ],
    locale: 'fi_FI',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Konsierge-palvelu – Kotikreikasta',
    description: 'Kerro meille tarpeesi suomeksi. Selvitämme tilanteen, löydämme luotettavan paikallisen ammattilaisen ja varmistamme, että työ tulee tehdyksi oikein.',
    images: ['https://kotikreikasta.com/og-image.jpg']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};

export default function KonsiergeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
