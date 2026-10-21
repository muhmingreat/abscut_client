
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import "./AdminInventory.css";

const EMPTY_SUMMARY = {
  totalProducts: 0,
  activeProducts: 0,
  totalUnits: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  lowStockThreshold: 5,
};

const MOVEMENT_LABELS = {
  opening_stock: "Opening stock",
  stock_added: "Stock added",
  sale: "Sale",
  cancellation_return: "Cancellation return",
  manual_adjustment: "Manual adjustment",
  return: "Return",
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-NG").format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

function AdminInventory() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [changeType, setChangeType] = useState("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryData, productData, movementData] =
        await Promise.all([
          apiRequest("/admin/inventory/summary"),
          apiRequest("/admin/products"),
          apiRequest("/admin/inventory/movements?page=1&limit=10"),
        ]);

      setSummary({
        ...EMPTY_SUMMARY,
        ...(summaryData.summary || {}),
      });

      setProducts(productData.products || []);
      setMovements(movementData.movements || []);

      setSelectedProductId((currentId) => {
        if (currentId && (productData.products || []).some(
          (product) => product._id === currentId
        )) {
          return currentId;
        }

        return productData.products?.[0]?._id || "";
      });
    } catch (err) {
      setError(err.message || "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query);

      const stock = Number(product.stock) || 0;

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" &&
          product.active !== false &&
          stock > 0 &&
          stock <= summary.lowStockThreshold) ||
        (stockFilter === "out" &&
          product.active !== false &&
          stock === 0) ||
        (stockFilter === "inactive" && product.active === false);

      return matchesSearch && matchesStock;
    });
  }, [products, search, stockFilter, summary.lowStockThreshold]);

  const selectedProduct = products.find(
    (product) => product._id === selectedProductId
  );

  const handleAdjustment = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const amount = Number(quantity);

    if (!selectedProductId) {
      setError("Select a product before adjusting stock.");
      return;
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Enter a positive whole-number quantity.");
      return;
    }

    if (!reason.trim()) {
      setError("Enter a reason for this stock adjustment.");
      return;
    }

    const quantityChange = changeType === "add" ? amount : -amount;

    if (
      selectedProduct &&
      Number(selectedProduct.stock) + quantityChange < 0
    ) {
      setError("You cannot remove more units than are currently in stock.");
      return;
    }

    setSaving(true);

    try {
      const result = await apiRequest(
        `/admin/inventory/products/${selectedProductId}/adjust-stock`,
        {
          method: "POST",
          body: JSON.stringify({
            quantityChange,
            reason: reason.trim(),
          }),
        }
      );

      setSuccess(result.message || "Stock updated successfully.");
      setQuantity("");
      setReason("");

      await loadInventory();
    } catch (err) {
      setError(err.message || "Unable to update stock.");
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (product) => {
    const stock = Number(product.stock) || 0;

    if (product.active === false) {
      return { label: "Inactive", className: "inactive" };
    }

    if (stock === 0) {
      return { label: "Out of stock", className: "out" };
    }

    if (stock <= summary.lowStockThreshold) {
      return { label: "Low stock", className: "low" };
    }

    return { label: "In stock", className: "available" };
  };

  const getMovementClass = (movement) => {
    if (movement.quantityChange > 0) return "positive";
    if (movement.type === "sale") return "negative";
    return "neutral";
  };

  return (
    <main className="inventory-page">
      <header className="inventory-heading">
        <div>
          <span className="inventory-eyebrow">ABS CUT MANAGEMENT</span>
          <h1>Inventory Control</h1>
          <p>
            Monitor stock levels, record stock changes, and follow your
            inventory movement history.
          </p>
        </div>

        <button
          type="button"
          className="inventory-refresh"
          onClick={loadInventory}
          disabled={loading}
        >
          <span aria-hidden="true">↻</span>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="inventory-alert inventory-alert-error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="inventory-alert inventory-alert-success" role="status">
          {success}
          <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <section className="inventory-stats" aria-label="Inventory summary">
        <article className="inventory-stat-card stat-products">
          <span className="inventory-stat-icon">◇</span>
          <span className="inventory-stat-label">Total products</span>
          <strong>{formatNumber(summary.totalProducts)}</strong>
          <small>{formatNumber(summary.activeProducts)} active products</small>
        </article>

        <article className="inventory-stat-card stat-units">
          <span className="inventory-stat-icon">▣</span>
          <span className="inventory-stat-label">Units in stock</span>
          <strong>{formatNumber(summary.totalUnits)}</strong>
          <small>Across active products</small>
        </article>

        <article className="inventory-stat-card stat-low">
          <span className="inventory-stat-icon">!</span>
          <span className="inventory-stat-label">Low stock</span>
          <strong>{formatNumber(summary.lowStockProducts)}</strong>
          <small>
            {`1–${summary.lowStockThreshold} units remaining`}
          </small>
        </article>

        <article className="inventory-stat-card stat-out">
          <span className="inventory-stat-icon">↘</span>
          <span className="inventory-stat-label">Out of stock</span>
          <strong>{formatNumber(summary.outOfStockProducts)}</strong>
          <small>Active products needing restock</small>
        </article>
      </section>

      <section className="inventory-workspace">
        <div className="inventory-panel inventory-products-panel">
          <div className="inventory-panel-heading">
            <div>
              <h2>Product stock</h2>
              <p>Search products and check their current stock.</p>
            </div>
            <span className="inventory-count">
              {filteredProducts.length} products
            </span>
          </div>

          <div className="inventory-toolbar">
            <label className="inventory-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search name or category..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <select
              aria-label="Filter products by stock status"
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
            >
              <option value="all">All products</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {loading ? (
            <div className="inventory-empty">
              <span className="inventory-loader" />
              Loading inventory...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="inventory-empty">
              <span>◇</span>
              <strong>No matching products</strong>
              <p>Try another search or stock filter.</p>
            </div>
          ) : (
            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product);

                    return (
                      <tr key={product._id}>
                        <td>
                          <div className="inventory-product-cell">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt=""
                                loading="lazy"
                              />
                            ) : (
                              <span className="inventory-product-placeholder">
                                A
                              </span>
                            )}
                            <div>
                              <strong>{product.name}</strong>
                              <small>{product.category}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong className="inventory-stock-number">
                            {formatNumber(product.stock)}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`inventory-status inventory-status-${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="inventory-select-button"
                            onClick={() => {
                              setSelectedProductId(product._id);
                              document
                                .getElementById("inventory-adjustment")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                            }}
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside
          className="inventory-panel inventory-adjust-panel"
          id="inventory-adjustment"
        >
          <div className="inventory-panel-heading">
            <div>
              <span className="inventory-eyebrow">STOCK MANAGEMENT</span>
              <h2>Adjust stock</h2>
              <p>Record stock received or a manual stock correction.</p>
            </div>
          </div>

          <form onSubmit={handleAdjustment} className="inventory-form">
            <label>
              Product
              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                required
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name}
                    {product.active === false ? " (Inactive)" : ""}
                  </option>
                ))}
              </select>
            </label>

            {selectedProduct && (
              <div className="inventory-current-stock">
                <span>Current stock</span>
                <strong>{formatNumber(selectedProduct.stock)} units</strong>
              </div>
            )}

            <fieldset className="inventory-change-options">
              <legend>Adjustment type</legend>
              <label className={changeType === "add" ? "selected" : ""}>
                <input
                  type="radio"
                  name="changeType"
                  value="add"
                  checked={changeType === "add"}
                  onChange={() => setChangeType("add")}
                />
                <span>＋</span>
                <span>Add stock</span>
              </label>
              <label className={changeType === "remove" ? "selected" : ""}>
                <input
                  type="radio"
                  name="changeType"
                  value="remove"
                  checked={changeType === "remove"}
                  onChange={() => setChangeType("remove")}
                />
                <span>−</span>
                <span>Remove stock</span>
              </label>
            </fieldset>

            <label>
              Quantity
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="Enter whole-number quantity"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </label>

            <label>
              Reason for adjustment
              <textarea
                rows="3"
                maxLength="500"
                placeholder={
                  changeType === "add"
                    ? "e.g. New stock received from supplier"
                    : "e.g. Stock count correction"
                }
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
              />
              <small className="inventory-character-count">
                {reason.length}/500 characters
              </small>
            </label>

            <button
              className="inventory-submit-button"
              type="submit"
              disabled={saving || loading || !selectedProductId}
            >
              {saving
                ? "Saving adjustment..."
                : changeType === "add"
                  ? "＋ Add stock"
                  : "− Remove stock"}
            </button>

            <p className="inventory-form-note">
              Every adjustment records the quantity before and after the
              change, its reason, and the administrator who made it.
            </p>
          </form>
        </aside>
      </section>

      <section className="inventory-panel inventory-history-panel">
        <div className="inventory-panel-heading">
          <div>
            <h2>Recent stock movements</h2>
            <p>A record of recent inventory changes.</p>
          </div>
          <span className="inventory-count">
            Latest {movements.length}
          </span>
        </div>

        {loading ? (
          <div className="inventory-empty">Loading movement history...</div>
        ) : movements.length === 0 ? (
          <div className="inventory-empty">
            <span>◷</span>
            <strong>No stock movements yet</strong>
            <p>Recorded inventory activity will appear here.</p>
          </div>
        ) : (
          <div className="inventory-table-wrap">
            <table className="inventory-table inventory-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Movement</th>
                  <th>Change</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Reason</th>
                  <th>Performed by</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const administrator = movement.performedBy;
                  const administratorName = administrator
                    ? [
                        administrator.firstName,
                        administrator.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                      administrator.name ||
                      administrator.email
                    : "System / unavailable";

                  return (
                    <tr key={movement._id}>
                      <td>{formatDate(movement.createdAt)}</td>
                      <td>
                        <strong>
                          {movement.product?.name || "Product unavailable"}
                        </strong>
                      </td>
                      <td>
                        {MOVEMENT_LABELS[movement.type] || movement.type}
                      </td>
                      <td>
                        <strong
                          className={`inventory-change-value ${getMovementClass(
                            movement
                          )}`}
                        >
                          {movement.quantityChange > 0 ? "+" : ""}
                          {formatNumber(movement.quantityChange)}
                        </strong>
                      </td>
                      <td>{formatNumber(movement.stockBefore)}</td>
                      <td>{formatNumber(movement.stockAfter)}</td>
                      <td>{movement.reason || "—"}</td>
                      <td>{administratorName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminInventory;
