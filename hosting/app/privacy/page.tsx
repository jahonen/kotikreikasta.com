export const dynamic = 'force-static';

export default function PrivacyPage() {
  return (
    <main className="container" style={{ padding: '3rem 1rem' }}>
      <h1 className="section-title" style={{ marginBottom: '1rem' }}>Tietosuojaseloste</h1>
      <p style={{ marginBottom: '1rem' }}>Päivitetty: {new Date().toLocaleDateString('fi-FI')}</p>

      <section style={{ marginTop: '1rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>1. Rekisterinpitäjä</h2>
        <p>Kotikreikasta</p>
        <p>Sähköposti: info@kotikreikasta.com</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>2. Mitä tietoja keräämme</h2>
        <ul>
          <li>Sähköpostiosoite uutiskirjeen tilausta varten</li>
          <li>Nimi ja yhteystiedot yhteydenottoa varten (vapaaehtoiset)</li>
          <li>Palvelun käytöstä kertyvät tekniset lokitiedot</li>
        </ul>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>3. Mihin tarkoituksiin käytämme tietoja</h2>
        <ul>
          <li>Oman markkinointimme kohdentaminen suostumuksen perusteella</li>
          <li>Palvelun tuottaminen ja asiakassuhteen hoito</li>
          <li>Lakivelvoitteiden noudattaminen</li>
        </ul>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>4. Tietojen luovuttaminen ja siirrot</h2>
        <p>Emme luovuta henkilötietoja kolmansille osapuolille. Tietoja ei myydä. Tietoja voidaan käsitellä EU/ETA-alueella sijaitsevissa palveluissa.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>5. Säilytysaika</h2>
        <p>Säilytämme tietoja vain niin kauan kuin se on tarpeen edellä kuvattuihin tarkoituksiin tai lainsäädännön edellyttämän ajan.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>6. Rekisteröidyn oikeudet</h2>
        <ul>
          <li>Oikeus tarkastaa omat tiedot</li>
          <li>Oikeus oikaista tai poistaa tiedot</li>
          <li>Oikeus vastustaa ja rajoittaa käsittelyä</li>
          <li>Oikeus peruuttaa suostumus milloin tahansa</li>
        </ul>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>7. Yhteydenotot</h2>
        <p>Pyynnöt ja kysymykset: <a href="mailto:info@kotikreikasta.com">info@kotikreikasta.com</a></p>
      </section>
    </main>
  );
}
