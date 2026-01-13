'use client';
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Link from "next/link";
import { useRouter } from "next/router";

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

const mediaUrlCache = new Map(); // path -> string OR { url, expires }

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

// Always return a string URL (no matter what shape got cached)
function cacheGetUrl(path) {
  const v = mediaUrlCache.get(path);
  if (!v) return null;
  return typeof v === "string" ? v : v.url || null;
}

function cacheSetUrl(path, url, expiresMs = Number.POSITIVE_INFINITY) {
  // store consistently as {url, expires}
  mediaUrlCache.set(path, { url, expires: expiresMs });
}

function cacheHasValidUrl(path) {
  const v = mediaUrlCache.get(path);
  if (!v) return false;
  if (typeof v === "string") return true;
  return !!v.url && (v.expires ?? 0) > Date.now();
}


  async function getOptimizedMediaUrl(path) {
    const now = Date.now();

    if (cacheHasValidUrl(path)) {
      return cacheGetUrl(path);
    }

    const { data, error } = await supabase.storage
      .from("post-variations")
      .createSignedUrl(path, 7200);

    if (error) throw error;

    cacheSetUrl(path, data.signedUrl, now + 7200 * 1000);
    return data.signedUrl;
  }

const PLATFORM_OPTIONS = [
  { value: 'Instagram',   label: 'Instagram',   short: 'IG' },
  { value: 'TikTok',      label: 'TikTok',      short: 'TT' },
  { value: 'YouTube',     label: 'YouTube',     short: 'YT' },
  { value: 'Mailing List', label: 'Mailing List', short: 'ML' },
];

// Move a post from one day (sourceYMD) to another (destYMD) inside weeks[]
function movePostInWeeks(weeksArr, itemId, sourceYMD, destYMD, destIndex = 0, isVariation = false) {
  // Clone weeks deeply enough to avoid mutating state
  const clone = weeksArr.map(w => ({
    ...w,
    days: w.days.map(d => ({
      ...d,
      posts: [...d.posts],
      variations: [...d.variations],
    }))
  }))

  const key = isVariation ? "variations" : "posts"
  let movedItem = null

  // 1. Find source day and remove the item
  for (const w of clone) {
    for (const d of w.days) {
      if (d.ymd === sourceYMD) {
        const idx = d[key].findIndex(p => p.id === itemId)
        if (idx !== -1) {
          movedItem = d[key].splice(idx, 1)[0]
          break
        }
      }
    }
    if (movedItem) break
  }
  if (!movedItem) return clone

  // 2. Insert into destination day
  for (const w of clone) {
    for (const d of w.days) {
      if (d.ymd === destYMD) {
        const insertAt = Math.max(0, Math.min(destIndex, d[key].length))
        d[key].splice(insertAt, 0, {
          ...movedItem,
          [isVariation ? "variation_post_date" : "post_date"]: destYMD
        })
        return clone
      }
    }
  }

  // If destination not found (shouldn't happen), revert
  return weeksArr
}

// Add Post Function
function AddPostModal({ artistId, defaultDate, onClose, onPostAdded }) {
  const [form, setForm] = useState({
    post_name: '',
    post_date: defaultDate,
    post_type: '',
    test_type: '',
    song: '',
    caption_a: '',
    caption_b: '',
    notes: '',
    status: 'not planned'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const POST_TYPES = ['H+LS', 'Storytelling', 'Performance', 'Smash Cut', 'Visualiser', 'Long Form', 'Carousel', 'Education', 'Other', 'Mailing List'];
  const TEST_TYPES = ['Hook', 'Caption', 'Hashtags', 'Colours', 'Song Snippets', 'Captions', 'Clip Length', 'Subtitles', 'Other', 'No Test'];
  const STATUS_OPTIONS = ['not planned', 'planned', 'assets obtained', 'uploaded', 'ready', 'posted'];

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.post_name) {
      setError('Post name is required');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          artist_id: Number(artistId),
          post_date: form.post_date,
          post_type: form.post_type,
          post_name: form.post_name,
          test_type: form.test_type,
          song: form.song,
          caption_a: form.caption_a,
          caption_b: form.caption_b,
          notes: form.notes,
          status: form.status
        }]);

      if (error) throw error;

      if (onPostAdded) onPostAdded();
      onClose();
    } catch (err) {
      console.error('Error adding post:', err);
      setError('Failed to add post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Add New Post</h2>

        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        <label className="block mb-1 font-medium text-sm">Post Name</label>
        <input
          type="text"
          value={form.post_name}
          onChange={(e) => handleChange('post_name', e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />

        <label className="block mb-1 font-medium text-sm">Post Date</label>
        <DatePicker
          selected={new Date(form.post_date)}
          onChange={(date) => handleChange('post_date', toYMD(date))}
          className="border p-2 rounded w-full mb-3"
        />

        <label className="block mb-1 font-medium text-sm">Post Type</label>
        <select
          value={form.post_type}
          onChange={(e) => handleChange('post_type', e.target.value)}
          className="border p-2 rounded w-full mb-3"
        >
          <option value="">Select post type...</option>
          {POST_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
        </select>

        <label className="block mb-1 font-medium text-sm">Test Type</label>
        <select
          value={form.test_type}
          onChange={(e) => handleChange('test_type', e.target.value)}
          className="border p-2 rounded w-full mb-3"
        >
          <option value="">Select test type...</option>
          {TEST_TYPES.map(tt => <option key={tt} value={tt}>{tt}</option>)}
        </select>

        <label className="block mb-1 font-medium text-sm">Song</label>
        <input
          type="text"
          value={form.song}
          onChange={(e) => handleChange('song', e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />

        <label className="block mb-1 font-medium text-sm">Caption A</label>
        <textarea
          value={form.caption_a}
          onChange={(e) => handleChange('caption_a', e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />

        <label className="block mb-1 font-medium text-sm">Caption B</label>
        <textarea
          value={form.caption_b}
          onChange={(e) => handleChange('caption_b', e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />

        <label className="block mb-1 font-medium text-sm">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="border p-2 rounded w-full mb-3"
        />

        <label className="block mb-1 font-medium text-sm">Status</label>
        <select
          value={form.status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="border p-2 rounded w-full mb-4"
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {saving ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Media Player Function
function MediaPlayer({ variation, onClose, onRefreshPost, onReplaceRequested, onPlatformsUpdated, onGreenlightUpdated, }) {
  const [mediaUrls, setMediaUrls] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");  

  const [localResolved, setLocalResolved] = useState(!!variation?.feedback_resolved);
  const [saving, setSaving] = useState(false);

  const [platforms, setPlatforms] = useState(variation?.platforms || []);
  const [savingPlatforms, setSavingPlatforms] = useState(false);

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  const audioRef = useRef(null);
  const [touchStartX, setTouchStartX] = useState(null);

   // ✅ NEW: greenlight local state + saver
   const [localGreenlight, setLocalGreenlight] = useState(!!variation?.greenlight);
   const [savingGreenlight, setSavingGreenlight] = useState(false);

  // 🔊 snippet state for THIS player
  const [snippetStart, setSnippetStart] = useState(
    typeof variation?.audio_start_seconds === "number"
      ? variation.audio_start_seconds
      : 0
  );
  const [savingSnippet, setSavingSnippet] = useState(false);
  const [snippetDuration, setSnippetDuration] = useState(15); // seconds, for preview only

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
  

  useEffect(() => {
    setSnippetStart(
      typeof variation?.audio_start_seconds === "number"
        ? variation.audio_start_seconds
        : 0
    );
  }, [variation?.audio_start_seconds]);


  const handleSaveSnippetStart = async () => {
    if (!variation) return;
    setSavingSnippet(true);
    const { error } = await supabase
      .from("postvariations")
      .update({ audio_start_seconds: snippetStart })
      .eq("id", variation.id);
    setSavingSnippet(false);
    if (error) {
      console.error("Error saving snippet start:", error);
      alert("Could not save snippet start.");
      return;
    }
    // keep local variation in sync
    variation.audio_start_seconds = snippetStart;
  };

  useEffect(() => {
    setPlatforms(variation?.platforms || []);
  }, [variation?.platforms]);

  useEffect(() => {
    setLocalResolved(!!variation?.feedback_resolved);
  }, [variation?.feedback_resolved]);

  // Then in MediaPlayer's useEffect where you load media URLs, replace with:
useEffect(() => {
  if (!variation) {
    setMediaUrls([]);
    setLoading(false);
    return;
  }

  const pathsRaw =
    Array.isArray(variation.carousel_files) && variation.carousel_files.length > 0
      ? variation.carousel_files
      : variation.file_name
      ? [variation.file_name]
      : [];

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
    setMediaUrls([]);
    setLoading(false);
    return;
  }

  try {
    const urls = paths.map((path) => {
      // ✅ CHECK CACHE FIRST
      const cachedUrl = cacheGetUrl(path);
      if (cachedUrl) return cachedUrl;

      const { data, error } = supabase.storage
        .from("post-variations")
        .getPublicUrl(path);

      if (error) throw error;

      cacheSetUrl(path, data.publicUrl); // no expiry
      return data.publicUrl;
    });

    setMediaUrls(urls);
    setCurrentIndex(0);
    setError("");
  } catch (err) {
    console.error("Error loading media URLs:", err);
    setMediaUrls([]);
    setError("Could not load media.");
  } finally {
    setLoading(false);
  }
}, [variation]);

  // Load audio snippet URL if present
  useEffect(() => {
    if (!variation?.audio_file_name) {
      setAudioUrl(null);
      return;
    }

    // ✅ CHECK CACHE FIRST
    const cachedAudio = cacheGetUrl(variation.audio_file_name);
      if (cachedAudio) {
        setAudioUrl(cachedAudio);
        return;
      }

      const { data, error } = supabase.storage
        .from("post-variations")
        .getPublicUrl(variation.audio_file_name);

      if (error) {
        console.error("Error fetching audio URL:", error);
        setAudioUrl(null);
      } else {
        cacheSetUrl(variation.audio_file_name, data.publicUrl);
        setAudioUrl(data.publicUrl);
      }
  }, [variation?.audio_file_name]);

  if (!variation) return null;

  const hasMedia = mediaUrls.length > 0;
  const hasCarousel = mediaUrls.length > 1;

  const activeUrl = hasMedia ? mediaUrls[currentIndex] : null;

useEffect(() => {
  if (!hasMedia) return;

  const pathGuess =
    (Array.isArray(variation?.carousel_files) && variation.carousel_files[currentIndex]) ||
    (currentIndex === 0 ? variation?.file_name : null);

  const cached = pathGuess ? mediaUrlCache.get(pathGuess) : undefined;

  console.log("[media debug]", {
    currentIndex,
    activeUrl,
    activeUrlType: typeof activeUrl,
    pathGuess,
    cached,
    cachedType: typeof cached,
  });
}, [hasMedia, currentIndex, activeUrl, variation?.file_name, variation?.carousel_files]);

  const isImageFile = (url) =>
    /\.(jpe?g|png|gif|webp)$/i.test(getPathname(url));

  const isVideoFile = (url) =>
    /\.(mp4|mov|webm|ogg)$/i.test(getPathname(url));

  async function handleSavePlatforms() {
    if (!variation || savingPlatforms) return;
    setSavingPlatforms(true);
    try {
      const nextPlatforms = platforms && platforms.length ? platforms : [];
      const { error } = await supabase
        .from("postvariations")
        .update({ platforms: nextPlatforms })
        .eq("id", variation.id);

      if (error) throw error;

      if (onPlatformsUpdated) {
        onPlatformsUpdated(variation.id, nextPlatforms);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update platforms");
    } finally {
      setSavingPlatforms(false);
    }
  }

  async function toggleResolve() {
    if (!variation || saving) return;
    setSaving(true);
    const next = !localResolved;
    const { error } = await supabase
      .from("postvariations")
      .update({ feedback_resolved: next })
      .eq("id", variation.id);
    setSaving(false);
    if (error) {
      console.error(error);
      alert("Could not update feedback status.");
      return;
    }
    setLocalResolved(next);
    variation.feedback_resolved = next;
    if (typeof onRefreshPost === "function") onRefreshPost(variation.id, next);
  }

  async function toggleGreenlight() {
    if (!variation || savingGreenlight) return;
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

    if (typeof onGreenlightUpdated === "function") {
      onGreenlightUpdated(variation.id, next);
    }
  }
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this variation?")) return;
    try {
      const payload = {
        path: variation.file_name,
        variationId: variation.id,
      };

      const res = await fetch("/api/deleteVariation", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        console.error("Server delete failed:", result);
        alert(result.error || "Failed to delete variation.");
        return;
      }

      if (onClose) onClose();
      if (onRefreshPost) onRefreshPost();
    } catch (err) {
      console.error("Error deleting variation:", err);
      alert("Failed to delete variation. Check console for details.");
    }
  };

  const hasFeedback =
    Boolean(variation.feedback && variation.feedback.trim() !== "");

  const goPrev = () => {
    if (!hasCarousel) return;
    setCurrentIndex((i) => (i - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const goNext = () => {
    if (!hasCarousel) return;
    setCurrentIndex((i) => (i + 1) % mediaUrls.length);
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

  const formatSnippetTime = (sec) => {
    if (typeof sec !== "number" || isNaN(sec)) return "0:00";
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
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
        if (!audio.paused) {
          audio.pause();
        }
      }, dur * 1000);
    }
  };
  
  

  const variationDateLabel = variation.variation_post_date
    ? new Date(variation.variation_post_date).toLocaleDateString(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-lg max-w-5xl w-full mx-4 p-4 md:p-6 max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-black bg-black/10 rounded-full p-1"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              Variation {variation.test_version || ""}
            </h2>
            {variationDateLabel && (
              <p className="text-xs text-gray-500">{variationDateLabel}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center text-xs text-gray-600">
            {variation.length_seconds && (
              <span>Length: {variation.length_seconds}s</span>
            )}
          </div>
        </div>

        {/* Main layout */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Media area */}
          <div className="md:w-2/3">
            <div
              className="bg-black rounded-md flex items-center justify-center relative overflow-hidden"
              style={
                hasCarousel
                  ? { height: "70vh", maxHeight: "70vh" }                  // fixed for carousels
                  : { minHeight: "240px", maxHeight: "70vh" }              // flexible for single media
              }
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {loading && (
                <div className="text-sm text-gray-300">Loading media…</div>
              )}
              {!loading && error && (
                <div className="text-sm text-red-400 px-4 text-center">
                  {error}
                </div>
              )}
              {!loading && !error && !hasMedia && (
                <div className="text-sm text-gray-300 px-4 text-center">
                  No media attached to this variation.
                </div>
              )}
              {!loading && !error && hasMedia && activeUrl && (
                <>
                  {isImageFile(activeUrl) && (
                    <img
                      src={activeUrl}
                      alt={variation.file_name}
                      className="max-h-[70vh] max-w-full object-contain"
                    />
                  )}

                  {isVideoFile(activeUrl) && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                      }}
                    >
                      <video
                        src={activeUrl}
                        autoPlay
                        muted
                        playsInline
                        controls
                        style={{
                          maxHeight: "70vh",
                          maxWidth: "70vw",
                          width: "auto",
                          height: "auto",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  )}

                  {!isImageFile(activeUrl) && !isVideoFile(activeUrl) && (
                    <div className="text-sm text-gray-200 px-4 text-center">
                      Unsupported file type
                    </div>
                  )}

                  {hasCarousel && (
                    <>
                      <button
                        type="button"
                        onClick={goPrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center"
                      >
                        ›
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {mediaUrls.map((_, idx) => (
                          <span
                            key={idx}
                            className={`w-2 h-2 rounded-full ${
                              idx === currentIndex ? "bg-white" : "bg-gray-500"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

            </div>
          </div>

          {/* Right side: meta, platforms, audio, feedback actions */}
          <div className="md:w-1/3 flex flex-col gap-4">
            {/* Platforms */}
            <div>
              <div className="text-sm font-medium mb-2">Platforms</div>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((p) => (
                  <label
                    key={p.value}
                    className="inline-flex items-center gap-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={platforms.includes(p.value)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPlatforms((prev) =>
                          checked
                            ? [...prev, p.value]
                            : prev.filter((v) => v !== p.value)
                        );
                      }}
                      onBlur={handleSavePlatforms}
                    />
                    <span>{p.short || p.label}</span>
                  </label>
                ))}
              </div>
              {savingPlatforms && (
                <p className="mt-1 text-[11px] text-gray-500">Saving…</p>
              )}
            </div>

            {/* Audio snippet */}
            {audioUrl && (
              <div className="mt-4 text-sm">
                <div className="font-semibold mb-1">Audio snippet</div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  controls
                  className="w-full"
                />

                <div className="mt-2 text-xs space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block mb-1">Snippet start (seconds)</label>
                      <input
                        type="number"
                        min={0}
                        value={snippetStart}
                        onChange={(e) =>
                          setSnippetStart(Number(e.target.value) || 0)
                        }
                        className="w-full border rounded p-1"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-1">Snippet length (seconds)</label>
                      <input
                        type="number"
                        min={1}
                        value={snippetDuration}
                        onChange={(e) =>
                          setSnippetDuration(Number(e.target.value) || 0)
                        }
                        className="w-full border rounded p-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handlePlaySnippet}
                      className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    >
                      Preview snippet
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSnippetStart}
                    disabled={savingSnippet}
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                  >
                    {savingSnippet ? "Saving…" : "Save snippet start"}
                  </button>
                </div>
              </div>
            )}


            {/* Feedback summary */}
            {hasFeedback && (
              <div className="mt-4 rounded-md bg-[#f9fafb] border border-[#e5e7eb] p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-[#111827]">Feedback summary</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      localResolved
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {localResolved ? "Resolved" : "Needs attention"}
                  </span>
                </div>
                <p className="text-[#374151] whitespace-pre-wrap">
                  {variation.feedback}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-2 flex-wrap">
              <button
                onClick={handleDelete}
                className="flex-1 bg-gray-200 text-black py-2 rounded hover:bg-gray-300 transition-colors text-sm min-w-[180px]"
              >
                Delete Variation
              </button>

              <button
                onClick={() => onReplaceRequested && onReplaceRequested(variation)}
                className="flex-1 bg-gray-200 text-black py-2 rounded hover:bg-gray-300 transition-colors text-sm min-w-[180px]"
              >
                Replace Variation
              </button>

              {/* ✅ NEW: Greenlight toggle */}
              <button
                onClick={toggleGreenlight}
                disabled={savingGreenlight}
                className={`flex-1 py-2 rounded text-white transition-colors text-sm min-w-[180px] ${
                  localGreenlight ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 hover:bg-gray-600"
                } ${savingGreenlight ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {savingGreenlight ? "Saving…" : localGreenlight ? "Greenlit ✅ (click to undo)" : "Not greenlit (click to greenlight)"}
              </button>

              <button
                onClick={toggleResolve}
                disabled={saving || !variation.feedback}
                className={`flex-1 py-2 rounded text-white transition-colors text-sm min-w-[180px] ${
                  localResolved ? "bg-gray-500 hover:bg-gray-600" : "bg-green-600 hover:bg-green-700"
                } ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {saving
                  ? "Saving…"
                  : localResolved
                  ? "Mark feedback as unresolved"
                  : "Mark feedback as resolved"}
              </button>
            </div>

          </div>
        </div>

        {/* Feedback Modal */}
        {feedbackModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60">
            <div className="bg-white p-6 rounded-lg max-w-lg w-full relative">
              <button
                onClick={() => setFeedbackModalOpen(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-black p-1 rounded-full"
              >
                ✕
              </button>
              <h3 className="text-lg font-semibold mb-2">
                {localResolved ? "Feedback - resolved" : "Feedback"}
              </h3>
              <div
                className={`whitespace-pre-wrap rounded p-3 border ${
                  localResolved ? "opacity-60 grayscale" : ""
                }`}
              >
                {variation.feedback || "—"}
              </div>
              {variation.feedback && (
                <button
                  onClick={toggleResolve}
                  className={`mt-4 px-4 py-2 rounded text-white ${
                    localResolved ? "bg-gray-500" : "bg-green-600"
                  }`}
                >
                  {localResolved
                    ? "Mark as unresolved"
                    : "Mark feedback resolved"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function makeStorageSafeName(name) {
  return name
    // remove accents/diacritics (é, ç, etc.)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // replace anything not letter/number/.-_ with a dash
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    // collapse multiple dashes
    .replace(/-+/g, "-")
    // trim leading/trailing dashes
    .replace(/^-|-$/g, "");
}

//Upload Modal Function
function UploadModal({ postId, artistId, defaultDate, mode = 'new', variation, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [extraFiles, setExtraFiles] = useState([]);   // for carousel images
  const [platforms, setPlatforms] = useState([]); // multi-select
  const [notes, setNotes] = useState('');
  const [variationDate, setVariationDate] = useState(defaultDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Audio library
  const [audioOptions, setAudioOptions] = useState([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const [selectedAudioId, setSelectedAudioId] = useState(null);

  // NEW: audio + snippet state
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [snippetStart, setSnippetStart] = useState(
    typeof variation?.audio_start_seconds === "number"
      ? variation.audio_start_seconds
      : 0
  );
  const [savingSnippet, setSavingSnippet] = useState(false);
  const audioRef = useRef(null);
  const [snippetDuration, setSnippetDuration] = useState(15); // needed by handlePreviewSnippet

  const MOV_REJECT_REPLIES = [
    "Kein .movs diggi",
    "Ayo .mp4 bitte",
    "Porfavor no mas con .movs",
    ".mov bruh",
    "hmmmmm.mov",
  ];
  
  const isMovFile = (f) => {
    const name = (f?.name || "").toLowerCase();
    const type = (f?.type || "").toLowerCase();
    return name.endsWith(".mov") || type === "video/quicktime";
  };
  
  const randomMovReply = () =>
    MOV_REJECT_REPLIES[Math.floor(Math.random() * MOV_REJECT_REPLIES.length)];
  
  const handleFileChange = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
  
    // Always reset state first
    if (!files.length) {
      setFile(null);
      setExtraFiles([]);
      return;
    }
  
    // 🚫 Block .mov anywhere in selection
    if (files.some(isMovFile)) {
      alert(randomMovReply());
      setFile(null);
      setExtraFiles([]);
      // reset the input so selecting the same file again re-triggers onChange
      e.target.value = "";
      return;
    }
  
    const first = files[0];
    const baseType = first.type.split("/")[0]; // "image" or "video"
  
    // Disallow mixing images and videos
    //if (files.some((f) => f.type.split("/")[0] !== baseType)) {
      //alert("Please select only images OR only a single video.");
      //setFile(null);
      //setExtraFiles([]);
      //e.target.value = "";
      //return;
    //}
  
    // Only one video allowed
    //if (baseType === "video" && files.length > 1) {
      //alert("Video variations support a single file only.");
      //setFile(first);
      //setExtraFiles([]);
      //return;
    //}
  
    setFile(first);
    setExtraFiles(files.slice(1)); // remaining images become carousel frames
  };
  


      // Load audio library songs for this artist
  useEffect(() => {
    if (!artistId) return;

    const loadSongs = async () => {
      setAudioLoading(true);
      try {
        const { data, error } = await supabase
          .from("audio_library")
          .select("id, title, file_path, duration_seconds")
          .eq("artist_id", Number(artistId))
          .order("title", { ascending: true });

        if (error) throw error;

        setAudioOptions(data || []);

        // If we're replacing and there is existing audio, preselect the matching song
        if (mode === "replace" && variation?.audio_file_name && data?.length) {
          const match = data.find(
            (row) => row.file_path === variation.audio_file_name
          );
          if (match) {
            setSelectedAudioId(match.id);
            const { data: urlData } = supabase.storage
              .from("post-variations")
              .getPublicUrl(match.file_path);
            setAudioPreviewUrl(urlData?.publicUrl || null);
          } else {
            // Fallback: still preview existing audio_file_name directly
            const { data: urlData } = supabase.storage
              .from("post-variations")
              .getPublicUrl(variation.audio_file_name);
            setAudioPreviewUrl(urlData?.publicUrl || null);
          }
        }
      } catch (err) {
        console.error("Error loading audio library:", err);
      } finally {
        setAudioLoading(false);
      }
    };

    loadSongs();
  }, [artistId, mode, variation?.audio_file_name]);

  const handleAudioChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      setAudioFile(f);
      setAudioPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handlePreviewSnippet = () => {
    if (!audioRef.current || !audioPreviewUrl) return;
    const audio = audioRef.current;
    const start = Number(snippetStart) || 0;
    const dur = Number(snippetDuration) || 0;

    audio.currentTime = start;
    audio.muted = false;
    audio.play();

    if (dur > 0) {
      setTimeout(() => {
        if (!audio.paused) {
          audio.pause();
        }
      }, dur * 1000);
    }
  };

  const handleSave = async () => {
    // In replace mode we only need a file; in new mode keep your existing requirements
    if (!file) return;
    if (mode !== 'replace' && (!platforms || platforms.length === 0)) return;
    setUploading(true);

    const mediaFiles = [file, ...extraFiles];
    const baseType = file.type.split("/")[0];
    const isImage = baseType === "image";

    try {
      // 🔢 Determine which post to attach to (replace uses the variation's post)
      const targetPostId = mode === 'replace' && variation ? variation.post_id : postId;

      // ⏱️ Compute length if video (based on first file)
      let lengthSeconds = null;
      if (file.type.startsWith("video/")) {
        lengthSeconds = await new Promise((resolve) => {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.onloadedmetadata = function () {
            window.URL.revokeObjectURL(video.src);
            resolve(Math.round(video.duration));
          };
          video.src = URL.createObjectURL(file);
        });
      }

      // ☁️ Upload main media (single or carousel)
      const uploadedPaths = [];
      for (const f of mediaFiles) {
        // sanitize the original filename before using it in the storage key
        const safeBaseName = makeStorageSafeName(f.name);
        const uniqueName = `${Date.now()}-${safeBaseName}`;
        const path = `${artistId}/${targetPostId}/${uniqueName}`;
        const { error: uploadError } = await supabase.storage
          .from("post-variations")
          .upload(path, f, { upsert: true });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
      }

      const fullFilePath = uploadedPaths[0];
      const carouselPaths = isImage && uploadedPaths.length > 1 ? uploadedPaths : null;

      // Pick audio from library selection (no upload here)
      let audioPath = null;
      if (selectedAudioId) {
        const song = audioOptions.find((s) => s.id === selectedAudioId);
        audioPath = song ? song.file_path : null;
      } else if (mode === "replace" && variation?.audio_file_name) {
        // keep existing audio if no new song chosen
        audioPath = variation.audio_file_name;
      }

      if (mode === 'replace' && variation) {
        // 🔄 UPDATE existing variation with new file path + length + audio snippet
        const { error: updateError } = await supabase
          .from('postvariations')
          .update({
            file_name: fullFilePath,
            length_seconds: lengthSeconds,
            carousel_files: carouselPaths,
            ...(audioPath
              ? {
                  audio_file_name: audioPath,
                  audio_start_seconds: Number(snippetStart) || 0,
                }
              : {}),      
            ...(platforms && platforms.length ? { platforms } : {}),
          })
          .eq('id', variation.id);
      
        if (updateError) throw updateError;
      } else {
        // ➕ NEW variation (existing behavior + audio fields)
        // 1) get next test_version
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

        if (!platforms || platforms.length === 0) {
          alert('Please select at least one platform.');
          setUploading(false);
          return;
        }

        const { error: insertError } = await supabase
          .from('postvariations')
          .insert([{
            post_id: postId,
            platforms,
            file_name: fullFilePath,
            test_version: nextVersion,
            length_seconds: lengthSeconds,
            variation_post_date: variationDate,
            notes,
            carousel_files: carouselPaths,
            ...(audioPath
              ? {
                  audio_file_name: audioPath,
                  audio_start_seconds: Number(snippetStart) || 0,
                }
              : {}),        
          }]);

        if (insertError) throw insertError;
      }

      onSave(); // refresh + close in parent
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
        <h2 className="text-lg font-bold mb-4">
          {mode === 'replace' ? 'Replace Media' : 'Upload Media'}
        </h2>

        {/* File upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Select Media File</label>
          <input
            type="file"
            multiple
            // allow images + common web video formats (intentionally excluding QuickTime)
            accept="image/*,video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg"
            onChange={handleFileChange}
            className="w-full text-sm"
            disabled={uploading}
          />
          {file && (
            <p className="text-xs text-gray-500 mt-1">
              {file.name}
              {extraFiles.length > 0 && ` + ${extraFiles.length} more`}
            </p>
          )}

        </div>

        {/* Audio library selection + snippet controls */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Song (from audio library)
          </label>

          <select
            className="w-full border rounded p-2 text-sm"
            value={selectedAudioId || ""}
            disabled={uploading || audioLoading || audioOptions.length === 0}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              setSelectedAudioId(id);

              if (!id) {
                setAudioPreviewUrl(null);
                return;
              }
              const song = audioOptions.find((o) => o.id === id);
              if (!song) return;
              const { data } = supabase.storage
                .from("post-variations")
                .getPublicUrl(song.file_path);
              setAudioPreviewUrl(data?.publicUrl || null);
            }}
          >
            <option value="">
              {audioLoading
                ? "Loading songs…"
                : audioOptions.length
                ? "Select a song…"
                : "No songs in audio library for this artist"}
            </option>
            {audioOptions.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
              </option>
            ))}
          </select>

          {audioPreviewUrl && (
            <div className="mt-2 space-y-2">
              <audio
                ref={audioRef}
                src={audioPreviewUrl}
                controls
                className="w-full"
              />
              <div className="flex gap-2 items-end text-xs">
                <div className="flex-1">
                  <label className="block mb-1">Snippet start (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    value={snippetStart}
                    onChange={(e) => setSnippetStart(e.target.value)}
                    className="w-full border rounded p-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-1">Snippet length (seconds)</label>
                  <input
                    type="number"
                    min={1}
                    value={snippetDuration}
                    onChange={(e) => setSnippetDuration(e.target.value)}
                    className="w-full border rounded p-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePreviewSnippet}
                  className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  disabled={uploading}
                >
                  Preview snippet
                </button>
              </div>
            </div>
          )}
        </div>


        {/* Platform multi-select */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((p) => (
              <label
                key={p.value}
                className="inline-flex items-center gap-1 text-sm"
              >
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  disabled={uploading}
                  checked={platforms.includes(p.value)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPlatforms((prev) =>
                      checked
                        ? [...prev, p.value]
                        : prev.filter((v) => v !== p.value)
                    );
                  }}
                />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
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
            <div className="mt-2">
              <DatePicker
                selected={new Date(variationDate)}
                onChange={(date) => setVariationDate(date.toISOString().split('T')[0])}
                inline
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {uploading ? 'Uploading…' : (mode === 'replace' ? 'Save Replacement' : 'Upload')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Social Links modal
function SocialLinksModal({ post, onClose, onSaved }) {
  const [instagramUrl, setInstagramUrl] = useState(post.instagram_url || "");
  const [tiktokUrl, setTiktokUrl] = useState(post.tiktok_url || "");
  const [youtubeUrl, setYoutubeUrl] = useState(post.youtube_url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!post?.id) return;
    setSaving(true);
    setError("");

    try {
      const updates = {
        instagram_url: instagramUrl.trim() || null,
        tiktok_url: tiktokUrl.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
      };

      const { error: updateError } = await supabase
        .from("posts")
        .update(updates)
        .eq("id", post.id);

      if (updateError) throw updateError;

      if (onSaved) onSaved(updates);
    } catch (e) {
      console.error("Error saving social links:", e);
      setError("Failed to save links");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div
        className="relative bg-white rounded-lg w-full max-w-md p-6 mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-lg"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold mb-4">Social Links</h2>
        <p className="text-xs text-gray-600 mb-4">
          Paste the published post URLs for this calendar post. These will be
          used later for pulling performance stats.
        </p>

        {error && (
          <div className="text-xs text-red-600 mb-2">{error}</div>
        )}

        <div className="space-y-3 text-sm">
          <div>
            <label className="block font-medium mb-1">Instagram URL</label>
            <input
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">TikTok URL</label>
            <input
              type="url"
              placeholder="https://www.tiktok.com/@.../video/..."
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">YouTube URL</label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-[#bbe1ac] rounded hover:opacity-90 text-black disabled:opacity-70"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Links"}
          </button>
        </div>
      </div>
    </div>
  );
}

//captions function
function CaptionsModal({ captions, onClose, onSave }) {
const [tempCaptions, setTempCaptions] = useState(captions);
const [isEditing, setIsEditing] = useState(false);

const handleSave = () => {
  onSave(tempCaptions);
  setIsEditing(false);
};

return (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
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
            {tempCaptions.a || <span className="text-gray-400">No caption</span>}
          </div>
        )}
        {!isEditing && !tempCaptions.b && (
<button
  onClick={() => {
    setTempCaptions({...tempCaptions, b: 'Change Me'});
    setIsEditing(true);
  }}
  className="mt-2 px-3 py-1.5 text-sm bg-[#bbe1ac] rounded hover:opacity-90"
>
  + Add Caption B
</button>
)}
        {tempCaptions.b && (
          <>
            <h4 className="font-medium">Caption B:</h4>
            {isEditing ? (
              <textarea
                value={tempCaptions.b || ''}
                onChange={(e) => setTempCaptions({...tempCaptions, b: e.target.value})}
                className="w-full p-2 border rounded"
                rows={3}
              />
            ) : (
              <div className="bg-gray-50 p-3 rounded text-sm min-h-[3rem] whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {tempCaptions.b}
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
}
}

//Delete Post Modal
function ConfirmDeleteModal({ open, onCancel, onConfirm, deleting }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onCancel}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          aria-label="Close confirm deletion"
        >
          ✕
        </button>
        <h3 className="text-lg font-semibold mb-2">Confirm deletion</h3>
        <p className="text-sm text-gray-600">
          This will permanently delete the post and all its variations. This action cannot be undone.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-70"
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
const router = useRouter();
const [artists, setArtists] = useState([])
const [selectedArtistId, setSelectedArtistId] = useState('8') // default artist id
const [weeks, setWeeks] = useState([])
const [rangeLabel, setRangeLabel] = useState('')
const [errorMsg, setErrorMsg] = useState('')
//const router = useRouter(); //for button links

const [uploadMode, setUploadMode] = useState('new'); // 'new' | 'replace'
const [replaceVariation, setReplaceVariation] = useState(null);
const [allVariations, setAllVariations] = useState([]);
const [platformFilter, setPlatformFilter] = useState([]); // array of platform strings
const [platformFilterOpen, setPlatformFilterOpen] = useState(false); // NEW: dropdown open/closed
const [refreshCounter, setRefreshCounter] = useState(0);

//social links modal
const [showSocialLinksModal, setShowSocialLinksModal] = useState(false);

// View switching
const [viewMode, setViewMode] = useState('4weeks') // '4weeks' (Current) | 'month'
const [months, setMonths] = useState([])
const [selectedMonth, setSelectedMonth] = useState('')

// Checking width for dates
const [isNarrow, setIsNarrow] = useState(false);

const [menuOpen, setMenuOpen] = useState(false);

const navItems = [
  { href: "https://supabase.com/dashboard/project/gtccctajvobfvhlonaot/editor/17407?schema=public", label: "Supabase" },
  { href: "/dashboard/edit-next", label: "Edit Next" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/onboarding-admin", label: "Onboarding" },
  { href: "/dashboard/menu", label: "Home" },
  { href: "/dashboard/posts-stats", label: "Posts Stats" },
];

useEffect(() => {
  if (!router.isReady) return;
  const qArtist = router.query.artist;
  if (qArtist) {
    setSelectedArtistId(String(qArtist));
  }
}, [router.isReady, router.query.artist]);

useEffect(() => {
  const handleResize = () => setIsNarrow(window.innerWidth < 800);
  handleResize(); // run once at mount
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

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

// notification bubbles
function handleVariationResolvedChange(variationId, nextResolved) {
  // Update the calendar’s variation source (used for bubbles)
  setAllVariations(prev =>
    prev.map(v => (v.id === variationId ? { ...v, feedback_resolved: nextResolved } : v))
  );

  // If Post Details is open, reflect the change there too
  setPostDetails(prev =>
    prev
      ? {
          ...prev,
          variations: prev.variations.map(v =>
            v.id === variationId ? { ...v, feedback_resolved: nextResolved } : v
          ),
        }
      : prev
  );
}

// ✅ NEW: keep greenlight state in sync for bubbles + modal list
function handleVariationGreenlightChange(variationId, nextGreenlight) {
  setAllVariations((prev) =>
    prev.map((v) => (v.id === variationId ? { ...v, greenlight: nextGreenlight } : v))
  );

  setPostDetails((prev) =>
    prev
      ? {
          ...prev,
          variations: prev.variations.map((v) =>
            v.id === variationId ? { ...v, greenlight: nextGreenlight } : v
          ),
        }
      : prev
  );
}

function handleVariationPlatformsChange(variationId, nextPlatforms) {
  setAllVariations((prev) =>
    prev.map((v) => (v.id === variationId ? { ...v, platforms: nextPlatforms } : v))
  );

  setPostDetails((prev) =>
    prev
      ? {
          ...prev,
          variations: prev.variations.map((v) =>
            v.id === variationId ? { ...v, platforms: nextPlatforms } : v
          ),
        }
      : prev
  );
}


// Inline post-name editing
const [editingName, setEditingName] = useState(false);
const [nameDraft, setNameDraft] = useState('');
const [savingName, setSavingName] = useState(false);

function startEditingName() {
  setNameDraft(postDetails?.post?.post_name || '');
  setEditingName(true);
}

function cancelEditingName() {
  setEditingName(false);
  setNameDraft('');
}

async function savePostName() {
  if (!selectedPostId) return;
  const newName = nameDraft.trim();
  if (!newName) return alert('Post name cannot be empty.');
  setSavingName(true);
  try {
    const { error } = await supabase
      .from('posts')
      .update({ post_name: newName })
      .eq('id', selectedPostId);
    if (error) throw error;

    // Update modal view
    setPostDetails(prev => ({
      ...prev,
      post: { ...prev.post, post_name: newName }
    }));

    // Update calendar/list weeks
    setWeeks(prevWeeks =>
      prevWeeks.map(week => ({
        ...week,
        days: week.days.map(day => ({
          ...day,
          posts: day.posts.map(p =>
            p.id === selectedPostId ? { ...p, post_name: newName } : p
          )
        }))
      }))
    );

    setEditingName(false);
  } catch (e) {
    console.error('Failed to rename post:', e);
    alert('Failed to rename post. See console for details.');
  } finally {
    setSavingName(false);
  }
}


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

//Drag and Drop Handler
const onDragEnd = async (result) => {
  const { destination, source, draggableId } = result
  if (!destination) return

  const isVariation = draggableId.startsWith("var-")
  const itemId = isVariation ? Number(draggableId.replace("var-", "")) : Number(draggableId)
  const sourceYMD = source.droppableId
  const destYMD = destination.droppableId

  // No move?
  if (sourceYMD === destYMD && source.index === destination.index) return

  // Optimistic UI update
  setWeeks(prev => movePostInWeeks(prev, itemId, sourceYMD, destYMD, destination.index, isVariation))

  // Persist to DB if date changed
  if (sourceYMD !== destYMD) {
    try {
      if (isVariation) {
        await updateVariationDateById(itemId, destYMD) // new helper
      } else {
        await updatePostDateById(itemId, destYMD)
      }
    } catch (err) {
      // Revert on failure
      setWeeks(prev => movePostInWeeks(prev, itemId, destYMD, sourceYMD, source.index, isVariation))
      console.error("Failed to move item:", err)
      alert('Failed to move item. Please try again.')
    }
  }
}

//don't show calendar picker unless clicked
const [showDatePicker, setShowDatePicker] = useState(false);

//Media player not showing by default
const [selectedVariation, setSelectedVariation] = useState(null);
const [showMediaPlayer, setShowMediaPlayer] = useState(false);

// NEW: collapsed weeks (mobile)
const [collapsedWeeks, setCollapsedWeeks] = useState(() => new Set());

// For upload modal
const [showUploadModal, setShowUploadModal] = useState(false);

// Delete post modal state
const [showConfirmDelete, setShowConfirmDelete] = useState(false);
const [deletingPost, setDeletingPost] = useState(false);

// Remove a post from weeks state (UI update after delete)
function removePostFromWeeks(weeksArr, postId) {
  return weeksArr.map(w => ({
    ...w,
    days: w.days.map(d => ({
      ...d,
      posts: d.posts.filter(p => p.id !== postId)
    }))
  }));
}

// Confirm delete handler
async function handleConfirmDeletePost() {
  if (!postDetails?.post?.id) {
    setShowConfirmDelete(false);
    return;
  }
  setDeletingPost(true);
  const postId = postDetails.post.id;

  try {
    // Collect storage file paths for variations
    const paths = (postDetails.variations || [])
      .map(v => v.file_name)
      .filter(Boolean);

    // Delete variation rows (skip if DB cascades)
    if ((postDetails.variations || []).length > 0) {
      const { error: varDelErr } = await supabase
        .from("postvariations")
        .delete()
        .eq("post_id", postId);
      if (varDelErr) throw varDelErr;
    }

    // Delete storage files (best-effort)
    if (paths.length > 0) {
      const { error: storageErr } = await supabase
        .storage
        .from("post-variations")
        .remove(paths);
      if (storageErr) {
        console.warn("Storage delete warning:", storageErr.message);
      }
    }

    // Delete the post
    const { error: postDelErr } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);
    if (postDelErr) throw postDelErr;

    // Update UI
    setWeeks(prev => removePostFromWeeks(prev, postId));
    setAllVariations(prev => prev.filter(v => v.post_id !== postId));
    setShowConfirmDelete(false);
    closeModal();
  } catch (e) {
    console.error("Delete post failed:", e);
    alert("Failed to delete post. See console for details.");
  } finally {
    setDeletingPost(false);
  }
}

// Default: on mobile, collapse only the previous week by default;
// current week and all future weeks remain open.
useEffect(() => {
  if (!isNarrow) {
    // On desktop, treat all weeks as expanded.
    setCollapsedWeeks(new Set());
    return;
  }

  const today = new Date();
  const startThisWeek = startOfWeekMonday(today);
  const startPrevWeek = addDays(startThisWeek, -7);

  // Collapse only the previous week's key
  setCollapsedWeeks(new Set([toYMD(startPrevWeek)]));
}, [isNarrow]);

// Load artists once
useEffect(() => {
  const load = async () => {
    const { data, error } = await supabase.from('artists').select('id,name').not('id', 'in', '(1, 2, 3)').order('name') // artist ids removed from artist dropdown
    if (error) {
      console.error('Supabase error (artists):', error)
      setErrorMsg('Error loading artists. Check console.')
      return
    }
    setArtists(data || [])
    if (data && data.length && !selectedArtistId) {
      setSelectedArtistId(String(data[0].id))
    }
  }
  load()
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

// Load posts whenever artist / view mode / selected month / platform filter changes
useEffect(() => {
  const loadPosts = async () => {
    if (!selectedArtistId) return
    setErrorMsg('')

    let from, to
    if (viewMode === '4weeks') {
      const today = new Date()
      const startThisWeek = startOfWeekMonday(today)
      const startLastWeek = addDays(startThisWeek, -7)
    
      // ✅ extend to 4 full weeks (28 days) ahead
      const endNextFourWeeks = addDays(startThisWeek, 28)
    
      // ✅ snap to Sunday so we cover the full calendar grid
      const endVisibleSunday = addDays(endNextFourWeeks, 6 - endNextFourWeeks.getDay())
    
      from = toYMD(startLastWeek)
      to = toYMD(endVisibleSunday)
      setRangeLabel(`${from} → ${to}`)
    } else if (viewMode === 'month' && selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number)
      const firstDay = new Date(y, m - 1, 1)
      const lastDay = new Date(y, m, 0)
      from = toYMD(firstDay)
      to = toYMD(lastDay)
      setRangeLabel(`${from} → ${to}`)
    } else {
      return
    }

    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, post_name, post_date, status, artist_id')
      .eq('artist_id', Number(selectedArtistId))
      .gte('post_date', from)
      .lte('post_date', to)
      .order('post_date', { ascending: true })

    if (error) {
      console.error('Supabase error (posts):', error)
      setErrorMsg('Error loading posts. Check console.')
      return
    }

    const postIds = (posts || []).map(p => p.id)

    const { data: variations, error: varError } = await supabase
      .from("postvariations")
        .select(`
          id,
          variation_post_date,
          post_id,
          platforms,
          feedback,
          feedback_resolved,
          greenlight
        `)
  
      .in("post_id", postIds)
      .gte("variation_post_date", from)
      .lte("variation_post_date", to);

    if (varError) {
      console.error('Supabase error (variations):', varError);
      // continue — we can still render posts without variations
    }

    setAllVariations(variations || [])

    const endDate = new Date(to);                 // ✅ REQUIRED
    const weeksArr = []
    let currentStart = startOfWeekMonday(new Date(from))

    while (currentStart <= endDate) { 
      const days = []
      for (let d = 0; d < 7; d++) {
        const dayDate = addDays(currentStart, d)
        const ymd = toYMD(dayDate)
        const postsForDay = (posts || [])
          .filter(p => toYMD(new Date(p.post_date)) === ymd)
          .filter(p => {
            if (!platformFilter.length) return true;
            const postVars = (variations || []).filter(v => v.post_id === p.id);
            // Keep posts that have *any* variation with *any* of the selected platforms
            return postVars.some(v =>
              (v.platforms || []).some(plat => platformFilter.includes(plat))
            );
          });
        
        const varsForDay = (variations || [])
          .filter(v => toYMD(new Date(v.variation_post_date)) === ymd)
          .filter(v => {
            const parent = posts.find(p => p.id === v.post_id)
            if (!parent) return true
            return toYMD(new Date(parent.post_date)) !== ymd
          })
          .map(v => {
            const parentPost = posts.find(p => p.id === v.post_id)
            if (!parentPost) return null
            return {
              id: v.id,
              post_id: v.post_id,
              post_name: `${parentPost.post_name} (var)`,
              status: null,
              isVariation: true
            }
          })
          .filter(Boolean)
        
        days.push({
          date: dayDate,
          ymd,
          posts: postsForDay,
          variations: varsForDay
        })
      }
      weeksArr.push({ weekStart: currentStart, days })
      currentStart = addDays(currentStart, 7)
    }

    setWeeks(weeksArr)
    
    // ✅ SMART PRELOADING: Actually download media files for likely-to-be-viewed posts
    const preloadVariations = async () => {
      const today = new Date();
      const thisWeekStart = startOfWeekMonday(today);
      const thisWeekEnd = addDays(thisWeekStart, 12);
      
      // Find posts in current week OR with unresolved feedback OR recently uploaded
      const priorityPosts = posts.filter(post => {
        // ✅ Skip currently open post (it's being preloaded separately with higher priority)
        if (selectedPostId && post.id === selectedPostId) return false;
        
        const postDate = new Date(post.post_date);
        const isThisWeek = postDate >= thisWeekStart && postDate < thisWeekEnd;
        const isRecentStatus = ['uploaded', 'ready'].includes(post.status?.toLowerCase());
        const hasUnresolvedFeedback = (variations || []).some(v => 
          v.post_id === post.id && 
          v.feedback && 
          v.feedback.trim() !== "" && 
          !v.feedback_resolved
        );
        
        return isThisWeek || isRecentStatus || hasUnresolvedFeedback;
      });

      // Get variations for these priority posts
      const priorityVariationIds = new Set(
        priorityPosts.map(p => p.id)
      );
      
      const variationsToPreload = (variations || []).filter(v => 
        priorityVariationIds.has(v.post_id)
      );

      console.log(`Background preloading ${variationsToPreload.length} priority variations (excluding currently open post)`);

      // Helper to actually preload media into browser cache
      const preloadMediaFile = (url) => {
        preloadVideoBytes(url);
        const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(getPathname(url));

        if (isVideo) {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.muted = true; // helps some browsers allow loading behavior

          video.onloadedmetadata = () => console.log("🎥 preload metadata ok", url);
          video.oncanplay = () => console.log("🎥 preload canplay", url);
          video.onerror = (e) => console.log("🎥 preload error", url, video.error, e);

          video.src = url;
          video.load();
        } else {
          const img = new Image();
          img.onload = () => console.log("🖼️ preload ok", url);
          img.onerror = (e) => console.log("🖼️ preload error", url, e);
          img.src = url;
        }
      };


      // Preload up to 15 variations (increased from 10 since we're skipping open post)
      const preloadPromises = variationsToPreload
        .slice(0, 15)
        .map(async (v) => {
          const paths = Array.isArray(v.carousel_files) && v.carousel_files.length > 0
            ? v.carousel_files
            : v.file_name ? [v.file_name] : [];
          
          // Only preload first image/video of each variation
          const firstPath = paths[0];
          if (!firstPath) return;
          
          try {
            // Get the URL
            const url = await getOptimizedMediaUrl(firstPath);
            
            // Tell browser to download it (lower priority)
            preloadMediaFile(url);
            
            // Skip audio for background preload (save bandwidth for priority content)
          } catch (err) {
            // Silent fail - preloading is optional
          }
        });

      // Execute all preloads in background
      Promise.all(preloadPromises).then(() => {
        console.log(`✅ Background preload complete`);
      });
    };

    // Start preloading after calendar renders (increased delay to let priority preload finish first)
    setTimeout(preloadVariations, 1000);

    // Start preloading after calendar renders
    setTimeout(preloadVariations, 500);
  }
  loadPosts()
}, [selectedArtistId, viewMode, selectedMonth, refreshCounter, platformFilter])


//drag and drop post function
async function updatePostDateById(postId, newDate) {
  try {
    const { error } = await supabase
      .from('posts')
      .update({ post_date: newDate })
      .eq('id', postId);

    if (error) throw error;

    // Update modal if we're looking at the same post
    if (postDetails?.post?.id === postId) {
      setPostDetails(prev => prev ? ({
        ...prev,
        post: { ...prev.post, post_date: newDate }
      }) : prev)
    }
  } catch (err) {
    console.error('Error updating post date:', err);
    setUpdateError('Failed to update date');
    throw err;
  }
}

async function updateVariationDateById(variationId, newYMD) {
  const { error } = await supabase
    .from("postvariations")
    .update({ variation_post_date: newYMD })
    .eq("id", variationId)

  if (error) throw error
}

//post status function
async function updatePostStatus(newStatus) {
  if (!selectedPostId) return;
   setUpdatingStatus(true);
  setUpdateError('');
   try {
    // 1. Update in database
    const { error } = await supabase
      .from('posts')
      .update({ status: newStatus })
      .eq('id', selectedPostId);
  
    if (error) throw error;
  
    // 2. Update modal view
    setPostDetails(prev => ({
      ...prev,
      post: {
        ...prev.post,
        status: newStatus
      }
    }));
  
    // 3. Update calendar view
    setWeeks(prevWeeks =>
      prevWeeks.map(week => ({
        ...week,
        days: week.days.map(day => ({
          ...day,
          posts: day.posts.map(post =>
            post.id === selectedPostId
              ? { ...post, status: newStatus }
              : post
          )
        }))
      }))
    );
  
  } catch (error) {
    console.error('Error updating status:', error);
    setUpdateError('Failed to update status');
  } finally {
    setUpdatingStatus(false);
  }
}
//end of post status function from DeepSeek

//save button for caption function
const handleSaveCaptions = async (updatedCaptions) => {
  try {
    const { error } = await supabase
      .from('posts')
      .update({
        caption_a: updatedCaptions.a,
        caption_b: updatedCaptions.b
      })
      .eq('id', selectedPostId);
     if (error) throw error;
     // Update local state
    setPostDetails(prev => ({
      ...prev,
      captions: updatedCaptions,
      post: {
        ...prev.post,
        caption_a: updatedCaptions.a,
        caption_b: updatedCaptions.b
      }
    }));
   } catch (error) {
    console.error('Error updating captions:', error);
    setUpdateError('Failed to update captions');
  }
};
//end of save button for caption function

//date picker function
async function updatePostDate(newDate) {
  if (!selectedPostId) return;
   try {
    const { error } = await supabase
      .from('posts')
      .update({ post_date: newDate })
      .eq('id', selectedPostId);
  
    if (error) throw error;
  
    // Update modal view
    setPostDetails(prev => ({
      ...prev,
      post: {
        ...prev.post,
        post_date: newDate
      }
    }));
  
    // Update calendar view
    setWeeks(prevWeeks => {
      return prevWeeks.map(week => ({
        ...week,
        days: week.days.map(day => ({
          ...day,
          posts: day.posts.filter(post => post.id !== selectedPostId) // Remove from old date
        }))
      }));
    });
  
    // Then add it to the correct new date
    const newDateYMD = toYMD(new Date(newDate));
    setWeeks(prevWeeks => {
      return prevWeeks.map(week => ({
        ...week,
        days: week.days.map(day => ({
          ...day,
          posts: day.ymd === newDateYMD
            ? [...day.posts, {
                ...postDetails.post,
                post_date: newDate,
                ymd: newDateYMD
              }]
            : day.posts
        }))
      }));
    });
  } catch (error) {
    console.error('Error updating date:', error);
    setUpdateError('Failed to update date');
  }
}
//end of date picker function

// Open modal + fetch details (post + variations) in two queries
async function openPostDetails(postId) {
  setSelectedPostId(postId);
  setPostLoading(true);
  setPostError('');
  setPostDetails(null);

  try {
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();
    if (postErr) throw postErr;

    const { data: variations, error: varErr } = await supabase
      .from('postvariations')
      .select(`
        id,
        platforms,
        test_version,
        file_name,
        length_seconds,
        feedback,
        feedback_resolved,
        greenlight,
        audio_file_name,
        audio_start_seconds,
        carousel_files
      `)
      .eq('post_id', postId)
      .order('test_version', { ascending: true });
    
    if (varErr) throw varErr;

    // ✅ PRIORITY PRELOAD: Aggressively preload ALL media for this post
    const priorityPreload = async () => {
      const preloadMediaFile = (url) => {
        const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(getPathname(url));
        
        if (isVideo) {
          const video = document.createElement('video');
          video.preload = 'auto';
          video.src = url;
          video.load();
        } else {
          const img = new Image();
          img.src = url;
        }
      };

      for (const v of variations || []) {
        const paths = Array.isArray(v.carousel_files) && v.carousel_files.length > 0
          ? v.carousel_files
          : v.file_name ? [v.file_name] : [];
        
        // Preload ALL media for this post (not just first)
        for (const path of paths) {
          try {
            const url = await getOptimizedMediaUrl(path);
            preloadMediaFile(url);
          } catch (err) {
            console.log('Priority preload failed for', path, err);
          }
        }

        // Also preload audio
        if (v.audio_file_name) {
          try {
            const audioUrl = await getOptimizedMediaUrl(v.audio_file_name);
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = audioUrl;
            audio.load();
          } catch (err) {
            console.log('Audio preload failed');
          }
        }
      }
    };

    // Start aggressive preload immediately (don't wait)
    priorityPreload();

    setPostDetails({
      post,
      variations: variations || [],
      captions: {
        a: post.caption_a,
        b: post.caption_b
      }
    });
  } catch (e) {
    console.error('Error loading post details:', e);
    setPostError('Could not load post details. See console for more info.');
  } finally {
    setPostLoading(false);
  }
}
function closeModal() {
  setSelectedPostId(null)
  setPostDetails(null)
  setPostLoading(false)
  setPostError('')
}

//for stats page button functionality
function goToStats() {
  router('/dashboard/stats-view');
}

return (
  <div className="p-6">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <Link
          href="/dashboard/thisweek"
        >
          <button className="px-4 py-2 bg-[#a89ee4] rounded over:bg-[#bfb7f2] shadow-md">
            This Week's Posts
          </button>
        </Link>
        
        {/* Menu bubble */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Open menu"
            className="
              rounded-full 
              bg-[#a89ee4]
              shadow-lg 
              border border-white
              p-3                             /* ← updated padding */
              flex flex-col justify-center items-center
              hover:bg-[#bfb7f2]
              transition
            "
          >
            <span className="block w-5 h-0.5 bg-[#33286a] mb-1" />
            <span className="block w-5 h-0.5 bg-[#33286a] mb-1" />
            <span className="block w-3 h-0.5 bg-[#33286a]" />
          </button>

          {menuOpen && (
            <aside
              className="
                absolute right-0 top-14 z-40
                w-64
                bg-[#a89ee4]           /* same purple */
                rounded-2xl 
                shadow-lg 
                p-4
              "
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-[#33286a]">Menu</h2>
                <button
                  type="button"
                  className="text-sm text-[#33286a]"
                  onClick={() => setMenuOpen(false)}
                >
                  ✕
                </button>
              </div>
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="
                        block w-full rounded-lg 
                        bg-[#dcd4fa]              /* lighter purple content area */
                        px-3 py-2 text-sm font-medium 
                        text-[#33286a]
                        hover:bg-white 
                        hover:shadow
                        transition
                      "
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>

      </div>
      <h1 className="text-2xl font-bold mb-4">Las Aguas Dashboard</h1>
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <label className="font-medium">Artist:</label>
        <select
          className="border p-2 rounded"
          value={selectedArtistId}
          onChange={(e) => setSelectedArtistId(e.target.value)}
        >
          <option value="">Select an artist…</option>
          {artists.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <label className="font-medium ml-4">View:</label>
        <select
          className="border p-2 rounded"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
        >
          <option value="4weeks">Current</option>
          <option value="month">Specific month</option>
        </select>
                {/* Platform filter button + dropdown */}
                <div className="relative ml-4">
                  <button
                    type="button"
                    onClick={() => setPlatformFilterOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded border px-2 py-1 text-sm bg-white hover:bg-gray-50"
                  >
                    <span>Platforms</span>
                    <span aria-hidden="true">☰</span>
                  </button>

                  {platformFilterOpen && (
                    <div className="absolute right-0 mt-1 w-44 rounded border bg-white shadow-lg z-20 p-2 text-sm">
                      {PLATFORM_OPTIONS.map((p) => (
                        <label
                          key={p.value}
                          className="flex items-center gap-2 mb-1 last:mb-0"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={platformFilter.includes(p.value)}
                            onChange={() => {
                              setPlatformFilter((prev) =>
                                prev.includes(p.value)
                                  ? prev.filter((v) => v !== p.value)
                                  : [...prev, p.value]
                              );
                            }}
                          />
                          <span>{p.label}</span>
                        </label>
                      ))}

                      <button
                        type="button"
                        onClick={() => setPlatformFilter([])}
                        className="mt-2 w-full text-xs text-gray-600 underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>



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
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6">
        {weeks.map((week, wi) => (
          <div key={wi} className="border rounded-lg overflow-hidden bg-white shadow-sm">
            {(() => {
              const weekKey = toYMD(week.weekStart);
              const isCollapsed = isNarrow && collapsedWeeks.has(weekKey);

              return (
                <button
                  type="button"
                  className="w-full px-4 py-2 bg-gray-50 border-b text-sm font-medium flex items-center justify-between"
                  onClick={() => {
                    if (!isNarrow) return; // collapsible only on mobile
                    setCollapsedWeeks((prev) => {
                      const next = new Set(prev);
                      if (next.has(weekKey)) next.delete(weekKey);
                      else next.add(weekKey);
                      return next;
                    });
                  }}
                >
                  <span>Week of {week.weekStart.toLocaleDateString()}</span>
                  {isNarrow && (
                    <span className="text-lg leading-none">
                      {isCollapsed ? "▸" : "▾"}
                    </span>
                  )}
                </button>
              );
            })()}

            {(!isNarrow || !collapsedWeeks.has(toYMD(week.weekStart))) && (
              <>
                <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 border-b">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="px-3 py-2">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {week.days.map((day, di) => (
                    <Droppable droppableId={day.ymd} key={day.ymd} type="POST">
                      {(dropProvided, dropSnapshot) => (
                        <div
                          ref={dropProvided.innerRef}
                          {...dropProvided.droppableProps}
                          className={`min-h-[120px] border-l first:border-l-0 border-t-0 p-2`}
                          style={{
                            backgroundColor:
                              day.date.toDateString() === new Date().toDateString()
                                ? "#eef8ea" // halfway between #bbe1ac and white
                                : "transparent",
                          }}
                        >
                          <div className="text-xs text-gray-500 mb-1">
                            {isNarrow
                              ? `${day.date.toLocaleDateString(undefined, {
                                  weekday: "short",
                                })} - ${day.date
                                  .getDate()
                                  .toString()
                                  .padStart(2, "0")}/${(day.date.getMonth() + 1)
                                  .toString()
                                  .padStart(2, "0")}`
                              : `${day.date
                                  .getDate()
                                  .toString()
                                  .padStart(2, "0")}/${(day.date.getMonth() + 1)
                                  .toString()
                                  .padStart(2, "0")}/${day.date.getFullYear()}`}
                          </div>

                          <div className="space-y-1">
                            {day.posts.map((post, index) => {
                              // ✅ Count all variations across the loaded range that belong to this post and have feedback
                              const feedbackCount = allVariations.filter(
                                (v) =>
                                  v.post_id === post.id &&
                                  v.feedback &&
                                  v.feedback.trim() !== "" &&
                                  !v.feedback_resolved
                              ).length;

                              // ✅ Count variations that have been greenlit
                              const greenlitCount = allVariations.filter(
                                (v) => v.post_id === post.id && !!v.greenlight
                              ).length;

                              const postPlatforms = Array.from(
                                new Set(
                                  allVariations
                                    .filter((v) => v.post_id === post.id)
                                    .flatMap((v) => v.platforms || [])
                                    .filter(Boolean)
                                )
                              );


                              // 🟡 Missing links indicator: only for posts marked as 'posted' with no social URLs
                              const hasAnySocialLink =
                                (post.instagram_url &&
                                  post.instagram_url.trim() !== "") ||
                                (post.tiktok_url &&
                                  post.tiktok_url.trim() !== "") ||
                                (post.youtube_url &&
                                  post.youtube_url.trim() !== "");

                              const showMissingLinksIndicator =
                                post.status === "posted" && !hasAnySocialLink;

                              return (
                                <Draggable
                                  key={post.id}
                                  draggableId={String(post.id)}
                                  index={index}
                                >
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className="relative text-xs px-2 py-1 rounded text-white cursor-pointer"
                                      style={{
                                        backgroundColor: statusColor(post.status),
                                        ...dragProvided.draggableProps.style,
                                      }}
                                      onClick={() => openPostDetails(post.id)}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span>{post.post_name}</span>

                                        {/* Platform chips */}
                                        {postPlatforms.length > 0 && (
                                          <div className="flex flex-wrap gap-[2px] justify-end">
                                            {postPlatforms
                                              .sort(
                                                (a, b) =>
                                                  PLATFORM_OPTIONS.findIndex(
                                                    (o) => o.value === a
                                                  ) -
                                                  PLATFORM_OPTIONS.findIndex(
                                                    (o) => o.value === b
                                                  )
                                              )
                                              .map((plat) => {
                                                const cfg = PLATFORM_OPTIONS.find(
                                                  (o) => o.value === plat
                                                );
                                                const short =
                                                  cfg?.short || plat[0] || "?";
                                                return (
                                                  <span
                                                    key={plat}
                                                    className="inline...rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] leading-none"
                                                  >
                                                    {short}
                                                  </span>
                                                );
                                              })}
                                          </div>
                                        )}
                                      </div>

                                      {/* 🔔 Notification bubble (feedback / greenlight) */}
                                      {(() => {
                                        const hasFeedback = feedbackCount > 0;
                                        const hasGreenlit = greenlitCount > 0;

                                        const bgClass = hasFeedback
                                          ? "bg-red-500"
                                          : hasGreenlit
                                          ? "bg-green-500"
                                          : "bg-gray-400";

                                        const label = hasFeedback ? String(feedbackCount) : "G";

                                        return (
                                          <span
                                            className={[
                                              "absolute top-0 right-0 translate-x-1/3 -translate-y-1/3",
                                              bgClass,
                                              "text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center",
                                            ].join(" ")}
                                            title={
                                              hasFeedback
                                                ? `${feedbackCount} variation${feedbackCount === 1 ? "" : "s"} with feedback`
                                                : hasGreenlit
                                                ? "Has greenlit variation(s)"
                                                : "Not greenlit yet"
                                            }
                                          >
                                            {label}
                                          </span>
                                        );
                                      })()}


                                      {/* 🟡 Missing social links indicator (for posted posts) */}
                                      {showMissingLinksIndicator && (
                                        <span className="absolute...ed-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                                          !
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}

                            {/* Variations*/}
                            {day.variations.map((variation, vIndex) => (
                              <Draggable
                                key={`var-${variation.id}`}
                                draggableId={`var-${variation.id}`}
                                index={day.posts.length + vIndex} // avoid index collision
                              >
                                {(dragProvided) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className="text-xs px-2 py-1 rounded cursor-pointer"
                                    style={{
                                      backgroundColor: "#dcd9f4", // variations transparent
                                      border: "1px solid #ccc", // optional styling to distinguish
                                      ...dragProvided.draggableProps.style,
                                    }}
                                    onClick={() =>
                                      openPostDetails(variation.post_id)
                                    }
                                  >
                                    {variation.post_name}
                                  </div>
                                )}
                              </Draggable>
                            ))}

                            {dropProvided.placeholder}

                            <div
                              className="text-[10px] text-gray-300 italic cursor-pointer hover:text-gray-500"
                              onClick={() => {
                                setNewPostDate(day.ymd);
                                setShowAddPostModal(true);
                              }}
                            >
                              — Add Post —
                            </div>
                          </div>
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </DragDropContext>


    {/* Post Detail Modal */}
    {selectedPostId && (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        onClick={closeModal}
      >
        <div
          className="bg-white rounded-lg shadow-lg max-w-[90vw] w-full p-6"
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
                <div className="w-full">
                  {!editingName ? (
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold">{postDetails.post.post_name}</div>
                      <button
                        onClick={startEditingName}
                        className="inline-flex items-center text-gray-500 hover:text-gray-700"
                        aria-label="Edit post name"
                        title="Edit name"
                      >
                        ✎
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') savePostName();
                          if (e.key === 'Escape') cancelEditingName();
                        }}
                        className="border rounded px-2 py-1 text-sm w-full max-w-xs"
                        autoFocus
                      />
                      <button
                        onClick={savePostName}
                        disabled={savingName}
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-70"
                      >
                        {savingName ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditingName}
                        disabled={savingName}
                        className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>


    {/* Stacked Controls */}
    <div className="space-y-3 mt-3">
      {/* Status Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          value={postDetails.post.status || ''}
          onChange={(e) => updatePostStatus(e.target.value)}
          disabled={updatingStatus}
          className="w-full border rounded p-2 text-gray-700 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {STATUS_OPTIONS.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {updatingStatus && (
          <span className="text-gray-500 text-sm mt-1">Saving status...</span>
        )}
      </div>

      {/* Date Picker Trigger */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Post Date</label>
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="w-full text-left border rounded p-2 text-gray-700 bg-white text-sm hover:bg-gray-50"
        >
          {new Date(postDetails.post.post_date).toLocaleDateString()}
        </button>
      
        {/* Date Picker Popup */}
        {showDatePicker && (
          <div className="mt-2 p-3 border rounded bg-white shadow-lg z-10">
            <DatePicker
              selected={new Date(postDetails.post.post_date)}
              onChange={(date) => {
                const formattedDate = toYMD(date);
                updatePostDate(formattedDate);
                setShowDatePicker(false);
              }}
              inline
              className="border-0"
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
    </div>

    {updateError && (
      <div className="text-red-600 text-sm mt-2">{updateError}</div>
    )}
  </div>

  {updateError && (
    <div className="text-red-600 text-sm mb-2">{updateError}</div>
  )}

  <button
    onClick={() => setShowCaptions(true)}
   className="w-auto mt-3 px-3 py-1.5 text-sm rounded hover:opacity-90 mb-[10px]"
   style={{ backgroundColor: '#bbe1ac' }}
  >
    View/Edit Caption(s)
  </button>
              {postDetails.post.notes && (
                <p className="mb-4">Notes: {postDetails.post.notes}</p>
              )}
              <h3 className="text-md font-semibold mb-2">Variations</h3>
              <ul className="space-y-2 max-h-64 overflow-auto pr-1">
              {postDetails.variations.length > 0 ? (
  postDetails.variations.map((v) => (
    <li
      key={v.id}
      className="border rounded p-2 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-between text-sm">
        <div>
        <span className="font-medium">{postDetails?.post?.post_name || "Post"}</span>{" "}
          {v.test_version || "—"} —{" "}
          <span className={v.greenlight ? "text-green-600 font-medium" : "text-gray-500"}>
            {v.greenlight ? "Greenlit" : "Not Greenlit"}
          </span>
        </div>

        {/* Download icon button */}
        <button
          onClick={async (e) => {
            e.stopPropagation(); // prevent opening media player
            try {
              const { data, error } = supabase.storage
                .from("post-variations")
                .getPublicUrl(v.file_name);
              if (error) throw error;

              const response = await fetch(data.publicUrl);
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = v.file_name.split("/").pop();
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (err) {
              console.error("Download failed:", err);
              alert("Could not download file.");
            }
          }}
          title="Download"
          className="p-1.5 rounded-full hover:bg-gray-200"
        >
          ⬇️
        </button>
      </div>

      <div
        className="text-xs text-gray-600 cursor-pointer"
        onClick={() => {
          setSelectedVariation(v);
          setShowMediaPlayer(true);
        }}
      >
        {v.file_name || "no file"} •{" "}
        {v.length_seconds ? `${v.length_seconds}s` : "length n/a"}
      </div>
    </li>
  ))
) : (
  <li className="text-sm text-gray-500">No variations</li>
)}

</ul>
        <div className="text-right mt-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => {
              setUploadMode('new');
              setReplaceVariation(null);
              setShowUploadModal(true);
            }}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            New Variation
          </button>

          <button
            onClick={() => setShowSocialLinksModal(true)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Social Links
          </button>

          <button
            onClick={() => setShowConfirmDelete(true)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Delete Post
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

{showSocialLinksModal && postDetails?.post && (
  <SocialLinksModal
    post={postDetails.post}
    onClose={() => setShowSocialLinksModal(false)}
    onSaved={() => {
      // Close modal and refresh this post’s details so URLs are up to date
      setShowSocialLinksModal(false);
      if (selectedPostId) {
        openPostDetails(selectedPostId);
      }
      // Optional: bump refreshCounter if you want the calendar grid to re-load
      // setRefreshCounter((c) => c + 1);
    }}
  />
)}

{showCaptions && (
<CaptionsModal
  captions={postDetails.captions}
  onClose={() => setShowCaptions(false)}
  onSave={handleSaveCaptions}
/>
)}
    {showMediaPlayer && selectedVariation && (
      <MediaPlayer
        variation={selectedVariation}
        onClose={() => {
          setShowMediaPlayer(false);
          setSelectedVariation(null);
        }}
        onRefreshPost={handleVariationResolvedChange}
        onReplaceRequested={(v) => {
          setUploadMode('replace');
          setReplaceVariation(v);
          setShowUploadModal(true);
        }}
        onPlatformsUpdated={handleVariationPlatformsChange}
        onGreenlightUpdated={handleVariationGreenlightChange} // ✅ NEW
      />
    )}

{showAddPostModal && (
  <AddPostModal
    artistId={selectedArtistId}
    defaultDate={newPostDate}
    onClose={() => setShowAddPostModal(false)}
    onPostAdded={() => {
      setShowAddPostModal(false);
      // Refresh posts so new one appears in calendar
      // You can either re-run loadPosts or just change viewMode to trigger useEffect
      setViewMode(v => v); 
      setRefreshCounter(c => c + 1);
    }}
  />
)}

{showUploadModal && (
  <UploadModal
    postId={selectedPostId}
    artistId={selectedArtistId}
    defaultDate={postDetails?.post?.post_date}
    mode={uploadMode}
    variation={replaceVariation}
    onClose={() => setShowUploadModal(false)}
    onSave={() => {
      setShowUploadModal(false);
      openPostDetails(selectedPostId); // refresh list after add/replace
    }}
  />
)}

{/* Confirm Delete Post modal */}
<ConfirmDeleteModal
  open={showConfirmDelete}
  onCancel={() => setShowConfirmDelete(false)}
  onConfirm={handleConfirmDeletePost}
  deleting={deletingPost}
/>

  </div>
)
}