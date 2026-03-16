export default function TrustBar() {
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: 'var(--space-2xl)',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color: 'var(--gold)',
              marginBottom: 'var(--space-sm)'
            }}>
              100%
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Suomenkielinen palvelu
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Koko prosessi suomeksi – neuvottelusta sopimuksiin
            </p>
          </div>

          <div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color: 'var(--gold)',
              marginBottom: 'var(--space-sm)'
            }}>
              12kk
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Konsierge-tuki
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Vuoden tuki kaupan jälkeen – huoletta uuteen kotiin
            </p>
          </div>

          <div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color: 'var(--gold)',
              marginBottom: 'var(--space-sm)'
            }}>
              EU
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Lakisääteinen turva
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Kreikan ja Suomen lait suojaavat sijoitustasi
            </p>
          </div>

          <div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color: 'var(--gold)',
              marginBottom: 'var(--space-sm)'
            }}>
              10+
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Vuotta kokemusta
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Syvä tuntemus Kreikan kiinteistömarkkinoista
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
