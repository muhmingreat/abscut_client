
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import LoadingScreen from "../LoadingScreen";
import "./AdminAcademyAssignments.css";

const blankForm = {
  courseId: "",
  moduleId: "",
  title: "",
  instructions: "",
  submissionType: "mixed",
  totalMarks: 100,
  passingMarks: 50,
  dueDate: "",
  allowResubmission: true,
  maxSubmissions: 3,
  resources: [],
  status: "draft",
};

const dateForInput = (date) => {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  const local = new Date(
    parsed.getTime() - parsed.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
};

const formatDate = (date) => {
  if (!date) return "No deadline";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Invalid date";

  return parsed.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

function AdminAcademyAssignments() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");

  const selectedCourse = useMemo(
    () => courses.find((course) => course._id === form.courseId),
    [courses, form.courseId]
  );

  const modules = selectedCourse?.modules || [];

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const matchesSearch =
        !query ||
        assignment.title?.toLowerCase().includes(query) ||
        assignment.course?.title?.toLowerCase().includes(query);

      const assignmentCourseId =
        assignment.course?._id || assignment.course;

      const matchesCourse =
        courseFilter === "all" ||
        String(assignmentCourseId) === String(courseFilter);

      const matchesStatus =
        statusFilter === "all" || assignment.status === statusFilter;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [assignments, search, courseFilter, statusFilter]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [courseResponse, assignmentResponse] = await Promise.all([
        apiRequest("/academy/admin/courses"),
        apiRequest("/academy/admin/assignments"),
      ]);

      if (!courseResponse.success) {
        throw new Error(courseResponse.message || "Unable to load courses.");
      }

      if (!assignmentResponse.success) {
        throw new Error(
          assignmentResponse.message || "Unable to load assignments."
        );
      }

      setCourses(courseResponse.courses || []);
      setAssignments(assignmentResponse.assignments || []);
    } catch (err) {
      console.error("Academy assignments loading error:", err);
      setError(err.message || "Unable to load assignment management.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(blankForm);
    setEditingId(null);
    setResourceTitle("");
    setResourceUrl("");
    setShowForm(false);
  };

  const startCreate = () => {
    setForm(blankForm);
    setEditingId(null);
    setNotice("");
    setError("");
    setShowForm(true);
  };

  const startEdit = (assignment) => {
    const courseId = assignment.course?._id || assignment.course || "";

    setForm({
      courseId: String(courseId),
      moduleId: assignment.moduleId || "",
      title: assignment.title || "",
      instructions: assignment.instructions || "",
      submissionType: assignment.submissionType || "mixed",
      totalMarks: assignment.totalMarks ?? 100,
      passingMarks: assignment.passingMarks ?? 50,
      dueDate: dateForInput(assignment.dueDate),
      allowResubmission: assignment.allowResubmission ?? true,
      maxSubmissions: assignment.maxSubmissions ?? 3,
      resources: assignment.resources || [],
      status: assignment.status || "draft",
    });

    setEditingId(assignment._id);
    setNotice("");
    setError("");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addResource = () => {
    const title = resourceTitle.trim();
    const url = resourceUrl.trim();

    if (!title || !url) {
      setError("Enter both a resource title and URL.");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid resource URL.");
      return;
    }

    setForm((previous) => ({
      ...previous,
      resources: [...previous.resources, { title, url }],
    }));

    setResourceTitle("");
    setResourceUrl("");
    setError("");
  };

  const removeResource = (index) => {
    setForm((previous) => ({
      ...previous,
      resources: previous.resources.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.courseId) {
      setError("Select a course for this assignment.");
      return;
    }

    if (!form.title.trim()) {
      setError("Assignment title is required.");
      return;
    }

    if (!form.instructions.trim()) {
      setError("Assignment instructions are required.");
      return;
    }

    const totalMarks = Number(form.totalMarks);
    const passingMarks = Number(form.passingMarks);
    const maxSubmissions = Number(form.maxSubmissions);

    if (
      !Number.isFinite(totalMarks) ||
      totalMarks <= 0 ||
      !Number.isFinite(passingMarks) ||
      passingMarks < 0 ||
      passingMarks > totalMarks
    ) {
      setError("Check the total marks and passing marks.");
      return;
    }

    if (
      !Number.isInteger(maxSubmissions) ||
      maxSubmissions < 1 ||
      maxSubmissions > 20
    ) {
      setError("Maximum submissions must be between 1 and 20.");
      return;
    }

    const payload = {
      courseId: form.courseId,
      moduleId: form.moduleId || null,
      title: form.title.trim(),
      instructions: form.instructions.trim(),
      submissionType: form.submissionType,
      totalMarks,
      passingMarks,
      dueDate: form.dueDate || null,
      allowResubmission: Boolean(form.allowResubmission),
      maxSubmissions,
      resources: form.resources,
    };

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const response = editingId
        ? await apiRequest(`/academy/admin/assignments/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await apiRequest("/academy/admin/assignments", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      if (!response.success) {
        throw new Error(response.message || "Unable to save assignment.");
      }

      setNotice(response.message || "Assignment saved successfully.");
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save assignment.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (assignment, action) => {
    const endpoint =
      action === "publish"
        ? `/academy/admin/assignments/${assignment._id}/publish`
        : `/academy/admin/assignments/${assignment._id}/close`;

    const confirmation =
      action === "publish"
        ? `Publish "${assignment.title}" for students?`
        : `Close "${assignment.title}"? Students will no longer be able to submit.`;

    if (!window.confirm(confirmation)) return;

    try {
      setError("");
      setNotice("");

      const response = await apiRequest(endpoint, {
        method: "PATCH",
      });

      if (!response.success) {
        throw new Error(response.message || "Unable to update assignment.");
      }

      setNotice(response.message || "Assignment status updated.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to update assignment status.");
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading Academy assignments..." />;
  }

  return (
    <main className="admin-academy-assignments">
      <div className="aaa-shell">
        <header className="aaa-header">
          <div>
            <Link to="/admin" className="aaa-back-link">
              ← Admin Dashboard
            </Link>

            <span className="aaa-eyebrow">ABS CUT FASHION ACADEMY</span>
            <h1>Assignment Management</h1>
            <p>
              Create practical tasks, publish assignments and manage student
              submissions.
            </p>
          </div>

          <div className="aaa-header-actions">
            <Link to="/admin/academy/courses" className="aaa-secondary-button">
              Manage Courses
            </Link>

            <button
              type="button"
              className="aaa-primary-button"
              onClick={startCreate}
            >
              + Create Assignment
            </button>
          </div>
        </header>

        {error && (
          <div className="aaa-alert aaa-alert-error">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        {notice && (
          <div className="aaa-alert aaa-alert-success">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}

        {showForm && (
          <section className="aaa-form-panel">
            <div className="aaa-panel-heading">
              <div>
                <span className="aaa-eyebrow">
                  {editingId ? "UPDATE ASSIGNMENT" : "NEW ASSIGNMENT"}
                </span>
                <h2>{editingId ? "Edit Assignment" : "Create Assignment"}</h2>
              </div>

              <button
                type="button"
                className="aaa-close-button"
                onClick={resetForm}
                aria-label="Close assignment form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="aaa-form">
              <div className="aaa-form-grid">
                <label className="aaa-field">
                  <span>Course *</span>
                  <select
                    value={form.courseId}
                    onChange={(event) => {
                      updateForm("courseId", event.target.value);
                      updateForm("moduleId", "");
                    }}
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="aaa-field">
                  <span>Module (optional)</span>
                  <select
                    value={form.moduleId}
                    onChange={(event) =>
                      updateForm("moduleId", event.target.value)
                    }
                    disabled={!selectedCourse}
                  >
                    <option value="">Entire course</option>
                    {modules.map((module) => (
                      <option key={module._id} value={module._id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="aaa-field aaa-field-full">
                  <span>Assignment title *</span>
                  <input
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    placeholder="e.g. Draft and sew a basic trouser"
                    maxLength={160}
                    required
                  />
                </label>

                <label className="aaa-field aaa-field-full">
                  <span>Instructions *</span>
                  <textarea
                    value={form.instructions}
                    onChange={(event) =>
                      updateForm("instructions", event.target.value)
                    }
                    placeholder="Explain the task, required steps and what students should submit..."
                    rows={6}
                    required
                  />
                </label>

                <label className="aaa-field">
                  <span>Accepted submission type</span>
                  <select
                    value={form.submissionType}
                    onChange={(event) =>
                      updateForm("submissionType", event.target.value)
                    }
                  >
                    <option value="image">Images only</option>
                    <option value="video">Videos only</option>
                    <option value="document">Documents only</option>
                    <option value="mixed">Images, videos or documents</option>
                  </select>
                </label>

                <label className="aaa-field">
                  <span>Submission deadline</span>
                  <input
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={(event) =>
                      updateForm("dueDate", event.target.value)
                    }
                  />
                  <small>Leave empty if there is no deadline.</small>
                </label>

                <label className="aaa-field">
                  <span>Total marks</span>
                  <input
                    type="number"
                    min="1"
                    value={form.totalMarks}
                    onChange={(event) =>
                      updateForm("totalMarks", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="aaa-field">
                  <span>Passing marks</span>
                  <input
                    type="number"
                    min="0"
                    max={form.totalMarks}
                    value={form.passingMarks}
                    onChange={(event) =>
                      updateForm("passingMarks", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="aaa-field">
                  <span>Maximum submissions</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.maxSubmissions}
                    onChange={(event) =>
                      updateForm("maxSubmissions", event.target.value)
                    }
                    required
                  />
                </label>
              </div>

              <div className="aaa-toggle-row">
                <label className="aaa-checkbox">
                  <input
                    type="checkbox"
                    checked={form.allowResubmission}
                    onChange={(event) =>
                      updateForm("allowResubmission", event.target.checked)
                    }
                  />
                  <span>
                    <strong>Allow resubmission</strong>
                    <small>Students can submit again when requested.</small>
                  </span>
                </label>
              </div>

              <section className="aaa-resources">
                <div className="aaa-section-heading">
                  <div>
                    <h3>Assignment resources</h3>
                    <p>Optional reference links for students.</p>
                  </div>
                </div>

                <div className="aaa-resource-inputs">
                  <input
                    value={resourceTitle}
                    onChange={(event) => setResourceTitle(event.target.value)}
                    placeholder="Resource name"
                  />
                  <input
                    value={resourceUrl}
                    onChange={(event) => setResourceUrl(event.target.value)}
                    placeholder="https://..."
                  />
                  <button type="button" onClick={addResource}>
                    Add
                  </button>
                </div>

                {form.resources.length > 0 && (
                  <div className="aaa-resource-list">
                    {form.resources.map((resource, index) => (
                      <div className="aaa-resource-item" key={`${resource.url}-${index}`}>
                        <div>
                          <strong>{resource.title}</strong>
                          <small>{resource.url}</small>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeResource(index)}
                          aria-label={`Remove ${resource.title}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="aaa-form-actions">
                <button
                  type="button"
                  className="aaa-secondary-button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="aaa-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Save Assignment"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="aaa-list-panel">
          <div className="aaa-list-heading">
            <div>
              <span className="aaa-eyebrow">ACADEMY WORK</span>
              <h2>Assignments</h2>
              <p>{assignments.length} assignment(s) created</p>
            </div>

            <button
              type="button"
              className="aaa-refresh-button"
              onClick={loadData}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="aaa-filters">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assignment or course..."
            />

            <select
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
            >
              <option value="all">All courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="aaa-empty-state">
              <div className="aaa-empty-icon">✦</div>
              <h3>No assignments found</h3>
              <p>
                Create an assignment for a course to start collecting student
                practical work.
              </p>
              <button
                type="button"
                className="aaa-primary-button"
                onClick={startCreate}
              >
                Create First Assignment
              </button>
            </div>
          ) : (
            <div className="aaa-assignment-grid">
              {filteredAssignments.map((assignment) => {
                const courseTitle =
                  assignment.course?.title ||
                  courses.find(
                    (course) =>
                      course._id ===
                      (assignment.course?._id || assignment.course)
                  )?.title ||
                  "Academy Course";

                return (
                  <article className="aaa-assignment-card" key={assignment._id}>
                    <div className="aaa-card-top">
                      <span
                        className={`aaa-status aaa-status-${assignment.status}`}
                      >
                        {assignment.status}
                      </span>
                      <span className="aaa-card-type">
                        {assignment.submissionType}
                      </span>
                    </div>

                    <span className="aaa-course-label">{courseTitle}</span>
                    <h3>{assignment.title}</h3>

                    <p className="aaa-card-description">
                      {assignment.instructions}
                    </p>

                    <div className="aaa-card-meta">
                      <span>
                        <strong>{assignment.totalMarks}</strong> marks
                      </span>
                      <span>
                        Pass: <strong>{assignment.passingMarks}</strong>
                      </span>
                      <span>
                        <strong>{assignment.maxSubmissions}</strong> attempts
                      </span>
                    </div>

                    <div className="aaa-card-deadline">
                      <span>Deadline</span>
                      <strong>{formatDate(assignment.dueDate)}</strong>
                    </div>

                    <div className="aaa-card-actions">
                      <button
                        type="button"
                        className="aaa-secondary-button"
                        onClick={() => startEdit(assignment)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="aaa-secondary-button"
                        onClick={() =>
                          navigate(
                            `/admin/academy/assignments/${assignment._id}/submissions`
                          )
                        }
                      >
                        Submissions
                      </button>

                      {assignment.status === "draft" && (
                        <button
                          type="button"
                          className="aaa-primary-button"
                          onClick={() => changeStatus(assignment, "publish")}
                        >
                          Publish
                        </button>
                      )}

                      {assignment.status === "published" && (
                        <button
                          type="button"
                          className="aaa-danger-button"
                          onClick={() => changeStatus(assignment, "close")}
                        >
                          Close
                        </button>
                      )}
                    </div>
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

export default AdminAcademyAssignments;
