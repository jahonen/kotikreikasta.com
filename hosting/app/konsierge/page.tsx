import NavBar from "../../components/nav-bar";
import Footer from "../../components/Footer";
import ContactForm from "../../components/ContactForm";

export default function KonsiergePage() {
  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Konsierge-palvelu Kreikassa',
    description: 'Kerro meille tarpeesi suomeksi. Selvitämme tilanteen, löydämme luotettavan paikallisen ammattilaisen ja varmistamme, että työ tulee tehdyksi oikein.',
    url: 'https://kotikreikasta.com/konsierge',
    provider: {
      '@type': 'Organization',
      name: 'Kotikreikasta',
      url: 'https://kotikreikasta.com'
    },
    areaServed: { '@type': 'Country', name: 'Greece' },
    availableLanguage: ['Finnish', 'Greek', 'English'],
    offers: [
      {
        '@type': 'Offer',
        name: 'Tervetuloa kotiin – ostajille',
        description: 'Kaikki palvelualueet käytössä, 12 ensimmäistä kuukautta veloituksetta kiinteistön ostajille.',
        price: '0',
        priceCurrency: 'EUR',
        eligibleDuration: { '@type': 'QuantitativeValue', value: 12, unitCode: 'MON' },
        availability: 'https://schema.org/InStock'
      },
      {
        '@type': 'Offer',
        name: 'Jatkuva tuki – palvelusopimus',
        description: 'Kaikki palvelualueet käytössä, hätätilanteet, rajaton määrä pyyntöjä. Sitoutumaton kuukausisopimus.',
        price: '39',
        priceCurrency: 'EUR',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '39',
          priceCurrency: 'EUR',
          unitCode: 'MON'
        },
        availability: 'https://schema.org/InStock'
      }
    ]
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Mitä konsierge-palvelu tarkoittaa käytännössä?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Kerrot meille tarpeesi suomeksi – esimerkiksi putkirikon, korjaustarpeen tai viranomaiskysymyksen. Me selvitämme tilanteen, löydämme luotettavan paikallisen ammattilaisen ja varmistamme, että työ tulee tehdyksi oikein.'
        }
      },
      {
        '@type': 'Question',
        name: 'Maksan suoraan ammattilaiselle – mitä te saatte siitä?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Ansaitsemme kuukausimaksulla, emme välityspalkkioilla ammattilaisilta. Tämä tarkoittaa, että suosituksemme perustuvat aina sinun etuusi, ei omaan ansaintaamme.'
        }
      },
      {
        '@type': 'Question',
        name: 'Kuinka paljon konsierge-palvelu maksaa?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Kiinteistön kautta meiltä ostaneille palvelu on veloitukseton 12 ensimmäistä kuukautta. Jatkuva palvelusopimus on 39 €/kk ilman sitoutumista. Emme peri välityspalkkioita ammattilaisilta.'
        }
      },
      {
        '@type': 'Question',
        name: 'Toimiiko palvelu koko Kreikassa?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Kyllä. Palvelu toimii koko Kreikassa, myös syrjäisemmillä alueilla joille paikallisen ammattilaisen löytäminen on haastavaa.'
        }
      },
      {
        '@type': 'Question',
        name: 'Mitä tapahtuu hätätilanteessa?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Palvelusopimuksella olevat asiakkaat voivat tavoittaa meidät myös normaalin aukioloajan ulkopuolella kiireellisissä tilanteissa kuten vesivuodoissa tai sähkökatkoissa.'
        }
      }
    ]
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Etusivu', item: 'https://kotikreikasta.com' },
      { '@type': 'ListItem', position: 2, name: 'Konsierge-palvelu', item: 'https://kotikreikasta.com/konsierge' }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <NavBar />

      {/* Hero */}
      <section className="hero" style={{ marginTop: '72px' }}>
        <div
          className="hero-bg"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1800&q=85')",
          }}
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow" style={{ 
            fontFamily: 'var(--font-body)',
            fontSize: '0.6875rem',
            fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: 'var(--space-lg)'
          }}>
            Kotikreikasta.com · Konsierge-palvelu
          </p>
          <h1 className="hero-title">
            Kreikka hoituu –<br /><em>sinä nautit.</em>
          </h1>
          <p className="hero-sub">
            Kerro meille tarpeesi suomeksi. Selvitämme tilanteen, löydämme luotettavan paikallisen ammattilaisen ja varmistamme, että työ tulee tehdyksi oikein – vaikka talosi osoite ei löytyisi kreikkalaisista rekistereistä.
          </p>
          <div style={{ 
            display: 'flex', 
            gap: 'var(--space-sm)', 
            flexWrap: 'wrap', 
            marginBottom: 'var(--space-2xl)' 
          }}>
            <span style={{
              border: '1px solid rgba(201,169,110,0.4)',
              color: 'var(--gold-light)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              padding: '0.4rem 1rem',
              backdropFilter: 'blur(4px)'
            }}>Yhteys suomeksi</span>
            <span style={{
              border: '1px solid rgba(201,169,110,0.4)',
              color: 'var(--gold-light)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              padding: '0.4rem 1rem',
              backdropFilter: 'blur(4px)'
            }}>Luotetut paikalliset kumppanit</span>
            <span style={{
              border: '1px solid rgba(201,169,110,0.4)',
              color: 'var(--gold-light)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              padding: '0.4rem 1rem',
              backdropFilter: 'blur(4px)'
            }}>12 kk ilmaiseksi ostajille</span>
            <span style={{
              border: '1px solid rgba(201,169,110,0.4)',
              color: 'var(--gold-light)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              padding: '0.4rem 1rem',
              backdropFilter: 'blur(4px)'
            }}>Maksat suoraan tekijälle</span>
          </div>
          <div className="hero-btns">
            <a href="#yhteys" className="btn-primary">
              Lähetä palvelupyyntö
            </a>
            <a href="#miten" className="btn-outline">
              Miten se toimii?
            </a>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section style={{
        background: 'var(--aegean-deep)',
        padding: '1.5rem 1.25rem',
        borderBottom: '1px solid rgba(201,169,110,0.15)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(1rem, 3vw, 2rem)',
          flexWrap: 'wrap',
          fontSize: 'clamp(0.7rem, 2vw, 0.78rem)',
          color: 'rgba(255,255,255,0.55)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🇫🇮 <strong style={{ color: 'var(--gold)', fontWeight: 500 }}>Suomenkielinen</strong> palvelu aina
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚡ Vastaus <strong style={{ color: 'var(--gold)', fontWeight: 500 }}>arkisin 24h</strong> sisällä
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔒 <strong style={{ color: 'var(--gold)', fontWeight: 500 }}>Ei maksuja meille</strong> – maksat suoraan tekijälle
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📍 Toimii <strong style={{ color: 'var(--gold)', fontWeight: 500 }}>koko Kreikassa</strong>
          </div>
        </div>
      </section>

      {/* What is it */}
      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
        minHeight: 'auto'
      }}>
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'clamp(300px, 50vh, 600px)' }}>
          <img 
            src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&q=80" 
            alt="Paikallinen ammattilainen Kreikassa"
            style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 'clamp(300px, 50vh, 600px)' }}
          />
          <div style={{
            position: 'absolute',
            bottom: '1.5rem',
            right: '1.5rem',
            background: 'rgba(10,20,35,0.78)',
            backdropFilter: 'blur(6px)',
            padding: '0.8rem 1.2rem',
            fontSize: '0.68rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--gold-light)'
          }}>
            📍 Paikallinen, luotettava ammattilainen
          </div>
        </div>
        <div style={{
          padding: 'clamp(3rem, 8vw, 6rem) clamp(1.25rem, 5vw, 5rem)',
          background: 'var(--sand)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <p className="section-label">Mikä tämä on?</p>
          <h2 className="section-title">
            Sinä kerrot suomeksi –<br /><em>me löydämme</em><br />oikean tekijän
          </h2>
          <p style={{
            fontSize: '1.1rem',
            fontWeight: 300,
            lineHeight: 1.8,
            color: 'var(--text)',
            marginTop: '1.8rem'
          }}>
            Loma-asunto Kreikassa on unelma – mutta kun vesipumppu hajoaa tai naapuri rakentaa liian lähelle rajaa, tarvitset apua. <strong style={{ fontWeight: 500, color: 'var(--aegean)' }}>Emme itse tee korjauksia</strong> – olemme se luotettava ihminen, joka tuntee paikallisen verkoston ja osaa löytää oikean tekijän oikeaan asiaan.
          </p>
          <div style={{
            marginTop: '2rem',
            borderLeft: '2px solid var(--gold)',
            paddingLeft: '1.4rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: 1.7
          }}>
            <strong>Maksat suoraan ammattilaiselle, ei meille.</strong> Emme peri tekijöiltä välityspalkkioita. Koska ansaitsemisemme ei riipu siitä, kenet suosittelemme, neuvomme perustuvat aina sinun etuusi.
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="miten" style={{ padding: 'clamp(4rem, 10vw, 8rem) clamp(1.25rem, 5vw, 4rem)', background: 'var(--white)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ marginBottom: '5rem' }}>
            <p className="section-label">Näin se toimii</p>
            <h2 className="section-title">
              Neljä askelta<br /><em>ongelmasta ratkaisuun</em>
            </h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: 'clamp(2rem, 5vw, 3rem)'
          }}>
            {[
              {
                num: '1',
                title: 'Kerro tarpeesi suomeksi',
                body: 'Lähetä viesti, WhatsApp tai sähköposti. Kerro mitä tarvitset – sinun ei tarvitse tietää kreikkalaisia termejä tai ammattinimikkeitä.',
                tag: 'Suomi riittää'
              },
              {
                num: '2',
                title: 'Selvitämme tarpeen',
                body: 'Selvitämme tarpeen, tarkistamme kiinteistöprofiilisi (sijainti, laitteet, historia) ja löydämme oikean paikallisen ammattilaisen.',
                tag: '24h kuittaus'
              },
              {
                num: '3',
                title: 'Saat ehdokkaat',
                body: 'Esittelemme yhden tai useamman luotettavan tekijän yhteystiedot ja arvioidun hintatason. Valinta on sinun.',
                tag: 'Hintatietoa mukana'
              },
              {
                num: '4',
                title: 'Työ tehdään',
                body: 'Sopimus ja maksu kulkevat suoraan sinun ja tekijän välillä. Tarvittaessa avustamme viestinnässä kielimuuri edessä.',
                tag: 'Sinä maksat tekijälle'
              }
            ].map((step) => (
              <div key={step.num} style={{ textAlign: 'center', padding: '0 clamp(0.5rem, 2vw, 1rem)' }}>
                <div style={{
                  width: '4.8rem',
                  height: '4.8rem',
                  borderRadius: '50%',
                  border: '1px solid var(--gold)',
                  background: 'var(--white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 2rem',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  color: 'var(--gold)'
                }}>
                  {step.num}
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.15rem',
                  fontWeight: 600,
                  color: 'var(--aegean-deep)',
                  marginBottom: '0.6rem'
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.7,
                  marginBottom: '0.8rem'
                }}>
                  {step.body}
                </p>
                <span style={{
                  display: 'inline-block',
                  background: 'var(--gold-pale)',
                  color: 'var(--gold)',
                  fontSize: '0.62rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.7rem'
                }}>
                  {step.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="palvelut" style={{
        padding: 'clamp(4rem, 10vw, 8rem) clamp(1.25rem, 5vw, 4rem)',
        background: 'var(--aegean-deep)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 'clamp(2rem, 5vw, 4rem)',
            alignItems: 'end',
            marginBottom: 'clamp(2rem, 5vw, 4rem)'
          }}>
            <div>
              <p className="section-label" style={{ color: 'var(--gold)' }}>Palvelualueet</p>
              <h2 className="section-title light">
                Mitä voimme<br /><em>auttaa löytämään</em>
              </h2>
            </div>
            <p style={{
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.8,
              fontWeight: 300
            }}>
              Emme rajaa apuamme tiettyihin aloihin – jos tarve on kohtuullinen ja laillinen, etsimme tekijän. Alla yleisimmät tilanteet, joissa autamme.
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
            gap: '1px',
            background: 'rgba(201,169,110,0.15)'
          }}>
            {[
              {
                icon: '🔧',
                name: 'Kodin korjaukset',
                desc: 'Putket, sähkö, katto, ikkunat, ovet. Löydämme paikallisen ammattilaisen myös syrjäisemmille alueille.',
                tags: ['Putkimies', 'Sähköasentaja', 'Kattotyöt']
              },
              {
                icon: '🏡',
                name: 'Kiinteistönhoito',
                desc: 'Siivous saapumisen ajaksi, puutarhanhoito, altaan huolto ja kohteen valvonta poissaolosi aikana.',
                tags: ['Siivous', 'Puutarha', 'Allas', 'Valvonta']
              },
              {
                icon: '🏛️',
                name: 'Viranomaisasiointi',
                desc: 'Luvat, rakennusvalvonta, kaavoitusasiat, naapuririidat ja asiointi verottajan kanssa.',
                tags: ['Rakennuslupa', 'ENFIA-vero', 'Rekisteröinnit']
              },
              {
                icon: '⚖️',
                name: 'Oikeusasiat ja sopimukset',
                desc: 'Autamme löytämään kreikkalaisen lakimiehen tai notaarin ja tuemme tarvittaessa sopimusten ymmärtämisessä.',
                tags: ['Lakimies', 'Notaari', 'Sopimusapu']
              },
              {
                icon: '🚨',
                name: 'Hätätilanteet',
                desc: 'Vesivuoto, sähkökatko, murrettu ovi tai muu kiireellinen tilanne – olemme tavoitettavissa myös normaalin aukioloajan ulkopuolella.',
                tags: ['Vesivuoto', 'Lukkopalvelu', 'Kiirekorjaus']
              },
              {
                icon: '📋',
                name: 'Muut arjen asiat',
                desc: 'Internet-liittymä, vakuutukset, autokorjaamo, lääkäriaika, tavarankuljetus – vaikka käännösapu kreikkalaiseen virastoon.',
                tags: ['Netti & TV', 'Vakuutus', 'Tulkkaus']
              }
            ].map((service, i) => (
              <div key={i} style={{
                background: 'rgba(14,34,56,0.85)',
                padding: '2.2rem 2rem',
                transition: 'background 0.25s'
              }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>{service.icon}</div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.15rem',
                  fontWeight: 600,
                  color: 'var(--gold-light)',
                  marginBottom: '0.5rem'
                }}>
                  {service.name}
                </h3>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.45)',
                  lineHeight: 1.65,
                  marginBottom: '1rem'
                }}>
                  {service.desc}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {service.tags.map((tag, j) => (
                    <span key={j} style={{
                      fontSize: '0.62rem',
                      letterSpacing: '0.08em',
                      padding: '0.2rem 0.6rem',
                      border: '1px solid rgba(201,169,110,0.2)',
                      color: 'rgba(201,169,110,0.5)'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="hinnasto" style={{ padding: 'clamp(4rem, 10vw, 8rem) clamp(1.25rem, 5vw, 4rem)', background: 'var(--white)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p className="section-label" style={{ justifyContent: 'center' }}>Hinnasto</p>
            <h2 className="section-title">
              Selkeä, <em>reilu hinnoittelu</em>
            </h2>
            <p style={{
              marginTop: '1rem',
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              maxWidth: '540px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Emme veloita ammattilaisilta välityspalkkioita – suosituksemme perustuvat aina sinun etuusi, ei omaan ansaintaamme. Kuukausimaksu kattaa selvitys- ja välitystyömme.
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 'clamp(1.5rem, 4vw, 2rem)'
          }}>
            <div style={{
              border: '1px solid var(--sand-dark)',
              padding: 'clamp(2rem, 5vw, 3rem) clamp(1.5rem, 4vw, 2.5rem)',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '0.7rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '0.8rem'
              }}>
                Ostajille
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem',
                fontWeight: 300,
                color: 'var(--aegean-deep)',
                marginBottom: '0.4rem'
              }}>
                Tervetuloa kotiin
              </h3>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '3.5rem',
                fontWeight: 300,
                color: 'var(--gold)',
                lineHeight: 1,
                marginBottom: '0.3rem'
              }}>
                <sup style={{ fontSize: '1.4rem', verticalAlign: 'top', marginTop: '0.8rem' }}>€</sup>0
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '2rem'
              }}>
                / 12 ensimmäistä kuukautta
              </div>
              <div style={{ height: '1px', background: 'var(--sand-dark)', marginBottom: '1.8rem' }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  'Kaikki palvelualueet käytössä',
                  'Kiinteistöprofiilin luominen ja hallinta',
                  'Pyyntöjä voi tehdä rajattomasti',
                  'Yhteys suomeksi WhatsAppilla ja sähköpostilla',
                  'Hinta-arvio ennen tekijöiden valintaa',
                  'Alkaa ostopäivästä – ei erillistä rekisteröitymistä'
                ].map((feature, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.8rem',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    color: 'var(--text)',
                    padding: '0.55rem 0',
                    borderBottom: i < 5 ? '1px solid var(--sand-dark)' : 'none'
                  }}>
                    <span style={{ color: 'var(--gold)', fontSize: '0.75rem', marginTop: '0.1rem', flexShrink: 0 }}>✦</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{
              border: '1px solid var(--gold)',
              background: 'var(--aegean-deep)',
              padding: 'clamp(2rem, 5vw, 3rem) clamp(1.5rem, 4vw, 2.5rem)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-0.8rem',
                left: '2rem',
                background: 'var(--gold)',
                color: 'var(--aegean-deep)',
                fontSize: '0.62rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '0.25rem 0.8rem'
              }}>
                Suosituin
              </div>
              <div style={{
                fontSize: '0.7rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                marginBottom: '0.8rem'
              }}>
                Palvelusopimus
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem',
                fontWeight: 300,
                color: 'var(--white)',
                marginBottom: '0.4rem'
              }}>
                Jatkuva tuki
              </h3>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '3.5rem',
                fontWeight: 300,
                color: 'var(--gold)',
                lineHeight: 1,
                marginBottom: '0.3rem'
              }}>
                <sup style={{ fontSize: '1.4rem', verticalAlign: 'top', marginTop: '0.8rem' }}>€</sup>39
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: '2rem'
              }}>
                / kuukausi · sitoutumatta
              </div>
              <div style={{ height: '1px', background: 'rgba(201,169,110,0.2)', marginBottom: '1.8rem' }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  'Kaikki palvelualueet käytössä',
                  'Kiinteistöprofiilin hallinta ja päivitykset',
                  'Pyyntöjä voi tehdä rajattomasti',
                  'Yhteys suomeksi WhatsAppilla ja sähköpostilla',
                  'Hätätilanteet – käsittelemme kiireesti',
                  'Voit lopettaa milloin tahansa'
                ].map((feature, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.8rem',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    color: 'rgba(255,255,255,0.7)',
                    padding: '0.55rem 0',
                    borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.06)' : 'none'
                  }}>
                    <span style={{ color: 'var(--gold)', fontSize: '0.75rem', marginTop: '0.1rem', flexShrink: 0 }}>✦</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p style={{
            textAlign: 'center',
            marginTop: '2.5rem',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6
          }}>
            Kaikki hinnat sisältävät arvonlisäveron. Kuukausimaksu kattaa selvitys- ja välitystyömme – et maksa meille välityspalkkioita etkä muita lisämaksuja. Maksat itse suoraan paikallisille ammattilaisille markkinahintoihin.
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <section style={{
        padding: 'clamp(2rem, 5vw, 3rem) clamp(1.25rem, 5vw, 4rem)',
        background: 'var(--aegean)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'clamp(1rem, 3vw, 2rem)',
        flexWrap: 'wrap'
      }}>
        <div style={{ fontSize: '1.6rem', flexShrink: 0, marginTop: '0.2rem' }}>ℹ️</div>
        <div style={{
          fontSize: '0.82rem',
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.75
        }}>
          <strong style={{ color: 'var(--gold-light)', fontWeight: 500 }}>Tärkeää tietää:</strong> Kotikreikasta.com toimii ammattilaisvälittäjänä – emme ole osapuolena sinun ja palveluntarjoajan välisessä sopimussuhteessa. Emme vastaa yksittäisten urakoitsijoiden tai ammattilaisten työn laadusta, aikatauluista tai hinnoista. Kaikki maksutapahtumat kulkevat suoraan sinun ja palveluntarjoajan välillä.
        </div>
      </section>

      {/* Contact */}
      <section id="yhteys" style={{ padding: 'clamp(4rem, 10vw, 8rem) clamp(1.25rem, 5vw, 4rem)', background: 'var(--sand)' }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: 'clamp(3rem, 8vw, 6rem)',
          alignItems: 'start'
        }}>
          <div>
            <p className="section-label">Ota yhteyttä</p>
            <h2 className="section-title">
              Kerro tarpeesi –<br /><em>me hoidamme loput</em>
            </h2>
            <p style={{
              fontSize: '0.95rem',
              fontWeight: 300,
              lineHeight: 1.8,
              color: 'var(--text)',
              marginTop: '1.5rem',
              marginBottom: '2.5rem'
            }}>
              Sinun ei tarvitse tietää kreikkalaista termiä ongelmalle eikä edes sitä, kenet tarvitset. Kuvaile tilanne suomeksi – kysymme tarvittaessa lisää ja etsimme ratkaisun yhdessä.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 0',
                borderBottom: '1px solid var(--sand-dark)'
              }}>
                <div style={{
                  width: '2.8rem',
                  height: '2.8rem',
                  border: '1px solid var(--sand-dark)',
                  background: 'var(--white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  flexShrink: 0
                }}>💬</div>
                <div>
                  <div style={{
                    fontSize: '0.68rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '0.15rem'
                  }}>Sähköposti</div>
                  <div
                    style={{ fontSize: '0.88rem', color: 'var(--text)', fontWeight: 500 }}
                    dangerouslySetInnerHTML={{
                      __html: '<!--email_off-->info@kotikreikasta.com<!--/email_off-->',
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Vastaus arkisin 24h sisällä
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <ContactForm source={{ type: 'content', slug: 'konsierge', title: 'Konsierge-palvelu', url: 'https://kotikreikasta.com/konsierge' }} />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
