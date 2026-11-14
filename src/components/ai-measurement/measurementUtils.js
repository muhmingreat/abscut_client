

const FRONT_LABELS = {
  shoulder_span: "Shoulder span",
  upper_arm_left: "Left upper arm",
  upper_arm_right: "Right upper arm",
  forearm_left: "Left forearm",
  forearm_right: "Right forearm",
  hip_span: "Hip span",
  hip_to_knee_left: "Left hip to knee",
  hip_to_knee_right: "Right hip to knee",
  knee_to_ankle_left: "Left knee to ankle",
  knee_to_ankle_right: "Right knee to ankle",
};

const SIDE_LABELS = {
  shoulder_to_hip: "Shoulder to hip",
  hip_to_knee: "Hip to knee",
  knee_to_ankle: "Knee to ankle",
  shoulder_to_wrist: "Shoulder to wrist",
};

const CIRCUMFERENCE_LABELS = {
  chest: "Chest circumference",
  waist: "Waist circumference",
  hip: "Hip circumference",
};

function collectMeasurements(source, labels) {
  return Object.entries(labels)
    .map(([key, label]) => {
      const result = source?.[key];

      if (
        !result?.available ||
        !Number.isFinite(Number(result.estimated_cm))
      ) {
        return null;
      }

      return {
        key,
        label,
        value: String(result.estimated_cm),
      };
    })
    .filter(Boolean);
}

export function extractMeasurementSections(response) {
  const measurements = response?.measurements || {};
  const contours = response?.contour_measurements || {};

  return [
    {
      id: "circumferences",
      title: "Body circumferences",
      description: "Experimental silhouette-based estimates.",
      items: collectMeasurements(
        contours.estimated_circumferences,
        CIRCUMFERENCE_LABELS,
      ),
    },
    {
      id: "front",
      title: "Front-view measurements",
      description: "Projected 2D distances from the front photograph.",
      items: collectMeasurements(
        measurements.front_view,
        FRONT_LABELS,
      ),
    },
    {
      id: "side",
      title: "Side-view measurements",
      description: "Projected 2D distances from the side photograph.",
      items: collectMeasurements(
        measurements.side_view,
        SIDE_LABELS,
      ),
    },
  ].filter((section) => section.items.length > 0);
}

export function formatMeasurementText(sections) {
  return sections
    .map((section) => {
      const lines = section.items
        .map((item) => {
          const value = Number(item.value);

          return `${item.label}: ${
            Number.isFinite(value) ? value : item.value
          } cm`;
        })
        .join("\n");

      return `${section.title}\n${lines}`;
    })
    .join("\n\n");
}

export function getApiErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => item.msg || item.message || "Invalid input")
      .join(", ");
  }

  return data?.message || fallback;
}