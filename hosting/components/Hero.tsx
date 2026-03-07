interface HeroProps {}

export default function Hero(_props: HeroProps) {
  return (
    <section className="hero">
      <div
        className="hero-bg"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1800&q=85')",
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
          <a href="#listings" className="btn-primary">
            Tutki kohteita
          </a>
          <a href="#process" className="btn-outline">
            Miten se toimii
          </a>
        </div>
      </div>
    </section>
  );
}
