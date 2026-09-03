import type { Metadata } from "next";

const OG_TITLE = 'Täsmähaku Kreikassa – räätälöity kiinteistönetsintä suomalaisille | Kotikreikasta.com';
const OG_DESC = 'Löydämme sinulle unelmiesi lomakodin Kreikasta – myös piilomarkkinoilta. Räätälöity täsmähakupalvelu suomalaisille ostajille, kattaen koko ostoprosessin.';
const OG_IMAGE = 'https://kotikreikasta.com/etuovi_kreikkaan.jpg';

export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESC,
  authors: [{ name: 'Kotikreikasta' }],
  alternates: {
    canonical: 'https://kotikreikasta.com/tasmahaku'
  },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESC,
    url: 'https://kotikreikasta.com/tasmahaku',
    siteName: 'Kotikreikasta',
    type: 'website',
    locale: 'fi_FI',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Täsmähaku – Kotikreikasta.com'
      }
    ]
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

export default function TasmahakuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
