import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alueet",
  description: "Tutustu Kreikan parhaisiin alueisiin loma-asunnon ostajalle. Kreeta, Korfu, Peloponnesos, Santorini, Mykonos, Rhodos ja muut suositut kohteet.",
  keywords: [
    "kreetan kiinteistöt",
    "korfun kiinteistöt",
    "peloponnesos kiinteistö",
    "santorini kiinteistö",
    "mykonos kiinteistö",
    "rhodos kiinteistö",
    "kreikka alueet",
    "kreikka saaret"
  ],
  openGraph: {
    title: "Alueet – Kotikreikasta.com",
    description: "Tutustu Kreikan parhaisiin alueisiin loma-asunnon ostajalle. Kreeta, Korfu, Peloponnesos ja muut suositut kohteet.",
    url: "https://kotikreikasta.com/alueet",
    type: "website",
    images: [
      {
        url: "/etuovi_kreikkaan.jpg",
        width: 1200,
        height: 630,
        alt: "Alueet – Kotikreikasta.com"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Alueet – Kotikreikasta.com",
    description: "Tutustu Kreikan parhaisiin alueisiin loma-asunnon ostajalle. Kreeta, Korfu, Peloponnesos ja muut suositut kohteet.",
    images: ["/etuovi_kreikkaan.jpg"]
  },
  alternates: {
    canonical: "https://kotikreikasta.com/alueet"
  }
};

export default function AlueetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
