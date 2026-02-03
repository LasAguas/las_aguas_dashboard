"use client";

import { useEffect, useMemo, useState, useRef } from "react";  // ✅ Added useRef
import ArtistLayout from "../../../components/artist/ArtistLayout";
import { getMyArtistContext } from "../../../components/artist/artistData";
import { supabase } from "../../../lib/supabaseClient";
import { useFeedbackComments } from "../../../hooks/useFeedbackComments";  // ✅ NEW
import WeeklyInsightsModal from "../../../components/artist/WeeklyInsightsModal";

/** -------- helpers -------- */
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

/**
 * Get the Monday of the current week (in YYYY-MM-DD format)
 * This is used to identify which week's insights to show
 */
function getCurrentWeekMonday() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go back to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Robust "is active now" check. 
 * Handles date-only strings, timestamps, and null end_date.
 */
function isActiveNow(start_date, end_date, now = new Date()) {
  const s = start_date ? new Date(start_date) : null;
  if (!s || Number.isNaN(s.getTime())) return false;

  // If start_date is date-only (YYYY-MM-DD), treat as start of day.
  // JS Date("YYYY-MM-DD") is UTC-midnight; we still keep it consistent by comparing Date objects.
  const e = end_date ? new Date(end_date) : null;
  const startOK = s.getTime() <= now.getTime();
  const endOK = !e || Number.isNaN(e.getTime()) ? true : e.getTime() >= now.getTime();
  return startOK && endOK;
}

function needsReviewForPost(postId, allVariations) {
  const vars = (allVariations || []).filter((v) => v.post_id === postId);
  // If there are no variations with media, nothing to review
  if (!vars.length) return false;

  const hasGreenlight = vars.some((v) => v.greenlight === true);
  const hasUnresolvedFeedback = vars.some(
    (v) => (v.unresolved_feedback_count || 0) > 0
  );

  // Show if: NO unresolved feedback AND not greenlit
  return !hasUnresolvedFeedback && !hasGreenlight;
}

  
function Panel({ title, children }) {
  return (
    <div className="artist-panel p-4 md:p-5">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

/** -------- MediaPlayer - Complete feedback system (copied from artist-calendar) -------- */
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[80]">
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
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSubmitComment}
                    disabled={submittingComment || !newCommentText.trim()}
                    className="flex-1 rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-60"
                    style={{ backgroundColor: "#a89ee4", color: "#33296b" }}
                  >
                    {submittingComment ? 'Posting...' : 'Write feedback'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleGreenlight}
                    disabled={savingGreenlight}
                    className="flex-1 rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-60"
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
        </div>

      </div>
    </div>
  );
}


/** -------- post details modal (NO media at top) -------- */
function PostDetailsModal({ postId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [post, setPost] = useState(null);
  const [variations, setVariations] = useState([]);

  const [mediaVar, setMediaVar] = useState(null);

  useEffect(() => {
    if (!postId) return;
    const run = async () => {
      try {
        setLoading(true);
        setErr("");

        const { data: postRow, error: postErr } = await supabase
          .from("posts")
          .select("id, post_name, post_date, status, caption_a, caption_b, notes, song")
          .eq("id", postId)
          .single();

        if (postErr) throw postErr;
        setPost(postRow);

        const { data: vars, error: varsErr } = await supabase
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
          .eq("post_id", postId)
          .order("test_version", { ascending: true });

        if (varsErr) throw varsErr;
        setVariations(vars || []);
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load post details.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [postId]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" onClick={onClose}>
        <div
          className="artist-panel rounded-2xl shadow-lg w-[92vw] max-w-4xl max-h-[90vh] overflow-auto p-4 md:p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
                <div className="text-lg font-bold text-[#33296b]">Post Details</div>
                <div className="text-sm text-[#33296b]">
                {post?.post_name || "Post"}
                {post?.post_date && (
                    <>
                    {" "}
                    • {formatDDMMYY(post.post_date)}
                    </>
                )}
                </div>
            </div>

            <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
            >
                Close
            </button>
            </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : err ? (
            <div className="text-sm text-red-700">{err}</div>
          ) : (
            <>
              <div className="artist-secondary-panel p-3 rounded-xl mb-4">

                {post?.notes ? (
                  <div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">
                    <span className="font-semibold">Notes:</span> {post.notes}
                  </div>
                ) : null}

                {(() => {
                const hasA = !!(post?.caption_a && post.caption_a.trim());
                const hasB = !!(post?.caption_b && post.caption_b.trim());

                if (!hasA && !hasB) return null;

                return (
                    <div className="mt-3 max-w-xl w-full">
                    <div className="space-y-2">
                        {hasA && (
                        <div className="p-3 rounded-xl artist-card">
                            <div className="text-xs font-semibold text-[#33296b] mb-1">
                            Caption A
                            </div>
                            <div className="text-xs text-gray-700 whitespace-pre-wrap">
                            {post.caption_a}
                            </div>
                        </div>
                        )}
                        {hasB && (
                        <div className="p-3 rounded-xl artist-card">
                            <div className="text-xs font-semibold text-[#33296b] mb-1">
                            Caption B
                            </div>
                            <div className="text-xs text-gray-700 whitespace-pre-wrap">
                            {post.caption_b}
                            </div>
                        </div>
                        )}
                    </div>
                    </div>
                );
                })()}



              </div>

              <div>
                <div className="text-sm font-semibold text-[#33296b] mb-2">Variations</div>
                {variations.length === 0 ? (
                    <div className="text-sm text-gray-600">No variations yet.</div>
                ) : (
                    <div className="max-w-xl w-full">
                    <ul className="space-y-2">
                        {variations.map((v) => (
                        <button
                            key={v.id}
                            type="button"
                            className="w-full text-left p-3 rounded-xl artist-card flex items-start justify-between gap-3 disabled:opacity-60"
                            onClick={() => v.file_name && setMediaVar(v)}
                            disabled={!v.file_name}
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
                            </div>

                            <div className="text-xs text-gray-500 whitespace-nowrap">
                            {v.file_name ? "Tap to open" : "No media"}
                            </div>
                        </button>
                        ))}
                    </ul>
                    </div>
                )}
                </div>

            </>
          )}
        </div>
      </div>

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
    </>
  );
}

/** -------- main page -------- */
export default function ArtistHomePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [readyPosts, setReadyPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [selectedPostId, setSelectedPostId] = useState(null);
  
  // Weekly Insights Modal state
  const [showWeeklyInsights, setShowWeeklyInsights] = useState(false);
  const [weeklyInsightsWeek, setWeeklyInsightsWeek] = useState("");
  const [weeklyInsightsArtistId, setWeeklyInsightsArtistId] = useState("");
  const [weeklyInsightsProfileId, setWeeklyInsightsProfileId] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
  
        const { artistId } = await getMyArtistContext();
  
        const todayYMD = new Date().toISOString().slice(0, 10);
  
        // Upcoming posts: status MUST be 'ready' and in the future
        const { data: postsData, error: postsErr } = await supabase
          .from("posts")
          .select(
            "id, artist_id, post_name, post_date, status, caption_a, caption_b, notes, song"
          )
          .eq("artist_id", artistId)
          .eq("status", "ready") // <-- unchanged, we only READ this
          .gte("post_date", todayYMD)
          .order("post_date", { ascending: true })
          .limit(25);
  
        if (postsErr) throw postsErr;
        const posts = postsData || [];
  
        // Notifications (same as before)
        const { data: notifs, error: notifErr } = await supabase
          .from("artist_notifications")
          .select("id, artist_id, notification, start_date, end_date")
          .eq("artist_id", artistId)
          .order("start_date", { ascending: false })
          .limit(100);
  
        if (notifErr) throw notifErr;
  
        const now = new Date();
        const active = (notifs || []).filter((n) =>
          isActiveNow(n.start_date, n.end_date, now)
        );
        setNotifications(active);
  
        // Load variations for these posts
        const postIds = posts.map((p) => p.id);
        let vars = [];
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
          .not("file_name", "is", null);

        if (varsErr) throw varsErr;
        
        // ✅ Add unresolved comment count to each variation
        vars = (varsData || []).map(v => ({
          ...v,
          unresolved_feedback_count: (v.feedback_comments || []).filter(fc => !fc.resolved).length
        }));
        }
  
        // Filter posts: only those that still need review (no feedback & not greenlit)
        const filteredPosts = posts.filter((p) =>
          needsReviewForPost(p.id, vars)
        );
        setReadyPosts(filteredPosts);
  
        // Preload upcoming-content cache with only these posts + their variations
        if (typeof window !== "undefined" && filteredPosts.length) {
          const idSet = new Set(filteredPosts.map((p) => p.id));
          const filteredVars = vars.filter((v) => idSet.has(v.post_id));
  
          sessionStorage.setItem(
            "artistUpcomingCache",
            JSON.stringify({
              ts: Date.now(),
              posts: filteredPosts,
              variations: filteredVars,
            })
          );
        }
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);
  
  // Check if we should auto-show weekly insights
  useEffect(() => {
    async function checkWeeklyInsights() {
      try {
        // Get the current user's profile info
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const profileId = user.id;
        
        // Get the artist_id from profiles table
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("artist_id")
          .eq("id", profileId)
          .single();
        
        if (profileError || !profile || !profile.artist_id) {
          console.log("No artist_id found for profile");
          return;
        }
        
        const artistId = profile.artist_id;
        const currentMonday = getCurrentWeekMonday();
        
        // Check if there are insights for this artist_id for this week
        const { data: insights, error: insightsError } = await supabase
          .from("weekly_insights")
          .select("id, slide_paths")
          .eq("artist_id", artistId)
          .eq("week_start_date", currentMonday)
          .single();
        
        // If no insights exist for this week, don't show modal
        if (insightsError || !insights || !insights.slide_paths || insights.slide_paths.length === 0) {
          return;
        }
        
        // Check if THIS PROFILE has already viewed this week's insights
        const { data: viewData, error: viewError } = await supabase
          .from("weekly_insights_views")
          .select("id")
          .eq("profile_id", profileId)
          .eq("week_start_date", currentMonday)
          .limit(1);
        
        // If already viewed, don't show
        if (viewData && viewData.length > 0) {
          return;
        }
        
        // Show the modal!
        setWeeklyInsightsArtistId(artistId);
        setWeeklyInsightsProfileId(profileId);
        setWeeklyInsightsWeek(currentMonday);
        setShowWeeklyInsights(true);
        
      } catch (err) {
        console.error("Error checking weekly insights:", err);
        // Silently fail - don't interrupt user experience
      }
    }
    
    // Only run once on mount
    checkWeeklyInsights();
  }, []); // Empty dependency array = run once on mount

  const readyNeedingAction = useMemo(() => readyPosts, [readyPosts]);

  return (
    <ArtistLayout title="Home" forceDesktopOpen>
      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm artist-muted">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel title="Upcoming posts (ready) — need feedback / greenlight">
            {readyNeedingAction.length === 0 ? (
              <div className="text-sm text-gray-600">No upcoming ready posts.</div>
            ) : (
              <div className="space-y-3">
                {readyNeedingAction.map((p) => (
                <div
                    key={p.id}
                    className="w-full p-3 rounded-xl artist-panel-secondary hover:opacity-95"
                >
                    <div className="flex items-start justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setSelectedPostId(p.id)}
                        className="text-left w-full min-w-0"
                    >
                        <div className="text-sm font-medium text-[#33296b] truncate">
                        {p.post_name || `Post ${p.id}`}
                        </div>
                        <div className="text-xs text-gray-700">
                        {p.post_date ? formatDDMMYY(p.post_date) : ""} {p.song ? `• ${p.song}` : ""}
                        </div>
                        {p.notes ? (
                        <div className="mt-1 text-xs text-gray-700 line-clamp-2 whitespace-pre-wrap">
                            {p.notes}
                        </div>
                        ) : null}
                    </button>

                    <button
                        type="button"
                        onClick={async (e) => {
                        e.stopPropagation();
                        try {
                            const { error } = await supabase
                            .from("postvariations")
                            .update({ greenlight: true })
                            .eq("post_id", p.id);

                            if (error) throw error;
                        } catch (err) {
                            console.error("Failed to greenlight post", err);
                            alert("Failed to greenlight this post. See console for details.");
                        }
                        }}
                        className="px-2 py-1 text-[11px] rounded-lg shrink-0"
                        style={{ backgroundColor: "#bce1ac", color: "#33296b" }}
                    >
                        Greenlight
                    </button>
                    </div>
                </div>
                ))}


              </div>
            )}
          </Panel>

          <Panel title="Notifications">
            {notifications.length === 0 ? (
              <div className="text-sm text-gray-600">No notifications right now.</div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl artist-panel-secondary">
                    {/* show START DATE only (no end date), dd-mm-yy */}
                    <div className="text-xs text-gray-700 mb-1">
                      {n.start_date ? formatDDMMYY(n.start_date) : ""}
                    </div>
                    <div className="text-sm text-[#33296b] whitespace-pre-wrap">
                      {n.notification}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {selectedPostId && (
        <PostDetailsModal postId={selectedPostId} onClose={() => setSelectedPostId(null)} />
      )}
      
      {/* Weekly Insights Modal (auto-popup) */}
      <WeeklyInsightsModal
        open={showWeeklyInsights}
        onClose={() => setShowWeeklyInsights(false)}
        artistId={weeklyInsightsArtistId}
        profileId={weeklyInsightsProfileId}
        weekStartDate={weeklyInsightsWeek}
        isAutoPopup={true}
      />
    </ArtistLayout>
  );
}
