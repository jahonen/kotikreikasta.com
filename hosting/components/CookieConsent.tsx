"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("cookieConsent");
      setVisible(!v);
    } catch {
      // ignore
    }
  }, []);

  const setConsent = (value: "accepted" | "rejected") => {
    try {
      localStorage.setItem("cookieConsent", value);
      // Inform listeners (e.g., AnalyticsInit) that consent changed
      window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: { value } }));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Evästeilmoitus"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: "#111",
        color: "#fff",
        padding: "1rem",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.3)",
      }}
    >
      <div className="container" style={{ display: "flex", gap: "1rem", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.85)" }}>
          Käytämme evästeitä parantaaksemme käyttökokemusta, mitataksemme liikennettä ja tallentaaksemme mahdollisen viittauskoodin.
          Lue lisää <Link href="/privacy" style={{ color: "#9adcff", textDecoration: "underline" }}>Tietosuojaselosteesta</Link>.
        </p>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button
            onClick={() => setConsent("rejected")}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "#fff",
              padding: ".5rem .75rem",
              borderRadius: ".375rem",
            }}
          >
            Vain välttämättömät
          </button>
          <button
            onClick={() => setConsent("accepted")}
            className="btn-primary"
            style={{ padding: ".5rem .75rem" }}
          >
            Hyväksy kaikki
          </button>
        </div>
      </div>
    </div>
  );
}
