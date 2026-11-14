
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../../services/api";
import "./PartyMaterials.css";

const initialForm = {
  eventDate: "",
  eventType: "",
  partySize: "1",
  contactName: "",
  phone: "",
  deliveryMethod: "collection",
  deliveryAddress: "",
  customerNotes: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function getLocalDate() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDefaultChoice(material) {
  return {
    packageId: material.packages?.[0]?._id || "",
    quantity: "1",
    headwearType: "none",
    headwearQuantity: "1",
    isSelected: false,
  };
}

function getBookingFromResponse(result) {
  return (
    result?.booking ||
    result?.partyBooking ||
    result?.data?.booking ||
    result?.data?.partyBooking ||
    null
  );
}

export default function PartyMaterials() {
  const navigate = useNavigate();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState({});
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const today = getLocalDate();

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/party-bookings/materials");

      setMaterials(
        Array.isArray(result.materials)
          ? result.materials
          : []
      );
    } catch (err) {
      setError(err.message || "Could not load party materials.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        materials
          .map((material) => material.category)
          .filter(Boolean)
      ),
    ],
    [materials]
  );

  const visibleMaterials = useMemo(
    () =>
      category === "All"
        ? materials
        : materials.filter(
            (material) => material.category === category
          ),
    [materials, category]
  );

  function getChoice(material) {
    return (
      selected[material._id] ||
      getDefaultChoice(material)
    );
  }

  function updateSelection(material, key, value) {
    setSelected((previous) => {
      const current =
        previous[material._id] ||
        getDefaultChoice(material);

      return {
        ...previous,
        [material._id]: {
          ...current,
          [key]: value,
        },
      };
    });

    setError("");
  }

  function toggleMaterial(material) {
    const current = getChoice(material);

    setSelected((previous) => ({
      ...previous,
      [material._id]: {
        ...current,
        isSelected: !current.isSelected,
      },
    }));

    setError("");
    setNotice("");
  }

  const chosenMaterials = useMemo(
    () =>
      materials.filter((material) => {
        const choice = selected[material._id];

        return Boolean(
          choice?.isSelected &&
            choice.packageId &&
            Number.isInteger(Number(choice.quantity)) &&
            Number(choice.quantity) > 0
        );
      }),
    [materials, selected]
  );

  const getMaterialTotal = useCallback(
    (material) => {
      const choice = selected[material._id];

      if (!choice) return 0;

      const selectedPackage = material.packages?.find(
        (item) => String(item._id) === String(choice.packageId)
      );

      const packageTotal =
        Number(selectedPackage?.price || 0) *
        Number(choice.quantity || 0);

      const headwearTotal =
        choice.headwearType !== "none"
          ? Number(material.headwear?.price || 0) *
            Number(choice.headwearQuantity || 0)
          : 0;

      return packageTotal + headwearTotal;
    },
    [selected]
  );

  const estimatedTotal = chosenMaterials.reduce(
    (total, material) =>
      total + getMaterialTotal(material),
    0
  );

  function validateSelections() {
    if (!chosenMaterials.length) {
      return "Choose at least one material package.";
    }

    for (const material of chosenMaterials) {
      const choice = selected[material._id];

      const selectedPackage = material.packages?.find(
        (item) => String(item._id) === String(choice.packageId)
      );

      if (!selectedPackage) {
        return `Choose a valid package for ${material.name}.`;
      }

      if (
        !Number.isInteger(Number(choice.quantity)) ||
        Number(choice.quantity) < 1
      ) {
        return `Enter a valid package quantity for ${material.name}.`;
      }

      if (
        choice.headwearType !== "none" &&
        (
          !Number.isInteger(Number(choice.headwearQuantity)) ||
          Number(choice.headwearQuantity) < 1
        )
      ) {
        return `Enter a valid headwear quantity for ${material.name}.`;
      }
    }

    return "";
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function submitBooking(event) {
    event.preventDefault();

    setError("");
    setNotice("");

    const selectionError = validateSelections();

    if (selectionError) {
      setError(selectionError);
      return;
    }

    if (!form.eventDate || form.eventDate < today) {
      setError("Please select today or a future event date.");
      return;
    }

    if (!form.eventType.trim()) {
      setError("Please enter the event type.");
      return;
    }

    if (
      !Number.isInteger(Number(form.partySize)) ||
      Number(form.partySize) < 1
    ) {
      setError("Enter a valid party size.");
      return;
    }

    if (
      form.deliveryMethod === "delivery" &&
      !form.deliveryAddress.trim()
    ) {
      setError("Please provide your delivery address.");
      return;
    }

    const items = chosenMaterials.map((material) => {
      const choice = selected[material._id];

      return {
        material: material._id,
        packageId: choice.packageId,
        quantity: Number(choice.quantity),
        headwearType: choice.headwearType || "none",
        headwearQuantity:
          choice.headwearType === "none"
            ? 0
            : Number(choice.headwearQuantity),
      };
    });

    setSubmitting(true);

    try {
      const result = await apiRequest("/party-bookings", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          eventType: form.eventType.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
          partySize: Number(form.partySize),
          deliveryAddress:
            form.deliveryMethod === "delivery"
              ? form.deliveryAddress.trim()
              : "",
          customerNotes: form.customerNotes.trim(),
          items,
        }),
      });

      const createdBooking = getBookingFromResponse(result);

      // A successful response without a booking object is still
      // a successful submission. Never treat it as a failed POST.
      if (createdBooking?._id) {
        navigate(
          `/party-booking-confirmation?bookingId=${encodeURIComponent(
            createdBooking._id
          )}`,
          {
            state: {
              booking: createdBooking,
            },
          }
        );
      } else {
        navigate("/my-party-bookings", {
          state: {
            notice:
              result?.message ||
              "Your reservation was submitted successfully. You can view it in your bookings.",
          },
        });
      }
    } catch (err) {
      setError(
        err.message || "Could not submit your reservation."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="abs-feature-page abs-party-page abs-party-materials-page">
      <section className="abs-feature-hero">
        <span className="abs-feature-eyebrow">
          MATERIALS FOR YOUR MOMENT
        </span>

        <h1>
          Party <em>Materials</em>
        </h1>

        <p>
          Explore fabrics for celebrations and special occasions.
          Select your packages and submit a reservation request.
          Our team will confirm availability and quotation before payment.
        </p>
      </section>

      <section className="abs-feature-content">
        {error && (
          <div className="abs-feature-alert is-error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="abs-feature-alert is-success" role="status">
            {notice}
          </div>
        )}

        <div className="abs-material-toolbar">
          <div>
            <h2>Explore the collection</h2>
            <p>
              Party material stock is separate from ready-to-wear
              product inventory.
            </p>
          </div>

          <label className="abs-feature-filter">
            Category

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="abs-feature-state">
            Loading available materials…
          </div>
        ) : visibleMaterials.length === 0 ? (
          <div className="abs-feature-empty">
            <span className="abs-feature-empty-mark">AC</span>
            <h2>Materials are being prepared</h2>
            <p>
              Our collection will appear here as soon as the team
              adds materials.
            </p>

            <button
              type="button"
              className="abs-feature-button abs-feature-button-secondary"
              onClick={loadMaterials}
            >
              Refresh collection
            </button>
          </div>
        ) : (
          <div className="abs-material-grid">
            {visibleMaterials.map((material) => {
              const choice = getChoice(material);

              const selectedPackage = material.packages?.find(
                (item) =>
                  String(item._id) === String(choice.packageId)
              );

              const headwearOptions =
                material.headwear?.available
                  ? ["cap", "gele"].filter((type) =>
                      ["cap-or-gele", type].includes(
                        material.headwear.type
                      )
                    )
                  : [];

              return (
                <article
                  className={`abs-material-card ${
                    choice.isSelected ? "is-selected" : ""
                  }`}
                  key={material._id}
                >
                  {material.image ? (
                    <img
                      className="abs-material-image"
                      src={material.image}
                      alt={material.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="abs-material-image abs-material-placeholder">
                      <span>ABS CUT</span>
                      <small>{material.category}</small>
                    </div>
                  )}

                  <div className="abs-material-body">
                    <div className="abs-material-tags">
                      <span>{material.category}</span>

                      {material.variety && (
                        <span>{material.variety}</span>
                      )}
                    </div>

                    <h3>{material.name}</h3>

                    {material.description && (
                      <p className="abs-material-description">
                        {material.description}
                      </p>
                    )}

                    {material.packages?.length > 0 ? (
                      <>
                        <label className="abs-feature-field">
                          Package

                          <select
                            value={choice.packageId}
                            onChange={(event) =>
                              updateSelection(
                                material,
                                "packageId",
                                event.target.value
                              )
                            }
                          >
                            {material.packages.map((item) => (
                              <option
                                value={item._id}
                                key={item._id}
                              >
                                {item.name}
                                {item.yards
                                  ? ` · ${item.yards} yards`
                                  : ""}
                                {" · "}
                                {money(item.price)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="abs-material-controls">
                          <label className="abs-feature-field">
                            Packages

                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={choice.quantity}
                              onChange={(event) =>
                                updateSelection(
                                  material,
                                  "quantity",
                                  event.target.value
                                )
                              }
                            />
                          </label>

                          <div className="abs-material-price">
                            {selectedPackage
                              ? money(
                                  Number(selectedPackage.price || 0) *
                                    Number(choice.quantity || 0)
                                )
                              : "Price on request"}

                            <small>Indicative package total</small>
                          </div>
                        </div>

                        {headwearOptions.length > 0 && (
                          <div className="abs-material-headwear">
                            <label className="abs-feature-field">
                              Optional headwear

                              <select
                                value={choice.headwearType}
                                onChange={(event) =>
                                  updateSelection(
                                    material,
                                    "headwearType",
                                    event.target.value
                                  )
                                }
                              >
                                <option value="none">
                                  No headwear
                                </option>

                                {headwearOptions.map((type) => (
                                  <option value={type} key={type}>
                                    {type === "cap" ? "Cap" : "Gele"}
                                    {" · "}
                                    {money(material.headwear.price)} each
                                  </option>
                                ))}
                              </select>
                            </label>

                            {choice.headwearType !== "none" && (
                              <label className="abs-feature-field">
                                Headwear quantity

                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={choice.headwearQuantity}
                                  onChange={(event) =>
                                    updateSelection(
                                      material,
                                      "headwearQuantity",
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          className={`abs-feature-button ${
                            choice.isSelected
                              ? "abs-feature-button-secondary"
                              : ""
                          }`}
                          onClick={() => toggleMaterial(material)}
                        >
                          {choice.isSelected
                            ? "Remove from reservation"
                            : "Add to reservation"}
                        </button>
                      </>
                    ) : (
                      <p className="abs-material-description">
                        Contact us to discuss package options for
                        this material.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <section className="abs-booking-panel" id="reservation-form">
          <div className="abs-booking-heading">
            <span className="abs-feature-eyebrow">
              RESERVATION REQUEST
            </span>

            <h2>Tell us about your event</h2>

            <p>
              Submitting this form does not charge you. Payment comes
              after ABS CUT reviews availability and confirms your
              quotation.
            </p>
          </div>

          <form
            onSubmit={submitBooking}
            className="abs-feature-form"
          >
            <div className="abs-booking-summary">
              <strong>
                {chosenMaterials.length} material selection
                {chosenMaterials.length === 1 ? "" : "s"}
              </strong>

              <span>
                {estimatedTotal > 0
                  ? `Estimated catalogue total: ${money(estimatedTotal)}`
                  : "Final price confirmed by ABS CUT"}
              </span>

              {chosenMaterials.length > 0 && (
                <div className="abs-booking-selected-list">
                  {chosenMaterials.map((material) => (
                    <div key={material._id}>
                      <span>{material.name}</span>
                      <strong>
                        {money(getMaterialTotal(material))}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="abs-feature-form-grid">
              <label className="abs-feature-field">
                Event date

                <input
                  type="date"
                  min={today}
                  required
                  value={form.eventDate}
                  onChange={(event) =>
                    updateForm("eventDate", event.target.value)
                  }
                />
              </label>

              <label className="abs-feature-field">
                Event type

                <input
                  required
                  maxLength="120"
                  placeholder="Wedding, birthday, celebration…"
                  value={form.eventType}
                  onChange={(event) =>
                    updateForm("eventType", event.target.value)
                  }
                />
              </label>

              <label className="abs-feature-field">
                Party size

                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.partySize}
                  onChange={(event) =>
                    updateForm("partySize", event.target.value)
                  }
                />
              </label>

              <label className="abs-feature-field">
                Contact name

                <input
                  required
                  maxLength="120"
                  value={form.contactName}
                  onChange={(event) =>
                    updateForm("contactName", event.target.value)
                  }
                />
              </label>

              <label className="abs-feature-field">
                Phone number

                <input
                  type="tel"
                  required
                  maxLength="30"
                  value={form.phone}
                  onChange={(event) =>
                    updateForm("phone", event.target.value)
                  }
                />
              </label>

              <label className="abs-feature-field">
                Fulfilment

                <select
                  value={form.deliveryMethod}
                  onChange={(event) => {
                    updateForm("deliveryMethod", event.target.value);
                    updateForm("deliveryAddress", "");
                  }}
                >
                  <option value="collection">Collection</option>
                  <option value="delivery">Delivery</option>
                </select>
              </label>

              {form.deliveryMethod === "delivery" && (
                <label className="abs-feature-field abs-field-full">
                  Delivery address

                  <textarea
                    required
                    rows="2"
                    maxLength="500"
                    value={form.deliveryAddress}
                    onChange={(event) =>
                      updateForm(
                        "deliveryAddress",
                        event.target.value
                      )
                    }
                  />
                </label>
              )}

              <label className="abs-feature-field abs-field-full">
                Additional details

                <textarea
                  rows="3"
                  maxLength="2000"
                  placeholder="Preferred colours, quantities, or other requests"
                  value={form.customerNotes}
                  onChange={(event) =>
                    updateForm("customerNotes", event.target.value)
                  }
                />
              </label>
            </div>

            <button
              className="abs-feature-button"
              type="submit"
              disabled={submitting || loading}
            >
              {submitting
                ? "Submitting request…"
                : "Submit reservation request"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
