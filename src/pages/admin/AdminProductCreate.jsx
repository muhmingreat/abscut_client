
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiRequest, uploadRequest } from "../../services/api";

import "./AdminProductCreate.css";

const DIGITAL_FORMATS = ["dst", "pes", "jef", "exp"];
const MAX_DIGITAL_FILE_SIZE = 20 * 1024 * 1024;

function AdminProductCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    image: "",
    video: "",
    description: "",
    stock: "",
    featured: false,
    active: true,

    productType: "ready_to_wear",
    priceUnit: "piece",
    stockInYards: "",

    digitalAvailable: false,
    digitalPrice: "",
    digitalFiles: [],

    physicalAvailable: true,
    physicalPrice: "",

    deliveryAvailable: false,
    deliveryFee: "",
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingDigitalFile, setUploadingDigitalFile] = useState(false);

  const [videoDuration, setVideoDuration] = useState(0);

  const [error, setError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const isEmbroideryProduct = [
    "monogram",
    "phoenix_embroidery",
  ].includes(form.productType);

  const isReadyToWear = form.productType === "ready_to_wear";
  const isRawMaterial = form.productType === "raw_material";

  const isUploading =
    uploading ||
    uploadingVideo ||
    uploadingDigitalFile;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  const formatVideoDuration = (seconds) => {
    if (!seconds) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const formatFileSize = (bytes) => {
    const size = Number(bytes) || 0;

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
  };

  const handleProductTypeChange = (e) => {
    const productType = e.target.value;

    const embroidery =
      productType === "monogram" ||
      productType === "phoenix_embroidery";

    setForm((previous) => ({
      ...previous,
      productType,

      priceUnit:
        productType === "raw_material"
          ? "yard"
          : embroidery
            ? "design"
            : "piece",

      digitalAvailable: embroidery
        ? previous.digitalAvailable
        : false,

      physicalAvailable: embroidery
        ? previous.physicalAvailable
        : true,

      digitalFiles: embroidery
        ? previous.digitalFiles
        : [],
    }));

    setError("");
    setUploadSuccess("");
  };

  /*
  ==========================================
  IMAGE UPLOAD
  ==========================================
  */

  const handleImageUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];

    if (!file) return;

    setError("");
    setUploadSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be 5MB or less.");
      input.value = "";
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("image", file);

      const data = await uploadRequest(
        "/uploads/product-image",
        formData
      );

      if (!data.success || !data.image?.url) {
        throw new Error(
          data.message || "Unable to upload image."
        );
      }

      setForm((previous) => ({
        ...previous,
        image: data.image.url,
      }));

      setUploadSuccess("Product image uploaded successfully.");
    } catch (err) {
      console.error("Product image upload error:", err);

      setError(
        err.message || "Unable to upload image."
      );
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  /*
  ==========================================
  VIDEO UPLOAD
  ==========================================
  */

  const handleVideoUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];

    if (!file) return;

    setError("");
    setUploadSuccess("");

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      input.value = "";
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Video size must be 50MB or less.");
      input.value = "";
      return;
    }

    const video = document.createElement("video");
    const videoUrl = URL.createObjectURL(file);

    video.preload = "metadata";

    video.onloadedmetadata = async () => {
      URL.revokeObjectURL(videoUrl);

      const duration = video.duration;

      if (!Number.isFinite(duration)) {
        setError("Unable to determine video duration.");
        input.value = "";
        return;
      }

      if (duration > 60) {
        setError("Product video must be 60 seconds or less.");
        input.value = "";
        return;
      }

      try {
        setUploadingVideo(true);
        setVideoDuration(duration);

        const formData = new FormData();
        formData.append("video", file);

        const data = await uploadRequest(
          "/uploads/product-video",
          formData
        );

        if (!data.success || !data.video?.url) {
          throw new Error(
            data.message || "Unable to upload product video."
          );
        }

        setForm((previous) => ({
          ...previous,
          video: data.video.url,
        }));

        setVideoDuration(
          Number(data.video.duration) || duration
        );

        setUploadSuccess("Product video uploaded successfully.");
      } catch (err) {
        console.error("Product video upload error:", err);

        setError(
          err.message || "Unable to upload product video."
        );
      } finally {
        setUploadingVideo(false);
        input.value = "";
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);

      setError("Unable to read this video file.");
      input.value = "";
    };

    video.src = videoUrl;
  };

  /*
  ==========================================
  DIGITAL EMBROIDERY FILE UPLOAD
  ==========================================
  */

  const handleDigitalFileUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];

    if (!file) return;

    setError("");
    setUploadSuccess("");

    const extension = file.name
      .split(".")
      .pop()
      .toLowerCase();

    if (!DIGITAL_FORMATS.includes(extension)) {
      setError(
        "Only DST, PES, JEF and EXP embroidery files are supported."
      );

      input.value = "";
      return;
    }

    if (file.size === 0) {
      setError("The selected embroidery file is empty.");
      input.value = "";
      return;
    }

    if (file.size > MAX_DIGITAL_FILE_SIZE) {
      setError("Embroidery files cannot exceed 20MB.");
      input.value = "";
      return;
    }

    const format = extension.toUpperCase();

    const duplicateFormat = form.digitalFiles.some(
      (item) => item.format === format
    );

    if (duplicateFormat) {
      setError(
        `A ${format} file has already been uploaded. Remove it before uploading another ${format} file.`
      );

      input.value = "";
      return;
    }

    try {
      setUploadingDigitalFile(true);

      const formData = new FormData();
      formData.append("file", file);

      const data = await uploadRequest(
        "/uploads/digital-embroidery",
        formData
      );

      if (
        !data.success ||
        !data.digitalFile?.storageKey ||
        !data.digitalFile?.format
      ) {
        throw new Error(
          data.message || "Unable to upload embroidery file."
        );
      }

      const uploadedFile = {
        format: data.digitalFile.format,
        storageKey: data.digitalFile.storageKey,
        originalName: data.digitalFile.originalName,
        fileSize: data.digitalFile.fileSize,
      };

      setForm((previous) => {
        const alreadyExists = previous.digitalFiles.some(
          (item) => item.format === uploadedFile.format
        );

        if (alreadyExists) {
          return previous;
        }

        return {
          ...previous,
          digitalFiles: [
            ...previous.digitalFiles,
            uploadedFile,
          ],
        };
      });

      setUploadSuccess(
        `${uploadedFile.originalName} uploaded successfully.`
      );
    } catch (err) {
      console.error(
        "Digital embroidery upload error:",
        err
      );

      setError(
        err.message || "Unable to upload embroidery file."
      );
    } finally {
      setUploadingDigitalFile(false);
      input.value = "";
    }
  };

  /*
  ==========================================
  REMOVE DIGITAL EMBROIDERY FILE
  ==========================================
  */

  const handleRemoveDigitalFile = (index) => {
    setForm((previous) => ({
      ...previous,
      digitalFiles: previous.digitalFiles.filter(
        (_, fileIndex) => fileIndex !== index
      ),
    }));

    setError("");
    setUploadSuccess("");
  };

  /*
  ==========================================
  REMOVE IMAGE
  ==========================================
  */

  const handleRemoveImage = () => {
    setForm((previous) => ({
      ...previous,
      image: "",
    }));

    setUploadSuccess("");
    setError("");
  };

  /*
  ==========================================
  REMOVE VIDEO
  ==========================================
  */

  const handleRemoveVideo = () => {
    setForm((previous) => ({
      ...previous,
      video: "",
    }));

    setVideoDuration(0);

    setUploadSuccess("");
    setError("");
  };

  /*
  ==========================================
  VALIDATION HELPERS
  ==========================================
  */

  const isValidPositiveNumber = (value) => {
    return (
      value !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) > 0
    );
  };

  const isValidNonNegativeNumber = (value) => {
    return (
      value !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0
    );
  };

  /*
  ==========================================
  CREATE PRODUCT
  ==========================================
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isUploading || saving) {
      setError("Please wait for all uploads to finish.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setUploadSuccess("");

      if (!form.name.trim()) {
        throw new Error("Product name is required.");
      }

      if (!form.category.trim()) {
        throw new Error("Product category is required.");
      }

      if (!form.image.trim() && !form.video.trim()) {
        throw new Error(
          "Please upload an image, a video, or both."
        );
      }

      /*
      READY-TO-WEAR
      */

      if (isReadyToWear) {
        if (!isValidPositiveNumber(form.price)) {
          throw new Error(
            "Please enter a valid product price greater than zero."
          );
        }

        if (
          !isValidNonNegativeNumber(form.stock) ||
          !Number.isInteger(Number(form.stock))
        ) {
          throw new Error(
            "Please enter a valid whole-number stock quantity."
          );
        }
      }

      /*
      RAW MATERIAL
      */

      if (isRawMaterial) {
        if (!isValidPositiveNumber(form.price)) {
          throw new Error(
            "Please enter a valid price per yard greater than zero."
          );
        }

        if (!isValidNonNegativeNumber(form.stockInYards)) {
          throw new Error(
            "Please enter a valid available yard quantity."
          );
        }
      }

      /*
      MONOGRAM / PHOENIX EMBROIDERY
      */

      if (isEmbroideryProduct) {
        if (!form.digitalAvailable && !form.physicalAvailable) {
          throw new Error(
            "Enable at least one purchase option."
          );
        }

        if (form.digitalAvailable) {
          if (!isValidPositiveNumber(form.digitalPrice)) {
            throw new Error(
              "Please enter a valid digital price greater than zero."
            );
          }

          if (!form.digitalFiles.length) {
            throw new Error(
              "Please upload at least one digital embroidery file."
            );
          }

          const invalidDigitalFile = form.digitalFiles.some(
            (file) =>
              !file.format ||
              !file.storageKey ||
              !file.originalName
          );

          if (invalidDigitalFile) {
            throw new Error(
              "One or more embroidery files are incomplete. Please upload them again."
            );
          }
        }

        if (form.physicalAvailable) {
          if (!isValidPositiveNumber(form.physicalPrice)) {
            throw new Error(
              "Please enter a valid physical price greater than zero."
            );
          }

          if (
            !isValidNonNegativeNumber(form.stock) ||
            !Number.isInteger(Number(form.stock))
          ) {
            throw new Error(
              "Please enter a valid whole-number physical stock quantity."
            );
          }
        }
      }

      /*
      DELIVERY
      */

      if (
        form.deliveryAvailable &&
        !isValidNonNegativeNumber(form.deliveryFee)
      ) {
        throw new Error("Please enter a valid delivery fee.");
      }

      /*
      VIDEO
      */

      if (form.video && videoDuration > 60) {
        throw new Error(
          "Product video must be 60 seconds or less."
        );
      }

      /*
      LEGACY PRICE COMPATIBILITY
      */

      let effectivePrice = Number(form.price || 0);

      if (isEmbroideryProduct) {
        effectivePrice = form.physicalAvailable
          ? Number(form.physicalPrice)
          : Number(form.digitalPrice);
      }

      /*
      CREATE PRODUCT PAYLOAD
      */

      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),

        price: effectivePrice,

        image: form.image.trim(),
        video: form.video.trim(),
        description: form.description.trim(),

        stock: isRawMaterial
          ? 0
          : isEmbroideryProduct && !form.physicalAvailable
            ? 0
            : Number(form.stock || 0),

        featured: form.featured,
        active: form.active,

        productType: form.productType,
        priceUnit: form.priceUnit,

        stockInYards: isRawMaterial
          ? Number(form.stockInYards || 0)
          : 0,

        digitalAvailable: isEmbroideryProduct
          ? form.digitalAvailable
          : false,

        digitalPrice:
          isEmbroideryProduct && form.digitalAvailable
            ? Number(form.digitalPrice)
            : 0,

        digitalFiles:
          isEmbroideryProduct && form.digitalAvailable
            ? form.digitalFiles
            : [],

        physicalAvailable: isEmbroideryProduct
          ? form.physicalAvailable
          : true,

        physicalPrice:
          isEmbroideryProduct && form.physicalAvailable
            ? Number(form.physicalPrice)
            : null,

        deliveryAvailable: form.deliveryAvailable,

        deliveryFee: form.deliveryAvailable
          ? Number(form.deliveryFee)
          : 0,
      };

      const data = await apiRequest("/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!data.success || !data.product) {
        throw new Error(
          data.message || "Unable to create product."
        );
      }

      navigate(`/admin/products/${data.product._id}`);
    } catch (err) {
      console.error("Create product error:", err);

      setError(
        err.message || "Unable to create product."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  ==========================================
  PRODUCT SUMMARY
  ==========================================
  */

  const summaryStock = isRawMaterial
    ? `${form.stockInYards || 0} yards`
    : isEmbroideryProduct
      ? form.physicalAvailable
        ? `${form.stock || 0} pieces`
        : "Digital only"
      : `${form.stock || 0} pieces`;

  const productTypeLabel = isReadyToWear
    ? "Ready-to-Wear"
    : isRawMaterial
      ? "Raw Material"
      : form.productType === "monogram"
        ? "Ready-Made Monogram"
        : "Phoenix Embroidery";

  const renderSummaryPrice = () => {
    if (isRawMaterial) {
      return (
        <>
          {formatCurrency(form.price)}
          <small> / yard</small>
        </>
      );
    }

    if (isEmbroideryProduct) {
      return (
        <div className="admin-product-create-summary-prices">
          {form.digitalAvailable && (
            <div>
              <span>Digital</span>
              <strong>
                {formatCurrency(form.digitalPrice)}
              </strong>
            </div>
          )}

          {form.physicalAvailable && (
            <div>
              <span>Physical</span>
              <strong>
                {formatCurrency(form.physicalPrice)}
              </strong>
            </div>
          )}

          {!form.digitalAvailable && !form.physicalAvailable && (
            <strong>No purchase option enabled</strong>
          )}
        </div>
      );
    }

    return formatCurrency(form.price);
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <section className="admin-main admin-product-create-page">

          {/* HEADER */}

          <div className="admin-product-create-header">
            <div>
              <button
                type="button"
                className="admin-product-create-back"
                onClick={() => navigate("/admin/products")}
              >
                ← Products
              </button>

              <span className="admin-eyebrow">INVENTORY</span>

              <h1>Add New Product</h1>

              <p>
                Create a new product for the ABS CUT store.
              </p>
            </div>

            <div className="admin-product-create-badge">
              <span>+</span>
              NEW PRODUCT
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="admin-product-create-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          {/* SUCCESS */}

          {uploadSuccess && (
            <div className="admin-product-create-success">
              <span>✓</span>
              <p>{uploadSuccess}</p>
            </div>
          )}

          <form
            className="admin-product-create-layout"
            onSubmit={handleSubmit}
          >
            {/* MAIN */}

            <div className="admin-product-create-main">

              {/* IMAGE SECTION */}

              <section className="admin-product-create-card">
                <div className="admin-product-create-card-header">
                  <div>
                    <span>PRODUCT IMAGE</span>
                    <h2>Visual Presentation</h2>
                  </div>
                </div>

                <div className="admin-product-create-preview">
                  {form.image ? (
                    <>
                      <img
                        src={form.image}
                        alt={form.name || "Product preview"}
                      />

                      <button
                        type="button"
                        className="admin-product-create-remove-image"
                        onClick={handleRemoveImage}
                        disabled={uploading}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div className="admin-product-create-empty-preview">
                      <span>A</span>
                      <strong>ABS CUT</strong>
                      <small>PRODUCT PREVIEW</small>
                    </div>
                  )}

                  <div className="admin-product-create-preview-label">
                    LIVE PREVIEW
                  </div>
                </div>

                <div className="admin-product-create-upload-area">
                  <label
                    htmlFor="product-image-upload"
                    className={`admin-product-create-upload-button ${
                      uploading ? "uploading" : ""
                    }`}
                  >
                    <input
                      id="product-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading || saving}
                    />

                    <span className="admin-product-create-upload-icon">
                      {uploading ? "↻" : "↑"}
                    </span>

                    <span>
                      {uploading ? "UPLOADING..." : "UPLOAD IMAGE"}
                    </span>
                  </label>

                  <p>
                    PNG, JPG, JPEG, WEBP
                    <br />
                    Maximum size: 5MB
                  </p>
                </div>

                <div className="admin-product-create-image-divider">
                  <span>OR</span>
                </div>

                <div className="admin-product-create-field">
                  <label htmlFor="create-image">IMAGE URL</label>

                  <input
                    id="create-image"
                    name="image"
                    type="text"
                    value={form.image}
                    onChange={handleChange}
                    placeholder="https://example.com/product.jpg"
                    disabled={isUploading || saving}
                  />

                  <small>
                    Upload an image above or paste an image URL.
                  </small>
                </div>
              </section>

              {/* VIDEO SECTION */}

              <section className="admin-product-create-card">
                <div className="admin-product-create-card-header">
                  <div>
                    <span>PRODUCT VIDEO</span>
                    <h2>Show The Product In Motion</h2>
                  </div>
                </div>

                <div className="admin-product-create-video-preview">
                  {form.video ? (
                    <>
                      <video
                        src={form.video}
                        controls
                        playsInline
                        preload="metadata"
                      />

                      <button
                        type="button"
                        className="admin-product-create-remove-video"
                        onClick={handleRemoveVideo}
                        disabled={uploadingVideo}
                      >
                        ×
                      </button>

                      <div className="admin-product-create-video-duration">
                        <span>●</span>
                        {formatVideoDuration(videoDuration)}
                      </div>
                    </>
                  ) : (
                    <div className="admin-product-create-empty-video">
                      <span>▶</span>
                      <strong>PRODUCT VIDEO</strong>
                      <small>OPTIONAL · MAX 60 SECONDS</small>
                    </div>
                  )}
                </div>

                <div className="admin-product-create-upload-area">
                  <label
                    htmlFor="product-video-upload"
                    className={`admin-product-create-upload-button ${
                      uploadingVideo ? "uploading" : ""
                    }`}
                  >
                    <input
                      id="product-video-upload"
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleVideoUpload}
                      disabled={isUploading || saving}
                    />

                    <span className="admin-product-create-upload-icon">
                      {uploadingVideo ? "↻" : "▶"}
                    </span>

                    <span>
                      {uploadingVideo
                        ? "UPLOADING VIDEO..."
                        : "UPLOAD VIDEO"}
                    </span>
                  </label>

                  <p>
                    MP4, MOV or WEBM
                    <br />
                    Maximum: 60 seconds · 50MB
                  </p>
                </div>

                <div className="admin-product-create-image-divider">
                  <span>OR</span>
                </div>

                <div className="admin-product-create-field">
                  <label htmlFor="create-video">VIDEO URL</label>

                  <input
                    id="create-video"
                    name="video"
                    type="text"
                    value={form.video}
                    onChange={handleChange}
                    placeholder="https://example.com/product-video.mp4"
                    disabled={isUploading || saving}
                  />

                  <small>
                    Upload a video above or paste a video URL here.
                  </small>
                </div>
              </section>

              {/* PRODUCT INFORMATION */}

              <section className="admin-product-create-card">
                <div className="admin-product-create-card-header">
                  <div>
                    <span>PRODUCT INFORMATION</span>
                    <h2>Basic Details</h2>
                  </div>
                </div>

                <div className="admin-product-create-field full">
                  <label htmlFor="create-product-type">
                    PRODUCT TYPE
                  </label>

                  <select
                    id="create-product-type"
                    name="productType"
                    value={form.productType}
                    onChange={handleProductTypeChange}
                  >
                    <option value="ready_to_wear">
                      Ready-to-Wear
                    </option>

                    <option value="raw_material">
                      Raw Material / Fabric
                    </option>

                    <option value="monogram">
                      Ready-Made Monogram
                    </option>

                    <option value="phoenix_embroidery">
                      Phoenix Embroidery
                    </option>
                  </select>

                  <small>
                    Choose how this product will be sold and fulfilled.
                  </small>
                </div>

                <div className="admin-product-create-grid">

                  {/* NAME */}

                  <div className="admin-product-create-field full">
                    <label htmlFor="create-name">
                      PRODUCT NAME
                    </label>

                    <input
                      id="create-name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Classic Royal Agbada"
                    />
                  </div>

                  {/* CATEGORY */}

                  <div className="admin-product-create-field">
                    <label htmlFor="create-category">
                      CATEGORY
                    </label>

                    <input
                      id="create-category"
                      name="category"
                      type="text"
                      value={form.category}
                      onChange={handleChange}
                      placeholder="Agbada"
                    />
                  </div>

                  {/* READY-TO-WEAR PRICE */}

                  {isReadyToWear && (
                    <div className="admin-product-create-field">
                      <label htmlFor="create-price">
                        PRODUCT PRICE — NGN
                      </label>

                      <input
                        id="create-price"
                        name="price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.price}
                        onChange={handleChange}
                        placeholder="150000"
                      />

                      <small>
                        {form.price
                          ? formatCurrency(form.price)
                          : "Enter the selling price per piece."}
                      </small>
                    </div>
                  )}

                  {/* READY-TO-WEAR STOCK */}

                  {isReadyToWear && (
                    <div className="admin-product-create-field">
                      <label htmlFor="create-stock">
                        AVAILABLE STOCK
                      </label>

                      <input
                        id="create-stock"
                        name="stock"
                        type="number"
                        min="0"
                        step="1"
                        value={form.stock}
                        onChange={handleChange}
                        placeholder="10"
                      />

                      <small>
                        Number of ready-made pieces available.
                      </small>
                    </div>
                  )}

                  {/* RAW MATERIAL PRICE */}

                  {isRawMaterial && (
                    <div className="admin-product-create-field">
                      <label htmlFor="create-price">
                        PRICE PER YARD — NGN
                      </label>

                      <input
                        id="create-price"
                        name="price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.price}
                        onChange={handleChange}
                        placeholder="15000"
                      />

                      <small>
                        {form.price
                          ? `${formatCurrency(form.price)} per yard`
                          : "Enter the selling price for one yard."}
                      </small>
                    </div>
                  )}

                  {/* RAW MATERIAL YARD STOCK */}

                  {isRawMaterial && (
                    <div className="admin-product-create-field">
                      <label htmlFor="create-stock-yards">
                        AVAILABLE YARDS
                      </label>

                      <input
                        id="create-stock-yards"
                        name="stockInYards"
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.stockInYards}
                        onChange={handleChange}
                        placeholder="50"
                      />

                      <small>
                        Available fabric quantity in yards.
                      </small>
                    </div>
                  )}

                  {/* DESCRIPTION */}

                  <div className="admin-product-create-field full">
                    <label htmlFor="create-description">
                      DESCRIPTION
                    </label>

                    <textarea
                      id="create-description"
                      name="description"
                      rows="7"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Describe the product, fabric, design, finishing and other important details..."
                    />
                  </div>
                </div>
              </section>

              {/* EMBROIDERY OPTIONS */}

              {isEmbroideryProduct && (
                <section className="admin-product-create-card">
                  <div className="admin-product-create-card-header">
                    <div>
                      <span>EMBROIDERY OPTIONS</span>
                      <h2>Digital & Physical Sales</h2>
                    </div>
                  </div>

                  {/* DIGITAL SALES */}

                  <div className="admin-product-create-setting">
                    <div>
                      <strong>Digital Embroidery File</strong>

                      <p>
                        Allow customers to purchase downloadable embroidery files.
                      </p>
                    </div>

                    <label className="admin-product-create-switch">
                      <input
                        type="checkbox"
                        name="digitalAvailable"
                        checked={form.digitalAvailable}
                        onChange={handleChange}
                        disabled={isUploading || saving}
                      />

                      <span></span>
                    </label>
                  </div>

                  {form.digitalAvailable && (
                    <>
                      <div className="admin-product-create-field">
                        <label htmlFor="create-digital-price">
                          DIGITAL PRICE — NGN
                        </label>

                        <input
                          id="create-digital-price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          name="digitalPrice"
                          value={form.digitalPrice}
                          onChange={handleChange}
                          placeholder="5000"
                        />

                        <small>
                          Price customers pay for the digital embroidery design.
                        </small>
                      </div>

                      {/* DIGITAL FILE UPLOAD */}

                      <div className="admin-product-create-field full">
                        <label>DIGITAL EMBROIDERY FILES</label>

                        <p>DST · PES · JEF · EXP</p>

                        <label
                          htmlFor="digital-embroidery-upload"
                          className={`admin-product-create-upload-button ${
                            uploadingDigitalFile ? "uploading" : ""
                          }`}
                        >
                          <input
                            id="digital-embroidery-upload"
                            type="file"
                            accept=".dst,.pes,.jef,.exp"
                            onChange={handleDigitalFileUpload}
                            disabled={isUploading || saving}
                          />

                          <span className="admin-product-create-upload-icon">
                            {uploadingDigitalFile ? "↻" : "↑"}
                          </span>

                          <span>
                            {uploadingDigitalFile
                              ? "UPLOADING EMBROIDERY FILE..."
                              : "UPLOAD EMBROIDERY FILE"}
                          </span>
                        </label>

                        <small>
                          Supported formats: DST, PES, JEF and EXP.
                          Maximum file size: 20MB per file.
                        </small>

                        {/* UPLOADED FILES */}

                        {form.digitalFiles.length > 0 && (
                          <div className="admin-product-digital-files">
                            <h3>
                              UPLOADED FILES ({form.digitalFiles.length})
                            </h3>

                            {form.digitalFiles.map((digitalFile, index) => (
                              <div
                                className="admin-product-digital-file"
                                key={`${digitalFile.storageKey}-${index}`}
                              >
                                <div className="admin-product-digital-file-info">
                                  <strong>
                                    {digitalFile.originalName}
                                  </strong>

                                  <small>
                                    {digitalFile.format} ·{" "}
                                    {formatFileSize(digitalFile.fileSize)}
                                  </small>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveDigitalFile(index)
                                  }
                                  disabled={isUploading || saving}
                                  aria-label={`Remove ${digitalFile.originalName}`}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {form.digitalFiles.length === 0 && (
                          <div className="admin-product-digital-empty">
                            No embroidery files uploaded yet.
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* PHYSICAL SALES */}

                  <div className="admin-product-create-setting">
                    <div>
                      <strong>Physical Product</strong>

                      <p>
                        Allow customers to purchase the physical product.
                      </p>
                    </div>

                    <label className="admin-product-create-switch">
                      <input
                        type="checkbox"
                        name="physicalAvailable"
                        checked={form.physicalAvailable}
                        onChange={handleChange}
                      />

                      <span></span>
                    </label>
                  </div>

                  {form.physicalAvailable && (
                    <>
                      <div className="admin-product-create-field">
                        <label htmlFor="create-physical-price">
                          PHYSICAL PRICE — NGN
                        </label>

                        <input
                          id="create-physical-price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          name="physicalPrice"
                          value={form.physicalPrice}
                          onChange={handleChange}
                          placeholder="25000"
                        />

                        <small>
                          Price customers pay for the physical product.
                        </small>
                      </div>

                      <div className="admin-product-create-field">
                        <label htmlFor="create-embroidery-stock">
                          PHYSICAL STOCK QUANTITY
                        </label>

                        <input
                          id="create-embroidery-stock"
                          name="stock"
                          type="number"
                          min="0"
                          step="1"
                          value={form.stock}
                          onChange={handleChange}
                          placeholder="10"
                        />

                        <small>
                          Number of physical items available.
                        </small>
                      </div>
                    </>
                  )}
                </section>
              )}

              {/* DELIVERY SETTINGS */}

              <section className="admin-product-create-card">
                <div className="admin-product-create-card-header">
                  <div>
                    <span>FULFILMENT</span>
                    <h2>Delivery Settings</h2>
                  </div>
                </div>

                <div className="admin-product-create-setting">
                  <div>
                    <strong>Delivery Available</strong>

                    <p>
                      Allow customers to request delivery for this product.
                    </p>
                  </div>

                  <label className="admin-product-create-switch">
                    <input
                      type="checkbox"
                      name="deliveryAvailable"
                      checked={form.deliveryAvailable}
                      onChange={handleChange}
                    />

                    <span></span>
                  </label>
                </div>

                {form.deliveryAvailable && (
                  <div className="admin-product-create-field">
                    <label htmlFor="create-delivery-fee">
                      DELIVERY FEE — NGN
                    </label>

                    <input
                      id="create-delivery-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      name="deliveryFee"
                      value={form.deliveryFee}
                      onChange={handleChange}
                      placeholder="3000"
                    />

                    <small>
                      This is the delivery fee associated with this product.
                    </small>
                  </div>
                )}
              </section>

              {/* STORE SETTINGS */}

              <section className="admin-product-create-card">
                <div className="admin-product-create-card-header">
                  <div>
                    <span>STORE SETTINGS</span>
                    <h2>Product Visibility</h2>
                  </div>
                </div>

                <div className="admin-product-create-setting">
                  <div>
                    <strong>Featured Product</strong>

                    <p>
                      Highlight this product in featured sections of the store.
                    </p>
                  </div>

                  <label className="admin-product-create-switch">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={form.featured}
                      onChange={handleChange}
                    />

                    <span></span>
                  </label>
                </div>

                <div className="admin-product-create-setting">
                  <div>
                    <strong>Product Active</strong>

                    <p>
                      Make this product available to customers immediately.
                    </p>
                  </div>

                  <label className="admin-product-create-switch">
                    <input
                      type="checkbox"
                      name="active"
                      checked={form.active}
                      onChange={handleChange}
                    />

                    <span></span>
                  </label>
                </div>
              </section>

              {/* ACTIONS */}

              <div className="admin-product-create-actions">
                <button
                  type="submit"
                  className="admin-product-create-save"
                  disabled={saving || isUploading}
                >
                  {uploadingDigitalFile
                    ? "UPLOADING EMBROIDERY FILE..."
                    : uploadingVideo
                      ? "UPLOADING VIDEO..."
                      : uploading
                        ? "UPLOADING IMAGE..."
                        : saving
                          ? "CREATING PRODUCT..."
                          : "CREATE PRODUCT"}

                  {!saving && !isUploading && (
                    <span>→</span>
                  )}
                </button>

                <button
                  type="button"
                  className="admin-product-create-cancel"
                  onClick={() => navigate("/admin/products")}
                  disabled={saving || isUploading}
                >
                  CANCEL
                </button>
              </div>
            </div>

            {/* SIDE SUMMARY */}

            <aside className="admin-product-create-side">
              <section className="admin-product-create-card admin-product-create-summary">
                <span>PRODUCT SUMMARY</span>

                <div className="admin-product-create-summary-image">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt={form.name || "Product"}
                    />
                  ) : (
                    <strong>ABS CUT</strong>
                  )}
                </div>

                <h2>{form.name || "New Product"}</h2>

                <div className="admin-product-create-summary-price">
                  {renderSummaryPrice()}
                </div>

                <div className="admin-product-create-summary-meta">
                  <div>
                    <span>CATEGORY</span>
                    <b>{form.category || "—"}</b>
                  </div>

                  <div>
                    <span>PRODUCT TYPE</span>
                    <b>{productTypeLabel}</b>
                  </div>

                  <div>
                    <span>STOCK</span>
                    <b>{summaryStock}</b>
                  </div>

                  {isEmbroideryProduct && (
                    <>
                      <div>
                        <span>PURCHASE OPTIONS</span>

                        <b>
                          {[
                            form.digitalAvailable ? "Digital" : "",
                            form.physicalAvailable ? "Physical" : "",
                          ]
                            .filter(Boolean)
                            .join(" + ") || "None enabled"}
                        </b>
                      </div>

                      {form.digitalAvailable && (
                        <div>
                          <span>DIGITAL FILES</span>
                          <b>{form.digitalFiles.length} uploaded</b>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <span>DELIVERY</span>

                    <b>
                      {form.deliveryAvailable
                        ? formatCurrency(form.deliveryFee)
                        : "Not available"}
                    </b>
                  </div>
                </div>

                <div
                  className={`admin-product-create-status ${
                    form.active ? "active" : "inactive"
                  }`}
                >
                  <span></span>

                  {form.active
                    ? "VISIBLE IN STORE"
                    : "HIDDEN FROM STORE"}
                </div>

                {form.video && (
                  <div className="admin-product-create-video-badge">
                    <span>▶</span>
                    VIDEO ATTACHED
                  </div>
                )}
              </section>

              <section className="admin-product-create-card admin-product-create-tip">
                <span>ABS CUT TIP</span>

                <h2>Product Quality</h2>

                <p>
                  Use a clear product image, accurate pricing and a short
                  product video to help customers see the design, fabric
                  and finishing more clearly.
                </p>
              </section>
            </aside>
          </form>
        </section>
      </div>
    </main>
  );
}

export default AdminProductCreate;