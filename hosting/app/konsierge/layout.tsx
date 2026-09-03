import type { Metadata } from 'next';

const OG_TITLE = 'Konsierge-palvelu Kreikassa – suomenkielinen kiinteistönhoito | Kotikreikasta.com';
const OG_DESC = 'Kerro tarpeesi suomeksi – löydämme luotettavan paikallisen ammattilaisen ja varmistamme, että työ tulee tehdyksi oikein. Ensimmäiset 12 kuukautta veloituksetta ostajille.';
const OG_IMAGE = 'https://kotikreikasta.com/etuovi_kreikkaan.jpg';

export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESC,
  authors: [{ name: 'Kotikreikasta' }],
  publisher: 'Kotikreikasta',
  alternates: {
    canonical: 'https://kotikreikasta.com/konsierge'
  },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESC,
    url: 'https://kotikreikasta.com/konsierge',
    siteName: 'Kotikreikasta',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Kotikreikasta – Konsierge-palvelu Kreikassa'
      }
    ],
    locale: 'fi_FI',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    site: '@kotikreikasta',
    creator: '@kotikreikasta',
    title: OG_TITLE,
    description: OG_DESC,
    images: [OG_IMAGE]
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
