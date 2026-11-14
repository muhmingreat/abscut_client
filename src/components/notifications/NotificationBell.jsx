
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faCheckDouble,
  faArrowRight,
  faTrash,
  faCircle,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "../../context/AppContext";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../../services/notificationService";

import {
  connectChatSocket,
} from "../../services/chatSocket";

import "./NotificationBell.css";

const formatNotificationDate = (date) => {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  return value.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

function NotificationBell() {
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const userId = currentUser?._id || currentUser?.id;

  const notificationPage =
    currentUser?.role === "admin"
      ? "/admin/notifications"
      : "/notifications";

  // ===================================================
  // LOAD UNREAD COUNT
  // ===================================================

  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await getUnreadNotificationCount();

      setUnreadCount(
        Number(response?.unreadCount || 0)
      );
    } catch (error) {
      console.error(
        "Unable to load notification count:",
        error
      );
    }
  }, [isAuthenticated]);

  // ===================================================
  // LOAD RECENT NOTIFICATIONS
  // ===================================================

  const loadRecentNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);

    try {
      const response = await getNotifications({
        limit: 8,
      });

      setNotifications(response?.notifications || []);

      setUnreadCount(
        Number(response?.unreadCount || 0)
      );
    } catch (error) {
      console.error(
        "Unable to load notifications:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ===================================================
  // INITIAL COUNT + SOCKET LISTENER
  // ===================================================

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    loadUnreadCount();

    let socket;

    const handleNewNotification = (notification) => {
      if (!notification) return;

      setUnreadCount((previous) => previous + 1);

      setNotifications((previous) => {
        const alreadyExists = previous.some(
          (item) => item._id === notification._id
        );

        if (alreadyExists) return previous;

        return [notification, ...previous].slice(0, 8);
      });
    };

    try {
      socket = connectChatSocket();

      socket.on(
        "notification:new",
        handleNewNotification
      );
    } catch (error) {
      console.error(
        "Notification socket connection error:",
        error
      );
    }

    return () => {
      socket?.off(
        "notification:new",
        handleNewNotification
      );
    };
  }, [isAuthenticated, userId, loadUnreadCount]);

  // ===================================================
  // LOAD DROPDOWN WHEN OPENED
  // ===================================================

  useEffect(() => {
    if (open) {
      loadRecentNotifications();
    }
  }, [open, loadRecentNotifications]);

  // ===================================================
  // MARK ONE AS READ
  // ===================================================

  const handleMarkAsRead = async (notification) => {
    if (!notification || notification.isRead) return;

    try {
      await markNotificationAsRead(notification._id);

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === notification._id
            ? {
                ...item,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : item
        )
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1)
      );
    } catch (error) {
      console.error(
        "Unable to mark notification as read:",
        error
      );
    }
  };

  // ===================================================
  // MARK ALL AS READ
  // ===================================================

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Unable to mark all notifications as read:",
        error
      );
    }
  };

  // ===================================================
  // DELETE NOTIFICATION
  // ===================================================

  const handleDelete = async (event, notification) => {
    event.stopPropagation();

    try {
      await deleteNotification(notification._id);

      setNotifications((previous) =>
        previous.filter(
          (item) => item._id !== notification._id
        )
      );

      if (!notification.isRead) {
        setUnreadCount((previous) =>
          Math.max(0, previous - 1)
        );
      }
    } catch (error) {
      console.error(
        "Unable to delete notification:",
        error
      );
    }
  };

  // ===================================================
  // OPEN NOTIFICATION
  // ===================================================

  const handleOpenNotification = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification);
    }

    setOpen(false);

    if (notification.link) {
      navigate(notification.link);
    } else {
      navigate(notificationPage);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="abs-notification-wrapper">
      <button
        type="button"
        className={`abs-notification-trigger ${
          open ? "is-active" : ""
        }`}
        aria-label={`Notifications${
          unreadCount ? `, ${unreadCount} unread` : ""
        }`}
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <FontAwesomeIcon icon={faBell} />

        {unreadCount > 0 && (
          <span className="abs-notification-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="abs-notification-backdrop"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />

          <div className="abs-notification-dropdown">
            <div className="abs-notification-heading">
              <div>
                <h3>Notifications</h3>
                <p>
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${
                        unreadCount === 1 ? "" : "s"
                      }`
                    : "You're all caught up"}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  className="abs-notification-mark-all"
                  onClick={handleMarkAllAsRead}
                >
                  <FontAwesomeIcon icon={faCheckDouble} />
                  <span>Read all</span>
                </button>
              )}
            </div>

            <div className="abs-notification-list">
              {loading ? (
                <div className="abs-notification-state">
                  <span className="abs-notification-spinner" />
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="abs-notification-state">
                  <FontAwesomeIcon icon={faBell} />
                  <p>No notifications yet.</p>
                  <span>
                    Updates from ABS CUT will appear here.
                  </span>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`abs-notification-item ${
                      notification.isRead ? "is-read" : "is-unread"
                    }`}
                    onClick={() =>
                      handleOpenNotification(notification)
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleOpenNotification(notification);
                      }
                    }}
                  >
                    <div className="abs-notification-item-indicator">
                      {!notification.isRead && (
                        <FontAwesomeIcon icon={faCircle} />
                      )}
                    </div>

                    <div className="abs-notification-item-content">
                      <h4>{notification.title}</h4>

                      <p>{notification.message}</p>

                      <time>
                        {formatNotificationDate(
                          notification.createdAt
                        )}
                      </time>
                    </div>

                    <button
                      type="button"
                      className="abs-notification-delete"
                      aria-label="Delete notification"
                      onClick={(event) =>
                        handleDelete(event, notification)
                      }
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="abs-notification-view-all"
              onClick={() => {
                setOpen(false);
                navigate(notificationPage);
              }}
            >
              View all notifications
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;
