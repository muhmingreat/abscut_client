import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, uploadRequestWithProgress } from "../../services/api";
import AdminSidebar from "../../components/AdminSidebar";
import "./AdminAcademyCourses.css";

// =====================================================
// CONSTANTS
// =====================================================

const CATEGORIES = [
  "Trouser",
  "Shirt",
  "Agbada",
  "Senator",
  "Caftan",
  "Native Wear",
  "Pattern Making",
  "Embroidery",
  "Fashion Design",
  "Other",
];

const LEVELS = ["beginner", "intermediate", "advanced", "all-levels"];

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const blankLesson = () => ({
  title: "",
  description: "",
  lessonType: "video",
  videoUrl: "",
  durationSeconds: 0,
  content: "",
  resources: [],
  isPreview: false,
  order: 1,
});

const blankModule = (order = 1) => ({
  title: "",
  description: "",
  lessons: [blankLesson()],
  order,
});

const initialForm = () => ({
  title: "",
  shortDescription: "",
  description: "",
  category: "Trouser",
  level: "beginner",
  language: "English",
  thumbnail: "",
  instructorName: "ABS CUT",
  instructorBio: "",
  price: "",
  isFree: false,
  modules: [blankModule()],
  requirementsText: "",
  outcomesText: "",
  estimatedDurationHours: 0,
  certificateEnabled: true,
  accessDurationDays: "",
});

const splitLines = (value) =>
  String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const getExtension = (filename) => {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
};

// =====================================================
// MAIN COMPONENT
// =====================================================

function AdminAcademyCourses() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Each lesson has its own video upload state.
  const [videoUploads, setVideoUploads] = useState({});

  // Course thumbnail image upload state.
  const [imageUpload, setImageUpload] = useState({
    uploading: false,
    progress: 0,
    error: "",
    success: false,
  });

  const hasActiveVideoUploads = Object.values(videoUploads).some(
    (upload) => upload.uploading,
  );

  const hasActiveUploads = hasActiveVideoUploads || imageUpload.uploading;

  // =====================================================
  // LOAD COURSES
  // =====================================================

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/academy/admin/courses");

      if (!data.success) {
        throw new Error(data.message || "Unable to load courses.");
      }

      setCourses(data.courses || []);
    } catch (err) {
      setError(err.message || "Unable to load Academy courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // =====================================================
  // FORM UPDATES
  // =====================================================

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateModule = (moduleIndex, field, value) => {
    setForm((previous) => ({
      ...previous,
      modules: previous.modules.map((module, index) =>
        index === moduleIndex ? { ...module, [field]: value } : module,
      ),
    }));
  };

  const updateLesson = (moduleIndex, lessonIndex, field, value) => {
    setForm((previous) => ({
      ...previous,
      modules: previous.modules.map((module, mIndex) => {
        if (mIndex !== moduleIndex) return module;

        return {
          ...module,
          lessons: module.lessons.map((lesson, lIndex) =>
            lIndex === lessonIndex ? { ...lesson, [field]: value } : lesson,
          ),
        };
      }),
    }));
  };

  // =====================================================
  // COURSE THUMBNAIL IMAGE UPLOAD
  // =====================================================

  const handleUploadCourseImage = async (file) => {
    if (!file) return;

    const extension = getExtension(file.name);

    const validType =
      ALLOWED_IMAGE_TYPES.includes(file.type) ||
      ALLOWED_IMAGE_EXTENSIONS.includes(extension);

    if (!validType) {
      setImageUpload({
        uploading: false,
        progress: 0,
        error: "Only JPG, JPEG, PNG and WebP images are allowed.",
        success: false,
      });
      return;
    }

    if (file.size === 0) {
      setImageUpload({
        uploading: false,
        progress: 0,
        error: "The selected image file is empty.",
        success: false,
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageUpload({
        uploading: false,
        progress: 0,
        error: "Image size must not exceed 10 MB.",
        success: false,
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setError("");
    setSuccess("");

    setImageUpload({
      uploading: true,
      progress: 0,
      error: "",
      success: false,
    });

    try {
      const response = await uploadRequestWithProgress(
        "/academy/admin/courses/upload-image",
        formData,
        (progress) => {
          setImageUpload((previous) => ({
            ...previous,
            uploading: true,
            progress,
            error: "",
          }));
        },
      );

      if (!response?.success || !response?.imageUrl) {
        throw new Error(
          response?.message ||
            "Image upload completed without returning an image URL.",
        );
      }

      // Automatically assign the Cloudinary URL to the course.
      updateField("thumbnail", response.imageUrl);

      setImageUpload({
        uploading: false,
        progress: 100,
        error: "",
        success: true,
      });

      setSuccess("Course thumbnail uploaded successfully.");
    } catch (err) {
      setImageUpload({
        uploading: false,
        progress: 0,
        error: err.message || "Course image upload failed.",
        success: false,
      });
    }
  };

  // =====================================================
  // LESSON VIDEO UPLOAD
  // =====================================================

  const handleUploadLessonVideo = async (moduleIndex, lessonIndex, file) => {
    if (!file) return;

    const uploadKey = `${moduleIndex}-${lessonIndex}`;
    const extension = getExtension(file.name);

    const validType =
      ALLOWED_VIDEO_TYPES.includes(file.type) ||
      ALLOWED_VIDEO_EXTENSIONS.includes(extension);

    if (!validType) {
      setVideoUploads((previous) => ({
        ...previous,
        [uploadKey]: {
          uploading: false,
          progress: 0,
          error: "Only MP4, MOV and WebM videos are allowed.",
        },
      }));
      return;
    }

    if (file.size === 0) {
      setVideoUploads((previous) => ({
        ...previous,
        [uploadKey]: {
          uploading: false,
          progress: 0,
          error: "The selected video file is empty.",
        },
      }));
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setVideoUploads((previous) => ({
        ...previous,
        [uploadKey]: {
          uploading: false,
          progress: 0,
          error: "Video size must not exceed 50 MB.",
        },
      }));
      return;
    }

    const formData = new FormData();
    formData.append("video", file);

    setError("");
    setSuccess("");

    setVideoUploads((previous) => ({
      ...previous,
      [uploadKey]: {
        uploading: true,
        progress: 0,
        error: "",
      },
    }));

    try {
      const response = await uploadRequestWithProgress(
        "/academy/admin/lessons/upload-video",
        formData,
        (progress) => {
          setVideoUploads((previous) => ({
            ...previous,
            [uploadKey]: {
              ...previous[uploadKey],
              uploading: true,
              progress,
              error: "",
            },
          }));
        },
      );

      if (!response?.success || !response?.videoUrl) {
        throw new Error(
          response?.message ||
            "Video upload completed without returning a video URL.",
        );
      }

      // Automatically assign the Cloudinary URL to the lesson.
      updateLesson(moduleIndex, lessonIndex, "videoUrl", response.videoUrl);

      if (response.duration) {
        updateLesson(
          moduleIndex,
          lessonIndex,
          "durationSeconds",
          Math.round(response.duration),
        );
      }

      setVideoUploads((previous) => ({
        ...previous,
        [uploadKey]: {
          uploading: false,
          progress: 100,
          error: "",
        },
      }));
    } catch (err) {
      setVideoUploads((previous) => ({
        ...previous,
        [uploadKey]: {
          uploading: false,
          progress: 0,
          error: err.message || "Video upload failed.",
        },
      }));
    }
  };

  // =====================================================
  // MODULE MANAGEMENT
  // =====================================================

  const addModule = () => {
    setForm((previous) => ({
      ...previous,
      modules: [...previous.modules, blankModule(previous.modules.length + 1)],
    }));
  };

  const removeModule = (moduleIndex) => {
    setForm((previous) => ({
      ...previous,
      modules: previous.modules
        .filter((_, index) => index !== moduleIndex)
        .map((module, index) => ({
          ...module,
          order: index + 1,
        })),
    }));
  };

  // =====================================================
  // LESSON MANAGEMENT
  // =====================================================

  const addLesson = (moduleIndex) => {
    setForm((previous) => ({
      ...previous,
      modules: previous.modules.map((module, index) =>
        index === moduleIndex
          ? {
              ...module,
              lessons: [
                ...module.lessons,
                {
                  ...blankLesson(),
                  order: module.lessons.length + 1,
                },
              ],
            }
          : module,
      ),
    }));
  };

  const removeLesson = (moduleIndex, lessonIndex) => {
    setForm((previous) => ({
      ...previous,
      modules: previous.modules.map((module, mIndex) =>
        mIndex === moduleIndex
          ? {
              ...module,
              lessons: module.lessons
                .filter((_, lIndex) => lIndex !== lessonIndex)
                .map((lesson, index) => ({
                  ...lesson,
                  order: index + 1,
                })),
            }
          : module,
      ),
    }));
  };

  // =====================================================
  // LESSON RESOURCE MANAGEMENT
  // =====================================================

  const addResource = (moduleIndex, lessonIndex) => {
    const lesson = form.modules[moduleIndex].lessons[lessonIndex];

    updateLesson(moduleIndex, lessonIndex, "resources", [
      ...(lesson.resources || []),
      {
        title: "",
        url: "",
        type: "other",
      },
    ]);
  };

  const updateResource = (
    moduleIndex,
    lessonIndex,
    resourceIndex,
    field,
    value,
  ) => {
    const lesson = form.modules[moduleIndex].lessons[lessonIndex];

    const resources = (lesson.resources || []).map((resource, index) =>
      index === resourceIndex ? { ...resource, [field]: value } : resource,
    );

    updateLesson(moduleIndex, lessonIndex, "resources", resources);
  };

  const removeResource = (moduleIndex, lessonIndex, resourceIndex) => {
    const lesson = form.modules[moduleIndex].lessons[lessonIndex];

    updateLesson(
      moduleIndex,
      lessonIndex,
      "resources",
      (lesson.resources || []).filter((_, index) => index !== resourceIndex),
    );
  };

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    if (hasActiveUploads) {
      setError("Please wait for all uploads to finish before resetting.");
      return;
    }

    setForm(initialForm());
    setEditingId(null);
    setVideoUploads({});

    setImageUpload({
      uploading: false,
      progress: 0,
      error: "",
      success: false,
    });

    setError("");
    setSuccess("");
  };

  // =====================================================
  // EDIT EXISTING COURSE
  // =====================================================

  const editCourse = (course) => {
    if (hasActiveUploads) {
      setError(
        "Please wait for all uploads to finish before editing another course.",
      );
      return;
    }

    setError("");
    setSuccess("");
    setVideoUploads({});

    setImageUpload({
      uploading: false,
      progress: 0,
      error: "",
      success: false,
    });

    setEditingId(course._id);

    setForm({
      title: course.title || "",
      shortDescription: course.shortDescription || "",
      description: course.description || "",
      category: course.category || "Trouser",
      level: course.level || "beginner",
      language: course.language || "English",
      thumbnail: course.thumbnail || "",
      instructorName: course.instructorName || "ABS CUT",
      instructorBio: course.instructorBio || "",
      price: course.price ?? "",
      isFree: Boolean(course.isFree),

      modules: (course.modules || []).map((module, mIndex) => ({
        _id: module._id,
        title: module.title || "",
        description: module.description || "",
        order: module.order || mIndex + 1,

        lessons: (module.lessons || []).map((lesson, lIndex) => ({
          _id: lesson._id,
          title: lesson.title || "",
          description: lesson.description || "",
          lessonType: lesson.lessonType || "video",
          videoUrl: lesson.videoUrl || "",
          durationSeconds: lesson.durationSeconds || 0,
          content: lesson.content || "",

          resources: (lesson.resources || []).map((resource) => ({
            _id: resource._id,
            title: resource.title || "",
            url: resource.url || "",
            type: resource.type || "other",
          })),

          isPreview: Boolean(lesson.isPreview),
          order: lesson.order || lIndex + 1,
        })),
      })),

      requirementsText: (course.requirements || []).join("\n"),
      outcomesText: (course.learningOutcomes || []).join("\n"),
      estimatedDurationHours: course.estimatedDurationHours || 0,
      certificateEnabled: course.certificateEnabled !== false,
      accessDurationDays: course.accessDurationDays ?? "",
    });

    document.getElementById("academy-course-editor")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // =====================================================
  // SAVE COURSE
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (hasActiveUploads) {
      setError(
        "Please wait for all image and video uploads to finish before saving.",
      );
      return;
    }

    if (!form.title.trim()) {
      setError("Enter a course title.");
      return;
    }

    if (!form.shortDescription.trim()) {
      setError("Enter a short course description.");
      return;
    }

    if (!form.description.trim()) {
      setError("Enter the full course description.");
      return;
    }

    if (!form.category) {
      setError("Select a course category.");
      return;
    }

    const cleanedModules = form.modules.map((module, mIndex) => ({
      ...module,
      order: mIndex + 1,

      lessons: module.lessons.map((lesson, lIndex) => ({
        ...lesson,
        order: lIndex + 1,
        durationSeconds: Number(lesson.durationSeconds) || 0,

        resources: (lesson.resources || []).filter(
          (resource) => resource.title.trim() && resource.url.trim(),
        ),
      })),
    }));

    const payload = {
      title: form.title.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      category: form.category,
      level: form.level,
      language: form.language.trim() || "English",
      thumbnail: form.thumbnail.trim(),
      instructorName: form.instructorName.trim() || "ABS CUT",
      instructorBio: form.instructorBio.trim(),
      price: form.isFree ? 0 : Number(form.price),
      isFree: form.isFree,
      modules: cleanedModules,
      requirements: splitLines(form.requirementsText),
      learningOutcomes: splitLines(form.outcomesText),
      estimatedDurationHours: Number(form.estimatedDurationHours) || 0,
      certificateEnabled: form.certificateEnabled,
      accessDurationDays: form.accessDurationDays
        ? Number(form.accessDurationDays)
        : null,
    };

    if (
      !payload.isFree &&
      (!Number.isFinite(payload.price) || payload.price <= 0)
    ) {
      setError("Enter a valid price for this paid course.");
      return;
    }

    try {
      setSaving(true);

      const endpoint = editingId
        ? `/academy/admin/courses/${editingId}`
        : "/academy/admin/courses";

      const data = await apiRequest(endpoint, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (!data.success) {
        throw new Error(data.message || "Unable to save course.");
      }

      setSuccess(
        editingId
          ? "Course changes saved successfully."
          : "Course created successfully as a draft.",
      );

      setForm(initialForm());
      setEditingId(null);
      setVideoUploads({});

      setImageUpload({
        uploading: false,
        progress: 0,
        error: "",
        success: false,
      });

      await loadCourses();
    } catch (err) {
      setError(err.message || "Unable to save course.");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // PUBLISH COURSE
  // =====================================================

  const publishCourse = async (course) => {
    const confirmed = window.confirm(
      `Publish "${course.title}"? Students will be able to see it in the Academy catalogue.`,
    );

    if (!confirmed) return;

    try {
      setActionId(course._id);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/academy/admin/courses/${course._id}/publish`,
        { method: "PATCH" },
      );

      if (!data.success) {
        throw new Error(data.message || "Unable to publish course.");
      }

      setSuccess("Course published successfully.");
      await loadCourses();
    } catch (err) {
      setError(err.message || "Unable to publish course.");
    } finally {
      setActionId("");
    }
  };

  // =====================================================
  // ARCHIVE COURSE
  // =====================================================

  const archiveCourse = async (course) => {
    const confirmed = window.confirm(
      `Archive "${course.title}"? It will no longer appear in the public catalogue.`,
    );

    if (!confirmed) return;

    try {
      setActionId(course._id);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/academy/admin/courses/${course._id}/archive`,
        { method: "PATCH" },
      );

      if (!data.success) {
        throw new Error(data.message || "Unable to archive course.");
      }

      setSuccess("Course archived successfully.");
      await loadCourses();
    } catch (err) {
      setError(err.message || "Unable to archive course.");
    } finally {
      setActionId("");
    }
  };

  // =====================================================
  // COURSE HELPERS
  // =====================================================

  const totalLessons = (course) =>
    (course.modules || []).reduce(
      (total, module) => total + (module.lessons || []).length,
      0,
    );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="admin-academy-page">
      <div className="admin-academy-shell">
        {/* PAGE HEADER */}

        <header className="admin-academy-header">
          <div>
            <span className="admin-academy-eyebrow">
              ABS CUT FASHION ACADEMY
            </span>

            <h1>Course Management</h1>

            <p>
              Create courses, organize lessons and manage what students can
              access.
            </p>
          </div>

          <Link to="/admin" className="admin-academy-back">
            ← Admin Dashboard
          </Link>
        </header>

        {/* ALERTS */}

        {error && (
          <div className="academy-alert academy-alert-error">
            {error}

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="academy-alert academy-alert-success">
            {success}

            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        {/* COURSE STATISTICS */}
        <section className="academy-admin-stats">
          <article>
            <span>Total Courses</span>
            <strong>{courses.length}</strong>
          </article>

          <article>
            <span>Published</span>
            <strong>
              {courses.filter((course) => course.status === "published").length}
            </strong>
          </article>

          <article>
            <span>Drafts</span>
            <strong>
              {courses.filter((course) => course.status === "draft").length}
            </strong>
          </article>

          <article>
            <span>Archived</span>
            <strong>
              {courses.filter((course) => course.status === "archived").length}
            </strong>
          </article>
        </section>

        <section className="academy-admin-layout">
          {/* COURSE LIST */}

          <section className="academy-course-list-panel">
            <div className="academy-panel-heading">
              <div>
                <span>YOUR ACADEMY</span>
                <h2>All Courses</h2>
              </div>

              <button
                type="button"
                className="academy-primary-button"
                disabled={hasActiveUploads}
                onClick={() => {
                  resetForm();

                  document
                    .getElementById("academy-course-editor")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
              >
                + New Course
              </button>
            </div>

            {loading ? (
              <div className="academy-empty-state">Loading courses...</div>
            ) : courses.length === 0 ? (
              <div className="academy-empty-state">
                <span className="academy-empty-icon">✦</span>
                <h3>No courses created yet</h3>
                <p>Create your first course using the form.</p>
              </div>
            ) : (
              <div className="academy-admin-course-grid">
                {courses.map((course) => (
                  <article
                    className="academy-admin-course-card"
                    key={course._id}
                  >
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="academy-admin-course-image"
                      />
                    ) : (
                      <div className="academy-admin-course-placeholder">
                        ABS CUT ACADEMY
                      </div>
                    )}

                    <div className="academy-admin-course-body">
                      <div className="academy-course-card-topline">
                        <span className={`academy-status ${course.status}`}>
                          {course.status}
                        </span>

                        <span>{course.category}</span>
                      </div>

                      <h3>{course.title}</h3>
                      <p>{course.shortDescription}</p>

                      <div className="academy-course-meta">
                        <span>{totalLessons(course)} lessons</span>

                        <strong>
                          {course.isFree
                            ? "FREE"
                            : `₦${Number(course.price || 0).toLocaleString(
                                "en-NG",
                              )}`}
                        </strong>
                      </div>

                      <div className="academy-course-actions">
                        <button
                          type="button"
                          className="academy-secondary-button"
                          disabled={hasActiveUploads}
                          onClick={() => editCourse(course)}
                        >
                          Edit
                        </button>

                        {course.status !== "published" && (
                          <button
                            type="button"
                            className="academy-publish-button"
                            disabled={actionId === course._id}
                            onClick={() => publishCourse(course)}
                          >
                            {actionId === course._id
                              ? "Please wait..."
                              : "Publish"}
                          </button>
                        )}

                        {course.status !== "archived" && (
                          <button
                            type="button"
                            className="academy-archive-button"
                            disabled={actionId === course._id}
                            onClick={() => archiveCourse(course)}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* COURSE EDITOR */}

          <section className="academy-course-editor" id="academy-course-editor">
            <div className="academy-panel-heading">
              <div>
                <span>COURSE BUILDER</span>

                <h2>{editingId ? "Edit Course" : "Create a Course"}</h2>
              </div>

              {editingId && (
                <button
                  type="button"
                  className="academy-cancel-edit"
                  disabled={hasActiveUploads}
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              {/* COURSE INFORMATION */}

              <div className="academy-form-section">
                <h3>Course Information</h3>

                <label>
                  Course Title *
                  <input
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="e.g. Complete Trouser Making Masterclass"
                    maxLength={160}
                    required
                  />
                </label>

                <label>
                  Short Description *
                  <textarea
                    value={form.shortDescription}
                    onChange={(e) =>
                      updateField("shortDescription", e.target.value)
                    }
                    placeholder="A brief introduction to this course..."
                    maxLength={300}
                    rows={3}
                    required
                  />
                </label>

                <label>
                  Full Course Description *
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Explain what the course covers..."
                    rows={6}
                    required
                  />
                </label>

                <div className="academy-form-grid">
                  <label>
                    Category *
                    <select
                      value={form.category}
                      onChange={(e) => updateField("category", e.target.value)}
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Level
                    <select
                      value={form.level}
                      onChange={(e) => updateField("level", e.target.value)}
                    >
                      {LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level.replace("-", " ")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Language
                    <input
                      value={form.language}
                      onChange={(e) => updateField("language", e.target.value)}
                    />
                  </label>

                  <label>
                    Estimated Duration (hours)
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.estimatedDurationHours}
                      onChange={(e) =>
                        updateField("estimatedDurationHours", e.target.value)
                      }
                    />
                  </label>
                </div>

                {/* COURSE THUMBNAIL UPLOAD */}

                <div className="academy-image-upload">
                  <div className="academy-upload-heading">
                    <div>
                      <h4>Course Cover Image</h4>
                      <p>
                        Upload the image students will see in the Academy
                        catalogue.
                      </p>
                    </div>
                    <span className="academy-upload-icon">▧</span>
                  </div>

                  <label className="academy-image-upload-label">
                    <span>
                      <strong>Choose Course Image</strong>
                      <small>JPG, JPEG, PNG or WebP · Maximum 10 MB</small>
                    </span>

                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      disabled={imageUpload.uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        handleUploadCourseImage(file);

                        e.target.value = "";
                      }}
                    />
                  </label>

                  {/* IMAGE PROGRESS */}

                  {imageUpload.uploading && (
                    <div
                      className="academy-video-progress"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="academy-video-progress-info">
                        <span>Uploading course image...</span>

                        <strong>{imageUpload.progress}%</strong>
                      </div>

                      <div
                        className="academy-video-progress-track"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={imageUpload.progress}
                      >
                        <div
                          className="academy-video-progress-fill"
                          style={{
                            width: `${imageUpload.progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {imageUpload.error && (
                    <p className="academy-video-upload-error" role="alert">
                      {imageUpload.error}
                    </p>
                  )}

                  {imageUpload.success && (
                    <p className="academy-video-upload-success">
                      Course image uploaded successfully.
                    </p>
                  )}

                  {/* IMAGE PREVIEW */}

                  {form.thumbnail && (
                    <div className="academy-image-preview">
                      <div className="academy-image-preview-heading">
                        <strong>Course Image Preview</strong>

                        <button
                          type="button"
                          onClick={() => {
                            updateField("thumbnail", "");
                            setImageUpload({
                              uploading: false,
                              progress: 0,
                              error: "",
                              success: false,
                            });
                          }}
                          disabled={imageUpload.uploading}
                        >
                          Remove Image
                        </button>
                      </div>

                      <img
                        src={form.thumbnail}
                        alt="Course thumbnail preview"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* MANUAL IMAGE URL */}

                  <label>
                    Or enter an existing Image URL
                    <input
                      type="url"
                      value={form.thumbnail}
                      onChange={(e) => {
                        updateField("thumbnail", e.target.value);

                        setImageUpload((previous) => ({
                          ...previous,
                          success: false,
                          error: "",
                        }));
                      }}
                      placeholder="https://..."
                    />
                  </label>
                </div>
              </div>

              {/* INSTRUCTOR INFORMATION */}

              <div className="academy-form-section">
                <h3>Instructor Information</h3>

                <label>
                  Instructor Name
                  <input
                    value={form.instructorName}
                    onChange={(e) =>
                      updateField("instructorName", e.target.value)
                    }
                  />
                </label>

                <label>
                  Instructor Biography
                  <textarea
                    rows={3}
                    value={form.instructorBio}
                    onChange={(e) =>
                      updateField("instructorBio", e.target.value)
                    }
                    placeholder="Tell students about the instructor..."
                  />
                </label>
              </div>

              {/* COURSE PRICING */}

              <div className="academy-form-section">
                <h3>Course Pricing</h3>

                <label className="academy-toggle-row">
                  <input
                    type="checkbox"
                    checked={form.isFree}
                    onChange={(e) => updateField("isFree", e.target.checked)}
                  />
                  This is a free course
                </label>

                {!form.isFree && (
                  <label>
                    Course Price (NGN) *
                    <input
                      type="number"
                      min="1"
                      value={form.price}
                      onChange={(e) => updateField("price", e.target.value)}
                      placeholder="e.g. 50000"
                      required
                    />
                  </label>
                )}

                <label>
                  Access Duration (days, optional)
                  <input
                    type="number"
                    min="1"
                    value={form.accessDurationDays}
                    onChange={(e) =>
                      updateField("accessDurationDays", e.target.value)
                    }
                    placeholder="Leave blank for no expiry"
                  />
                </label>

                <label className="academy-toggle-row">
                  <input
                    type="checkbox"
                    checked={form.certificateEnabled}
                    onChange={(e) =>
                      updateField("certificateEnabled", e.target.checked)
                    }
                  />
                  Enable course certificate
                </label>
              </div>

              {/* REQUIREMENTS */}

              <div className="academy-form-section">
                <h3>Requirements</h3>

                <p className="academy-form-hint">
                  Enter one requirement per line.
                </p>

                <textarea
                  rows={4}
                  value={form.requirementsText}
                  onChange={(e) =>
                    updateField("requirementsText", e.target.value)
                  }
                  placeholder={"Basic sewing knowledge\nA sewing machine"}
                />
              </div>

              {/* LEARNING OUTCOMES */}

              <div className="academy-form-section">
                <h3>Learning Outcomes</h3>

                <p className="academy-form-hint">
                  Enter one learning outcome per line.
                </p>

                <textarea
                  rows={4}
                  value={form.outcomesText}
                  onChange={(e) => updateField("outcomesText", e.target.value)}
                  placeholder={
                    "Understand pattern drafting\nComplete a finished garment"
                  }
                />
              </div>

              {/* COURSE CURRICULUM */}

              <div className="academy-form-section">
                <div className="academy-module-heading">
                  <div>
                    <h3>Course Curriculum</h3>

                    <p className="academy-form-hint">
                      Organize your course into modules and lessons.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="academy-secondary-button"
                    onClick={addModule}
                    disabled={hasActiveUploads}
                  >
                    + Add Module
                  </button>
                </div>

                {form.modules.map((module, moduleIndex) => (
                  <article
                    className="academy-module-editor"
                    key={module._id || `module-${moduleIndex}`}
                  >
                    <div className="academy-module-title">
                      <strong>MODULE {moduleIndex + 1}</strong>

                      {form.modules.length > 1 && (
                        <button
                          type="button"
                          className="academy-remove-button"
                          disabled={hasActiveUploads}
                          onClick={() => removeModule(moduleIndex)}
                        >
                          Remove Module
                        </button>
                      )}
                    </div>

                    <label>
                      Module Title *
                      <input
                        value={module.title}
                        onChange={(e) =>
                          updateModule(moduleIndex, "title", e.target.value)
                        }
                        placeholder="e.g. Introduction to Trouser Making"
                      />
                    </label>

                    <label>
                      Module Description
                      <textarea
                        rows={2}
                        value={module.description}
                        onChange={(e) =>
                          updateModule(
                            moduleIndex,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="What students will learn in this module..."
                      />
                    </label>

                    {/* LESSONS */}

                    {module.lessons.map((lesson, lessonIndex) => {
                      const uploadKey = `${moduleIndex}-${lessonIndex}`;
                      const upload = videoUploads[uploadKey] || {};

                      return (
                        <div
                          className="academy-lesson-editor"
                          key={lesson._id || `lesson-${lessonIndex}`}
                        >
                          <div className="academy-lesson-heading">
                            <strong>Lesson {lessonIndex + 1}</strong>

                            {module.lessons.length > 1 && (
                              <button
                                type="button"
                                className="academy-remove-button"
                                disabled={hasActiveUploads}
                                onClick={() =>
                                  removeLesson(moduleIndex, lessonIndex)
                                }
                              >
                                Remove Lesson
                              </button>
                            )}
                          </div>

                          <label>
                            Lesson Title *
                            <input
                              value={lesson.title}
                              onChange={(e) =>
                                updateLesson(
                                  moduleIndex,
                                  lessonIndex,
                                  "title",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter lesson title"
                            />
                          </label>

                          <label>
                            Lesson Description
                            <textarea
                              rows={2}
                              value={lesson.description}
                              onChange={(e) =>
                                updateLesson(
                                  moduleIndex,
                                  lessonIndex,
                                  "description",
                                  e.target.value,
                                )
                              }
                            />
                          </label>

                          <div className="academy-form-grid">
                            <label>
                              Lesson Type
                              <select
                                value={lesson.lessonType}
                                disabled={upload.uploading}
                                onChange={(e) =>
                                  updateLesson(
                                    moduleIndex,
                                    lessonIndex,
                                    "lessonType",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="video">Video</option>
                                <option value="article">Article</option>
                                <option value="live">Live Classroom</option>
                              </select>
                            </label>

                            <label>
                              Duration (seconds)
                              <input
                                type="number"
                                min="0"
                                value={lesson.durationSeconds}
                                onChange={(e) =>
                                  updateLesson(
                                    moduleIndex,
                                    lessonIndex,
                                    "durationSeconds",
                                    e.target.value,
                                  )
                                }
                              />
                            </label>
                          </div>

                          {/* LESSON VIDEO UPLOAD */}

                          {lesson.lessonType === "video" ? (
                            <div className="academy-video-upload">
                              <label className="academy-video-upload-label">
                                Upload Lesson Video
                                <input
                                  type="file"
                                  accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                                  disabled={upload.uploading}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];

                                    handleUploadLessonVideo(
                                      moduleIndex,
                                      lessonIndex,
                                      file,
                                    );

                                    e.target.value = "";
                                  }}
                                />
                              </label>

                              <p className="academy-video-upload-hint">
                                Supported formats: MP4, MOV and WebM. Maximum
                                file size: 50 MB.
                              </p>

                              {upload.uploading && (
                                <div
                                  className="academy-video-progress"
                                  role="status"
                                  aria-live="polite"
                                >
                                  <div className="academy-video-progress-info">
                                    <span>Uploading video...</span>

                                    <strong>{upload.progress || 0}%</strong>
                                  </div>

                                  <div
                                    className="academy-video-progress-track"
                                    role="progressbar"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={upload.progress || 0}
                                  >
                                    <div
                                      className="academy-video-progress-fill"
                                      style={{
                                        width: `${upload.progress || 0}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              {upload.error && (
                                <p
                                  className="academy-video-upload-error"
                                  role="alert"
                                >
                                  {upload.error}
                                </p>
                              )}

                              {!upload.uploading &&
                                upload.progress === 100 &&
                                lesson.videoUrl && (
                                  <p className="academy-video-upload-success">
                                    Video uploaded successfully.
                                  </p>
                                )}

                              <label>
                                Or enter an existing Video URL
                                <input
                                  type="url"
                                  value={lesson.videoUrl}
                                  onChange={(e) =>
                                    updateLesson(
                                      moduleIndex,
                                      lessonIndex,
                                      "videoUrl",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="https://..."
                                />
                              </label>

                              {lesson.videoUrl && (
                                <div className="academy-video-preview">
                                  <p>Video Preview</p>

                                  <video
                                    src={lesson.videoUrl}
                                    controls
                                    preload="metadata"
                                  >
                                    Your browser does not support video
                                    playback.
                                  </video>
                                </div>
                              )}
                            </div>
                          ) :  lesson.lessonType === "article" ? (
                            <label>
                              Article Content
                              <textarea
                                rows={7}
                                value={lesson.content}
                                onChange={(e) =>
                                  updateLesson(
                                    moduleIndex,
                                    lessonIndex,
                                    "content",
                                    e.target.value,
                                  )
                                }
                                placeholder="Write the lesson content here..."
                              />
                            </label>
                          ) : (
                            <div className="academy-live-lesson-notice">
                              <strong>ABS CUT LIVE CLASSROOM</strong>
                              <p>
                                This lesson will host an interactive live
                                classroom. You will schedule the class, assign
                                an instructor and manage student admission from
                                Live Class Management.
                              </p>
                              <span>
                                Live class scheduling will be managed
                                separately.
                              </span>
                            </div>
                          )}

                          {/* FREE PREVIEW */}

                          <label className="academy-toggle-row">
                            <input
                              type="checkbox"
                              checked={lesson.isPreview}
                              onChange={(e) =>
                                updateLesson(
                                  moduleIndex,
                                  lessonIndex,
                                  "isPreview",
                                  e.target.checked,
                                )
                              }
                            />
                            Make this lesson available as a free preview
                          </label>

                          {/* LESSON RESOURCES */}

                          <div className="academy-resources">
                            <div className="academy-resource-heading">
                              <strong>Lesson Resources</strong>

                              <button
                                type="button"
                                className="academy-text-button"
                                onClick={() =>
                                  addResource(moduleIndex, lessonIndex)
                                }
                              >
                                + Add Resource
                              </button>
                            </div>

                            {(lesson.resources || []).map(
                              (resource, resourceIndex) => (
                                <div
                                  className="academy-resource-row"
                                  key={
                                    resource._id || `resource-${resourceIndex}`
                                  }
                                >
                                  <input
                                    value={resource.title}
                                    onChange={(e) =>
                                      updateResource(
                                        moduleIndex,
                                        lessonIndex,
                                        resourceIndex,
                                        "title",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Resource title"
                                  />

                                  <input
                                    type="url"
                                    value={resource.url}
                                    onChange={(e) =>
                                      updateResource(
                                        moduleIndex,
                                        lessonIndex,
                                        resourceIndex,
                                        "url",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Resource URL"
                                  />

                                  <select
                                    value={resource.type}
                                    onChange={(e) =>
                                      updateResource(
                                        moduleIndex,
                                        lessonIndex,
                                        resourceIndex,
                                        "type",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="pdf">PDF</option>
                                    <option value="document">Document</option>
                                    <option value="image">Image</option>
                                    <option value="link">Link</option>
                                    <option value="other">Other</option>
                                  </select>

                                  <button
                                    type="button"
                                    className="academy-remove-button"
                                    onClick={() =>
                                      removeResource(
                                        moduleIndex,
                                        lessonIndex,
                                        resourceIndex,
                                      )
                                    }
                                  >
                                    ×
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      className="academy-add-lesson"
                      disabled={hasActiveUploads}
                      onClick={() => addLesson(moduleIndex)}
                    >
                      + Add Lesson to Module
                    </button>
                  </article>
                ))}
              </div>

              {/* SAVE COURSE */}

              <div className="academy-form-submit">
                <button
                  type="submit"
                  className="academy-primary-button academy-save-button"
                  disabled={saving || hasActiveUploads}
                >
                  {saving
                    ? "Saving Course..."
                    : hasActiveUploads
                      ? "Waiting for Upload..."
                      : editingId
                        ? "Save Course Changes"
                        : "Create Course as Draft"}
                </button>

                <p>
                  New courses are saved as drafts. Publish them from the course
                  list after adding at least one lesson.
                </p>
              </div>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}

export default AdminAcademyCourses;
