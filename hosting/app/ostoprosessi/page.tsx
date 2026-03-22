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
              padding: 'clamp(1.5rem, 4vw, 2.5rem)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'clamp(1rem, 3vw, 1.5rem)',
                flexDirection: 'row'
              }}>
                <div style={{
                  fontSize: 'clamp(2.5rem, 6vw, 3rem)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                  minWidth: 'clamp(50px, 10vw, 60px)',
                  flexShrink: 0
                }}>
                  1
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.375rem, 3.5vw, 1.75rem)',
                    fontWeight: 400,
                    color: 'var(--text)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.3
                  }}>
                    Löydä
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(0.9375rem, 2vw, 1rem)',
                    lineHeight: 1.7,
                    color: 'var(--text-mid)',
                    margin: 0
                  }}>
                    Tutustu kohteisiin ja alueeseen. Kotikreikasta.com esittelee sinulle Kreikan kiinteistömarkkinat, alueen erityispiirteet ja sopivat kohteet suomeksi. Kartoitat yhdessä kanssamme tarpeitasi vastaavat vaihtoehdot.
                  </p>
                </div>
              </div>
            </article>

            {/* Step 2 */}
            <article style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: 'clamp(1.5rem, 4vw, 2.5rem)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'clamp(1rem, 3vw, 1.5rem)',
                flexDirection: 'row'
              }}>
                <div style={{
                  fontSize: 'clamp(2.5rem, 6vw, 3rem)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                  minWidth: 'clamp(50px, 10vw, 60px)',
                  flexShrink: 0
                }}>
                  2
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.375rem, 3.5vw, 1.75rem)',
                    fontWeight: 400,
                    color: 'var(--text)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.3
                  }}>
                    Valmistaudu
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(0.9375rem, 2vw, 1rem)',
                    lineHeight: 1.7,
                    color: 'var(--text-mid)',
                    margin: 0
                  }}>
                    Ennen kuin mitään sitovaa tapahtuu, hankitaan kaikki kaupanteon edellytykset kuntoon: kreikkalainen veronumero (AFM), valtakirja paikalliselle asianajajalle, kreikkalainen pankkitili sekä selkeä laskelma kaikista kaupan kustannuksista.
                  </p>
                </div>
              </div>
            </article>

            {/* Step 3 */}
            <article style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: 'clamp(1.5rem, 4vw, 2.5rem)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'clamp(1rem, 3vw, 1.5rem)',
                flexDirection: 'row'
              }}>
                <div style={{
                  fontSize: 'clamp(2.5rem, 6vw, 3rem)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                  minWidth: 'clamp(50px, 10vw, 60px)',
                  flexShrink: 0
                }}>
                  3
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.375rem, 3.5vw, 1.75rem)',
                    fontWeight: 400,
                    color: 'var(--text)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.3
                  }}>
                    Tarkista
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(0.9375rem, 2vw, 1rem)',
                    lineHeight: 1.7,
                    color: 'var(--text-mid)',
                    margin: 0
                  }}>
                    Itsenäinen asianajaja tekee kohteesta lakisääteisen due diligence -tarkastuksen: omistushistoria, rasitteet, rakennusluvat, yhtiövastikevelat. Kauppaan edetään vasta kun tarkastus on puhdas.
                  </p>
                </div>
              </div>
            </article>

            {/* Step 4 */}
            <article style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: 'clamp(1.5rem, 4vw, 2.5rem)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'clamp(1rem, 3vw, 1.5rem)',
                flexDirection: 'row'
              }}>
                <div style={{
                  fontSize: 'clamp(2.5rem, 6vw, 3rem)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                  minWidth: 'clamp(50px, 10vw, 60px)',
                  flexShrink: 0
                }}>
                  4
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.375rem, 3.5vw, 1.75rem)',
                    fontWeight: 400,
                    color: 'var(--text)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.3
                  }}>
                    Tee kauppa
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(0.9375rem, 2vw, 1rem)',
                    lineHeight: 1.7,
                    color: 'var(--text-mid)',
                    margin: 0
                  }}>
                    Paikallinen kiinteistönvälittäjä johtaa kaupanteon: hintaneuvottelu, esisopimus, käsiraha, kauppakirja notaarin luona ja lainhuudon kirjaaminen. Asianajajasi on läsnä ja toimii kanssasi.
                  </p>
                </div>
              </div>
            </article>

            {/* Step 5 */}
            <article style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: 'clamp(1.5rem, 4vw, 2.5rem)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'clamp(1rem, 3vw, 1.5rem)',
                flexDirection: 'row'
              }}>
                <div style={{
                  fontSize: 'clamp(2.5rem, 6vw, 3rem)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                  minWidth: 'clamp(50px, 10vw, 60px)',
                  flexShrink: 0
                }}>
                  5
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.375rem, 3.5vw, 1.75rem)',
                    fontWeight: 400,
                    color: 'var(--text)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.3
                  }}>
                    Ota haltuun
                  </h2>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(0.9375rem, 2vw, 1rem)',
                    lineHeight: 1.7,
                    color: 'var(--text-mid)',
                    margin: 0
                  }}>
                    Kaupan jälkeen huolehditaan käytännön asioista: sähkö- ja vesisopimukset, kiinteistöveron rekisteröinti, tarvittaessa lyhytaikaisen vuokrauksen luvat sekä opastus Suomen verottajaa koskevissa velvoitteissa.
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
