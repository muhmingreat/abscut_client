import { createContext, useContext, useEffect, useState } from "react";

import { apiRequest } from "../services/api";

const AppContext = createContext(null);

// =========================================================
// CART HELPERS
// =========================================================

const getProductId = (item) =>
  String(
    item?.product?._id ||
      item?.product?.id ||
      item?._id ||
      item?.id ||
      item?.productId ||
      "",
  );

const getPurchaseMode = (item) =>
  item?.purchaseMode === "digital" ? "digital" : "physical";

const getPriceUnit = (item) => {
  if (item?.priceUnit) {
    return item.priceUnit;
  }

  if (item?.productType === "raw_material") {
    return "yard";
  }

  if (item?.productType === "ready_to_wear") {
    return "piece";
  }

  return "design";
};

const getQuantityStep = (item) =>
  getPriceUnit(item) === "yard" && getPurchaseMode(item) === "physical"
    ? 0.5
    : 1;

const getUnitPrice = (product, purchaseMode) => {
  if (purchaseMode === "digital") {
    return Number(product.digitalPrice ?? product.price ?? 0);
  }

  return Number(product.physicalPrice ?? product.price ?? 0);
};

const normalizeCartItem = (item) => {
  const product =
    item?.product && typeof item.product === "object" ? item.product : item;

  if (!product) {
    return null;
  }

  const productId = getProductId(product);

  if (!productId) {
    return null;
  }

  const purchaseMode = getPurchaseMode(item);
  const priceUnit = item?.priceUnit || getPriceUnit(product);

  const quantity = Number(item?.quantity ?? 1);

  return {
    ...product,

    id: productId,
    _id: productId,

    purchaseMode,
    priceUnit,

    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,

    price: getUnitPrice(product, purchaseMode),
  };
};

const normalizeCartItems = (items = []) =>
  (Array.isArray(items) ? items : []).map(normalizeCartItem).filter(Boolean);

const getCartItemKey = (item) =>
  `${getProductId(item)}-${getPurchaseMode(item)}`;

const isSameCartItem = (first, second) =>
  getProductId(first) === getProductId(second) &&
  getPurchaseMode(first) === getPurchaseMode(second);

// Accept either a complete cart item or a product ID.
// Passing the complete item is recommended because the same
// product can exist in both physical and digital modes.
const resolveCartItem = (itemOrId, purchaseMode) => {
  if (itemOrId && typeof itemOrId === "object") {
    return {
      productId: getProductId(itemOrId),
      purchaseMode: getPurchaseMode(itemOrId),
    };
  }

  return {
    productId: String(itemOrId || ""),
    purchaseMode: purchaseMode || "physical",
  };
};

// =========================================================
// APP PROVIDER
// =========================================================

export function AppProvider({ children }) {
  // =======================================================
  // CART STATE
  // =======================================================

  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem("absCutCart");

      if (!savedCart) {
        return [];
      }

      const parsedCart = JSON.parse(savedCart);

      if (!Array.isArray(parsedCart)) {
        return [];
      }

      return normalizeCartItems(parsedCart);
    } catch (error) {
      console.error("Could not load ABS CUT cart:", error);

      return [];
    }
  });

  const [cartLoading, setCartLoading] = useState(false);

  const [cartActionLoading, setCartActionLoading] = useState(null);

  const [cartMergePending, setCartMergePending] = useState(false);

  // =======================================================
  // AUTHENTICATION STATE
  // =======================================================

  const [currentUser, setCurrentUser] = useState(null);

  const [token, setToken] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  // =======================================================
  // VERIFY AUTHENTICATION
  // =======================================================

  useEffect(() => {
    const verifyAuthentication = async () => {
      const savedToken = localStorage.getItem("absCutToken");

      if (!savedToken) {
        setAuthLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/users/profile");

        if (!data.success || !data.user) {
          throw new Error("Unable to verify user account.");
        }

        const safeUser = {
          id: data.user._id || data.user.id,

          firstName: data.user.firstName,
          lastName: data.user.lastName,
          username: data.user.username || "",

          avatar: data.user.avatar || "",

          phone: data.user.phone,
          email: data.user.email,

          role: data.user.role || "customer",
        };

        setCurrentUser(safeUser);
        setToken(savedToken);

        localStorage.setItem("absCutCurrentUser", JSON.stringify(safeUser));

        localStorage.setItem(
          "absCutCustomer",
          JSON.stringify({
            firstName: safeUser.firstName,
            lastName: safeUser.lastName,
            phone: safeUser.phone,
            email: safeUser.email,
          }),
        );
      } catch (error) {
        console.error("ABS CUT authentication verification failed:", error);

        localStorage.removeItem("absCutCurrentUser");

        localStorage.removeItem("absCutCustomer");

        localStorage.removeItem("absCutToken");

        setCurrentUser(null);
        setToken(null);
      } finally {
        setAuthLoading(false);
      }
    };

    verifyAuthentication();
  }, []);

  // =======================================================
  // SAVE LOCAL CART
  // =======================================================

  useEffect(() => {
    try {
      localStorage.setItem("absCutCart", JSON.stringify(cartItems));
    } catch (error) {
      console.error("Could not save ABS CUT cart:", error);
    }
  }, [cartItems]);

  // =======================================================
  // SERVER CART RESPONSE HANDLER
  // =======================================================

  const applyServerCart = (cart) => {
    const items = normalizeCartItems(cart?.items || []);

    setCartItems(items);

    return items;
  };

  // =======================================================
  // LOAD SERVER CART
  // =======================================================

  const loadServerCart = async () => {
    if (!currentUser) {
      return;
    }

    try {
      setCartLoading(true);

      const data = await apiRequest("/cart");

      if (data.success && data.cart) {
        applyServerCart(data.cart);
      }
    } catch (error) {
      console.error("ABS CUT server cart error:", error);
    } finally {
      setCartLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && !authLoading && !cartMergePending) {
      loadServerCart();
    }
  }, [currentUser, authLoading, cartMergePending]);

  // =======================================================
  // ADD TO CART
  // =======================================================

  const addToCart = async (product, quantity = 1) => {
    const productId = getProductId(product);
    const amount = Number(quantity);

    if (!productId) {
      throw new Error("Invalid product. Product ID is missing.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Please enter a valid quantity.");
    }

    const purchaseMode = getPurchaseMode(product);

    const priceUnit = product.priceUnit || getPriceUnit(product);

    const cartProduct = {
      ...product,

      id: productId,
      _id: productId,

      purchaseMode,
      priceUnit,

      price: getUnitPrice(product, purchaseMode),

      quantity: amount,
    };

    // -----------------------------------------------------
    // GUEST CART
    // -----------------------------------------------------

    if (!currentUser) {
      setCartItems((currentItems) => {
        const existingItem = currentItems.find((item) =>
          isSameCartItem(item, cartProduct),
        );

        if (existingItem) {
          return currentItems.map((item) =>
            isSameCartItem(item, cartProduct)
              ? {
                  ...item,
                  quantity: Number(item.quantity) + amount,
                }
              : item,
          );
        }

        return [...currentItems, cartProduct];
      });

      return;
    }

    // -----------------------------------------------------
    // LOGGED-IN CUSTOMER
    // -----------------------------------------------------

    try {
      const data = await apiRequest("/cart", {
        method: "POST",

        body: JSON.stringify({
          productId,
          quantity: amount,
          purchaseMode,
          priceUnit,
        }),
      });

      if (data.success && data.cart) {
        applyServerCart(data.cart);
      }
    } catch (error) {
      console.error("ABS CUT add to cart error:", error);

      throw error;
    }
  };

  // =======================================================
  // REMOVE FROM CART
  // =======================================================

  const removeFromCart = async (itemOrId, purchaseMode) => {
    const { productId, purchaseMode: mode } = resolveCartItem(
      itemOrId,
      purchaseMode,
    );

    if (!productId || cartActionLoading) {
      return;
    }

    const actionKey = `${productId}-${mode}`;

    setCartActionLoading(actionKey);

    // -----------------------------------------------------
    // GUEST CART
    // -----------------------------------------------------

    if (!currentUser) {
      setCartItems((currentItems) =>
        currentItems.filter(
          (item) =>
            !(
              getProductId(item) === productId && getPurchaseMode(item) === mode
            ),
        ),
      );

      setCartActionLoading(null);
      return;
    }

    // -----------------------------------------------------
    // SERVER CART
    // -----------------------------------------------------

    try {
      const data = await apiRequest(`/cart/${productId}?purchaseMode=${mode}`, {
        method: "DELETE",
      });

      if (data.success && data.cart) {
        applyServerCart(data.cart);
      }
    } catch (error) {
      console.error("ABS CUT remove cart item error:", error);

      throw error;
    } finally {
      setCartActionLoading(null);
    }
  };

  // =======================================================
  // UPDATE CART QUANTITY
  // =======================================================

  const updateCartQuantity = async (itemOrId, newQuantity, purchaseMode) => {
    const { productId, purchaseMode: mode } = resolveCartItem(
      itemOrId,
      purchaseMode,
    );

    const quantity = Number(newQuantity);

    if (!productId || cartActionLoading) {
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error("Please enter a valid quantity.");
    }

    if (quantity === 0) {
      return removeFromCart(productId, mode);
    }

    const actionKey = `${productId}-${mode}`;

    setCartActionLoading(actionKey);

    // -----------------------------------------------------
    // GUEST CART
    // -----------------------------------------------------

    if (!currentUser) {
      setCartItems((currentItems) =>
        currentItems.map((item) =>
          getProductId(item) === productId && getPurchaseMode(item) === mode
            ? {
                ...item,
                quantity,
              }
            : item,
        ),
      );

      setCartActionLoading(null);
      return;
    }

    // -----------------------------------------------------
    // SERVER CART
    // -----------------------------------------------------

    try {
      const data = await apiRequest(`/cart/${productId}`, {
        method: "PUT",

        body: JSON.stringify({
          quantity,
          purchaseMode: mode,
        }),
      });

      if (data.success && data.cart) {
        applyServerCart(data.cart);
      }
    } catch (error) {
      console.error("ABS CUT update cart quantity error:", error);

      throw error;
    } finally {
      setCartActionLoading(null);
    }
  };

  // =======================================================
  // INCREASE QUANTITY
  // =======================================================

  const increaseQuantity = async (itemOrId, purchaseMode) => {
    const { productId, purchaseMode: mode } = resolveCartItem(
      itemOrId,
      purchaseMode,
    );

    const item = cartItems.find(
      (cartItem) =>
        getProductId(cartItem) === productId &&
        getPurchaseMode(cartItem) === mode,
    );

    if (!item) {
      return;
    }

    const step = getQuantityStep(item);

    const newQuantity = Number(item.quantity) + step;

    return updateCartQuantity(productId, Number(newQuantity.toFixed(2)), mode);
  };

  // =======================================================
  // DECREASE QUANTITY
  // =======================================================

  const decreaseQuantity = async (itemOrId, purchaseMode) => {
    const { productId, purchaseMode: mode } = resolveCartItem(
      itemOrId,
      purchaseMode,
    );

    const item = cartItems.find(
      (cartItem) =>
        getProductId(cartItem) === productId &&
        getPurchaseMode(cartItem) === mode,
    );

    if (!item) {
      return;
    }

    const step = getQuantityStep(item);

    const newQuantity = Math.max(
      0,
      Number((Number(item.quantity) - step).toFixed(2)),
    );

    return updateCartQuantity(productId, newQuantity, mode);
  };

  // =======================================================
  // CLEAR CART
  // =======================================================

  const clearCart = async () => {
    if (!currentUser) {
      setCartItems([]);
      return;
    }

    try {
      const data = await apiRequest("/cart", {
        method: "DELETE",
      });

      if (data.success) {
        setCartItems([]);
      }
    } catch (error) {
      console.error("ABS CUT clear cart error:", error);

      throw error;
    }
  };

  // =======================================================
  // TOTAL QUANTITY
  // =======================================================

  const totalItems = cartItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  // =======================================================
  // TOTAL PRICE
  // =======================================================

  const totalPrice = cartItems.reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  // =======================================================
  // LOGIN
  // =======================================================

  const login = async (user, authToken) => {
    if (!user || !authToken) {
      return;
    }

    const safeUser = {
      id: user.id || user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username || "",
      avatar: user.avatar || "",
      phone: user.phone,
      email: user.email,
      role: user.role || "customer",
    };

    const guestCart = Array.isArray(cartItems) ? [...cartItems] : [];

    localStorage.setItem("absCutCurrentUser", JSON.stringify(safeUser));

    localStorage.setItem("absCutToken", authToken);

    localStorage.setItem(
      "absCutCustomer",
      JSON.stringify({
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        username: safeUser.username,
        phone: safeUser.phone,
        email: safeUser.email,
      }),
    );

    setToken(authToken);
    setCurrentUser(safeUser);

    // -----------------------------------------------------
    // MERGE GUEST CART
    // -----------------------------------------------------

    if (guestCart.length > 0) {
      setCartMergePending(true);

      try {
        const data = await apiRequest("/cart/merge", {
          method: "POST",

          body: JSON.stringify({
            items: guestCart.map((item) => ({
              productId: getProductId(item),
              quantity: Number(item.quantity),
              purchaseMode: getPurchaseMode(item),
              priceUnit: getPriceUnit(item),
            })),
          }),
        });

        if (data.success && data.cart) {
          applyServerCart(data.cart);
        }
      } catch (error) {
        console.error("ABS CUT guest cart merge error:", error);
      } finally {
        setCartMergePending(false);
      }
    }
  };

  // =======================================================
  // LOGOUT
  // =======================================================

  const logout = () => {
    localStorage.removeItem("absCutCurrentUser");

    localStorage.removeItem("absCutCustomer");

    localStorage.removeItem("absCutToken");

    setCurrentUser(null);
    setToken(null);

    // Do not expose the previous user's server cart
    // as a guest cart after logout.
    setCartItems([]);
  };

  // =======================================================
  // UPDATE CURRENT USER
  // =======================================================

  const updateCurrentUser = (updates) => {
    setCurrentUser((existingUser) => {
      if (!existingUser) {
        return null;
      }

      const updatedUser = {
        ...existingUser,
        ...updates,
      };

      localStorage.setItem("absCutCurrentUser", JSON.stringify(updatedUser));

      localStorage.setItem(
        "absCutCustomer",
        JSON.stringify({
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          username: updatedUser.username,
          phone: updatedUser.phone,
          email: updatedUser.email,
        }),
      );

      return updatedUser;
    });
  };

  // =======================================================
  // AUTH STATUS
  // =======================================================

  const isAuthenticated = Boolean(currentUser);

  // =======================================================
  // CONTEXT VALUE
  // =======================================================

  const value = {
    // Cart
    cartItems,
    cartLoading,
    cartActionLoading,
    cartMergePending,

    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    updateCartQuantity,
    clearCart,

    totalItems,
    totalPrice,

    // Authentication
    currentUser,
    token,
    isAuthenticated,
    authLoading,

    login,
    logout,
    updateCurrentUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// =========================================================
// MAIN APP HOOK
// =========================================================

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider.");
  }

  return context;
}

// =========================================================
// CART COMPATIBILITY HOOK
// =========================================================

export function useCart() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useCart must be used inside AppProvider.");
  }

  return context;
}

// =========================================================
// AUTH HOOK
// =========================================================

export function useAuth() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAuth must be used inside AppProvider.");
  }

  return context;
}

