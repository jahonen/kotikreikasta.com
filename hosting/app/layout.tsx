import type { Metadata } from "next";
import "../styles/main.scss";
import AnalyticsInit from "../components/AnalyticsInit";
import CookieConsent from "../components/CookieConsent";

export const metadata: Metadata = {
  title: "Kotikreikasta.com",
  description:
    "Suomenkielinen kiinteistöpalvelu Kreikassa. Löydä koti auringon maasta – turvallisesti ja asiantuntevasti.",
  icons: {
    icon: [
      { url: "/assets/favicon/favicon.ico" },
      { url: "/assets/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi">
      <body>
        <AnalyticsInit />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
