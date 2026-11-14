
export { default as ProductDetails } from "./pages/products/ProductDetails";
export { default as Home } from "./pages/Home";
export { default as Shop } from "./pages/Shop";
export { default as Checkout } from "./pages/Checkout";
export { default as OrderConfirmations } from "./pages/customers/OrderConfirmations";
export { default as MyOrders } from "./pages/customers/MyOrder";
export { default as TrackOrder } from "./pages/TrackOrder";
export { default as Account } from "./pages/Account";
export { default as CustomOrder } from "./pages/customers/CustomOrder";
export {
  default as CustomOrderConfirmation,
} from "./pages/customers/CustomOrderConfirmation";
export {
  default as MyCustomOrders,
} from "./pages/customers/MyCustomOrders";
export { default as Contact } from "./pages/Contact";
export { default as About } from "./pages/About";
export { default as Register } from "./pages/auth/Register";
export { default as Login } from "./pages/auth/Login";
export { default as PaymentCallback } from "./pages/PaymentCallback";
export { default as EmailVerification } from "./pages/auth/EmailVerification";
export { default as ForgotPassword } from "./pages/auth/ForgotPassword";
export { default as ResetPassword } from "./pages/auth/ResetPassword";
export { default as Activities} from "./pages/customers/Activities";
export { default as PartyMaterials} from "./pages/customers/PartyMaterials"
// Shared components
export { default as Navbar } from "./components/Navbar";
export { default as ChatWidget } from "./components/ChatWidget";
export { default as Cart } from "./components/Cart";
export {
  default as ProtectedRoute,
} from "./components/ProtectedRoute";
export { default as AdminRoute } from "./components/AdminRoute";
export { default as AdminChat } from "./components/AdminChat";
export {
  default as AdminSidebar,
} from "./components/AdminSidebar";

// Admin pages
export { default as AdminDashboard } from "./pages/admin/AdminDashboard";
export { default as AdminOrders } from "./pages/admin/AdminOrders";
export {
  default as AdminOrderDetails,
} from "./pages/admin/AdminOrderDetails";
export { default as AdminProducts } from "./pages/admin/AdminProducts";
export {
  default as AdminProductDetails,
} from "./pages/admin/AdminProductDetails";
export { default as AdminPayments } from "./pages/admin/AdminPayments";
export {
  default as AdminProductCreate,
} from "./pages/admin/AdminProductCreate";
export {
  default as AdminCustomOrders,
} from "./pages/admin/AdminCustomOrders";
export {
  default as AdminCustomOrderDetails,
} from "./pages/admin/AdminCustomOrderDetails";
export {
  default as CustomOrderDetails,
} from "./pages/customers/CustomOrderDetails";
export {
  default as AdminInstallmentSettings,
} from "./pages/admin/AdminInstallmentSettings";
export { default as AdminCustomer } from "./pages/admin/AdminCustomer";
export { default as AdminInventory } from "./pages/admin/AdminInventory";
export { default as AdminReports } from "./pages/admin/AdminReport";

export { default as AdminDeliveryZones } from "./pages/admin/AdminDeliveryZones";
export { default as AdminActivities} from "./pages/admin/AdminActivities";
export { default as AdminPartyBookings} from "./pages/admin/AdminPartyBookings";
export {default as AIOutfitPreview} from "./pages/AIOutfitPreview";
export {default as StyleRunner }from "./pages/games/StyleRunner";
export {default as MyPartyBookings} from "./pages/customers/MyPartyBookings";
export {default as PartyBookingConfirmation} from "./pages/customers/PartyBookingConfirmation";
export {default as PartyBookingDetails} from "./pages/customers/PartyBookingDetails";

export{ default as Play} from "./pages/Play";
export{ default as MemoryMatch }from "./pages/games/MemoryMatch";
export{ default as WordChallenge} from "./pages/games/WordChallenge";
export{ default as TicTacToe }from "./pages/games/TicTacToe";
export { default as CourseLearning } from "./pages/academy/CourseLearning";

export const PAGE_TITLES = [
  [/^\/$/, "Home"],
  [/^\/shop$/, "Shop"],
  [/^\/cart$/, "Shopping Cart"],
  [/^\/checkout$/, "Checkout"],
  [/^\/about$/, "About Us"],
  [/^\/contact$/, "Contact"],
  [/^\/login$/, "Login"],
  [/^\/register$/, "Create Account"],
  [/^\/verify-email$/, "Email Verification"],
  [/^\/forgot-password$/, "Forgot Password"],
  [/^\/reset-password$/, "Reset Password"],
  [/^\/custom-order$/, "Custom Order"],
  [/^\/ai-measurement$/, "AI Measurement"],
  [/^\/ai-outfit$/, "AI Outfit Preview"],
  [/^\/my-orders$/, "My Orders"],
  [/^\/my-custom-orders$/, "My Custom Orders"],
  [/^\/account$/, "My Account"],
  [/^\/notifications$/, "Notifications"],
  [/^\/track-order\/[^/]+$/, "Track Order"],
  [/^\/order-confirmation\/[^/]+$/, "Order Confirmation"],
  [/^\/custom-order-confirmation\/[^/]+$/, "Custom Order Confirmation"],
  [/^\/custom-order-details\/[^/]+$/, "Custom Order Details"],
  [/^\/academy$/, "Fashion Academy"],
  [/^\/academy\/my-courses$/, "My Learning"],
  [/^\/academy\/learn\/[^/]+$/, "Course Learning"],
  [/^\/academy\/certificates$/, "My Certificates"],
  [/^\/academy\/certificates\/[^/]+$/, "Certificate Details"],
  [/^\/academy\/verify-certificate\/[^/]+$/, "Verify Certificate"],
  [/^\/play$/, "Games"],
  [/^\/play\/memory-match$/, "Memory Match"],
  [/^\/play\/word-challenge$/, "Word Challenge"],
  [/^\/play\/tic-tac-toe$/, "Tic Tac Toe"],
  [/^\/play\/style-runner$/, "Style Runner"],
  [/^\/activities$/, "Activities"],
  [/^\/activities\/[^/]+$/, "Activity Details"],
  [/^\/party-materials$/, "Party Materials"],
  [/^\/my-party-bookings$/, "My Party Bookings"],
  [/^\/my-party-bookings\/[^/]+$/, "Party Booking Details"],
  [/^\/party-booking-confirmation$/, "Party Booking Confirmation"],
  [/^\/admin$/, "Admin Dashboard"],
  [/^\/admin\/customers$/, "Customers"],
  [/^\/admin\/orders$/, "Manage Orders"],
  [/^\/admin\/orders\/[^/]+$/, "Order Details"],
  [/^\/admin\/products$/, "Manage Products"],
  [/^\/admin\/products\/new$/, "Create Product"],
  [/^\/admin\/products\/[^/]+$/, "Product Details"],
  [/^\/admin\/payments$/, "Manage Payments"],
  [/^\/admin\/inventory$/, "Inventory"],
  [/^\/admin\/reports$/, "Reports"],
  [/^\/admin\/notifications$/, "Admin Notifications"],
  [/^\/admin\/activities$/, "Manage Activities"],
  [/^\/admin\/academy\/courses$/, "Manage Academy Courses"],
  [/^\/admin\/academy\/live-classes$/, "Manage Live Classes"],
  [/^\/admin\/academy\/assignments$/, "Manage Assignments"],
  [/^\/admin\/academy\/assignments\/[^/]+\/submissions$/, "Assignment Submissions"],
  [/^\/admin\/delivery-zones$/, "Delivery Zones"],
  [/^\/admin\/party-bookings$/, "Manage Party Bookings"],
  [/^\/admin\/installment-settings$/, "Installment Settings"],
  [/^\/admin\/chat$/, "Customer Support"],
  [/^\/admin\/custom-orders$/, "Manage Custom Orders"],
  [/^\/admin\/custom-orders\/[^/]+$/, "Custom Order Details"],
];

 export function getPageTitle(pathname) {
  const match = PAGE_TITLES.find(([pattern]) => pattern.test(pathname));

  if (match) {
    return `${match[1]} | ABS CUT`;
  }

  if (/^\/product\/[^/]+$/.test(pathname)) {
    return "Product | ABS CUT";
  }

  if (/^\/academy\/courses\/[^/]+$/.test(pathname)) {
    return "Course | ABS CUT";
  }

  return "ABS CUT | Luxury Fashion & Tailoring";
}