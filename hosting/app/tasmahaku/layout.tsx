import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Täsmähaku",
  description: "Löydämme sinulle unelmiesi lomakodin Kreikasta. Räätälöity täsmähakupalvelu suomalaisille ostajille. Pääsy piilomarkkinoilla oleviin kiinteistöihin.",
  keywords: [
    "täsmähaku kreikka",
    "kiinteistönetsintä kreikka",
    "off-market kiinteistöt kreikka",
    "henkilökohtainen kiinteistöpalvelu",
    "räätälöity kiinteistöhaku",
    "eksklusiiviset kiinteistöt kreikka"
  ],
  openGraph: {
    title: "Täsmähaku – Kotikreikasta.com",
    description: "Löydämme sinulle unelmiesi lomakodin Kreikasta. Räätälöity täsmähakupalvelu suomalaisille ostajille.",
    url: "https://kotikreikasta.com/tasmahaku",
    type: "website",
    images: [
      {
        url: "/etuovi_kreikkaan.jpg",
        width: 1200,
        height: 630,
        alt: "Täsmähaku – Kotikreikasta.com"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Täsmähaku – Kotikreikasta.com",
    description: "Löydämme sinulle unelmiesi lomakodin Kreikasta. Räätälöity täsmähakupalvelu suomalaisille ostajille.",
    images: ["/etuovi_kreikkaan.jpg"]
  },
  alternates: {
    canonical: "https://kotikreikasta.com/tasmahaku"
  }
};

export default function TasmahakuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
