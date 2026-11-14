
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../services/api";
import "./CourseDetails.css";

function formatPrice(price, currency = "NGN") {
  const amount = Number(price);

  if (!Number.isFinite(amount)) return "Price unavailable";

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₦${amount.toLocaleString("en-NG")}`;
  }
}

function formatDuration(hours) {
  const duration = Number(hours);

  if (!Number.isFinite(duration) || duration <= 0) {
    return "Self-paced";
  }

  return `${duration} ${duration === 1 ? "hour" : "hours"}`;
}

function formatLevel(level) {
  if (!level) return "All Levels";

  return level
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function CourseDetails() {
  const { courseId: slug } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedModules, setExpandedModules] = useState({});
  const [previewLesson, setPreviewLesson] = useState(null);

  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState("");
  const [enrollmentMessage, setEnrollmentMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCourse() {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest(
          `/academy/courses/${encodeURIComponent(slug)}`
        );

        if (!response?.success || !response.course) {
          throw new Error(
            response?.message || "Unable to load this course."
          );
        }

        if (!isMounted) return;

        setCourse(response.course);

        // Expand the first curriculum module by default.
        setExpandedModules({ 0: true });
      } catch (err) {
        if (!isMounted) return;

        setError(
          err.message || "Something went wrong while loading this course."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (slug) {
      loadCourse();
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const curriculum = useMemo(() => {
    return (course?.modules || []).map((module, moduleIndex) => ({
      ...module,
      lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
        ...lesson,
        moduleIndex,
        lessonIndex,
      })),
    }));
  }, [course]);

  const lessonCount = useMemo(() => {
    return curriculum.reduce(
      (total, module) => total + module.lessons.length,
      0
    );
  }, [curriculum]);

  const previewCount = useMemo(() => {
    return curriculum.reduce(
      (total, module) =>
        total +
        module.lessons.filter((lesson) => lesson.isPreview).length,
      0
    );
  }, [curriculum]);

  function toggleModule(index) {
    setExpandedModules((current) => ({
      ...current,
      [index]: !current[index],
    }));
  }

  async function handleEnroll() {
    setEnrollmentError("");
    setEnrollmentMessage("");

    const token = localStorage.getItem("absCutToken");

    if (!token) {
      navigate("/login", {
        state: {
          from: `/academy/courses/${slug}`,
        },
      });
      return;
    }

    if (!course?._id) {
      setEnrollmentError("Course information is unavailable.");
      return;
    }

    try {
      setEnrolling(true);

      const response = await apiRequest(
        `/academy/enrollments/${course._id}`,
        {
          method: "POST",
        }
      );

      if (!response?.success || !response.enrollment?._id) {
        throw new Error(
          response?.message || "Unable to create your enrollment."
        );
      }

      const enrollment = response.enrollment;

      if (
        enrollment.paymentStatus === "not_required" ||
        enrollment.status === "active" && course.isFree
      ) {
        navigate(`/academy/learn/${enrollment._id}`);
        return;
      }

      // Paid enrollment is created, but course access remains locked
      // until the required bank-transfer payment is confirmed.
      setEnrollmentMessage(
        "Your enrollment has been created. Visit My Courses to continue with the bank-transfer payment process."
      );

      navigate("/academy/my-courses", {
        state: {
          newEnrollmentId: enrollment._id,
          courseTitle: course.title,
          paymentRequired: true,
        },
      });
    } catch (err) {
      setEnrollmentError(
        err.message || "Unable to enrol in this course."
      );
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <main className="academy-details-page">
        <div className="academy-details-container">
          <div className="academy-details-loading">
            <span className="academy-details-spinner" />
            <p>Preparing your course...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="academy-details-page">
        <div className="academy-details-container">
          <div className="academy-details-error">
            <span className="academy-details-error-icon">!</span>
            <h2>Course unavailable</h2>
            <p>{error || "This course could not be found."}</p>
            <Link to="/academy" className="academy-details-primary-link">
              Back to Academy
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="academy-details-page">
      {/* BREADCRUMB */}
      <div className="academy-details-container">
        <nav className="academy-details-breadcrumb">
          <Link to="/academy">Fashion Academy</Link>
          <span>/</span>
          <span>{course.category || "Course"}</span>
          <span>/</span>
          <strong>{course.title}</strong>
        </nav>
      </div>

      {/* COURSE HERO */}
      <section className="academy-details-hero">
        <div className="academy-details-container academy-details-hero-grid">
          <div className="academy-details-hero-copy">
            <span className="academy-details-eyebrow">
              <span />
              ABS CUT FASHION ACADEMY
            </span>

            <div className="academy-details-category">
              {course.category || "Fashion"}
              <span>•</span>
              {formatLevel(course.level)}
            </div>

            <h1>{course.title}</h1>

            <p className="academy-details-short-description">
              {course.shortDescription}
            </p>

            <div className="academy-details-instructor">
              <span className="academy-details-instructor-avatar">
                {(course.instructorName || "A")
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <div>
                <small>YOUR INSTRUCTOR</small>
                <strong>
                  {course.instructorName || "ABS CUT Academy"}
                </strong>
              </div>
            </div>

            <div className="academy-details-hero-stats">
              <span>
                <i>◷</i>
                {formatDuration(course.estimatedDurationHours)}
              </span>

              <span>
                <i>▤</i>
                {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
              </span>

              <span>
                <i>◎</i>
                {course.language || "English"}
              </span>
            </div>
          </div>

          <div className="academy-details-hero-media">
            <div className="academy-details-thumbnail">
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                />
              ) : (
                <div className="academy-details-thumbnail-placeholder">
                  <span>ABS CUT</span>
                  <strong>FASHION ACADEMY</strong>
                  <i>✂</i>
                </div>
              )}

              <div className="academy-details-thumbnail-label">
                <span>LEARN</span>
                <strong>CREATE</strong>
                <span>MASTER</span>
              </div>
            </div>

            <div className="academy-details-media-caption">
              <span>YOUR NEXT SKILL STARTS HERE</span>
              <span>ABS CUT · ACADEMY</span>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="academy-details-main">
        <div className="academy-details-container academy-details-layout">
          <div className="academy-details-content">
            {/* OVERVIEW */}
            <section className="academy-details-section">
              <span className="academy-details-section-label">
                COURSE OVERVIEW
              </span>

              <h2>About This Course</h2>

              <div className="academy-details-description">
                {course.description}
              </div>
            </section>

            {/* LEARNING OUTCOMES */}
            {course.learningOutcomes?.length > 0 && (
              <section className="academy-details-section">
                <span className="academy-details-section-label">
                  YOUR LEARNING JOURNEY
                </span>

                <h2>What You'll Learn</h2>

                <div className="academy-details-outcomes">
                  {course.learningOutcomes.map((outcome, index) => (
                    <div
                      className="academy-details-outcome"
                      key={`${index}-${outcome}`}
                    >
                      <span>✓</span>
                      <p>{outcome}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* REQUIREMENTS */}
            {course.requirements?.length > 0 && (
              <section className="academy-details-section">
                <span className="academy-details-section-label">
                  BEFORE YOU BEGIN
                </span>

                <h2>Course Requirements</h2>

                <div className="academy-details-requirements">
                  {course.requirements.map((requirement, index) => (
                    <div key={`${index}-${requirement}`}>
                      <span>•</span>
                      <p>{requirement}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* INSTRUCTOR */}
            <section className="academy-details-section">
              <span className="academy-details-section-label">
                MEET YOUR INSTRUCTOR
              </span>

              <h2>Learn From Experience</h2>

              <div className="academy-details-instructor-card">
                <div className="academy-details-instructor-large-avatar">
                  {(course.instructorName || "A")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h3>
                    {course.instructorName || "ABS CUT Academy"}
                  </h3>

                  <p>
                    {course.instructorBio ||
                      "Learn practical fashion and tailoring skills through ABS CUT Fashion Academy."}
                  </p>
                </div>
              </div>
            </section>

            {/* CURRICULUM */}
            <section className="academy-details-section academy-details-curriculum-section">
              <span className="academy-details-section-label">
                YOUR COURSE CONTENT
              </span>

              <h2>Course Curriculum</h2>

              <p className="academy-details-section-intro">
                Explore the modules and lessons included in this course.
                {previewCount > 0 &&
                  ` ${previewCount} lesson${previewCount === 1 ? "" : "s"} available for preview.`}
              </p>

              {curriculum.length > 0 ? (
                <div className="academy-details-curriculum">
                  {curriculum.map((module, moduleIndex) => (
                    <article
                      className="academy-details-module"
                      key={module._id || moduleIndex}
                    >
                      <button
                        type="button"
                        className="academy-details-module-header"
                        onClick={() => toggleModule(moduleIndex)}
                        aria-expanded={!!expandedModules[moduleIndex]}
                      >
                        <span className="academy-details-module-number">
                          {String(moduleIndex + 1).padStart(2, "0")}
                        </span>

                        <span className="academy-details-module-info">
                          <strong>
                            {module.title || `Module ${moduleIndex + 1}`}
                          </strong>

                          <small>
                            {module.lessons.length}{" "}
                            {module.lessons.length === 1
                              ? "lesson"
                              : "lessons"}
                          </small>
                        </span>

                        <span className="academy-details-module-arrow">
                          {expandedModules[moduleIndex] ? "−" : "+"}
                        </span>
                      </button>

                      {expandedModules[moduleIndex] && (
                        <div className="academy-details-lesson-list">
                          {module.description && (
                            <p className="academy-details-module-description">
                              {module.description}
                            </p>
                          )}

                          {module.lessons.map((lesson, lessonIndex) => (
                            <div
                              className="academy-details-lesson"
                              key={lesson._id || lessonIndex}
                            >
                              <span className="academy-details-lesson-icon">
                                {lesson.lessonType === "article"
                                  ? "▤"
                                  : "▷"}
                              </span>

                              <div className="academy-details-lesson-info">
                                <strong>{lesson.title}</strong>

                                <small>
                                  {lesson.lessonType === "article"
                                    ? "Reading lesson"
                                    : "Video lesson"}

                                  {lesson.durationSeconds > 0 &&
                                    ` · ${Math.ceil(
                                      lesson.durationSeconds / 60
                                    )} min`}
                                </small>
                              </div>

                              {lesson.isPreview ? (
                                <button
                                  type="button"
                                  className="academy-details-preview-button"
                                  onClick={() =>
                                    setPreviewLesson(lesson)
                                  }
                                >
                                  Preview
                                </button>
                              ) : (
                                <span className="academy-details-locked-label">
                                  Enrol to access
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="academy-details-no-curriculum">
                  Course lessons will be available soon.
                </div>
              )}
            </section>
          </div>

          {/* ENROLLMENT CARD */}
          <aside className="academy-details-sidebar">
            <div className="academy-details-enrollment-card">
              <div className="academy-details-price-area">
                <span>{course.isFree ? "COURSE ACCESS" : "COURSE FEE"}</span>

                <strong>
                  {course.isFree
                    ? "FREE"
                    : formatPrice(course.price, course.currency)}
                </strong>

                {!course.isFree && (
                  <small>One-time course fee</small>
                )}
              </div>

              <div className="academy-details-card-divider" />

              <div className="academy-details-card-features">
                <div>
                  <span>✓</span>
                  <p>{lessonCount} structured lessons</p>
                </div>

                <div>
                  <span>✓</span>
                  <p>{formatLevel(course.level)} instruction</p>
                </div>

                <div>
                  <span>✓</span>
                  <p>Learn at your own pace</p>
                </div>

                <div>
                  <span>✓</span>
                  <p>
                    {course.certificateEnabled
                      ? "Certificate available on completion"
                      : "Practical learning experience"}
                  </p>
                </div>

                {course.accessDurationDays > 0 && (
                  <div>
                    <span>✓</span>
                    <p>
                      {course.accessDurationDays} days of course access
                    </p>
                  </div>
                )}
              </div>

              {!course.isFree && (
                <div className="academy-details-installment">
                  <strong>Flexible payment option</strong>
                  <p>
                    Pay 50% upfront and the remaining 50% before accessing
                    the final course lesson or receiving your certificate.
                  </p>
                </div>
              )}

              {enrollmentError && (
                <div className="academy-details-enrollment-error">
                  {enrollmentError}
                </div>
              )}

              {enrollmentMessage && (
                <div className="academy-details-enrollment-success">
                  {enrollmentMessage}
                </div>
              )}

              <button
                type="button"
                className="academy-details-enroll-button"
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling
                  ? "Processing..."
                  : course.isFree
                    ? "Enrol for Free"
                    : "Enrol & Continue to Payment"}

                {!enrolling && <span>→</span>}
              </button>

              <p className="academy-details-secure-note">
                {course.isFree
                  ? "Create your learning account and start learning."
                  : "Paid course access is activated after payment confirmation."}
              </p>
            </div>

            <div className="academy-details-help-card">
              <span>NEED ASSISTANCE?</span>
              <h3>We're Here to Help</h3>
              <p>
                Need help choosing a course or understanding the lessons?
                Contact the ABS CUT team.
              </p>

              <a
                href="https://wa.me/2348140806540"
                target="_blank"
                rel="noreferrer"
              >
                Contact ABS CUT <span>↗</span>
              </a>
            </div>
          </aside>
        </div>
      </section>

      {/* PREVIEW MODAL */}
      {previewLesson && (
        <div
          className="academy-preview-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewLesson(null);
            }
          }}
        >
          <div
            className="academy-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="academy-preview-title"
          >
            <div className="academy-preview-header">
              <div>
                <span>FREE LESSON PREVIEW</span>
                <h2 id="academy-preview-title">
                  {previewLesson.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPreviewLesson(null)}
                aria-label="Close preview"
              >
                ×
              </button>
            </div>

            <div className="academy-preview-content">
              {previewLesson.lessonType === "article" ? (
                <div className="academy-preview-article">
                  {previewLesson.content || "No preview content is available."}
                </div>
              ) : previewLesson.videoUrl ? (
                <video
                  src={previewLesson.videoUrl}
                  controls
                  playsInline
                  controlsList="nodownload"
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="academy-preview-unavailable">
                  Video preview is not available for this lesson.
                </div>
              )}
            </div>

            <div className="academy-preview-footer">
              <p>
                Enjoying this preview? Enrol to continue your learning
                journey with ABS CUT.
              </p>

              <button
                type="button"
                onClick={() => {
                  setPreviewLesson(null);
                  handleEnroll();
                }}
              >
                Enrol in This Course →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default CourseDetails;
