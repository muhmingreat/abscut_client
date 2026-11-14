
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../services/api";
import LoadingScreen from "../LoadingScreen";
import "./AdminAcademyLiveClasses.css";

const INITIAL_FORM = {
  courseId: "",
  lessonId: "",
  title: "",
  description: "",
  instructorId: "",
  scheduledAt: "",
  durationMinutes: 60,
  timezone: "Africa/Lagos",
  participantLimit: 100,
  settings: {
    waitingRoomEnabled: true,
    studentMicrophoneEnabled: false,
    studentCameraEnabled: false,
    screenShareEnabled: false,
    chatEnabled: true,
  },
};

const getId = (item) => item?._id || item?.id || "";

const getCourseName = (course) =>
  course?.title || course?.name || "Untitled course";

const getInstructorName = (instructor) => {
  if (!instructor) return "Unassigned instructor";

  return (
    [instructor.firstName, instructor.lastName]
      .filter(Boolean)
      .join(" ") ||
    instructor.name ||
    instructor.email ||
    "Instructor"
  );
};

const formatDate = (date) => {
  if (!date) return "Not scheduled";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(parsed);
};

const getLocalDateTimeMinimum = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);

  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
};

function AdminAcademyLiveClasses() {
  const [courses, setCourses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);

  const [form, setForm] = useState(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        apiRequest("/academy/admin/courses?page=1&limit=100"),
        apiRequest("/admin/staff"),
        apiRequest("/academy/live-classes"),
      ]);

      const [coursesResult, staffResult, classesResult] = results;

      if (coursesResult.status === "fulfilled") {
        const data = coursesResult.value;

        setCourses(
          Array.isArray(data.courses)
            ? data.courses
            : Array.isArray(data.data?.courses)
              ? data.data.courses
              : []
        );
      } else {
        console.error("Live class courses error:", coursesResult.reason);
      }

      if (staffResult.status === "fulfilled") {
        const data = staffResult.value;

        setStaff(
          Array.isArray(data.staff)
            ? data.staff
            : Array.isArray(data.data?.staff)
              ? data.data.staff
              : []
        );
      } else {
        console.error("Live class staff error:", staffResult.reason);
      }

      if (classesResult.status === "fulfilled") {
        const data = classesResult.value;

        setLiveClasses(
          Array.isArray(data.liveClasses)
            ? data.liveClasses
            : Array.isArray(data.classes)
              ? data.classes
              : Array.isArray(data.data?.liveClasses)
                ? data.data.liveClasses
                : Array.isArray(data.data?.classes)
                  ? data.data.classes
                  : []
        );
      } else {
        console.error("Live classes list error:", classesResult.reason);
      }

      if (
        coursesResult.status === "rejected" &&
        staffResult.status === "rejected" &&
        classesResult.status === "rejected"
      ) {
        throw new Error("Unable to load Live Classroom management data.");
      }
    } catch (err) {
      console.error("Live classes loading error:", err);
      setError(err.message || "Unable to load live classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedCourse = useMemo(
    () => courses.find((course) => getId(course) === form.courseId),
    [courses, form.courseId]
  );

  const liveLessons = useMemo(() => {
    if (!selectedCourse?.modules) return [];

    return selectedCourse.modules.flatMap((module, moduleIndex) =>
      (module.lessons || [])
        .filter((lesson) => lesson.lessonType === "live")
        .map((lesson, lessonIndex) => ({
          ...lesson,
          moduleTitle: module.title || `Module ${moduleIndex + 1}`,
          lessonNumber: lessonIndex + 1,
        }))
    );
  }, [selectedCourse]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateSetting = (field, value) => {
    setForm((previous) => ({
      ...previous,
      settings: {
        ...previous.settings,
        [field]: value,
      },
    }));
  };

  const handleCourseChange = (courseId) => {
    const course = courses.find((item) => getId(item) === courseId);

    const lessons = (course?.modules || []).flatMap((module) =>
      (module.lessons || []).filter(
        (lesson) => lesson.lessonType === "live"
      )
    );

    setForm((previous) => ({
      ...previous,
      courseId,
      lessonId: getId(lessons[0]),
      title: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.courseId || !form.lessonId) {
      setError("Please select a course and a live classroom lesson.");
      return;
    }

    if (!form.instructorId) {
      setError("Please assign an instructor to this class.");
      return;
    }

    if (!form.scheduledAt) {
      setError("Please select the class date and time.");
      return;
    }

    const scheduledDate = new Date(form.scheduledAt);

    if (Number.isNaN(scheduledDate.getTime())) {
      setError("Please enter a valid class date and time.");
      return;
    }

    if (scheduledDate <= new Date()) {
      setError("The class must be scheduled for a future date and time.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        courseId: form.courseId,
        lessonId: form.lessonId,
        title: form.title.trim(),
        description: form.description.trim(),
        instructorId: form.instructorId,
        scheduledAt: scheduledDate.toISOString(),
        durationMinutes: Number(form.durationMinutes),
        timezone: form.timezone,
        participantLimit: Number(form.participantLimit),
        settings: form.settings,
      };

      const data = await apiRequest("/academy/live-classes/admin", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!data.success) {
        throw new Error(data.message || "Unable to schedule the class.");
      }

      setSuccess(data.message || "Live class scheduled successfully.");
      setForm(INITIAL_FORM);

      await loadData();
    } catch (err) {
      console.error("Create live class error:", err);
      setError(err.message || "Unable to schedule the live class.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (liveClassId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this scheduled live class?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setCancellingId(liveClassId);

    try {
      const data = await apiRequest(
        `/academy/live-classes/${liveClassId}/cancel`,
        {
          method: "PATCH",
        }
      );

      if (!data.success) {
        throw new Error(data.message || "Unable to cancel this class.");
      }

      setSuccess(data.message || "Live class cancelled successfully.");

      await loadData();
    } catch (err) {
      console.error("Cancel live class error:", err);
      setError(err.message || "Unable to cancel this class.");
    } finally {
      setCancellingId("");
    }
  };

  if (loading) {
    return (
      <LoadingScreen message="Loading ABS CUT Live Classroom..." />
    );
  }

  return (
    <main className="admin-live-classes-page">
      <div className="admin-live-classes-shell">
        <header className="admin-live-classes-header">
          <div>
            <span className="admin-live-eyebrow">
              ABS CUT FASHION ACADEMY
            </span>

            <h1>Live Class Management</h1>

            <p>
              Schedule interactive lessons, assign instructors and manage
              upcoming classroom sessions.
            </p>
          </div>

          <div className="admin-live-header-icon">◉</div>
        </header>

        {error && (
          <div className="admin-live-alert error" role="alert">
            <span>!</span>
            {error}
          </div>
        )}

        {success && (
          <div className="admin-live-alert success" role="status">
            <span>✓</span>
            {success}
          </div>
        )}

        <section className="admin-live-layout">
          <div className="admin-live-form-panel">
            <div className="admin-live-panel-heading">
              <div>
                <span>NEW SESSION</span>
                <h2>Schedule a Live Class</h2>
              </div>

              <span className="admin-live-heading-icon">＋</span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="admin-live-form-group">
                <label htmlFor="live-course">Select Course</label>

                <select
                  id="live-course"
                  value={form.courseId}
                  onChange={(event) =>
                    handleCourseChange(event.target.value)
                  }
                  required
                >
                  <option value="">Choose a course</option>

                  {courses.map((course) => (
                    <option key={getId(course)} value={getId(course)}>
                      {getCourseName(course)}
                    </option>
                  ))}
                </select>

                {courses.length === 0 && (
                  <small>
                    No courses were returned. Create or publish a course first.
                  </small>
                )}
              </div>

              <div className="admin-live-form-group">
                <label htmlFor="live-lesson">Select Live Lesson</label>

                <select
                  id="live-lesson"
                  value={form.lessonId}
                  onChange={(event) =>
                    updateForm("lessonId", event.target.value)
                  }
                  disabled={!form.courseId || liveLessons.length === 0}
                  required
                >
                  <option value="">Choose a live lesson</option>

                  {liveLessons.map((lesson) => (
                    <option
                      key={getId(lesson)}
                      value={getId(lesson)}
                    >
                      {lesson.title || "Untitled lesson"} — {lesson.moduleTitle}
                    </option>
                  ))}
                </select>

                {form.courseId && liveLessons.length === 0 && (
                  <small>
                    This course has no lessons marked as Live Classroom.
                    Add a live lesson in course management first.
                  </small>
                )}
              </div>

              <div className="admin-live-form-group">
                <label htmlFor="live-title">Class Title</label>

                <input
                  id="live-title"
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    updateForm("title", event.target.value)
                  }
                  placeholder="Enter the live class title"
                  maxLength={150}
                  required
                />
              </div>

              <div className="admin-live-form-group">
                <label htmlFor="live-description">
                  Class Description
                </label>

                <textarea
                  id="live-description"
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Describe what students will learn..."
                  rows={4}
                />
              </div>

              <div className="admin-live-form-group">
                <label htmlFor="live-instructor">
                  Assign Instructor
                </label>

                <select
                  id="live-instructor"
                  value={form.instructorId}
                  onChange={(event) =>
                    updateForm("instructorId", event.target.value)
                  }
                  required
                >
                  <option value="">Choose a staff instructor</option>

                  {staff.map((instructor) => (
                    <option
                      key={getId(instructor)}
                      value={getId(instructor)}
                    >
                      {getInstructorName(instructor)}
                      {instructor.email ? ` (${instructor.email})` : ""}
                    </option>
                  ))}
                </select>

                {staff.length === 0 && (
                  <small>
                    No staff accounts were returned. Create a staff account
                    before scheduling a class.
                  </small>
                )}
              </div>

              <div className="admin-live-form-row">
                <div className="admin-live-form-group">
                  <label htmlFor="live-date">Date and Time</label>

                  <input
                    id="live-date"
                    type="datetime-local"
                    value={form.scheduledAt}
                    min={getLocalDateTimeMinimum()}
                    onChange={(event) =>
                      updateForm("scheduledAt", event.target.value)
                    }
                    required
                  />
                </div>

                <div className="admin-live-form-group">
                  <label htmlFor="live-duration">
                    Duration (minutes)
                  </label>

                  <input
                    id="live-duration"
                    type="number"
                    min="15"
                    max="480"
                    value={form.durationMinutes}
                    onChange={(event) =>
                      updateForm("durationMinutes", event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="admin-live-form-row">
                <div className="admin-live-form-group">
                  <label htmlFor="live-timezone">Time Zone</label>

                  <select
                    id="live-timezone"
                    value={form.timezone}
                    onChange={(event) =>
                      updateForm("timezone", event.target.value)
                    }
                  >
                    <option value="Africa/Lagos">
                      Africa/Lagos (WAT)
                    </option>
                  </select>
                </div>

                <div className="admin-live-form-group">
                  <label htmlFor="live-limit">
                    Participant Limit
                  </label>

                  <input
                    id="live-limit"
                    type="number"
                    min="2"
                    max="500"
                    value={form.participantLimit}
                    onChange={(event) =>
                      updateForm("participantLimit", event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="admin-live-settings">
                <div className="admin-live-settings-heading">
                  <span>CLASSROOM SETTINGS</span>
                  <h3>Student Access and Permissions</h3>
                </div>

                <label className="admin-live-toggle">
                  <span>
                    <strong>Waiting Room</strong>
                    <small>
                      Students wait until the instructor admits them.
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    checked={form.settings.waitingRoomEnabled}
                    onChange={(event) =>
                      updateSetting(
                        "waitingRoomEnabled",
                        event.target.checked
                      )
                    }
                  />
                </label>

                <label className="admin-live-toggle">
                  <span>
                    <strong>Student Microphone</strong>
                    <small>
                      Allow student microphones by default.
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    checked={form.settings.studentMicrophoneEnabled}
                    onChange={(event) =>
                      updateSetting(
                        "studentMicrophoneEnabled",
                        event.target.checked
                      )
                    }
                  />
                </label>

                <label className="admin-live-toggle">
                  <span>
                    <strong>Student Camera</strong>
                    <small>
                      Allow student cameras by default.
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    checked={form.settings.studentCameraEnabled}
                    onChange={(event) =>
                      updateSetting(
                        "studentCameraEnabled",
                        event.target.checked
                      )
                    }
                  />
                </label>

                <label className="admin-live-toggle">
                  <span>
                    <strong>Screen Sharing</strong>
                    <small>
                      Enable screen sharing for the classroom.
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    checked={form.settings.screenShareEnabled}
                    onChange={(event) =>
                      updateSetting(
                        "screenShareEnabled",
                        event.target.checked
                      )
                    }
                  />
                </label>

                <label className="admin-live-toggle">
                  <span>
                    <strong>Classroom Chat</strong>
                    <small>
                      Enable classroom text chat.
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    checked={form.settings.chatEnabled}
                    onChange={(event) =>
                      updateSetting(
                        "chatEnabled",
                        event.target.checked
                      )
                    }
                  />
                </label>
              </div>

              <button
                type="submit"
                className="admin-live-submit"
                disabled={submitting}
              >
                {submitting
                  ? "SCHEDULING CLASS..."
                  : "SCHEDULE LIVE CLASS"}
              </button>
            </form>
          </div>

          <aside className="admin-live-information">
            <div className="admin-live-info-icon">◉</div>

            <span>ABS CUT LIVE</span>

            <h2>Your Virtual Classroom</h2>

            <p>
              Manage interactive fashion training sessions directly inside
              ABS CUT Fashion Academy.
            </p>

            <div className="admin-live-info-divider" />

            <div className="admin-live-info-item">
              <strong>01</strong>
              <div>
                <b>Choose a live lesson</b>
                <small>
                  Only lessons marked Live Classroom can be scheduled.
                </small>
              </div>
            </div>

            <div className="admin-live-info-item">
              <strong>02</strong>
              <div>
                <b>Assign an instructor</b>
                <small>
                  Select an existing staff account to lead the session.
                </small>
              </div>
            </div>

            <div className="admin-live-info-item">
              <strong>03</strong>
              <div>
                <b>Control student access</b>
                <small>
                  Configure waiting-room and classroom permissions.
                </small>
              </div>
            </div>

            <div className="admin-live-info-note">
              <strong>Important</strong>
              <p>
                Students will still need valid course enrollment and
                authorization before joining a live classroom.
              </p>
            </div>
          </aside>
        </section>

        <section className="admin-live-list-section">
          <div className="admin-live-list-heading">
            <div>
              <span>CLASSROOM OVERVIEW</span>
              <h2>Scheduled Live Classes</h2>
              <p>
                Review your classroom sessions and manage scheduled classes.
              </p>
            </div>

            <button
              type="button"
              className="admin-live-refresh"
              onClick={loadData}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          {liveClasses.length === 0 ? (
            <div className="admin-live-empty">
              <span>◉</span>
              <h3>No live classes yet</h3>
              <p>
                Your scheduled classroom sessions will appear here.
              </p>
            </div>
          ) : (
            <div className="admin-live-table-wrapper">
              <table className="admin-live-table">
                <thead>
                  <tr>
                    <th>CLASS</th>
                    <th>COURSE</th>
                    <th>INSTRUCTOR</th>
                    <th>DATE AND TIME</th>
                    <th>DURATION</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {liveClasses.map((liveClass) => {
                    const classId = getId(liveClass);
                    const course =
                      liveClass.course &&
                      typeof liveClass.course === "object"
                        ? liveClass.course
                        : null;

                    const instructor =
                      liveClass.instructor &&
                      typeof liveClass.instructor === "object"
                        ? liveClass.instructor
                        : null;

                    const status = liveClass.status || "scheduled";

                    return (
                      <tr key={classId}>
                        <td>
                          <strong>
                            {liveClass.title || "Untitled class"}
                          </strong>
                          <small>
                            {liveClass.description || "No description"}
                          </small>
                        </td>

                        <td>
                          {getCourseName(course)}
                        </td>

                        <td>
                          {getInstructorName(instructor)}
                        </td>

                        <td>
                          {formatDate(liveClass.scheduledAt)}
                        </td>

                        <td>
                          {liveClass.durationMinutes || 60} min
                        </td>

                        <td>
                          <span
                            className={`admin-live-status ${status}`}
                          >
                            {status.replaceAll("_", " ")}
                          </span>
                        </td>

                        <td>
                          {status === "scheduled" ? (
                            <button
                              type="button"
                              className="admin-live-cancel"
                              onClick={() => handleCancel(classId)}
                              disabled={cancellingId === classId}
                            >
                              {cancellingId === classId
                                ? "Cancelling..."
                                : "Cancel"}
                            </button>
                          ) : (
                            <span className="admin-live-no-action">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default AdminAcademyLiveClasses;
