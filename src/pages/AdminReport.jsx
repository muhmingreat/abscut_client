
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import "./AdminReport.css";

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const number = (value) =>
  new Intl.NumberFormat("en-NG").format(Number(value) || 0);

const readable = (value) =>
  String(value || "unknown")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function SummaryCard({ icon, label, value, note, accent = "" }) {
  return (
    <article className={`report-stat-card ${accent}`}>
      <div className="report-stat-top">
        <span className="report-stat-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="report-stat-mark">ABS CUT</span>
      </div>

      <p className="report-stat-label">{label}</p>
      <h2>{value}</h2>
      <p className="report-stat-note">{note}</p>
    </article>
  );
}

function BreakdownList({
  title,
  description,
  rows = [],
  valueKey = "count",
  formatValue = number,
  emptyMessage = "No records found for this period.",
}) {
  const maxValue = Math.max(
    1,
    ...rows.map((row) => Number(row[valueKey]) || 0)
  );

  return (
    <section className="report-panel">
      <div className="report-panel-heading">
        <div>
          <p className="report-eyebrow">REPORT BREAKDOWN</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="report-empty">{emptyMessage}</div>
      ) : (
        <div className="report-breakdown-list">
          {rows.map((row, index) => {
            const value = Number(row[valueKey]) || 0;
            const percentage = Math.min(
              100,
              Math.max(0, (value / maxValue) * 100)
            );

            return (
              <div className="report-breakdown-item" key={`${row._id}-${index}`}>
                <div className="report-breakdown-labels">
                  <span>{readable(row._id)}</span>
                  <strong>{formatValue(value)}</strong>
                </div>

                <div
                  className="report-progress-track"
                  role="progressbar"
                  aria-label={`${readable(row._id)}: ${formatValue(value)}`}
                  aria-valuemin={0}
                  aria-valuemax={maxValue}
                  aria-valuenow={value}
                >
                  <span
                    className="report-progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReportTable({ title, rows = [], columns }) {
  return (
    <section className="report-panel">
      <div className="report-panel-heading">
        <div>
          <p className="report-eyebrow">DETAILED REPORT</p>
          <h2>{title}</h2>
        </div>
        <span className="report-record-count">
          {number(rows.length)} categories
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="report-empty">No records found for this period.</div>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row._id}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function makeCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\r\n");
}

function downloadCsv(filename, rows) {
  const csv = "\uFEFF" + makeCsv(rows);
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getToday() {
  const date = new Date();
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 10);
}

function getErrorMessage(error) {
  return error?.message || "Unable to load reports. Please try again.";
}

function AdminReports() {
  const [report, setReport] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedDates, setAppliedDates] = useState({
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async (filters = {}) => {
    try {
      setError("");
      setLoading((current) => current && !report);
      setRefreshing(true);

      const params = new URLSearchParams();

      if (filters.startDate) {
        params.set("startDate", filters.startDate);
      }

      if (filters.endDate) {
        params.set("endDate", filters.endDate);
      }

      const query = params.toString();
      const endpoint = `/admin/reports/overview${
        query ? `?${query}` : ""
      }`;

      const response = await apiRequest(endpoint);

      if (response?.success === false) {
        throw new Error(
          response.message || "Unable to load the reports."
        );
      }

      const payload = response?.data || response;

      if (!payload?.overview) {
        throw new Error(
          "The reports API returned an unexpected response."
        );
      }

      setReport(payload);
    } catch (err) {
      console.error("ABS CUT reports error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [report]);

  useEffect(() => {
    loadReport();
  }, []); // Load the all-time report when the page first opens.

  const applyFilters = (event) => {
    event.preventDefault();

    if (startDate && endDate && startDate > endDate) {
      setError("The start date must be on or before the end date.");
      return;
    }

    const filters = { startDate, endDate };
    setAppliedDates(filters);
    loadReport(filters);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setAppliedDates({ startDate: "", endDate: "" });
    loadReport({});
  };

  const overview = report?.overview || {};
  const orderStatuses = report?.orderStatusSummary || [];
  const customStatuses = report?.customOrderStatusSummary || [];
  const paymentStatuses = report?.paymentStatusSummary || [];
  const providers = report?.paymentProviderSummary || [];
  const inventory = report?.inventoryMovementSummary || [];

  const ledgerPaymentRows = useMemo(
    () =>
      paymentStatuses.map((row) => ({
        _id: row._id,
        count: Number(row.count) || 0,
        amount: Number(row.amount) || 0,
      })),
    [paymentStatuses]
  );

  const exportReport = () => {
    if (!report) return;

    const rows = [
      ["ABS CUT ADMIN REPORT"],
      ["Generated at", new Date().toLocaleString("en-NG")],
      ["Start date", appliedDates.startDate || "All time"],
      ["End date", appliedDates.endDate || "All time"],
      [],
      ["OVERVIEW"],
      ["Metric", "Value"],
      ["Regular orders", overview.totalOrders || 0],
      ["Custom orders", overview.totalCustomOrders || 0],
      ["Payment records", overview.totalPaymentRecords || 0],
      ["Successful payments", overview.successfulPaymentCount || 0],
      ["Successful ledger revenue (NGN)", overview.successfulLedgerRevenue || 0],
      ["Inventory movements", overview.totalInventoryMovements || 0],
      [],
      ["REGULAR ORDER STATUS"],
      ["Status", "Order count", "Order value (NGN)"],
      ...orderStatuses.map((row) => [
        readable(row._id),
        row.count || 0,
        row.orderValue || 0,
      ]),
      [],
      ["CUSTOM ORDER STATUS"],
      ["Status", "Order count", "Quoted value (NGN)", "Amount paid (NGN)"],
      ...customStatuses.map((row) => [
        readable(row._id),
        row.count || 0,
        row.quotedValue || 0,
        row.amountPaid || 0,
      ]),
      [],
      ["PAYMENT STATUS"],
      ["Status", "Payment count", "Recorded amount (NGN)"],
      ...ledgerPaymentRows.map((row) => [
        readable(row._id),
        row.count,
        row.amount,
      ]),
      [],
      ["SUCCESSFUL PAYMENTS BY PROVIDER"],
      ["Provider", "Payment count", "Recorded amount (NGN)"],
      ...providers.map((row) => [
        readable(row._id),
        row.count || 0,
        row.amount || 0,
      ]),
      [],
      ["INVENTORY MOVEMENTS"],
      ["Movement type", "Movement count", "Net quantity change"],
      ...inventory.map((row) => [
        readable(row._id),
        row.movementCount || 0,
        row.netQuantityChange || 0,
      ]),
      [],
      ["Revenue note", report.revenueNote || ""],
    ];

    downloadCsv(
      `abs-cut-report-${getToday()}.csv`,
      rows
    );
  };

  if (loading && !report) {
    return (
      <main className="admin-reports-page">
        <section className="report-state-card">
          <span className="report-spinner" />
          <h2>Preparing your reports</h2>
          <p>Gathering ABS CUT business figures securely...</p>
        </section>
      </main>
    );
  }

  if (error && !report) {
    return (
      <main className="admin-reports-page">
        <section className="report-state-card report-state-error">
          <span className="report-state-symbol">!</span>
          <p className="report-eyebrow">ABS CUT ADMIN</p>
          <h1>Reports could not load</h1>
          <p>{error}</p>
          <button
            type="button"
            className="report-button report-button-primary"
            onClick={() => loadReport(appliedDates)}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-reports-page">
      <div className="admin-reports-container">
        <header className="reports-hero">
          <div className="reports-hero-decoration reports-hero-decoration-one" />
          <div className="reports-hero-decoration reports-hero-decoration-two" />

          <div className="reports-hero-content">
            <p className="reports-hero-eyebrow">
              <span /> ABS CUT BUSINESS INTELLIGENCE
            </p>

            <h1>
              Reports & <span>Analytics</span>
            </h1>

            <p className="reports-hero-description">
              Understand your sales, custom tailoring orders, payments,
              and inventory from one elegant dashboard.
            </p>

            <div className="reports-hero-meta">
              <span className="reports-live-dot" />
              {refreshing ? "Updating report..." : "Reports connected"}
              <span className="reports-meta-divider">|</span>
              {appliedDates.startDate || appliedDates.endDate
                ? `${appliedDates.startDate || "Beginning"} — ${
                    appliedDates.endDate || "Today"
                  }`
                : "All available dates"}
            </div>
          </div>

          <div className="reports-hero-monogram" aria-hidden="true">
            <span>A</span>
            <span>C</span>
            <i />
          </div>
        </header>

        <section className="reports-toolbar">
          <div className="reports-toolbar-title">
            <p className="report-eyebrow">YOUR BUSINESS AT A GLANCE</p>
            <h2>Performance overview</h2>
          </div>

          <div className="reports-toolbar-actions">
            <button
              type="button"
              className="report-button report-button-secondary"
              onClick={() => loadReport(appliedDates)}
              disabled={refreshing}
            >
              <span className={refreshing ? "report-refresh-spin" : ""}>
                ↻
              </span>
              Refresh
            </button>

            <button
              type="button"
              className="report-button report-button-primary"
              onClick={exportReport}
              disabled={!report}
            >
              <span aria-hidden="true">↓</span>
              Export CSV
            </button>
          </div>
        </section>

        {error && (
          <div className="report-inline-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadReport(appliedDates)}
            >
              Retry
            </button>
          </div>
        )}

        <form className="reports-filter-panel" onSubmit={applyFilters}>
          <div className="reports-filter-heading">
            <span className="reports-filter-icon" aria-hidden="true">
              ◷
            </span>
            <div>
              <h3>Filter reports by date</h3>
              <p>Choose a start date, end date, or both.</p>
            </div>
          </div>

          <div className="reports-filter-fields">
            <label>
              <span>Start date</span>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label>
              <span>End date</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <button
              type="submit"
              className="report-button report-button-primary"
              disabled={refreshing}
            >
              Apply filters
            </button>

            <button
              type="button"
              className="report-button report-button-text"
              onClick={clearFilters}
              disabled={refreshing && !startDate && !endDate}
            >
              Clear
            </button>
          </div>
        </form>

        <section className="reports-stats-grid">
          <SummaryCard
            icon="▤"
            label="Ready-to-wear orders"
            value={number(overview.totalOrders)}
            note="Regular product orders created"
          />

          <SummaryCard
            icon="✦"
            label="Custom orders"
            value={number(overview.totalCustomOrders)}
            note="Tailoring and custom-service requests"
            accent="report-stat-gold"
          />

          <SummaryCard
            icon="₦"
            label="Successful ledger revenue"
            value={money(overview.successfulLedgerRevenue)}
            note={`${number(overview.successfulPaymentCount)} successful ledger payments`}
            accent="report-stat-revenue"
          />

          <SummaryCard
            icon="⇄"
            label="Inventory movements"
            value={number(overview.totalInventoryMovements)}
            note="Recorded stock movement entries"
            accent="report-stat-inventory"
          />
        </section>

        <div className="reports-section-heading">
          <div>
            <p className="report-eyebrow">ORDERS & FULFILMENT</p>
            <h2>Order performance</h2>
          </div>
          <span className="reports-section-line" />
        </div>

        <div className="reports-two-column">
          <BreakdownList
            title="Ready-to-wear orders"
            description="Order count grouped by current order status."
            rows={orderStatuses}
            valueKey="count"
          />

          <BreakdownList
            title="Custom orders"
            description="Custom requests grouped by current status."
            rows={customStatuses}
            valueKey="count"
          />
        </div>

        <div className="reports-two-column reports-second-row">
          <ReportTable
            title="Regular order value by status"
            rows={orderStatuses}
            columns={[
              {
                key: "_id",
                label: "Order status",
                render: (value) => (
                  <span className="report-status-label">
                    {readable(value)}
                  </span>
                ),
              },
              {
                key: "count",
                label: "Orders",
                render: number,
              },
              {
                key: "orderValue",
                label: "Order value",
                render: money,
              },
            ]}
          />

          <ReportTable
            title="Custom order values"
            rows={customStatuses}
            columns={[
              {
                key: "_id",
                label: "Status",
                render: (value) => (
                  <span className="report-status-label">
                    {readable(value)}
                  </span>
                ),
              },
              {
                key: "count",
                label: "Orders",
                render: number,
              },
              {
                key: "quotedValue",
                label: "Quoted value",
                render: money,
              },
              {
                key: "amountPaid",
                label: "Amount paid",
                render: money,
              },
            ]}
          />
        </div>

        <div className="reports-section-heading">
          <div>
            <p className="report-eyebrow">PAYMENT MONITORING</p>
            <h2>Payment performance</h2>
          </div>
          <span className="reports-section-line" />
        </div>

        <div className="reports-two-column">
          <BreakdownList
            title="Payment statuses"
            description="Payment records grouped by ledger status."
            rows={paymentStatuses}
            valueKey="count"
          />

          <BreakdownList
            title="Successful payments by provider"
            description="Recorded successful payment amounts by provider."
            rows={providers}
            valueKey="amount"
            formatValue={money}
          />
        </div>

        <ReportTable
          title="Payment status details"
          rows={ledgerPaymentRows}
          columns={[
            {
              key: "_id",
              label: "Payment status",
              render: (value) => (
                <span className="report-status-label">
                  {readable(value)}
                </span>
              ),
            },
            {
              key: "count",
              label: "Records",
              render: number,
            },
            {
              key: "amount",
              label: "Recorded amount",
              render: money,
            },
          ]}
        />

        <ReportTable
          title="Successful payments by provider"
          rows={providers}
          columns={[
            {
              key: "_id",
              label: "Provider",
              render: (value) => readable(value),
            },
            {
              key: "count",
              label: "Successful payments",
              render: number,
            },
            {
              key: "amount",
              label: "Recorded revenue",
              render: money,
            },
          ]}
        />

        <div className="reports-section-heading">
          <div>
            <p className="report-eyebrow">STOCK CONTROL</p>
            <h2>Inventory movement</h2>
          </div>
          <span className="reports-section-line" />
        </div>

        <ReportTable
          title="Stock movement summary"
          rows={inventory}
          columns={[
            {
              key: "_id",
              label: "Movement type",
              render: (value) => readable(value),
            },
            {
              key: "movementCount",
              label: "Entries",
              render: number,
            },
            {
              key: "netQuantityChange",
              label: "Net quantity change",
              render: (value) => {
                const quantity = Number(value) || 0;
                return (
                  <span
                    className={
                      quantity > 0
                        ? "report-quantity-positive"
                        : quantity < 0
                        ? "report-quantity-negative"
                        : ""
                    }
                  >
                    {quantity > 0 ? "+" : ""}
                    {number(quantity)}
                  </span>
                );
              },
            },
          ]}
        />

        <footer className="reports-footer">
          <div className="reports-footer-mark">AC</div>
          <div>
            <strong>ABS CUT</strong>
            <p>
              {report?.revenueNote ||
                "Revenue reflects successful payment ledger records."}
            </p>
          </div>
          <span className="reports-footer-star" aria-hidden="true">
            ✦
          </span>
        </footer>
      </div>
    </main>
  );
}

export default AdminReports;
