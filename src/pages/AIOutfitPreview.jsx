import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./AIOutfitPreview.css";

const OUTFITS = [
  "Agbada",
  "Caftan",
  "Senator",
  "Native Wear",
  "Other",
];

const FABRICS = [
  "Linen",
  "Cotton",
  "Wool",
  "Silk",
  "Ankara",
  "Lace",
  "Other",
];

const COLORS = [
  "Black",
  "White",
  "Green",
  "Gold",
  "Blue",
  "Brown",
  "Cream",
  "Wine",
  "Other",
];

const initialForm = {
  outfitType: "Agbada",
  fabric: "Linen",
  color: "Green",
  embroidery: false,
  designDetails: "",
};

function AIOutfitPreview() {
  const [form, setForm] = useState(initialForm);
  const [usage, setUsage] = useState(null);
  const [preview, setPreview] = useState(null);

  const [loadingUsage, setLoadingUsage] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const loadUsage = useCallback(async () => {
    setLoadingUsage(true);

    try {
      const data = await apiRequest("/ai-outfit-preview/usage");
      setUsage(data.usage);
    } catch (err) {
      setError(
        err.message || "Could not load your daily preview limit."
      );
    } finally {
      setLoadingUsage(false);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setNotice("");
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    setError("");
    setNotice("");
    setCopyMessage("");

    const token = localStorage.getItem("absCutToken");

    if (!token) {
      setError("Please sign in to generate an outfit preview.");
      return;
    }

    if (form.designDetails.trim().length > 500) {
      setError("Design details must be 500 characters or fewer.");
      return;
    }

    if (usage && usage.remaining <= 0) {
      setError(
        "You have used all 3 outfit previews available today. Please try again tomorrow."
      );
      return;
    }

    setGenerating(true);

    try {
      const data = await apiRequest("/ai-outfit-preview", {
        method: "POST",
        body: JSON.stringify({
          outfitType: form.outfitType,
          fabric: form.fabric,
          color: form.color,
          embroidery: form.embroidery,
          designDetails: form.designDetails.trim(),
        }),
      });

      setPreview(data.preview);

      if (data.usage) {
        setUsage(data.usage);
      } else {
        await loadUsage();
      }

      setNotice(
        data.message || "Your outfit concept is ready!"
      );
    } catch (err) {
      setError(
        err.message ||
          "We could not generate your outfit preview. Please try again."
      );

      // Refresh usage so the displayed limit stays in sync.
      try {
        const usageData = await apiRequest(
          "/ai-outfit-preview/usage"
        );
        setUsage(usageData.usage);
      } catch {
        // Keep the original generation error visible.
      }
    } finally {
      setGenerating(false);
    }
  };

  const copyDesignDetails = async () => {
    if (!preview) return;

    const details = [
      "ABS CUT — AI OUTFIT CONCEPT",
      `Outfit: ${preview.outfitType}`,
      `Fabric: ${preview.fabric}`,
      `Colour: ${preview.color}`,
      `Embroidery: ${preview.embroidery ? "Yes" : "No"}`,
      `Design preferences: ${
        preview.designDetails || "No additional preferences"
      }`,
      `Preview: ${preview.url}`,
      "",
      "This is an AI-generated design concept, not a finished garment.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(details);
      setCopyMessage("Design details copied successfully.");
    } catch {
      setCopyMessage(
        "Unable to copy automatically. You can copy the preview link directly."
      );
    }
  };

  const remaining = usage
    ? Math.max(0, usage.remaining)
    : null;

  return (
    <main className="ai-preview-page">
      <section className="ai-preview-hero">
        <div className="ai-preview-hero-content">
          <span className="ai-preview-eyebrow">
            ABS CUT DESIGN STUDIO
          </span>

          <h1>
            Imagine It.
            <span> See Your Style.</span>
          </h1>

          <p>
            Explore your next native outfit with AI. Choose your
            style, fabric, colour and design preferences to create
            a visual concept before placing your custom order.
          </p>

          <div className="ai-preview-hero-actions">
            <a
              href="#ai-preview-form"
              className="ai-preview-primary-button"
            >
              Create My Preview
            </a>

            <Link
              to="/custom-order"
              className="ai-preview-secondary-button"
            >
              Custom Order
            </Link>
          </div>

          <div className="ai-preview-hero-note">
            <span aria-hidden="true">✦</span>
            Your style. Your vision. Your ABS CUT experience.
          </div>
        </div>
      </section>

      <section className="ai-preview-container">
        <div className="ai-preview-intro">
          <span className="ai-preview-section-label">
            PERSONALISE YOUR DESIGN
          </span>

          <h2>Create Your Outfit Concept</h2>

          <p>
            Select your preferences below. The AI will use them
            to create a visual fashion concept for inspiration.
          </p>
        </div>

        {usage && (
          <div
            className="ai-preview-usage"
            aria-live="polite"
          >
            <div className="ai-preview-usage-icon" aria-hidden="true">
              ✦
            </div>

            <div className="ai-preview-usage-text">
              <strong>Daily preview allowance</strong>
              <span>
                {usage.used} of {usage.limit} previews used today
              </span>
            </div>

            <div className="ai-preview-usage-remaining">
              <strong>{remaining}</strong>
              <span>remaining</span>
            </div>
          </div>
        )}

        {loadingUsage && (
          <p className="ai-preview-loading-text" role="status">
            Checking your daily preview allowance...
          </p>
        )}

        {error && (
          <div className="ai-preview-alert ai-preview-alert-error" role="alert">
            <span aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        {notice && (
          <div
            className="ai-preview-alert ai-preview-alert-success"
            role="status"
          >
            <span aria-hidden="true">✓</span>
            <p>{notice}</p>
          </div>
        )}

        <div className="ai-preview-workspace">
          <section
            className="ai-preview-form-card"
            id="ai-preview-form"
          >
            <div className="ai-preview-card-heading">
              <span className="ai-preview-card-number">01</span>

              <div>
                <h3>Design Preferences</h3>
                <p>Tell us what you would like to see.</p>
              </div>
            </div>

            <form onSubmit={handleGenerate}>
              <div className="ai-preview-form-group">
                <label htmlFor="ai-outfit-type">
                  Outfit type
                </label>

                <select
                  id="ai-outfit-type"
                  name="outfitType"
                  value={form.outfitType}
                  onChange={handleChange}
                  required
                  disabled={generating}
                >
                  {OUTFITS.map((outfit) => (
                    <option key={outfit} value={outfit}>
                      {outfit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ai-preview-form-row">
                <div className="ai-preview-form-group">
                  <label htmlFor="ai-outfit-fabric">
                    Fabric
                  </label>

                  <select
                    id="ai-outfit-fabric"
                    name="fabric"
                    value={form.fabric}
                    onChange={handleChange}
                    required
                    disabled={generating}
                  >
                    {FABRICS.map((fabric) => (
                      <option key={fabric} value={fabric}>
                        {fabric}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ai-preview-form-group">
                  <label htmlFor="ai-outfit-color">
                    Main colour
                  </label>

                  <select
                    id="ai-outfit-color"
                    name="color"
                    value={form.color}
                    onChange={handleChange}
                    required
                    disabled={generating}
                  >
                    {COLORS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="ai-preview-checkbox-card">
                <input
                  type="checkbox"
                  name="embroidery"
                  checked={form.embroidery}
                  onChange={handleChange}
                  disabled={generating}
                />

                <span className="ai-preview-checkbox-content">
                  <strong>Include embroidery</strong>
                  <span>
                    Add an embroidered design to the outfit concept.
                  </span>
                </span>

                <span
                  className="ai-preview-checkbox-icon"
                  aria-hidden="true"
                >
                  ✦
                </span>
              </label>

              <div className="ai-preview-form-group">
                <div className="ai-preview-label-row">
                  <label htmlFor="ai-design-details">
                    Additional design preferences
                  </label>

                  <span>
                    {form.designDetails.length}/500
                  </span>
                </div>

                <textarea
                  id="ai-design-details"
                  name="designDetails"
                  value={form.designDetails}
                  onChange={handleChange}
                  placeholder="Describe your preferred neckline, sleeves, fit, embroidery pattern, pockets, buttons or other design details..."
                  maxLength={500}
                  rows={5}
                  disabled={generating}
                />

                <small>
                  Optional. Be as specific as you like within 500
                  characters.
                </small>
              </div>

              <button
                type="submit"
                className="ai-preview-generate-button"
                disabled={
                  generating ||
                  loadingUsage ||
                  (usage !== null && remaining <= 0)
                }
              >
                {generating ? (
                  <>
                    <span
                      className="ai-preview-spinner"
                      aria-hidden="true"
                    />
                    Creating Your Design...
                  </>
                ) : usage && remaining <= 0 ? (
                  "Daily Limit Reached"
                ) : (
                  <>
                    <span aria-hidden="true">✦</span>
                    Generate Outfit Preview
                  </>
                )}
              </button>

              <p className="ai-preview-form-disclaimer">
                AI previews are design concepts. Final fabric,
                tailoring, colours and garment details may differ.
              </p>
            </form>
          </section>

          <section className="ai-preview-result-card">
            <div className="ai-preview-card-heading">
              <span className="ai-preview-card-number">02</span>

              <div>
                <h3>Your Outfit Preview</h3>
                <p>Your design concept will appear here.</p>
              </div>
            </div>

            {generating ? (
              <div
                className="ai-preview-generating"
                role="status"
                aria-live="polite"
              >
                <div className="ai-preview-generating-icon">
                  <span aria-hidden="true">✦</span>
                </div>

                <h4>Bringing Your Vision to Life</h4>

                <p>
                  Your outfit concept is being created. This may
                  take a little while.
                </p>

                <div className="ai-preview-progress-track">
                  <div className="ai-preview-progress-bar" />
                </div>
              </div>
            ) : preview ? (
              <div className="ai-preview-result">
                <div className="ai-preview-image-wrapper">
                  <img
                    src={preview.url}
                    alt={`AI-generated ${preview.color} ${preview.outfitType} concept in ${preview.fabric}`}
                    className="ai-preview-result-image"
                  />

                  <span className="ai-preview-image-badge">
                    AI DESIGN CONCEPT
                  </span>
                </div>

                <div className="ai-preview-result-details">
                  <span className="ai-preview-section-label">
                    YOUR DESIGN
                  </span>

                  <h4>
                    {preview.color} {preview.outfitType}
                  </h4>

                  <div className="ai-preview-detail-tags">
                    <span>{preview.fabric}</span>
                    <span>
                      {preview.embroidery
                        ? "Embroidery"
                        : "No embroidery"}
                    </span>
                  </div>

                  {preview.designDetails && (
                    <div className="ai-preview-design-notes">
                      <strong>Design preferences</strong>
                      <p>{preview.designDetails}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="ai-preview-copy-button"
                    onClick={copyDesignDetails}
                  >
                    <span aria-hidden="true">▣</span>
                    Copy Design Details
                  </button>

                  {copyMessage && (
                    <p
                      className="ai-preview-copy-message"
                      role="status"
                    >
                      {copyMessage}
                    </p>
                  )}

                  <Link
                    to="/custom-order"
                    className="ai-preview-order-button"
                  >
                    Continue to Custom Order
                  </Link>

                  <p className="ai-preview-result-disclaimer">
                    This concept is for inspiration. Your actual
                    outfit will be subject to fabric availability,
                    measurements, tailoring and confirmation by
                    ABS CUT.
                  </p>
                </div>
              </div>
            ) : (
              <div className="ai-preview-empty-state">
                <div
                  className="ai-preview-empty-icon"
                  aria-hidden="true"
                >
                  ✦
                </div>

                <h4>Your Design Starts Here</h4>

                <p>
                  Choose your outfit, fabric and colour, then
                  generate a concept to explore your style.
                </p>

                <div className="ai-preview-empty-details">
                  <span>01 — Choose your outfit</span>
                  <span>02 — Personalise your design</span>
                  <span>03 — Generate your preview</span>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="ai-preview-bottom-note">
          <span aria-hidden="true">✦</span>

          <p>
            Found a design you love? Use your generated concept
            as a reference when submitting a custom order to ABS CUT.
          </p>

          <Link to="/custom-order">
            Start a Custom Order
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AIOutfitPreview;
