
import { Link } from "react-router-dom";
import "./Footer.css";

const FOOTER_LINKS = {
  explore: [
    { label: "Home", to: "/" },
    { label: "Shop Collection", to: "/shop" },
    { label: "About ABS CUT", to: "/about" },
    { label: "Contact Us", to: "/contact" },
  ],
  services: [
    { label: "Custom Tailoring", to: "/custom-order" },
    { label: "Embroidery", to: "/custom-order" },
    { label: "Monogramming", to: "/custom-order" },
    { label: "My Orders", to: "/my-orders" },
  ],
};

const SOCIAL_LINKS = [
  {
    name: "Instagram",
    href: "", // Add your official Instagram URL.
    symbol: "ig",
  },
  {
    name: "Facebook",
    href: "", // Add your official Facebook URL.
    symbol: "f",
  },
  {
    name: "TikTok",
    href: "", // Add your official TikTok URL.
    symbol: "♪",
  },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="abs-footer">
      <div className="abs-footer-glow" aria-hidden="true" />
      <div className="abs-footer-gold-line" aria-hidden="true" />

      <div className="abs-footer-container">
        {/* BRAND */}
        <div className="abs-footer-main">
          <Link
            to="/"
            className="abs-footer-brand"
            aria-label="ABS CUT home"
          >
            <span className="abs-footer-logo" aria-hidden="true">
              <span>A</span>
              <span>C</span>
              <i />
            </span>

            <span className="abs-footer-brand-copy">
              <strong>ABS CUT</strong>
              <small>THE ART OF PERSONAL STYLE</small>
            </span>
          </Link>

          <p className="abs-footer-description">
            Where craftsmanship meets character. Discover premium
            native wear, bespoke tailoring, detailed embroidery,
            monogramming, and fashion materials made for your style.
          </p>

          <a
            className="abs-footer-contact"
            href="https://wa.me/2348140806540"
            target="_blank"
            rel="noreferrer"
          >
            <span className="abs-footer-whatsapp" aria-hidden="true">
              W
            </span>

            <span>
              <small>NEED A CUSTOM DESIGN?</small>
              <strong>Chat with ABS CUT</strong>
            </span>

            <span className="abs-footer-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        </div>

        {/* NAVIGATION */}
        <div className="abs-footer-column">
          <h3>Explore</h3>
          <span className="abs-footer-heading-line" />

          {FOOTER_LINKS.explore.map((item) => (
            <Link key={item.label} to={item.to}>
              <span aria-hidden="true">↗</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* SERVICES */}
        <div className="abs-footer-column">
          <h3>Our Services</h3>
          <span className="abs-footer-heading-line" />

          {FOOTER_LINKS.services.map((item) => (
            <Link key={item.label} to={item.to}>
              <span aria-hidden="true">↗</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* SOCIALS */}
        <div className="abs-footer-column abs-footer-social-column">
          <h3>Stay Connected</h3>
          <span className="abs-footer-heading-line" />

          <p>
            Follow our journey, discover fresh designs, and get
            inspired by the art of African fashion.
          </p>

          <div className="abs-footer-socials">
            {SOCIAL_LINKS.filter((social) => social.href).map(
              (social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="abs-footer-social"
                  aria-label={`Follow ABS CUT on ${social.name}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {social.symbol}
                </a>
              )
            )}

            <a
              href="https://wa.me/2348140806540"
              className="abs-footer-social abs-footer-social-whatsapp"
              aria-label="Chat with ABS CUT on WhatsApp"
              target="_blank"
              rel="noreferrer"
            >
              W
            </a>
          </div>

          <span className="abs-footer-social-note">
            CRAFTED WITH PURPOSE. WORN WITH CONFIDENCE.
          </span>
        </div>
      </div>

      {/* BRAND STATEMENT */}
      <div className="abs-footer-statement">
        <span className="abs-footer-statement-rule" />
        <p>
          YOUR STYLE. <span>YOUR STORY.</span> YOUR ABS CUT.
        </p>
        <span className="abs-footer-statement-rule" />
      </div>

      {/* BOTTOM BAR */}
      <div className="abs-footer-bottom">
        <p>
          © {year} <strong>ABS CUT</strong>. All rights reserved.
        </p>

        <p className="abs-footer-made">
          Designed with <span aria-label="love">♥</span> for timeless style.
        </p>

        <a className="abs-footer-top" href="#top">
          BACK TO TOP <span aria-hidden="true">↑</span>
        </a>
      </div>
    </footer>
  );
}

export default Footer;
