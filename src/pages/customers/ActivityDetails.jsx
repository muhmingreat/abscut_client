
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../services/api";
import "./ActivityDetails.css";

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
    timeStyle: "short",
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

function getActivityId(comment) {
  return String(
    comment.activity?._id || comment.activity || ""
  );
}

export default function ActivityDetails() {
  const { activityId } = useParams();

  const [activity, setActivity] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError] = useState("");

  const [commentInput, setCommentInput] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);

  const [editingComment, setEditingComment] = useState("");
  const [editContent, setEditContent] = useState("");

  const [busy, setBusy] = useState(false);

  async function loadActivity() {
    setLoading(true);
    setError("");

    try {
      // Uses the existing public activities endpoint.
      const data = await apiRequest("/activities");

      const activities = Array.isArray(data.activities)
        ? data.activities
        : [];

      const found = activities.find(
        (item) => String(item._id) === String(activityId)
      );

      if (!found) {
        setActivity(null);
        setError("This activity could not be found.");
        return;
      }

      setActivity(found);
    } catch (err) {
      setError(err.message || "Could not load this activity.");
    } finally {
      setLoading(false);
    }
  }

  async function loadComments() {
    setCommentsLoading(true);

    try {
      const data = await apiRequest(
        `/activities/${activityId}/comments`
      );

      setComments(
        Array.isArray(data.comments) ? data.comments : []
      );
    } catch (err) {
      setError(err.message || "Could not load comments.");
    } finally {
      setCommentsLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
    loadComments();
  }, [activityId]);

  async function toggleLike() {
    if (!activity) return;

    setError("");

    try {
      const result = await apiRequest(
        `/activities/${activityId}/like`,
        { method: "POST" }
      );

      setActivity((current) => ({
        ...current,
        likedByMe: result.liked,
        likesCount: result.likesCount,
      }));
    } catch (err) {
      setError(err.message || "Please log in to like this activity.");
    }
  }

  function startReply(comment) {
    setReplyTarget(comment);
    setCommentInput("");
  }

  function cancelReply() {
    setReplyTarget(null);
    setCommentInput("");
  }

  async function submitComment(event) {
    event.preventDefault();

    const content = commentInput.trim();

    if (!content || busy) return;

    setBusy(true);
    setError("");

    try {
      await apiRequest(
        `/activities/${activityId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            content,
            parentComment: replyTarget?._id || null,
          }),
        }
      );

      setCommentInput("");
      setReplyTarget(null);

      await loadComments();

      setActivity((current) => ({
        ...current,
        commentsCount: (current.commentsCount || 0) + 1,
      }));
    } catch (err) {
      setError(err.message || "Could not submit your comment.");
    } finally {
      setBusy(false);
    }
  }

  function startEditComment(comment) {
    setEditingComment(comment._id);
    setEditContent(comment.content || "");
  }

  function cancelEditComment() {
    setEditingComment("");
    setEditContent("");
  }

  async function saveComment(comment) {
    const content = editContent.trim();

    if (!content) {
      setError("Comment cannot be empty.");
      return;
    }

    setError("");

    try {
      await apiRequest(
        `/activities/comments/${comment._id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ content }),
        }
      );

      cancelEditComment();
      await loadComments();
    } catch (err) {
      setError(err.message || "Could not update comment.");
    }
  }

  async function deleteComment(comment) {
    if (!window.confirm("Delete this comment and its replies?")) {
      return;
    }

    setError("");

    try {
      await apiRequest(
        `/activities/comments/${comment._id}`,
        { method: "DELETE" }
      );

      await loadComments();

      setActivity((current) => ({
        ...current,
        commentsCount: Math.max(
          0,
          (current.commentsCount || 0) - 1
        ),
      }));
    } catch (err) {
      setError(err.message || "Could not delete comment.");
    }
  }

  function renderComment(comment, isReply = false) {
    const childReplies = comments.filter(
      (entry) =>
        String(entry.parentComment?._id || entry.parentComment || "") ===
        String(comment._id)
    );

    const canManage =
      comment.isOwner === true || comment.canEdit === true;

    return (
      <div
        className={`abs-activity-comment ${
          isReply ? "is-reply" : ""
        }`}
        key={comment._id}
      >
        <div className="abs-activity-comment-body">
          <div className="abs-activity-comment-heading">
            <strong>
              {comment.user?.name || "ABS CUT member"}
            </strong>

            <time>{formatDate(comment.createdAt)}</time>
          </div>

          {editingComment === comment._id ? (
            <div className="abs-activity-comment-edit">
              <textarea
                rows="3"
                maxLength={2000}
                value={editContent}
                onChange={(event) =>
                  setEditContent(event.target.value)
                }
              />

              <div>
                <button
                  type="button"
                  onClick={() => saveComment(comment)}
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={cancelEditComment}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p>{comment.content}</p>
          )}

          <div className="abs-activity-comment-actions">
            {!isReply && (
              <button
                type="button"
                onClick={() => startReply(comment)}
              >
                Reply
              </button>
            )}

            {canManage && editingComment !== comment._id && (
              <>
                <button
                  type="button"
                  onClick={() => startEditComment(comment)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="is-danger"
                  onClick={() => deleteComment(comment)}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {childReplies.length > 0 && (
          <div className="abs-activity-replies">
            {childReplies.map((reply) =>
              renderComment(reply, true)
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="abs-feature-page abs-activity-details-page">
        <div className="abs-feature-state">
          Loading activity...
        </div>
      </main>
    );
  }

  if (!activity) {
    return (
      <main className="abs-feature-page abs-activity-details-page">
        <div className="abs-feature-empty">
          <h2>Activity not found</h2>
          <p>{error || "This activity may have been removed."}</p>
          <Link to="/activities" className="abs-feature-button">
            Back to activities
          </Link>
        </div>
      </main>
    );
  }

  const postType = getPostType(activity);
  const topLevelComments = comments.filter(
    (comment) => !comment.parentComment
  );

  return (
    <main className="abs-feature-page abs-activity-details-page">
      <section className="abs-activity-details-container">
        <Link
          to="/activities"
          className="abs-activity-back-link"
        >
          <span aria-hidden="true">←</span>
          Back to activities
        </Link>

        {error && (
          <div className="abs-feature-alert is-error" role="alert">
            {error}
          </div>
        )}

        <article className="abs-activity-details-card">
          {postType === "image" && activity.mediaUrl && (
            <div className="abs-activity-details-media">
              <img
                src={activity.mediaUrl}
                alt={activity.title || "ABS CUT activity"}
              />
            </div>
          )}

          {postType === "video" && activity.mediaUrl && (
            <div className="abs-activity-details-media">
              <video
                src={activity.mediaUrl}
                controls
                playsInline
                preload="metadata"
              />
            </div>
          )}

          <div className="abs-activity-details-content">
            <div className="abs-activity-details-meta">
              <span>
                {postType === "video"
                  ? "VIDEO"
                  : postType === "image"
                    ? "STUDIO STORY"
                    : "ARTICLE"}
              </span>

              <time>{formatDate(activity.createdAt)}</time>
            </div>

            <h1>
              {activity.title || activity.header || "ABS CUT Update"}
            </h1>

            {activity.header && activity.title && (
              <h2>{activity.header}</h2>
            )}

            <div className="abs-activity-full-content">
              {activity.content || activity.caption || ""}
            </div>

            <div className="abs-activity-social-actions">
              <button
                type="button"
                className={
                  activity.likedByMe
                    ? "abs-activity-like is-liked"
                    : "abs-activity-like"
                }
                onClick={toggleLike}
                aria-pressed={Boolean(activity.likedByMe)}
              >
                <span aria-hidden="true">
                  {activity.likedByMe ? "♥" : "♡"}
                </span>

                {activity.likesCount || 0} Likes
              </button>

              <span className="abs-activity-comment-count">
                {activity.commentsCount || comments.length} Comments
              </span>
            </div>
          </div>
        </article>

        <section className="abs-activity-comments abs-activity-details-comments">
          <div className="abs-activity-comments-heading">
            <div>
              <span className="abs-feature-eyebrow">
                JOIN THE CONVERSATION
              </span>

              <h2>Comments and replies</h2>
            </div>
          </div>

          <form
            className="abs-activity-comment-form"
            onSubmit={submitComment}
          >
            {replyTarget && (
              <div className="abs-activity-replying">
                Replying to{" "}
                <strong>
                  {replyTarget.user?.name || "ABS CUT member"}
                </strong>

                <button type="button" onClick={cancelReply}>
                  Cancel
                </button>
              </div>
            )}

            <textarea
              rows="3"
              maxLength={2000}
              placeholder={
                replyTarget
                  ? "Write your reply..."
                  : "Share your thoughts..."
              }
              value={commentInput}
              onChange={(event) =>
                setCommentInput(event.target.value)
              }
            />

            <button
              type="submit"
              disabled={busy || !commentInput.trim()}
            >
              {busy
                ? "Sending..."
                : replyTarget
                  ? "Send reply"
                  : "Post comment"}
            </button>
          </form>

          {commentsLoading ? (
            <p className="abs-activity-no-comments">
              Loading comments...
            </p>
          ) : topLevelComments.length === 0 ? (
            <p className="abs-activity-no-comments">
              No comments yet. Start the conversation.
            </p>
          ) : (
            <div className="abs-activity-comment-list">
              {topLevelComments.map((comment) =>
                renderComment(comment)
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
