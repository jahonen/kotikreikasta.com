export default function TasmahakuTrustBar() {
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
              🔍
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Täsmähaku
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Räätälöity etsintä juuri sinun toiveillesi
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
              OFF
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Piilomarkkinat
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Pääsy julkaisemattomiin kohteisiin
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
              1:1
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Henkilökohtainen
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Omistettu asiantuntija etsinnässäsi
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
              ✓
            </div>
            <div style={{ 
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-xs)'
            }}>
              Tarkistetut kohteet
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Jokainen ehdokas huolellisesti selvitetty
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
              Suomenkielinen tuki
            </div>
            <p style={{ 
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Koko prosessi omalla kielelläsi
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
