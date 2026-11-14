
import { useEffect, useMemo, useState } from "react";

import {
  extractMeasurementSections,
  getApiErrorMessage,
} from "./measurementUtils";

import "./AIMeasurement.css";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const DEFAULT_API_URL =
  import.meta.env.VITE_AI_MEASUREMENT_API_URL || "";

/*
====================================================
UNIT CONVERSION
====================================================
*/

const cmToInches = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Number((number / 2.54).toFixed(2))
    : "";
};

const inchesToCm = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Number((number * 2.54).toFixed(2))
    : "";
};

const isValidMeasurement = (value) => {
  if (value === "" || value === null || value === undefined) {
    return false;
  }

  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number > 0 &&
    number <= 500
  );
};

/*
====================================================
GARMENT MEASUREMENT PROFILES
====================================================

These keys correspond to measurementUtils.js.

Circumferences:
chest, waist, hip

Front:
shoulder_span
upper_arm_left/right
forearm_left/right
hip_span
hip_to_knee_left/right
knee_to_ankle_left/right

Side:
shoulder_to_hip
hip_to_knee
knee_to_ankle
shoulder_to_wrist
*/

const GARMENT_PROFILES = {
  agbada: {
    label: "Agbada",
    description: "Traditional flowing Agbada and inner garment.",
    aiKeys: [
      "chest",
      "waist",
      "hip",
      "shoulder_span",
      "shoulder_to_hip",
      "shoulder_to_wrist",
      "upper_arm_left",
      "upper_arm_right",
      "forearm_left",
      "forearm_right",
    ],
    manualFields: [
      { key: "agbada_length", label: "Agbada length" },
      { key: "inner_garment_length", label: "Inner garment length" },
      { key: "back_width", label: "Back width" },
      { key: "armhole", label: "Armhole circumference" },
      { key: "wrist_opening", label: "Wrist opening" },
    ],
  },

  trouser: {
    label: "Trouser",
    description: "Trousers and fitted bottoms.",
    aiKeys: [
      "waist",
      "hip",
      "hip_span",
      "hip_to_knee",
      "hip_to_knee_left",
      "hip_to_knee_right",
      "knee_to_ankle",
      "knee_to_ankle_left",
      "knee_to_ankle_right",
    ],
    manualFields: [
      { key: "thigh", label: "Thigh circumference" },
      { key: "inseam", label: "Inseam" },
      { key: "outseam", label: "Outseam" },
      { key: "front_rise", label: "Front rise" },
      { key: "back_rise", label: "Back rise" },
      { key: "calf", label: "Calf circumference" },
      { key: "ankle_opening", label: "Ankle opening" },
    ],
  },

  shirt: {
    label: "Shirt",
    description: "Formal, casual and traditional shirts.",
    aiKeys: [
      "chest",
      "waist",
      "shoulder_span",
      "shoulder_to_hip",
      "shoulder_to_wrist",
      "upper_arm_left",
      "upper_arm_right",
      "forearm_left",
      "forearm_right",
    ],
    manualFields: [
      { key: "neck", label: "Neck circumference" },
      { key: "shirt_length", label: "Shirt length" },
      { key: "back_width", label: "Back width" },
      { key: "cuff", label: "Cuff circumference" },
      { key: "armhole", label: "Armhole circumference" },
    ],
  },

  senator: {
    label: "Senator",
    description: "Senator top with matching trousers.",
    aiKeys: [
      "chest",
      "waist",
      "hip",
      "shoulder_span",
      "shoulder_to_hip",
      "shoulder_to_wrist",
      "upper_arm_left",
      "upper_arm_right",
      "forearm_left",
      "forearm_right",
      "hip_span",
      "hip_to_knee",
      "hip_to_knee_left",
      "hip_to_knee_right",
      "knee_to_ankle",
      "knee_to_ankle_left",
      "knee_to_ankle_right",
    ],
    manualFields: [
      { key: "neck", label: "Neck circumference" },
      { key: "top_length", label: "Senator top length" },
      { key: "back_width", label: "Back width" },
      { key: "armhole", label: "Armhole circumference" },
      { key: "cuff", label: "Cuff circumference" },
      { key: "thigh", label: "Thigh circumference" },
      { key: "inseam", label: "Inseam" },
      { key: "outseam", label: "Outseam" },
      { key: "front_rise", label: "Front rise" },
      { key: "back_rise", label: "Back rise" },
      { key: "ankle_opening", label: "Ankle opening" },
    ],
  },

  kaftan: {
    label: "Kaftan",
    description: "Traditional and contemporary Kaftan designs.",
    aiKeys: [
      "chest",
      "waist",
      "hip",
      "shoulder_span",
      "shoulder_to_hip",
      "shoulder_to_wrist",
      "upper_arm_left",
      "upper_arm_right",
      "forearm_left",
      "forearm_right",
    ],
    manualFields: [
      { key: "neck", label: "Neck circumference" },
      { key: "kaftan_length", label: "Kaftan length" },
      { key: "back_width", label: "Back width" },
      { key: "armhole", label: "Armhole circumference" },
      { key: "wrist_opening", label: "Wrist opening" },
    ],
  },

  native_wear: {
    label: "Native Wear",
    description: "Other traditional Nigerian native outfits.",
    aiKeys: [
      "chest",
      "waist",
      "hip",
      "shoulder_span",
      "shoulder_to_hip",
      "shoulder_to_wrist",
      "upper_arm_left",
      "upper_arm_right",
      "forearm_left",
      "forearm_right",
    ],
    manualFields: [
      { key: "neck", label: "Neck circumference" },
      { key: "garment_length", label: "Garment length" },
      { key: "back_width", label: "Back width" },
      { key: "armhole", label: "Armhole circumference" },
      { key: "cuff", label: "Cuff circumference" },
    ],
  },

  jacket: {
    label: "Jacket",
    description: "Formal and casual jackets.",
    aiKeys: [
      "chest",
      "waist",
      "hip",
      "shoulder_span",
      "shoulder_to_hip",
      "shoulder_to_wrist",
      "upper_arm_left",
      "upper_arm_right",
      "forearm_left",
      "forearm_right",
    ],
    manualFields: [
      { key: "neck", label: "Neck circumference" },
      { key: "jacket_length", label: "Jacket length" },
      { key: "back_width", label: "Back width" },
      { key: "armhole", label: "Armhole circumference" },
      { key: "cuff", label: "Cuff circumference" },
    ],
  },

  waistcoat: {
    label: "Waistcoat",
    description: "Formal and traditional waistcoats.",
    aiKeys: [
      "chest",
      "waist",
      "hip",
      "shoulder_span",
      "shoulder_to_hip",
    ],
    manualFields: [
      { key: "neck", label: "Neck circumference" },
      { key: "waistcoat_length", label: "Waistcoat length" },
      { key: "back_width", label: "Back width" },
      { key: "armhole", label: "Armhole circumference" },
    ],
  },

  shorts: {
    label: "Shorts",
    description: "Casual and tailored shorts.",
    aiKeys: [
      "waist",
      "hip",
      "hip_span",
      "hip_to_knee",
      "hip_to_knee_left",
      "hip_to_knee_right",
    ],
    manualFields: [
      { key: "thigh", label: "Thigh circumference" },
      { key: "front_rise", label: "Front rise" },
      { key: "back_rise", label: "Back rise" },
      { key: "inseam", label: "Inseam" },
      { key: "outseam", label: "Outseam" },
      { key: "leg_opening", label: "Leg opening" },
    ],
  },
};

/*
====================================================
MEASUREMENT TEXT FORMATTER
====================================================
*/

const formatMeasurementText = (
  sections,
  manualMeasurements,
  manualFields,
) => {
  const aiText = sections
    .map((section) => {
      const lines = section.items.map((item) => {
        const inches = Number(item.value);
        const cm = inchesToCm(inches);

        return `${item.label}: ${inches.toFixed(2)} in / ${cm.toFixed(2)} cm`;
      });

      return lines.length
        ? `${section.title}\n${lines.join("\n")}`
        : "";
    })
    .filter(Boolean)
    .join("\n\n");

  const manualText = manualFields
    .filter((field) => manualMeasurements[field.key] !== "")
    .map((field) => {
      const inches = Number(manualMeasurements[field.key]);
      const cm = inchesToCm(inches);

      return `${field.label}: ${inches.toFixed(2)} in / ${cm.toFixed(2)} cm`;
    });

  return [
    aiText,
    manualText.length
      ? `Additional garment measurements\n${manualText.join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

/*
====================================================
MAIN COMPONENT
====================================================
*/

function AIMeasurement({
  onComplete,
  onCancel,
  initialMeasurements = "",
  showManualEditing = true,
  apiBaseUrl = DEFAULT_API_URL,
}) {
  const [garmentType, setGarmentType] = useState("agbada");

  const [frontPhoto, setFrontPhoto] = useState(null);
  const [sidePhoto, setSidePhoto] = useState(null);

  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState("cm");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [result, setResult] = useState(null);
  const [sections, setSections] = useState([]);

  const [manualMeasurements, setManualMeasurements] =
    useState({});

  const [manualSources, setManualSources] = useState({});

  const [confirmed, setConfirmed] = useState(false);

  const [frontPreview, setFrontPreview] = useState("");
  const [sidePreview, setSidePreview] = useState("");

  const apiUrl = useMemo(
    () => apiBaseUrl.trim().replace(/\/+$/, ""),
    [apiBaseUrl],
  );

  const selectedProfile = GARMENT_PROFILES[garmentType];

  const filteredSections = useMemo(() => {
    if (!selectedProfile) return [];

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          selectedProfile.aiKeys.includes(item.key),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, selectedProfile]);

  /*
  ==========================================
  IMAGE PREVIEWS
  ==========================================
  */

  useEffect(() => {
    if (!frontPhoto) {
      setFrontPreview("");
      return undefined;
    }

    const preview = URL.createObjectURL(frontPhoto);
    setFrontPreview(preview);

    return () => URL.revokeObjectURL(preview);
  }, [frontPhoto]);

  useEffect(() => {
    if (!sidePhoto) {
      setSidePreview("");
      return undefined;
    }

    const preview = URL.createObjectURL(sidePhoto);
    setSidePreview(preview);

    return () => URL.revokeObjectURL(preview);
  }, [sidePhoto]);

  /*
  ==========================================
  PHOTO VALIDATION
  ==========================================
  */

  const validatePhoto = (file, label) => {
    if (!file) {
      return `Please upload your ${label} photograph.`;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `${label} photograph must be JPG, PNG or WEBP.`;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return `${label} photograph must not exceed 10MB.`;
    }

    return "";
  };

  const handlePhotoChange = (event, view) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const validationError = validatePhoto(file, view);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    if (view === "front") {
      setFrontPhoto(file);
    } else {
      setSidePhoto(file);
    }

    setError("");
    setConfirmed(false);
  };

  const removePhoto = (view) => {
    if (view === "front") {
      setFrontPhoto(null);
    } else {
      setSidePhoto(null);
    }

    setError("");
    setConfirmed(false);
  };

  /*
  ==========================================
  CALCULATE MEASUREMENTS
  ==========================================
  */

  const handleCalculate = async (event) => {
    event.preventDefault();

    if (loading) return;

    const frontError = validatePhoto(frontPhoto, "front");
    const sideError = validatePhoto(sidePhoto, "side");

    if (frontError || sideError) {
      setError(frontError || sideError);
      return;
    }

    const numericHeight = Number(height);

    if (
      !Number.isFinite(numericHeight) ||
      numericHeight <= 0
    ) {
      setError("Please enter a valid height.");
      return;
    }

    if (!apiUrl) {
      setError(
        "AI measurement API is not configured. Please set VITE_AI_MEASUREMENT_API_URL.",
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);
      setSections([]);
      setManualMeasurements({});
      setManualSources({});
      setConfirmed(false);

      const imageData = new FormData();

      imageData.append("front_photo", frontPhoto);
      imageData.append("side_photo", sidePhoto);
      imageData.append("height", String(numericHeight));
      imageData.append("height_unit", heightUnit);
      imageData.append("garment_type", garmentType);

      const response = await fetch(
        `${apiUrl}/api/measurements/calculate`,
        {
          method: "POST",
          body: imageData,
        },
      );

      let responseData;

      try {
        responseData = await response.json();
      } catch {
        throw new Error(
          "The measurement service returned an invalid response.",
        );
      }

      if (!response.ok || !responseData.success) {
        throw new Error(
          getApiErrorMessage(
            responseData,
            "Unable to calculate your measurements.",
          ),
        );
      }

      const extractedSections =
        extractMeasurementSections(responseData);

      const filtered = extractedSections
        .map((section) => ({
          ...section,
          items: section.items
            .filter((item) =>
              selectedProfile.aiKeys.includes(item.key),
            )
            .map((item) => ({
              ...item,
              value: String(cmToInches(item.value)),
              source: "ai_estimate",
            })),
        }))
        .filter((section) => section.items.length > 0);

      /*
      Do not reject the result when there are no
      usable AI measurements for this garment.

      The customer can still enter manual measurements.
      */

      setResult(responseData);
      setSections(filtered);
    } catch (requestError) {
      console.error(
        "ABS CUT AI measurement error:",
        requestError,
      );

      setError(
        requestError.message ||
          "Unable to connect to the AI measurement service.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  ==========================================
  EDIT AI MEASUREMENTS
  ==========================================
  */

  const handleMeasurementEdit = (
    sectionId,
    measurementKey,
    value,
  ) => {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          items: section.items.map((item) =>
            item.key === measurementKey
              ? {
                  ...item,
                  value,
                  source: "customer_confirmed",
                }
              : item,
          ),
        };
      }),
    );

    setConfirmed(false);
    setError("");
  };

  /*
  ==========================================
  EDIT MANUAL MEASUREMENTS
  ==========================================
  */

  const handleManualEdit = (key, value) => {
    setManualMeasurements((current) => ({
      ...current,
      [key]: value,
    }));

    setManualSources((current) => ({
      ...current,
      [key]: current[key] || "customer_entered",
    }));

    setConfirmed(false);
    setError("");
  };

  const handleManualSourceChange = (key, source) => {
    setManualSources((current) => ({
      ...current,
      [key]: source,
    }));

    setConfirmed(false);
  };

  /*
  ==========================================
  CONFIRM MEASUREMENTS
  ==========================================
  */

  const handleConfirm = () => {
    if (!result) return;

    const allAiItems = filteredSections.flatMap(
      (section) => section.items,
    );

    const enteredManualFields = selectedProfile.manualFields
      .filter(
        (field) => manualMeasurements[field.key] !== "",
      );

    const invalidMeasurement = allAiItems.some(
      (item) => !isValidMeasurement(item.value),
    );

    const invalidManualMeasurement = enteredManualFields.some(
      (field) =>
        !isValidMeasurement(manualMeasurements[field.key]),
    );

    if (invalidMeasurement || invalidManualMeasurement) {
      setError(
        "Please check that every entered measurement is a valid value greater than zero.",
      );
      return;
    }

    if (
      allAiItems.length === 0 &&
      enteredManualFields.length === 0
    ) {
      setError(
        "Please enter at least one measurement before continuing.",
      );
      return;
    }

    /*
    AI VALUES IN INCHES
    */

    const measurementData = Object.fromEntries(
      filteredSections.map((section) => [
        section.id,
        Object.fromEntries(
          section.items.map((item) => [
            item.key,
            Number(Number(item.value).toFixed(2)),
          ]),
        ),
      ]),
    );

    /*
    AI VALUES IN CENTIMETRES
    */

    const measurementDataCm = Object.fromEntries(
      filteredSections.map((section) => [
        section.id,
        Object.fromEntries(
          section.items.map((item) => [
            item.key,
            inchesToCm(item.value),
          ]),
        ),
      ]),
    );

    /*
    AI MEASUREMENT PROVENANCE
    */

    const measurementProvenance = Object.fromEntries(
      filteredSections.flatMap((section) =>
        section.items.map((item) => [
          item.key,
          item.source || "ai_estimate",
        ]),
      ),
    );

    /*
    MANUAL VALUES IN INCHES
    */

    const manualMeasurementData = Object.fromEntries(
      enteredManualFields.map((field) => [
        field.key,
        Number(
          Number(manualMeasurements[field.key]).toFixed(2),
        ),
      ]),
    );

    /*
    MANUAL VALUES IN CENTIMETRES
    */

    const manualMeasurementDataCm = Object.fromEntries(
      enteredManualFields.map((field) => [
        field.key,
        inchesToCm(manualMeasurements[field.key]),
      ]),
    );

    /*
    MANUAL MEASUREMENT SOURCES

    customer_entered
    tailor_verified
    */

    const manualMeasurementProvenance = Object.fromEntries(
      enteredManualFields.map((field) => [
        field.key,
        manualSources[field.key] || "customer_entered",
      ]),
    );

    const measurementText = formatMeasurementText(
      filteredSections,
      manualMeasurements,
      selectedProfile.manualFields,
    );

    setError("");
    setConfirmed(true);

    if (typeof onComplete === "function") {
      onComplete({
        garmentType,
        garmentLabel: selectedProfile.label,

        measurements: measurementText,

        measurementData,
        measurementDataCm,

        manualMeasurementData,
        manualMeasurementDataCm,

        measurementProvenance,
        manualMeasurementProvenance,

        measurementUnit: "in",
        manualMeasurementUnit: "in",

        rawResponse: result,

        measurementMethod: "ABS CUT AI Measurement",
        accuracyStatus: result.accuracy_status,
        heightReference: result.height_reference,

        verificationStatus: "customer_review_required",
      });
    }
  };

  /*
  ==========================================
  RESET
  ==========================================
  */

  const handleReset = () => {
    setFrontPhoto(null);
    setSidePhoto(null);

    setHeight("");
    setHeightUnit("cm");

    setResult(null);
    setSections([]);

    setManualMeasurements({});
    setManualSources({});

    setError("");
    setConfirmed(false);
  };

  /*
  ==========================================
  USER INTERFACE
  ==========================================
  */

  return (
    <section className="abs-ai-measurement">
      <header className="abs-ai-header">
        <div className="abs-ai-header-icon">✦</div>

        <div>
          <span className="abs-ai-eyebrow">
            ABS CUT INTELLIGENT TAILORING
          </span>

          <h2>AI Body Measurement</h2>

          <p>
            Select your garment, upload your photographs and
            review your experimental measurement estimates.
          </p>
        </div>
      </header>

      {!result && (
        <form
          className="abs-ai-form"
          onSubmit={handleCalculate}
        >
          <div className="abs-ai-garment-section">
            <label htmlFor="abs-ai-garment">
              Select Garment Type
            </label>

            <select
              id="abs-ai-garment"
              value={garmentType}
              onChange={(event) => {
                setGarmentType(event.target.value);
                setError("");
              }}
            >
              {Object.entries(GARMENT_PROFILES).map(
                ([value, profile]) => (
                  <option key={value} value={value}>
                    {profile.label}
                  </option>
                ),
              )}
            </select>

            <small>{selectedProfile.description}</small>
          </div>

          <div className="abs-ai-instructions">
            <span className="abs-ai-info-icon">i</span>

            <div>
              <strong>Before you upload</strong>

              <p>
                Use clear, full-body photographs. Stand upright,
                keep your arms slightly away from your body,
                and ensure your feet and head are visible.
                Avoid obstructing clothing where possible.
              </p>
            </div>
          </div>

          <div className="abs-ai-photo-grid">
            <div className="abs-ai-photo-card">
              <div className="abs-ai-photo-heading">
                <span>01</span>

                <div>
                  <strong>Front View</strong>
                  <small>Facing the camera</small>
                </div>
              </div>

              <label className="abs-ai-photo-upload">
                {frontPreview ? (
                  <img
                    src={frontPreview}
                    alt="Front view preview"
                  />
                ) : (
                  <div className="abs-ai-photo-placeholder">
                    <span>↑</span>
                    <strong>Upload Front Photo</strong>
                    <small>JPG, PNG or WEBP</small>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    handlePhotoChange(event, "front")
                  }
                />
              </label>

              {frontPhoto && (
                <div className="abs-ai-file-info">
                  <span>{frontPhoto.name}</span>

                  <button
                    type="button"
                    onClick={() => removePhoto("front")}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="abs-ai-photo-card">
              <div className="abs-ai-photo-heading">
                <span>02</span>

                <div>
                  <strong>Side View</strong>
                  <small>Standing sideways</small>
                </div>
              </div>

              <label className="abs-ai-photo-upload">
                {sidePreview ? (
                  <img
                    src={sidePreview}
                    alt="Side view preview"
                  />
                ) : (
                  <div className="abs-ai-photo-placeholder">
                    <span>↑</span>
                    <strong>Upload Side Photo</strong>
                    <small>JPG, PNG or WEBP</small>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    handlePhotoChange(event, "side")
                  }
                />
              </label>

              {sidePhoto && (
                <div className="abs-ai-file-info">
                  <span>{sidePhoto.name}</span>

                  <button
                    type="button"
                    onClick={() => removePhoto("side")}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="abs-ai-height-section">
            <label htmlFor="abs-ai-height">
              Your Height
            </label>

            <div className="abs-ai-height-input">
              <input
                id="abs-ai-height"
                type="number"
                min="1"
                step="any"
                value={height}
                onChange={(event) => {
                  setHeight(event.target.value);
                  setError("");
                }}
                placeholder="Enter your height"
                required
              />

              <select
                value={heightUnit}
                onChange={(event) =>
                  setHeightUnit(event.target.value)
                }
                aria-label="Height unit"
              >
                <option value="cm">Centimetres (cm)</option>
                <option value="inches">Inches (in)</option>
              </select>
            </div>

            <small>
              Your height is used as the reference for image
              scale estimation.
            </small>
          </div>

          {error && (
            <div className="abs-ai-error" role="alert">
              <span>!</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="abs-ai-primary-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="abs-ai-spinner" />
                ANALYSING PHOTOGRAPHS...
              </>
            ) : (
              <>
                CALCULATE MY MEASUREMENTS
                <span>→</span>
              </>
            )}
          </button>

          <p className="abs-ai-privacy-note">
            Your photographs are sent to the ABS CUT
            measurement service for processing.
          </p>
        </form>
      )}

      {result && (
        <div className="abs-ai-results">
          <div className="abs-ai-result-heading">
            <div>
              <span className="abs-ai-eyebrow">
                ANALYSIS COMPLETE
              </span>

              <h3>{selectedProfile.label} Measurements</h3>

              <p>
                Review the available estimates and enter
                additional measurements required for this garment.
              </p>
            </div>

            <span className="abs-ai-result-icon">✓</span>
          </div>

          <div className="abs-ai-warning">
            <strong>Important measurement notice</strong>

            <p>
              These are experimental estimates, not validated
              tailoring measurements. Circumferences are
              approximate silhouette estimates, and projected
              body segments are not equivalent to finished
              garment dimensions. Verify measurements manually
              before garment production.
            </p>
          </div>

          <div className="abs-ai-unit-notice">
            <strong>Measurements in inches and centimetres</strong>

            <p>
              Values are editable in inches. Corresponding
              centimetre values update automatically.
              Editing an AI estimate marks it as customer-confirmed,
              not tailor-verified.
            </p>
          </div>

          <div className="abs-ai-result-sections">
            {filteredSections.length > 0 ? (
              filteredSections.map((section) => (
                <section
                  className="abs-ai-result-section"
                  key={section.id}
                >
                  <div className="abs-ai-result-section-heading">
                    <h4>{section.title}</h4>
                    <p>{section.description}</p>
                  </div>

                  <div className="abs-ai-measurement-grid">
                    {section.items.map((item) => (
                      <label
                        className="abs-ai-measurement-field"
                        key={item.key}
                      >
                        <span>{item.label}</span>

                        <div>
                          <input
                            type="number"
                            min="0.1"
                            max="500"
                            step="0.01"
                            value={item.value}
                            readOnly={!showManualEditing}
                            onChange={(event) =>
                              handleMeasurementEdit(
                                section.id,
                                item.key,
                                event.target.value,
                              )
                            }
                          />

                          <small>in</small>
                        </div>

                        <span className="abs-ai-converted-value">
                          {item.value !== "" &&
                          Number.isFinite(Number(item.value))
                            ? `${inchesToCm(item.value)} cm`
                            : "Enter a valid value"}
                        </span>

                        <span
                          className={`abs-ai-source ${
                            item.source === "customer_confirmed"
                              ? "is-confirmed"
                              : ""
                          }`}
                        >
                          {item.source === "customer_confirmed"
                            ? "Customer confirmed"
                            : "Experimental AI estimate"}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="abs-ai-instructions">
                <span className="abs-ai-info-icon">i</span>

                <div>
                  <strong>No usable AI estimates for this garment</strong>

                  <p>
                    You can still enter the garment measurements
                    manually below. The original photo analysis
                    response is retained.
                  </p>
                </div>
              </div>
            )}
          </div>

          <section className="abs-ai-manual-section">
            <div className="abs-ai-result-section-heading">
              <h4>
                Additional {selectedProfile.label} Measurements
              </h4>

              <p>
                These measurements are not reliably obtainable
                from the current two-photo system. Enter them
                using a measuring tape or have a tailor measure them.
              </p>
            </div>

            <div className="abs-ai-measurement-grid">
              {selectedProfile.manualFields.map((field) => {
                const value =
                  manualMeasurements[field.key] ?? "";

                return (
                  <label
                    className="abs-ai-measurement-field"
                    key={field.key}
                  >
                    <span>{field.label}</span>

                    <div>
                      <input
                        type="number"
                        min="0.1"
                        max="500"
                        step="0.01"
                        value={value}
                        readOnly={!showManualEditing}
                        placeholder="Enter measurement"
                        onChange={(event) =>
                          handleManualEdit(
                            field.key,
                            event.target.value,
                          )
                        }
                      />

                      <small>in</small>
                    </div>

                    <span className="abs-ai-converted-value">
                      {value !== "" &&
                      Number.isFinite(Number(value))
                        ? `${inchesToCm(value)} cm`
                        : "Manual measurement"}
                    </span>

                    <span className="abs-ai-source is-manual">
                      {manualSources[field.key] === "tailor_verified"
                        ? "Tailor verified"
                        : "Customer entered"}
                    </span>

                    <select
                      aria-label={`${field.label} verification source`}
                      value={
                        manualSources[field.key] ||
                        "customer_entered"
                      }
                      disabled={!showManualEditing || value === ""}
                      onChange={(event) =>
                        handleManualSourceChange(
                          field.key,
                          event.target.value,
                        )
                      }
                    >
                      <option value="customer_entered">
                        Customer entered
                      </option>

                      <option value="tailor_verified">
                        Tailor verified
                      </option>
                    </select>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="abs-ai-result-actions">
            <button
              type="button"
              className="abs-ai-secondary-button"
              onClick={handleReset}
            >
              START AGAIN
            </button>

            <button
              type="button"
              className="abs-ai-primary-button"
              onClick={handleConfirm}
            >
              USE THESE MEASUREMENTS
              <span>→</span>
            </button>
          </div>

          {confirmed && (
            <div className="abs-ai-success" role="status">
              <span>✓</span>
              Measurements have been passed to the parent
              component with their units and source information.
            </div>
          )}

          {error && (
            <div className="abs-ai-error" role="alert">
              <span>!</span>
              {error}
            </div>
          )}

          {typeof onCancel === "function" && (
            <button
              type="button"
              className="abs-ai-cancel-button"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default AIMeasurement;
