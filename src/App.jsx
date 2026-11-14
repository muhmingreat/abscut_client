import { Routes, Route } from "react-router-dom";
import Certificates from "./pages/academy/Certificates";
import CertificateDetails from "./pages/academy/CertificateDetails";
import VerifyCertificate from "./pages/academy/VerifyCertificate";
import AdminAcademyAssignments from "./pages/admin/AdminAcademyAssignments";
import AdminAcademyAssignmentSubmissions from "./pages/admin/AdminAcademyAssignmentSubmissions";
import AIGuide from "./components/ai-guide/AIGuide";
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
  EmailVerification,
  ForgotPassword,
  ResetPassword,
  Activities,
  PartyMaterials,
  AdminActivities,
  AdminPartyBookings,
  AIOutfitPreview,
  MyPartyBookings,
  Play,
  PartyBookingConfirmation,
  PartyBookingDetails,
  MemoryMatch,
  TicTacToe,
  WordChallenge,
  StyleRunner,
  AdminDeliveryZones,
  CourseLearning,
} from "./index";
import MyCourses from "./pages/academy/MyCourses";
import AcademyHome from "./pages/academy/AcademyHome";
import CourseDetails from "./pages/academy/CourseDetails";
import AIMeasurement from "./components/ai-measurement/AIMeasurement";
import AdminAcademyCourses from "./pages/admin/AdminAcademyCourses";
import Notifications from "./pages/customers/Notifications";
import AdminNotifications from "./pages/admin/AdminNotifications";
import ActivityDetails from "./pages/customers/ActivityDetails";
import AdminAcademyLiveClasses from "./pages/admin/AdminAcademyLiveClasses";
function App() {
  return (
    <>
      <Navbar />
      <ChatWidget />
         <AIGuide  style="marginTop:40px"/>
      <Routes>
        {/* =====================================================
            PUBLIC ROUTES
        ===================================================== */}

        <Route path="/" element={<Home />} />

        <Route path="/shop" element={<Shop />} />
        <Route path="/play" element={<Play />} />
        <Route path="/play/memory-match" element={<MemoryMatch />} />
        <Route path="/play/word-challenge" element={<WordChallenge />} />
        <Route path="/play/tic-tac-toe" element={<TicTacToe />} />
        <Route path="/play/style-runner" element={<StyleRunner />} />
        <Route path="/ai-measurement" element={<AIMeasurement />} />

        <Route path="/about" element={<About />} />
        <Route path="/ai-outfit" element={<AIOutfitPreview />} />

        <Route path="/contact" element={<Contact />} />
        <Route path="/payments/callback" element={<PaymentCallback />} />

        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />

        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/product/:id" element={<ProductDetails />} />

        <Route path="/cart" element={<Cart />} />

        <Route path="/custom-order" element={<CustomOrder />} />

        {/* =====================================================
            PROTECTED ADMIN ROUTES
            ===================================================== */}

        <Route path="/academy" element={<AcademyHome />} />

        <Route path="/academy/courses/:courseId" element={<CourseDetails />} />

        <Route
          path="/academy/learn/:enrollmentId"
          element={<CourseLearning />}
        />

        <Route path="/academy/my-courses" element={<MyCourses />} />

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
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/activities" element={<AdminActivities />} />
          <Route path="/activities/:activityId" element={<ActivityDetails />} />
          <Route
            path="/admin/academy/live-classes"
            element={<AdminAcademyLiveClasses />}
          />
          <Route
            path="/admin/academy/assignments"
            element={<AdminAcademyAssignments />}
          />

          <Route
            path="/admin/academy/assignments/:assignmentId/submissions"
            element={<AdminAcademyAssignmentSubmissions />}
          />
          <Route
            path="/admin/delivery-zones"
            element={<AdminDeliveryZones />}
          />
          <Route
            path="/admin/party-bookings"
            element={<AdminPartyBookings />}
          />
          <Route
            path="/admin/academy/courses"
            element={<AdminAcademyCourses />}
          />
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
          <Route path="/notifications" element={<Notifications />} />
          <Route
            path="/order-confirmation/:orderId"
            element={<OrderConfirmations />}
          />
          <Route path="/academy/certificates" element={<Certificates />} />

          <Route
            path="/academy/certificates/:enrollmentId"
            element={<CertificateDetails />}
          />
          <Route
            path="/academy/verify-certificate/:certificateNumber"
            element={<VerifyCertificate />}
          />

          {/* DAILY ACTIVITIES */}
          <Route path="/activities" element={<Activities />} />

          {/* PARTY MATERIALS */}
          <Route path="/party-materials" element={<PartyMaterials />} />
          <Route path="/my-orders" element={<MyOrders />} />

          <Route path="/track-order/:orderId" element={<TrackOrder />} />

          <Route path="/account" element={<Account />} />

          <Route
            path="/custom-order-confirmation/:customOrderId"
            element={<CustomOrderConfirmation />}
          />
          <Route
            path="/my-party-bookings"
            element={
              // <ProtectedRoute>
              <MyPartyBookings />

              // </ProtectedRoute>
            }
          />
          <Route path="/my-custom-orders" element={<MyCustomOrders />} />
          <Route path="/custom-order" element={<CustomOrder />} />
          <Route
            path="/custom-order-details/:customOrderId"
            element={<CustomOrderDetails />}
          />
          <Route
            path="/party-booking-confirmation"
            element={<PartyBookingConfirmation />}
          />
          <Route
            path="/my-party-bookings/:id"
            element={<PartyBookingDetails />}
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;
