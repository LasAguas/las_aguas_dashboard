'use client';
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Link from "next/link";
import ArtistLayout from "../../../components/artist/ArtistLayout";
import { mediaUrlCache, cacheGetUrl, cacheSetUrl } from '../../../hooks/usePreloadPriorityPosts';
import { useFeedbackComments } from '../../../hooks/useFeedbackComments';

// Helpers
const pad = (n) => String(n).padStart(2, '0')
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const getPathname = (url) => {
  const s = String(url || "");
  try {
    return new URL(s, window.location.origin).pathname;
  } catch {
    // fallback for weird/relative strings
    return s.split("#")[0].split("?")[0];
  }
};
//const mediaUrlCache = new Map(); // path -> string OR { url, expires }

const preloadVideoBytes = async (url, bytes = 256 * 1024) => {
  try {
    const res = await fetch(url, {
      headers: { Range: `bytes=0-${bytes - 1}` },
      cache: "force-cache",
    });
    console.log("📦 range preload", res.status, url);
  } catch (e) {
    console.log("📦 range preload failed", url, e);
  }
};

// ✅ Get cached URL - returns null if expired or missing
{/*function cacheGetUrl(path) {
  const v = mediaUrlCache.get(path);
  if (!v) return null;
  
  // Check if expired (signed URLs expire after 7200 seconds)
  if (v.expires && v.expires <= Date.now()) {
    mediaUrlCache.delete(path); // Remove expired entry
    return null;
  }
  
  return v.url || null;
}

// ✅ Cache URL with expiration timestamp (default 2 hours from now)
function cacheSetUrl(path, url, expiresMs = Date.now() + 7200000) {
  mediaUrlCache.set(path, { 
    url, 
    expires: expiresMs 
  });
}*/}

// ✅ Check if cache has valid (non-expired) URL
function cacheHasValidUrl(path) {
  const v = mediaUrlCache.get(path);
  if (!v?.url) return false;
  
  // Check expiration
  if (v.expires && v.expires <= Date.now()) {
    mediaUrlCache.delete(path); // Clean up expired entry
    return false;
  }
  
  return true;
}

// Single file URL fetch with image optimization
async function getOptimizedMediaUrl(path, options = {}) {
  const now = Date.now();

  // Create cache key that includes transformation options
  const cacheKey = options.fullSize ? `${path}:full` : path;

  if (cacheHasValidUrl(cacheKey)) {
    return cacheGetUrl(cacheKey);
  }

  // Detect if this is an image
  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(path);
  
  // Build transformation options for images
  const transformOptions = isImage && !options.fullSize ? {
    transform: {
      width: 1200,      // Max width for display
      height: 1200,     // Max height for display
      quality: 85,      // Good quality, smaller size
      format: 'webp'    // Modern format with better compression
    }
  } : undefined;

  const { data, error } = await supabase.storage
    .from("post-variations")
    .createSignedUrl(path, 604800, transformOptions);

  if (error) throw error;

  cacheSetUrl(cacheKey, data.signedUrl, now + 604800 * 1000);
  return data.signedUrl;
}

  // ✅ NEW: Batch fetch signed URLs for multiple files at once
async function getBatchOptimizedMediaUrls(paths, options = {}) {
  if (!paths || paths.length === 0) return [];
  
  const now = Date.now();
  const uncachedPaths = [];
  const cachedResults = [];

  // Step 1: Check cache for each path (with transformation-aware cache keys)
  for (const path of paths) {
    const cacheKey = options.fullSize ? `${path}:full` : path;
    if (cacheHasValidUrl(cacheKey)) {
      cachedResults.push({
        path,
        signedUrl: cacheGetUrl(cacheKey)
      });
    } else {
      uncachedPaths.push(path);
    }
  }

  // Step 2: If all cached, return immediately
  if (uncachedPaths.length === 0) {
    return cachedResults;
  }

  // Step 3: Split paths by type for appropriate transformations
  const imagePaths = uncachedPaths.filter(p => /\.(jpe?g|png|webp|gif)$/i.test(p));
  const videoPaths = uncachedPaths.filter(p => !imagePaths.includes(p));
  
  const newResults = [];

  // Step 4a: Fetch images WITH transformations (unless fullSize requested)
  if (imagePaths.length > 0 && !options.fullSize) {
    const { data, error } = await supabase.storage
      .from("post-variations")
      .createSignedUrls(imagePaths, 604800, {
        transform: {
          width: 1200,
          height: 1200,
          quality: 85,
          format: 'webp'
        }
      });

    if (!error && data) {
      newResults.push(...data);
    } else if (error) {
      console.error('Error fetching transformed images:', error);
    }
  } else if (imagePaths.length > 0) {
    // Step 4b: Fetch images WITHOUT transformations (fullSize requested)
    const { data, error } = await supabase.storage
      .from("post-variations")
      .createSignedUrls(imagePaths, 604800);

    if (!error && data) {
      newResults.push(...data);
    } else if (error) {
      console.error('Error fetching full-size images:', error);
    }
  }

  // Step 5: Fetch videos WITHOUT transformations (videos can't be transformed)
  if (videoPaths.length > 0) {
    const { data, error } = await supabase.storage
      .from("post-variations")
      .createSignedUrls(videoPaths, 604800);

    if (!error && data) {
      newResults.push(...data);
    } else if (error) {
      console.error('Error fetching videos:', error);
    }
  }

  // Step 6: Cache the new URLs (with transformation-aware cache keys)
  newResults.forEach((item) => {
    if (item.signedUrl) {
      const cacheKey = options.fullSize ? `${item.path}:full` : item.path;
      cacheSetUrl(cacheKey, item.signedUrl, now + 604800 * 1000);
    }
  });

  // Step 7: Combine cached + newly fetched
  return [...cachedResults, ...newResults];
}

const PLATFORM_OPTIONS = [
  { value: 'Instagram',   label: 'Instagram',   short: 'IG' },
  { value: 'TikTok',      label: 'TikTok',      short: 'TT' },
  { value: 'YouTube',     label: 'YouTube',     short: 'YT' },
  { value: 'Mailing List', label: 'Mailing List', short: 'ML' },
];

// Move a post from one day ...


// Move a post from one day (sourceYMD) to another (destYMD) inside weeks[]
function movePostInWeeks(weeksArr, postId, sourceYMD, destYMD, destIndex = 0) {
  const clone = weeksArr.map(w => ({
    ...w,
    days: w.days.map(d => ({ ...d, posts: [...d.posts] }))
  }))

  // Find source day + extract post
  let movedPost = null
  for (const w of clone) {
    for (const d of w.days) {
      if (d.ymd === sourceYMD) {
        const idx = d.posts.findIndex(p => p.id === postId)
        if (idx !== -1) {
          movedPost = d.posts.splice(idx, 1)[0]
          break
        }
      }
    }
    if (movedPost) break
  }
  if (!movedPost) return clone

  // Insert into dest day
  for (const w of clone) {
    for (const d of w.days) {
      if (d.ymd === destYMD) {
        const insertAt = Math.max(0, Math.min(destIndex, d.posts.length))
        d.posts.splice(insertAt, 0, { ...movedPost, post_date: destYMD })
        return clone
      }
    }
  }

  // If destination not found (shouldn't happen), put it back where it was
  return weeksArr
}

function MediaPlayer({ variation, onClose, onRefreshPost, onOpenCaptions }) {
  const [mediaItems, setMediaItems] = useState([]); // [{ path, url, type }]
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  
  // ✅ Track loading state for videos/images to show spinner
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  // ✅ NEW: Use feedback comments hook instead of single feedback field
  const {
    comments,
    loading: commentsLoading,
    unresolvedCount,
    addComment,
    resolveComment,
    unresolveComment,
    deleteComment
  } = useFeedbackComments(variation?.id);

  // ✅ NEW: New Feedback System w Feedback
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showResolvedComments, setShowResolvedComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // ✅ ADD caption editing state
  const [isEditingCaptions, setIsEditingCaptions] = useState(false);
  const [editableCaptionA, setEditableCaptionA] = useState("");
  const [editableCaptionB, setEditableCaptionB] = useState("");
  const [savingCaptions, setSavingCaptions] = useState(false);

  // Snippet controls (artist is allowed to change + save)
  const [snippetStart, setSnippetStart] = useState(0);
  const [snippetDuration, setSnippetDuration] = useState(10);
  const [savingSnippet, setSavingSnippet] = useState(false);

  // Greenlight (copying working pattern from admin calendar)
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
  // keep the passed object in sync too (helps other UI that reads variation.greenlight)
  variation.greenlight = next;

  // optional, if you later pass it in
  if (typeof onRefreshPost === "function") onRefreshPost();
}


  // Keep local state in sync when opening a different variation
  useEffect(() => {
    if (!variation) return;
    // ✅ Removed old setFeedback - now using comment system
    setSnippetStart(Number(variation.audio_start_seconds) || 0);
    
    // ✅ Sync caption editing state
    setEditableCaptionA(variation.caption_a || "");
    setEditableCaptionB(variation.caption_b || "");
    setIsEditingCaptions(false); // Reset edit mode when switching variations
  }, [variation?.id]);

  const getFileName = (p = "") => {
    const parts = String(p).split("/");
    return parts[parts.length - 1] || p;
  };
  
  const getCarouselOrder = (p = "") => {
    const base = getFileName(p).replace(/\.[^/.]+$/, "");
    const nums = base.match(/\d+/g);
    if (!nums || nums.length === 0) return Number.MAX_SAFE_INTEGER;
    return parseInt(nums[nums.length - 1], 10);
  };  

  const detectType = (path = "") => {
    const p = String(path).toLowerCase();
    if (p.match(/\.(mp4|mov|webm|m4v)$/i)) return "video";
    if (p.match(/\.(jpe?g|png|gif|webp)$/i)) return "image";
    return "file";
  };

  // ✅ Load media URLs (single file or carousel) - PARALLEL fetching for speed
useEffect(() => {
  if (!variation) return;

  // Determine which files to load (carousel or single file)
  const pathsRaw =
    Array.isArray(variation.carousel_files) && variation.carousel_files.length > 0
      ? variation.carousel_files
      : variation.file_name
      ? [variation.file_name]
      : [];

  // Numeric sort by "frame number" (last numeric chunk), fallback to filename compare
  const getCarouselOrder = (p = "") => {
    const base = getFileName(p).replace(/\.[^/.]+$/, ""); // strip extension
    const nums = base.match(/\d+/g);
    if (!nums || nums.length === 0) return Number.MAX_SAFE_INTEGER;
    return parseInt(nums[nums.length - 1], 10); // last number in filename
  };
  
  const paths = [...pathsRaw].sort((a, b) => {
    const oa = getCarouselOrder(a);
    const ob = getCarouselOrder(b);
    if (oa !== ob) return oa - ob;
  
    return getFileName(a).localeCompare(getFileName(b), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  if (!paths.length) {
    setMediaItems([]);
    setCurrentIndex(0);
    return;
  }

  // ✅ Async function to fetch ALL URLs using batch API
  // ✅ Progressive loading: Load first item immediately, then rest in background
  async function loadAllMediaUrls() {
      try {
        // Step 1: Load ONLY the first item immediately
        const firstResult = await getBatchOptimizedMediaUrls([paths[0]]);
        
        // Step 2: Display the first item right away (don't wait for others)
        if (firstResult.length > 0) {
          const firstItem = {
            path: firstResult[0].path,
            url: firstResult[0].signedUrl,
            type: detectType(firstResult[0].path)
          };
          setMediaItems([firstItem]);
          setCurrentIndex(0);
        }

        // Step 3: Load remaining items in background (only if there are more)
        if (paths.length > 1) {
          const restResults = await getBatchOptimizedMediaUrls(paths.slice(1));
          
          // Step 4: Combine first item + rest and update state
          const allItems = [
            ...firstResult,
            ...restResults
          ].map((result) => ({
            path: result.path,
            url: result.signedUrl,
            type: detectType(result.path)
          }));
          
          setMediaItems(allItems);
          // Note: currentIndex stays 0, so user stays on first item
        }
      } catch (err) {
        console.error("Error loading media URLs:", err);
        setMediaItems([]);
        setCurrentIndex(0);
        alert("Could not load media. See console for details.");
      }
    }

    loadAllMediaUrls();
  }, [variation?.id, variation?.file_name, variation?.carousel_files]);

  // Load audio snippet URL (uses shared cache so preloads are reused)
useEffect(() => {
  if (!variation?.audio_file_name) {
    setAudioUrl(null);
    return;
  }

  const cachedAudio = cacheGetUrl(variation.audio_file_name);
  if (cachedAudio) {
    setAudioUrl(cachedAudio);
    return;
  }

  (async () => {
    const { data, error } = await supabase.storage
      .from("post-variations")
      .getPublicUrl(variation.audio_file_name);
    
    if (error) {
      console.error("Error fetching audio URL:", error);
      setAudioUrl(null);
    } else {
      cacheSetUrl(variation.audio_file_name, data.publicUrl);
      setAudioUrl(data.publicUrl);
    }
  })();
}, [variation?.audio_file_name]);

// ✅ Derive active FIRST (so hooks can safely use it)
const hasCarousel = mediaItems.length > 1;
const active = mediaItems[currentIndex] || null;
const activeUrl = active?.url || null;

// Reset loading state when user navigates between carousel items
useEffect(() => {
  if (!activeUrl) return;
  setMediaLoading(true);
  setMediaError(false);
}, [activeUrl]);

if (!variation) return null;

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

  const formatTime = (sec) => {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = String(s % 60).padStart(2, "0");
    return `${m}:${r}`;
  };

  const handlePlaySnippet = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const start = Number(snippetStart) || 0;
    const dur = Number(snippetDuration) || 0;

    audio.currentTime = start;
    audio.muted = false;

    audio.play().catch((e) => console.error("Audio play error:", e));

    if (dur > 0) {
      setTimeout(() => {
        if (!audio.paused) audio.pause();
      }, dur * 1000);
    }
  };

  const handleSaveSnippetStart = async () => {
    if (!variation?.id) return;
    setSavingSnippet(true);

    const { error } = await supabase
      .from("postvariations")
      .update({ audio_start_seconds: Number(snippetStart) || 0 })
      .eq("id", variation.id);

    setSavingSnippet(false);

    if (error) {
      console.error("Error saving snippet start:", error);
      alert("Could not save snippet start.");
      return;
    }

    // keep local variation in sync
    variation.audio_start_seconds = Number(snippetStart) || 0;
    if (typeof onRefreshPost === "function") onRefreshPost();
  };

  // ✅ NEW: Handler to submit new comment
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

  // ✅ NEW: Handler to resolve/unresolve comment
  async function handleToggleResolve(comment) {
    try {
      if (comment.resolved) {
        await unresolveComment(comment.id);
      } else {
        await resolveComment(comment.id);
      }
      if (typeof onRefreshPost === "function") onRefreshPost();
    } catch (err) {
      console.error("Failed to toggle resolve:", err);
      alert("Could not update comment. See console for details.");
    }
  }

  // ✅ NEW: Handler to delete comment
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

  // ✅ NEW: Start editing a comment
  function handleStartEdit(comment) {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment_text);
  }

  // ✅ NEW: Cancel editing
  function handleCancelEdit() {
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  // ✅ NEW: Save edited comment
  async function handleSaveEdit(commentId) {
    if (!editingCommentText.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    setSavingEdit(true);
    try {
      // Update comment in database with edited timestamp
      const { error } = await supabase
        .from('feedback_comments')
        .update({ 
          comment_text: editingCommentText.trim(),
          edited_at: new Date().toISOString()  // ✅ NEW: Track when edited
        })
        .eq('id', commentId);

      if (error) throw error;

      // Update local state in the hook (force reload)
      if (typeof onRefreshPost === "function") onRefreshPost();
      
      // Reset edit state
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      console.error("Failed to save edit:", err);
      alert("Could not save changes. See console for details.");
    } finally {
      setSavingEdit(false);
    }
  }

  // ✅ NEW: Format timestamp for display
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg w-[95vw] max-w-4xl max-h-[90vh] overflow-auto p-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          aria-label="Close media player"
        >
          ✕
        </button>

        {/* ✅ Header spans BOTH columns so captions panel aligns with media top */}
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
              className="relative w-full bg-gray-100 rounded overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* ✅ Only show content if we have an active item */}
              {!active ? (
                <div className="p-6 text-sm text-gray-600">Loading media...</div>
              ) : active.type === "video" ? (
                <>
                  <video
                    controls
                    className="w-full h-auto"
                    src={active.url}
                    onLoadStart={() => {
                      setMediaLoading(true);
                      setMediaError(false);
                    }}
                    onCanPlay={() => {
                      setMediaLoading(false);
                    }}
                    onError={(e) => {
                      console.error("Video load error:", e);
                      setMediaLoading(false);
                      setMediaError(true);
                    }}
                  />

                  {/* ✅ Loading spinner overlay */}
                  {mediaLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="text-white text-sm bg-black/60 px-4 py-2 rounded">
                        Loading video...
                      </div>
                    </div>
                  )}

                  {/* ✅ Error message overlay */}
                  {mediaError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                      <div className="text-red-800 text-sm text-center px-4">
                        Failed to load video.
                        <br />
                        Please try refreshing.
                      </div>
                    </div>
                  )}
                </>
              ) : active.type === "image" ? (
                <>
                  <img
                    src={active.url}
                    alt={getFileName(active.path)}
                    className="w-full h-auto object-contain"
                    onLoadStart={() => {
                      setMediaLoading(true);
                      setMediaError(false);
                    }}
                    onLoad={() => {
                      setMediaLoading(false);
                    }}
                    onError={(e) => {
                      console.error("Image load error:", e);
                      setMediaLoading(false);
                      setMediaError(true);
                    }}
                  />

                  {/* ✅ Loading spinner overlay */}
                  {mediaLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                      <div className="text-gray-700 text-sm">Loading image...</div>
                    </div>
                  )}

                  {/* ✅ Error message overlay */}
                  {mediaError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                      <div className="text-red-800 text-sm text-center px-4">
                        Failed to load image.
                        <br />
                        Please try refreshing.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 text-sm text-gray-600">Unsupported media type.</div>
              )}

              {hasCarousel && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-9 h-9 flex items-center justify-center shadow"
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-9 h-9 flex items-center justify-center shadow"
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Audio snippet */}
            {audioUrl && (
              <div className="mt-4 border rounded p-3">
                <div className="text-sm font-semibold mb-2">Song snippet</div>

                <audio ref={audioRef} controls src={audioUrl} className="w-full" />

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Start (seconds) — {formatTime(snippetStart)}
                    </label>
                    <input
                      type="number"
                      value={snippetStart}
                      onChange={(e) => setSnippetStart(Number(e.target.value) || 0)}
                      className="w-full border rounded p-1"
                      min={0}
                      step={1}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={snippetDuration}
                      onChange={(e) => setSnippetDuration(Number(e.target.value) || 0)}
                      className="w-full border rounded p-1"
                      min={0}
                      step={1}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handlePlaySnippet}
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                  >
                    Preview snippet
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSnippetStart}
                    disabled={savingSnippet}
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs disabled:opacity-60"
                  >
                    {savingSnippet ? "Saving…" : "Save snippet start"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ✅ Captions section - shows while video loads */}
          <div>
            {(variation.caption_a || variation.caption_b) && (
              <div className="mb-4 p-3 bg-gray-50 rounded border">
                <div className="text-sm font-semibold mb-2">Caption(s)</div>

                {variation.caption_a && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-600 mb-1">Caption A:</div>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {variation.caption_a}
                    </div>
                  </div>
                )}

                {variation.caption_b && (
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Caption B:</div>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {variation.caption_b}
                    </div>
                  </div>
                )}
                  {/* ✅ Button to open captions modal (Step 2) */}
                  <button
                    type="button"
                    onClick={() => onOpenCaptions?.()}
                    className="text-xs px-2 py-1 rounded bg-[#bbe1ac] hover:opacity-90"
                  >
                    Edit Captions
                  </button>
              </div>
            )}

            {/* ============================================================================ */}
            {/* ✅ FEEDBACK SECTION - Editable, oldest first, resolved collapsible */}
            {/* ============================================================================ */}
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
                  {/* ✅ UNRESOLVED COMMENTS - Always visible */}
                  <div className="space-y-2 mb-3 max-h-[250px] overflow-y-auto">
                    {comments.filter(c => !c.resolved).map((comment) => (
                      <div
                        key={comment.id}
                        className="p-2 rounded border bg-gray-50 border-gray-200" // CHANGE
                      >
                        {/* Comment header */}
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-1.5 text-xs flex-wrap">
                            <span className="font-medium text-gray-900">
                              {comment.user_name}
                            </span>
                            <span className="text-gray-500">
                              {formatTimestamp(comment.created_at)}
                            </span>
                            {/* ✅ NEW: Show edited timestamp if comment was edited */}
                            {comment.edited_at && (
                              <span className="text-gray-400 italic">
                                (edited {formatTimestamp(comment.edited_at)})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Comment text - Editable if this comment is being edited */}
                        {editingCommentId === comment.id ? (
                          <div className="mb-2">
                            <textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full border rounded p-2 text-sm min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={savingEdit}
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">
                            {comment.comment_text}
                          </p>
                        )}

                        {/* Comment actions */}
                        <div className="flex gap-1.5">
                          {editingCommentId === comment.id ? (
                            <>
                              {/* Save and Cancel buttons when editing */}
                              <button
                                onClick={() => handleSaveEdit(comment.id)}
                                disabled={savingEdit}
                                className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
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
                              {/* Edit and Delete buttons when not editing */}
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

                  {/* ✅ RESOLVED COMMENTS - Collapsible, read-only */}
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
                              {/* Comment header */}
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                  <span className="font-medium text-gray-700">
                                    {comment.user_name}
                                  </span>
                                  <span className="text-gray-500">
                                    {formatTimestamp(comment.created_at)}
                                  </span>
                                  {/* ✅ NEW: Show edited timestamp if comment was edited */}
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

                              {/* Comment text - Read-only for resolved comments */}
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

              {/* ✅ ADD NEW COMMENT */}
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
   

//Upload Modal Function
function UploadModal({ postId, artistId, defaultDate, onClose, onSave }) {
 const [file, setFile] = useState(null);
 const [platform, setPlatform] = useState('');
 const [notes, setNotes] = useState('');
 const [variationDate, setVariationDate] = useState(defaultDate);
 const [showDatePicker, setShowDatePicker] = useState(false);
 const [uploading, setUploading] = useState(false);


 const handleFileChange = (e) => {
   if (e.target.files && e.target.files.length > 0) {
     setFile(e.target.files[0]);
   }
 };


 const handleSave = async () => {
   if (!file || !platform) return;
   setUploading(true);


   try {
     // 1️⃣ Get next test_version
     const { data: existingVars, error: tvError } = await supabase
       .from('postvariations')
       .select('test_version')
       .eq('post_id', postId)
       .order('test_version', { ascending: true });


     if (tvError) throw tvError;


     let nextVersion = 'A';
     if (existingVars && existingVars.length > 0) {
       const lastVersion = existingVars[existingVars.length - 1].test_version || 'A';
       const nextCharCode = lastVersion.charCodeAt(0) + 1;
       nextVersion = String.fromCharCode(nextCharCode);
     }


     // 2️⃣ Get length_seconds if video
     let lengthSeconds = null;
     if (file.type.startsWith('video/')) {
       lengthSeconds = await new Promise((resolve) => {
         const video = document.createElement('video');
         video.preload = 'metadata';
         video.onloadedmetadata = function () {
           window.URL.revokeObjectURL(video.src);
           resolve(Math.round(video.duration));
         };
         video.src = URL.createObjectURL(file);
       });
     }


     // 3️⃣ Upload to storage
     const filePath = `${artistId}/${postId}/${file.name}`;
     const { error: uploadError } = await supabase.storage
       .from('post-variations')
       .upload(filePath, file);


     if (uploadError) throw uploadError;


     // 4️⃣ Insert row into PostVariations
     const fullFilePath = `${artistId}/${postId}/${file.name}`;


     const { error: insertError } = await supabase
       .from('postvariations')
       .insert([{
         post_id: postId,
         platforms: [platform], // wrap single selection into array
         file_name: fullFilePath,
         test_version: nextVersion,
         length_seconds: lengthSeconds,
         variation_post_date: variationDate,
         notes
       }]);


     if (insertError) throw insertError;


     onSave(); // Let parent reload variations or close modal
   } catch (err) {
     console.error('Upload error:', err);
     alert('Failed to upload media. See console.');
   } finally {
     setUploading(false);
   }
 };

 return (
   <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
     <div className="relative bg-white rounded-lg w-auto max-w-md p-6 mx-auto">
       <h2 className="text-lg font-bold mb-4">Upload Media</h2>


       {/* File upload */}
       <div className="mb-4">
         <label className="block text-sm font-medium mb-1">Select Media File</label>
         <input
           type="file"
           accept="image/*,video/*"
           onChange={handleFileChange}
           className="w-full text-sm"
         />
         {file && <p className="text-xs text-gray-500 mt-1">{file.name}</p>}
       </div>


       {/* Platform select */}
       <div className="mb-4">
         <label className="block text-sm font-medium mb-1">Platform</label>
         <select
           value={platform}
           onChange={(e) => setPlatform(e.target.value)}
           className="w-full border rounded p-2 text-sm"
         >
           <option value="">Select platform…</option>
           <option value="TikTok">TikTok</option>
           <option value="Instagram">Instagram</option>
           <option value="YouTube">YouTube</option>
         </select>
       </div>


       {/* Notes */}
       <div className="mb-4">
         <label className="block text-sm font-medium mb-1">Notes</label>
         <textarea
           value={notes}
           onChange={(e) => setNotes(e.target.value)}
           rows={3}
           className="w-full border rounded p-2 text-sm"
         />
       </div>


       {/* Variation Date */}
       <div className="mb-4">
         <label className="block text-sm font-medium mb-1">Variation Date</label>
         <button
           onClick={() => setShowDatePicker(!showDatePicker)}
           className="w-full text-left border rounded p-2 text-sm bg-white hover:bg-gray-50"
         >
           Date: {new Date(variationDate).toLocaleDateString()}
         </button>
         {showDatePicker && (
           <div className="mt-2 p-3 border rounded bg-white shadow-lg z-10">
             <DatePicker
               selected={new Date(variationDate)}
               onChange={(date) => {
                 setVariationDate(date.toISOString().split('T')[0]);
                 setShowDatePicker(false);
               }}
               inline
             />
             <div className="flex justify-end gap-2 mt-2">
               <button
                 onClick={() => setShowDatePicker(false)}
                 className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
               >
                 Cancel
               </button>
             </div>
           </div>
         )}
       </div>


       {/* Buttons */}
       <div className="flex justify-end gap-2 mt-4">
         <button
           onClick={onClose}
           className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
         >
           Cancel
         </button>
         <button
           onClick={handleSave}
           disabled={uploading || !file || !platform || !notes}
           className="px-3 py-1.5 text-sm bg-[#bbe1ac] rounded hover:opacity-90"
         >
           {uploading ? 'Uploading…' : 'Save'}
         </button>
       </div>


       <button
         onClick={onClose}
         className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
       >
         ✕
       </button>
     </div>
   </div>
 );
}

//captions function
function CaptionsModal({ captions, onClose, onSave }) {
  const [tempCaptions, setTempCaptions] = useState(captions || { a: '', b: '' });
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("posts")
        .update({
          caption_a: tempCaptions.a,
          caption_b: tempCaptions.b,
        })
        .eq("id", captions.post_id); // ✅ update by post_id we passed in
  
      if (error) throw error;

      // ✅ notify parent with fresh captions
      if (onSave) onSave(tempCaptions);
  
      alert("Captions saved!");
      setIsEditing(false);
      if (onClose) onClose(); // ✅ close modal after save
    } catch (err) {
      console.error("Error saving captions:", err);
      alert("Failed to save captions.");
    }
  };
  

  return (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[80]">
    {/* Changed max-w-[85vw] and added mx-auto for centering */}
    <div className="relative bg-white rounded-lg w-full max-w-[90vw] max-h-[90vh] p-4 mx-auto overflow-hidden">
      <div className="space-y-3 min-w-[20rem] max-h-[calc(90vh-7rem)] overflow-y-auto pr-2">
        <h4 className="font-medium">Caption A:</h4>
        {isEditing ? (
          <textarea
            value={tempCaptions.a || ''}
            onChange={(e) => setTempCaptions({...tempCaptions, a: e.target.value})}
            className="w-full p-2 border rounded"
            rows={3}
          />
        ) : (
          <div className="bg-gray-50 p-3 rounded text-sm min-h-[3rem] whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
            {tempCaptions?.a || <span className="text-gray-400">No caption</span>}
          </div>
        )}
        
        {tempCaptions?.b && (
        <>
          <h4 className="font-medium">Caption B:</h4>
            {isEditing ? (
              <textarea
                value={tempCaptions?.b || ''}
                onChange={(e) => setTempCaptions({ ...tempCaptions, b: e.target.value })}
                className="w-full p-2 border rounded"
                rows={3}
              />
            ) : (
              <div className="bg-gray-50 p-3 rounded text-sm min-h-[3rem] whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {tempCaptions?.b}
              </div>
            )}
          </>
        )}
      </div>




      <div className="flex justify-end gap-2 mt-4">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                setTempCaptions(captions);
                setIsEditing(false);
              }}
              className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm bg-[#bbe1ac] rounded hover:opacity-90"
            >
              Save Changes
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-sm bg-[#bbe1ac] rounded hover:opacity-90"
            >
              Edit Captions
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </>
        )}
      </div>




      <button
        onClick={onClose}
        className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 text-lg"
      >
        ✕
      </button>
    </div>
  </div>
);
}

//post status options
const STATUS_OPTIONS = [
'not planned',
'planned',
'assets obtained',
'uploaded',
'ready',
'posted'
];

//calendar setup
function startOfWeekMonday(date) {
const d = new Date(date)
const day = d.getDay() || 7 // Sunday => 7
if (day !== 1) d.setDate(d.getDate() - (day - 1))
d.setHours(0, 0, 0, 0)
return d
}
function addDays(date, days) {
const d = new Date(date)
d.setDate(d.getDate() + days)
d.setHours(0, 0, 0, 0)
return d
}

//Colour Scheme
function statusColor(status) {
switch ((status || '').toLowerCase()) {
  case 'not planned': return '#ef4444' // red-500
  case 'planned': return '#ED9C37' // orange
  case 'assets obtained': return '#D4D46C' // yellow
  case 'uploaded': return '#3b82f6' // blue-500
  case 'ready': return '#10b981' // emerald-500
  case 'posted': return '#9ca3af' // gray-400
  default: return '#d1d5db' // gray-300
}}

function ArtistCalendarInner() {
  const [artists, setArtists] = useState([]) // I think this might be an issue if it's messing with the artist_id of the logged in profile
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedArtistId, setSelectedArtistId] = useState('') //This one too
  const [weeks, setWeeks] = useState([])
  const [rangeLabel, setRangeLabel] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  //const [allVariations, setAllVariations] = useState([]) // Removed by claude

  // Checking width for dates
  const [isNarrow, setIsNarrow] = useState(false);

  // Preload the variation the user is about to view (fires when they click a variation)
  const priorityPreload = async (variation) => {
    if (typeof window === "undefined") return;
    if (!variation) return;

    const paths = Array.isArray(variation.carousel_files) && variation.carousel_files.length
      ? variation.carousel_files
      : (variation.file_name ? [variation.file_name] : []);

    if (!paths.length) return;

    // small local helper (kept inside to avoid global ref issues)
    const preloadMediaUrl = (url) => {
      // ✅ FIX: Removed preloadVideoBytes - unnecessary bandwidth usage
      // The video element with preload="metadata" is sufficient

      const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(getPathname(url));
      if (isVideo) {
        const video = document.createElement("video");
        video.preload = "metadata";  // Only loads metadata, not 256KB
        video.muted = true;
        video.src = url;
        video.load();
      } else {
        const img = new Image();
        img.src = url;
      }
    };

    // ✅ FIX: Only preload FIRST item for instant display
    // MediaPlayer will handle loading the rest when it mounts
    if (paths.length > 0) {
      try {
        const firstPath = paths[0];
        const cached = cacheGetUrl(firstPath);
        const url = cached || (await getOptimizedMediaUrl(firstPath));
        preloadMediaUrl(url);
      } catch (err) {
        console.log("Priority preload failed for first item", err);
      }
    }
  };

  // Keep isNarrow in sync with viewport width (mobile vs desktop)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      // You can tweak 768 to whatever breakpoint you consider "mobile"
      setIsNarrow(window.innerWidth < 768);
    };

    handleResize(); // set initial value on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mobile week collapse state (only used when isNarrow === true)
  const [collapsedWeeks, setCollapsedWeeks] = useState(() => new Set());


  // Default: previous week collapsed, current+future open
  useEffect(() => {
    if (!isNarrow) {
      setCollapsedWeeks(new Set());
      return;
    }

    const today = new Date();
    const startThisWeek = startOfWeekMonday(today);
    const startPrevWeek = addDays(startThisWeek, -7);

    setCollapsedWeeks(new Set([toYMD(startPrevWeek)]));
  }, [isNarrow]);

  // View switching
  const [viewMode, setViewMode] = useState('4weeks') // '4weeks' (Current) | 'month'
  const [months, setMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')

  // For Add Post modal
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [newPostDate, setNewPostDate] = useState('');

  // Modal state
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [postLoading, setPostLoading] = useState(false)
  const [postError, setPostError] = useState('')
  const [postDetails, setPostDetails] = useState(null) // { post, variations }
  const [tempDate, setTempDate] = useState( // For calendar date picker
    postDetails?.post?.post_date || new Date().toISOString().split('T')[0]
  );

  // For Captions Box
  const [showCaptions, setShowCaptions] = useState(false);
  const [editingCaptions, setEditingCaptions] = useState({
    a: '',
    b: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  //for status
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState('');

  //don't show calendar picker unless clicked
  const [showDatePicker, setShowDatePicker] = useState(false);

  //Media player not showing by default
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [showMediaPlayer, setShowMediaPlayer] = useState(false);

  // For upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load current user's artist_id from their profile
  useEffect(() => {
      const loadProfile = async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          console.error("No logged in user:", userError)
          setErrorMsg("You must be logged in")
          return
        }

        // Get the profile row
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("artist_id")
          .eq("id", user.id) // match UUID
          .single()
    
        if (profileError) {
          console.error("Error loading profile:", profileError)
          setErrorMsg("Error loading profile")
          return
        }
    
        if (profile?.artist_id) {
          setSelectedArtistId(String(profile.artist_id))
        } else {
          setErrorMsg("No artist linked to this profile")
        }
      }
    
      loadProfile()
    }, [])
    

  // Build month dropdown: 2 months back → 6 months forward
  useEffect(() => {
    const now = new Date()
    const monthArr = []
    for (let offset = -2; offset <= 6; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
      monthArr.push({
        value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
        label: d.toLocaleString('default', { month: 'long', year: 'numeric' })
      })
    }
    setMonths(monthArr)
  }, [])

  // Load posts whenever artist / view mode / selected month changes
  useEffect(() => {
  const loadPosts = async () => {
    if (!selectedArtistId) return;
    setErrorMsg('');

    let from, to;

    if (viewMode === '4weeks') {
      const today = new Date();
      const startThisWeek = startOfWeekMonday(today);
      const startLastWeek = addDays(startThisWeek, -7);

      const endNextFourWeeks = addDays(startThisWeek, 28);
      const endVisibleSunday = addDays(endNextFourWeeks, 6 - endNextFourWeeks.getDay());

      from = toYMD(startLastWeek);
      to = toYMD(endVisibleSunday);
      setRangeLabel(`${from} → ${to}`);
    } else if (viewMode === 'month' && selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);

      from = toYMD(firstDay);
      to = toYMD(lastDay);
      setRangeLabel(`${from} → ${to}`);
    } else {
      return;
    }

    try {
      const response = await fetch(
        `/api/calendar/posts?artistId=${encodeURIComponent(selectedArtistId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const { posts } = await response.json();

      const startDate = new Date(from);
      const endDate = new Date(to);
      const weeksArr = [];
      let currentStart = startOfWeekMonday(startDate);

      while (currentStart <= endDate) {
        const days = [];
        for (let d = 0; d < 7; d++) {
          const dayDate = addDays(currentStart, d);
          const ymd = toYMD(dayDate);
          const postsForDay = (posts || []).filter(
            (p) => toYMD(new Date(p.post_date)) === ymd
          );
          days.push({ date: dayDate, ymd, posts: postsForDay });
        }
        weeksArr.push({ weekStart: currentStart, days });
        currentStart = addDays(currentStart, 7);
      }

      setWeeks(weeksArr);
    } catch (e) {
      console.error('Error loading posts:', e);
      setErrorMsg('Could not load posts. See console for details.');
    }
  };

  loadPosts();
}, [selectedArtistId, viewMode, selectedMonth, platformFilter]);

  // ✅ Removed Intersection Observer preloading
   // Variations are now fetched on-demand, preloading isn't needed
   // This simplifies code and reduces background network activity

  // Open modal + fetch details (post + variations) in two queries
  // Open modal + fetch details (post + variations) from API
  async function openPostDetails(postId) {
      setSelectedPostId(postId)
      setPostLoading(true)
      setPostError('')
      setPostDetails(null)
    
      try {
        // ✅ NEW: Fetch from API route instead of direct Supabase call
        const response = await fetch(`/api/posts/${postId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Post not found');
          }
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const { post } = await response.json();
    
        // Extract variations from the joined data
        const variations = post.postvariations || [];
        
        // Remove the nested postvariations from post object
        delete post.postvariations;
    
        // ✅ Attach captions to each variation so MediaPlayer can display them
        const variationsWithCaptions = variations.map(v => ({
          ...v,
          caption_a: post.caption_a,
          caption_b: post.caption_b
        }));
    
        setPostDetails({
          post,
          variations: variationsWithCaptions,
          // Include captions from the post in the details
          captions: {
            a: post.caption_a,
            b: post.caption_b
          }
        })
      } catch (e) {
        console.error('Error loading post details:', e)
        setPostError('Could not load post details. See console for more info.')
      } finally {
        setPostLoading(false)
      }
    }

  // Close post details modal
  function closeModal() {
    setSelectedPostId(null)
    setPostDetails(null)
    setPostLoading(false)
    setPostError('')
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <select
          className="border p-2 rounded"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
        >
          <option value="4weeks">Current</option>
          <option value="month">Specific month</option>
        </select>

        {viewMode === 'month' && (
          <select
            className="border p-2 rounded"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">Select month…</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        )}

        <span className="text-sm text-gray-500">Range: {rangeLabel}</span>
      </div>

      {errorMsg && <div className="text-red-600 mb-4">{errorMsg}</div>}

      {/* Calendar: stacked weeks */}
      <div className="space-y-6">
        {weeks.map((week, wi) => {
          const weekKey = toYMD(new Date(week.weekStart));
          const isCollapsed = isNarrow && collapsedWeeks.has(weekKey);

          const toggleWeek = () => {
            if (!isNarrow) return;
            setCollapsedWeeks((prev) => {
              const next = new Set(prev);
              if (next.has(weekKey)) next.delete(weekKey);
              else next.add(weekKey);
              return next;
            });
          };

          return (
            <div key={wi} className="border rounded-lg overflow-hidden bg-white shadow-sm">
              {isNarrow ? (
                <button
                  type="button"
                  onClick={toggleWeek}
                  className="w-full px-4 py-2 bg-gray-50 border-b text-sm font-medium flex items-center justify-between"
                >
                  <span>Week of {new Date(week.weekStart).toLocaleDateString()}</span>
                  <span className="text-gray-500">{isCollapsed ? "▸" : "▾"}</span>
                </button>
              ) : (
                <div className="px-4 py-2 bg-gray-50 border-b text-sm font-medium">
                  Week of {new Date(week.weekStart).toLocaleDateString()}
                </div>
              )}

              {!isCollapsed && (
                <>
                  <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 border-b">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <div key={d} className="px-3 py-2">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {week.days.map((day) => (
                      <div
                        key={day.ymd}
                        className={`min-h-[120px] border-l first:border-l-0 border-t-0 p-2 ${
                          day.date.toDateString() === new Date().toDateString()
                            ? "bg-[#eef8ea]"
                            : ""
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          {day.date.toLocaleDateString(undefined, { weekday: "short" })} -{" "}
                          {day.date.getDate().toString().padStart(2, "0")}/
                          {(day.date.getMonth() + 1).toString().padStart(2, "0")}
                        </div>

                        <div className="space-y-1">
                          {day.posts.map((post) => {
                            return (
                              <div
                                key={post.id}
                                data-post-id={post.id}
                                className="text-xs px-2 py-1 rounded text-white cursor-pointer"
                                style={{ backgroundColor: statusColor(post.status) }}
                                title={post.status || ""}
                                onClick={() => openPostDetails(post.id)}
                              >
                                <span>{post.post_name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Post Detail Modal */}
      {selectedPostId && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Post Details</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            {/* Loading / Error / Content */}
            {postLoading && (
              <div className="py-10 text-center text-gray-500">Loading…</div>
            )}

            {postError && (
              <div className="text-red-600">{postError}</div>
            )}

            {(!postLoading && !postError && postDetails) && (
              <>
              {/* Post Header Section */}
              <div className="mb-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{postDetails.post.post_name}</div>
        </div>
      </div>

      {/* Stacked Controls */}
      <div className="space-y-3 mt-3">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"></label>
              <p className="text-gray-800 text-sm">
              {postDetails?.post?.status ? `Status: ${postDetails.post.status}` : "No status"}
              </p>
          </div>
      </div>

      {updateError && (
        <div className="text-red-600 text-sm mt-2">{updateError}</div>
      )}
    </div>

    {updateError && (
      <div className="text-red-600 text-sm mb-2">{updateError}</div>
    )}
                {postDetails.post.notes && (
                  <p className="mb-4">Notes: {postDetails.post.notes}</p>
                )}

                <button
                    onClick={() => setShowCaptions(true)}
                  className="w-auto mt-3 px-3 py-1.5 text-sm rounded hover:opacity-90 mb-[10px]"
                  style={{ backgroundColor: '#bbe1ac' }}
                  >
                    View Caption(s)
                  </button>

                <h3 className="text-md font-semibold mb-2">Variations</h3>
                <ul className="space-y-2 max-h-64 overflow-auto pr-1">
  {postDetails.variations.length > 0 ? (
    postDetails.variations.map(v => (
      <li
        key={v.id}
        className="border rounded p-2 cursor-pointer hover:bg-gray-50"
        onClick={() => {
          setSelectedVariation(v)
          setShowMediaPlayer(true)
        }}
      >
      <div className="text-sm">
          <span className="font-medium">
            {(v.platforms && v.platforms.length ? v.platforms.join(", ") : "—")}
          </span>{" "}
          — {v.test_version || "—"}
        </div>
        <div className="text-xs text-gray-600">
          {v.file_name || 'no file'} • {v.length_seconds ? `${v.length_seconds}s` : 'length n/a'}
        </div>
      </li>
    ))
  ) : (
    <li className="text-sm text-gray-500">No variations</li>
  )}
  </ul>

                <div className="text-right mt-4">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 mr-[10px]"
                  >
                    Upload Media
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

  {showCaptions && (
    <CaptionsModal
      captions={{
        a: postDetails.post?.caption_a,
        b: postDetails.post?.caption_b,
        post_id: postDetails.post?.id   // ✅ add post_id here
      }}
      onClose={() => setShowCaptions(false)}
      onSave={(newCaptions) => {
        // update PostDetails so Caption modal reflects new values
        setPostDetails(prev => ({
          ...prev,
          post: {
            ...prev.post,
            caption_a: newCaptions.a,
            caption_b: newCaptions.b,
          }
        }));

        // update the currently open MediaPlayer variation too
        setSelectedVariation(prev =>
          prev
            ? { ...prev, caption_a: newCaptions.a, caption_b: newCaptions.b }
            : prev
        );
      }}

      />
  )}
      {showMediaPlayer && selectedVariation && (
        <MediaPlayer
          variation={selectedVariation}
          onOpenCaptions={() => setShowCaptions(true)}
          onClose={() => {
            setShowMediaPlayer(false);
            setSelectedVariation(null);
          }}
        />
      )}

  {showUploadModal && (
  <UploadModal
    postId={selectedPostId}
    artistId={selectedArtistId}
    defaultDate={postDetails?.post?.post_date}
    onClose={() => setShowUploadModal(false)}
    onSave={() => {
      setShowUploadModal(false);
      // Refresh variations after upload
      openPostDetails(selectedPostId);
    }}
  />
  )}
    </div>
  )
}

export default function ArtistCalendarPage() {
    return (
      <ArtistLayout title="Artist Calendar">
        <ArtistCalendarInner />
      </ArtistLayout>
    );
  }