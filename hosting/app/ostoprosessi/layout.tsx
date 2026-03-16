import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ostoprosessi",
  description: "Viisi askelta lomakodin ostamiseen Kreikasta. Turvallinen ja asiantunteva prosessi alusta loppuun. Hoidamme kaikki käytännön asiat puolestasi.",
  keywords: [
    "kreikka ostoprosessi",
    "kiinteistön osto kreikka",
    "kreikka verotunnus",
    "kreikka kauppakirja",
    "kreikka notaari",
    "kiinteistön rekisteröinti kreikka"
  ],
  openGraph: {
    title: "Ostoprosessi – Kotikreikasta.com",
    description: "Viisi askelta lomakodin ostamiseen Kreikasta. Turvallinen ja asiantunteva prosessi alusta loppuun.",
    url: "https://kotikreikasta.com/ostoprosessi",
    type: "website",
    images: [
      {
        url: "/etuovi_kreikkaan.jpg",
        width: 1200,
        height: 630,
        alt: "Ostoprosessi – Kotikreikasta.com"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Ostoprosessi – Kotikreikasta.com",
    description: "Viisi askelta lomakodin ostamiseen Kreikasta. Turvallinen ja asiantunteva prosessi alusta loppuun.",
    images: ["/etuovi_kreikkaan.jpg"]
  },
  alternates: {
    canonical: "https://kotikreikasta.com/ostoprosessi"
  }
};

export default function OstoprosessiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
