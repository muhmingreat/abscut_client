
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  apiRequest,
  uploadRequest,
} from "../../services/api";
import "./CourseLearning.css";

const MAX_ASSIGNMENT_FILES = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const formatDate = (value) => {
  if (!value) return "No deadline";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatCurrency = (amount, currency = "NGN") => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const getSubmissionAccept = (type) => {
  switch (type) {
    case "image":
      return "image/jpeg,image/png,image/webp";

    case "video":
      return "video/mp4,video/quicktime,video/webm";

    case "document":
      return ".pdf,.doc,.docx,.txt";

    default:
      return [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/quicktime",
        "video/webm",
        ".pdf",
        ".doc",
        ".docx",
        ".txt",
      ].join(",");
  }
};

function CourseLearning() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);

  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [access, setAccess] = useState(null);

  // ASSIGNMENT STATE
  const [assignments, setAssignments] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState({});
  const [sidebarView, setSidebarView] = useState("lessons");

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [studentComment, setStudentComment] = useState("");
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const modules = course?.modules || [];

  const lessons = useMemo(
    () =>
      modules.flatMap((module) =>
        (module.lessons || []).map((lesson) => ({
          ...lesson,
          moduleTitle: module.title,
          moduleId: module._id,
        })),
      ),
    [modules],
  );

  const completedIds = useMemo(
    () =>
      new Set(
        (enrollment?.completedLessonIds || []).map((id) =>
          String(id?._id || id),
        ),
      ),
    [enrollment?.completedLessonIds],
  );

  const activeIndex = lessons.findIndex(
    (lesson) => String(lesson._id) === String(activeLesson?._id),
  );

  const isActiveLessonCompleted = activeLesson
    ? completedIds.has(String(activeLesson._id))
    : false;

  const isActiveLessonLocked = activeLesson?.isLocked === true;

  const remainingBalance = Number(
    access?.remainingBalance ??
      Math.max(
        0,
        Number(enrollment?.amountDue || 0) -
          Number(enrollment?.amountPaid || 0),
      ),
  );

  const progress = enrollment?.progressPercentage || 0;

  const selectedHistory =
    selectedAssignment
      ? assignmentHistory[String(selectedAssignment._id)] || []
      : [];

  const latestSubmission = selectedHistory[0] || null;

  const assignmentSubmissionCount = selectedHistory.length;

  const assignmentMaxSubmissions = Number(
    selectedAssignment?.maxSubmissions || 1,
  );

  const assignmentDeadlinePassed =
    selectedAssignment?.dueDate &&
    new Date(selectedAssignment.dueDate).getTime() < Date.now();

  const canSubmitAssignment = (() => {
    if (!selectedAssignment) return false;

    if (selectedAssignment.status !== "published") return false;

    if (assignmentDeadlinePassed) return false;

    if (assignmentSubmissionCount === 0) return true;

    return (
      selectedAssignment.allowResubmission === true &&
      assignmentSubmissionCount < assignmentMaxSubmissions &&
      latestSubmission?.status === "resubmission_required"
    );
  })();

  useEffect(() => {
    loadCourse();
  }, [enrollmentId]);

  async function loadAssignments(courseId) {
    try {
      const response = await apiRequest(
        `/academy/courses/${courseId}/assignments`,
      );

      const loadedAssignments = response?.assignments || [];

      setAssignments(loadedAssignments);

      // Load the student's submission history for each assignment.
      const historyResults = await Promise.allSettled(
        loadedAssignments.map(async (assignment) => {
          const result = await apiRequest(
            `/academy/assignments/${assignment._id}/my-submissions`,
          );

          return {
            assignmentId: String(assignment._id),
            submissions: result?.submissions || [],
          };
        }),
      );

      const history = {};

      historyResults.forEach((result) => {
        if (result.status === "fulfilled") {
          history[result.value.assignmentId] =
            result.value.submissions;
        }
      });

      setAssignmentHistory(history);
    } catch (err) {
      console.error("ACADEMY ASSIGNMENTS ERROR:", err);

      // Assignment loading should not prevent lessons from working.
      setAssignments([]);
      setAssignmentHistory({});
    }
  }

  async function loadCourse() {
    try {
      setLoading(true);
      setError("");

      if (!/^[a-fA-F0-9]{24}$/.test(enrollmentId || "")) {
        throw new Error(
          "Invalid enrollment ID. Please return to My Courses and open your enrolled course again.",
        );
      }

      const response = await apiRequest(
        `/academy/enrollments/${enrollmentId}/course`,
      );

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to load your course.",
        );
      }

      const loadedCourse = response.course;
      const loadedEnrollment = response.enrollment;

      if (!loadedCourse || !loadedEnrollment) {
        throw new Error("The course response is incomplete.");
      }

      setAccess(response.access || null);
      setCourse(loadedCourse);
      setEnrollment(loadedEnrollment);

      const allLessons = (loadedCourse.modules || []).flatMap(
        (module) =>
          (module.lessons || []).map((lesson) => ({
            ...lesson,
            moduleTitle: module.title,
            moduleId: module._id,
          })),
      );

      const completed = new Set(
        (loadedEnrollment.completedLessonIds || []).map((id) =>
          String(id?._id || id),
        ),
      );

      const availableLessons = allLessons.filter(
        (lesson) => !lesson.isLocked,
      );

      const nextLesson =
        availableLessons.find(
          (lesson) => !completed.has(String(lesson._id)),
        ) ||
        availableLessons[0] ||
        allLessons[0] ||
        null;

      setActiveLesson(nextLesson);

      await loadAssignments(loadedCourse._id);
    } catch (err) {
      setError(
        err.message || "Unable to load your learning environment.",
      );
    } finally {
      setLoading(false);
    }
  }

  function selectLesson(lesson) {
    setSelectedAssignment(null);
    setActiveLesson(lesson);
    setSidebarView("lessons");
    setError("");

    if (window.innerWidth <= 850) {
      setSidebarOpen(false);
    }
  }

  async function selectAssignment(assignment) {
    try {
      setAssignmentLoading(true);
      setAssignmentError("");
      setUploadError("");
      setUploadSuccess("");

      setSelectedAssignment(assignment);
      setSelectedFiles([]);
      setStudentComment("");
      setSidebarView("assignments");

      const response = await apiRequest(
        `/academy/assignments/${assignment._id}`,
      );

      if (!response?.success || !response?.assignment) {
        throw new Error(
          response?.message || "Unable to load assignment details.",
        );
      }

      setSelectedAssignment(response.assignment);

      if (window.innerWidth <= 850) {
        setSidebarOpen(false);
      }
    } catch (err) {
      setAssignmentError(
        err.message || "Unable to load assignment details.",
      );
    } finally {
      setAssignmentLoading(false);
    }
  }

  function handleFileSelection(event) {
    const files = Array.from(event.target.files || []);

    setUploadError("");
    setUploadSuccess("");

    if (files.length > MAX_ASSIGNMENT_FILES) {
      setUploadError(
        `You can select a maximum of ${MAX_ASSIGNMENT_FILES} files.`,
      );
      event.target.value = "";
      setSelectedFiles([]);
      return;
    }

    const oversizedFile = files.find(
      (file) => file.size > MAX_FILE_SIZE,
    );

    if (oversizedFile) {
      setUploadError(
        `${oversizedFile.name} exceeds the 50MB file limit.`,
      );
      event.target.value = "";
      setSelectedFiles([]);
      return;
    }

    setSelectedFiles(files);
  }

  async function submitAssignment(event) {
    event.preventDefault();

    if (!selectedAssignment || submittingAssignment) return;

    setUploadError("");
    setUploadSuccess("");

    if (!canSubmitAssignment) {
      setUploadError(
        "This assignment is not currently accepting submissions.",
      );
      return;
    }

    if (!selectedFiles.length) {
      setUploadError("Please select at least one file.");
      return;
    }

    if (selectedFiles.length > MAX_ASSIGNMENT_FILES) {
      setUploadError("You can submit a maximum of five files.");
      return;
    }

    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("studentComment", studentComment.trim());

    try {
      setSubmittingAssignment(true);

      const response = await uploadRequest(
        `/academy/assignments/${selectedAssignment._id}/submit`,
        formData,
      );

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to submit your assignment.",
        );
      }

      // Refresh this assignment's submission history.
      const historyResponse = await apiRequest(
        `/academy/assignments/${selectedAssignment._id}/my-submissions`,
      );

      setAssignmentHistory((previous) => ({
        ...previous,
        [String(selectedAssignment._id)]:
          historyResponse?.submissions || [],
      }));

      setSelectedFiles([]);
      setStudentComment("");

      const fileInput = document.getElementById(
        "academy-assignment-files",
      );

      if (fileInput) fileInput.value = "";

      setUploadSuccess(
        response?.message || "Your assignment was submitted successfully.",
      );
    } catch (err) {
      setUploadError(
        err.message || "Unable to submit your assignment.",
      );
    } finally {
      setSubmittingAssignment(false);
    }
  }

  async function markLessonComplete() {
    if (
      !activeLesson ||
      completing ||
      isActiveLessonCompleted ||
      isActiveLessonLocked
    ) {
      return;
    }

    try {
      setCompleting(true);
      setError("");

      const response = await apiRequest(
        `/academy/enrollments/${enrollmentId}/lessons/${activeLesson._id}/complete`,
        {
          method: "POST",
        },
      );

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to update lesson progress.",
        );
      }

      setEnrollment((previous) => ({
        ...previous,
        ...response.enrollment,
        completedLessonIds:
          response.enrollment?.completedLessonIds ||
          previous.completedLessonIds,
      }));
    } catch (err) {
      setError(err.message || "Unable to complete this lesson.");
    } finally {
      setCompleting(false);
    }
  }

  function goToPreviousLesson() {
    if (activeIndex > 0) {
      selectLesson(lessons[activeIndex - 1]);
    }
  }

  function goToNextLesson() {
    if (activeIndex >= 0 && activeIndex < lessons.length - 1) {
      selectLesson(lessons[activeIndex + 1]);
    }
  }

  function getLessonType(lesson) {
    return lesson.lessonType || "video";
  }

  if (loading) {
    return (
      <div className="academy-learning-loading">
        <div className="academy-loader" />
        <p>Preparing your learning environment...</p>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="academy-learning-error">
        <h2>Unable to open course</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/academy/my-courses")}>
          Back to My Courses
        </button>
      </div>
    );
  }

  if (!course) return null;

  return (
    <main className="academy-learning-page">
      <header className="academy-learning-header">
        <div className="academy-learning-brand">
          <Link to="/academy" className="academy-brand-mark">
            ABS CUT
          </Link>
          <span>FASHION ACADEMY</span>
        </div>

        <div className="academy-learning-header-course">
          {course.title}
        </div>

        <Link to="/academy/my-courses" className="academy-exit-learning">
          Exit classroom
        </Link>
      </header>

      <div className="academy-learning-progress">
        <div className="academy-learning-progress-info">
          <span>YOUR COURSE PROGRESS</span>
          <strong>{progress}%</strong>
        </div>

        <div className="academy-learning-progress-track">
          <div
            className="academy-learning-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="academy-learning-layout">
        <section className="academy-lesson-main">
          <div className="academy-player-heading">
            <button
              className="academy-sidebar-toggle"
              onClick={() => setSidebarOpen((value) => !value)}
              type="button"
            >
              ☰
            </button>

            <div>
              <span>
                {selectedAssignment
                  ? "COURSE ASSIGNMENT"
                  : activeLesson?.moduleTitle || "Course lesson"}
              </span>

              <h1>
                {selectedAssignment?.title ||
                  activeLesson?.title ||
                  "No lessons available"}
              </h1>
            </div>
          </div>

          {error && (
            <div className="academy-learning-alert">{error}</div>
          )}

          {/* ASSIGNMENT WORKSPACE */}
          {selectedAssignment ? (
            <div className="academy-assignment-workspace">
              {assignmentLoading ? (
                <div className="academy-assignment-loading">
                  <div className="academy-loader" />
                  <p>Loading assignment...</p>
                </div>
              ) : assignmentError ? (
                <div className="academy-learning-alert">
                  {assignmentError}
                </div>
              ) : (
                <>
                  <div className="academy-assignment-heading">
                    <div>
                      <span className="academy-assignment-eyebrow">
                        ABS CUT FASHION ACADEMY
                      </span>
                      <h2>{selectedAssignment.title}</h2>
                      <p>
                        Complete the instructions below and submit your work
                        for review.
                      </p>
                    </div>

                    <span
                      className={`academy-assignment-status ${
                        assignmentDeadlinePassed ? "overdue" : "published"
                      }`}
                    >
                      {assignmentDeadlinePassed
                        ? "Deadline passed"
                        : "Published"}
                    </span>
                  </div>

                  <div className="academy-assignment-meta">
                    <div>
                      <span>SUBMISSION TYPE</span>
                      <strong>
                        {selectedAssignment.submissionType || "Mixed"}
                      </strong>
                    </div>

                    <div>
                      <span>TOTAL MARKS</span>
                      <strong>
                        {selectedAssignment.totalMarks ?? "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>PASSING MARKS</span>
                      <strong>
                        {selectedAssignment.passingMarks ?? "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>DUE DATE</span>
                      <strong>
                        {formatDate(selectedAssignment.dueDate)}
                      </strong>
                    </div>
                  </div>

                  <section className="academy-assignment-instructions">
                    <h3>Assignment instructions</h3>

                    <div className="academy-assignment-instruction-content">
                      {selectedAssignment.instructions ||
                        "No additional instructions have been provided."}
                    </div>
                  </section>

                  {selectedAssignment.resources?.length > 0 && (
                    <section className="academy-assignment-resources">
                      <h3>Assignment resources</h3>

                      <div className="academy-resource-list">
                        {selectedAssignment.resources.map(
                          (resource, index) => (
                            <a
                              key={resource._id || index}
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                              className="academy-resource-item"
                            >
                              <span>↗</span>
                              <div>
                                <strong>
                                  {resource.title || "Assignment resource"}
                                </strong>
                                <small>
                                  {resource.type || "Learning resource"}
                                </small>
                              </div>
                            </a>
                          ),
                        )}
                      </div>
                    </section>
                  )}

                  <section className="academy-assignment-submit-section">
                    <div className="academy-assignment-section-heading">
                      <div>
                        <span>YOUR WORK</span>
                        <h3>Submit your assignment</h3>
                      </div>

                      <span className="academy-assignment-attempt-count">
                        {assignmentSubmissionCount} / {assignmentMaxSubmissions} attempts
                      </span>
                    </div>

                    {uploadError && (
                      <div className="academy-assignment-message error">
                        {uploadError}
                      </div>
                    )}

                    {uploadSuccess && (
                      <div className="academy-assignment-message success">
                        {uploadSuccess}
                      </div>
                    )}

                    {canSubmitAssignment ? (
                      <form onSubmit={submitAssignment}>
                        <label
                          className="academy-assignment-file-label"
                          htmlFor="academy-assignment-files"
                        >
                          <span className="academy-assignment-upload-icon">
                            ↑
                          </span>

                          <strong>Select your work</strong>

                          <small>
                            Images, videos or documents depending on the
                            assignment requirements. Maximum 5 files, 50MB
                            each.
                          </small>

                          <input
                            id="academy-assignment-files"
                            type="file"
                            multiple
                            accept={getSubmissionAccept(
                              selectedAssignment.submissionType,
                            )}
                            onChange={handleFileSelection}
                            disabled={submittingAssignment}
                          />
                        </label>

                        {selectedFiles.length > 0 && (
                          <div className="academy-assignment-selected-files">
                            <strong>Selected files</strong>

                            {selectedFiles.map((file, index) => (
                              <div key={`${file.name}-${index}`}>
                                <span>{file.name}</span>
                                <small>
                                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                                </small>
                              </div>
                            ))}
                          </div>
                        )}

                        <label className="academy-assignment-comment-label">
                          Comment for your instructor (optional)

                          <textarea
                            value={studentComment}
                            onChange={(event) =>
                              setStudentComment(event.target.value)
                            }
                            placeholder="Add any notes about your submission..."
                            rows={4}
                            maxLength={2000}
                            disabled={submittingAssignment}
                          />
                        </label>

                        <button
                          type="submit"
                          className="academy-assignment-submit-button"
                          disabled={
                            submittingAssignment ||
                            selectedFiles.length === 0
                          }
                        >
                          {submittingAssignment
                            ? "Submitting your work..."
                            : "Submit assignment"}
                        </button>
                      </form>
                    ) : (
                      <div className="academy-assignment-unavailable">
                        {assignmentDeadlinePassed
                          ? "The submission deadline has passed."
                          : assignmentSubmissionCount > 0 &&
                              latestSubmission?.status !==
                                "resubmission_required"
                            ? "Your submission has already been received. You can submit again if your instructor requests a resubmission."
                            : "This assignment is not currently accepting submissions."}
                      </div>
                    )}
                  </section>

                  <section className="academy-assignment-history">
                    <div className="academy-assignment-section-heading">
                      <div>
                        <span>SUBMISSION RECORD</span>
                        <h3>Your submission history</h3>
                      </div>
                    </div>

                    {selectedHistory.length > 0 ? (
                      <div className="academy-submission-list">
                        {selectedHistory.map((submission, index) => (
                          <article
                            className="academy-submission-card"
                            key={submission._id || index}
                          >
                            <div className="academy-submission-card-top">
                              <div>
                                <strong>
                                  Attempt #{submission.submissionNumber || index + 1}
                                </strong>
                                <small>
                                  Submitted {formatDate(submission.submittedAt)}
                                </small>
                              </div>

                              <span
                                className={`academy-submission-status ${submission.status}`}
                              >
                                {String(submission.status || "submitted")
                                  .replaceAll("_", " ")}
                              </span>
                            </div>

                            {submission.files?.length > 0 && (
                              <div className="academy-submission-files">
                                {submission.files.map((file, fileIndex) => (
                                  <a
                                    key={file._id || file.publicId || fileIndex}
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    ↗ {file.originalName || `Submitted file ${fileIndex + 1}`}
                                  </a>
                                ))}
                              </div>
                            )}

                            {submission.studentComment && (
                              <div className="academy-submission-comment">
                                <strong>Your comment</strong>
                                <p>{submission.studentComment}</p>
                              </div>
                            )}

                            {submission.status === "graded" && (
                              <div className="academy-submission-grade">
                                <div>
                                  <span>YOUR SCORE</span>
                                  <strong>
                                    {submission.marksAwarded ?? 0}
                                    {" / "}
                                    {selectedAssignment.totalMarks ?? "—"}
                                  </strong>
                                </div>

                                {submission.gradedAt && (
                                  <small>
                                    Graded {formatDate(submission.gradedAt)}
                                  </small>
                                )}
                              </div>
                            )}

                            {submission.instructorFeedback && (
                              <div className="academy-instructor-feedback">
                                <strong>Instructor feedback</strong>
                                <p>{submission.instructorFeedback}</p>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="academy-assignment-empty">
                        You have not submitted this assignment yet.
                      </p>
                    )}
                  </section>
                </>
              )}
            </div>
          ) : activeLesson ? (
            <>
              {isActiveLessonLocked ? (
                <div className="academy-locked-lesson">
                  <div className="academy-locked-icon">🔒</div>

                  <span className="academy-locked-eyebrow">
                    FINAL LESSON RESTRICTED
                  </span>

                  <h2>Complete your course payment</h2>

                  <p>
                    You have access to the course lessons included in your
                    first installment. Your final lesson is reserved until
                    the outstanding balance is paid.
                  </p>

                  <div className="academy-payment-summary">
                    <div>
                      <span>Course fee</span>
                      <strong>
                        {formatCurrency(
                          enrollment?.amountDue,
                          enrollment?.currency || "NGN",
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Amount paid</span>
                      <strong>
                        {formatCurrency(
                          enrollment?.amountPaid,
                          enrollment?.currency || "NGN",
                        )}
                      </strong>
                    </div>

                    <div className="academy-payment-balance">
                      <span>Outstanding balance</span>
                      <strong>
                        {formatCurrency(
                          remainingBalance,
                          enrollment?.currency || "NGN",
                        )}
                      </strong>
                    </div>
                  </div>

                  <p className="academy-locked-note">
                    Once your remaining payment is verified, this lesson and
                    all its learning resources will become available
                    automatically.
                  </p>

                  <Link
                    to="/academy/my-courses"
                    className="academy-locked-back"
                  >
                    Back to My Courses
                  </Link>
                </div>
              ) : (
                <>
                  <div className="academy-video-container">
                    {getLessonType(activeLesson) === "video" &&
                    activeLesson.videoUrl ? (
                      <video
                        key={activeLesson._id}
                        className="academy-course-video"
                        controls
                        controlsList="nodownload"
                        preload="metadata"
                      >
                        <source
                          src={activeLesson.videoUrl}
                          type="video/mp4"
                        />
                        Your browser does not support video playback.
                      </video>
                    ) : getLessonType(activeLesson) === "article" ? (
                      <article className="academy-article-content">
                        <h2>{activeLesson.title}</h2>
                        <div>
                          {activeLesson.content ||
                            "No lesson content has been added yet."}
                        </div>
                      </article>
                    ) : (
                      <div className="academy-video-placeholder">
                        <span>ABS CUT</span>
                        <p>Lesson video is not available yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="academy-lesson-description">
                    <div>
                      <span className="academy-lesson-label">
                        ABOUT THIS LESSON
                      </span>

                      <h2>{activeLesson.title}</h2>

                      <p>
                        {activeLesson.description ||
                          "Follow this lesson carefully and practise the techniques demonstrated."}
                      </p>
                    </div>

                    <div className="academy-lesson-actions">
                      <button
                        type="button"
                        className="academy-secondary-button"
                        onClick={goToPreviousLesson}
                        disabled={activeIndex <= 0}
                      >
                        Previous lesson
                      </button>

                      <button
                        type="button"
                        className="academy-complete-button"
                        onClick={markLessonComplete}
                        disabled={
                          completing ||
                          isActiveLessonCompleted ||
                          isActiveLessonLocked
                        }
                      >
                        {completing
                          ? "Saving..."
                          : isActiveLessonCompleted
                            ? "✓ Completed"
                            : "Mark as complete"}
                      </button>

                      <button
                        type="button"
                        className="academy-secondary-button"
                        onClick={goToNextLesson}
                        disabled={
                          activeIndex < 0 ||
                          activeIndex >= lessons.length - 1
                        }
                      >
                        Next lesson
                      </button>
                    </div>
                  </div>

                  <section className="academy-resources-section">
                    <h3>Lesson resources</h3>

                    {activeLesson.resources?.length ? (
                      <div className="academy-resource-list">
                        {activeLesson.resources.map((resource, index) => (
                          <a
                            key={resource._id || index}
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="academy-resource-item"
                          >
                            <span>↗</span>
                            <div>
                              <strong>{resource.title}</strong>
                              <small>
                                {resource.type || "Learning resource"}
                              </small>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="academy-no-resources">
                        No additional resources for this lesson.
                      </p>
                    )}
                  </section>
                </>
              )}
            </>
          ) : (
            <div className="academy-video-placeholder">
              <span>ABS CUT</span>
              <p>No lessons are available in this course yet.</p>
            </div>
          )}
        </section>

        {sidebarOpen && (
          <aside className="academy-learning-sidebar">
            <div className="academy-sidebar-heading">
              <div>
                <span>YOUR CLASSROOM</span>
                <h2>Course content</h2>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close course sidebar"
              >
                ×
              </button>
            </div>

            <div className="academy-classroom-tabs">
              <button
                type="button"
                className={sidebarView === "lessons" ? "active" : ""}
                onClick={() => {
                  setSidebarView("lessons");
                  setSelectedAssignment(null);
                }}
              >
                Lessons
                <span>{lessons.length}</span>
              </button>

              <button
                type="button"
                className={sidebarView === "assignments" ? "active" : ""}
                onClick={() => {
                  setSidebarView("assignments");
                  setSelectedAssignment(null);
                }}
              >
                Assignments
                <span>{assignments.length}</span>
              </button>
            </div>

            {sidebarView === "lessons" ? (
              <>
                <div className="academy-sidebar-summary">
                  <strong>
                    {completedIds.size} of {lessons.length}
                  </strong>
                  <span>lessons completed</span>
                </div>

                <div className="academy-module-list">
                  {modules.map((module, moduleIndex) => (
                    <section
                      className="academy-module"
                      key={module._id || moduleIndex}
                    >
                      <div className="academy-module-heading">
                        <span>MODULE {moduleIndex + 1}</span>
                        <h3>{module.title}</h3>
                        {module.description && (
                          <p>{module.description}</p>
                        )}
                      </div>

                      <div className="academy-module-lessons">
                        {(module.lessons || []).map(
                          (lesson, lessonIndex) => {
                            const completed = completedIds.has(
                              String(lesson._id),
                            );

                            const active =
                              String(activeLesson?._id) ===
                              String(lesson._id);

                            return (
                              <button
                                type="button"
                                key={lesson._id || lessonIndex}
                                className={`academy-lesson-item ${
                                  active ? "active" : ""
                                } ${completed ? "completed" : ""} ${
                                  lesson.isLocked ? "locked" : ""
                                }`}
                                onClick={() => {
                                  if (!lesson.isLocked) {
                                    selectLesson({
                                      ...lesson,
                                      moduleTitle: module.title,
                                      moduleId: module._id,
                                    });
                                  }
                                }}
                                disabled={lesson.isLocked}
                              >
                                <span className="academy-lesson-status">
                                  {lesson.isLocked
                                    ? "🔒"
                                    : completed
                                      ? "✓"
                                      : active
                                        ? "▶"
                                        : "○"}
                                </span>

                                <span className="academy-lesson-item-info">
                                  <strong>{lesson.title}</strong>
                                  <small>
                                    {lesson.lessonType === "article"
                                      ? "Reading lesson"
                                      : "Video lesson"}

                                    {lesson.durationSeconds
                                      ? ` · ${Math.ceil(
                                          lesson.durationSeconds / 60,
                                        )} min`
                                      : ""}
                                  </small>
                                </span>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <div className="academy-sidebar-assignment-list">
                {assignments.length > 0 ? (
                  assignments.map((assignment) => {
                    const history =
                      assignmentHistory[String(assignment._id)] || [];

                    const latest = history[0];

                    return (
                      <button
                        type="button"
                        key={assignment._id}
                        className={`academy-sidebar-assignment ${
                          String(selectedAssignment?._id) ===
                          String(assignment._id)
                            ? "active"
                            : ""
                        }`}
                        onClick={() => selectAssignment(assignment)}
                      >
                        <span className="academy-sidebar-assignment-icon">
                          {latest?.status === "graded" ? "✓" : "✎"}
                        </span>

                        <span className="academy-sidebar-assignment-info">
                          <strong>{assignment.title}</strong>

                          <small>
                            {assignment.totalMarks ?? "—"} marks
                            {" · "}
                            {history.length} attempt
                            {history.length === 1 ? "" : "s"}
                          </small>

                          <small>
                            {latest
                              ? String(latest.status).replaceAll("_", " ")
                              : "Not submitted"}
                          </small>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="academy-assignment-empty">
                    <span>✎</span>
                    <strong>No assignments yet</strong>
                    <p>
                      Assignments published for this course will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}

export default CourseLearning;


