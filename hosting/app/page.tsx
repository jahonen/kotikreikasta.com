import NavBar from "../components/nav-bar";
import Hero from "../components/Hero";
import TrustBar from "../components/TrustBar";
import NewsletterCta from "../components/NewsletterCta";
import LatestBlogsServer from "../components/LatestBlogsServer";
import LatestListingsServer from "../components/LatestListingsServer";
import Footer from "../components/Footer";

export default async function Page() {
  return (
    <>
      <NavBar />
      <Hero />
      <TrustBar />

      {/* ICP Journey: Step 1 - Understand the Process */}
      <section id="process" style={{ padding: '4rem 0' }}>
        <div className="container">
          <p className="section-label">Ostoprosessi</p>
          <h2 className="section-title">Viisi askelta <em>unelmaasi</em></h2>
          <p style={{ 
            fontFamily: 'var(--font-body)',
            fontSize: '1.0625rem',
            lineHeight: 1.7,
            color: 'var(--text-mid)',
            maxWidth: '720px',
            marginBottom: 'var(--space-xl)'
          }}>
            Turvallinen ja asiantunteva prosessi alusta loppuun. Hoidamme kaikki käytännön asiat puolestasi – kreikkalaisesta verotunnuksesta notaarin edessä allekirjoitettavaan kauppakirjaan.
          </p>
          <a href="/ostoprosessi" className="btn-primary">
            Tutustu prosessiin
          </a>
        </div>
      </section>

      {/* ICP Journey: Step 2 - Explore Regions */}
      <section id="regions" style={{ padding: '4rem 0' }}>
        <div className="container">
          <p className="section-label">Alueopas</p>
          <h2 className="section-title">Löydä <em>oikea alue</em> sinulle</h2>
          <p style={{ 
            fontFamily: 'var(--font-body)',
            fontSize: '1.0625rem',
            lineHeight: 1.7,
            color: 'var(--text-mid)',
            maxWidth: '720px',
            marginBottom: 'var(--space-xl)'
          }}>
            Kreikka tarjoaa monipuolisia alueita jokaiseen tarpeeseen – Kreeta, Korfu, Peloponnesos ja muut. Tutustu yhdeksään suosituimpaan alueeseen ja löydä täydellinen paikka.
          </p>
          <a href="/alueet" className="btn-primary">
            Tutustu alueisiin
          </a>
        </div>
      </section>

      {/* ICP Journey: Step 3 - Browse Listings or Custom Search */}
      <section id="listings" style={{ padding: '4rem 0' }}>
        <div className="container">
          <p className="section-label">Kohteet</p>
          <h2 className="section-title">Valikoituja <em>kohteita</em></h2>
          <LatestListingsServer count={3} />
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginTop: '32px' }}>
            <a href="/listings" className="btn-primary">
              Näytä kaikki kohteet
            </a>
            <a href="/tasmahaku" className="btn-outline" style={{ color: 'var(--text)', borderColor: 'var(--gold)' }}>
              Täsmähaku-palvelu
            </a>
          </div>
        </div>
      </section>

      {/* ICP Journey: Step 4 - Learn from Content */}
      <section id="latest-blogs" style={{ padding: '4rem 0' }}>
        <div className="container">
          <p className="section-label">Blogi</p>
          <h2 className="section-title">Asiantuntija-<em>artikkelit</em></h2>
          <LatestBlogsServer count={3} />
        </div>
      </section>

      <NewsletterCta />
      <Footer />
    </>
  );
}
