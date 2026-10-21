
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./Home.css";

function Home() {
  const [productImages, setProductImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesLoading, setImagesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProductImages() {
      try {
        const response = await apiRequest("/products");

        const products = Array.isArray(response)
          ? response
          : response?.products ??
            response?.data?.products ??
            [];

        const images = products.filter(
          (product) =>
            product.active !== false &&
            typeof product.image === "string" &&
            product.image.trim() !== ""
        );

        if (!cancelled) {
          setProductImages(images);
          setCurrentImageIndex(0);
        }
      } catch (error) {
        console.error("ABS CUT: Failed to load product images.", error);
      } finally {
        if (!cancelled) {
          setImagesLoading(false);
        }
      }
    }

    loadProductImages();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (productImages.length < 2) return;

    const interval = setInterval(() => {
      setCurrentImageIndex(
        (index) => (index + 1) % productImages.length
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [productImages.length]);

  const currentImage = productImages[currentImageIndex];

  return (
    <main className="abs-home">
      {/* HERO */}
      <section className="abs-hero">
        <div className="abs-hero-glow" aria-hidden="true" />

        <div className="abs-hero-inner">
          <div className="abs-hero-content">
            <div className="abs-eyebrow">
              <span className="abs-eyebrow-line" />
              PREMIUM FASHION · BESPOKE CRAFT
            </div>

            <h1 className="abs-hero-title">
              WELCOME TO
              <span>ABS CUT.</span>
            </h1>

            <div className="abs-hero-subtitle">
              Style Made <em>For You.</em>
            </div>

            <p className="abs-hero-description">
              Exceptional native wear, thoughtful tailoring
              and distinctive details. Your style, your vision,
              expertly brought to life.
            </p>

            <div className="abs-hero-actions">
              <Link to="/shop" className="abs-button abs-button-gold">
                <span>EXPLORE COLLECTION</span>
                <span aria-hidden="true">↗</span>
              </Link>

              <Link
                to="/custom-order"
                className="abs-button abs-button-outline"
              >
                CREATE YOUR STYLE
              </Link>
            </div>

            <div className="abs-hero-note">
              <span className="abs-note-mark">✳</span>
              Made with intention. Worn with confidence.
            </div>
          </div>

          {/* SINGLE-IMAGE PRODUCT SLIDESHOW */}
          <div className="abs-hero-visual">
            <div className="abs-visual-decoration" aria-hidden="true" />

            <div className="abs-visual-frame">
              <div className="abs-visual-topline">
                <span>ABS CUT</span>
                <span>EST. IN STYLE</span>
              </div>

              <div className="abs-visual-image">
                {imagesLoading ? (
                  <div
                    className="abs-image-placeholder abs-image-loading"
                    aria-label="Loading collection"
                  />
                ) : currentImage ? (
                  <img
                    key={currentImage._id || currentImageIndex}
                    src={currentImage.image}
                    alt="ABS CUT fashion collection"
                    className="abs-product-slide"
                  />
                ) : (
                  <div className="abs-image-placeholder">
                    <span className="abs-placeholder-monogram">
                      AC
                    </span>
                    <span>THE ABS CUT COLLECTION</span>
                  </div>
                )}

                <div className="abs-image-shade" />
              </div>

              <div className="abs-visual-bottomline">
                <span>TIMELESS.</span>
                <span>DISTINCTIVE.</span>
                <span>YOURS.</span>
              </div>
            </div>

            <div className="abs-visual-stamp" aria-hidden="true">
              <span>CRAFTED</span>
              <span>WITH CARE</span>
              <span className="abs-stamp-star">✳</span>
            </div>
          </div>
        </div>

        <div className="abs-hero-footer">
          <span>CRAFTED FOR YOUR INDIVIDUALITY</span>
          <span className="abs-footer-line" />
          <span>DISCOVER ABS CUT</span>
        </div>
      </section>

      {/* SERVICES */}
      <section className="abs-services">
        <div className="abs-section-heading">
          <div className="abs-eyebrow">
            <span className="abs-eyebrow-line" />
            THE ART OF PERSONAL STYLE
          </div>

          <h2>
            More Than Fashion.
            <em> It's Your Identity.</em>
          </h2>

          <p>
            From ready-to-wear pieces to one-of-a-kind creations,
            every detail begins with your vision.
          </p>
        </div>

        <div className="abs-service-grid">
          <article className="abs-service-card">
            <div className="abs-service-number">01</div>
            <div className="abs-service-icon" aria-hidden="true">✳</div>
            <span className="abs-service-label">THE COLLECTION</span>
            <h3>Ready-to-Wear</h3>
            <p>
              Discover thoughtfully crafted outfits made to
              bring confidence and character to your wardrobe.
            </p>
            <Link to="/shop" className="abs-text-link">
              EXPLORE THE COLLECTION <span>↗</span>
            </Link>
          </article>

          <article className="abs-service-card abs-service-featured">
            <div className="abs-service-number">02</div>
            <div className="abs-service-icon" aria-hidden="true">✂</div>
            <span className="abs-service-label">MADE FOR YOU</span>
            <h3>Custom Tailoring</h3>
            <p>
              Your measurements, your fabric, your design.
              Create an outfit that feels uniquely yours.
            </p>
            <Link to="/custom-order" className="abs-text-link">
              DESIGN YOUR OUTFIT <span>↗</span>
            </Link>
          </article>

          <article className="abs-service-card">
            <div className="abs-service-number">03</div>
            <div className="abs-service-icon" aria-hidden="true">✧</div>
            <span className="abs-service-label">THE FINISHING TOUCH</span>
            <h3>Personalised Details</h3>
            <p>
              Add embroidery and monogramming for a personal
              finish that makes your garment stand apart.
            </p>
            <Link to="/custom-order" className="abs-text-link">
              MAKE IT PERSONAL <span>↗</span>
            </Link>
          </article>
        </div>
      </section>

      {/* CUSTOM ORDER FEATURE */}
      <section className="abs-custom">
        <div className="abs-custom-pattern" aria-hidden="true" />

        <div className="abs-custom-inner">
          <div className="abs-custom-copy">
            <div className="abs-eyebrow abs-eyebrow-light">
              <span className="abs-eyebrow-line" />
              YOUR VISION, OUR CRAFT
            </div>

            <h2>
              Some Things
              <em> Should Be Made</em>
              <em>Just for You.</em>
            </h2>

            <p>
              Have a design in mind? Bring your own fabric or
              explore your options with ABS CUT. We'll help
              turn your idea into a garment made around you.
            </p>

            <Link
              to="/custom-order"
              className="abs-button abs-button-gold"
            >
              <span>START YOUR CUSTOM ORDER</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="abs-custom-art" aria-hidden="true">
            <div className="abs-art-ring abs-art-ring-one" />
            <div className="abs-art-ring abs-art-ring-two" />
            <div className="abs-art-center">
              <span>AC</span>
              <span>MADE FOR YOU</span>
            </div>
            <span className="abs-art-star abs-art-star-one">✳</span>
            <span className="abs-art-star abs-art-star-two">✧</span>
          </div>
        </div>
      </section>

      {/* FASHION PREVIEW */}
      <section className="abs-ai">
        <div className="abs-ai-inner">
          <div className="abs-ai-symbol" aria-hidden="true">
            <span>✳</span>
          </div>

          <div className="abs-ai-copy">
            <div className="abs-eyebrow">
              <span className="abs-eyebrow-line" />
              A NEW WAY TO EXPLORE STYLE
            </div>

            <h2>
              Imagine It.
              <em> Then Make It Yours.</em>
            </h2>

            <p>
              We're exploring AI-powered outfit previews to
              help you envision new looks before you order.
            </p>
          </div>

          <Link to="/shop" className="abs-button abs-button-dark">
            DISCOVER YOUR STYLE <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      {/* FOOTER BRAND STRIP */}
      <div className="abs-brand-strip">
        <span>ABS CUT</span>
        <span className="abs-brand-strip-star">✳</span>
        <span>STYLE MADE FOR YOU</span>
        <span className="abs-brand-strip-star">✳</span>
        <span>TIMELESS BY DESIGN</span>
      </div>
    </main>
  );
}

export default Home;
