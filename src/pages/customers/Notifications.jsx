
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  faBell,
  faCheckDouble,
  faTrash,
  faArrowRight,
  faInbox,
  faCircle,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../../services/notificationService";

import "./Notifications.css";

function formatDate(date) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  return value.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getNotificationIcon(type) {
  const icons = {
    order: "🛍️",
    "custom-order": "✂️",
    payment: "💳",
    "party-booking": "🎉",
    academy: "🎓",
    "academy-enrollment": "🎓",
    "academy-payment": "💳",
    support: "💬",
    general: "🔔",
  };

  return icons[type] || "🔔";
}

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      setError("");

      const response = await getNotifications({
        limit: 50,
        unread: filter === "unread",
      });

      setNotifications(response.notifications || []);
      setUnreadCount(
        response.unreadCount ??
        (response.notifications || []).filter((item) => !item.isRead).length
      );
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (notification) => {
    if (notification.isRead) return;

    try {
      await markNotificationAsRead(notification._id);

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === notification._id
            ? { ...item, isRead: true }
            : item
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (err) {
      setError(err.message || "Could not mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, isRead: true }))
      );

      setUnreadCount(0);
    } catch (err) {
      setError(err.message || "Could not mark notifications as read.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);

      const deleted = notifications.find((item) => item._id === id);

      setNotifications((previous) =>
        previous.filter((item) => item._id !== id)
      );

      if (deleted && !deleted.isRead) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch (err) {
      setError(err.message || "Could not delete notification.");
    }
  };

  const handleOpen = async (notification) => {
    await handleMarkRead(notification);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <main className="notification-page">
      <div className="notification-page-container">

        <header className="notification-page-header">
          <div>
            <span className="notification-eyebrow">
              ABS CUT ACCOUNT
            </span>

            <h1>
              <FontAwesomeIcon icon={faBell} />
              Notifications
            </h1>

            <p>
              Stay updated with your orders, payments, bookings and Academy activities.
            </p>
          </div>

          <button
            className="notification-refresh"
            onClick={() => loadNotifications(false)}
            disabled={refreshing}
          >
            <FontAwesomeIcon
              icon={faRotate}
              spin={refreshing}
            />
            Refresh
          </button>
        </header>

        <section className="notification-summary">
          <div>
            <span>Total displayed</span>
            <strong>{notifications.length}</strong>
          </div>

          <div>
            <span>Unread notifications</span>
            <strong>{unreadCount}</strong>
          </div>

          <div>
            <span>Account updates</span>
            <strong>
              <FontAwesomeIcon icon={faBell} />
            </strong>
          </div>
        </section>

        <section className="notification-center">

          <div className="notification-toolbar">
            <div className="notification-filters">
              <button
                className={filter === "all" ? "active" : ""}
                onClick={() => setFilter("all")}
              >
                All
              </button>

              <button
                className={filter === "unread" ? "active" : ""}
                onClick={() => setFilter("unread")}
              >
                Unread
                {unreadCount > 0 && (
                  <span>{unreadCount}</span>
                )}
              </button>
            </div>

            <button
              className="notification-mark-all"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <FontAwesomeIcon icon={faCheckDouble} />
              Mark all as read
            </button>
          </div>

          {error && (
            <div className="notification-error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="notification-loading">
              <span className="notification-spinner" />
              <p>Loading your notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <div>
                <FontAwesomeIcon icon={faInbox} />
              </div>

              <h3>
                {filter === "unread"
                  ? "You're all caught up"
                  : "No notifications yet"}
              </h3>

              <p>
                {filter === "unread"
                  ? "You have no unread notifications."
                  : "Updates about your ABS CUT activities will appear here."}
              </p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <article
                  key={notification._id}
                  className={`notification-item ${
                    !notification.isRead ? "unread" : ""
                  }`}
                >
                  <button
                    className="notification-item-content"
                    onClick={() => handleOpen(notification)}
                  >
                    <div className="notification-item-icon">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="notification-item-details">
                      <div className="notification-item-title">
                        <h3>{notification.title}</h3>

                        {!notification.isRead && (
                          <span className="notification-unread-label">
                            <FontAwesomeIcon icon={faCircle} />
                            New
                          </span>
                        )}
                      </div>

                      <p>{notification.message}</p>

                      <time>
                        {formatDate(notification.createdAt)}
                      </time>
                    </div>

                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="notification-item-arrow"
                    />
                  </button>

                  <button
                    className="notification-delete"
                    onClick={() => handleDelete(notification._id)}
                    aria-label="Delete notification"
                    title="Delete notification"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
