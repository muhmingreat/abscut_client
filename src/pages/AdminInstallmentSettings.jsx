
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../services/api";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminInstallmentSettings.css";

const DEFAULT_SETTINGS = {
  enabled: true,
  minimumDepositType: "percentage",
  minimumDepositValue: 30,
  maxInstallments: 4,
  requireDepositBeforeProduction: true,
};

function AdminInstallmentSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest(
          "/payments/custom-order/installment-settings"
        );

        const savedSettings = response?.settings ?? response;

        if (active && savedSettings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...savedSettings,
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              "Unable to load installment settings. Check the backend route."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function updateSetting(name, value) {
    setSettings((current) => ({
      ...current,
      [name]: value,
    }));

    setSuccess("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        enabled: settings.enabled,
        minimumDepositType: settings.minimumDepositType,
        minimumDepositValue: Number(settings.minimumDepositValue),
        maxInstallments: Number(settings.maxInstallments),
        requireDepositBeforeProduction:
          settings.requireDepositBeforeProduction,
      };

      const response = await apiRequest(
        "/payments/custom-order/installment-settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const savedSettings = response?.settings;

      if (savedSettings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...savedSettings,
        });
      }

      setSuccess(
        response?.message || "Installment settings saved successfully."
      );
    } catch (err) {
      setError(err.message || "Unable to save installment settings.");
    } finally {
      setSaving(false);
    }
  }

  const depositDescription =
    settings.minimumDepositType === "percentage"
      ? `${settings.minimumDepositValue}% of the quoted total`
      : `₦${Number(
          settings.minimumDepositValue
        ).toLocaleString("en-NG")} minimum deposit`;

  return (
    <div className="admin-installments-page">
      <AdminSidebar />

      <main className="admin-installments-main">
        <header className="installments-header">
          <div>
            <span className="installments-eyebrow">
              PAYMENT MANAGEMENT
            </span>
            <h1>Installment Settings</h1>
            <p>
              Configure how customers pay for their ABS CUT custom orders.
              These rules do not change payment requirements for ordinary
              product orders.
            </p>
          </div>

          <Link to="/admin/payments" className="installments-back-link">
            <span aria-hidden="true">←</span> Payments
          </Link>
        </header>

        {error && (
          <div className="installments-alert installments-alert-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div
            className="installments-alert installments-alert-success"
            role="status"
          >
            {success}
          </div>
        )}

        {loading ? (
          <div className="installments-loading">
            <span className="installments-spinner" />
            <p>Loading payment settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <section className="installments-panel">
              <div className="installments-panel-heading">
                <div className="installments-heading-icon">₦</div>
                <div>
                  <h2>Installment payments</h2>
                  <p>Control whether custom-order customers can pay in stages.</p>
                </div>
              </div>

              <label className="installments-toggle-row">
                <span>
                  <strong>Enable installment payments</strong>
                  <small>
                    Allow customers to pay their custom-order balance over
                    multiple payments.
                  </small>
                </span>

                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) =>
                    updateSetting("enabled", event.target.checked)
                  }
                />
              </label>
            </section>

            <section className="installments-panel">
              <div className="installments-panel-heading">
                <div className="installments-heading-icon">%</div>
                <div>
                  <h2>Minimum deposit</h2>
                  <p>Set the minimum amount a customer must pay initially.</p>
                </div>
              </div>

              <div className="installments-form-grid">
                <label className="installments-field">
                  <span>Deposit calculation</span>
                  <select
                    value={settings.minimumDepositType}
                    onChange={(event) =>
                      updateSetting(
                        "minimumDepositType",
                        event.target.value
                      )
                    }
                    disabled={!settings.enabled}
                  >
                    <option value="percentage">
                      Percentage of quotation
                    </option>
                    <option value="fixed">Fixed amount in naira</option>
                  </select>
                </label>

                <label className="installments-field">
                  <span>
                    Minimum deposit{" "}
                    {settings.minimumDepositType === "percentage"
                      ? "(%)"
                      : "(₦)"}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={
                      settings.minimumDepositType === "percentage"
                        ? "100"
                        : undefined
                    }
                    step="0.01"
                    value={settings.minimumDepositValue}
                    onChange={(event) =>
                      updateSetting(
                        "minimumDepositValue",
                        event.target.value
                      )
                    }
                    required
                    disabled={!settings.enabled}
                  />
                  <small>
                    {settings.minimumDepositType === "percentage"
                      ? "Enter a value between 1 and 100."
                      : "Enter a positive amount in naira."}
                  </small>
                </label>

                <label className="installments-field">
                  <span>Maximum number of payments</span>
                  <select
                    value={settings.maxInstallments}
                    onChange={(event) =>
                      updateSetting("maxInstallments", event.target.value)
                    }
                    disabled={!settings.enabled}
                  >
                    {Array.from({ length: 11 }, (_, index) => index + 2).map(
                      (count) => (
                        <option key={count} value={count}>
                          {count} payments
                        </option>
                      )
                    )}
                  </select>
                  <small>
                    Includes the initial deposit.
                  </small>
                </label>
              </div>
            </section>

            <section className="installments-panel">
              <div className="installments-panel-heading">
                <div className="installments-heading-icon">✓</div>
                <div>
                  <h2>Production requirements</h2>
                  <p>Decide whether a deposit is required before production.</p>
                </div>
              </div>

              <label className="installments-toggle-row">
                <span>
                  <strong>Require deposit before production</strong>
                  <small>
                    When enabled, production must not begin until the
                    configured minimum deposit has been received.
                  </small>
                </span>

                <input
                  type="checkbox"
                  checked={settings.requireDepositBeforeProduction}
                  onChange={(event) =>
                    updateSetting(
                      "requireDepositBeforeProduction",
                      event.target.checked
                    )
                  }
                />
              </label>
            </section>

            <section className="installments-preview">
              <div>
                <span className="installments-eyebrow">CURRENT POLICY</span>
                <h3>
                  {settings.enabled
                    ? "Installments enabled"
                    : "Full payment policy"}
                </h3>
                <p>
                  {settings.enabled
                    ? `Minimum deposit: ${depositDescription}. Customers can make up to ${settings.maxInstallments} payments.`
                    : "New custom-order installment payments are disabled. Customers must follow the payment options permitted by the server."}
                </p>
              </div>

              <div className="installments-preview-symbol" aria-hidden="true">
                ₦
              </div>
            </section>

            <footer className="installments-form-footer">
              <p>Changes apply only after the server accepts and saves them.</p>

              <button
                type="submit"
                className="installments-save-button"
                disabled={saving}
              >
                {saving ? "Saving settings..." : "Save settings"}
              </button>
            </footer>
          </form>
        )}
      </main>
    </div>
  );
}

export default AdminInstallmentSettings;