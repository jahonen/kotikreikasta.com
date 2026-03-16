interface HeroProps {}

export default function Hero(_props: HeroProps) {
  return (
    <section className="hero">
      <div
        className="hero-bg"
        style={{
          backgroundImage: "url('/etuovi_kreikkaan.jpg')",
        }}
      />
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="hero-eyebrow">Suomenkielinen kiinteistöpalvelu Kreikassa</p>
        <h1 className="hero-title">
          Unohda talvi –<br />löydä <em>kreikkalainen koti</em>
          <br />joka odottaa sinua
        </h1>
        <p className="hero-sub">
          Turvallinen, huoleton ja asiantunteva palvelu suomen kielellä – mukaan
          lukien vuoden mittainen konsierge-palvelu ensimmäiselle vuodelle.
        </p>
        <div className="hero-btns">
          <a href="#process" className="btn-primary">
            Miten se toimii
          </a>
          <a href="#listings" className="btn-outline">
            Tutki kohteita
          </a>
        </div>
      </div>
    </section>
  );
}
