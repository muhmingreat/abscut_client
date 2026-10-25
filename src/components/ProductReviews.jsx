
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import "./ProductReviews.css";

const TOKEN_KEY = "absCutToken";
const MAX_COMMENT_LENGTH = 1000;

function getCurrentUserId() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = JSON.parse(
      decodeURIComponent(
        Array.from(atob(base64), (character) =>
          `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`
        ).join("")
      )
    );

    const user = decoded.user || decoded;
    const id = user._id || user.id || user.userId;

    return id ? String(id) : null;
  } catch {
    return null;
  }
}

function getCustomerName(customer) {
  if (!customer) return "ABS CUT Customer";

  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.name ||
    "ABS CUT Customer"
  );
}

function getCustomerId(customer) {
  if (!customer) return null;

  const id =
    typeof customer === "object"
      ? customer._id || customer.id
      : customer;

  return id ? String(id) : null;
}

function formatDate(date) {
  if (!date) return "";

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleDateString();
}

function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editingReview, setEditingReview] = useState(false);

  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    likeCount: 0,
    likedByUser: false,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [replyBusyId, setReplyBusyId] = useState(null);

  const [replyDrafts, setReplyDrafts] = useState({});
  const [editingReply, setEditingReply] = useState(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const currentUserId = useMemo(
    () => getCurrentUserId(),
    []
  );

  const ownReview = useMemo(
    () =>
      reviews.find(
        (review) =>
          currentUserId &&
          getCustomerId(review.customer) === currentUserId
      ) || null,
    [reviews, currentUserId]
  );

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(
        `/product-engagement/${productId}/reviews`
      );

      const nextReviews = response.reviews || [];

      setReviews(nextReviews);
      setSummary({
        averageRating: Number(response.averageRating) || 0,
        totalReviews: Number(response.totalReviews) || 0,
        likeCount: Number(response.likeCount) || 0,
        likedByUser: Boolean(response.liked),
      });

      return nextReviews;
    } catch (err) {
      setError(err.message || "Unable to load product reviews.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // The backend permits one review per customer per product.
  // Load an existing review into the form instead of creating a duplicate.
  useEffect(() => {
    if (!ownReview || editingReview || submitting) return;

    setRating(Number(ownReview.rating) || 0);
    setComment(ownReview.comment || "");
  }, [ownReview, editingReview, submitting]);

  const playLikeSound = () => {
    try {
      const audio = new Audio("/sounds/tukun.mp3");
      audio.volume = 0.35;
      audio.play().catch(() => {});
    } catch {
      // Sound is optional; liking should still work without it.
    }
  };

  const handleLike = async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setError("Please log in to like this product.");
      return;
    }

    if (likeBusy) return;

    setError("");
    setNotice("");

    const previousLiked = summary.likedByUser;
    const previousCount = summary.likeCount;
    const nextLiked = !previousLiked;

    setSummary((current) => ({
      ...current,
      likedByUser: nextLiked,
      likeCount: Math.max(
        0,
        current.likeCount + (nextLiked ? 1 : -1)
      ),
    }));

    setLikeBusy(true);

    try {
      const response = await apiRequest(
        `/product-engagement/${productId}/like`,
        { method: "POST" }
      );

      if (typeof response.liked === "boolean") {
        setSummary((current) => ({
          ...current,
          likedByUser: response.liked,
          likeCount:
            typeof response.likeCount === "number"
              ? response.likeCount
              : current.likeCount,
        }));

        if (response.liked && !previousLiked) {
          playLikeSound();
        }
      } else {
        await loadReviews();
      }
    } catch (err) {
      setSummary((current) => ({
        ...current,
        likedByUser: previousLiked,
        likeCount: previousCount,
      }));

      setError(err.message || "Unable to update your like.");
    } finally {
      setLikeBusy(false);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!localStorage.getItem(TOKEN_KEY)) {
      setError("Please log in to submit a review.");
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }

    const cleanComment = comment.trim();

    if (
      cleanComment.length < 2 ||
      cleanComment.length > MAX_COMMENT_LENGTH
    ) {
      setError("Your review must contain 2–1000 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest(
        `/product-engagement/${productId}/reviews`,
        {
          method: "PUT",
          body: JSON.stringify({
            rating,
            comment: cleanComment,
          }),
        }
      );

      setEditingReview(false);
      setNotice("Your review has been saved.");

      await loadReviews();
    } catch (err) {
      setError(err.message || "Unable to save your review.");
    } finally {
      setSubmitting(false);
    }
  };

  const startReviewEdit = (review) => {
    setRating(Number(review.rating) || 0);
    setComment(review.comment || "");
    setEditingReview(true);
    setError("");
    setNotice("");

    document
      .getElementById("product-review-comment")
      ?.focus();
  };

  const cancelReviewEdit = () => {
    setEditingReview(false);
    setRating(Number(ownReview?.rating) || 0);
    setComment(ownReview?.comment || "");
    setError("");
  };

  const handleDelete = async (reviewId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete your review?"
      )
    ) {
      return;
    }

    setError("");
    setNotice("");
    setDeletingReviewId(reviewId);

    try {
      await apiRequest(
        `/product-engagement/reviews/${reviewId}`,
        { method: "DELETE" }
      );

      setRating(0);
      setComment("");
      setEditingReview(false);
      setNotice("Your review has been deleted.");

      await loadReviews();
    } catch (err) {
      setError(err.message || "Unable to delete your review.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleReplySubmit = async (event, review) => {
    event.preventDefault();

    if (!localStorage.getItem(TOKEN_KEY)) {
      setError("Please log in to reply to a review.");
      return;
    }

    const draft = replyDrafts[review._id] || "";
    const cleanComment = draft.trim();

    if (cleanComment.length < 2 || cleanComment.length > 1000) {
      setError("Your reply must contain 2–1000 characters.");
      return;
    }

    setError("");
    setNotice("");
    setReplyBusyId(review._id);

    try {
      await apiRequest(
        `/product-engagement/reviews/${review._id}/replies`,
        {
          method: "POST",
          body: JSON.stringify({ comment: cleanComment }),
        }
      );

      setReplyDrafts((current) => ({
        ...current,
        [review._id]: "",
      }));

      setNotice("Your reply has been added.");
      await loadReviews();
    } catch (err) {
      setError(err.message || "Unable to add your reply.");
    } finally {
      setReplyBusyId(null);
    }
  };

  const handleReplyEdit = async (event, review, reply) => {
    event.preventDefault();

    const cleanComment = editingReply?.comment?.trim() || "";

    if (cleanComment.length < 2 || cleanComment.length > 1000) {
      setError("Your reply must contain 2–1000 characters.");
      return;
    }

    setError("");
    setNotice("");
    setReplyBusyId(reply._id);

    try {
      await apiRequest(
        `/product-engagement/reviews/${review._id}/replies/${reply._id}`,
        {
          method: "PUT",
          body: JSON.stringify({ comment: cleanComment }),
        }
      );

      setEditingReply(null);
      setNotice("Your reply has been updated.");
      await loadReviews();
    } catch (err) {
      setError(err.message || "Unable to edit your reply.");
    } finally {
      setReplyBusyId(null);
    }
  };

  const renderStars = (
    value,
    interactive = false,
    onSelect = setRating
  ) => (
    <div
      className="product-review-stars"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            className={`product-review-star ${
              star <= value ? "is-active" : ""
            }`}
            onClick={() => onSelect(value === star ? 0 : star)}
            aria-label={`Rate ${star} out of 5`}
            aria-pressed={value === star}
          >
            ★
          </button>
        ) : (
          <span
            key={star}
            className={`product-review-star ${
              star <= value ? "is-active" : ""
            }`}
          >
            ★
          </span>
        )
      )}
    </div>
  );

  return (
    <section className="product-reviews" aria-labelledby="reviews-heading">
      <div className="product-reviews-heading">
        <div>
          <span className="product-reviews-eyebrow">
            CUSTOMER FEEDBACK
          </span>
          <h2 id="reviews-heading">Reviews &amp; Ratings</h2>
          <p>Discover what customers think about this product.</p>
        </div>

        <button
          type="button"
          className={`product-like-button ${
            summary.likedByUser ? "is-liked" : ""
          }`}
          onClick={handleLike}
          disabled={likeBusy}
          aria-pressed={summary.likedByUser}
          aria-label={
            summary.likedByUser
              ? "Unlike this product"
              : "Like this product"
          }
        >
          <span aria-hidden="true">
            {summary.likedByUser ? "♥" : "♡"}
          </span>
          {likeBusy
            ? "Updating..."
            : summary.likedByUser
              ? "Liked"
              : "Like"}
          <span className="product-like-count">
            {summary.likeCount}
          </span>
        </button>
      </div>

      <div className="product-review-summary">
        <div className="product-review-average">
          <strong>{summary.averageRating.toFixed(1)}</strong>
          {renderStars(Math.round(summary.averageRating))}
          <span>
            {summary.totalReviews}{" "}
            {summary.totalReviews === 1 ? "review" : "reviews"}
          </span>
        </div>

        <div className="product-review-summary-copy">
          <strong>Made for your style.</strong>
          <p>
            Share your experience to help other customers choose confidently.
          </p>
        </div>
      </div>

      <form className="product-review-form" onSubmit={handleReviewSubmit}>
        <h3>
          {editingReview
            ? "Edit your review"
            : ownReview
              ? "Update your review"
              : "Write a review"}
        </h3>

        <label className="product-review-label">
          Your rating
        </label>

        {renderStars(rating, true)}

        <label
          className="product-review-label"
          htmlFor="product-review-comment"
        >
          Your comment
        </label>

        <textarea
          id="product-review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Tell us about the quality, style, or your experience..."
          maxLength={MAX_COMMENT_LENGTH}
          rows={4}
          required
        />

        <div className="product-review-form-footer">
          <span>{comment.length}/1000 characters</span>

          <div className="product-review-form-actions">
            {editingReview && (
              <button
                type="button"
                className="product-review-cancel"
                onClick={cancelReviewEdit}
                disabled={submitting}
              >
                Cancel
              </button>
            )}

            <button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingReview || ownReview
                  ? "Save Review"
                  : "Submit Review"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <p className="product-review-message is-error" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="product-review-message is-success" role="status">
          {notice}
        </p>
      )}

      <div className="product-review-list">
        <h3>Customer reviews</h3>

        {loading ? (
          <p className="product-review-empty">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="product-review-empty">
            No reviews yet. Be the first to share your experience.
          </p>
        ) : (
          reviews.map((review) => {
            const isOwner =
              currentUserId &&
              getCustomerId(review.customer) === currentUserId;

            const replies = review.replies || [];

            return (
              <article className="product-review-card" key={review._id}>
                <div className="product-review-avatar" aria-hidden="true">
                  {getCustomerName(review.customer)
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="product-review-content">
                  <div className="product-review-card-top">
                    <div>
                      <strong>
                        {getCustomerName(review.customer)}
                        {isOwner && (
                          <span className="product-review-you">You</span>
                        )}
                      </strong>
                      {renderStars(review.rating)}
                    </div>

                    <time dateTime={review.createdAt || undefined}>
                      {formatDate(review.createdAt)}
                    </time>
                  </div>

                  <p>{review.comment}</p>

                  {isOwner && (
                    <div className="product-review-actions">
                      <button
                        type="button"
                        className="product-review-edit"
                        onClick={() => startReviewEdit(review)}
                      >
                        Edit review
                      </button>

                      <button
                        type="button"
                        className="product-review-delete"
                        onClick={() => handleDelete(review._id)}
                        disabled={deletingReviewId === review._id}
                      >
                        {deletingReviewId === review._id
                          ? "Deleting..."
                          : "Delete review"}
                      </button>
                    </div>
                  )}

                  <div className="product-review-replies">
                    <h4>
                      Replies {replies.length > 0 && `(${replies.length})`}
                    </h4>

                    {replies.map((reply) => {
                      const replyOwner =
                        currentUserId &&
                        getCustomerId(reply.customer) === currentUserId;

                      const isEditingThisReply =
                        editingReply?.reviewId === review._id &&
                        editingReply?.replyId === reply._id;

                      return (
                        <div
                          className="product-review-reply"
                          key={reply._id}
                        >
                          <div className="product-review-reply-top">
                            <strong>
                              {getCustomerName(reply.customer)}
                              {replyOwner && (
                                <span className="product-review-you">
                                  You
                                </span>
                              )}
                            </strong>
                            <time dateTime={reply.createdAt || undefined}>
                              {formatDate(reply.updatedAt || reply.createdAt)}
                            </time>
                          </div>

                          {isEditingThisReply ? (
                            <form
                              className="product-review-reply-edit-form"
                              onSubmit={(event) =>
                                handleReplyEdit(event, review, reply)
                              }
                            >
                              <textarea
                                value={editingReply.comment}
                                onChange={(event) =>
                                  setEditingReply((current) => ({
                                    ...current,
                                    comment: event.target.value,
                                  }))
                                }
                                maxLength={MAX_COMMENT_LENGTH}
                                required
                                rows={3}
                              />

                              <div className="product-review-reply-actions">
                                <button
                                  type="submit"
                                  disabled={replyBusyId === reply._id}
                                >
                                  {replyBusyId === reply._id
                                    ? "Saving..."
                                    : "Save reply"}
                                </button>
                                <button
                                  type="button"
                                  className="product-review-cancel"
                                  onClick={() => setEditingReply(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p>{reply.comment}</p>
                          )}

                          {replyOwner && !isEditingThisReply && (
                            <button
                              type="button"
                              className="product-review-edit"
                              onClick={() =>
                                setEditingReply({
                                  reviewId: review._id,
                                  replyId: reply._id,
                                  comment: reply.comment || "",
                                })
                              }
                            >
                              Edit reply
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <form
                      className="product-review-reply-form"
                      onSubmit={(event) =>
                        handleReplySubmit(event, review)
                      }
                    >
                      <label
                        className="product-review-label"
                        htmlFor={`reply-${review._id}`}
                      >
                        Add a reply
                      </label>
                      <textarea
                        id={`reply-${review._id}`}
                        value={replyDrafts[review._id] || ""}
                        onChange={(event) =>
                          setReplyDrafts((current) => ({
                            ...current,
                            [review._id]: event.target.value,
                          }))
                        }
                        placeholder="Write a helpful reply..."
                        maxLength={MAX_COMMENT_LENGTH}
                        rows={2}
                        required
                      />
                      <button
                        type="submit"
                        disabled={replyBusyId === review._id}
                      >
                        {replyBusyId === review._id
                          ? "Sending..."
                          : "Reply"}
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export default ProductReviews;










// import { useCallback, useEffect, useState } from "react";
// import { apiRequest } from "../services/api";
// import "./ProductReviews.css";

// function ProductReviews({ productId }) {
//   const [reviews, setReviews] = useState([]);
//   const [rating, setRating] = useState(0);
//   const [comment, setComment] = useState("");
//   const [likeBusy, setLikeBusy] = useState(false);
//   const [summary, setSummary] = useState({
//     averageRating: 0,
//     totalReviews: 0,
//     likeCount: 0,
//     likedByUser: false,
//   });

//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [liking, setLiking] = useState(false);
//   const [error, setError] = useState("");
//   const [notice, setNotice] = useState("");

  
// const playLikeSound = () => {
//   const audio = new Audio("/sounds/tukun.mp3");
//   audio.volume = 0.35;

//   audio.play().catch(() => {});
// };
// playLikeSound();
//   const loadReviews = useCallback(async () => {
//     setLoading(true);
//     setError("");

//     try {
//       const response = await apiRequest(
//         `/product-engagement/${productId}/reviews`
//       );

//       setReviews(response.reviews || []);
//       setSummary({
//         averageRating: response.averageRating || 0,
//         totalReviews: response.totalReviews || 0,
//         likeCount: response.likeCount || 0,
//         likedByUser: Boolean(response.likedByUser),
//       });
//     } catch (err) {
//       setError(err.message || "Unable to load product reviews.");
//     } finally {
//       setLoading(false);
//     }
//   }, [productId]);

//   useEffect(() => {
//     loadReviews();
//   }, [loadReviews]);

//   const handleReviewSubmit = async (event) => {
//     event.preventDefault();
//     setError("");
//     setNotice("");

//     if (!localStorage.getItem("absCutToken")) {
//       setError("Please log in to submit a review.");
//       return;
//     }

//     if (!comment.trim()) {
//       setError("Please write a comment before submitting.");
//       return;
//     }

//     setSubmitting(true);

//     try {
//       await apiRequest(`/product-engagement/${productId}/reviews`, {
//         method: "PUT",
//         body: JSON.stringify({
//           rating,
//           comment: comment.trim(),
//         }),
//       });

//       setComment("");
//       setRating(0);
//       setNotice("Your review has been saved.");
//       await loadReviews();
//     } catch (err) {
//       setError(err.message || "Unable to save your review.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

// //   const handleLike = async () => {
// //     if (!localStorage.getItem("absCutToken")) {
// //       setError("Please log in to like this product.");
// //       return;
// //     }

// //     setLiking(true);
// //     setError("");
// //     setNotice("");

// //     try {
// //       await apiRequest(`/product-engagement/${productId}/like`, {
// //         method: "POST",
// //       });

// //       await loadReviews();
// //     } catch (err) {
// //       setError(err.message || "Unable to update your like.");
// //     } finally {
// //       setLiking(false);
// //     }
// //   };
// const handleLike = async () => {
//   if (!localStorage.getItem("absCutToken")) {
//     setError("Please log in to like this product.");
//     return;
//   }

//   if (likeBusy) return;

//   setError("");
//   setNotice("");

//   // Save the previous state in case the server request fails.
//   const previousLiked = summary.likedByUser;
//   const previousCount = summary.likeCount;
//   const nextLiked = !previousLiked;

//   // Update the UI immediately.
//   setSummary((current) => ({
//     ...current,
//     likedByUser: nextLiked,
//     likeCount: Math.max(
//       0,
//       current.likeCount + (nextLiked ? 1 : -1)
//     ),
//   }));

//   setLikeBusy(true);

//   try {
//     const response = await apiRequest(
//       `/product-engagement/${productId}/like`,
//       { method: "POST" }
//     );

//     // Use the server's confirmed result when available.
//     if (typeof response.liked === "boolean") {
//       setSummary((current) => ({
//         ...current,
//         likedByUser: response.liked,
//         likeCount:
//           typeof response.likeCount === "number"
//             ? response.likeCount
//             : current.likeCount,
//       }));
//     } else if (typeof response.likeCount === "number") {
//       setSummary((current) => ({
//         ...current,
//         likeCount: response.likeCount,
//       }));
//     }
//   } catch (err) {
//     // Roll back if the request fails.
//     setSummary((current) => ({
//       ...current,
//       likedByUser: previousLiked,
//       likeCount: previousCount,
//     }));

//     setError(err.message || "Unable to update your like.");
//   } finally {
//     setLikeBusy(false);
//   }
// };

//   const handleDelete = async (reviewId) => {
//     const confirmed = window.confirm(
//       "Are you sure you want to delete your review?"
//     );

//     if (!confirmed) return;

//     setError("");
//     setNotice("");

//     try {
//       await apiRequest(`/product-engagement/reviews/${reviewId}`, {
//         method: "DELETE",
//       });

//       setNotice("Your review has been deleted.");
//       await loadReviews();
//     } catch (err) {
//       setError(err.message || "Unable to delete your review.");
//     }
//   };

//   const renderStars = (value, interactive = false) => (
//     <div className="product-review-stars" aria-label={`${value} out of 5 stars`}>
//       {[1, 2, 3, 4, 5].map((star) =>
//         interactive ? (
//         //   <button
//         //     key={star}
//         //     type="button"
//         //     className={`product-review-star ${
//         //       star <= value ? "is-active" : ""
//         //     }`}
//         //     onClick={() => setRating(star)}
//         //     aria-label={`Rate ${star} out of 5`}
//         //     aria-pressed={rating === star}
//         //   >
//         //     ★
//         //   </button>
//         <button
//   key={star}
//   type="button"
//   className={`product-review-star ${
//     star <= value ? "is-active" : ""
//   }`}
//   onClick={() => setRating(rating === star ? 0 : star)}
//   aria-label={`Rate ${star} out of 5`}
//   aria-pressed={rating === star}
// >
//   ★
// </button>
//         ) : (
//           <span
//             key={star}
//             className={`product-review-star ${
//               star <= value ? "is-active" : ""
//             }`}
//           >
//             ★
//           </span>
//         )
//       )}
//     </div>
//   );

//   const getCustomerName = (customer) => {
//     if (!customer) return "ABS CUT Customer";

//     return (
//       [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
//       customer.name ||
//       "ABS CUT Customer"
//     );
//   };

//   return (
//     <section className="product-reviews" aria-labelledby="reviews-heading">
//       <div className="product-reviews-heading">
//         <div>
//           <span className="product-reviews-eyebrow">CUSTOMER FEEDBACK</span>
//           <h2 id="reviews-heading">Reviews & Ratings</h2>
//           <p>Discover what customers think about this product.</p>
//         </div>


// <button
//   type="button"
//   className={`product-like-button ${
//     summary.likedByUser ? "is-liked" : ""
//   }`}
//   onClick={handleLike}
//   aria-pressed={summary.likedByUser}
// >
//   <span aria-hidden="true">
//     {summary.likedByUser ? "♥" : "♡"}
//   </span>
//   {summary.likedByUser ? "Liked" : "Like"}
//   <span className="product-like-count">
//     {summary.likeCount}
//   </span>
// </button>

//       </div>

//       <div className="product-review-summary">
//         <div className="product-review-average">
//           <strong>{Number(summary.averageRating).toFixed(1)}</strong>
//           {renderStars(Math.round(summary.averageRating))}
//           <span>
//             {summary.totalReviews}{" "}
//             {summary.totalReviews === 1 ? "review" : "reviews"}
//           </span>
//         </div>

//         <div className="product-review-summary-copy">
//           <strong>Made for your style.</strong>
//           <p>
//             Share your experience to help other customers choose confidently.
//           </p>
//         </div>
//       </div>

//       <form className="product-review-form" onSubmit={handleReviewSubmit}>
//         <h3>Write a review</h3>
//         <label className="product-review-label">Your rating</label>
//         {renderStars(rating, true)}

//         <label className="product-review-label" htmlFor="product-review-comment">
//           Your comment
//         </label>
//         <textarea
//           id="product-review-comment"
//           value={comment}
//           onChange={(event) => setComment(event.target.value)}
//           placeholder="Tell us about the quality, style, or your experience..."
//           maxLength={1000}
//           rows={4}
//           required
//         />

//         <div className="product-review-form-footer">
//           <span>{comment.length}/1000 characters</span>
//           <button type="submit" disabled={submitting}>
//             {submitting ? "Submitting..." : "Submit Review"}
//           </button>
//         </div>
//       </form>

//       {error && (
//         <p className="product-review-message is-error" role="alert">
//           {error}
//         </p>
//       )}

//       {notice && (
//         <p className="product-review-message is-success" role="status">
//           {notice}
//         </p>
//       )}

//       <div className="product-review-list">
//         <h3>Customer reviews</h3>

//         {loading ? (
//           <p className="product-review-empty">Loading reviews...</p>
//         ) : reviews.length === 0 ? (
//           <p className="product-review-empty">
//             No reviews yet. Be the first to share your experience.
//           </p>
//         ) : (
//           reviews.map((review) => (
//             <article className="product-review-card" key={review._id}>
//               <div className="product-review-avatar" aria-hidden="true">
//                 {getCustomerName(review.customer).charAt(0).toUpperCase()}
//               </div>

//               <div className="product-review-content">
//                 <div className="product-review-card-top">
//                   <div>
//                     <strong>{getCustomerName(review.customer)}</strong>
//                     {renderStars(review.rating)}
//                   </div>

//                   <time dateTime={review.createdAt}>
//                     {review.createdAt
//                       ? new Date(review.createdAt).toLocaleDateString()
//                       : ""}
//                   </time>
//                 </div>

//                 <p>{review.comment}</p>

//                 <button
//                   type="button"
//                   className="product-review-delete"
//                   onClick={() => handleDelete(review._id)}
//                 >
//                   Delete review
//                 </button>
//               </div>
//             </article>
//           ))
//         )}
//       </div>
//     </section>
//   );
// }

// export default ProductReviews;
