
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../services/api";
import "./CertificateDetails.css";

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

function getStudentName(certificate) {
  if (certificate?.studentName) return certificate.studentName;

  const student = certificate?.student || {};

  return (
    student.fullName ||
    [student.firstName, student.lastName].filter(Boolean).join(" ") ||
    student.name ||
    "Student"
  );
}

function CertificateDetails() {
  const { enrollmentId } = useParams();

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCertificate = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await apiRequest(
          `/academy/certificates/enrollment/${enrollmentId}`
        );

        if (!response?.success || !response?.certificate) {
          throw new Error(
            response?.message || "Certificate could not be found."
          );
        }

        if (active) {
          setCertificate(response.certificate);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load this certificate."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (enrollmentId) loadCertificate();

    return () => {
      active = false;
    };
  }, [enrollmentId]);

  const copyVerificationLink = async () => {
    const url = `${window.location.origin}/academy/verify/${encodeURIComponent(
      certificate.certificateNumber
    )}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Could not copy the verification link. Please copy it manually.");
    }
  };

  if (loading) {
    return (
      <main className="certificate-details-page">
        <div className="certificate-details-loading">
          <span className="certificate-details-spinner" />
          <p>Preparing your certificate...</p>
        </div>
      </main>
    );
  }

  if (error || !certificate) {
    return (
      <main className="certificate-details-page">
        <div className="certificate-details-message">
          <span className="certificate-message-symbol">✦</span>
          <h2>Certificate unavailable</h2>
          <p>{error || "We could not find this certificate."}</p>
          <Link to="/academy/certificates">
            Back to My Certificates
          </Link>
        </div>
      </main>
    );
  }

  const course = certificate.course || {};
  const studentName = getStudentName(certificate);
  const courseTitle =
    certificate.courseTitle || course.title || "Fashion Academy Course";
  const instructorName =
    certificate.instructorName || "ABS CUT Fashion Academy";
  const isRevoked = certificate.verificationStatus === "revoked";

  const verificationPath = `/academy/verify/${encodeURIComponent(
    certificate.certificateNumber || ""
  )}`;

  return (
    <main className="certificate-details-page">
      <div className="certificate-details-container">
        <div className="certificate-details-heading no-print">
          <div>
            <span className="certificate-details-eyebrow">
              ABS CUT FASHION ACADEMY
            </span>
            <h1>Your Certificate</h1>
            <p>
              Your achievement, officially recognised by ABS CUT
              Fashion Academy.
            </p>
          </div>

          <Link
            to="/academy/certificates"
            className="certificate-back-link"
          >
            ← My Certificates
          </Link>
        </div>

        {isRevoked && (
          <div className="certificate-revoked-notice">
            <strong>This certificate has been revoked.</strong>
            <span>
              It is no longer considered a valid Academy certificate.
            </span>
            {certificate.revocationReason && (
              <p>Reason: {certificate.revocationReason}</p>
            )}
          </div>
        )}

        <section
          className={`official-certificate ${
            isRevoked ? "official-certificate-revoked" : ""
          }`}
        >
          <div className="official-certificate-inner">
            <div className="official-certificate-top">
              <span className="official-certificate-emblem">✦</span>
              <p>ABS CUT</p>
              <span className="official-certificate-academy">
                FASHION ACADEMY
              </span>
            </div>

            <div className="official-certificate-rule">
              <span>✧</span>
            </div>

            <div className="official-certificate-main">
              <span className="official-certificate-overline">
                CERTIFICATE OF ACHIEVEMENT
              </span>

              <h2>Certificate of Completion</h2>

              <p className="official-certificate-presented">
                This certificate is proudly presented to
              </p>

              <h3 className="official-certificate-student">
                {studentName}
              </h3>

              <div className="official-certificate-student-line" />

              <p className="official-certificate-description">
                In recognition of successfully completing the course
              </p>

              <h4 className="official-certificate-course">
                {courseTitle}
              </h4>

              <p className="official-certificate-recognition">
                and demonstrating commitment to learning and developing
                professional fashion skills through ABS CUT Fashion Academy.
              </p>
            </div>

            <div className="official-certificate-bottom">
              <div className="certificate-signature">
                <strong>{instructorName}</strong>
                <span />
                <small>INSTRUCTOR</small>
              </div>

              <div className="certificate-seal">
                <span>ABS</span>
                <small>VERIFIED</small>
              </div>

              <div className="certificate-date">
                <strong>{formatDate(certificate.issuedAt)}</strong>
                <span />
                <small>DATE ISSUED</small>
              </div>
            </div>

            <div className="official-certificate-footer">
              <span>
                CERTIFICATE NO:{" "}
                {certificate.certificateNumber || "Unavailable"}
              </span>
              <span>
                STATUS: {isRevoked ? "REVOKED" : "VALID"}
              </span>
            </div>
          </div>
        </section>

        <section className="certificate-verification-panel no-print">
          <div>
            <span className="certificate-details-eyebrow">
              CERTIFICATE AUTHENTICITY
            </span>
            <h2>Verify this achievement</h2>
            <p>
              Anyone can use the certificate number to check its
              authenticity and current status.
            </p>

            <div className="certificate-verification-number">
              {certificate.certificateNumber || "Unavailable"}
            </div>

            <Link
              to={verificationPath}
              className="certificate-verify-link"
            >
              Open verification page →
            </Link>
          </div>

          <button
            type="button"
            className="certificate-copy-button"
            onClick={copyVerificationLink}
            disabled={!certificate.certificateNumber}
          >
            {copied ? "Link copied" : "Copy verification link"}
          </button>
        </section>

        <div className="certificate-details-actions no-print">
          <button
            type="button"
            className="certificate-print-button"
            onClick={() => window.print()}
          >
            <span>↗</span> Print / Save as PDF
          </button>
        </div>
      </div>
    </main>
  );
}

export default CertificateDetails;
