import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiRequest, uploadRequest } from "../services/api";

import AdminSidebar from "../components/AdminSidebar";
import "./AdminProductCreate.css";

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
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [videoDuration, setVideoDuration] = useState(0);

  const [error, setError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /*
    ==========================================
    PRODUCT IMAGE UPLOAD
    ==========================================
  */

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setUploadSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");

      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be 5MB or less.");

      e.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append("image", file);

      const data = await uploadRequest("/uploads/product-image", formData);

      if (!data.success || !data.image?.url) {
        throw new Error(data.message || "Unable to upload image.");
      }

      setForm((previous) => ({
        ...previous,
        image: data.image.url,
      }));

      setUploadSuccess("Product image uploaded successfully.");
    } catch (err) {
      console.error("Product image upload error:", err);

      setError(err.message || "Unable to upload image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  /*
    ==========================================
    PRODUCT VIDEO UPLOAD
    ==========================================
  */

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setUploadSuccess("");

    /*
      Check file type.
    */

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file.");

      e.target.value = "";
      return;
    }

    /*
      Check file size.

      Backend maximum:
      50MB
    */

    if (file.size > 50 * 1024 * 1024) {
      setError("Video size must be 50MB or less.");

      e.target.value = "";
      return;
    }

    /*
      Read the video duration before
      sending it to the server.
    */

    const video = document.createElement("video");

    const videoUrl = URL.createObjectURL(file);

    video.preload = "metadata";

    video.onloadedmetadata = async () => {
      URL.revokeObjectURL(videoUrl);

      const duration = video.duration;

      /*
        ABS CUT maximum:
        60 seconds.
      */

      if (duration > 60) {
        setError("Product video must be 60 seconds or less.");

        e.target.value = "";
        return;
      }

      try {
        setUploadingVideo(true);

        setVideoDuration(duration);

        const formData = new FormData();

        formData.append("video", file);

        const data = await uploadRequest("/uploads/product-video", formData);

        if (!data.success || !data.video?.url) {
          throw new Error(data.message || "Unable to upload product video.");
        }

        /*
          Save Cloudinary video URL
          in the product form.
        */

        setForm((previous) => ({
          ...previous,
          video: data.video.url,
        }));

        /*
          Use the duration returned
          by Cloudinary when available.
        */

        setVideoDuration(Number(data.video.duration) || duration);

        setUploadSuccess("Product video uploaded successfully.");
      } catch (err) {
        console.error("Product video upload error:", err);

        setError(err.message || "Unable to upload product video.");
      } finally {
        setUploadingVideo(false);
        e.target.value = "";
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);

      setError("Unable to read this video file.");

      e.target.value = "";
    };

    video.src = videoUrl;
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
    CREATE PRODUCT
    ==========================================
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (uploading || uploadingVideo) {
        throw new Error("Please wait for the upload to finish.");
      }

      if (!form.name.trim()) {
        throw new Error("Product name is required.");
      }

      if (!form.category.trim()) {
        throw new Error("Product category is required.");
      }

      // if (!form.image.trim()) {
      //   throw new Error(
      //     "Product image is required."
      //   );
      // }
      
if (
  !form.image.trim() &&
  !form.video.trim()
) {
  throw new Error(
    "Please upload an image, a video, or both."
  );
}
;

      if (form.price === "" || Number(form.price) < 0) {
        throw new Error("Please enter a valid price.");
      }

      if (form.stock === "" || Number(form.stock) < 0) {
        throw new Error("Please enter a valid stock quantity.");
      }

      if (form.video && videoDuration > 180) {
        throw new Error("Product video must be 180 seconds or less.");
      }

      const data = await apiRequest("/admin/products", {
        method: "POST",

        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category.trim(),
          price: Number(form.price),
          image: form.image.trim(),
          video: form.video.trim(),
          description: form.description.trim(),
          stock: Number(form.stock),
          featured: form.featured,
          active: form.active,
        }),
      });

      if (!data.success || !data.product) {
        throw new Error(data.message || "Unable to create product.");
      }

      navigate(`/admin/products/${data.product._id}`);
    } catch (err) {
      console.error("Create product error:", err);

      setError(err.message || "Unable to create product.");
    } finally {
      setSaving(false);
    }
  };

  /*
    ==========================================
    CURRENCY
    ==========================================
  */

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  /*
    ==========================================
    VIDEO DURATION FORMAT
    ==========================================
  */

  const formatVideoDuration = (seconds) => {
    if (!seconds) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <AdminSidebar />

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

              <p>Create a new product for the ABS CUT store.</p>
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

          <form className="admin-product-create-layout" onSubmit={handleSubmit}>
            {/* MAIN */}

            <div className="admin-product-create-main">
              {/* =====================================
                  IMAGE SECTION
              ====================================== */}

              <section className="admin-product-create-card">
                <div className="admin-product-create-card-header">
                  <div>
                    <span>PRODUCT IMAGE</span>

                    <h2>Visual Presentation</h2>
                  </div>
                </div>

                {/* IMAGE PREVIEW */}

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

                {/* IMAGE UPLOAD */}

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
                      disabled={uploading || saving || uploadingVideo}
                    />

                    <span className="admin-product-create-upload-icon">
                      {uploading ? "↻" : "↑"}
                    </span>

                    <span>{uploading ? "UPLOADING..." : "UPLOAD IMAGE"}</span>
                  </label>

                  <p>
                    PNG, JPG, JPEG, WEBP
                    <br />
                    Maximum size: 5MB
                  </p>
                </div>

                {/* IMAGE URL */}

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
                    disabled={uploading || uploadingVideo}
                  />

                  <small>Upload an image above or paste an image URL.</small>
                </div>
              </section>

              {/* =====================================
                  VIDEO SECTION
              ====================================== */}

              <section className="admin-product-create-card">
                <div className="admin-product-create-card-header">
                  <div>
                    <span>PRODUCT VIDEO</span>

                    <h2>Show The Product In Motion</h2>
                  </div>
                </div>

                {/* VIDEO PREVIEW */}

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

                {/* VIDEO UPLOAD */}

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
                      disabled={uploading || uploadingVideo || saving}
                    />

                    <span className="admin-product-create-upload-icon">
                      {uploadingVideo ? "↻" : "▶"}
                    </span>

                    <span>
                      {uploadingVideo ? "UPLOADING VIDEO..." : "UPLOAD VIDEO"}
                    </span>
                  </label>

                  <p>
                    MP4, MOV or WEBM
                    <br />
                    Maximum: 60 seconds · 50MB
                  </p>
                </div>

                {/* VIDEO URL FALLBACK */}

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
                    disabled={uploading || uploadingVideo}
                  />

                  <small>
                    You can upload a video above or paste a video URL here.
                  </small>
                </div>
              </section>

              {/* =====================================
                  PRODUCT DETAILS
              ====================================== */}

              <section className="admin-product-create-card">
                <div className="admin-product-create-card-header">
                  <div>
                    <span>PRODUCT INFORMATION</span>

                    <h2>Basic Details</h2>
                  </div>
                </div>

                <div className="admin-product-create-grid">
                  <div className="admin-product-create-field full">
                    <label htmlFor="create-name">PRODUCT NAME</label>

                    <input
                      id="create-name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Classic Royal Agbada"
                    />
                  </div>

                  <div className="admin-product-create-field">
                    <label htmlFor="create-category">CATEGORY</label>

                    <input
                      id="create-category"
                      name="category"
                      type="text"
                      value={form.category}
                      onChange={handleChange}
                      placeholder="Agbada"
                    />
                  </div>

                  <div className="admin-product-create-field">
                    <label htmlFor="create-price">PRICE — NGN</label>

                    <input
                      id="create-price"
                      name="price"
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="150000"
                    />

                    <small>
                      {form.price
                        ? formatCurrency(Number(form.price))
                        : "Enter product price"}
                    </small>
                  </div>

                  <div className="admin-product-create-field">
                    <label htmlFor="create-stock">STOCK QUANTITY</label>

                    <input
                      id="create-stock"
                      name="stock"
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={handleChange}
                      placeholder="10"
                    />
                  </div>

                  <div className="admin-product-create-field full">
                    <label htmlFor="create-description">DESCRIPTION</label>

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

              {/* =====================================
                  SETTINGS
              ====================================== */}

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

                    <p>Make this product available to customers immediately.</p>
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

              {/* =====================================
                  ACTIONS
              ====================================== */}

              <div className="admin-product-create-actions">
                <button
                  type="submit"
                  className="admin-product-create-save"
                  disabled={saving || uploading || uploadingVideo}
                >
                  {uploadingVideo
                    ? "UPLOADING VIDEO..."
                    : uploading
                      ? "UPLOADING IMAGE..."
                      : saving
                        ? "CREATING PRODUCT..."
                        : "CREATE PRODUCT"}

                  {!saving && !uploading && !uploadingVideo && <span>→</span>}
                </button>

                <button
                  type="button"
                  className="admin-product-create-cancel"
                  onClick={() => navigate("/admin/products")}
                  disabled={saving || uploading || uploadingVideo}
                >
                  CANCEL
                </button>
              </div>
            </div>

            {/* =====================================
                SIDE
            ====================================== */}

            <aside className="admin-product-create-side">
              {/* SUMMARY */}

              <section className="admin-product-create-card admin-product-create-summary">
                <span>PRODUCT SUMMARY</span>

                <div className="admin-product-create-summary-image">
                  {form.image ? (
                    <img src={form.image} alt={form.name || "Product"} />
                  ) : (
                    <strong>ABS CUT</strong>
                  )}
                </div>

                <h2>{form.name || "New Product"}</h2>

                <strong className="admin-product-create-summary-price">
                  {formatCurrency(Number(form.price))}
                </strong>

                <div className="admin-product-create-summary-meta">
                  <div>
                    <span>CATEGORY</span>

                    <b>{form.category || "—"}</b>
                  </div>

                  <div>
                    <span>STOCK</span>

                    <b>{form.stock || 0}</b>
                  </div>
                </div>

                <div
                  className={`admin-product-create-status ${
                    form.active ? "active" : "inactive"
                  }`}
                >
                  <span></span>

                  {form.active ? "VISIBLE IN STORE" : "HIDDEN FROM STORE"}
                </div>

                {form.video && (
                  <div className="admin-product-create-video-badge">
                    <span>▶</span>
                    VIDEO ATTACHED
                  </div>
                )}
              </section>

              {/* TIP */}

              <section className="admin-product-create-card admin-product-create-tip">
                <span>ABS CUT TIP</span>

                <h2>Product Quality</h2>

                <p>
                  Use a clear product image, accurate pricing and a short
                  product video to help customers see the design, fabric and
                  finishing more clearly.
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
