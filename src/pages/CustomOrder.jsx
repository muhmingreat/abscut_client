import { useState, useEffect } from "react";

import { useNavigate, Link } from "react-router-dom";

import Map, { hasValidCoordinates } from "../components/Map";

import { apiRequest, uploadRequest } from "../services/api";
import "./CustomOrder.css";

function CustomOrder() {
  const navigate = useNavigate();
  const [pickupMapFocus, setPickupMapFocus] = useState(0);

  const [deliveryMapFocus, setDeliveryMapFocus] = useState(0);

  const handlePickupAddressClick = () => {
    setPickupMapFocus((current) => current + 1);
  };

  const handleDeliveryAddressClick = () => {
    setDeliveryMapFocus((current) => current + 1);
  };

  const [formData, setFormData] = useState({
    outfitType: "",
    fabric: "",
    color: "",

    materialSource: "ABS CUT",
    materialDescription: "",

    pickupRequired: "no",
    pickupAddress: "",
    pickupArea: "",
    pickupLandmark: "",
    pickupLatitude: null,
    pickupLongitude: null,

    embroidery: "no",
    embroideryDetails: "",

    monogram: "no",
    monogramText: "",

    measurements: "",
    measurementMethod: "Customer Provided",

    referenceImage: null,

    deliveryRequired: "no",
    deliveryAddress: "",
    deliveryArea: "",
    deliveryLandmark: "",
    deliveryLatitude: null,
    deliveryLongitude: null,

    notes: "",
  });

  const [error, setError] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  /*
    ==========================================
    HANDLE FORM CHANGES
    ==========================================
  */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => {
      const updatedData = {
        ...currentData,
        [name]: value,
      };

      /*
          Pickup only applies when the customer is
          providing material or already has a garment.
        */

      if (
        name === "materialSource" &&
        value !== "Customer" &&
        value !== "Already Made Garment"
      ) {
        updatedData.pickupRequired = "no";

        updatedData.pickupAddress = "";

        updatedData.pickupArea = "";

        updatedData.pickupLandmark = "";

        updatedData.pickupLatitude = null;

        updatedData.pickupLongitude = null;
      }

      /*
          Clear pickup location when pickup is disabled.
        */

      if (name === "pickupRequired" && value === "no") {
        updatedData.pickupAddress = "";

        updatedData.pickupArea = "";

        updatedData.pickupLandmark = "";

        updatedData.pickupLatitude = null;

        updatedData.pickupLongitude = null;
      }

      /*
          Clear delivery location when delivery is disabled.
        */

      if (name === "deliveryRequired" && value === "no") {
        updatedData.deliveryAddress = "";

        updatedData.deliveryArea = "";

        updatedData.deliveryLandmark = "";

        updatedData.deliveryLatitude = null;

        updatedData.deliveryLongitude = null;
      }

      /*
          Clear monogram text when monogram is disabled.
        */

      if (name === "monogram" && value === "no") {
        updatedData.monogramText = "";
      }

      /*
          Clear embroidery details when embroidery
          is disabled.
        */

      if (name === "embroidery" && value === "no") {
        updatedData.embroideryDetails = "";
      }

      return updatedData;
    });

    setError("");
  };

  useEffect(() => {
    console.log("🧾 CUSTOM ORDER LOCATION STATE:", {
      pickupAddress: formData.pickupAddress,
      pickupLatitude: formData.pickupLatitude,
      pickupLongitude: formData.pickupLongitude,
      deliveryAddress: formData.deliveryAddress,
      deliveryLatitude: formData.deliveryLatitude,
      deliveryLongitude: formData.deliveryLongitude,
    });
  }, [
    formData.pickupAddress,
    formData.pickupLatitude,
    formData.pickupLongitude,
    formData.deliveryAddress,
    formData.deliveryLatitude,
    formData.deliveryLongitude,
  ]);
  /*
    ==========================================
    PICKUP LOCATION
    ==========================================
  */

  /* Pickup location handler */
  const handlePickupLocationChange = (latitude, longitude, details = null) => {
    console.log("🟢 PICKUP HANDLER FIRED:", {
      latitude,
      longitude,
      details,
    });

    setFormData((currentData) => ({
      ...currentData,

      pickupLatitude:
        latitude === null || latitude === undefined ? null : Number(latitude),

      pickupLongitude:
        longitude === null || longitude === undefined
          ? null
          : Number(longitude),

      ...(details?.address ? { pickupAddress: details.address } : {}),

      ...(details?.area ? { pickupArea: details.area } : {}),

      ...(details?.landmark ? { pickupLandmark: details.landmark } : {}),
    }));

    setError("");
  };
  /*
    ==========================================
    DELIVERY LOCATION
    ==========================================
  */

  /* Delivery location handler */
  const handleDeliveryLocationChange = (
    latitude,
    longitude,
    details = null,
  ) => {
    console.log("🔵 DELIVERY HANDLER FIRED:", {
      latitude,
      longitude,
      details,
    });

    setFormData((currentData) => ({
      ...currentData,

      deliveryLatitude:
        latitude === null || latitude === undefined ? null : Number(latitude),

      deliveryLongitude:
        longitude === null || longitude === undefined
          ? null
          : Number(longitude),

      ...(details?.address ? { deliveryAddress: details.address } : {}),

      ...(details?.area ? { deliveryArea: details.area } : {}),

      ...(details?.landmark ? { deliveryLandmark: details.landmark } : {}),
    }));

    setError("");
  };
  /*
    ==========================================
    HANDLE REFERENCE IMAGE
    ==========================================
  */

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      setFormData((currentData) => ({
        ...currentData,
        referenceImage: null,
      }));

      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("Reference image must be smaller than 5MB.");

      event.target.value = "";

      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");

      event.target.value = "";

      return;
    }

    setFormData((currentData) => ({
      ...currentData,

      referenceImage: file,
    }));

    setError("");
  };

  /*
    ==========================================
    VALIDATE FORM
    ==========================================
  */

  const validateForm = () => {
    /*
      ==========================================
      OUTFIT
      ==========================================
    */

    if (!formData.outfitType.trim()) {
      return "Please select the type of outfit you want.";
    }

    /*
      ==========================================
      MATERIAL
      ==========================================
    */

    if (formData.materialSource === "ABS CUT" && !formData.fabric.trim()) {
      return "Please tell us the fabric you want.";
    }

    if (formData.materialSource === "Customer" && !formData.fabric.trim()) {
      return "Please describe the material you will provide.";
    }

    if (
      formData.materialSource === "Already Made Garment" &&
      !formData.materialDescription.trim()
    ) {
      return "Please describe the garment you want us to work on.";
    }

    /*
      Colour is required only when it applies.
    */

    if (
      formData.materialSource !== "Already Made Garment" &&
      formData.materialSource !== "Not Required" &&
      !formData.color.trim()
    ) {
      return "Please enter your preferred colour.";
    }

    /*
      ==========================================
      MEASUREMENTS
      ==========================================
    */

    if (
      formData.measurementMethod === "Customer Provided" &&
      !formData.measurements.trim()
    ) {
      return "Please provide your measurements.";
    }

    /*
      ==========================================
      MONOGRAM
      ==========================================
    */

    if (formData.monogram === "yes" && !formData.monogramText.trim()) {
      return "Please enter the text you want for your monogram.";
    }

    /*
      ==========================================
      EMBROIDERY
      ==========================================
    */

    if (formData.embroidery === "yes" && !formData.embroideryDetails.trim()) {
      return "Please describe the embroidery you want.";
    }

    /*
      ==========================================
      PICKUP
      ==========================================
    */

    if (
      formData.pickupRequired === "yes" &&
      formData.materialSource !== "Customer" &&
      formData.materialSource !== "Already Made Garment"
    ) {
      return "Pickup is only available when you provide the material or garment.";
    }

    if (formData.pickupRequired === "yes" && !formData.pickupAddress.trim()) {
      return "Please provide the pickup address.";
    }

    if (
      formData.pickupRequired === "yes" &&
      !hasValidCoordinates(formData.pickupLatitude, formData.pickupLongitude)
    ) {
      return "Please select your pickup location on the map.";
    }

    /*
      ==========================================
      DELIVERY
      ==========================================
    */

    if (
      formData.deliveryRequired === "yes" &&
      !formData.deliveryAddress.trim()
    ) {
      return "Please provide the delivery address.";
    }

    if (
      formData.deliveryRequired === "yes" &&
      !hasValidCoordinates(
        formData.deliveryLatitude,
        formData.deliveryLongitude,
      )
    ) {
      return "Please select your delivery location on the map.";
    }

    return "";
  };

  /*
    ==========================================
    SUBMIT CUSTOM ORDER
    ==========================================
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    /*
      Prevent duplicate submissions.
    */

    if (submitting) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);

      return;
    }

    try {
      setSubmitting(true);

      setError("");

      /*
        ==========================================
        STEP 1
        Upload reference image.
        ==========================================
      */

      let referenceImage = {};

      if (formData.referenceImage) {
        const imageData = new FormData();

        imageData.append("image", formData.referenceImage);

        const uploadResponse = await uploadRequest(
          "/uploads/custom-reference",
          imageData,
        );

        if (!uploadResponse || !uploadResponse.image) {
          throw new Error("The reference image could not be uploaded.");
        }

        referenceImage = uploadResponse.image;
      }

      /*
        ==========================================
        STEP 2
        Determine service type.
        ==========================================
      */

      let serviceType = "Custom Tailoring";

      if (formData.embroidery === "yes" && formData.monogram === "yes") {
        serviceType = "Tailoring, Embroidery & Monogram";
      } else if (formData.embroidery === "yes") {
        serviceType = "Tailoring & Embroidery";
      } else if (formData.monogram === "yes") {
        serviceType = "Tailoring & Monogram";
      }

      /*
        ==========================================
        STEP 3
        Prepare custom order data.
        ==========================================
      */

      const customOrderData = {
        serviceType,

        outfitType: formData.outfitType.trim(),

        fabric:
          formData.materialSource === "Not Required"
            ? ""
            : formData.fabric.trim(),

        color:
          formData.materialSource === "Already Made Garment" ||
          formData.materialSource === "Not Required"
            ? ""
            : formData.color.trim(),

        materialSource: formData.materialSource,

        materialDescription: formData.materialDescription.trim(),

        /*
          ========================================
          PICKUP
          ========================================
        */

        pickupRequired:
          formData.pickupRequired === "yes" &&
          (formData.materialSource === "Customer" ||
            formData.materialSource === "Already Made Garment"),

        pickupLocation:
          formData.pickupRequired === "yes" &&
          (formData.materialSource === "Customer" ||
            formData.materialSource === "Already Made Garment")
            ? {
                address: formData.pickupAddress.trim(),

                area: formData.pickupArea.trim(),

                landmark: formData.pickupLandmark.trim(),

                latitude: hasValidCoordinates(
                  formData.pickupLatitude,
                  formData.pickupLongitude,
                )
                  ? Number(formData.pickupLatitude)
                  : null,

                longitude: hasValidCoordinates(
                  formData.pickupLatitude,
                  formData.pickupLongitude,
                )
                  ? Number(formData.pickupLongitude)
                  : null,
              }
            : {},

        /*
          ========================================
          EMBROIDERY
          ========================================
        */

        embroidery: formData.embroidery,

        embroideryDetails:
          formData.embroidery === "yes"
            ? formData.embroideryDetails.trim()
            : "",

        /*
          ========================================
          MONOGRAM
          ========================================
        */

        monogram: formData.monogram,

        monogramText:
          formData.monogram === "yes" ? formData.monogramText.trim() : "",

        /*
          ========================================
          MEASUREMENTS
          ========================================
        */

        measurements: formData.measurements.trim(),

        measurementMethod: formData.measurementMethod,

        /*
          ========================================
          REFERENCE IMAGE
          ========================================
        */

        referenceImage,

        /*
          ========================================
          DELIVERY
          ========================================
        */

        deliveryRequired: formData.deliveryRequired === "yes",

        deliveryLocation:
          formData.deliveryRequired === "yes"
            ? {
                address: formData.deliveryAddress.trim(),

                area: formData.deliveryArea.trim(),

                landmark: formData.deliveryLandmark.trim(),

                latitude: hasValidCoordinates(
                  formData.deliveryLatitude,
                  formData.deliveryLongitude,
                )
                  ? Number(formData.deliveryLatitude)
                  : null,

                longitude: hasValidCoordinates(
                  formData.deliveryLatitude,
                  formData.deliveryLongitude,
                )
                  ? Number(formData.deliveryLongitude)
                  : null,
              }
            : {},

        /*
          ========================================
          ADDITIONAL NOTES
          ========================================
        */

        notes: formData.notes.trim(),
      };

      /*
        ==========================================
        STEP 4
        SAVE CUSTOM ORDER
        ==========================================
      */

      const response = await apiRequest("/custom-orders", {
        method: "POST",

        body: JSON.stringify(customOrderData),
      });

      /*
        ==========================================
        CHECK RESPONSE
        ==========================================
      */

      if (!response.customOrder || !response.customOrder._id) {
        throw new Error(
          "The custom order was created, but no order ID was returned.",
        );
      }

      /*
        ==========================================
        STEP 5
        REDIRECT
        ==========================================
      */

      const orderId = response.customOrder._id;

      setSubmitted(true);

      setTimeout(() => {
        navigate(`/custom-order-confirmation/${orderId}`);
      }, 800);
    } catch (error) {
      console.error("Custom order submission error:", error);

      setError(
        error.message ||
          "Unable to submit your custom order. Please try again.",
      );

      setSubmitting(false);

      setSubmitted(false);
    }
  };

  return (
    <main className="custom-order-page">
      {/* =========================================
          HERO
      ========================================= */}

      <section className="custom-order-header">
        <div>
          <p className="custom-order-label">ABS CUT CUSTOM SERVICE</p>

          <h1>Create Your Custom Style</h1>

          <p className="custom-order-intro">
            Tell us what you want and our fashion team will review your request
            and contact you about the next steps.
          </p>
        </div>

        <div className="custom-order-header-badge">
          <span>✦</span>

          <strong>MADE FOR YOU</strong>

          <small>Custom tailoring &amp; finishing</small>
        </div>
      </section>

      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <section className="custom-order-layout">
        {/* =====================================
            FORM
        ===================================== */}

        <form className="custom-order-form" onSubmit={handleSubmit}>
          {/* =================================
              STEP 01
          ================================= */}

          <section className="custom-order-card">
            <div className="custom-order-card-heading">
              <div className="custom-order-step">01</div>

              <div>
                <p>STYLE</p>

                <h2>Choose Your Outfit</h2>

                <span>Tell us what you would like us to make.</span>
              </div>
            </div>

            <div className="custom-form-group">
              <label htmlFor="outfitType">Outfit Type</label>

              <select
                id="outfitType"
                name="outfitType"
                value={formData.outfitType}
                onChange={handleChange}
              >
                {/* <option value="">
                  Select outfit type
                </option> */}

                <option value="Agbada">Agbada</option>

                <option value="Caftan">Caftan</option>

                <option value="Senator">Senator</option>

                <option value="Native Shirt">Native Shirt</option>

                <option value="Kaftan Set">Kaftan Set</option>

                <option value="Other">Other</option>
              </select>
            </div>
          </section>

          {/* =================================
              STEP 02
          ================================= */}

          <section className="custom-order-card">
            <div className="custom-order-card-heading">
              <div className="custom-order-step">02</div>

              <div>
                <p>MATERIAL</p>

                <h2>Choose Your Materials</h2>

                <span>
                  Tell us who will provide the material for your order.
                </span>
              </div>
            </div>

            <div className="custom-form-group">
              <label htmlFor="materialSource">Material Source</label>

              <select
                id="materialSource"
                name="materialSource"
                value={formData.materialSource}
                onChange={handleChange}
              >
                <option value="ABS CUT">
                  ABS CUT will provide the material
                </option>

                <option value="Customer">I will provide the material</option>

                <option value="Already Made Garment">
                  I already have a garment for embroidery / monogramming
                </option>

                <option value="Not Required">Material not required</option>
              </select>
            </div>

            <div className="custom-form-row">
              <div className="custom-form-group">
                <label htmlFor="fabric">Fabric / Material</label>

                <input
                  id="fabric"
                  name="fabric"
                  type="text"
                  value={formData.fabric}
                  onChange={handleChange}
                  disabled={formData.materialSource === "Not Required"}
                  placeholder={
                    formData.materialSource === "Customer"
                      ? "Describe the material you will provide"
                      : "e.g. Senator material, lace, cashmere..."
                  }
                />
              </div>

              <div className="custom-form-group">
                <label htmlFor="color">Preferred Colour</label>

                <input
                  id="color"
                  name="color"
                  type="text"
                  value={formData.color}
                  onChange={handleChange}
                  disabled={
                    formData.materialSource === "Already Made Garment" ||
                    formData.materialSource === "Not Required"
                  }
                  placeholder="e.g. Navy blue"
                />
              </div>
            </div>

            {(formData.materialSource === "Customer" ||
              formData.materialSource === "Already Made Garment") && (
              <div className="custom-form-group">
                <label htmlFor="materialDescription">
                  Material / Garment Description
                </label>

                <textarea
                  id="materialDescription"
                  name="materialDescription"
                  value={formData.materialDescription}
                  onChange={handleChange}
                  placeholder={
                    formData.materialSource === "Already Made Garment"
                      ? "Describe the garment you want us to work on, including its condition and any special instructions."
                      : "Describe the material you will provide, including quantity or any important details."
                  }
                  rows="4"
                />
              </div>
            )}
          </section>

          {/* =================================
              STEP 03
          ================================= */}

          <section className="custom-order-card">
            <div className="custom-order-card-heading">
              <div className="custom-order-step">03</div>

              <div>
                <p>SERVICE</p>

                <h2>Embroidery &amp; Monogram</h2>

                <span>
                  Add personal details to your outfit or existing garment.
                </span>
              </div>
            </div>

            <div className="custom-option-group">
              <label>Do you want embroidery?</label>

              <div className="custom-radio-options">
                <label
                  className={formData.embroidery === "yes" ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="embroidery"
                    value="yes"
                    checked={formData.embroidery === "yes"}
                    onChange={handleChange}
                  />

                  <span>Yes</span>
                </label>

                <label
                  className={formData.embroidery === "no" ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="embroidery"
                    value="no"
                    checked={formData.embroidery === "no"}
                    onChange={handleChange}
                  />

                  <span>No</span>
                </label>
              </div>
            </div>

            {formData.embroidery === "yes" && (
              <div className="custom-form-group">
                <label htmlFor="embroideryDetails">Embroidery Details</label>

                <textarea
                  id="embroideryDetails"
                  name="embroideryDetails"
                  value={formData.embroideryDetails}
                  onChange={handleChange}
                  placeholder="Describe the embroidery design, placement, colour, size, or any other details."
                  rows="4"
                />
              </div>
            )}

            <div className="custom-option-group">
              <label>Do you want a monogram?</label>

              <div className="custom-radio-options">
                <label
                  className={formData.monogram === "yes" ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="monogram"
                    value="yes"
                    checked={formData.monogram === "yes"}
                    onChange={handleChange}
                  />

                  <span>Yes</span>
                </label>

                <label className={formData.monogram === "no" ? "selected" : ""}>
                  <input
                    type="radio"
                    name="monogram"
                    value="no"
                    checked={formData.monogram === "no"}
                    onChange={handleChange}
                  />

                  <span>No</span>
                </label>
              </div>
            </div>

            {formData.monogram === "yes" && (
              <div className="custom-form-group custom-monogram-field">
                <label htmlFor="monogramText">Monogram Text</label>

                <input
                  id="monogramText"
                  name="monogramText"
                  type="text"
                  value={formData.monogramText}
                  onChange={handleChange}
                  placeholder="Enter initials or name"
                  maxLength={50}
                />

                <small>Maximum 50 characters.</small>
              </div>
            )}
          </section>

          {/* =================================
              STEP 04
          ================================= */}

          <section className="custom-order-card">
            <div className="custom-order-card-heading">
              <div className="custom-order-step">04</div>

              <div>
                <p>MEASUREMENTS</p>

                <h2>Your Measurements</h2>

                <span>
                  Provide your current measurements as accurately as possible.
                </span>
              </div>
            </div>

            <div className="custom-form-group">
              <label htmlFor="measurementMethod">Measurement Method</label>

              <select
                id="measurementMethod"
                name="measurementMethod"
                value={formData.measurementMethod}
                onChange={handleChange}
              >
                <option value="Customer Provided">
                  I will provide my measurements
                </option>

                <option value="ABS CUT Measurement">
                  I want ABS CUT to take my measurements
                </option>

                <option value="To Be Confirmed">To be confirmed</option>
              </select>
            </div>

            <div className="custom-form-group">
              <label htmlFor="measurements">Measurements</label>

              <textarea
                id="measurements"
                name="measurements"
                value={formData.measurements}
                onChange={handleChange}
                placeholder={
                  "Example:\nChest: 42 in\nShoulder: 18 in\nSleeve: 25 in\nLength: 42 in\nWaist: 36 in"
                }
                rows="7"
              />

              <small>
                You can include all relevant body measurements and any special
                fitting instructions.
              </small>
            </div>
          </section>

          {/* =================================
              STEP 05
          ================================= */}

          <section className="custom-order-card">
            <div className="custom-order-card-heading">
              <div className="custom-order-step">05</div>

              <div>
                <p>REFERENCE</p>

                <h2>Reference Image</h2>

                <span>Upload an image showing the style you want.</span>
              </div>
            </div>

            <div className="custom-file-upload">
              <input
                id="referenceImage"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />

              <label htmlFor="referenceImage">
                <span className="custom-upload-icon">↑</span>

                <strong>
                  {formData.referenceImage
                    ? formData.referenceImage.name
                    : "Upload Reference Image"}
                </strong>

                <small>JPG, JPEG, PNG — Maximum 5MB</small>
              </label>
            </div>
          </section>

          {/* =================================
              STEP 06
          ================================= */}

          <section className="custom-order-card">
            <div className="custom-order-card-heading">
              <div className="custom-order-step">06</div>

              <div>
                <p>PICKUP</p>

                <h2>Material / Garment Pickup</h2>

                <span>
                  We can collect your material or existing garment from you.
                </span>
              </div>
            </div>

            <div className="custom-option-group">
              <label>Do you need pickup?</label>

              <div className="custom-radio-options">
                <label
                  className={
                    formData.pickupRequired === "yes" ? "selected" : ""
                  }
                >
                  <input
                    type="radio"
                    name="pickupRequired"
                    value="yes"
                    checked={formData.pickupRequired === "yes"}
                    onChange={handleChange}
                    disabled={
                      formData.materialSource !== "Customer" &&
                      formData.materialSource !== "Already Made Garment"
                    }
                  />

                  <span>Yes</span>
                </label>

                <label
                  className={formData.pickupRequired === "no" ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="pickupRequired"
                    value="no"
                    checked={formData.pickupRequired === "no"}
                    onChange={handleChange}
                  />

                  <span>No</span>
                </label>
              </div>
            </div>

            {formData.pickupRequired === "yes" && (
              <div className="custom-form-group">
                <label htmlFor="pickupAddress">Pickup Address</label>

                <input
                  id="pickupAddress"
                  name="pickupAddress"
                  type="text"
                  value={formData.pickupAddress}
                  onChange={handleChange}
                  onClick={handlePickupAddressClick}
                  placeholder="Enter the address where we should collect it"
                />

                <div className="custom-form-row">
                  <div className="custom-form-group">
                    <label htmlFor="pickupArea">Area</label>

                    <input
                      id="pickupArea"
                      name="pickupArea"
                      type="text"
                      value={formData.pickupArea}
                      onChange={handleChange}
                      placeholder="e.g. Ikeja"
                    />
                  </div>

                  <div className="custom-form-group">
                    <label htmlFor="pickupLandmark">Landmark</label>

                    <input
                      id="pickupLandmark"
                      name="pickupLandmark"
                      type="text"
                      value={formData.pickupLandmark}
                      onChange={handleChange}
                      placeholder="Nearby landmark"
                    />
                  </div>
                </div>

                {/* =================================
                    REUSABLE MAP
                ================================= */}

                <Map
                  title="Pickup"
                  latitude={formData.pickupLatitude}
                  longitude={formData.pickupLongitude}
                  onLocationChange={handlePickupLocationChange}
                  focusRequest={pickupMapFocus}
                />
              </div>
            )}
          </section>

          {/* =================================
              STEP 07
          ================================= */}

          <section className="custom-order-card">
            <div className="custom-order-card-heading">
              <div className="custom-order-step">07</div>

              <div>
                <p>DELIVERY</p>

                <h2>Finished Item Delivery</h2>

                <span>
                  We can deliver your finished outfit or completed garment to
                  you.
                </span>
              </div>
            </div>

            <div className="custom-option-group">
              <label>Do you need delivery?</label>

              <div className="custom-radio-options">
                <label
                  className={
                    formData.deliveryRequired === "yes" ? "selected" : ""
                  }
                >
                  <input
                    type="radio"
                    name="deliveryRequired"
                    value="yes"
                    checked={formData.deliveryRequired === "yes"}
                    onChange={handleChange}
                  />

                  <span>Yes</span>
                </label>

                <label
                  className={
                    formData.deliveryRequired === "no" ? "selected" : ""
                  }
                >
                  <input
                    type="radio"
                    name="deliveryRequired"
                    value="no"
                    checked={formData.deliveryRequired === "no"}
                    onChange={handleChange}
                  />

                  <span>No</span>
                </label>
              </div>
            </div>

            {formData.deliveryRequired === "yes" && (
              <div className="custom-form-group">
                <label htmlFor="deliveryAddress">Delivery Address</label>

                <input
                  id="deliveryAddress"
                  name="deliveryAddress"
                  type="text"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  onClick={handleDeliveryAddressClick}
                  placeholder="Enter the address where we should deliver your order"
                />

                <div className="custom-form-row">
                  <div className="custom-form-group">
                    <label htmlFor="deliveryArea">Area</label>

                    <input
                      id="deliveryArea"
                      name="deliveryArea"
                      type="text"
                      value={formData.deliveryArea}
                      onChange={handleChange}
                      placeholder="e.g. Lekki"
                    />
                  </div>

                  <div className="custom-form-group">
                    <label htmlFor="deliveryLandmark">Landmark</label>

                    <input
                      id="deliveryLandmark"
                      name="deliveryLandmark"
                      type="text"
                      value={formData.deliveryLandmark}
                      onChange={handleChange}
                      placeholder="Nearby landmark"
                    />
                  </div>
                </div>

                {/* =================================
                    REUSABLE MAP
                ================================= */}

                <Map
                  title="Delivery"
                  latitude={formData.deliveryLatitude}
                  longitude={formData.deliveryLongitude}
                  onLocationChange={handleDeliveryLocationChange}
                  focusRequest={deliveryMapFocus}
                />
              </div>
            )}
          </section>

          {/* =================================
              STEP 08
          ================================= */}

          <section className="custom-order-card">
            <div className="custom-order-card-heading">
              <div className="custom-order-step">08</div>

              <div>
                <p>FINAL DETAILS</p>

                <h2>Additional Notes</h2>

                <span>Tell us anything else we should know.</span>
              </div>
            </div>

            <div className="custom-form-group">
              <label htmlFor="notes">Notes</label>

              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Tell us about your preferred style, fitting, embroidery placement, special requests, etc."
                rows="5"
              />
            </div>
          </section>

          {/* =================================
              ERROR
          ================================= */}

          {error && (
            <div className="custom-order-error">
              <span>!</span>

              <p>{error}</p>
            </div>
          )}

          {/* =================================
              SUBMIT
          ================================= */}

          <div className="custom-submit-area">
            <button
              type="submit"
              className="custom-submit-button"
              disabled={submitted || submitting}
            >
              <span>
                {submitted
                  ? "REQUEST SUBMITTED"
                  : submitting
                    ? "SUBMITTING REQUEST..."
                    : "SUBMIT CUSTOM REQUEST"}
              </span>

              <strong>{submitted ? "✓" : submitting ? "..." : "→"}</strong>
            </button>

            <p>
              Your request will be reviewed by the ABS CUT team before
              production begins.
            </p>
          </div>
        </form>

        {/* =====================================
            SIDEBAR
        ===================================== */}

        <aside className="custom-order-sidebar">
          <div className="custom-sidebar-card custom-sidebar-highlight">
            <span className="custom-sidebar-icon">✦</span>

            <p>ABS CUT CUSTOM</p>

            <h2>
              Your Style.
              <br />
              Your Choice.
            </h2>

            <span>
              From fabric selection to embroidery and monogramming, tell us
              exactly what you want.
            </span>
          </div>

          <div className="custom-sidebar-card">
            <p className="custom-sidebar-title">HOW IT WORKS</p>

            <div className="custom-process">
              <div>
                <strong>01</strong>

                <span>Submit your custom request.</span>
              </div>

              <div>
                <strong>02</strong>

                <span>ABS CUT reviews your requirements.</span>
              </div>

              <div>
                <strong>03</strong>

                <span>We contact you to discuss pricing and details.</span>
              </div>

              <div>
                <strong>04</strong>

                <span>Production begins after confirmation.</span>
              </div>
            </div>
          </div>

          <div className="custom-sidebar-card">
            <p className="custom-sidebar-title">NEED HELP?</p>

            <p className="custom-help-text">
              If you are unsure about your measurements or design requirements,
              contact ABS CUT before submitting your request.
            </p>

            <Link to="/contact" className="custom-contact-link">
              CONTACT ABS CUT
              <span>→</span>
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
export default CustomOrder;
