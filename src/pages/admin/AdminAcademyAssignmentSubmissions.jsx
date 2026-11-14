
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../services/api";
import LoadingScreen from "../LoadingScreen";
import "./AdminAcademyAssignmentSubmissions.css";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatBytes = (bytes) => {
  if (!bytes) return "";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const statusLabel = (status) => {
  const labels = {
    submitted: "Submitted",
    under_review: "Under Review",
    graded: "Graded",
    resubmission_required: "Resubmission Required",
  };

  return labels[status] || status || "Unknown";
};

function AdminAcademyAssignmentSubmissions() {
  const { assignmentId } = useParams();

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState("");
  const [gradeForms, setGradeForms] = useState({});
  const [resubmitForms, setResubmitForms] = useState({});

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(
        `/academy/admin/assignments/${assignmentId}/submissions`
      );

      if (!response.success) {
        throw new Error(
          response.message || "Unable to load assignment submissions."
        );
      }

      setAssignment(response.assignment || null);
      setSubmissions(response.submissions || []);

      const initialGrades = {};
      const initialResubmissions = {};

      (response.submissions || []).forEach((submission) => {
        initialGrades[submission._id] = {
          marksAwarded: submission.marksAwarded ?? "",
          instructorFeedback: submission.instructorFeedback || "",
        };

        initialResubmissions[submission._id] = {
          instructorFeedback: submission.instructorFeedback || "",
        };
      });

      setGradeForms(initialGrades);
      setResubmitForms(initialResubmissions);
    } catch (err) {
      console.error("Assignment submissions error:", err);
      setError(err.message || "Unable to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const filteredSubmissions = submissions.filter((submission) => {
    const student = submission.student || {};
    const studentName =
      `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
      student.name ||
      student.email ||
      "";

    const matchesSearch =
      !search.trim() ||
      studentName.toLowerCase().includes(search.trim().toLowerCase()) ||
      student.email?.toLowerCase().includes(search.trim().toLowerCase());

    const matchesFilter =
      filter === "all" || submission.status === filter;

    return matchesSearch && matchesFilter;
  });

  const updateGradeForm = (submissionId, field, value) => {
    setGradeForms((previous) => ({
      ...previous,
      [submissionId]: {
        ...previous[submissionId],
        [field]: value,
      },
    }));
  };

  const updateResubmitForm = (submissionId, value) => {
    setResubmitForms((previous) => ({
      ...previous,
      [submissionId]: {
        ...previous[submissionId],
        instructorFeedback: value,
      },
    }));
  };

  const runAction = async (submissionId, endpoint, payload, successMessage) => {
    try {
      setProcessingId(submissionId);
      setError("");
      setNotice("");

      const response = await apiRequest(endpoint, {
        method: "PATCH",
        ...(payload
          ? { body: JSON.stringify(payload) }
          : {}),
      });

      if (!response.success) {
        throw new Error(response.message || "Action failed.");
      }

      setNotice(response.message || successMessage);
      await loadSubmissions();
    } catch (err) {
      setError(err.message || "Unable to complete this action.");
    } finally {
      setProcessingId("");
    }
  };

  const markUnderReview = (submission) => {
    if (submission.status === "under_review") return;

    runAction(
      submission._id,
      `/academy/admin/submissions/${submission._id}/review`,
      null,
      "Submission marked under review."
    );
  };

  const gradeSubmission = async (event, submission) => {
    event.preventDefault();

    const values = gradeForms[submission._id] || {};
    const marks = Number(values.marksAwarded);

    if (
      values.marksAwarded === "" ||
      !Number.isFinite(marks) ||
      marks < 0 ||
      marks > Number(assignment?.totalMarks || 0)
    ) {
      setError(
        `Marks must be between 0 and ${assignment?.totalMarks || 0}.`
      );
      return;
    }

    await runAction(
      submission._id,
      `/academy/admin/submissions/${submission._id}/grade`,
      {
        marksAwarded: marks,
        instructorFeedback: values.instructorFeedback || "",
      },
      "Submission graded successfully."
    );
  };

  const requestResubmission = async (submission) => {
    const feedback =
      resubmitForms[submission._id]?.instructorFeedback?.trim() || "";

    if (!feedback) {
      setError("Feedback is required when requesting resubmission.");
      return;
    }

    if (
      !window.confirm(
        "Request another submission from this student?"
      )
    ) {
      return;
    }

    await runAction(
      submission._id,
      `/academy/admin/submissions/${submission._id}/resubmit`,
      { instructorFeedback: feedback },
      "Resubmission requested."
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading student submissions..." />;
  }

  if (!assignment && error) {
    return (
      <main className="aaa-submissions-page">
        <div className="aaa-submissions-shell">
          <Link
            to="/admin/academy/assignments"
            className="aaa-submissions-back"
          >
            ← Assignments
          </Link>

          <div className="aaa-submissions-error">
            <h2>Unable to load assignment</h2>
            <p>{error}</p>
            <button
              type="button"
              onClick={loadSubmissions}
              className="aaa-submissions-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  const gradedCount = submissions.filter(
    (submission) => submission.status === "graded"
  ).length;

  const pendingCount = submissions.filter((submission) =>
    ["submitted", "under_review"].includes(submission.status)
  ).length;

  return (
    <main className="aaa-submissions-page">
      <div className="aaa-submissions-shell">
        <header className="aaa-submissions-header">
          <div>
            <Link
              to="/admin/academy/assignments"
              className="aaa-submissions-back"
            >
              ← Assignment Management
            </Link>

            <span className="aaa-submissions-eyebrow">
              ABS CUT FASHION ACADEMY
            </span>

            <h1>Student Submissions</h1>
            <p>Review practical work, grade learners and provide feedback.</p>
          </div>

          <button
            type="button"
            className="aaa-submissions-secondary"
            onClick={loadSubmissions}
          >
            ↻ Refresh
          </button>
        </header>

        {error && (
          <div className="aaa-submissions-alert error">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        {notice && (
          <div className="aaa-submissions-alert success">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}

        <section className="aaa-submissions-overview">
          <div className="aaa-submissions-assignment">
            <span className="aaa-submissions-eyebrow">ASSIGNMENT</span>
            <h2>{assignment?.title}</h2>
            <p>{assignment?.instructions}</p>

            <div className="aaa-submissions-assignment-meta">
              <span>
                Course: <strong>{assignment?.course?.title || "Academy Course"}</strong>
              </span>
              <span>
                Total marks: <strong>{assignment?.totalMarks}</strong>
              </span>
              <span>
                Passing marks: <strong>{assignment?.passingMarks}</strong>
              </span>
              <span>
                Deadline: <strong>{formatDate(assignment?.dueDate)}</strong>
              </span>
            </div>
          </div>

          <div className="aaa-submissions-stat-grid">
            <article>
              <span>Total</span>
              <strong>{submissions.length}</strong>
            </article>
            <article>
              <span>Awaiting review</span>
              <strong>{pendingCount}</strong>
            </article>
            <article>
              <span>Graded</span>
              <strong>{gradedCount}</strong>
            </article>
          </div>
        </section>

        <section className="aaa-submissions-panel">
          <div className="aaa-submissions-panel-heading">
            <div>
              <span className="aaa-submissions-eyebrow">LEARNER WORK</span>
              <h2>Submissions</h2>
            </div>
          </div>

          <div className="aaa-submissions-filters">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student name or email..."
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All submissions</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under review</option>
              <option value="graded">Graded</option>
              <option value="resubmission_required">
                Resubmission required
              </option>
            </select>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="aaa-submissions-empty">
              <div>✦</div>
              <h3>No submissions found</h3>
              <p>
                Student submissions will appear here after learners submit their
                work.
              </p>
            </div>
          ) : (
            <div className="aaa-submission-list">
              {filteredSubmissions.map((submission) => {
                const student = submission.student || {};
                const studentName =
                  `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
                  student.name ||
                  "Academy Student";

                const gradeForm = gradeForms[submission._id] || {};
                const resubmitForm =
                  resubmitForms[submission._id] || {};

                const isProcessing =
                  processingId === submission._id;

                return (
                  <article
                    className="aaa-submission-card"
                    key={submission._id}
                  >
                    <div className="aaa-submission-card-header">
                      <div className="aaa-submission-student">
                        <div className="aaa-submission-avatar">
                          {studentName.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <h3>{studentName}</h3>
                          <span>{student.email || "No email available"}</span>
                          <small>
                            Attempt {submission.submissionNumber || 1} ·{" "}
                            {formatDate(submission.submittedAt)}
                          </small>
                        </div>
                      </div>

                      <span
                        className={`aaa-submission-status aaa-submission-status-${submission.status}`}
                      >
                        {statusLabel(submission.status)}
                      </span>
                    </div>

                    {submission.studentComment && (
                      <div className="aaa-student-comment">
                        <span>Student note</span>
                        <p>{submission.studentComment}</p>
                      </div>
                    )}

                    <div className="aaa-submission-files">
                      <h4>Submitted files ({submission.files?.length || 0})</h4>

                      {!submission.files?.length ? (
                        <p className="aaa-no-files">No files attached.</p>
                      ) : (
                        <div className="aaa-submission-file-grid">
                          {submission.files.map((file, index) => (
                            <a
                              className="aaa-submission-file"
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              key={`${file.publicId || file.url}-${index}`}
                            >
                              <span className="aaa-file-icon">
                                {file.type === "image"
                                  ? "▧"
                                  : file.type === "video"
                                    ? "▶"
                                    : "▤"}
                              </span>

                              <span className="aaa-file-info">
                                <strong>
                                  {file.originalName || `Submission file ${index + 1}`}
                                </strong>
                                <small>
                                  {(file.type || "file").toUpperCase()}{" "}
                                  {formatBytes(file.bytes)}
                                </small>
                              </span>

                              <span className="aaa-file-open">↗</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {submission.instructorFeedback && (
                      <div className="aaa-existing-feedback">
                        <span>Previous instructor feedback</span>
                        <p>{submission.instructorFeedback}</p>
                      </div>
                    )}

                    <div className="aaa-submission-actions">
                      {submission.status === "submitted" && (
                        <button
                          type="button"
                          className="aaa-submissions-secondary"
                          disabled={isProcessing}
                          onClick={() => markUnderReview(submission)}
                        >
                          {isProcessing
                            ? "Processing..."
                            : "Mark Under Review"}
                        </button>
                      )}

                      {submission.status !== "resubmission_required" && (
                        <form
                          className="aaa-grade-form"
                          onSubmit={(event) =>
                            gradeSubmission(event, submission)
                          }
                        >
                          <h4>Grade submission</h4>

                          <label>
                            <span>Marks awarded</span>
                            <input
                              type="number"
                              min="0"
                              max={assignment?.totalMarks || 100}
                              step="0.01"
                              value={gradeForm.marksAwarded}
                              onChange={(event) =>
                                updateGradeForm(
                                  submission._id,
                                  "marksAwarded",
                                  event.target.value
                                )
                              }
                              required
                            />
                          </label>

                          <label>
                            <span>Instructor feedback</span>
                            <textarea
                              rows={3}
                              value={gradeForm.instructorFeedback}
                              onChange={(event) =>
                                updateGradeForm(
                                  submission._id,
                                  "instructorFeedback",
                                  event.target.value
                                )
                              }
                              placeholder="Explain strengths, corrections and next steps..."
                            />
                          </label>

                          <button
                            type="submit"
                            className="aaa-submissions-primary"
                            disabled={isProcessing}
                          >
                            {isProcessing ? "Saving..." : "Save Grade"}
                          </button>
                        </form>
                      )}

                      {submission.status !== "resubmission_required" && (
                        <div className="aaa-resubmit-form">
                          <h4>Request resubmission</h4>

                          <label>
                            <span>Feedback for student *</span>
                            <textarea
                              rows={3}
                              value={resubmitForm.instructorFeedback}
                              onChange={(event) =>
                                updateResubmitForm(
                                  submission._id,
                                  event.target.value
                                )
                              }
                              placeholder="Explain what the student should correct..."
                            />
                          </label>

                          <button
                            type="button"
                            className="aaa-submissions-danger"
                            disabled={isProcessing}
                            onClick={() => requestResubmission(submission)}
                          >
                            Request Resubmission
                          </button>
                        </div>
                      )}
                    </div>

                    {submission.status === "graded" && (
                      <div className="aaa-submission-result">
                        <span>Final score</span>
                        <strong>
                          {submission.marksAwarded} / {assignment?.totalMarks}
                        </strong>
                        <span>
                          {Number(submission.marksAwarded) >=
                          Number(assignment?.passingMarks)
                            ? "Passing score"
                            : "Below passing score"}
                        </span>
                      </div>
                    )}

                    {submission.gradedAt && (
                      <div className="aaa-submission-graded-date">
                        Graded {formatDate(submission.gradedAt)}
                        {submission.gradedBy?.firstName
                          ? ` by ${submission.gradedBy.firstName}`
                          : ""}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default AdminAcademyAssignmentSubmissions;
