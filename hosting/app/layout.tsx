import type { Metadata } from "next";
import "../styles/main.scss";
import AnalyticsInit from "../components/AnalyticsInit";
import CookieConsent from "../components/CookieConsent";

export const metadata: Metadata = {
  metadataBase: new URL('https://kotikreikasta.com'),
  title: {
    default: "Kotikreikasta.com – Suomenkielinen kiinteistöpalvelu Kreikassa",
    template: "%s – Kotikreikasta.com"
  },
  description:
    "Suomenkielinen kiinteistöpalvelu Kreikassa. Löydä koti auringon maasta – turvallisesti ja asiantuntevasti. Ostoprosessi, alueopas ja täsmähaku.",
  keywords: [
    "kreikka kiinteistö",
    "lomakoti kreikka",
    "asunto kreikka",
    "kreikka ostoprosessi",
    "suomenkielinen palvelu kreikka",
    "kreetan kiinteistöt",
    "korfun kiinteistöt",
    "kreikka sijoituskiinteistö"
  ],
  authors: [{ name: "Kotikreikasta.com" }],
  creator: "Kotikreikasta.com",
  publisher: "Kotikreikasta.com",
  openGraph: {
    type: "website",
    locale: "fi_FI",
    url: "https://kotikreikasta.com",
    siteName: "Kotikreikasta.com",
    title: "Kotikreikasta.com – Suomenkielinen kiinteistöpalvelu Kreikassa",
    description: "Suomenkielinen kiinteistöpalvelu Kreikassa. Löydä koti auringon maasta – turvallisesti ja asiantuntevasti.",
    images: [
      {
        url: "/etuovi_kreikkaan.jpg",
        width: 1200,
        height: 630,
        alt: "Kotikreikasta.com"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: "@kotikreikasta",
    creator: "@kotikreikasta",
    title: "Kotikreikasta.com – Suomenkielinen kiinteistöpalvelu Kreikassa",
    description: "Suomenkielinen kiinteistöpalvelu Kreikassa. Löydä koti auringon maasta – turvallisesti ja asiantuntevasti.",
    images: ["/etuovi_kreikkaan.jpg"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: "/assets/favicon/favicon.ico" },
      { url: "/assets/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "RealEstateAgent",
              "name": "Kotikreikasta.com",
              "description": "Suomenkielinen kiinteistöpalvelu Kreikassa",
              "url": "https://kotikreikasta.com",
              "logo": "https://kotikreikasta.com/assets/kotikreikasta_com.png",
              "image": "https://kotikreikasta.com/etuovi_kreikkaan.jpg",
              "telephone": "",
              "email": "info@kotikreikasta.com",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "GR"
              },
              "areaServed": [
                {
                  "@type": "Country",
                  "name": "Greece"
                }
              ],
              "serviceArea": {
                "@type": "GeoCircle",
                "geoMidpoint": {
                  "@type": "GeoCoordinates",
                  "latitude": "39.0742",
                  "longitude": "21.8243"
                },
                "geoRadius": "500000"
              },
              "priceRange": "€€€",
              "knowsLanguage": ["fi", "el", "en"],
              "sameAs": [
                "https://www.facebook.com/kotikreikasta",
                "https://www.instagram.com/kotikreikasta/",
                "https://x.com/kotikreikasta",
                "https://www.threads.com/@kotikreikasta",
                "https://bsky.app/profile/kotikreikasta.com"
              ]
            })
          }}
        />
      </head>
      <body>
        <AnalyticsInit />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
