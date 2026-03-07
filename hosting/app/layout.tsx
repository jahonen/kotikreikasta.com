import "../styles/main.scss";
import AnalyticsInit from "../components/AnalyticsInit";

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
      </body>
    </html>
  );
}
