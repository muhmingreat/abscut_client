
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiRequest } from "../services/api";

// =========================================================
// ABS CUT APP CONTEXT
// =========================================================

const AppContext = createContext(null);

// =========================================================
// APP PROVIDER
// =========================================================

export function AppProvider({ children }) {
  // =======================================================
  // CART STATE
  // =======================================================

  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart =
        localStorage.getItem("absCutCart");

      if (!savedCart) {
        return [];
      }

      const parsedCart =
        JSON.parse(savedCart);

      if (!Array.isArray(parsedCart)) {
        return [];
      }

      return parsedCart;
    } catch (error) {
      console.error(
        "Could not load ABS CUT cart:",
        error
      );

      return [];
    }
  });

  const [cartLoading, setCartLoading] =
    useState(false);

  const [cartActionLoading, setCartActionLoading] =
    useState(null);

  const [cartMergePending, setCartMergePending] =
    useState(false);

  // =======================================================
  // AUTHENTICATION STATE
  // =======================================================

  const [currentUser, setCurrentUser] =
    useState(null);

  const [token, setToken] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  // =======================================================
  // VERIFY AUTHENTICATION
  // =======================================================

  useEffect(() => {
    const verifyAuthentication =
      async () => {
        const savedToken =
          localStorage.getItem(
            "absCutToken"
          );

        // No saved token means
        // the user is a guest.
        if (!savedToken) {
          setAuthLoading(false);
          return;
        }

        try {
          const data =
            await apiRequest(
              "/users/profile"
            );

          if (
            data.success &&
            data.user
          ) {
            // ------------------------------------------------
            // IMPORTANT:
            // Keep the user's ROLE.
            // This is required by AdminRoute.
            // ------------------------------------------------

            const safeUser = {
              id:
                data.user._id ||
                data.user.id,

              firstName:
                data.user.firstName,

              lastName:
                data.user.lastName,

              phone:
                data.user.phone,

              email:
                data.user.email,

              role:
                data.user.role ||
                "customer",
            };

            setCurrentUser(
              safeUser
            );

            setToken(
              savedToken
            );

            localStorage.setItem(
              "absCutCurrentUser",
              JSON.stringify(
                safeUser
              )
            );

            localStorage.setItem(
              "absCutCustomer",
              JSON.stringify({
                firstName:
                  safeUser.firstName,

                lastName:
                  safeUser.lastName,

                phone:
                  safeUser.phone,

                email:
                  safeUser.email,
              })
            );
          } else {
            throw new Error(
              "Unable to verify user account."
            );
          }
        } catch (error) {
          console.error(
            "ABS CUT authentication verification failed:",
            error
          );

          localStorage.removeItem(
            "absCutCurrentUser"
          );

          localStorage.removeItem(
            "absCutCustomer"
          );

          localStorage.removeItem(
            "absCutToken"
          );

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
      localStorage.setItem(
        "absCutCart",
        JSON.stringify(cartItems)
      );
    } catch (error) {
      console.error(
        "Could not save ABS CUT cart:",
        error
      );
    }
  }, [cartItems]);

  // =======================================================
  // LOAD MONGODB CART
  // =======================================================

  const loadServerCart =
    async () => {
      if (!currentUser) {
        return;
      }

      try {
        setCartLoading(true);

        const data =
          await apiRequest(
            "/cart"
          );

        if (
          data.success &&
          data.cart
        ) {
          const serverItems =
            (
              data.cart.items ||
              []
            )
              .filter(
                (item) =>
                  item.product
              )
              .map(
                (item) => ({
                  ...item.product,

                  id:
                    item.product._id,

                  _id:
                    item.product._id,

                  quantity:
                    Number(
                      item.quantity
                    ),
                })
              );

          setCartItems(
            serverItems
          );
        }
      } catch (error) {
        console.error(
          "ABS CUT server cart error:",
          error
        );
      } finally {
        setCartLoading(false);
      }
    };

  // =======================================================
  // LOAD SERVER CART WHEN USER LOGS IN
  // =======================================================

  useEffect(() => {
    if (
      currentUser &&
      !authLoading &&
      !cartMergePending
    ) {
      loadServerCart();
    }
  }, [
    currentUser,
    authLoading,
    cartMergePending,
  ]);

  // =======================================================
  // ADD TO CART
  // =======================================================

  const addToCart = async (
    product,
    quantity = 1
  ) => {
    const productId =
      product._id ||
      product.id;

    const amount =
      Number(quantity);

    // -----------------------------------------------------
    // GUEST CART
    // -----------------------------------------------------

    if (!currentUser) {
      setCartItems(
        (currentItems) => {
          const existingItem =
            currentItems.find(
              (item) =>
                (item._id ||
                  item.id) ===
                productId
            );

          if (existingItem) {
            return currentItems.map(
              (item) =>
                (item._id ||
                  item.id) ===
                productId
                  ? {
                      ...item,

                      quantity:
                        Number(
                          item.quantity
                        ) +
                        amount,
                    }
                  : item
            );
          }

          return [
            ...currentItems,

            {
              ...product,

              id: productId,

              _id: productId,

              quantity: amount,
            },
          ];
        }
      );

      return;
    }

    // -----------------------------------------------------
    // LOGGED-IN CUSTOMER
    // -----------------------------------------------------

    try {
      const data =
        await apiRequest(
          "/cart",
          {
            method: "POST",

            body: JSON.stringify({
              productId,

              quantity: amount,
            }),
          }
        );

      if (
        data.success &&
        data.cart
      ) {
        const serverItems =
          (
            data.cart.items ||
            []
          )
            .filter(
              (item) =>
                item.product
            )
            .map(
              (item) => ({
                ...item.product,

                id:
                  item.product._id,

                _id:
                  item.product._id,

                quantity:
                  Number(
                    item.quantity
                  ),
              })
            );

        setCartItems(
          serverItems
        );
      }
    } catch (error) {
      console.error(
        "ABS CUT add to cart error:",
        error
      );

      throw error;
    }
  };

  // =======================================================
  // REMOVE FROM CART
  // =======================================================

  const removeFromCart =
    async (productId) => {
      if (cartActionLoading) {
        return;
      }

      setCartActionLoading(
        productId
      );

      // ---------------------------------------------------
      // GUEST CART
      // ---------------------------------------------------

      if (!currentUser) {
        setCartItems(
          (currentItems) =>
            currentItems.filter(
              (item) =>
                (item._id ||
                  item.id) !==
                productId
            )
        );

        setCartActionLoading(
          null
        );

        return;
      }

      // ---------------------------------------------------
      // SERVER CART
      // ---------------------------------------------------

      try {
        const data =
          await apiRequest(
            `/cart/${productId}`,
            {
              method: "DELETE",
            }
          );

        if (
          data.success &&
          data.cart
        ) {
          const serverItems =
            (
              data.cart.items ||
              []
            )
              .filter(
                (item) =>
                  item.product
              )
              .map(
                (item) => ({
                  ...item.product,

                  id:
                    item.product._id,

                  _id:
                    item.product._id,

                  quantity:
                    Number(
                      item.quantity
                    ),
                })
              );

          setCartItems(
            serverItems
          );
        }
      } catch (error) {
        console.error(
          "ABS CUT remove cart item error:",
          error
        );

        throw error;
      } finally {
        setCartActionLoading(
          null
        );
      }
    };

  // =======================================================
  // INCREASE QUANTITY
  // =======================================================

  const increaseQuantity =
    async (productId) => {
      if (cartActionLoading) {
        return;
      }

      const item =
        cartItems.find(
          (cartItem) =>
            (cartItem._id ||
              cartItem.id) ===
            productId
        );

      if (!item) {
        return;
      }

      const newQuantity =
        Number(
          item.quantity
        ) + 1;

      setCartActionLoading(
        productId
      );

      // ---------------------------------------------------
      // GUEST CART
      // ---------------------------------------------------

      if (!currentUser) {
        setCartItems(
          (currentItems) =>
            currentItems.map(
              (cartItem) =>
                (cartItem._id ||
                  cartItem.id) ===
                productId
                  ? {
                      ...cartItem,

                      quantity:
                        newQuantity,
                    }
                  : cartItem
            )
        );

        setCartActionLoading(
          null
        );

        return;
      }

      // ---------------------------------------------------
      // SERVER CART
      // ---------------------------------------------------

      try {
        const data =
          await apiRequest(
            `/cart/${productId}`,
            {
              method: "PUT",

              body: JSON.stringify({
                quantity:
                  newQuantity,
              }),
            }
          );

        if (
          data.success &&
          data.cart
        ) {
          const serverItems =
            (
              data.cart.items ||
              []
            )
              .filter(
                (item) =>
                  item.product
              )
              .map(
                (item) => ({
                  ...item.product,

                  id:
                    item.product._id,

                  _id:
                    item.product._id,

                  quantity:
                    Number(
                      item.quantity
                    ),
                })
              );

          setCartItems(
            serverItems
          );
        }
      } catch (error) {
        console.error(
          "ABS CUT increase quantity error:",
          error
        );

        throw error;
      } finally {
        setCartActionLoading(
          null
        );
      }
    };

  // =======================================================
  // DECREASE QUANTITY
  // =======================================================

  const decreaseQuantity =
    async (productId) => {
      if (cartActionLoading) {
        return;
      }

      const item =
        cartItems.find(
          (cartItem) =>
            (cartItem._id ||
              cartItem.id) ===
            productId
        );

      if (!item) {
        return;
      }

      const newQuantity =
        Number(
          item.quantity
        ) - 1;

      setCartActionLoading(
        productId
      );

      // ---------------------------------------------------
      // REMOVE WHEN ZERO
      // ---------------------------------------------------

      if (
        newQuantity <= 0
      ) {
        if (!currentUser) {
          setCartItems(
            (currentItems) =>
              currentItems.filter(
                (cartItem) =>
                  (cartItem._id ||
                    cartItem.id) !==
                  productId
              )
          );

          setCartActionLoading(
            null
          );

          return;
        }

        try {
          const data =
            await apiRequest(
              `/cart/${productId}`,
              {
                method: "DELETE",
              }
            );

          if (
            data.success &&
            data.cart
          ) {
            const serverItems =
              (
                data.cart
                  .items || []
              )
                .filter(
                  (item) =>
                    item.product
                )
                .map(
                  (item) => ({
                    ...item.product,

                    id:
                      item.product._id,

                    _id:
                      item.product._id,

                    quantity:
                      Number(
                        item.quantity
                      ),
                  })
                );

            setCartItems(
              serverItems
            );
          }
        } catch (error) {
          console.error(
            "ABS CUT decrease/remove error:",
            error
          );

          throw error;
        } finally {
          setCartActionLoading(
            null
          );
        }

        return;
      }

      // ---------------------------------------------------
      // SERVER CART
      // ---------------------------------------------------

      if (!currentUser) {
        setCartItems(
          (currentItems) =>
            currentItems.map(
              (cartItem) =>
                (cartItem._id ||
                  cartItem.id) ===
                productId
                  ? {
                      ...cartItem,

                      quantity:
                        newQuantity,
                    }
                  : cartItem
            )
        );

        setCartActionLoading(
          null
        );

        return;
      }

      try {
        const data =
          await apiRequest(
            `/cart/${productId}`,
            {
              method: "PUT",

              body: JSON.stringify({
                quantity:
                  newQuantity,
              }),
            }
          );

        if (
          data.success &&
          data.cart
        ) {
          const serverItems =
            (
              data.cart.items ||
              []
            )
              .filter(
                (item) =>
                  item.product
              )
              .map(
                (item) => ({
                  ...item.product,

                  id:
                    item.product._id,

                  _id:
                    item.product._id,

                  quantity:
                    Number(
                      item.quantity
                    ),
                })
              );

          setCartItems(
            serverItems
          );
        }
      } catch (error) {
        console.error(
          "ABS CUT decrease quantity error:",
          error
        );

        throw error;
      } finally {
        setCartActionLoading(
          null
        );
      }
    };

  // =======================================================
  // CLEAR CART
  // =======================================================

  const clearCart =
    async () => {
      // ---------------------------------------------------
      // GUEST CART
      // ---------------------------------------------------

      if (!currentUser) {
        setCartItems([]);
        return;
      }

      // ---------------------------------------------------
      // SERVER CART
      // ---------------------------------------------------

      try {
        const data =
          await apiRequest(
            "/cart",
            {
              method: "DELETE",
            }
          );

        if (data.success) {
          setCartItems([]);
        }
      } catch (error) {
        console.error(
          "ABS CUT clear cart error:",
          error
        );

        throw error;
      }
    };

  // =======================================================
  // TOTAL ITEMS
  // =======================================================

  const totalItems =
    cartItems.reduce(
      (total, item) =>
        total +
        Number(
          item.quantity
        ),
      0
    );

  // =======================================================
  // TOTAL PRICE
  // =======================================================

  const totalPrice =
    cartItems.reduce(
      (total, item) =>
        total +
        Number(item.price) *
          Number(
            item.quantity
          ),
      0
    );

  // =======================================================
  // LOGIN
  // =======================================================

  const login = async (
    user,
    authToken
  ) => {
    if (
      !user ||
      !authToken
    ) {
      return;
    }

    // ---------------------------------------------------
    // IMPORTANT:
    // Keep ROLE when logging in.
    // ---------------------------------------------------

    const safeUser = {
      id:
        user.id ||
        user._id,

      firstName:
        user.firstName,

      lastName:
        user.lastName,

      phone:
        user.phone,

      email:
        user.email,

      role:
        user.role ||
        "customer",
    };

    // ---------------------------------------------------
    // SAVE GUEST CART
    // ---------------------------------------------------

    const guestCart =
      Array.isArray(
        cartItems
      )
        ? [...cartItems]
        : [];

    // ---------------------------------------------------
    // SAVE USER
    // ---------------------------------------------------

    localStorage.setItem(
      "absCutCurrentUser",
      JSON.stringify(
        safeUser
      )
    );

    localStorage.setItem(
      "absCutToken",
      authToken
    );

    localStorage.setItem(
      "absCutCustomer",
      JSON.stringify({
        firstName:
          safeUser.firstName,

        lastName:
          safeUser.lastName,

        phone:
          safeUser.phone,

        email:
          safeUser.email,
      })
    );

    // ---------------------------------------------------
    // SET AUTHENTICATION
    // ---------------------------------------------------

    setCurrentUser(
      safeUser
    );

    setToken(
      authToken
    );

    // ---------------------------------------------------
    // MERGE GUEST CART
    // ---------------------------------------------------

    if (
      guestCart.length > 0
    ) {
      try {
        setCartMergePending(
          true
        );

        const response =
          await fetch(
            "http://localhost:5000/api/cart/merge",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${authToken}`,
              },

              body: JSON.stringify({
                items:
                  guestCart,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to merge cart."
          );
        }

        if (
          data.success &&
          data.cart
        ) {
          const mergedItems =
            (
              data.cart
                .items || []
            )
              .filter(
                (item) =>
                  item.product
              )
              .map(
                (item) => ({
                  ...item.product,

                  id:
                    item.product._id,

                  _id:
                    item.product._id,

                  quantity:
                    Number(
                      item.quantity
                    ),
                })
              );

          setCartItems(
            mergedItems
          );
        }
      } catch (error) {
        console.error(
          "ABS CUT guest cart merge error:",
          error
        );
      } finally {
        setCartMergePending(
          false
        );
      }
    }
  };

  // =======================================================
  // LOGOUT
  // =======================================================

  const logout = () => {
    localStorage.removeItem(
      "absCutCurrentUser"
    );

    localStorage.removeItem(
      "absCutCustomer"
    );

    localStorage.removeItem(
      "absCutToken"
    );

    setCurrentUser(null);

    setToken(null);
  };

  // =======================================================
  // UPDATE CURRENT USER
  // =======================================================

  const updateCurrentUser =
    (updates) => {
      setCurrentUser(
        (currentUser) => {
          if (!currentUser) {
            return null;
          }

          const updatedUser = {
            ...currentUser,
            ...updates,
          };

          localStorage.setItem(
            "absCutCurrentUser",
            JSON.stringify(
              updatedUser
            )
          );

          localStorage.setItem(
            "absCutCustomer",
            JSON.stringify({
              firstName:
                updatedUser.firstName,

              lastName:
                updatedUser.lastName,

              phone:
                updatedUser.phone,

              email:
                updatedUser.email,
            })
          );

          return updatedUser;
        }
      );
    };

  // =======================================================
  // AUTH STATUS
  // =======================================================

  const isAuthenticated =
    Boolean(
      currentUser
    );

  // =======================================================
  // CONTEXT VALUE
  // =======================================================

  const value = {
    // ---------------------------------------------------
    // CART
    // ---------------------------------------------------

    cartItems,

    cartLoading,

    cartActionLoading,

    addToCart,

    removeFromCart,

    increaseQuantity,

    decreaseQuantity,

    clearCart,

    totalItems,

    totalPrice,

    // ---------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------

    currentUser,

    token,

    isAuthenticated,

    authLoading,

    login,

    logout,

    updateCurrentUser,
  };

  return (
    <AppContext.Provider
      value={value}
    >
      {children}
    </AppContext.Provider>
  );
}

// =========================================================
// MAIN APP HOOK
// =========================================================

export function useApp() {
  const context =
    useContext(
      AppContext
    );

  if (!context) {
    throw new Error(
      "useApp must be used inside AppProvider."
    );
  }

  return context;
}

// =========================================================
// CART COMPATIBILITY HOOK
// =========================================================

export function useCart() {
  const context =
    useContext(
      AppContext
    );

  if (!context) {
    throw new Error(
      "useCart must be used inside AppProvider."
    );
  }

  return context;
}

// =========================================================
// AUTH HOOK
// =========================================================

export function useAuth() {
  const context =
    useContext(
      AppContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AppProvider."
    );
  }

  return context;
}

