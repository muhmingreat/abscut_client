
import { useCallback, useEffect, useMemo, useState } from "react";

import AdminSidebar from "../../components/AdminSidebar";
import { apiRequest } from "../../services/api";

import "./AdminDeliveryZones.css";

const LOCATION_API = "https://api.placedb.org/v1";

const EMPTY_FORM = {
  name: "",
  country: "Nigeria",
  countryCode: "NG",
  region: "",
  regionId: "",
  regionCode: "",
  state: "",
  city: "",
  cityId: "",
  currency: "NGN",
  locationProvider: "placedb",
  areas: "",
  postalCodes: "",
  fee: "",
  estimatedDelivery: "",
  notes: "",
  active: true,
};

const getErrorMessage = (error, fallback) =>
  error?.message || error?.response?.data?.message || fallback;

const getCurrencyCode = (country) => {
  const currency = country?.currency;

  if (typeof currency === "string") return currency.toUpperCase();

  if (Array.isArray(currency)) {
    const first = currency[0];
    return typeof first === "string"
      ? first.toUpperCase()
      : first?.code?.toUpperCase?.() || "USD";
  }

  if (currency && typeof currency === "object") {
    return currency.code?.toUpperCase?.() || "USD";
  }

  return "USD";
};

const formatPrice = (amount, currency = "NGN") => {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `${currency || "NGN"} ${Number(amount || 0).toLocaleString()}`;
  }
};

const splitList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const hasDuplicates = (values) => {
  const normalized = values.map((value) =>
    value.toLowerCase().replace(/\s+/g, " ").trim()
  );

  return new Set(normalized).size !== normalized.length;
};

async function fetchLocationData(path) {
  const response = await fetch(`${LOCATION_API}${path}`);

  if (!response.ok) {
    throw new Error(
      `Location service returned an error (${response.status}).`
    );
  }

  return response.json();
}

function AdminDeliveryZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);

  const [countriesLoading, setCountriesLoading] = useState(true);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [locationError, setLocationError] = useState("");
  const [nameEdited, setNameEdited] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // --------------------------------------------------
  // LOAD DELIVERY ZONES
  // --------------------------------------------------

  const loadZones = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/delivery/admin/zones");

      setZones(Array.isArray(response?.zones) ? response.zones : []);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load delivery zones.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // --------------------------------------------------
  // LOAD GLOBAL COUNTRIES
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadCountries = async () => {
      setCountriesLoading(true);
      setLocationError("");

      try {
        const response = await fetchLocationData("/countries.json");

        if (cancelled) return;

        const list = Array.isArray(response?.countries)
          ? response.countries
          : [];

        list.sort((a, b) => a.name.localeCompare(b.name));

        setCountries(list);
      } catch (err) {
        if (!cancelled) {
          setLocationError(
            "Unable to load countries. Check your internet connection and retry."
          );
        }
      } finally {
        if (!cancelled) {
          setCountriesLoading(false);
        }
      }
    };

    loadCountries();

    return () => {
      cancelled = true;
    };
  }, []);

  // --------------------------------------------------
  // LOAD REGIONS WHEN COUNTRY CHANGES
  // --------------------------------------------------

  useEffect(() => {
    if (!modalOpen || !form.countryCode) {
      setRegions([]);
      return;
    }

    let cancelled = false;

    const loadRegions = async () => {
      setRegionsLoading(true);
      setLocationError("");
      setRegions([]);

      try {
        const response = await fetchLocationData(
          `/regions/${form.countryCode}.json`
        );

        if (cancelled) return;

        const list = Array.isArray(response?.regions)
          ? response.regions
          : [];

        list.sort((a, b) => a.name.localeCompare(b.name));

        setRegions(list);

        // Preserve existing region when editing a zone.
        if (!form.regionId && form.region) {
          const existingRegion = list.find(
            (item) =>
              item.name.toLowerCase() === form.region.toLowerCase()
          );

          if (existingRegion) {
            setForm((current) => ({
              ...current,
              regionId: String(existingRegion.id),
              regionCode: existingRegion.iso_3166_2 || "",
            }));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLocationError(
            "Unable to load regions for this country."
          );
        }
      } finally {
        if (!cancelled) {
          setRegionsLoading(false);
        }
      }
    };

    loadRegions();

    return () => {
      cancelled = true;
    };
  }, [
    modalOpen,
    form.countryCode,
    form.region,
    form.regionId,
  ]);

  // --------------------------------------------------
  // LOAD CITIES WHEN REGION CHANGES
  // --------------------------------------------------

  useEffect(() => {
    if (!modalOpen || !form.countryCode || !form.regionId) {
      setCities([]);
      return;
    }

    let cancelled = false;

    const loadCities = async () => {
      setCitiesLoading(true);
      setLocationError("");
      setCities([]);

      try {
        const response = await fetchLocationData(
          `/cities/${form.countryCode}/${form.regionId}.json`
        );

        if (cancelled) return;

        const list = Array.isArray(response?.settlements)
          ? response.settlements
          : [];

        list.sort((a, b) => a.name.localeCompare(b.name));

        setCities(list);
      } catch (err) {
        if (!cancelled) {
          setLocationError(
            "Unable to load cities for this region."
          );
        }
      } finally {
        if (!cancelled) {
          setCitiesLoading(false);
        }
      }
    };

    loadCities();

    return () => {
      cancelled = true;
    };
  }, [modalOpen, form.countryCode, form.regionId]);

  // --------------------------------------------------
  // SELECTED LOCATION DATA
  // --------------------------------------------------

  const selectedCountry = useMemo(
    () =>
      countries.find(
        (country) => country.code === form.countryCode
      ),
    [countries, form.countryCode]
  );

  const selectedRegion = useMemo(
    () =>
      regions.find(
        (region) => String(region.id) === String(form.regionId)
      ),
    [regions, form.regionId]
  );

  const selectedCity = useMemo(
    () =>
      cities.find(
        (city) => String(city.id) === String(form.cityId)
      ),
    [cities, form.cityId]
  );

  // --------------------------------------------------
  // GENERATE ZONE NAME
  // --------------------------------------------------

  const generateZoneName = (values) => {
    const parts = [
      values.country,
      values.region,
      values.city,
    ].filter(Boolean);

    return parts.join(" - ");
  };

  const updateGeneratedName = (nextForm) => {
    if (!nameEdited) {
      nextForm.name = generateZoneName(nextForm);
    }

    return nextForm;
  };

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const statistics = useMemo(() => {
    const active = zones.filter((zone) => zone.active);
    const inactive = zones.filter((zone) => !zone.active);

    const locations = new Set(
      active.map((zone) =>
        [
          zone.countryCode || "NG",
          zone.regionId || zone.region || zone.state,
          zone.cityId || zone.city,
        ]
          .join("-")
          .toLowerCase()
      )
    );

    return {
      total: zones.length,
      active: active.length,
      inactive: inactive.length,
      cities: locations.size,
    };
  }, [zones]);

  // --------------------------------------------------
  // SEARCH AND FILTER
  // --------------------------------------------------

  const filteredZones = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return zones.filter((zone) => {
      const matchesSearch =
        !searchValue ||
        [
          zone.name,
          zone.country,
          zone.countryCode,
          zone.state,
          zone.region,
          zone.city,
          zone.postalCodes?.join(" "),
          ...(zone.areas || []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && zone.active) ||
        (statusFilter === "inactive" && !zone.active);

      return matchesSearch && matchesStatus;
    });
  }, [zones, search, statusFilter]);

  // --------------------------------------------------
  // OPEN CREATE MODAL
  // --------------------------------------------------

  const openCreateModal = () => {
    setEditingZone(null);
    setForm({ ...EMPTY_FORM });
    setNameEdited(false);
    setError("");
    setSuccess("");
    setLocationError("");
    setModalOpen(true);
  };

  // --------------------------------------------------
  // OPEN EDIT MODAL
  // --------------------------------------------------

  const openEditModal = (zone) => {
    const countryCode = zone.countryCode || "NG";

    setEditingZone(zone);

    setForm({
      name: zone.name || "",
      country: zone.country || "Nigeria",
      countryCode,
      region: zone.region || zone.state || "",
      regionId: zone.regionId ? String(zone.regionId) : "",
      regionCode: zone.regionCode || "",
      state: zone.state || zone.region || "",
      city: zone.city || "",
      cityId: zone.cityId ? String(zone.cityId) : "",
      currency: zone.currency || (countryCode === "NG" ? "NGN" : "USD"),
      locationProvider: zone.locationProvider || "manual",
      areas: (zone.areas || []).join(", "),
      postalCodes: (zone.postalCodes || []).join(", "),
      fee: String(zone.fee ?? ""),
      estimatedDelivery: zone.estimatedDelivery || "",
      notes: zone.notes || "",
      active: Boolean(zone.active),
    });

    // Preserve the existing name while editing.
    setNameEdited(true);

    setError("");
    setSuccess("");
    setLocationError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingZone(null);
    setForm({ ...EMPTY_FORM });
    setNameEdited(false);
    setLocationError("");
  };

  // --------------------------------------------------
  // COUNTRY CHANGE
  // --------------------------------------------------

  const handleCountryChange = (event) => {
    const countryCode = event.target.value;

    const country = countries.find(
      (item) => item.code === countryCode
    );

    setNameEdited(false);

    setForm((current) => {
      const next = {
        ...current,
        countryCode,
        country: country?.name || "",
        region: "",
        regionId: "",
        regionCode: "",
        state: "",
        city: "",
        cityId: "",
        currency: getCurrencyCode(country),
        locationProvider: "placedb",
      };

      return updateGeneratedName(next);
    });
  };

  // --------------------------------------------------
  // REGION CHANGE
  // --------------------------------------------------

  const handleRegionChange = (event) => {
    const regionId = event.target.value;

    const region = regions.find(
      (item) => String(item.id) === regionId
    );

    setNameEdited(false);

    setForm((current) => {
      const next = {
        ...current,
        region: region?.name || "",
        regionId: regionId || "",
        regionCode: region?.iso_3166_2 || "",
        state: region?.name || "",
        city: "",
        cityId: "",
      };

      return updateGeneratedName(next);
    });
  };

  // --------------------------------------------------
  // CITY CHANGE
  // --------------------------------------------------

  const handleCityChange = (event) => {
    const cityId = event.target.value;

    const city = cities.find(
      (item) => String(item.id) === cityId
    );

    setNameEdited(false);

    setForm((current) => {
      const next = {
        ...current,
        city: city?.name || "",
        cityId: cityId || "",
      };

      return updateGeneratedName(next);
    });
  };

  // --------------------------------------------------
  // OTHER FORM INPUTS
  // --------------------------------------------------

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === "name") {
      setNameEdited(true);
    }

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // --------------------------------------------------
  // SUBMIT DELIVERY ZONE
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.countryCode || !form.country.trim()) {
      setError("Please select a country.");
      return;
    }

    if (!form.region.trim() || !form.city.trim()) {
      setError("Please select a region and city.");
      return;
    }

    if (!form.name.trim()) {
      setError("Delivery zone name is required.");
      return;
    }

    const numericFee = Number(form.fee);

    if (
      form.fee === "" ||
      !Number.isFinite(numericFee) ||
      numericFee < 0
    ) {
      setError("Enter a valid delivery fee.");
      return;
    }

    const areas = splitList(form.areas);
    const postalCodes = splitList(form.postalCodes);

    if (hasDuplicates(areas)) {
      setError("Please remove duplicate delivery areas.");
      return;
    }

    if (hasDuplicates(postalCodes)) {
      setError("Please remove duplicate postal codes.");
      return;
    }

    const payload = {
      name: form.name.trim(),

      country: form.country.trim(),
      countryCode: form.countryCode,

      region: form.region.trim(),
      regionId: form.regionId,
      regionCode: form.regionCode,
      state: form.region.trim(),

      city: form.city.trim(),
      cityId: form.cityId,

      locationProvider: form.locationProvider,

      areas,
      postalCodes,

      fee: numericFee,
      currency: form.currency.toUpperCase(),

      estimatedDelivery: form.estimatedDelivery.trim(),
      notes: form.notes.trim(),
      active: Boolean(form.active),
    };

    setSaving(true);

    try {
      if (editingZone) {
        await apiRequest(
          `/delivery/admin/zones/${editingZone._id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        setSuccess("Delivery zone updated successfully.");
      } else {
        await apiRequest("/delivery/admin/zones", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Delivery zone created successfully.");
      }

      setModalOpen(false);
      setEditingZone(null);
      setForm({ ...EMPTY_FORM });
      setNameEdited(false);

      await loadZones();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to save delivery zone.")
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // DEACTIVATE DELIVERY ZONE
  // --------------------------------------------------

  const handleDeactivate = async (zone) => {
    const confirmed = window.confirm(
      `Deactivate "${zone.name}"?\n\nCustomers will no longer be able to use this delivery zone.`
    );

    if (!confirmed) return;

    setDeletingId(zone._id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(
        `/delivery/admin/zones/${zone._id}`,
        { method: "DELETE" }
      );

      setSuccess(`${zone.name} has been deactivated.`);
      await loadZones();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to deactivate delivery zone.")
      );
    } finally {
      setDeletingId("");
    }
  };

  // --------------------------------------------------
  // TOGGLE STATUS
  // --------------------------------------------------

  const handleToggleStatus = async (zone) => {
    setError("");
    setSuccess("");

    try {
      await apiRequest(
        `/delivery/admin/zones/${zone._id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            active: !zone.active,
          }),
        }
      );

      setSuccess(
        `${zone.name} ${zone.active ? "deactivated" : "activated"} successfully.`
      );

      await loadZones();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to update zone status.")
      );
    }
  };

  // --------------------------------------------------
  // RETRY LOCATION DATA
  // --------------------------------------------------

  const retryLocationData = async () => {
    setLocationError("");

    try {
      const response = await fetchLocationData("/countries.json");

      const list = Array.isArray(response?.countries)
        ? response.countries
        : [];

      list.sort((a, b) => a.name.localeCompare(b.name));

      setCountries(list);
    } catch {
      setLocationError(
        "Unable to load countries. Please check your connection."
      );
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="admin-delivery-layout">
      <AdminSidebar />

      <main className="admin-delivery-main">
        <div className="admin-delivery-container">
          <header className="delivery-page-header">
            <div>
              <span className="delivery-eyebrow">
                ABS CUT ADMINISTRATION
              </span>

              <h1>Delivery Zones</h1>

              <p>
                Manage international delivery locations, charges and
                estimated delivery times.
              </p>
            </div>

            <button
              type="button"
              className="delivery-primary-button"
              onClick={openCreateModal}
            >
              <span>+</span> Add Delivery Zone
            </button>
          </header>

          {error && (
            <div className="delivery-alert delivery-alert-error">
              {error}
              <button
                onClick={() => setError("")}
                type="button"
              >
                ×
              </button>
            </div>
          )}

          {success && (
            <div className="delivery-alert delivery-alert-success">
              {success}
              <button
                onClick={() => setSuccess("")}
                type="button"
              >
                ×
              </button>
            </div>
          )}

          <section className="delivery-stat-grid">
            <article className="delivery-stat-card">
              <div className="delivery-stat-icon">◎</div>
              <div>
                <span>Total Zones</span>
                <strong>{statistics.total}</strong>
              </div>
            </article>

            <article className="delivery-stat-card">
              <div className="delivery-stat-icon active-icon">✓</div>
              <div>
                <span>Active Zones</span>
                <strong>{statistics.active}</strong>
              </div>
            </article>

            <article className="delivery-stat-card">
              <div className="delivery-stat-icon city-icon">⌖</div>
              <div>
                <span>Covered Locations</span>
                <strong>{statistics.cities}</strong>
              </div>
            </article>

            <article className="delivery-stat-card">
              <div className="delivery-stat-icon inactive-icon">◷</div>
              <div>
                <span>Inactive Zones</span>
                <strong>{statistics.inactive}</strong>
              </div>
            </article>
          </section>

          <section className="delivery-management-card">
            <div className="delivery-management-header">
              <div>
                <h2>Delivery Coverage</h2>
                <p>Configure and maintain your delivery locations.</p>
              </div>

              <button
                type="button"
                className="delivery-refresh-button"
                onClick={loadZones}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            </div>

            <div className="delivery-toolbar">
              <div className="delivery-search">
                <span>⌕</span>
                <input
                  type="search"
                  placeholder="Search zones, countries, cities or areas..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <select
                className="delivery-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>

            {loading ? (
              <div className="delivery-loading">
                <div className="delivery-spinner" />
                <p>Loading delivery zones...</p>
              </div>
            ) : filteredZones.length === 0 ? (
              <div className="delivery-empty">
                <div className="delivery-empty-icon">⌖</div>

                <h3>
                  {zones.length === 0
                    ? "No delivery zones yet"
                    : "No matching zones"}
                </h3>

                <p>
                  {zones.length === 0
                    ? "Create your first delivery zone to begin accepting delivery orders."
                    : "Try changing your search or filter."}
                </p>

                {zones.length === 0 && (
                  <button
                    type="button"
                    className="delivery-primary-button"
                    onClick={openCreateModal}
                  >
                    + Create First Zone
                  </button>
                )}
              </div>
            ) : (
              <div className="delivery-table-wrapper">
                <table className="delivery-zones-table">
                  <thead>
                    <tr>
                      <th>ZONE</th>
                      <th>LOCATION</th>
                      <th>COVERAGE</th>
                      <th>DELIVERY FEE</th>
                      <th>EST. DELIVERY</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredZones.map((zone) => (
                      <tr key={zone._id}>
                        <td>
                          <div className="delivery-zone-name">
                            <strong>{zone.name}</strong>
                            <small>
                              {zone.notes ||
                                "ABS CUT delivery service"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="delivery-location">
                            <strong>{zone.city}</strong>
                            <span>
                              {zone.region || zone.state}
                            </span>
                            <small>
                              {zone.country || "Nigeria"} (
                              {zone.countryCode || "NG"})
                            </small>
                          </div>
                        </td>

                        <td>
                          {zone.areas?.length ||
                          zone.postalCodes?.length ? (
                            <div className="delivery-area-tags">
                              {(zone.areas || [])
                                .slice(0, 2)
                                .map((area) => (
                                  <span key={area}>{area}</span>
                                ))}

                              {zone.areas?.length > 2 && (
                                <span className="delivery-more-areas">
                                  +{zone.areas.length - 2}
                                </span>
                              )}

                              {!zone.areas?.length &&
                                zone.postalCodes?.length > 0 && (
                                  <span>
                                    {zone.postalCodes.length} postcodes
                                  </span>
                                )}
                            </div>
                          ) : (
                            <span className="delivery-citywide">
                              City-wide
                            </span>
                          )}
                        </td>

                        <td>
                          <strong className="delivery-fee">
                            {formatPrice(zone.fee, zone.currency || "NGN")}
                          </strong>
                        </td>

                        <td>
                          <span className="delivery-estimate">
                            {zone.estimatedDelivery || "Not specified"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`delivery-status ${
                              zone.active
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >
                            {zone.active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="delivery-action-buttons">
                            <button
                              type="button"
                              className="delivery-edit-button"
                              onClick={() => openEditModal(zone)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="delivery-toggle-button"
                              onClick={() => handleToggleStatus(zone)}
                            >
                              {zone.active ? "Disable" : "Enable"}
                            </button>

                            {zone.active && (
                              <button
                                type="button"
                                className="delivery-delete-button"
                                disabled={deletingId === zone._id}
                                onClick={() => handleDeactivate(zone)}
                              >
                                {deletingId === zone._id
                                  ? "..."
                                  : "Deactivate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filteredZones.length > 0 && (
              <div className="delivery-table-footer">
                Showing {filteredZones.length} of {zones.length} zones
              </div>
            )}
          </section>
        </div>
      </main>

      {modalOpen && (
        <div
          className="delivery-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="delivery-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-modal-title"
          >
            <header className="delivery-modal-header">
              <div>
                <span className="delivery-eyebrow">
                  INTERNATIONAL DELIVERY SETTINGS
                </span>

                <h2 id="delivery-modal-title">
                  {editingZone
                    ? "Edit Delivery Zone"
                    : "Create Delivery Zone"}
                </h2>

                <p>
                  Select a country, region and city to configure coverage.
                </p>
              </div>

              <button
                type="button"
                className="delivery-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <form
              onSubmit={handleSubmit}
              className="delivery-zone-form"
            >
              {error && (
                <div className="delivery-alert delivery-alert-error">
                  {error}
                </div>
              )}

              {locationError && (
                <div className="delivery-alert delivery-alert-error">
                  <span>{locationError}</span>

                  <button
                    type="button"
                    onClick={retryLocationData}
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="delivery-location-section">
                <div className="delivery-section-heading">
                  <h3>Geographical Location</h3>
                  <p>
                    Location information is supplied by PlaceDB.
                  </p>
                </div>

                <div className="delivery-form-grid">
                  <label className="delivery-form-field full-width">
                    <span>Country *</span>

                    <select
                      value={form.countryCode}
                      onChange={handleCountryChange}
                      disabled={countriesLoading || countries.length === 0}
                      required
                    >
                      {countriesLoading ? (
                        <option value="">Loading countries...</option>
                      ) : (
                        <>
                          <option value="">Select country</option>

                          {countries.map((country) => (
                            <option
                              key={country.code}
                              value={country.code}
                            >
                              {country.flag_emoji
                                ? `${country.flag_emoji} `
                                : ""}
                              {country.name} ({country.code})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>

                  <label className="delivery-form-field full-width">
                    <span>State / Province / Region *</span>

                    <select
                      value={form.regionId}
                      onChange={handleRegionChange}
                      disabled={
                        !form.countryCode ||
                        regionsLoading ||
                        regions.length === 0
                      }
                      required
                    >
                      <option value="">
                        {regionsLoading
                          ? "Loading regions..."
                          : regions.length
                          ? "Select region"
                          : "No regions available"}
                      </option>

                      {regions.map((region) => (
                        <option
                          key={region.id}
                          value={String(region.id)}
                        >
                          {region.name}
                        </option>
                      ))}

                      {form.regionId &&
                        !regions.some(
                          (region) =>
                            String(region.id) === String(form.regionId)
                        ) && (
                          <option value={form.regionId}>
                            {form.region || "Previously saved region"}
                          </option>
                        )}
                    </select>

                    {regions.length === 0 &&
                      !regionsLoading &&
                      form.countryCode && (
                        <small>
                          This country has no listed administrative regions.
                          A region may need to be configured manually.
                        </small>
                      )}
                  </label>

                  <label className="delivery-form-field full-width">
                    <span>City / Settlement *</span>

                    <select
                      value={form.cityId}
                      onChange={handleCityChange}
                      disabled={
                        !form.regionId ||
                        citiesLoading ||
                        cities.length === 0
                      }
                      required
                    >
                      <option value="">
                        {citiesLoading
                          ? "Loading cities..."
                          : cities.length
                          ? "Select city or settlement"
                          : "Select a region first"}
                      </option>

                      {cities.map((city) => (
                        <option
                          key={city.id}
                          value={String(city.id)}
                        >
                          {city.name}
                        </option>
                      ))}

                      {form.cityId &&
                        !cities.some(
                          (city) =>
                            String(city.id) === String(form.cityId)
                        ) && (
                          <option value={form.cityId}>
                            {form.city || "Previously saved city"}
                          </option>
                        )}
                    </select>

                    {form.regionId &&
                      !citiesLoading &&
                      cities.length === 0 && (
                        <small>
                          No settlements were returned for this region.
                          Existing saved city information is preserved.
                        </small>
                      )}
                  </label>
                </div>

                <div className="delivery-location-source">
                  <span>Location database: PlaceDB</span>
                  <span>CC0 public-domain data</span>
                  <a
                    href="https://placedb.org/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View source
                  </a>
                </div>
              </div>

              <div className="delivery-form-grid">
                <label className="delivery-form-field full-width">
                  <span>Delivery Zone Name *</span>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Automatically generated from selected location"
                    required
                  />

                  <small>
                    Automatically generated from your selected location.
                    You can change it to your preferred business name.
                  </small>
                </label>

                <label className="delivery-form-field">
                  <span>Delivery Currency *</span>

                  <input
                    name="currency"
                    value={form.currency}
                    onChange={handleChange}
                    maxLength="3"
                    placeholder="NGN"
                    required
                  />

                  <small>
                    Suggested from the selected country. You can adjust it.
                  </small>
                </label>

                <label className="delivery-form-field">
                  <span>Delivery Fee *</span>

                  <input
                    type="number"
                    name="fee"
                    value={form.fee}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="Enter delivery fee"
                    required
                  />

                  <small>
                    {form.currency || "NGN"} delivery charge.
                  </small>
                </label>

                <label className="delivery-form-field full-width">
                  <span>Delivery Areas</span>

                  <input
                    name="areas"
                    value={form.areas}
                    onChange={handleChange}
                    placeholder="e.g. Ikeja, Alausa, Opebi"
                  />

                  <small>
                    Separate areas with commas. Leave empty for city-wide
                    delivery.
                  </small>
                </label>

                <label className="delivery-form-field full-width">
                  <span>Postal / ZIP Codes</span>

                  <input
                    name="postalCodes"
                    value={form.postalCodes}
                    onChange={handleChange}
                    placeholder="e.g. M2N 5X5, M5V 2T6"
                  />

                  <small>
                    Optional. Separate postal codes with commas.
                  </small>
                </label>

                <label className="delivery-form-field">
                  <span>Estimated Delivery</span>

                  <input
                    name="estimatedDelivery"
                    value={form.estimatedDelivery}
                    onChange={handleChange}
                    placeholder="e.g. 2–4 working days"
                  />
                </label>

                <label className="delivery-form-field">
                  <span>Location Provider</span>

                  <input
                    value={form.locationProvider}
                    readOnly
                  />
                </label>

                <label className="delivery-form-field full-width">
                  <span>Notes / Instructions</span>

                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Optional delivery information..."
                  />
                </label>
              </div>

              <label className="delivery-active-toggle">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={handleChange}
                />

                <span className="delivery-toggle-track" />

                <span>
                  <strong>Enable this delivery zone</strong>
                  <small>
                    Customers can receive delivery quotes for this zone.
                  </small>
                </span>
              </label>

              <footer className="delivery-modal-footer">
                <button
                  type="button"
                  className="delivery-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="delivery-primary-button"
                  disabled={
                    saving ||
                    countriesLoading ||
                    regionsLoading ||
                    citiesLoading
                  }
                >
                  {saving
                    ? "Saving..."
                    : editingZone
                    ? "Save Changes"
                    : "Create Delivery Zone"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminDeliveryZones;
