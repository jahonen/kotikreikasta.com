import NavBar from "../../components/nav-bar";
import Footer from "../../components/Footer";
import ContactForm from "../../components/ContactForm";

export default function TasmahakuPage() {
  return (
    <>
      <NavBar />
      
      <section style={{ 
        background: 'var(--cream)',
        padding: 'var(--space-3xl) 0',
        marginTop: '72px'
      }}>
        <div className="container">
          <p className="section-label">Täsmähaku-palvelu</p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: 400,
            lineHeight: 1.2,
            color: 'var(--text)',
            marginBottom: 'var(--space-lg)'
          }}>
            Löydämme sinulle <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>unelmiesi</em> lomakodin Kreikasta
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.125rem',
            lineHeight: 1.7,
            color: 'var(--text-mid)',
            maxWidth: '820px'
          }}>
            Kreikka tarjoaa lukemattomia mahdollisuuksia loma-asunnon ostajalle, mutta oikean kohteen löytäminen voi olla haastavaa – varsinkin, jos et tunne aluetta tai kreikankielistä kiinteistömarkkinaa. <strong>Kotikreikasta.comin Täsmähaku-palvelu</strong> on ratkaisu juuri sinulle, joka etsit tarkalleen sinun toiveisiisi ja tarpeisiisi sopivaa kiinteistöä. Emme tyydy tarjoamaan valmiita listauksia, vaan etsimme juuri sen kodin, joka vastaa unelmiesi kriteerejä.
          </p>
        </div>
      </section>

      <section style={{ padding: 'var(--space-3xl) 0' }}>
        <div className="container">
          <div style={{ maxWidth: '920px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 400,
              color: 'var(--text)',
              marginBottom: 'var(--space-2xl)',
              lineHeight: 1.3
            }}>
              Miten Täsmähaku <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>toimii?</em>
            </h2>

            <div style={{ 
              display: 'grid',
              gap: 'var(--space-2xl)'
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
                  marginBottom: 'var(--space-md)'
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
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.75rem',
                      fontWeight: 400,
                      color: 'var(--text)',
                      marginBottom: 'var(--space-md)',
                      lineHeight: 1.3
                    }}>
                      Toiveiden kartoitus
                    </h3>
                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: 'var(--text-mid)',
                      marginBottom: 'var(--space-md)'
                    }}>
                      Kerro meille, millainen lomakoti sinua kiinnostaa. Olipa kyseessä rannan tuntumassa sijaitseva huvila, perinteinen kylätalo vuoristossa tai moderni asunto kaupungin lähellä, kuvailemme yhdessä unelmiesi kiinteistön. Tärkeimmät kriteerit voivat olla esimerkiksi:
                    </p>
                    <ul style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9375rem',
                      lineHeight: 1.7,
                      color: 'var(--text-mid)',
                      paddingLeft: 'var(--space-lg)',
                      margin: 0
                    }}>
                      <li>Sijainti (saari, kaupunki, kylä, rannan läheisyys)</li>
                      <li>Koko ja tontin laajuus</li>
                      <li>Budjetti ja mahdolliset rahoitusvaihtoehdot</li>
                      <li>Palvelut (uima-allas, merinäköala, läheiset ravintolat, terveyspalvelut)</li>
                      <li>Vuokrausmahdollisuudet tai pitkäaikainen asuttavuus</li>
                    </ul>
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
                  gap: 'var(--space-lg)'
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
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.75rem',
                      fontWeight: 400,
                      color: 'var(--text)',
                      marginBottom: 'var(--space-md)',
                      lineHeight: 1.3
                    }}>
                      Ammattitaitoinen etsintä
                    </h3>
                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: 'var(--text-mid)',
                      margin: 0
                    }}>
                      Hyödynnämme laajaa paikallista verkostoamme, joka koostuu luotetuista kiinteistönvälittäjistä, asianajajista ja rakennusasiantuntijoista. Etsimme markkinoilta myös niitä kohteita, jotka eivät ole julkisesti listattuina. Meillä on pääsy eksklusiivisiin tarjouksiin ja off-market-kiinteistöihin, joita et löydä itse.
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
                  gap: 'var(--space-lg)'
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
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.75rem',
                      fontWeight: 400,
                      color: 'var(--text)',
                      marginBottom: 'var(--space-md)',
                      lineHeight: 1.3
                    }}>
                      Laadukkaat ehdokkaat
                    </h3>
                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: 'var(--text-mid)',
                      marginBottom: 'var(--space-md)'
                    }}>
                      Valitsemme sinulle sopivimmat kohteet ja esittelemme ne yksityiskohtaisesti. Jokainen ehdokas tarkistetaan huolellisesti:
                    </p>
                    <ul style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9375rem',
                      lineHeight: 1.7,
                      color: 'var(--text-mid)',
                      paddingLeft: 'var(--space-lg)',
                      margin: 0
                    }}>
                      <li>Omistusoikeuden ja rasitteiden selvitys</li>
                      <li>Kiinteistön kunto ja mahdolliset remonttitarpeet</li>
                      <li>Paikalliset rakennusmääräykset ja verovelvoitteet</li>
                    </ul>
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
                  gap: 'var(--space-lg)'
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
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.75rem',
                      fontWeight: 400,
                      color: 'var(--text)',
                      marginBottom: 'var(--space-md)',
                      lineHeight: 1.3
                    }}>
                      Henkilökohtainen esittely
                    </h3>
                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: 'var(--text-mid)',
                      margin: 0
                    }}>
                      Järjestämme virtuaaliset tai paikan päällä tapahtuvat kierrokset, jotta voit tutustua kohteisiin ilman kiirettä. Tarvittaessa järjestämme myös suomenkielisen asiantuntijan paikalle avuksesi.
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
                  gap: 'var(--space-lg)'
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
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.75rem',
                      fontWeight: 400,
                      color: 'var(--text)',
                      marginBottom: 'var(--space-md)',
                      lineHeight: 1.3
                    }}>
                      Turvallinen ostoprosessi
                    </h3>
                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: 'var(--text-mid)',
                      marginBottom: 'var(--space-md)'
                    }}>
                      Kun olet löytänyt sopivan kohteen, hoidamme kaiken byrokratian puolestasi:
                    </p>
                    <ul style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9375rem',
                      lineHeight: 1.7,
                      color: 'var(--text-mid)',
                      paddingLeft: 'var(--space-lg)',
                      margin: 0
                    }}>
                      <li>Kreikkalaisen verotunnuksen (ΑΦΜ) hankinta</li>
                      <li>Asianajajan avustuksella tapahtuvat sopimukset ja notaarin edessä allekirjoitettava kauppakirja</li>
                      <li>Kiinteistön rekisteröinti ja jälkitoimet, kuten sähkö-, vesi- ja internetliittymien järjestäminen</li>
                    </ul>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section style={{ 
        background: 'var(--sand)',
        padding: 'var(--space-3xl) 0',
        borderTop: '1px solid var(--border)'
      }}>
        <div className="container">
          <div style={{ maxWidth: '920px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 400,
              color: 'var(--text)',
              marginBottom: 'var(--space-2xl)',
              lineHeight: 1.3
            }}>
              Miksi valita <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Täsmähaku?</em>
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
                  Säästät aikaa ja vaivaa
                </h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: 'var(--text-mid)',
                  margin: 0
                }}>
                  Me teemme työn puolestasi ja esittelemme vain sinulle sopivia kohteita.
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
                  Pääset katsomaan myös piilomarkkinoilla olevia kiinteistöjä
                </h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: 'var(--text-mid)',
                  margin: 0
                }}>
                  Monet parhaat kohteet eivät ole julkisesti myynnissä.
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
                  Saat asiantuntevaa tukea
                </h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: 'var(--text-mid)',
                  margin: 0
                }}>
                  Meillä on syvällinen ymmärrys Kreikan kiinteistömarkkinoista ja paikallisista käytänteistä.
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
                  Turvallinen prosessi
                </h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: 'var(--text-mid)',
                  margin: 0
                }}>
                  Varmistamme, että kaikki paperityöt ja lailliset seikat ovat kunnossa ennen kaupan tekemistä.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section style={{ padding: 'var(--space-3xl) 0' }}>
        <div className="container">
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 400,
              color: 'var(--text)',
              marginBottom: 'var(--space-lg)',
              lineHeight: 1.3,
              textAlign: 'center'
            }}>
              Ota <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>yhteyttä</em>
            </h2>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.0625rem',
              lineHeight: 1.7,
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-2xl)',
              textAlign: 'center'
            }}>
              Täytä yhteydenottolomake, niin aloitat matkasi kohti unelmiesi lomakotia. Kerro meille toiveistasi, niin me huolehdimme lopusta. <strong>Kotikreikasta.com on ainoa palvelu, joka tarjoaa suomalaisille räätälöityä täsmähakua Kreikan kiinteistömarkkinoilta.</strong>
            </p>

            <ContactForm source={{ type: 'content', slug: 'tasmahaku', title: 'Täsmähaku-palvelu', url: '/tasmahaku' }} />

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              marginTop: 'var(--space-lg)',
              textAlign: 'center'
            }}>
              Huomioithan, että Täsmähaku-palvelu on erillinen toimeksianto, ja sen ehdot sovitaan tapauskohtaisesti.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
