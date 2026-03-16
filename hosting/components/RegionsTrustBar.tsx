export default function RegionsTrustBar() {
  return (
    <section 
      style={{ 
        background: 'var(--cream)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: 'var(--space-2xl) 0'
      }}
    >
      <div className="container">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: 'var(--space-xl)',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ 
              fontSize: '2.25rem', 
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color: 'var(--gold)',
              marginBottom: 'var(--space-sm)'
            }}>
              9
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Aluetta
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Kreeta, Korfu, Peloponnesos ja muut
            </p>
          </div>

          <div>
            <div style={{ 
              fontSize: '2.25rem', 
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color: 'var(--gold)',
              marginBottom: 'var(--space-sm)'
            }}>
              ∞
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Kohdevalikoima
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Edullisista luksuskiinteistöihin
            </p>
          </div>

          <div>
            <div style={{ 
              fontSize: '2.25rem', 
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color: 'var(--gold)',
              marginBottom: 'var(--space-sm)'
            }}>
              FI
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Paikallinen tuki
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Suomenkielinen apu kaikilla alueilla
            </p>
          </div>

          <div>
            <div style={{ 
              fontSize: '2.25rem', 
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color: 'var(--gold)',
              marginBottom: 'var(--space-sm)'
            }}>
              365
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Päivää auringossa
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Kreikan ilmasto sopii ympärivuotiseen asumiseen
            </p>
          </div>

          <div>
            <div style={{ 
              fontSize: '2.25rem', 
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color: 'var(--gold)',
              marginBottom: 'var(--space-sm)'
            }}>
              ✈
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Lentoyhteydet
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Suorat lennot Suomesta kesäisin
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
