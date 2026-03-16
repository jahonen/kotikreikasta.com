import NavBar from "../../components/nav-bar";
import Footer from "../../components/Footer";

export const metadata = { title: "Palveluehdot — Kotikreikasta" };

export default function PalveluehdotPage() {
  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: '6rem 0 3rem', maxWidth: 840, margin: '0 auto' }}>
        <h1 style={{ marginTop: 0 }}>Palveluehdot</h1>
        <p style={{ color: 'var(--text-muted)' }}>Päivitetty: {new Date().toLocaleDateString('fi-FI')}</p>
        <section style={{ lineHeight: 1.7 }}>
          <p>
            Tervetuloa käyttämään Kotikreikasta-palvelua. Nämä ehdot kuvaavat palvelun
            peruskäyttöä. Lähettämällä yhteydenottopyynnön vahvistat antamiesi tietojen oikeellisuuden
            ja suostut siihen, että voimme olla sinuun yhteydessä yhteydenottoon vastaamiseksi.
          </p>
          <p>
            Tallennamme yhteydenotossa antamasi tiedot (nimi, sähköposti, puhelin ja viesti) käsitelläksemme
            pyyntösi. Voit pyytää tietojen poistamista ottamalla meihin yhteyttä. Jos annat luvan
            markkinointiin, voimme lähettää sinulle uutiskirjeitä ja tarjouksia. Voit perua luvan milloin tahansa.
          </p>
          <p>
            Palvelun sisältöä voidaan päivittää. Emme vastaa mahdollisista virheistä tai katkoksista.
            Palvelua käytetään Suomen lain mukaisesti.
          </p>
          <p>
            Lisätiedot ja yhteydenotot: info@kotikreikasta.com
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
