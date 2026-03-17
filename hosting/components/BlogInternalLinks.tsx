import Link from "next/link";

export default function BlogInternalLinks() {
  return (
    <aside
      style={{
        marginTop: "3rem",
        padding: "2rem",
        background: "var(--sand)",
        borderRadius: 4,
        border: "1px solid var(--border)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.5rem",
          fontWeight: 400,
          marginBottom: "1rem",
        }}
      >
        Lue lisää
      </h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Tutustu muihin hyödyllisiin artikkeleihin ja palveluihimme:
      </p>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: "1rem",
        }}
      >
        <li>
          <Link
            href="/ostoprosessi"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem",
              background: "white",
              borderRadius: 4,
              textDecoration: "none",
              color: "var(--text)",
              border: "1px solid var(--border)",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🏠</span>
            <div>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                Ostoprosessi
              </strong>
              <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Askel askeleelta -opas kiinteistön ostamiseen Kreikassa
              </span>
            </div>
          </Link>
        </li>
        <li>
          <Link
            href="/alueet"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem",
              background: "white",
              borderRadius: 4,
              textDecoration: "none",
              color: "var(--text)",
              border: "1px solid var(--border)",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🗺️</span>
            <div>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                Alueet
              </strong>
              <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Tutustu Kreikan suosituimpiin alueisiin ja niiden ominaisuuksiin
              </span>
            </div>
          </Link>
        </li>
        <li>
          <Link
            href="/tasmahaku"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem",
              background: "white",
              borderRadius: 4,
              textDecoration: "none",
              color: "var(--text)",
              border: "1px solid var(--border)",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🔍</span>
            <div>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                Täsmähaku
              </strong>
              <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Etsi unelmiesi koti tarkennetuilla hakuehdoilla
              </span>
            </div>
          </Link>
        </li>
        <li>
          <Link
            href="/konsierge"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem",
              background: "white",
              borderRadius: 4,
              textDecoration: "none",
              color: "var(--text)",
              border: "1px solid var(--border)",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🤝</span>
            <div>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                Konsiergepalvelu
              </strong>
              <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Henkilökohtainen apu kiinteistöasioissa Kreikassa
              </span>
            </div>
          </Link>
        </li>
        <li>
          <Link
            href="/blog"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem",
              background: "white",
              borderRadius: 4,
              textDecoration: "none",
              color: "var(--text)",
              border: "1px solid var(--border)",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>📚</span>
            <div>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                Kaikki artikkelit
              </strong>
              <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Selaa kaikkia asiantuntija-artikkeleitamme
              </span>
            </div>
          </Link>
        </li>
      </ul>
    </aside>
  );
}
