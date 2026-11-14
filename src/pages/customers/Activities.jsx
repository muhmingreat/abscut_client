
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/api";
import "./Activities.css";

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(date);
}

function getPostType(item) {
  return (
    item.postType ||
    (item.mediaType === "video"
      ? "video"
      : item.mediaUrl
        ? "image"
        : "text")
  );
}

function getContent(item) {
  return item.content || item.caption || "";
}

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadActivities() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/activities");

      setActivities(
        Array.isArray(data.activities) ? data.activities : []
      );
    } catch (err) {
      setError(err.message || "Could not load activities.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
  }, []);

  return (
    <main className="abs-feature-page abs-activities-page">
      <section className="abs-feature-hero">
        <span className="abs-feature-eyebrow">
          BEHIND THE CRAFT
        </span>

        <h1>
          Life at <em>ABS CUT</em>
        </h1>

        <p>
          Discover our latest creations, fashion inspiration,
          studio updates, and the craftsmanship behind every detail.
        </p>
      </section>

      <section className="abs-feature-content">
        {error && (
          <div className="abs-feature-alert is-error" role="alert">
            {error}
            <button type="button" onClick={loadActivities}>
              Try again
            </button>
          </div>
        )}

        {loading && (
          <div className="abs-feature-state">
            Loading the latest activities...
          </div>
        )}

        {!loading && !error && activities.length === 0 && (
          <div className="abs-feature-empty">
            <span className="abs-feature-empty-mark">AC</span>
            <h2>New stories are on the way</h2>
            <p>
              Our latest studio updates and creations will appear here.
            </p>
          </div>
        )}

        {!loading && activities.length > 0 && (
          <div className="abs-activity-grid">
            {activities.map((item) => {
              const postType = getPostType(item);
              const content = getContent(item);

              return (
                <article
                  className="abs-activity-card"
                  key={item._id}
                >
                  <Link
                    to={`/activities/${item._id}`}
                    className="abs-activity-card-link"
                    aria-label={`Read ${item.title || "activity"} in full`}
                  >
                    <div className="abs-activity-card-media">
                      {postType === "image" && item.mediaUrl ? (
                        <img
                          src={item.mediaUrl}
                          alt={item.title || "ABS CUT activity"}
                          loading="lazy"
                        />
                      ) : postType === "video" && item.mediaUrl ? (
                        <video
                          src={item.mediaUrl}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="abs-activity-text-cover">
                          <span>ABS CUT</span>
                          <strong>BEHIND THE CRAFT</strong>
                        </div>
                      )}

                      <span className="abs-activity-card-type">
                        {postType === "video"
                          ? "VIDEO"
                          : postType === "image"
                            ? "STUDIO STORY"
                            : "ARTICLE"}
                      </span>
                    </div>

                    <div className="abs-activity-card-content">
                      <time>{formatDate(item.createdAt)}</time>

                      <h2>
                        {item.title || item.header || "ABS CUT Update"}
                      </h2>

                      {item.header && item.title && (
                        <h3>{item.header}</h3>
                      )}

                      <p className="abs-activity-card-description">
                        {content || "Discover more from ABS CUT."}
                      </p>

                      <span className="abs-activity-read-more">
                        Read full story
                        <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
