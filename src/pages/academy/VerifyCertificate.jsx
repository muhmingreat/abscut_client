import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../services/api";
import "./VerifyCertificate.css";

function formatDate(date) {
  if (!date) return "Unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function VerifyCertificate() {
  const { certificateNumber: routeNumber } = useParams();

  const [certificateNumber, setCertificateNumber] = useState(routeNumber || "");
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const verifyCertificate = async (number) => {
    const cleanNumber = number.trim();

    if (!cleanNumber) {
      setError("Please enter a certificate number.");
      return;
    }

    setLoading(true);
    setError("");
    setCertificate(null);
    setSearched(true);

    try {
      const response = await apiRequest(
        `/academy/certificates/verify/${encodeURIComponent(cleanNumber)}`,
      );

      if (!response?.success || !response?.certificate) {
        throw new Error(
          response?.message || "Certificate could not be verified.",
        );
      }

      setCertificate(response.certificate);
    } catch (err) {
      setError(err.message || "We could not verify this certificate.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeNumber) {
      setCertificateNumber(routeNumber);
      verifyCertificate(routeNumber);
    }
  }, [routeNumber]);

  const handleSubmit = (event) => {
    event.preventDefault();
    verifyCertificate(certificateNumber);
  };

  const isRevoked = certificate?.verificationStatus === "revoked";

  return (
    <main className="verify-certificate-page">
      <section className="verify-certificate-hero">
        <span className="verify-hero-symbol">✦</span>
        <span className="verify-eyebrow">ABS CUT FASHION ACADEMY</span>
        <h1>Certificate Verification</h1>
        <p>
          Confirm the authenticity and current status of an ABS CUT Fashion
          Academy certificate.
        </p>
      </section>

      <section className="verify-certificate-content">
        <form className="verify-certificate-form" onSubmit={handleSubmit}>
          <label htmlFor="certificate-number">Certificate Number</label>

          <div className="verify-input-row">
            <input
              id="certificate-number"
              type="text"
              value={certificateNumber}
              onChange={(event) => setCertificateNumber(event.target.value)}
              placeholder="Enter certificate number"
              autoComplete="off"
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Checking..." : "Verify"}
            </button>
          </div>

          <small>
            Enter the unique certificate number printed on the certificate.
          </small>
        </form>

        {loading && (
          <div className="verify-loading">
            <span className="verify-spinner" />
            <p>Checking certificate records...</p>
          </div>
        )}

        {!loading && error && searched && (
          <div className="verify-result verify-result-invalid">
            <div className="verify-result-icon">!</div>
            <span className="verify-result-label">
              VERIFICATION UNSUCCESSFUL
            </span>
            <h2>Certificate not verified</h2>
            <p>{error}</p>
            <p>
              Check the certificate number and try again. If the problem
              continues, contact ABS CUT Fashion Academy.
            </p>
          </div>
        )}

        {!loading && certificate && (
          <div
            className={`verify-result ${
              isRevoked ? "verify-result-revoked" : "verify-result-valid"
            }`}
          >
            <div className="verify-result-icon">{isRevoked ? "!" : "✓"}</div>

            <span className="verify-result-label">
              {isRevoked ? "CERTIFICATE REVOKED" : "CERTIFICATE VERIFIED"}
            </span>

            <h2>
              {isRevoked
                ? "This certificate is no longer valid"
                : "Authentic Academy Certificate"}
            </h2>

            <p className="verify-result-description">
              {isRevoked
                ? "Our records show that this certificate has been revoked."
                : "This certificate matches an official ABS CUT Fashion Academy record."}
            </p>

            <div className="verify-record">
              <div className="verify-record-item">
                <span>Certificate Number</span>
                <strong>
                  {certificate.certificateNumber || "Unavailable"}
                </strong>
              </div>

              <div className="verify-record-item">
                <span>Student</span>
                <strong>{certificate.studentName || "Unavailable"}</strong>
              </div>

              <div className="verify-record-item">
                <span>Course</span>
                <strong>{certificate.courseTitle || "Unavailable"}</strong>
              </div>

              <div className="verify-record-item">
                <span>Instructor</span>
                <strong>{certificate.instructorName || "Unavailable"}</strong>
              </div>

              <div className="verify-record-item">
                <span>Issue Date</span>
                <strong>{formatDate(certificate.issuedAt)}</strong>
              </div>

              <div className="verify-record-item">
                <span>Issuing Institution</span>
                <strong>
                  {certificate.issuer || "ABS CUT Fashion Academy"}
                </strong>
              </div>

              <div className="verify-record-item">
                <span>Current Status</span>
                <strong
                  className={isRevoked ? "status-revoked" : "status-valid"}
                >
                  {isRevoked ? "Revoked" : "Valid"}
                </strong>
              </div>
            </div>
          </div>
        )}
        {isRevoked && certificate.revocationReason && (
          <p>Revocation reason: {certificate.revocationReason}</p>
        )}

        {!loading && !searched && (
          <div className="verify-instructions">
            <span>✧</span>
            <h3>How verification works</h3>
            <p>
              Enter the unique certificate number. Our verification system
              checks the official Academy records and reports the certificate's
              current status.
            </p>
          </div>
        )}

        <div className="verify-footer">
          <p>ABS CUT FASHION ACADEMY</p>
          <Link to="/academy">Explore the Academy →</Link>
        </div>
      </section>
    </main>
  );
}

export default VerifyCertificate;
