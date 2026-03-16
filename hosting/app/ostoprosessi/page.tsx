import NavBar from "../../components/nav-bar";
import Footer from "../../components/Footer";

export default function OstoprosessiPage() {
  return (
    <>
      <NavBar />
      
      <section style={{ 
        background: 'var(--cream)',
        padding: 'var(--space-3xl) 0',
        marginTop: '72px'
      }}>
        <div className="container">
          <p className="section-label">Ostoprosessi</p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: 400,
            lineHeight: 1.2,
            color: 'var(--text)',
            marginBottom: 'var(--space-lg)'
          }}>
            Viisi askelta lomakodin <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>ostamiseen</em> Kreikasta
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.125rem',
            lineHeight: 1.7,
            color: 'var(--text-mid)',
            maxWidth: '720px'
          }}>
            Olemme täällä auttamassa sinua joka askeleella. Ota yhteyttä, niin aloitat turvallisen ja vaivattoman kiinteistönoston Kreikassa.
          </p>
        </div>
      </section>

      <section style={{ padding: 'var(--space-3xl) 0' }}>
        <div className="container">
          <div style={{ 
            display: 'grid',
            gap: 'var(--space-2xl)',
            maxWidth: '920px',
            margin: '0 auto'
          }}>
            {/* Step 1 */}
            <article style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: 'var(--space-2xl)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)'
              }}>
                <div style={{
                  fontSize: '3rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                  minWidth: '60px'
                }}>
                  1
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.75rem',
                    fontWeight: 400,
                    color: 'var(--text)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.3
                  }}>
                    Ota yhteyttä Kotikreikasta.com-tiimiin
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    color: 'var(--text-mid)',
                    margin: 0
                  }}>
                    Meillä on valmius auttaa sinua kaikissa ostoprosessin vaiheissa. Aloitamme sopivan kiinteistön etsinnän ja hoidamme kreikkalaisen verotunnuksen (ΑΦΜ) hankkimisen puolestasi. Meidän tiimimme avustaa myös pankkitilin avaamisessa Kreikassa, mikä on tarpeen kaupan maksuliikenteessä.
                  </p>
                </div>
              </div>
            </article>

            {/* Step 2 */}
            <article style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: 'var(--space-2xl)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)'
              }}>
                <div style={{
                  fontSize: '3rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                  minWidth: '60px'
                }}>
                  2
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.75rem',
                    fontWeight: 400,
                    color: 'var(--text)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.3
                  }}>
                    Valitse kiinteistö ja tarkista sen laillinen status
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    color: 'var(--text-mid)',
                    margin: 0
                  }}>
                    Meidän paikalliset kumppanivälittäjät ja asiantuntijat auttavat sinua löytämään sopivan kiinteistön. Varmistamme, että kiinteistöllä ei ole velkoja tai laillisia esteitä, ja tarkistamme sen omistusoikeuden ja rasitteet Kreikan kiinteistörekisteristä (Κτηματολόγιο).
                  </p>
                </div>
              </div>
            </article>

            {/* Step 3 */}
            <article style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: 'var(--space-2xl)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)'
              }}>
                <div style={{
                  fontSize: '3rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                  minWidth: '60px'
                }}>
                  3
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.75rem',
                    fontWeight: 400,
                    color: 'var(--text)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.3
                  }}>
                    Hyödynnä meidän luotettavaa asianajajaverkostoamme
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    color: 'var(--text-mid)',
                    margin: 0
                  }}>
                    Meidän tiimimme työskentelee yhdessä paikallisten asianajajien kanssa, jotka hoitavat kaupan dokumentit ja varmistavat, että kaikki paperit ovat kunnossa. He edustavat sinua notaarin edessä, jotta kauppa etenee sujuvasti ja turvallisesti.
                  </p>
                </div>
              </div>
            </article>

            {/* Step 4 */}
            <article style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: 'var(--space-2xl)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)'
              }}>
                <div style={{
                  fontSize: '3rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                  minWidth: '60px'
                }}>
                  4
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.75rem',
                    fontWeight: 400,
                    color: 'var(--text)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.3
                  }}>
                    Allekirjoita kauppakirja notaarin edessä
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    color: 'var(--text-mid)',
                    margin: 0
                  }}>
                    Me järjestämme notaarin toimistossa tapaamisen, jossa allekirjoitetaan kauppakirja (συμβόλαιο αγοράς). Hoidamme myös siirtoveron (yleensä 3 %) ja muut kauppaan liittyvät maksut puolestasi.
                  </p>
                </div>
              </div>
            </article>

            {/* Step 5 */}
            <article style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: 'var(--space-2xl)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)'
              }}>
                <div style={{
                  fontSize: '3rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                  minWidth: '60px'
                }}>
                  5
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.75rem',
                    fontWeight: 400,
                    color: 'var(--text)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.3
                  }}>
                    Rekisteröi omistusoikeus ja aloita lomanvietto
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    color: 'var(--text-mid)',
                    margin: 0
                  }}>
                    Me huolehdimme kiinteistön omistusoikeuden rekisteröinnistä ja autamme tarvittaessa sähkö-, vesi- ja internetliittymien hankinnassa. Voit keskittyä lomanviettoon, kun me hoidamme kaikki käytännön asiat.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Important Notes Section */}
      <section style={{ 
        background: 'var(--sand)',
        padding: 'var(--space-3xl) 0',
        borderTop: '1px solid var(--border)'
      }}>
        <div className="container">
          <div style={{ maxWidth: '920px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 400,
              color: 'var(--text)',
              marginBottom: 'var(--space-xl)',
              lineHeight: 1.3
            }}>
              Huomioitavaa
            </h2>
            
            <div style={{ 
              display: 'grid',
              gap: 'var(--space-lg)'
            }}>
              <div style={{
                background: 'var(--white)',
                border: '1px solid var(--border-light)',
                borderLeft: '4px solid var(--gold)',
                borderRadius: '4px',
                padding: 'var(--space-lg)'
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: 'var(--space-sm)',
                  letterSpacing: '0.02em'
                }}>
                  Rajoitusalueet
                </h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: 'var(--text-mid)',
                  margin: 0
                }}>
                  Joillakin alueilla ulkomaalaiset tarvitsevat erillisen luvan kiinteistön ostoon. Meidän tiimimme tarkistaa, koskeeko rajoitus haluamaasi kohdetta.
                </p>
              </div>

              <div style={{
                background: 'var(--white)',
                border: '1px solid var(--border-light)',
                borderLeft: '4px solid var(--gold)',
                borderRadius: '4px',
                padding: 'var(--space-lg)'
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: 'var(--space-sm)',
                  letterSpacing: '0.02em'
                }}>
                  Verot
                </h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: 'var(--text-mid)',
                  margin: 0
                }}>
                  Kiinteistön omistamisesta maksetaan vuosittain kiinteistövero (ΕΝΦΙΑ). Me neuvomme sinua verovelvoitteissasi ja autamme tarvittaessa verojen maksamisessa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        background: 'var(--cream)',
        padding: 'var(--space-3xl) 0',
        textAlign: 'center'
      }}>
        <div className="container">
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: 400,
            color: 'var(--text)',
            marginBottom: 'var(--space-lg)',
            lineHeight: 1.3
          }}>
            Aloita <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>matkasi</em> kohti kreikkalaista kotia
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.0625rem',
            lineHeight: 1.7,
            color: 'var(--text-mid)',
            maxWidth: '600px',
            margin: '0 auto var(--space-xl)'
          }}>
            Olemme täällä auttamassa sinua joka askeleella. Ota yhteyttä, niin aloitat turvallisen ja vaivattoman kiinteistönoston Kreikassa.
          </p>
          <a href="/#listings" className="btn-primary">
            Tutustu kohteisiin
          </a>
        </div>
      </section>

      <Footer />
    </>
  );
}
