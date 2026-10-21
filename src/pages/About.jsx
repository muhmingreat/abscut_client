import "./About.css";

function About() {
  return (
    <main className="about-page">

      <section className="about-hero">
        <p className="about-label">ABS CUT</p>

        <h1>
          Crafting Style.
          <br />
          Creating Confidence.
        </h1>

        <p className="about-hero-text">
          ABS CUT is a fashion brand focused on quality native
          wear, custom tailoring, embroidery, monogramming and
          premium fashion materials.
        </p>
      </section>

      <section className="about-story">

        <div className="about-story-content">
          <p className="about-section-label">
            OUR STORY
          </p>

          <h2>
            Traditional Craft Meets Modern Fashion
          </h2>

          <p>
            At ABS CUT, we believe clothing should be more than
            something you wear. It should reflect your personality,
            occasion and individual style.
          </p>

          <p>
            From carefully crafted native outfits to detailed
            embroidery and personalized monograms, our goal is to
            deliver clothing that combines craftsmanship,
            comfort and elegance.
          </p>

          <p>
            Whether you are looking for a ready-to-wear outfit or
            want something designed specifically for you, ABS CUT
            provides a complete fashion experience.
          </p>
        </div>

        <div className="about-story-card">

          <span>ABS CUT</span>

          <h3>
            Designed With Purpose.
          </h3>

          <p>
            Every detail matters — from the fabric and cut to the
            embroidery and finishing.
          </p>

        </div>

      </section>

      <section className="about-services">

        <div className="about-services-header">
          <p className="about-section-label">
            WHAT WE DO
          </p>

          <h2>
            Our Services
          </h2>

          <span>
            Everything you need to create and complete your
            native fashion style.
          </span>
        </div>

        <div className="about-service-grid">

          <article className="about-service-card">
            <span>01</span>
            <h3>Native Wear</h3>
            <p>
              Premium native outfits including agbada, caftan,
              senator styles and other traditional designs.
            </p>
          </article>

          <article className="about-service-card">
            <span>02</span>
            <h3>Custom Tailoring</h3>
            <p>
              Personalized outfits created around your preferred
              measurements, fabric, style and design.
            </p>
          </article>

          <article className="about-service-card">
            <span>03</span>
            <h3>Embroidery</h3>
            <p>
              Detailed embroidery designs for outfits, special
              occasions, branding and personalized fashion.
            </p>
          </article>

          <article className="about-service-card">
            <span>04</span>
            <h3>Monogramming</h3>
            <p>
              Personalized initials and designs for pockets,
              flaps, caftans, agbada and other garments.
            </p>
          </article>

          <article className="about-service-card">
            <span>05</span>
            <h3>Fashion Materials</h3>
            <p>
              Selected materials and accessories used to create
              quality native and traditional outfits.
            </p>
          </article>

          <article className="about-service-card">
            <span>06</span>
            <h3>Personalized Service</h3>
            <p>
              We work with customers to understand their needs
              and turn their ideas into finished outfits.
            </p>
          </article>

        </div>

      </section>

      <section className="about-cta">

        <p className="about-section-label">
          START YOUR NEXT DESIGN
        </p>

        <h2>
          Have Something Special In Mind?
        </h2>

        <p>
          Tell ABS CUT what you want and let us help bring
          your fashion idea to life.
        </p>

        <div className="about-cta-actions">
          <a href="/custom-order">
            CREATE CUSTOM ORDER
          </a>

          <a href="/shop">
            SHOP COLLECTION
          </a>
        </div>

      </section>

    </main>
  );
}

export default About;