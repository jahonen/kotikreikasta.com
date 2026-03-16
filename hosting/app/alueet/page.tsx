'use client';

import NavBar from "../../components/nav-bar";
import Footer from "../../components/Footer";
import { useEffect } from 'react';

const regions = [
  {
    id: 1,
    name: "Kreeta",
    nameGreek: "Κρήτη",
    description: "Kreeta on monipuolisin ja suosituin saari, joka tarjoaa kaikkea vuoristokylistä idyllisille rannikoille. Alue sopii erityisesti perheille ja aktiivisille loma-asujille, sillä saarelta löytyy laadukkaita palveluita, kansainvälisiä lentoyhteyksiä ja runsaita kulttuurikohteita. Chanian ja Heraklionin seudut ovat suosittuja kiinteistöalueita, joissa yhdistyvät perinteinen kreikkalainen elämäntapa ja modernit mukavuudet. Kreeta on myös turvallinen ja hyvin varusteltu, mikä tekee siitä ihanteellisen pitkäaikaiseen loma-asumiseen.",
    highlights: ["Kansainväliset lentoyhteydet", "Laadukkaat palvelut", "Perheiden suosikki"]
  },
  {
    id: 2,
    name: "Korfu",
    nameGreek: "Κέρκυρα",
    description: "Korfu houkuttelee viehättävillä venetsialaisvaikutteisilla kyliensä, vihreillä maisemillaan ja läheisyydellään Italiaan. Saari on rauhallinen, mutta tarjoaa hyvät yhteydet Eurooppaan. Korfun pohjoisosat, kuten Kassiopi ja Acharavi, ovat suosittuja suomalaisostajien keskuudessa niiden rauhallisuuden ja laadukkaiden kiinteistöjen vuoksi. Alueella on myös hyvä valikoima kansainvälisiä kouluja ja terveyspalveluita.",
    highlights: ["Venetsialaisvaikutteiset kylät", "Vihreät maisemat", "Kansainväliset koulut"]
  },
  {
    id: 3,
    name: "Peloponnesos",
    nameGreek: "Πελοπόννησος",
    description: "Peloponnesos tarjoaa autenttisen Kreikan ilman massaturismia. Alueella on edullisia kiinteistöjä, kauniita rannikkoja ja historiallisia nähtävyyksiä, kuten antiikin Olympian ja Mystraksen rauniot. Se sopii niille, jotka etsivät rauhallista elämäntapaa ja aidon kreikkalaisen kulttuurin läheisyyttä. Messinian ja Lakonian rannikot ovat erityisen suosittuja.",
    highlights: ["Autenttinen Kreikka", "Edulliset kiinteistöt", "Historialliset nähtävyydet"]
  },
  {
    id: 4,
    name: "Ateena ja Attika",
    nameGreek: "Αττική",
    description: "Ateena ja sen ympäristö tarjoavat kaupungin vilinää ja maaseudun rauhaa samassa paketissa. Lähisaaristo, kuten Aigina ja Hydra, ovat suosittuja loma-asunnon ostajien keskuudessa niiden läheisyydestä pääkaupungin palveluihin. Attika sopii niille, jotka haluavat yhdistää kulttuurin, ostokset ja rannanelämän.",
    highlights: ["Kaupunki ja ranta", "Lähisaaristo", "Kulttuuritarjonta"]
  },
  {
    id: 5,
    name: "Mykonos",
    nameGreek: "Μύκονος",
    description: "Mykonos on tunnettu luksuslomakohteena, jossa on vilkasta yöelämää ja kansainvälistä yhteisöä. Saari vetää puoleensa niitä, jotka etsivät eksklusiivista loma-asuntoa ja ovat valmiita investoimaan korkealaatuisiin kiinteistöihin. Mykonos on myös hyvä vuokrausinvestoinnin kohde lyhytaikaisen vuokrauksen ansiosta.",
    highlights: ["Luksusluokka", "Vuokrausinvestointi", "Kansainvälinen yhteisö"]
  },
  {
    id: 6,
    name: "Santorini",
    nameGreek: "Σαντορίνη",
    description: "Santorini on maailmankuulu maisemistaan ja romanttisesta ilmapiiristään. Saari sopii parhaiten niille, jotka etsivät ainutlaatuista ja luksusluokan loma-asuntoa. Kiinteistöt ovat kalliimpia, mutta niiden arvo säilyy hyvin. Santorini on ihanteellinen niille, jotka arvostavat esteettisyyttä ja ovat valmiita maksamaan laadusta.",
    highlights: ["Maailmankuulut maisemat", "Luksuskiinteistöt", "Arvokas sijoitus"]
  },
  {
    id: 7,
    name: "Rhodos",
    nameGreek: "Ρόδος",
    description: "Rhodos yhdistää keskiaikaisen historian, kauniit rannat ja hyvät lentoyhteydet. Saaren pohjoisosa on vilkkaampi, kun taas eteläosat tarjoavat rauhallisempaa elämäntapaa. Rhodos sopii niille, jotka haluavat monipuolisen lomakohteen, jossa on sekä kulttuuria että rantaelämää.",
    highlights: ["Keskiaikainen historia", "Hyvät lentoyhteydet", "Monipuolinen"]
  },
  {
    id: 8,
    name: "Thessaloniki",
    nameGreek: "Θεσσαλονίκη",
    description: "Thessaloniki on Kreikan toiseksi suurin kaupunki, joka tarjoaa vilkasta kaupunkielämää ja kulttuuria. Lähistöllä olevat Halkidikin niemimaat ovat suosittuja loma-asunnon ostajien keskuudessa niiden kauniiden rantojen ja rauhallisen ilmapiirin ansiosta. Alue sopii niille, jotka haluavat yhdistää kaupungin ja meren.",
    highlights: ["Kaupunkikulttuuri", "Halkidikin rannat", "Vilkas elämä"]
  },
  {
    id: 9,
    name: "Zakynthos",
    nameGreek: "Ζάκυνθος",
    description: "Zakynthos tunnetaan erityisesti Navagio-rannastaan ja luonnonkauneudestaan. Saari on rauhallisempi kuin Mykonos tai Santorini, mutta tarjoaa silti hyvät palvelut ja kansainväliset yhteydet. Zakynthos sopii niille, jotka etsivät luonnonläheistä ja perheystävällistä loma-asuntoa.",
    highlights: ["Navagio-ranta", "Luonnonkauneus", "Perheystävällinen"]
  }
];

export default function AlueetPage() {
  return (
    <>
      <NavBar />
      
      <section style={{ 
        background: 'var(--cream)',
        padding: 'var(--space-3xl) 0',
        marginTop: '72px'
      }}>
        <div className="container">
          <p className="section-label">Alueopas</p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: 400,
            lineHeight: 1.2,
            color: 'var(--text)',
            marginBottom: 'var(--space-lg)'
          }}>
            Löydä <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>oikea alue</em> sinulle
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.125rem',
            lineHeight: 1.7,
            color: 'var(--text-mid)',
            maxWidth: '720px'
          }}>
            Kreikka tarjoaa monipuolisia alueita jokaiseen tarpeeseen – rauhallisista kylistä vilkkaisiin kaupunkeihin, edullisista kohteista luksuskiinteistöihin. Autamme sinua löytämään täydellisen paikan.
          </p>
        </div>
      </section>

      <section style={{ padding: 'var(--space-3xl) 0' }}>
        <div className="container">
          <div style={{ 
            display: 'grid',
            gap: 'var(--space-2xl)',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            {regions.map((region, index) => (
              <article 
                key={region.id}
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: 'var(--space-2xl)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.borderColor = 'var(--gold-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'var(--space-md)',
                  marginBottom: 'var(--space-md)'
                }}>
                  <span style={{
                    fontSize: '2.5rem',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 300,
                    color: 'var(--gold)',
                    lineHeight: 1
                  }}>
                    {index + 1}
                  </span>
                  <div>
                    <h2 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '2rem',
                      fontWeight: 400,
                      color: 'var(--text)',
                      marginBottom: 'var(--space-xs)',
                      lineHeight: 1.2
                    }}>
                      {region.name}
                    </h2>
                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.02em'
                    }}>
                      {region.nameGreek}
                    </p>
                  </div>
                </div>

                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  color: 'var(--text-mid)',
                  marginBottom: 'var(--space-lg)'
                }}>
                  {region.description}
                </p>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--space-sm)'
                }}>
                  {region.highlights.map((highlight, i) => (
                    <span 
                      key={i}
                      style={{
                        display: 'inline-block',
                        padding: 'var(--space-xs) var(--space-md)',
                        background: 'var(--sand)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '2px',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: 'var(--text-mid)',
                        letterSpacing: '0.02em'
                      }}
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section style={{ 
        background: 'var(--sand)',
        padding: 'var(--space-3xl) 0',
        borderTop: '1px solid var(--border)'
      }}>
        <div className="container">
          <div style={{ maxWidth: '920px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 400,
              color: 'var(--text)',
              marginBottom: 'var(--space-lg)',
              lineHeight: 1.3
            }}>
              Autamme <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>jokaisella</em> alueella
            </h2>
            
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.0625rem',
              lineHeight: 1.7,
              color: 'var(--text-mid)',
              marginBottom: 'var(--space-2xl)',
              maxWidth: '680px',
              margin: '0 auto var(--space-2xl)'
            }}>
              Kotikreikasta.com tarjoaa suomenkielistä tukea kaikilla alueilla. Hoidamme kreikkalaisen verotunnuksen hankkimisen, hyödynnämme luotettavaa lakiasiantuntijaverkostoamme ja järjestämme paikalliset palvelut puolestasi.
            </p>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-lg)',
              marginBottom: 'var(--space-2xl)'
            }}>
              <div>
                <div style={{
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
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
                  Hoidamme ΑΦΜ-tunnuksen puolestasi
                </p>
              </div>

              <div>
                <div style={{
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Lakipalvelut
                </div>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  Luotettava asianajajaverkosto
                </p>
              </div>

              <div>
                <div style={{
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Paikalliset palvelut
                </div>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  Järjestämme kaikki tarvittavat liittymät
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href="/#listings" className="btn-primary">
                Tutustu kohteisiin
              </a>
              <a href="/tasmahaku" className="btn-outline" style={{ color: 'var(--text)', borderColor: 'var(--gold)' }}>
                Täsmähaku-palvelu
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
