
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, uploadRequest } from "../../services/api";
import "./AdminActivities.css";

const blank = {
  postType: "text",
  title: "",
  header: "",
  content: "",
  published: true,
  mediaUrl: "",
  mediaPublicId: "",
  mediaType: "none",
};

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "";

export default function AdminActivities() {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/activities/admin/all");
      setActivities(
        Array.isArray(data.activities) ? data.activities : []
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not load activities. Confirm your admin login and backend route."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setForm({ ...blank });
    setEditingId("");
    setFile(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function changePostType(postType) {
    setForm((current) => ({
      ...current,
      postType,
      mediaUrl: "",
      mediaPublicId: "",
      mediaType: "none",
    }));

    setFile(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function editActivity(item) {
    const postType =
      item.postType ||
      (item.mediaType === "video"
        ? "video"
        : item.mediaType === "image" || item.mediaUrl
          ? "image"
          : "text");

    setEditingId(item._id);

    setForm({
      postType,
      title: item.title || "",
      header: item.header || "",
      content: item.content || item.caption || "",
      published: Boolean(item.published),
      mediaUrl: item.mediaUrl || "",
      mediaPublicId: item.mediaPublicId || "",
      mediaType: item.mediaType || "none",
    });

    setFile(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    setNotice("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFileChange(event) {
    const picked = event.target.files?.[0] || null;

    setError("");
    setFile(picked);

    if (!picked) return;

    if (form.postType === "image" && !picked.type.startsWith("image/")) {
      setError("Please select an image for this post.");
      setFile(null);
      event.target.value = "";
      return;
    }

    if (form.postType === "video" && !picked.type.startsWith("video/")) {
      setError("Please select a video for this post.");
      setFile(null);
      event.target.value = "";
      return;
    }

    if (picked.size > 50 * 1024 * 1024) {
      setError("The selected file exceeds the 50 MB upload limit.");
      setFile(null);
      event.target.value = "";
      return;
    }
  }

  async function submit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (!form.title.trim()) {
        throw new Error("Enter a post title.");
      }

      if (!form.header.trim()) {
        throw new Error("Enter a post header.");
      }

      if (!form.content.trim()) {
        throw new Error("Enter the post content.");
      }

      if (form.postType !== "text" && !file && !form.mediaUrl) {
        throw new Error(
          `Upload ${form.postType === "image" ? "an image" : "a video"} for this post.`
        );
      }

      let next = { ...form };

      if (file) {
        const mediaForm = new FormData();
        mediaForm.append("media", file);

        const uploaded = await uploadRequest(
          "/activities/media",
          mediaForm
        );

        next.mediaUrl = uploaded.media.url;
        next.mediaPublicId = uploaded.media.publicId;
        next.mediaType = uploaded.media.type;
      }

      if (next.postType === "text") {
        next.mediaUrl = "";
        next.mediaPublicId = "";
        next.mediaType = "none";
      }

      const payload = {
        ...next,
        caption: next.content,
        published: Boolean(next.published),
      };

      const result = editingId
        ? await apiRequest(`/activities/${editingId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiRequest("/activities", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setNotice(
        result.message ||
          (editingId
            ? "Activity updated successfully."
            : "Activity created successfully.")
      );

      resetForm();
      await load();
    } catch (err) {
      setError(err.message || "Could not save activity.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (
      !window.confirm(
        "Delete this activity? This action cannot be undone."
      )
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const result = await apiRequest(`/activities/${item._id}`, {
        method: "DELETE",
      });

      setNotice(result.message || "Activity deleted.");

      if (editingId === item._id) {
        resetForm();
      }

      await load();
    } catch (err) {
      setError(err.message || "Could not delete activity.");
    }
  }

  async function togglePublished(item) {
    setError("");
    setNotice("");

    try {
      await apiRequest(`/activities/${item._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          published: !item.published,
        }),
      });

      setNotice(
        item.published
          ? "Activity saved as a draft."
          : "Activity published."
      );

      await load();
    } catch (err) {
      setError(err.message || "Could not update publishing status.");
    }
  }

  const mediaAccept =
    form.postType === "image"
      ? "image/*"
      : form.postType === "video"
        ? "video/*"
        : "";

  return (
    <main className="abs-feature-page abs-admin-feature-page">
      <section className="abs-feature-hero abs-admin-hero">
        <span className="abs-feature-eyebrow">ADMIN STUDIO</span>
        <h1>
          Daily <em>Activities</em>
        </h1>
        <p>
          Share studio updates, finished work, and moments from the
          ABS CUT journey.
        </p>
      </section>

      <section className="abs-feature-content abs-admin-content">
        {notice && (
          <div className="abs-feature-alert is-success" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="abs-feature-alert is-error" role="alert">
            {error}
          </div>
        )}

        <section className="abs-admin-panel">
          <div className="abs-admin-panel-heading">
            <div>
              <span className="abs-feature-eyebrow">
                CONTENT MANAGER
              </span>
              <h2>
                {editingId ? "Edit activity" : "Create an activity"}
              </h2>
              <p>
                Choose a post format, then add your title, header,
                content, and media where required.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                className="abs-feature-button abs-feature-button-quiet"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={submit} className="abs-feature-form">
            <div className="abs-feature-field">
              <strong>Choose post type</strong>

              <div className="abs-activity-type-selector">
                {["text", "image", "video"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={
                      form.postType === type
                        ? "abs-activity-type is-active"
                        : "abs-activity-type"
                    }
                    onClick={() => changePostType(type)}
                  >
                    {type === "text"
                      ? "Text post"
                      : type === "image"
                        ? "Image post"
                        : "Video post"}
                  </button>
                ))}
              </div>
            </div>

            <label className="abs-feature-field">
              Post title
              <input
                type="text"
                maxLength={200}
                placeholder="e.g. Our latest Agbada collection"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                required
              />
            </label>

            <label className="abs-feature-field">
              Post header
              <input
                type="text"
                maxLength={300}
                placeholder="Add a short headline for this update"
                value={form.header}
                onChange={(e) =>
                  setForm({ ...form, header: e.target.value })
                }
                required
              />
            </label>

            <label className="abs-feature-field">
              Post content
              <textarea
                rows="5"
                maxLength={3000}
                placeholder="Tell customers what is happening at ABS CUT..."
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
                required
              />
              <small>{form.content.length}/3000 characters</small>
            </label>

            {form.postType !== "text" && (
              <label className="abs-feature-field">
                {form.postType === "image"
                  ? "Upload image"
                  : "Upload video"}

                <input
                  ref={fileRef}
                  type="file"
                  accept={mediaAccept}
                  onChange={handleFileChange}
                />

                <small>
                  {form.postType === "image"
                    ? "Choose an image file. Maximum upload size: 50 MB."
                    : "Choose a video file. Maximum upload size: 50 MB; video duration must not exceed 60 seconds."}
                  {" "}Leave empty to keep the current media when editing.
                </small>
              </label>
            )}

            {file && (
              <div className="abs-admin-file-preview">
                <span>
                  {form.postType === "video" ? "VIDEO" : "IMAGE"}
                </span>
                <strong>{file.name}</strong>
                <small>
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </small>
              </div>
            )}

            {!file && form.mediaUrl && (
              <div className="abs-admin-current-media">
                {form.mediaType === "video" ? (
                  <video
                    src={form.mediaUrl}
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={form.mediaUrl}
                    alt="Current activity media"
                  />
                )}
                <span>Current media</span>
              </div>
            )}

            <label className="abs-feature-check">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) =>
                  setForm({
                    ...form,
                    published: e.target.checked,
                  })
                }
              />
              <span>
                <strong>Publish immediately</strong>
                <small>
                  Unpublished activities are visible only in this
                  admin manager.
                </small>
              </span>
            </label>

            <button
              className="abs-feature-button"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving activity..."
                : editingId
                  ? "Save changes"
                  : "Create activity"}
            </button>
          </form>
        </section>

        <section className="abs-admin-list-section">
          <div className="abs-material-toolbar">
            <div>
              <h2>All activities</h2>
              <p>
                {activities.length} item
                {activities.length === 1 ? "" : "s"} including drafts
              </p>
            </div>

            <button
              className="abs-feature-button abs-feature-button-secondary"
              type="button"
              onClick={load}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="abs-feature-state">
              Loading activities...
            </div>
          ) : activities.length === 0 ? (
            <div className="abs-feature-empty">
              <h2>No activities yet</h2>
              <p>
                Create your first studio update using the form above.
              </p>
            </div>
          ) : (
            <div className="abs-admin-activity-list">
              {activities.map((item) => {
                const postType =
                  item.postType ||
                  (item.mediaType === "video"
                    ? "video"
                    : item.mediaUrl
                      ? "image"
                      : "text");

                return (
                  <article
                    className="abs-admin-activity-row"
                    key={item._id}
                  >
                    <div className="abs-admin-activity-thumb">
                      {item.mediaUrl && postType === "video" ? (
                        <video
                          src={item.mediaUrl}
                          muted
                          preload="metadata"
                        />
                      ) : item.mediaUrl ? (
                        <img
                          src={item.mediaUrl}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span>AC</span>
                      )}
                    </div>

                    <div className="abs-admin-activity-info">
                      <div className="abs-admin-status-line">
                        <span
                          className={`abs-feature-status ${
                            item.published ? "is-live" : "is-draft"
                          }`}
                        >
                          {item.published ? "Published" : "Draft"}
                        </span>

                        <span>{postType.toUpperCase()} POST</span>

                        <time>{dateLabel(item.createdAt)}</time>
                      </div>

                      <h3>{item.title || "Untitled activity"}</h3>
                      <strong>{item.header}</strong>
                      <p>
                        {item.content ||
                          item.caption ||
                          "No content"}
                      </p>
                    </div>

                    <div className="abs-admin-row-actions">
                      <button
                        type="button"
                        onClick={() => togglePublished(item)}
                      >
                        {item.published ? "Unpublish" : "Publish"}
                      </button>

                      <button
                        type="button"
                        onClick={() => editActivity(item)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => remove(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
