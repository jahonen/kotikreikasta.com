export default function ProcessTrustBar() {
  return (
    <section 
      style={{ 
        background: 'var(--white)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: 'var(--space-2xl) 0'
      }}
    >
      <div className="container">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
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
              ΑΦΜ
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Verotunnus
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Hoidamme kreikkalaisen verotunnuksen puolestasi
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
              3%
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Siirtovero
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Hoidamme kaikki kauppaan liittyvät maksut
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
              Laillinen tarkistus
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Varmistamme kiinteistön omistusoikeuden ja rasitteet
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
              5
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Selkeää askelta
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Turvallinen prosessi alusta loppuun
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
              Asianajajaverkosto
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Luotettavat paikalliset kumppanit edustavat sinua
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
