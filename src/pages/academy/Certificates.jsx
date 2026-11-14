
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/api";
import "./Certificates.css";

function getCourse(enrollment) {
  return enrollment?.course || enrollment?.courseSnapshot || {};
}

function getEnrollmentId(certificate) {
  const enrollment = certificate?.enrollment;
  return typeof enrollment === "object"
    ? enrollment?._id
    : enrollment;
}

function getCertificateCourse(certificate) {
  return certificate?.course || {};
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [issuingId, setIssuingId] = useState("");
  const [issueErrors, setIssueErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const [certificateResponse, enrollmentResponse] =
        await Promise.all([
          apiRequest("/academy/certificates/me"),
          apiRequest("/academy/enrollments/me"),
        ]);

      if (!certificateResponse?.success) {
        throw new Error(
          certificateResponse?.message ||
            "Unable to load your certificates."
        );
      }

      if (!enrollmentResponse?.success) {
        throw new Error(
          enrollmentResponse?.message ||
            "Unable to load your course enrollments."
        );
      }

      setCertificates(certificateResponse.certificates || []);
      setEnrollments(enrollmentResponse.enrollments || []);
    } catch (error) {
      setPageError(
        error.message || "Something went wrong while loading certificates."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const issuedEnrollmentIds = new Set(
    certificates
      .map(getEnrollmentId)
      .filter(Boolean)
      .map(String)
  );

  const eligibleEnrollments = enrollments.filter((enrollment) => {
    const course = getCourse(enrollment);
    const enrollmentId = String(enrollment._id || "");

    const completed =
      enrollment.status === "completed" &&
      Number(enrollment.progressPercentage || 0) >= 100;

    const certificateEnabled = course.certificateEnabled !== false;

    const isFree =
      course.isFree === true ||
      enrollment.courseSnapshot?.isFree === true;

    const paymentSatisfied =
      enrollment.paymentStatus === "paid" ||
      (isFree && enrollment.paymentStatus === "not_required");

    return (
      completed &&
      certificateEnabled &&
      paymentSatisfied &&
      enrollmentId &&
      !issuedEnrollmentIds.has(enrollmentId)
    );
  });

  const issueCertificate = async (enrollmentId) => {
    setIssuingId(enrollmentId);
    setSuccessMessage("");

    setIssueErrors((previous) => ({
      ...previous,
      [enrollmentId]: "",
    }));

    try {
      const response = await apiRequest(
        `/academy/enrollments/${enrollmentId}/certificate/issue`,
        {
          method: "POST",
        }
      );

      if (!response?.success) {
        throw new Error(
          response?.message || "Certificate issuance was unsuccessful."
        );
      }

      setSuccessMessage(
        response.message || "Your certificate has been issued successfully."
      );

      await loadCertificates();
    } catch (error) {
      setIssueErrors((previous) => ({
        ...previous,
        [enrollmentId]:
          error.message || "Unable to issue this certificate.",
      }));
    } finally {
      setIssuingId("");
    }
  };

  if (loading) {
    return (
      <main className="academy-certificates-page">
        <div className="certificates-loading">
          <span className="certificate-spinner" />
          <p>Preparing your certificates...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="academy-certificates-page">
      <section className="certificates-hero">
        <div className="certificates-hero-content">
          <span className="certificates-eyebrow">
            ABS CUT FASHION ACADEMY
          </span>

          <h1>My Certificates</h1>

          <p>
            Celebrate your learning journey and showcase the skills
            you have developed at ABS CUT Fashion Academy.
          </p>
        </div>

        <div className="certificates-hero-decoration">
          <span className="decoration-ring ring-one" />
          <span className="decoration-ring ring-two" />
          <span className="decoration-star">✦</span>
        </div>
      </section>

      <section className="certificates-content">
        <div className="certificates-section-heading">
          <div>
            <span className="certificates-eyebrow">YOUR ACHIEVEMENTS</span>
            <h2>Earned Certificates</h2>
            <p>Your officially issued Academy certificates.</p>
          </div>

          <div className="certificate-count">
            <strong>{certificates.length}</strong>
            <span>
              {certificates.length === 1 ? "Certificate" : "Certificates"}
            </span>
          </div>
        </div>

        {pageError && (
          <div className="certificates-alert certificates-alert-error">
            <p>{pageError}</p>
            <button type="button" onClick={loadCertificates}>
              Try again
            </button>
          </div>
        )}

        {successMessage && (
          <div className="certificates-alert certificates-alert-success">
            {successMessage}
          </div>
        )}

        {!pageError && certificates.length === 0 && (
          <div className="certificates-empty">
            <div className="certificate-empty-icon">✦</div>
            <h3>Your certificates will appear here</h3>
            <p>
              Complete an eligible course to earn your official
              ABS CUT Fashion Academy certificate.
            </p>
          </div>
        )}

        {certificates.length > 0 && (
          <div className="certificates-grid">
            {certificates.map((certificate) => {
              const course = getCertificateCourse(certificate);
              const enrollmentId = getEnrollmentId(certificate);
              const isRevoked =
                certificate.verificationStatus === "revoked";

              return (
                <article
                  className="certificate-card"
                  key={certificate._id}
                >
                  <div className="certificate-card-art">
                    <div className="certificate-art-border">
                      <span className="certificate-art-star">✦</span>
                      <span className="certificate-art-name">
                        ABS CUT
                      </span>
                      <span className="certificate-art-label">
                        CERTIFICATE OF ACHIEVEMENT
                      </span>
                    </div>
                  </div>

                  <div className="certificate-card-body">
                    <div className="certificate-card-topline">
                      <span className="certificate-type">
                        FASHION ACADEMY
                      </span>

                      <span
                        className={`certificate-status ${
                          isRevoked ? "revoked" : "valid"
                        }`}
                      >
                        {isRevoked ? "Revoked" : "Valid"}
                      </span>
                    </div>

                    <h3>
                      {certificate.courseTitle ||
                        course.title ||
                        "Fashion Academy Course"}
                    </h3>

                    <p className="certificate-number">
                      Certificate No:{" "}
                      <strong>
                        {certificate.certificateNumber || "Unavailable"}
                      </strong>
                    </p>

                    <p className="certificate-issued-date">
                      Issued {formatDate(certificate.issuedAt)}
                    </p>

                    {enrollmentId && (
                      <Link
                        to={`/academy/certificates/${enrollmentId}`}
                        className="certificate-view-button"
                      >
                        View Certificate <span>→</span>
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="eligible-courses-section">
          <div className="certificates-section-heading">
            <div>
              <span className="certificates-eyebrow">
                YOUR NEXT ACHIEVEMENT
              </span>
              <h2>Ready for Your Certificate?</h2>
              <p>
                Completed eligible courses awaiting certificate issuance.
              </p>
            </div>
          </div>

          {eligibleEnrollments.length === 0 ? (
            <div className="eligible-empty">
              <span>✧</span>
              <p>
                There are no completed courses awaiting certificates
                right now.
              </p>
            </div>
          ) : (
            <div className="eligible-course-list">
              {eligibleEnrollments.map((enrollment) => {
                const course = getCourse(enrollment);
                const enrollmentId = String(enrollment._id);

                return (
                  <article
                    className="eligible-course-card"
                    key={enrollmentId}
                  >
                    <div className="eligible-course-info">
                      <span className="eligible-course-label">
                        COURSE COMPLETED
                      </span>

                      <h3>{course.title || "Completed course"}</h3>

                      <p>
                        {course.category || "Fashion"} ·{" "}
                        {enrollment.progressPercentage || 100}% completed
                      </p>

                      {issueErrors[enrollmentId] && (
                        <p className="certificate-issue-error">
                          {issueErrors[enrollmentId]}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="certificate-issue-button"
                      disabled={Boolean(issuingId)}
                      onClick={() => issueCertificate(enrollmentId)}
                    >
                      {issuingId === enrollmentId
                        ? "Issuing..."
                        : "Get Certificate"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Certificates;
