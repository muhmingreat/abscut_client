
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  apiRequest,
  uploadRequest,
} from "../services/api";

import LoadingScreen from "./LoadingScreen";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminProductDetails.css";

function AdminProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [videoDuration, setVideoDuration] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        `/admin/products/${id}`
      );

      if (!data.success || !data.product) {
        throw new Error(
          data.message ||
            "Unable to load product."
        );
      }

      const loadedProduct = data.product;

      setProduct(loadedProduct);

      setForm({
        name: loadedProduct.name || "",
        category: loadedProduct.category || "",
        price: loadedProduct.price ?? "",
        image: loadedProduct.image || "",
        video: loadedProduct.video || "",
        description:
          loadedProduct.description || "",
        stock: loadedProduct.stock ?? "",
        featured:
          loadedProduct.featured || false,
        active:
          loadedProduct.active !== false,
      });
    } catch (err) {
      console.error(
        "Admin product details error:",
        err
      );

      setError(
        err.message ||
          "Unable to load product."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } =
      e.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  /*
    ==========================================
    VIDEO UPLOAD
    ==========================================
  */

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];

    e.target.value = "";

    if (!file) {
      return;
    }

    try {
      setUploadingVideo(true);
      setError("");
      setSuccess("");

      if (!file.type.startsWith("video/")) {
        throw new Error(
          "Please select a valid video file."
        );
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error(
          "Video must be 50MB or less."
        );
      }

      /*
        Check duration before uploading.
      */

      const video =
        document.createElement("video");

      const videoUrl =
        URL.createObjectURL(file);

      video.preload = "metadata";

      video.onloadedmetadata = async () => {
        URL.revokeObjectURL(videoUrl);

        const duration = video.duration;

        if (
          !Number.isFinite(duration) ||
          duration <= 0
        ) {
          setUploadingVideo(false);

          setError(
            "Unable to determine the video duration."
          );

          return;
        }

        if (duration > 60) {
          setUploadingVideo(false);

          setError(
            "Product video must be 60 seconds or less."
          );

          return;
        }

        try {
          setVideoDuration(duration);

          const formData =
            new FormData();

          formData.append(
            "video",
            file
          );

          const data =
            await uploadRequest(
              "/uploads/product-video",
              formData
            );

          if (
            !data.success ||
            !data.video?.url
          ) {
            throw new Error(
              data.message ||
                "Unable to upload video."
            );
          }

          setForm((previous) => ({
            ...previous,
            video: data.video.url,
          }));

          setSuccess(
            "Product video uploaded successfully. Save the product to apply the change."
          );
        } catch (uploadError) {
          console.error(
            "Admin product video upload error:",
            uploadError
          );

          setError(
            uploadError.message ||
              "Unable to upload product video."
          );
        } finally {
          setUploadingVideo(false);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);

        setUploadingVideo(false);

        setError(
          "Unable to read this video file."
        );
      };

      video.src = videoUrl;
    } catch (err) {
      console.error(
        "Video validation error:",
        err
      );

      setUploadingVideo(false);

      setError(
        err.message ||
          "Unable to process video."
      );
    }
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

    setError("");
    setSuccess(
      "Video removed. Save the product to apply the change."
    );
  };

  /*
    ==========================================
    SAVE PRODUCT
    ==========================================
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!form.name.trim()) {
        throw new Error(
          "Product name is required."
        );
      }

      if (!form.category.trim()) {
        throw new Error(
          "Product category is required."
        );
      }

      /*
        At least one media item is required.

        Valid:
        image only
        video only
        image + video

        Invalid:
        image + no video
        no image + video
        no image + no video
      */

      if (
        !form.image.trim() &&
        !form.video.trim()
      ) {
        throw new Error(
          "Please keep an image, a video, or both."
        );
      }

      if (
        form.price === "" ||
        Number(form.price) < 0
      ) {
        throw new Error(
          "Please enter a valid price."
        );
      }

      if (
        form.stock === "" ||
        Number(form.stock) < 0
      ) {
        throw new Error(
          "Please enter a valid stock quantity."
        );
      }

      const data = await apiRequest(
        `/admin/products/${id}`,
        {
          method: "PUT",

          body: JSON.stringify({
            name: form.name.trim(),
            category: form.category.trim(),
            price: Number(form.price),

            image:
              form.image.trim(),

            video:
              form.video.trim(),

            description:
              form.description.trim(),

            stock:
              Number(form.stock),

            featured:
              form.featured,

            active:
              form.active,
          }),
        }
      );

      if (!data.success || !data.product) {
        throw new Error(
          data.message ||
            "Unable to update product."
        );
      }

      setProduct(data.product);

      setForm((previous) => ({
        ...previous,
        image:
          data.product.image || "",
        video:
          data.product.video || "",
      }));

      setSuccess(
        "Product updated successfully."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(
        "Update product error:",
        err
      );

      setError(
        err.message ||
          "Unable to update product."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
    ==========================================
    DEACTIVATE PRODUCT
    ==========================================
  */

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this product?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeactivating(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/admin/products/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!data.success) {
        throw new Error(
          data.message ||
            "Unable to deactivate product."
        );
      }

      setProduct(data.product);

      setForm((previous) => ({
        ...previous,
        active: false,
      }));

      setSuccess(
        "Product deactivated successfully."
      );
    } catch (err) {
      console.error(
        "Deactivate product error:",
        err
      );

      setError(
        err.message ||
          "Unable to deactivate product."
      );
    } finally {
      setDeactivating(false);
    }
  };

  /*
    ==========================================
    HELPERS
    ==========================================
  */

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatVideoDuration = (seconds) => {
    if (!seconds || !Number.isFinite(seconds)) {
      return "00:00";
    }

    const minutes = Math.floor(
      seconds / 60
    );

    const remainingSeconds =
      Math.floor(seconds % 60);

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <LoadingScreen
        message="Loading product..."
      />
    );
  }

  if (error && !product) {
    return (
      <main className="admin-dashboard-page">
        <div className="admin-dashboard-shell">
          <AdminSidebar />

          <section className="admin-main">
            <div className="admin-product-details-error">
              <span>PRODUCT ERROR</span>

              <h1>
                Unable to load product
              </h1>

              <p>{error}</p>

              <Link
                to="/admin/products"
                className="admin-product-back-btn"
              >
                ← BACK TO PRODUCTS
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">

        <AdminSidebar />

        <section className="admin-main admin-product-details-page">

          {/* HEADER */}

          <div className="admin-product-details-header">

            <div>
              <Link
                to="/admin/products"
                className="admin-product-back-link"
              >
                ← Products
              </Link>

              <span className="admin-eyebrow">
                PRODUCT MANAGEMENT
              </span>

              <h1>
                Manage Product
              </h1>

              <p>
                Update product information,
                pricing, inventory and media.
              </p>
            </div>

            <div
              className={`admin-product-live-status ${
                form.active
                  ? "active"
                  : "inactive"
              }`}
            >
              <span></span>

              {form.active
                ? "ACTIVE"
                : "INACTIVE"}
            </div>

          </div>

          {/* MESSAGES */}

          {(error || success) && (
            <div
              className={`admin-product-message ${
                error
                  ? "error"
                  : "success"
              }`}
            >
              <span>
                {error
                  ? "!"
                  : "✓"}
              </span>

              <p>
                {error || success}
              </p>
            </div>
          )}

          <form
            className="admin-product-details-layout"
            onSubmit={handleSubmit}
          >

            {/* LEFT */}

            <div className="admin-product-details-main">

              {/* ======================================
                  PRODUCT MEDIA
              ====================================== */}

              <section className="admin-product-edit-card admin-product-media-card">

                <div className="admin-product-edit-card-header">
                  <div>
                    <span>
                      PRODUCT MEDIA
                    </span>

                    <h2>
                      Visual Presentation
                    </h2>
                  </div>

                  <div className="admin-product-media-count">
                    {form.image &&
                      "IMAGE"}

                    {form.image &&
                      form.video &&
                      " + "}

                    {form.video &&
                      "VIDEO"}
                  </div>
                </div>

                {/* IMAGE PREVIEW */}

                {form.image && (
                  <div className="admin-product-media-preview">

                    <img
                      src={form.image}
                      alt={form.name}
                    />

                    <div className="admin-product-media-label">
                      <span>IMAGE</span>
                      <small>
                        PRODUCT MEDIA
                      </small>
                    </div>

                  </div>
                )}

                {/* VIDEO PREVIEW */}

                {form.video && (
                  <div className="admin-product-video-preview">

                    <video
                      src={form.video}
                      controls
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        const duration =
                          e.currentTarget.duration;

                        if (
                          Number.isFinite(
                            duration
                          )
                        ) {
                          setVideoDuration(
                            duration
                          );
                        }
                      }}
                    />

                    <div className="admin-product-video-overlay">

                      <span>
                        PRODUCT VIDEO
                      </span>

                      {videoDuration > 0 && (
                        <small>
                          {formatVideoDuration(
                            videoDuration
                          )}
                        </small>
                      )}

                    </div>

                    <button
                      type="button"
                      className="admin-product-remove-video"
                      onClick={
                        handleRemoveVideo
                      }
                      disabled={
                        saving ||
                        uploadingVideo
                      }
                    >
                      ×
                    </button>

                  </div>
                )}

                {/* EMPTY STATE */}

                {!form.image &&
                  !form.video && (
                    <div className="admin-product-empty-media">

                      <span>◇</span>

                      <strong>
                        NO PRODUCT MEDIA
                      </strong>

                      <small>
                        Add an image or video
                        before saving.
                      </small>

                    </div>
                  )}

                {/* IMAGE URL */}

                <div className="admin-product-form-group">

                  <label htmlFor="image">
                    IMAGE PATH / URL
                    <small>
                      OPTIONAL
                    </small>
                  </label>

                  <input
                    id="image"
                    name="image"
                    type="text"
                    value={form.image}
                    onChange={handleChange}
                    placeholder="/images/product.png"
                  />

                </div>

                {/* VIDEO UPLOAD */}

                <div className="admin-product-video-upload">

                  <div className="admin-product-video-upload-heading">

                    <div>
                      <span>
                        PRODUCT VIDEO
                      </span>

                      <h3>
                        {form.video
                          ? "Replace Video"
                          : "Add Product Video"}
                      </h3>
                    </div>

                    <small>
                      OPTIONAL · MAX 60 SEC
                    </small>

                  </div>

                  <label
                    className={`admin-product-video-upload-button ${
                      uploadingVideo
                        ? "uploading"
                        : ""
                    }`}
                  >

                    <span>
                      {uploadingVideo
                        ? "UPLOADING..."
                        : form.video
                        ? "UPLOAD REPLACEMENT VIDEO"
                        : "UPLOAD VIDEO"}
                    </span>

                    <input
                      type="file"
                      accept="video/*"
                      onChange={
                        handleVideoUpload
                      }
                      disabled={
                        uploadingVideo ||
                        saving
                      }
                    />

                  </label>

                  {form.video && (
                    <button
                      type="button"
                      className="admin-product-remove-video-btn"
                      onClick={
                        handleRemoveVideo
                      }
                      disabled={
                        uploadingVideo ||
                        saving
                      }
                    >
                      REMOVE VIDEO
                    </button>
                  )}

                  {form.video && (
                    <div className="admin-product-video-status">
                      <span>✓</span>

                      <div>
                        <strong>
                          VIDEO ATTACHED
                        </strong>

                        <small>
                          {videoDuration > 0
                            ? `${formatVideoDuration(
                                videoDuration
                              )} · `
                            : ""}
                          Save changes to
                          apply the media update.
                        </small>
                      </div>
                    </div>
                  )}

                </div>

                <div className="admin-product-media-note">
                  <span>i</span>

                  <p>
                    At least one product
                    media item is required.
                    You can use an image,
                    video, or both.
                  </p>
                </div>

              </section>

              {/* BASIC INFORMATION */}

              <section className="admin-product-edit-card">

                <div className="admin-product-edit-card-header">
                  <div>
                    <span>
                      PRODUCT INFORMATION
                    </span>

                    <h2>
                      Basic Details
                    </h2>
                  </div>
                </div>

                <div className="admin-product-form-grid">

                  <div className="admin-product-form-group full">

                    <label htmlFor="name">
                      PRODUCT NAME
                    </label>

                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Product name"
                    />

                  </div>

                  <div className="admin-product-form-group">

                    <label htmlFor="category">
                      CATEGORY
                    </label>

                    <input
                      id="category"
                      name="category"
                      type="text"
                      value={form.category}
                      onChange={handleChange}
                      placeholder="Agbada"
                    />

                  </div>

                  <div className="admin-product-form-group">

                    <label htmlFor="price">
                      PRICE — NGN
                    </label>

                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="150000"
                    />

                  </div>

                  <div className="admin-product-form-group">

                    <label htmlFor="stock">
                      STOCK QUANTITY
                    </label>

                    <input
                      id="stock"
                      name="stock"
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={handleChange}
                      placeholder="10"
                    />

                  </div>

                  <div className="admin-product-form-group full">

                    <label htmlFor="description">
                      DESCRIPTION
                    </label>

                    <textarea
                      id="description"
                      name="description"
                      rows="6"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Describe this product..."
                    />

                  </div>

                </div>

              </section>

              {/* SETTINGS */}

              <section className="admin-product-edit-card">

                <div className="admin-product-edit-card-header">
                  <div>
                    <span>
                      STORE SETTINGS
                    </span>

                    <h2>
                      Product Visibility
                    </h2>
                  </div>
                </div>

                <div className="admin-product-setting-row">

                  <div>
                    <strong>
                      Featured Product
                    </strong>

                    <p>
                      Highlight this product
                      in featured sections.
                    </p>
                  </div>

                  <label className="admin-product-switch">

                    <input
                      type="checkbox"
                      name="featured"
                      checked={
                        form.featured
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <span></span>

                  </label>

                </div>

                <div className="admin-product-setting-row">

                  <div>
                    <strong>
                      Product Active
                    </strong>

                    <p>
                      Active products are
                      available in the store.
                    </p>
                  </div>

                  <label className="admin-product-switch">

                    <input
                      type="checkbox"
                      name="active"
                      checked={
                        form.active
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <span></span>

                  </label>

                </div>

              </section>

              {/* ACTIONS */}

              <section className="admin-product-actions">

                <button
                  type="submit"
                  className="admin-product-save-btn"
                  disabled={
                    saving ||
                    uploadingVideo
                  }
                >
                  {saving
                    ? "SAVING..."
                    : "SAVE CHANGES"}

                  {!saving && (
                    <span>→</span>
                  )}
                </button>

                <button
                  type="button"
                  className="admin-product-cancel-btn"
                  onClick={() =>
                    navigate(
                      "/admin/products"
                    )
                  }
                >
                  CANCEL
                </button>

              </section>

            </div>

            {/* RIGHT */}

            <aside className="admin-product-details-side">

              {/* SUMMARY */}

              <section className="admin-product-edit-card admin-product-summary-card">

                <span>
                  CURRENT PRODUCT
                </span>

                <div className="admin-product-summary-image">

                  {form.image ? (
                    <img
                      src={form.image}
                      alt={form.name}
                    />
                  ) : form.video ? (
                    <video
                      src={form.video}
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <span>
                      ABS CUT
                    </span>
                  )}

                </div>

                <h2>
                  {form.name ||
                    "Unnamed Product"}
                </h2>

                <strong>
                  {formatCurrency(
                    Number(form.price)
                  )}
                </strong>

                <div className="admin-product-summary-details">

                  <div>
                    <span>
                      CATEGORY
                    </span>

                    <b>
                      {form.category ||
                        "—"}
                    </b>
                  </div>

                  <div>
                    <span>
                      STOCK
                    </span>

                    <b>
                      {form.stock || 0}
                    </b>
                  </div>

                </div>

                <div className="admin-product-summary-media">

                  {form.image && (
                    <span>
                      🖼 IMAGE
                    </span>
                  )}

                  {form.video && (
                    <span>
                      ▶ VIDEO
                    </span>
                  )}

                </div>

              </section>

              {/* DANGER */}

              <section className="admin-product-edit-card admin-product-danger-card">

                <span>
                  PRODUCT ACTION
                </span>

                <h2>
                  Deactivate Product
                </h2>

                <p>
                  Remove this product from
                  the customer store without
                  deleting its database record.
                </p>

                <button
                  type="button"
                  onClick={
                    handleDeactivate
                  }
                  disabled={
                    deactivating ||
                    !form.active
                  }
                >
                  {deactivating
                    ? "DEACTIVATING..."
                    : form.active
                    ? "DEACTIVATE PRODUCT"
                    : "PRODUCT INACTIVE"}
                </button>

              </section>

              {/* DATABASE RECORD */}

              {product && (
                <section className="admin-product-edit-card admin-product-record-card">

                  <span>
                    DATABASE RECORD
                  </span>

                  <div>
                    <small>
                      PRODUCT ID
                    </small>

                    <code>
                      {product._id}
                    </code>
                  </div>

                  <div>
                    <small>
                      CREATED
                    </small>

                    <strong>
                      {product.createdAt
                        ? new Date(
                            product.createdAt
                          ).toLocaleDateString()
                        : "—"}
                    </strong>
                  </div>

                  <div>
                    <small>
                      LAST UPDATED
                    </small>

                    <strong>
                      {product.updatedAt
                        ? new Date(
                            product.updatedAt
                          ).toLocaleDateString()
                        : "—"}
                    </strong>
                  </div>

                </section>
              )}

            </aside>

          </form>

        </section>

      </div>
    </main>
  );
}

export default AdminProductDetails;











// import { useEffect, useState } from "react";
// import { Link, useNavigate, useParams } from "react-router-dom";

// import { apiRequest } from "../services/api";
// import LoadingScreen from "./LoadingScreen";
// import AdminSidebar from "../components/AdminSidebar";

// function AdminProductDetails() {
//   const { id } = useParams();
//   const navigate = useNavigate();

//   const [product, setProduct] = useState(null);

//   const [form, setForm] = useState({
//     name: "",
//     category: "",
//     price: "",
//     image: "",
//     description: "",
//     stock: "",
//     featured: false,
//     active: true,
//   });

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [deactivating, setDeactivating] = useState(false);

//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   const loadProduct = async () => {
//     try {
//       setLoading(true);
//       setError("");

//       const data = await apiRequest(
//         `/admin/products/${id}`
//       );

//       if (!data.success || !data.product) {
//         throw new Error(
//           data.message ||
//             "Unable to load product."
//         );
//       }

//       const loadedProduct = data.product;

//       setProduct(loadedProduct);

//       setForm({
//         name: loadedProduct.name || "",
//         category: loadedProduct.category || "",
//         price: loadedProduct.price ?? "",
//         image: loadedProduct.image || "",
//         description:
//           loadedProduct.description || "",
//         stock: loadedProduct.stock ?? "",
//         featured:
//           loadedProduct.featured || false,
//         active:
//           loadedProduct.active !== false,
//       });
//     } catch (err) {
//       console.error(
//         "Admin product details error:",
//         err
//       );

//       setError(
//         err.message ||
//           "Unable to load product."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadProduct();
//   }, [id]);

//   const handleChange = (e) => {
//     const { name, value, type, checked } =
//       e.target;

//     setForm((previous) => ({
//       ...previous,
//       [name]:
//         type === "checkbox"
//           ? checked
//           : value,
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     try {
//       setSaving(true);
//       setError("");
//       setSuccess("");

//       if (!form.name.trim()) {
//         throw new Error(
//           "Product name is required."
//         );
//       }

//       if (!form.category.trim()) {
//         throw new Error(
//           "Product category is required."
//         );
//       }

//       if (!form.image.trim()) {
//         throw new Error(
//           "Product image is required."
//         );
//       }

//       if (
//         form.price === "" ||
//         Number(form.price) < 0
//       ) {
//         throw new Error(
//           "Please enter a valid price."
//         );
//       }

//       if (
//         form.stock === "" ||
//         Number(form.stock) < 0
//       ) {
//         throw new Error(
//           "Please enter a valid stock quantity."
//         );
//       }

//       const data = await apiRequest(
//         `/admin/products/${id}`,
//         {
//           method: "PUT",
//           body: JSON.stringify({
//             name: form.name.trim(),
//             category: form.category.trim(),
//             price: Number(form.price),
//             image: form.image.trim(),
//             description:
//               form.description.trim(),
//             stock: Number(form.stock),
//             featured: form.featured,
//             active: form.active,
//           }),
//         }
//       );

//       if (!data.success || !data.product) {
//         throw new Error(
//           data.message ||
//             "Unable to update product."
//         );
//       }

//       setProduct(data.product);

//       setSuccess(
//         "Product updated successfully."
//       );

//       window.scrollTo({
//         top: 0,
//         behavior: "smooth",
//       });
//     } catch (err) {
//       console.error(
//         "Update product error:",
//         err
//       );

//       setError(
//         err.message ||
//           "Unable to update product."
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleDeactivate = async () => {
//     const confirmed = window.confirm(
//       "Are you sure you want to deactivate this product?"
//     );

//     if (!confirmed) {
//       return;
//     }

//     try {
//       setDeactivating(true);
//       setError("");
//       setSuccess("");

//       const data = await apiRequest(
//         `/admin/products/${id}`,
//         {
//           method: "DELETE",
//         }
//       );

//       if (!data.success) {
//         throw new Error(
//           data.message ||
//             "Unable to deactivate product."
//         );
//       }

//       setProduct(data.product);

//       setForm((previous) => ({
//         ...previous,
//         active: false,
//       }));

//       setSuccess(
//         "Product deactivated successfully."
//       );
//     } catch (err) {
//       console.error(
//         "Deactivate product error:",
//         err
//       );

//       setError(
//         err.message ||
//           "Unable to deactivate product."
//       );
//     } finally {
//       setDeactivating(false);
//     }
//   };

//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat("en-NG", {
//       style: "currency",
//       currency: "NGN",
//       maximumFractionDigits: 0,
//     }).format(amount || 0);
//   };

//   if (loading) {
//     return (
//       <LoadingScreen
//         message="Loading product..."
//       />
//     );
//   }

//   if (error && !product) {
//     return (
//       <main className="admin-dashboard-page">
//         <div className="admin-dashboard-shell">
//           <AdminSidebar />

//           <section className="admin-main">
//             <div className="admin-product-details-error">
//               <span>PRODUCT ERROR</span>

//               <h1>
//                 Unable to load product
//               </h1>

//               <p>{error}</p>

//               <Link
//                 to="/admin/products"
//                 className="admin-product-back-btn"
//               >
//                 ← BACK TO PRODUCTS
//               </Link>
//             </div>
//           </section>
//         </div>
//       </main>
//     );
//   }

//   return (
//     <main className="admin-dashboard-page">
//       <div className="admin-dashboard-shell">

//         <AdminSidebar />

//         <section className="admin-main admin-product-details-page">

//           {/* HEADER */}

//           <div className="admin-product-details-header">

//             <div>
//               <Link
//                 to="/admin/products"
//                 className="admin-product-back-link"
//               >
//                 ← Products
//               </Link>

//               <span className="admin-eyebrow">
//                 PRODUCT MANAGEMENT
//               </span>

//               <h1>
//                 Manage Product
//               </h1>

//               <p>
//                 Update product information,
//                 pricing and inventory.
//               </p>
//             </div>

//             <div
//               className={`admin-product-live-status ${
//                 form.active
//                   ? "active"
//                   : "inactive"
//               }`}
//             >
//               <span></span>

//               {form.active
//                 ? "ACTIVE"
//                 : "INACTIVE"}
//             </div>

//           </div>

//           {/* MESSAGES */}

//           {(error || success) && (
//             <div
//               className={`admin-product-message ${
//                 error
//                   ? "error"
//                   : "success"
//               }`}
//             >
//               <span>
//                 {error
//                   ? "!"
//                   : "✓"}
//               </span>

//               <p>
//                 {error || success}
//               </p>
//             </div>
//           )}

//           <form
//             className="admin-product-details-layout"
//             onSubmit={handleSubmit}
//           >

//             {/* LEFT */}

//             <div className="admin-product-details-main">

//               {/* IMAGE */}

//               <section className="admin-product-edit-card admin-product-image-card">

//                 <div className="admin-product-edit-card-header">
//                   <div>
//                     <span>
//                       PRODUCT IMAGE
//                     </span>

//                     <h2>
//                       Visual Presentation
//                     </h2>
//                   </div>
//                 </div>

//                 <div className="admin-product-preview">

//                   {form.image ? (
//                     <img
//                       src={form.image}
//                       alt={form.name}
//                     />
//                   ) : (
//                     <div>
//                       ABS CUT
//                     </div>
//                   )}

//                   <span>
//                     PRODUCT PREVIEW
//                   </span>
//                 </div>

//                 <div className="admin-product-form-group">
//                   <label htmlFor="image">
//                     IMAGE PATH / URL
//                   </label>

//                   <input
//                     id="image"
//                     name="image"
//                     type="text"
//                     value={form.image}
//                     onChange={handleChange}
//                     placeholder="/images/product.png"
//                   />
//                 </div>

//               </section>

//               {/* BASIC INFORMATION */}

//               <section className="admin-product-edit-card">

//                 <div className="admin-product-edit-card-header">
//                   <div>
//                     <span>
//                       PRODUCT INFORMATION
//                     </span>

//                     <h2>
//                       Basic Details
//                     </h2>
//                   </div>
//                 </div>

//                 <div className="admin-product-form-grid">

//                   <div className="admin-product-form-group full">
//                     <label htmlFor="name">
//                       PRODUCT NAME
//                     </label>

//                     <input
//                       id="name"
//                       name="name"
//                       type="text"
//                       value={form.name}
//                       onChange={handleChange}
//                       placeholder="Product name"
//                     />
//                   </div>

//                   <div className="admin-product-form-group">
//                     <label htmlFor="category">
//                       CATEGORY
//                     </label>

//                     <input
//                       id="category"
//                       name="category"
//                       type="text"
//                       value={form.category}
//                       onChange={handleChange}
//                       placeholder="Agbada"
//                     />
//                   </div>

//                   <div className="admin-product-form-group">
//                     <label htmlFor="price">
//                       PRICE — NGN
//                     </label>

//                     <input
//                       id="price"
//                       name="price"
//                       type="number"
//                       min="0"
//                       value={form.price}
//                       onChange={handleChange}
//                       placeholder="150000"
//                     />
//                   </div>

//                   <div className="admin-product-form-group">
//                     <label htmlFor="stock">
//                       STOCK QUANTITY
//                     </label>

//                     <input
//                       id="stock"
//                       name="stock"
//                       type="number"
//                       min="0"
//                       value={form.stock}
//                       onChange={handleChange}
//                       placeholder="10"
//                     />
//                   </div>

//                   <div className="admin-product-form-group full">
//                     <label htmlFor="description">
//                       DESCRIPTION
//                     </label>

//                     <textarea
//                       id="description"
//                       name="description"
//                       rows="6"
//                       value={form.description}
//                       onChange={handleChange}
//                       placeholder="Describe this product..."
//                     />
//                   </div>

//                 </div>

//               </section>

//               {/* SETTINGS */}

//               <section className="admin-product-edit-card">

//                 <div className="admin-product-edit-card-header">
//                   <div>
//                     <span>
//                       STORE SETTINGS
//                     </span>

//                     <h2>
//                       Product Visibility
//                     </h2>
//                   </div>
//                 </div>

//                 <div className="admin-product-setting-row">

//                   <div>
//                     <strong>
//                       Featured Product
//                     </strong>

//                     <p>
//                       Highlight this product
//                       in featured sections.
//                     </p>
//                   </div>

//                   <label className="admin-product-switch">
//                     <input
//                       type="checkbox"
//                       name="featured"
//                       checked={form.featured}
//                       onChange={handleChange}
//                     />

//                     <span></span>
//                   </label>

//                 </div>

//                 <div className="admin-product-setting-row">

//                   <div>
//                     <strong>
//                       Product Active
//                     </strong>

//                     <p>
//                       Active products are
//                       available in the store.
//                     </p>
//                   </div>

//                   <label className="admin-product-switch">
//                     <input
//                       type="checkbox"
//                       name="active"
//                       checked={form.active}
//                       onChange={handleChange}
//                     />

//                     <span></span>
//                   </label>

//                 </div>

//               </section>

//               {/* ACTIONS */}

//               <section className="admin-product-actions">

//                 <button
//                   type="submit"
//                   className="admin-product-save-btn"
//                   disabled={saving}
//                 >
//                   {saving
//                     ? "SAVING..."
//                     : "SAVE CHANGES"}

//                   {!saving && (
//                     <span>→</span>
//                   )}
//                 </button>

//                 <button
//                   type="button"
//                   className="admin-product-cancel-btn"
//                   onClick={() =>
//                     navigate(
//                       "/admin/products"
//                     )
//                   }
//                 >
//                   CANCEL
//                 </button>

//               </section>

//             </div>

//             {/* RIGHT */}

//             <aside className="admin-product-details-side">

//               <section className="admin-product-edit-card admin-product-summary-card">

//                 <span>
//                   CURRENT PRODUCT
//                 </span>

//                 <div className="admin-product-summary-image">
//                   {form.image ? (
//                     <img
//                       src={form.image}
//                       alt={form.name}
//                     />
//                   ) : (
//                     <span>
//                       ABS CUT
//                     </span>
//                   )}
//                 </div>

//                 <h2>
//                   {form.name ||
//                     "Unnamed Product"}
//                 </h2>

//                 <strong>
//                   {formatCurrency(
//                     Number(form.price)
//                   )}
//                 </strong>

//                 <div className="admin-product-summary-details">
//                   <div>
//                     <span>
//                       CATEGORY
//                     </span>

//                     <b>
//                       {form.category ||
//                         "—"}
//                     </b>
//                   </div>

//                   <div>
//                     <span>
//                       STOCK
//                     </span>

//                     <b>
//                       {form.stock || 0}
//                     </b>
//                   </div>
//                 </div>

//               </section>

//               <section className="admin-product-edit-card admin-product-danger-card">

//                 <span>
//                   PRODUCT ACTION
//                 </span>

//                 <h2>
//                   Deactivate Product
//                 </h2>

//                 <p>
//                   Remove this product from
//                   the customer store without
//                   deleting its database record.
//                 </p>

//                 <button
//                   type="button"
//                   onClick={handleDeactivate}
//                   disabled={
//                     deactivating ||
//                     !form.active
//                   }
//                 >
//                   {deactivating
//                     ? "DEACTIVATING..."
//                     : form.active
//                     ? "DEACTIVATE PRODUCT"
//                     : "PRODUCT INACTIVE"}
//                 </button>

//               </section>

//               {product && (
//                 <section className="admin-product-edit-card admin-product-record-card">

//                   <span>
//                     DATABASE RECORD
//                   </span>

//                   <div>
//                     <small>
//                       PRODUCT ID
//                     </small>

//                     <code>
//                       {product._id}
//                     </code>
//                   </div>

//                   <div>
//                     <small>
//                       CREATED
//                     </small>

//                     <strong>
//                       {product.createdAt
//                         ? new Date(
//                             product.createdAt
//                           ).toLocaleDateString()
//                         : "—"}
//                     </strong>
//                   </div>

//                   <div>
//                     <small>
//                       LAST UPDATED
//                     </small>

//                     <strong>
//                       {product.updatedAt
//                         ? new Date(
//                             product.updatedAt
//                           ).toLocaleDateString()
//                         : "—"}
//                     </strong>
//                   </div>

//                 </section>
//               )}

//             </aside>

//           </form>

//         </section>

//       </div>
//     </main>
//   );
// }

// export default AdminProductDetails;

