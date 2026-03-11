import { useState } from "react";

const COLORS = {
  aegean: "#0B3D6B",
  aegeanLight: "#1A5496",
  sand: "#F4EFE6",
  sandDark: "#E8E0D2",
  terracotta: "#C4603E",
  gold: "#C9965A",
  white: "#FFFFFF",
  charcoal: "#1C2128",
  muted: "#6B7280",
  success: "#2E7D52",
  surface: "#FDFAF6",
};

const mockData = {
  tiimi: [
    { id: 1, nimi: "Mikael Virtanen", rooli: "Välittäjä", alue: "Ateena", kohteet: 12, status: "aktiivinen" },
    { id: 2, nimi: "Sofia Papadopoulos", rooli: "Välittäjä", alue: "Kreeta", kohteet: 8, status: "aktiivinen" },
    { id: 3, nimi: "Juha Mäkinen", rooli: "Johtava välittäjä", alue: "Kaikki alueet", kohteet: 24, status: "aktiivinen" },
    { id: 4, nimi: "Elena Kostopoulos", rooli: "Assistentti", alue: "Ateena", kohteet: 0, status: "aktiivinen" },
  ],
  kumppanit: [
    { id: 1, yritys: "Alpha Notary Services", tyyppi: "Notaari", maa: "Kreikka", status: "aktiivinen" },
    { id: 2, yritys: "Nordea Bank Hellas", tyyppi: "Pankki", maa: "Kreikka", status: "aktiivinen" },
    { id: 3, yritys: "Helsinki Legal OÜ", tyyppi: "Lakitoimisto", maa: "Suomi", status: "aktiivinen" },
    { id: 4, yritys: "AXA Greece", tyyppi: "Vakuutus", maa: "Kreikka", status: "passiivinen" },
  ],
  kohteet: [
    { id: 1, nimi: "Villa Poseidon", alue: "Santorini", hinta: "€485,000", tyyppi: "Huvila", status: "myytävänä", kuvat: 14 },
    { id: 2, nimi: "Kaupunkiasunto Kolonaki", alue: "Ateena", hinta: "€220,000", tyyppi: "Asunto", status: "myytävänä", kuvat: 8 },
    { id: 3, nimi: "Rantatalo Kassandra", alue: "Halkidiki", hinta: "€310,000", tyyppi: "Talo", status: "varaus", kuvat: 20 },
    { id: 4, nimi: "Perinteinen kivitalo", alue: "Mykonos", hinta: "€750,000", tyyppi: "Huvila", status: "myyty", kuvat: 18 },
    { id: 5, nimi: "Merinäköala-asunto", alue: "Ateena Riviera", hinta: "€195,000", tyyppi: "Asunto", status: "myytävänä", kuvat: 11 },
  ],
  blogit: [
    { id: 1, otsikko: "Kiinteistön ostaminen Kreikasta — täydellinen opas suomalaisille", kirjoittaja: "Juha Mäkinen", julkaistu: "12.02.2025", status: "julkaistu", luvut: 1840 },
    { id: 2, otsikko: "Golden Visa — tie EU-oleskelulupaan kiinteistösijoituksella", kirjoittaja: "Mikael Virtanen", julkaistu: "28.01.2025", status: "julkaistu", luvut: 3210 },
    { id: 3, otsikko: "Verotus ja juridiikka: mitä suomalaisen pitää tietää", kirjoittaja: "Juha Mäkinen", julkaistu: "—", status: "luonnos", luvut: 0 },
    { id: 4, otsikko: "Parhaat asuinalueet Ateenassa 2025", kirjoittaja: "Sofia Papadopoulos", julkaistu: "05.03.2025", status: "julkaistu", luvut: 980 },
  ],
  markkinointi: [
    { id: 1, kampanja: "Kevät 2025 — Halkidiki", kanava: "Meta Ads", budjetti: "€2,400", klikkaukset: 3820, liidit: 47, status: "aktiivinen" },
    { id: 2, kampanja: "Ateena — Sijoittajat", kanava: "Google Ads", budjetti: "€1,800", klikkaukset: 2140, liidit: 31, status: "aktiivinen" },
    { id: 3, kampanja: "Golden Visa -opas", kanava: "LinkedIn", budjetti: "€600", klikkaukset: 890, liidit: 18, status: "päättynyt" },
    { id: 4, kampanja: "Uutiskirje Q1", kanava: "Email", budjetti: "€0", klikkaukset: 1240, liidit: 22, status: "päättynyt" },
  ],
};

const navItems = [
  { key: "kohteet", label: "Kohteet", icon: "🏛️" },
  { key: "tiimi", label: "Tiimi", icon: "👥" },
  { key: "kumppanit", label: "Kumppanit", icon: "🤝" },
  { key: "blogit", label: "Blogit", icon: "✍️" },
  { key: "markkinointi", label: "Markkinointi", icon: "📊" },
];

const statusBadge = (status) => {
  const map = {
    aktiivinen: { bg: "#E6F4EC", color: "#2E7D52" },
    passiivinen: { bg: "#F3F4F6", color: "#6B7280" },
    myytävänä: { bg: "#E8F0FB", color: "#1A5496" },
    varaus: { bg: "#FEF3E2", color: "#C9965A" },
    myyty: { bg: "#E6F4EC", color: "#2E7D52" },
    julkaistu: { bg: "#E6F4EC", color: "#2E7D52" },
    luonnos: { bg: "#F3F4F6", color: "#6B7280" },
    päättynyt: { bg: "#F3F4F6", color: "#6B7280" },
  };
  const s = map[status] || { bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: "0.02em",
      background: s.bg,
      color: s.color,
    }}>
      {status}
    </span>
  );
};

const KohteetView = () => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.charcoal, margin: 0, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Kohteet</h2>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 14 }}>{mockData.kohteet.length} aktiivista kohdetta</p>
      </div>
      <button style={{
        background: COLORS.terracotta,
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "10px 20px",
        fontWeight: 600,
        fontSize: 14,
        cursor: "pointer",
        fontFamily: "inherit",
      }}>+ Lisää kohde</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {mockData.kohteet.map(k => (
        <div key={k.id} style={{
          background: COLORS.white,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(11,61,107,0.08)",
          border: `1px solid ${COLORS.sandDark}`,
          transition: "box-shadow 0.2s",
        }}>
          <div style={{
            height: 140,
            background: `linear-gradient(135deg, ${COLORS.aegean}22, ${COLORS.gold}33)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            position: "relative",
          }}>
            🏛️
            <span style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(255,255,255,0.9)", borderRadius: 6, padding: "3px 8px",
              fontSize: 12, fontWeight: 600, color: COLORS.muted,
            }}>📷 {k.kuvat}</span>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.charcoal, lineHeight: 1.3, flex: 1 }}>{k.nimi}</h3>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: COLORS.muted }}>📍 {k.alue} · {k.tyyppi}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.aegean, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{k.hinta}</span>
              {statusBadge(k.status)}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TableView = ({ title, count, columns, rows, addLabel }) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.charcoal, margin: 0, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{title}</h2>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 14 }}>{count} merkintää</p>
      </div>
      <button style={{
        background: COLORS.terracotta, color: "#fff",
        border: "none", borderRadius: 8, padding: "10px 20px",
        fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
      }}>+ {addLabel}</button>
    </div>
    <div style={{
      background: COLORS.white,
      borderRadius: 12,
      border: `1px solid ${COLORS.sandDark}`,
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(11,61,107,0.06)",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: columns.map(c => c.width || "1fr").join(" "),
        background: COLORS.sand,
        padding: "10px 20px",
        borderBottom: `1px solid ${COLORS.sandDark}`,
      }}>
        {columns.map(c => (
          <span key={c.key} style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{c.label}</span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={row.id} style={{
          display: "grid",
          gridTemplateColumns: columns.map(c => c.width || "1fr").join(" "),
          padding: "14px 20px",
          borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.sandDark}` : "none",
          alignItems: "center",
        }}>
          {columns.map(c => (
            <span key={c.key} style={{ fontSize: 14, color: c.key === columns[0].key ? COLORS.charcoal : COLORS.muted, fontWeight: c.key === columns[0].key ? 600 : 400 }}>
              {c.render ? c.render(row[c.key]) : row[c.key]}
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const TiimitView = () => (
  <TableView
    title="Tiimi"
    count={mockData.tiimi.length}
    addLabel="Lisää jäsen"
    columns={[
      { key: "nimi", label: "Nimi", width: "2fr" },
      { key: "rooli", label: "Rooli", width: "2fr" },
      { key: "alue", label: "Alue", width: "2fr" },
      { key: "kohteet", label: "Kohteet", width: "1fr" },
      { key: "status", label: "Status", width: "1.5fr", render: statusBadge },
    ]}
    rows={mockData.tiimi}
  />
);

const KumppaneitView = () => (
  <TableView
    title="Kumppanit"
    count={mockData.kumppanit.length}
    addLabel="Lisää kumppani"
    columns={[
      { key: "yritys", label: "Yritys", width: "2fr" },
      { key: "tyyppi", label: "Tyyppi", width: "1.5fr" },
      { key: "maa", label: "Maa", width: "1fr" },
      { key: "status", label: "Status", width: "1.5fr", render: statusBadge },
    ]}
    rows={mockData.kumppanit}
  />
);

const BlogitView = () => (
  <TableView
    title="Blogit"
    count={mockData.blogit.length}
    addLabel="Uusi artikkeli"
    columns={[
      { key: "otsikko", label: "Otsikko", width: "3fr" },
      { key: "kirjoittaja", label: "Kirjoittaja", width: "1.5fr" },
      { key: "julkaistu", label: "Julkaistu", width: "1.5fr" },
      { key: "luvut", label: "Lukukerrat", width: "1fr", render: v => v > 0 ? v.toLocaleString("fi-FI") : "—" },
      { key: "status", label: "Status", width: "1.5fr", render: statusBadge },
    ]}
    rows={mockData.blogit}
  />
);

const MarkkinointiView = () => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: COLORS.charcoal, margin: 0, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Markkinointi</h2>
        <p style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 14 }}>{mockData.markkinointi.length} kampanjaa</p>
      </div>
      <button style={{
        background: COLORS.terracotta, color: "#fff",
        border: "none", borderRadius: 8, padding: "10px 20px",
        fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
      }}>+ Uusi kampanja</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
      {[
        { label: "Klikkaukset (kaikki)", value: mockData.markkinointi.reduce((s, k) => s + k.klikkaukset, 0).toLocaleString("fi-FI"), icon: "👆" },
        { label: "Liidit (kaikki)", value: mockData.markkinointi.reduce((s, k) => s + k.liidit, 0), icon: "🎯" },
        { label: "Aktiiviset kampanjat", value: mockData.markkinointi.filter(k => k.status === "aktiivinen").length, icon: "🚀" },
      ].map(stat => (
        <div key={stat.label} style={{
          background: COLORS.white, borderRadius: 12, padding: 20,
          border: `1px solid ${COLORS.sandDark}`,
          boxShadow: "0 1px 4px rgba(11,61,107,0.06)",
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.aegean, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{stat.value}</div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>{stat.label}</div>
        </div>
      ))}
    </div>
    <TableView
      title=""
      count={mockData.markkinointi.length}
      addLabel=""
      columns={[
        { key: "kampanja", label: "Kampanja", width: "2fr" },
        { key: "kanava", label: "Kanava", width: "1.5fr" },
        { key: "budjetti", label: "Budjetti", width: "1fr" },
        { key: "klikkaukset", label: "Klikkaukset", width: "1fr", render: v => v.toLocaleString("fi-FI") },
        { key: "liidit", label: "Liidit", width: "0.8fr" },
        { key: "status", label: "Status", width: "1.5fr", render: statusBadge },
      ]}
      rows={mockData.markkinointi}
    />
  </div>
);

const views = {
  tiimi: <TiimitView />,
  kumppanit: <KumppaneitView />,
  kohteet: <KohteetView />,
  blogit: <BlogitView />,
  markkinointi: <MarkkinointiView />,
};

export default function App() {
  const [active, setActive] = useState("kohteet");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #C4C0B8; border-radius: 3px; }
        @media (max-width: 768px) {
          .sidebar { display: none !important; }
          .sidebar.mobile-open { display: flex !important; position: fixed; z-index: 100; height: 100vh; }
          .mobile-toggle { display: flex !important; }
          .main-content { margin-left: 0 !important; }
        }
        @media (min-width: 769px) {
          .mobile-toggle { display: none !important; }
          .mobile-overlay { display: none !important; }
        }
      `}</style>
      <div style={{ display: "flex", height: "100vh", background: COLORS.sand, fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>

        {/* Sidebar */}
        <div className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`} style={{
          width: sidebarOpen ? 240 : 72,
          background: COLORS.aegean,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{
            padding: "24px 20px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            minHeight: 76,
          }}>
            <div style={{
              width: 36, height: 36, flexShrink: 0,
              background: COLORS.terracotta,
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>🏛️</div>
            {sidebarOpen && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "0.01em", whiteSpace: "nowrap" }}>Kotikreikasta</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500, letterSpacing: "0.05em" }}>ADMIN</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => { setActive(item.key); setMobileMenuOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: active === item.key ? "rgba(255,255,255,0.15)" : "transparent",
                  color: active === item.key ? "#fff" : "rgba(255,255,255,0.6)",
                  fontWeight: active === item.key ? 600 : 400,
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                  textAlign: "left",
                  transition: "background 0.15s, color 0.15s",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  borderLeft: active === item.key ? `3px solid ${COLORS.terracotta}` : "3px solid transparent",
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Collapse toggle (desktop only) */}
          <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mobile-toggle-desktop"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none", borderRadius: 8,
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                padding: "8px 12px",
                fontSize: 18,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarOpen ? "flex-end" : "center",
                gap: 8,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {sidebarOpen ? "◀" : "▶"}
            </button>
          </div>
        </div>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="mobile-overlay"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99,
            }}
          />
        )}

        {/* Main area */}
        <div className="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Topbar */}
          <div style={{
            background: COLORS.white,
            borderBottom: `1px solid ${COLORS.sandDark}`,
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                className="mobile-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 20, color: COLORS.charcoal,
                  display: "none", // overridden by CSS media query
                }}
              >☰</button>
              <div style={{ fontSize: 13, color: COLORS.muted }}>
                <span style={{ color: COLORS.charcoal, fontWeight: 500 }}>
                  {navItems.find(n => n.key === active)?.label}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button style={{
                background: "none", border: `1px solid ${COLORS.sandDark}`,
                borderRadius: 8, padding: "6px 14px",
                fontSize: 13, color: COLORS.muted, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>🔔 Ilmoitukset</button>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: COLORS.aegean,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>JM</div>
            </div>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflow: "auto",
            padding: 28,
            background: COLORS.surface,
          }}>
            {views[active]}
          </div>
        </div>
      </div>
    </>
  );
}