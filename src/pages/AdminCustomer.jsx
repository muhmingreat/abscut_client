import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import "./AdminCustomer.css";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  emailVerified: false,
  role: "customer",
};

function AdminCustomer() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search,
      });

      const result = await apiRequest(`/admin/customers?${query.toString()}`);

      setCustomers(result.customers || []);
      setPagination((previous) => ({
        ...previous,
        ...(result.pagination || {}),
      }));
    } catch (err) {
      setError(err.message || "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPagination((previous) => ({
      ...previous,
      page: 1,
    }));
    setSearch(searchInput.trim());
    setNotice("");
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      emailVerified: Boolean(customer.emailVerified),
      role: form.role || "customer",
    });
    setError("");
    setNotice("");
  };

  const closeEdit = () => {
    if (saving) return;
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
  };

  const handleFieldChange = (event) => {
    const { name, value, checked, type } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!editingCustomer) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `/admin/customers/${editingCustomer._id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            emailVerified: form.emailVerified,
            role: form.role,
          }),
        },
      );

      const updatedCustomer = result.customer;

      setCustomers((previous) =>
        previous.map((customer) =>
          customer._id === editingCustomer._id
            ? { ...customer, ...updatedCustomer, _id: customer._id }
            : customer,
        ),
      );

      setEditingCustomer(null);
      setForm(EMPTY_FORM);
      setNotice(result.message || "Customer updated successfully.");

      // Refresh results in case the edited email or name
      // changes whether the customer matches the search.
      await loadCustomers();
    } catch (err) {
      setError(err.message || "Unable to update customer.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer || deleting) return;

    setDeleting(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `/admin/customers/${deletingCustomer._id}`,
        { method: "DELETE" },
      );

      const deletedId = deletingCustomer._id;

      setDeletingCustomer(null);
      setCustomers((previous) =>
        previous.filter((customer) => customer._id !== deletedId),
      );

      setNotice(result.message || "Customer deleted successfully.");

      // Refresh totals and pagination from the server.
      await loadCustomers();
    } catch (err) {
      setError(err.message || "Unable to delete customer.");
    } finally {
      setDeleting(false);
    }
  };

  const changePage = (nextPage) => {
    setPagination((previous) => ({
      ...previous,
      page: nextPage,
    }));
  };

  const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <main className="ac-customers-page">
      <div className="ac-customers-shell">
        <header className="ac-customers-header">
          <div>
            <span className="ac-eyebrow">ABS CUT ADMINISTRATION</span>
            <h1>Customer Management</h1>
            <p>
              Manage customer profiles and account information from one place.
            </p>
          </div>

          <button
            type="button"
            className="ac-refresh-button"
            onClick={() => {
              setNotice("");
              loadCustomers();
            }}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>
            Refresh
          </button>
        </header>

        <section className="ac-customer-summary">
          <div className="ac-summary-icon" aria-hidden="true">
            ♙
          </div>

          <div>
            <span>Total registered customers</span>
            <strong>
              {loading && pagination.total === 0
                ? "—"
                : pagination.total.toLocaleString("en-NG")}
            </strong>
          </div>

          <div className="ac-summary-caption">Customer accounts only</div>
        </section>

        <section className="ac-customer-panel">
          <div className="ac-panel-heading">
            <div>
              <h2>Customer directory</h2>
              <p>Search and manage registered customer accounts.</p>
            </div>
          </div>

          <form className="ac-search-form" onSubmit={handleSearch}>
            <label className="ac-search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search name, email or phone..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Search customers"
              />
            </label>

            <button className="ac-primary-button" type="submit">
              Search
            </button>

            {search && (
              <button
                className="ac-secondary-button"
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPagination((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              >
                Clear
              </button>
            )}
          </form>

          {notice && (
            <div className="ac-notice" role="status">
              {notice}
            </div>
          )}

          {error && (
            <div className="ac-error" role="alert">
              {error}
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="ac-state">
              <span className="ac-spinner" />
              <p>Loading customer accounts...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="ac-state">
              <div className="ac-empty-icon" aria-hidden="true">
                ♙
              </div>
              <h3>No customers found</h3>
              <p>
                {search
                  ? "Try a different name, email or phone number."
                  : "Customer accounts will appear here when available."}
              </p>
            </div>
          ) : (
            <>
              <div className="ac-table-scroll">
                <table className="ac-customer-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Account type</th>
                      <th>Joined</th>
                      <th>Verification</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer._id}>
                        <td>
                          <div className="ac-customer-identity">
                            <div className="ac-avatar">
                              {customer.firstName?.charAt(0)?.toUpperCase() ||
                                "C"}
                              {customer.lastName?.charAt(0)?.toUpperCase() ||
                                ""}
                            </div>

                            <div>
                              <strong>
                                {customer.firstName} {customer.lastName}
                              </strong>
                              <span className="ac-customer-id">
                                ID: {String(customer._id).slice(-8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="ac-contact-details">
                            <span>{customer.email}</span>
                            <span>{customer.phone || "No phone provided"}</span>
                          </div>
                        </td>

                        <td>
                          {/* <span className="ac-role-pill">
                            {customer.authProvider || "local"}
                          </span> */}
                          <span className="ac-role-pill">
                            {customer.role || "customer"}
                          </span>
                        </td>

                        <td>{formatDate(customer.createdAt)}</td>

                        <td>
                          <span
                            className={
                              customer.emailVerified
                                ? "ac-status ac-status-verified"
                                : "ac-status ac-status-unverified"
                            }
                          >
                            {customer.emailVerified ? "Verified" : "Unverified"}
                          </span>
                        </td>

                        <td>
                          <div className="ac-row-actions">
                            <button
                              type="button"
                              className="ac-edit-button"
                              onClick={() => openEdit(customer)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="ac-delete-button"
                              onClick={() => {
                                setDeletingCustomer(customer);
                                setError("");
                                setNotice("");
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <footer className="ac-pagination">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1}
                  {"–"}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} customers
                </span>

                <div className="ac-pagination-controls">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => changePage(pagination.page - 1)}
                  >
                    Previous
                  </button>

                  <span>
                    {pagination.page} / {Math.max(1, pagination.totalPages)}
                  </span>

                  <button
                    type="button"
                    disabled={
                      pagination.page >= pagination.totalPages ||
                      pagination.totalPages === 0
                    }
                    onClick={() => changePage(pagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>

      {editingCustomer && (
        <div
          className="ac-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEdit();
          }}
        >
          <section
            className="ac-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ac-edit-title"
          >
            <header className="ac-modal-header">
              <div>
                <span className="ac-eyebrow">CUSTOMER PROFILE</span>
                <h2 id="ac-edit-title">Edit customer</h2>
                <p>Update the selected customer's information.</p>
              </div>

              <button
                type="button"
                className="ac-modal-close"
                onClick={closeEdit}
                disabled={saving}
                aria-label="Close edit form"
              >
                ×
              </button>
            </header>

            <form className="ac-edit-form" onSubmit={handleSave}>
              <div className="ac-form-grid">
                <label>
                  First name
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleFieldChange}
                    required
                    maxLength={100}
                  />
                </label>

                <label>
                  Last name
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleFieldChange}
                    required
                    maxLength={100}
                  />
                </label>

                <label className="ac-full-field">
                  Email address
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFieldChange}
                    required
                    maxLength={254}
                  />
                </label>

                <label className="ac-full-field">
                  Phone number
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleFieldChange}
                    maxLength={254}
                  />
                </label>

                <label className="ac-full-field">
                  Account role
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleFieldChange}
                    required
                  >
                    <option value="customer">Customer</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <small>
                    Administrator access grants access to protected
                    administrative features.
                  </small>
                </label>
              </div>

              <label className="ac-verification-option">
                <input
                  type="checkbox"
                  name="emailVerified"
                  checked={form.emailVerified}
                  onChange={handleFieldChange}
                />
                <span>
                  <strong>Email verified</strong>
                  <small>
                    Only enable this if the customer's email has actually been
                    verified.
                  </small>
                </span>
              </label>

              <div className="ac-modal-actions">
                <button
                  type="button"
                  className="ac-secondary-button"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ac-primary-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deletingCustomer && (
        <div
          className="ac-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setDeletingCustomer(null);
            }
          }}
        >
          <section
            className="ac-modal ac-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ac-delete-title"
          >
            <div className="ac-delete-symbol" aria-hidden="true">
              !
            </div>

            <h2 id="ac-delete-title">Delete customer account?</h2>

            <p>
              You selected{" "}
              <strong>
                {deletingCustomer.firstName} {deletingCustomer.lastName}
              </strong>
              . This action permanently deletes the user record and may affect
              access to their account.
            </p>

            <p className="ac-delete-warning">
              Related orders, payment records and support history are not
              automatically handled by this endpoint.
            </p>

            <div className="ac-modal-actions">
              <button
                type="button"
                className="ac-secondary-button"
                disabled={deleting}
                onClick={() => setDeletingCustomer(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ac-danger-confirm"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting..." : "Confirm deletion"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default AdminCustomer;
