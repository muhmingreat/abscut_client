
import { Routes, Route } from "react-router-dom";

import {
  ProductDetails,
  Navbar,
  ChatWidget,
  Home,
  Cart,
  Shop,
  Checkout,
  OrderConfirmations,
  MyOrders,
  TrackOrder,
  Account,
  CustomOrder,
  CustomOrderConfirmation,
  MyCustomOrders,
  Contact,
  About,
  Register,
  Login,
  ProtectedRoute,
  PaymentCallback,
  AdminRoute,
  AdminDashboard,
  AdminOrders,
  AdminOrderDetails,
  AdminProducts,
  AdminProductDetails,
  AdminPayments,
  AdminProductCreate,
  AdminCustomOrders,
  AdminCustomOrderDetails,
  CustomOrderDetails,
  AdminInstallmentSettings,
  AdminChat,
  AdminCustomer,
  AdminInventory,
  AdminReports,
} from "./index";

function App() {
  return (
    <>
      <Navbar />
      <ChatWidget />
      <Routes>
        {/* =====================================================
            PUBLIC ROUTES
        ===================================================== */}

        <Route path="/" element={<Home />} />

        <Route path="/shop" element={<Shop />} />

        <Route path="/about" element={<About />} />

        <Route path="/contact" element={<Contact />} />
        <Route path="/payment/callback" element={<PaymentCallback />} />
        {/* "09071697982" */}
        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />

        <Route path="/product/:id" element={<ProductDetails />} />

        <Route path="/cart" element={<Cart />} />

        <Route path="/custom-order" element={<CustomOrder />} />

        {/* =====================================================
            PROTECTED ADMIN ROUTES
        ===================================================== */}

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/customers" element={<AdminCustomer />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetails />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/products/:id" element={<AdminProductDetails />} />
          <Route path="/admin/products/new" element={<AdminProductCreate />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/inventory" element={<AdminInventory />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route
            path="/admin/installment-settings"
            element={<AdminInstallmentSettings />}
          />
          <Route path="/admin/chat" element={<AdminChat />} />
          <Route
            path="/admin/custom-orders/:id"
            element={<AdminCustomOrderDetails />}
          />
          <Route path="/admin/custom-orders" element={<AdminCustomOrders />} />
        </Route>

        {/* =====================================================
            PROTECTED CUSTOMER ROUTES
        ===================================================== */}

        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<Checkout />} />

          <Route
            path="/order-confirmation/:orderId"
            element={<OrderConfirmations />}
          />

          <Route path="/my-orders" element={<MyOrders />} />

          <Route path="/track-order/:orderId" element={<TrackOrder />} />

          <Route path="/account" element={<Account />} />

          <Route
            path="/custom-order-confirmation/:customOrderId"
            element={<CustomOrderConfirmation />}
          />

          <Route path="/my-custom-orders" element={<MyCustomOrders />} />
          <Route path="/custom-order" element={<CustomOrder />} />
          <Route
            path="/custom-order-details/:customOrderId"
            element={<CustomOrderDetails />}
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;
