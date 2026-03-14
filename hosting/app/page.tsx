import NavBar from "../components/nav-bar";
import Hero from "../components/Hero";
import NewsletterCta from "../components/NewsletterCta";
import LatestBlogsClient from "../components/LatestBlogsClient";
import Footer from "../components/Footer";

export default async function Page() {
  return (
    <>
      <NavBar />
      <Hero />

      <section id="listings" className="container" style={{ padding: '4rem 0' }}>
        <p className="section-label">Valikoituja kohteita</p>
        <h2 className="section-title">Löydä oma <em>paratiisisi</em></h2>
      </section>

      <section id="process" className="container" style={{ padding: '4rem 0' }}>
        <p className="section-label">Ostoprosessi</p>
        <h2 className="section-title">Viisi askelta <em>unelmaasi</em></h2>
      </section>

      <section id="concierge" className="container" style={{ padding: '4rem 0' }}>
        <p className="section-label">Konsierge-palvelu</p>
        <h2 className="section-title">Kattava tuki <em>ensimmäiselle</em> vuodelle</h2>
      </section>

      <section id="regions" className="container" style={{ padding: '4rem 0' }}>
        <p className="section-label">Alueopas</p>
        <h2 className="section-title">Löydä <em>oikea alue</em> sinulle</h2>
      </section>

      <section id="latest-blogs" className="container" style={{ padding: '4rem 0' }}>
        <p className="section-label">Blogi</p>
        <h2 className="section-title">Uusimmat <em>artikkelit</em></h2>
        <LatestBlogsClient count={3} />
      </section>

      <section id="faq" className="container" style={{ padding: '4rem 0' }}>
        <p className="section-label">Usein kysytyt</p>
        <h2 className="section-title">Kysymykset ja <em>vastaukset</em></h2>
      </section>

      <NewsletterCta />
      <Footer />
    </>
  );
}
