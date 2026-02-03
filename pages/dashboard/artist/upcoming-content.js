"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ArtistLayout from "../../../components/artist/ArtistLayout";
import { getMyArtistContext } from "../../../components/artist/artistData";
import { supabase } from "../../../lib/supabaseClient";
import { useFeedbackComments } from "../../../hooks/useFeedbackComments";  // ✅ NEW

/** ---------- helpers ---------- */

const pad2 = (n) => String(n).padStart(2, "0");
function formatDDMMYY(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return String(dateLike);
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function publicVariationUrl(fileName) {
  if (!fileName) return "";
  const { data } = supabase.storage.from("post-variations").getPublicUrl(fileName);
  return data?.publicUrl || "";
}

/** ---------- mute/unmute icon (2D SVG) ---------- */

function VolumeIcon({ muted }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path
        d="M4 9v6h4l5 4V5L8 9H4z"
        fill="white"
      />
      {!muted && (
        <path
          d="M15 9.5c1 .5 1.5 1.5 1.5 2.5s-.5 2-1.5 2.5"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {muted && (
        <path
          d="M17 8l4 4m0-4l-4 4"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/** ---------- media player modal (with feedback + greenlight) ---------- */

/** ---------- MediaPlayer - Complete feedback system (copied from artist-calendar) ---------- */
function MediaPlayer({ variation, onClose, onRefreshPost }) {
  const [mediaItems, setMediaItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  // ✅ Feedback comments hook
  const {
    comments,
    loading: commentsLoading,
    unresolvedCount,
    addComment,
    resolveComment,
    unresolveComment,
    deleteComment
  } = useFeedbackComments(variation?.id);

  // ✅ Feedback state
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showResolvedComments, setShowResolvedComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Snippet controls
  const [snippetStart, setSnippetStart] = useState(0);
  const [snippetDuration, setSnippetDuration] = useState(10);
  const [savingSnippet, setSavingSnippet] = useState(false);

  // Greenlight
  const [localGreenlight, setLocalGreenlight] = useState(
    Boolean(variation?.greenlight)
  );
  const [savingGreenlight, setSavingGreenlight] = useState(false);

  async function toggleGreenlight() {
    if (!variation?.id || savingGreenlight) return;

    setSavingGreenlight(true);
    const next = !localGreenlight;

    const { error } = await supabase
      .from("postvariations")
      .update({ greenlight: next })
      .eq("id", variation.id);

    setSavingGreenlight(false);

    if (error) {
      console.error(error);
      alert("Could not update greenlight status.");
      return;
    }

    setLocalGreenlight(next);
    variation.greenlight = next;

    if (typeof onRefreshPost === "function") onRefreshPost();
  }

  // Keep local state in sync when opening a different variation
  useEffect(() => {
    if (!variation) return;
    setSnippetStart(Number(variation.audio_start_seconds) || 0);
    setLocalGreenlight(Boolean(variation?.greenlight));
  }, [variation?.id]);

  // ✅ Handler to submit new comment
  async function handleSubmitComment() {
    if (!newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      await addComment(newCommentText);
      setNewCommentText("");
      if (typeof onRefreshPost === "function") onRefreshPost();
    } catch (err) {
      console.error("Failed to add comment:", err);
      alert("Could not add comment. See console for details.");
    } finally {
      setSubmittingComment(false);
    }
  }

  // ✅ Handler to delete comment
  async function handleDeleteComment(commentId) {
    if (!confirm("Delete this comment? This cannot be undone.")) return;

    try {
      await deleteComment(commentId);
      if (typeof onRefreshPost === "function") onRefreshPost();
    } catch (err) {
      console.error("Failed to delete comment:", err);
      alert("Could not delete comment. See console for details.");
    }
  }

  // ✅ Start editing a comment
  function handleStartEdit(comment) {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment_text);
  }

  // ✅ Cancel editing
  function handleCancelEdit() {
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  // ✅ Save edited comment
  async function handleSaveEdit(commentId) {
    if (!editingCommentText.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('feedback_comments')
        .update({ 
          comment_text: editingCommentText.trim(),
          edited_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      if (typeof onRefreshPost === "function") onRefreshPost();
      
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      console.error("Failed to save edit:", err);
      alert("Could not save changes. See console for details.");
    } finally {
      setSavingEdit(false);
    }
  }

  // ✅ Format timestamp
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  // Helper functions
  const getFileName = (p = "") => {
    const parts = String(p).split("/");
    return parts[parts.length - 1] || p;
  };

  const detectType = (path) => {
    const lower = String(path).toLowerCase();
    if (/\.(mp4|mov|webm|m4v)$/.test(lower)) return "video";
    if (/\.(jpg|jpeg|png|gif|webp)$/.test(lower)) return "image";
    return "unknown";
  };

  // Load media
  useEffect(() => {
    if (!variation) return;

    setMediaLoading(true);
    setMediaError(false);

    const paths =
      Array.isArray(variation.carousel_files) && variation.carousel_files.length > 0
        ? variation.carousel_files
        : variation.file_name
          ? [variation.file_name]
          : [];

    if (!paths.length) {
      setMediaItems([]);
      setMediaLoading(false);
      return;
    }

    const items = paths.map((p) => {
      const { data } = supabase.storage.from("post-variations").getPublicUrl(p);
      return {
        path: p,
        url: data?.publicUrl || "",
        type: detectType(p),
      };
    });

    setMediaItems(items);
    setCurrentIndex(0);
    setMediaLoading(false);
  }, [variation?.id]);

  const hasCarousel = mediaItems.length > 1;
  const activeUrl = mediaItems[currentIndex]?.url || null;
  const activeType = mediaItems[currentIndex]?.type || "unknown";

  const goPrev = () => {
    if (!hasCarousel) return;
    setCurrentIndex((i) => (i - 1 + mediaItems.length) % mediaItems.length);
  };

  const goNext = () => {
    if (!hasCarousel) return;
    setCurrentIndex((i) => (i + 1) % mediaItems.length);
  };

  const handleTouchStart = (e) => {
    if (!hasCarousel) return;
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!hasCarousel || touchStartX == null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 50) goPrev();
    else if (deltaX < -50) goNext();
    setTouchStartX(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg w-[95vw] max-w-4xl max-h-[90vh] overflow-auto p-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-700">
            <span className="font-semibold">
              {(variation.platforms && variation.platforms.length
                ? variation.platforms.join(", ")
                : "—")}
            </span>{" "}
            — {variation.test_version || "—"}
          </div>

          <div className="flex items-center gap-2">
            {hasCarousel && (
              <div className="text-xs text-gray-500">
                {currentIndex + 1} / {mediaItems.length}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Media */}
          <div>
            <div
              className="relative bg-black rounded-lg overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {mediaLoading && (
                <div className="flex items-center justify-center min-h-[300px]">
                  <div className="text-white text-sm">Loading media...</div>
                </div>
              )}

              {!mediaLoading && mediaError && (
                <div className="flex items-center justify-center min-h-[300px]">
                  <div className="text-red-300 text-sm">Failed to load media</div>
                </div>
              )}

              {!mediaLoading && !mediaError && activeUrl && (
                <>
                  {activeType === "video" ? (
                    <video
                      src={activeUrl}
                      controls
                      className="w-full"
                      style={{ maxHeight: "70vh" }}
                      onLoadStart={() => setMediaLoading(false)}
                      onError={() => setMediaError(true)}
                    />
                  ) : activeType === "image" ? (
                    <img
                      src={activeUrl}
                      alt="media"
                      className="w-full object-contain"
                      style={{ maxHeight: "70vh" }}
                      onLoad={() => setMediaLoading(false)}
                      onError={() => setMediaError(true)}
                    />
                  ) : (
                    <div className="text-white p-4">Unsupported file type</div>
                  )}
                </>
              )}

              {hasCarousel && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
                  >
                    ‹
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right side: Feedback */}
          <div>
            {/* ✅ FEEDBACK SECTION */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  Feedback {unresolvedCount > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
                      {unresolvedCount} unresolved
                    </span>
                  )}
                </h3>
              </div>

              {commentsLoading ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  Loading comments...
                </div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No feedback yet. Be the first to comment!
                </div>
              ) : (
                <>
                  {/* Unresolved comments */}
                  <div className="space-y-2 mb-3 max-h-[250px] overflow-y-auto">
                    {comments.filter(c => !c.resolved).map((comment) => (
                      <div
                        key={comment.id}
                        className="p-2 rounded border bg-yellow-50 border-yellow-200"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-1.5 text-xs flex-wrap">
                            <span className="font-medium text-gray-900">
                              {comment.user_name}
                            </span>
                            <span className="text-gray-500">
                              {formatTimestamp(comment.created_at)}
                            </span>
                            {comment.edited_at && (
                              <span className="text-gray-400 italic">
                                (edited {formatTimestamp(comment.edited_at)})
                              </span>
                            )}
                          </div>
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="mb-2">
                            <textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full border rounded p-2 text-sm min-h-[60px]"
                              disabled={savingEdit}
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">
                            {comment.comment_text}
                          </p>
                        )}

                        <div className="flex gap-1.5">
                          {editingCommentId === comment.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(comment.id)}
                                disabled={savingEdit}
                                className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                {savingEdit ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={savingEdit}
                                className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(comment)}
                                className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
                              >
                                Edit
                              </button>
                              
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {comments.filter(c => !c.resolved).length === 0 && (
                      <div className="text-sm text-gray-500 text-center py-3">
                        All feedback resolved! 🎉
                      </div>
                    )}
                  </div>

                  {/* Resolved comments - collapsible */}
                  {comments.filter(c => c.resolved).length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => setShowResolvedComments(!showResolvedComments)}
                        className="w-full text-left text-xs text-gray-600 hover:text-gray-900 py-2 px-3 bg-gray-50 rounded flex items-center justify-between"
                      >
                        <span>
                          {showResolvedComments ? '▼' : '▶'} Resolved ({comments.filter(c => c.resolved).length})
                        </span>
                      </button>

                      {showResolvedComments && (
                        <div className="space-y-2 mt-2 max-h-[200px] overflow-y-auto">
                          {comments.filter(c => c.resolved).map((comment) => (
                            <div
                              key={comment.id}
                              className="p-2 rounded border bg-gray-50 border-gray-200"
                            >
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                  <span className="font-medium text-gray-700">
                                    {comment.user_name}
                                  </span>
                                  <span className="text-gray-500">
                                    {formatTimestamp(comment.created_at)}
                                  </span>
                                  {comment.edited_at && (
                                    <span className="text-gray-400 italic">
                                      (edited {formatTimestamp(comment.edited_at)})
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                  ✓
                                </span>
                              </div>

                              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                {comment.comment_text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Add new comment */}
              <div className="border-t pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add new feedback
                </label>
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Leave feedback here..."
                  className="w-full border rounded p-2 text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submittingComment}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={submittingComment || !newCommentText.trim()}
                  className="mt-2 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>

            {/* Greenlight button */}
            <button
              type="button"
              onClick={toggleGreenlight}
              disabled={savingGreenlight}
              className="mt-4 w-full rounded-full px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60"
              style={{ backgroundColor: localGreenlight ? "#86d472" : "#bce1ac", color: "#33296b" }}
            >
              {savingGreenlight
                ? "Saving…"
                : localGreenlight
                  ? "Greenlit ✅"
                  : "Greenlight"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

/** ---------- Info panels (mobile + desktop) ---------- */

function VariationsList({ variations, onOpenVariation }) {
  if (!variations?.length) {
    return <div className="text-sm text-gray-600">No variations yet.</div>;
  }

  return (
    <div className="space-y-2">
      {variations.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => v.file_name && onOpenVariation(v)}
          disabled={!v.file_name}
          className="w-full text-left artist-panel-secondary p-3 rounded-xl flex items-start justify-between gap-3 disabled:opacity-60"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-[#33296b] truncate">
              {v.test_version ? `Variation ${v.test_version}` : `Variation ${v.id}`}
            </div>
            <div className="text-xs text-gray-600">
              {Array.isArray(v.platforms) && v.platforms.length
                ? v.platforms.join(", ")
                : "No platforms"}
              {v.length_seconds ? ` • ${v.length_seconds}s` : ""}
              {v.greenlight ? " • ✅ greenlit" : ""}
            </div>
            {v.feedback && (
              <div className="mt-1 text-xs text-gray-700 line-clamp-2 whitespace-pre-wrap">
                {v.feedback}
              </div>
            )}
          </div>
          <div className="text-[11px] text-gray-500 whitespace-nowrap">
            {v.file_name ? "Tap to play" : "No media"}
          </div>
        </button>
      ))}
    </div>
  );
}

function InfoPanel({ post, variations, onOpenVariation, onCaptionSaved }) {
  const [tempCaption, setTempCaption] = useState("");
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [savingCaption, setSavingCaption] = useState(false);
  
  useEffect(() => {
    // keep local draft in sync when selecting a different post
    const c = (post?.caption_a || post?.caption_b || "").trim();
    setTempCaption(c);
    setIsEditingCaption(false);
  }, [post?.id, post?.caption_a, post?.caption_b]);
  

  if (!post) {
    return (
      <div className="artist-panel p-4 md:p-5">
        <div className="text-sm text-gray-600">No post selected.</div>
      </div>
    );
  }

  const caption = (post.caption_a || post.caption_b || "").trim();

  return (
    <div className="artist-panel p-4 md:p-5">
      <div className="text-sm font-semibold text-[#33296b] mb-1">
        {post.post_name || "Post"}
      </div>
      <div className="text-xs text-gray-700 mb-2">
        {post.post_date ? formatDDMMYY(post.post_date) : "—"}
        {post.song ? ` • ${post.song}` : ""}
      </div>

      <div className="artist-panel-secondary p-3 rounded-xl mb-3 text-xs text-gray-700 whitespace-pre-wrap">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-[#33296b]">Caption</span>

          {!isEditingCaption ? (
            <button
              type="button"
              onClick={() => setIsEditingCaption(true)}
              className="px-3 py-1.5 text-xs rounded hover:opacity-90"
              style={{ backgroundColor: "#bbe1ac" }}
            >
              Edit
            </button>
          ) : null}
        </div>

        {isEditingCaption ? (
          <>
            <textarea
              value={tempCaption}
              onChange={(e) => setTempCaption(e.target.value)}
              className="w-full p-2 border rounded text-xs bg-white"
              rows={4}
              placeholder="Write a caption…"
            />

            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  const c = (post?.caption_a || post?.caption_b || "").trim();
                  setTempCaption(c);
                  setIsEditingCaption(false);
                }}
                className="px-3 py-1.5 text-xs bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={savingCaption}
                onClick={async () => {
                  try {
                    setSavingCaption(true);

                    const { error } = await supabase
                      .from("posts")
                      .update({ caption_a: tempCaption })
                      .eq("id", post.id);

                    if (error) throw error;

                    // keep UI in sync immediately
                    if (typeof onCaptionSaved === "function") onCaptionSaved(tempCaption);
                    setIsEditingCaption(false);
                  } catch (err) {
                    console.error("Error saving caption:", err);
                    alert("Failed to save caption.");
                  } finally {
                    setSavingCaption(false);
                  }
                }}
                className="px-3 py-1.5 text-xs rounded hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#bbe1ac" }}
              >
                {savingCaption ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </>
        ) : (
          <div className="min-h-[3rem] whitespace-pre-wrap break-words">
            {tempCaption?.trim() ? (
              tempCaption
            ) : (
              <span className="text-gray-400">No caption</span>
            )}
          </div>
        )}
      </div>


      {post.notes && (
        <div className="artist-panel-secondary p-3 rounded-xl mb-3 text-xs text-gray-700 whitespace-pre-wrap">
          <span className="font-semibold text-[#33296b]">Notes: </span>
          {post.notes}
        </div>
      )}

      <div className="text-sm font-semibold text-[#33296b] mb-2">Variations</div>
      <VariationsList variations={variations} onOpenVariation={onOpenVariation} />
    </div>
  );
}

function MobileInfoSheet({
  open,
  post,
  variations,
  onClose,
  onOpenVariation,
  onCaptionSaved,
}) {
  if (!open || !post) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center md:hidden"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative w-full max-w-xl artist-card rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-[#33296b]">Post info</div>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-md bg-black/5 hover:bg-black/10"
          >
            Close
          </button>
        </div>

        <InfoPanel
          post={post}
          variations={variations}
          onOpenVariation={onOpenVariation}
          onCaptionSaved={onCaptionSaved}
        />
      </div>
    </div>
  );
}

/** ---------- Vertical post feed item ---------- */

function PostFeedItem({
  post,
  variations,
  isActive,
  muted,
  captionExpanded,
  onToggleCaption,
  onToggleMute,
  onOpenInfo,
  onOpenFeedback,
  onGreenlightPost,
}) {
  const primaryVariation = variations?.find((v) => v.file_name) || null;
  const mediaUrl = primaryVariation ? publicVariationUrl(primaryVariation.file_name) : "";
  const filePath = primaryVariation?.file_name || "";
  const ext = (filePath.split(".").pop() || "").toLowerCase();
  const isVideo = ["mp4", "mov", "webm", "m4v"].includes(ext);
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);

  const videoRef = useRef(null);

  const captionText = (post.caption_a || post.caption_b || "No caption yet").trim();

  // Autoplay/pause when active changes
  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, isVideo]);

  const handleVideoClick = () => {
    if (!videoRef.current || !isVideo) return;
    const v = videoRef.current;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <div
        className="relative bg-black flex items-center justify-center rounded-2xl overflow-hidden w-full max-w-[520px]"
        style={{
          //height: "90vh",
          //maxHeight: "90vh",
          aspectRatio: "9 / 16",
          //width: "100%",
          //maxWidth: "520px",
        }}
      >
        {/* Media (letterboxed with dark bars when aspect doesn't match) */}
        {mediaUrl ? (
          isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-auto cursor-pointer"
              autoPlay={isActive}
              loop
              playsInline
              muted={muted}
              onClick={handleVideoClick}
            />
          ) : isImage ? (
            <img
              src={mediaUrl}
              alt={post.post_name || "Post media"}
              className="w-full h-auto"
            />
          ) : (
            <div className="text-sm text-white">Unsupported media type.</div>
          )
        ) : (
          <div className="text-sm text-white">No media attached yet.</div>
        )}

        {/* Dark overlay gradient at bottom for text/buttons */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Info button (top-left) */}
        <button
          type="button"
          onClick={onOpenInfo}
          className="absolute top-3 left-3 z-10 rounded-full w-8 h-8 flex items-center justify-center bg-black/60 text-white text-sm"
        >
          i
        </button>

        {/* Mute/unmute (top-right) */}
        <button
          type="button"
          onClick={onToggleMute}
          className="absolute top-3 right-3 z-10 rounded-full w-8 h-8 flex items-center justify-center bg-black/60 text-white"
        >
          <VolumeIcon muted={muted} />
        </button>

        {/* Bottom caption + buttons */}
        <div className="absolute inset-x-0 bottom-3 z-10 px-4 flex flex-col gap-2">
          <div
            className={
              "text-xs text-white mb-1 text-left cursor-pointer " +
              (captionExpanded
                ? "max-w-[60%] max-h-[50vh] overflow-y-auto"
                : "max-w-[60%] line-clamp-2")
            }
            onClick={onToggleCaption}
          >
            {captionText}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenFeedback}
              className="flex-1 rounded-full px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: "#a89ee4", color: "#33296b" }}
            >
              Write feedback
            </button>
            <button
              type="button"
              onClick={onGreenlightPost}
              className="flex-1 rounded-full px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: "#bce1ac", color: "#33296b" }}
            >
              Greenlight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- Main page ---------- */

export default function UpcomingContentPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [posts, setPosts] = useState([]);
  const [variationsByPostId, setVariationsByPostId] = useState(new Map());

  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false); // false = sound ON
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);
  const [mediaVar, setMediaVar] = useState(null);

  const itemRefs = useRef([]);

  // Reset caption expansion when changing post
  useEffect(() => {
    setCaptionExpanded(false);
  }, [activeIndex]);

  // Load data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const { artistId } = await getMyArtistContext();
        const todayYMD = new Date().toISOString().slice(0, 10);

        // 1) Posts must be status 'ready' and in the future
        const { data: postsData, error: postsErr } = await supabase
          .from("posts")
          .select(
            "id, artist_id, post_name, post_date, status, caption_a, caption_b, notes, song"
          )
          .eq("artist_id", artistId)
          .eq("status", "ready") // <- unchanged, only reading 'ready' posts
          .gte("post_date", todayYMD)
          .order("post_date", { ascending: true })
          .limit(100);

        if (postsErr) throw postsErr;

        const postIds = (postsData || []).map((p) => p.id);
        let varRows = [];

        // 2) Load variations for these posts (match home.js: join feedback_comments)
        if (postIds.length) {
          const { data: varsData, error: varsErr } = await supabase
            .from("postvariations")
            .select(`
              id,
              post_id,
              file_name,
              test_version,
              platforms,
              length_seconds,
              greenlight,
              feedback,
              feedback_resolved,
              feedback_comments!variation_id (
                id,
                resolved
              )
            `)
            .in("post_id", postIds)
            .order("post_id", { ascending: true })
            .order("test_version", { ascending: true });

          if (varsErr) throw varsErr;

          // ✅ Add unresolved count (same pattern as home.js)
          varRows = (varsData || []).map((v) => ({
            ...v,
            unresolved_feedback_count: (v.feedback_comments || []).filter((fc) => !fc.resolved).length,
          }));
        }


        // 3) Build a full map of variations by post_id
        const fullMap = new Map();
        varRows.forEach((v) => {
          if (!fullMap.has(v.post_id)) fullMap.set(v.post_id, []);
          fullMap.get(v.post_id).push(v);
        });

        // 4) Filter posts to those that still need review:
        //    - must have at least one variation
        //    - NO unresolved feedback
        //    - not greenlit
        const filteredPosts = (postsData || []).filter((p) => {
        const vars = fullMap.get(p.id) || [];
        if (!vars.length) return false;

        const hasGreenlight = vars.some((v) => v.greenlight === true);
        const hasUnresolvedFeedback = vars.some(
          (v) => (v.unresolved_feedback_count || 0) > 0
        );

        // ✅ Show posts that:
        // 1) Have NO unresolved feedback
        // 2) Are not greenlit
        return !hasUnresolvedFeedback && !hasGreenlight;
      });

        // 5) Keep only variations for those filtered posts
        const filteredMap = new Map();
        filteredPosts.forEach((p) => {
          const vars = fullMap.get(p.id) || [];
          filteredMap.set(p.id, vars);
        });

        setPosts(filteredPosts);
        setVariationsByPostId(filteredMap);
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load upcoming content.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // scroll-snap + active index detection
  useEffect(() => {
    const nodes = itemRefs.current;
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = activeIndex;
        let bestRatio = 0;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number(entry.target.dataset.index);
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = idx;
          }
        });

        if (bestRatio > 0.5 && bestIndex !== activeIndex) {
          setActiveIndex(bestIndex);
        }
      },
      {
        root: null,
        threshold: [0.4, 0.6, 0.8],
      }
    );

    nodes.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      nodes.forEach((el) => {
        if (el) observer.unobserve(el);
      });
      observer.disconnect();
    };
  }, [posts.length, activeIndex]);

  const activePost = posts[activeIndex] || null;
  const activeVariations = activePost
    ? variationsByPostId.get(activePost.id) || []
    : [];

  async function handleGreenlightPost(postId) {
    try {
      const { error } = await supabase
        .from("postvariations")
        .update({ greenlight: true })
        .eq("post_id", postId);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to greenlight post", err);
      alert("Failed to greenlight this post. See console for details.");
    }
  }

  function openVariationModal(v) {
    if (!v) return;
    setMuted(true); // mute background when modal opens
    setMediaVar(v);
  }

  function openFirstVariation(postId) {
    const vars = variationsByPostId.get(postId) || [];
    const v = vars.find((x) => x.file_name) || vars[0];
    if (v) openVariationModal(v);
  }

  return (
    <ArtistLayout title="Upcoming content">
      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm artist-muted">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="text-sm artist-muted">
          Congrats, all your upcoming posts have been reviewed – if you have a moment maybe try to{" "}
          <Link href="/dashboard/artist/onboarding" className="underline">
            finish off your uploads
          </Link>
          .
        </div>
      ) : (
        <>
          <div
            id="upcoming-feed"
            className="min-h-[90vh] overflow-y-scroll snap-y snap-mandatory"
          >
            {posts.map((post, idx) => {
              const variations = variationsByPostId.get(post.id) || [];
              const isActive = idx === activeIndex;

              return (
                <div
                  key={post.id}
                  data-index={idx}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  className="snap-start min-h-[90vh] flex flex-col md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)] md:gap-4"
                >
                  {/* Left: vertical video */}
                  <div className="flex items-center justify-center py-4 md:py-6">
                    <PostFeedItem
                      post={post}
                      variations={variations}
                      isActive={isActive}
                      muted={muted}
                      captionExpanded={captionExpanded}
                      onToggleCaption={() => setCaptionExpanded((v) => !v)}
                      onToggleMute={() => setMuted((m) => !m)}
                      onOpenInfo={() => setInfoOpen(true)}
                      onOpenFeedback={() => openFirstVariation(post.id)}
                      onGreenlightPost={() => handleGreenlightPost(post.id)}
                    />
                  </div>

                  {/* Right: desktop info for THIS post */}
                  <div className="hidden md:flex items-center">
                    <InfoPanel
                      post={post}
                      variations={variations}
                      onOpenVariation={openVariationModal}
                      onCaptionSaved={(nextCaption) => {
                        setPosts((prev) =>
                          prev.map((p) => (p.id === post.id ? { ...p, caption_a: nextCaption } : p))
                        );
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* hide scrollbar globally for this feed */}
          <style jsx global>{`
            #upcoming-feed {
              scrollbar-width: none; /* Firefox */
            }
            #upcoming-feed::-webkit-scrollbar {
              display: none; /* Chrome/Safari */
            }
          `}</style>
        </>
      )}

      {/* Mobile info sheet for active post */}
      <MobileInfoSheet
        open={infoOpen}
        post={activePost}
        variations={activeVariations}
        onClose={() => setInfoOpen(false)}
        onOpenVariation={openVariationModal}
        onCaptionSaved={(nextCaption) => {
          if (!activePost) return;
          setPosts((prev) =>
            prev.map((p) => (p.id === activePost.id ? { ...p, caption_a: nextCaption } : p))
          );
        }}
      />

      {/* Media player modal */}
      {mediaVar && (
        <MediaPlayer
          variation={mediaVar}
          onClose={() => setMediaVar(null)}
          onRefreshPost={() => {
            // Reload the page data
            setMediaVar(null);
            window.location.reload(); // Simple full refresh
          }}
        />
      )}
    </ArtistLayout>
  );
}
