
import { apiRequest } from "./api";

// =====================================================
// GET NOTIFICATIONS
// =====================================================

export const getNotifications = async (options = {}) => {
  const params = new URLSearchParams();

  params.set("limit", options.limit || 20);

  if (options.unread) {
    params.set("unread", "true");
  }

  return apiRequest(`/notifications?${params.toString()}`);
};

// =====================================================
// GET UNREAD COUNT
// =====================================================

export const getUnreadNotificationCount = async () => {
  return apiRequest("/notifications/unread-count");
};

// =====================================================
// MARK ONE NOTIFICATION AS READ
// =====================================================

export const markNotificationAsRead = async (id) => {
  return apiRequest(`/notifications/${id}/read`, {
    method: "PATCH",
  });
};

// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// =====================================================

export const markAllNotificationsAsRead = async () => {
  return apiRequest("/notifications/read-all", {
    method: "PATCH",
  });
};

// =====================================================
// DELETE NOTIFICATION
// =====================================================

export const deleteNotification = async (id) => {
  return apiRequest(`/notifications/${id}`, {
    method: "DELETE",
  });
};
