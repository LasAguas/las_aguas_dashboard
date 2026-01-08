// pages/thisweek.js
"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- Helpers ---
const pad = (n) => String(n).padStart(2, "0");
const toYMD = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday => 7
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}
function statusColor(status) {
  switch ((status || "").toLowerCase()) {
    case "not planned":
      return "#ef4444";
    case "planned":
      return "#ED9C37";
    case "assets obtained":
      return "#D4D46C";
    case "uploaded":
      return "#3b82f6";
    case "ready":
      return "#10b981";
    case "posted":
      return "#9ca3af";
    default:
      return "#d1d5db";
  }
}

const PLATFORM_OPTIONS = [
  { value: 'Instagram', label: 'Instagram', short: 'IG' },
  { value: 'TikTok', label: 'TikTok', short: 'TT' },
  { value: 'YouTube', label: 'YouTube', short: 'YT' },
  { value: 'Mailing List', label: 'Mailing List', short: 'ML' },
];

const STATUS_OPTIONS = [
  "not planned",
  "planned",
  "assets obtained",
  "uploaded",
  "ready",
  "posted",
];

// Feedback modal
function FeedbackBlock({ variation, onRefreshPost }) {
  const [localResolved, setLocalResolved] = useState(!!variation?.feedback_resolved);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalResolved(!!variation?.feedback_resolved);
  }, [variation?.feedback_resolved]);

  const toggleResolve = async () => {
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
    variation.feedback_resolved = next; // keep UI in sync
    if (typeof onRefreshPost === "function") onRefreshPost();
  };

  return (
    <>
      <FeedbackBlock variation={variation} onRefreshPost={onRefreshPost} />
    </>
  );
}

// --- Captions Modal ---
function CaptionsModal({ captions, onClose, onSave }) {
  const [tempCaptions, setTempCaptions] = useState(captions);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onSave(tempCaptions);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg w-full max-w-[90vw] max-h-[90vh] p-4 mx-auto overflow-hidden">
        <div className="space-y-3 min-w-[20rem] max-h-[calc(90vh-7rem)] overflow-y-auto pr-2">
          <h4 className="font-medium">Caption A:</h4>
          {isEditing ? (
            <textarea
              value={tempCaptions.a || ""}
              onChange={(e) =>
                setTempCaptions({ ...tempCaptions, a: e.target.value })
              }
              className="w-full p-2 border rounded"
              rows={3}
            />
          ) : (
            <div className="bg-gray-50 p-3 rounded text-sm min-h-[3rem] whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
              {tempCaptions.a || (
                <span className="text-gray-400">No caption</span>
              )}
            </div>
          )}

          {tempCaptions.b && (
            <>
              <h4 className="font-medium">Caption B:</h4>
              {isEditing ? (
                <textarea
                  value={tempCaptions.b || ""}
                  onChange={(e) =>
                    setTempCaptions({ ...tempCaptions, b: e.target.value })
                  }
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

  // Load media URLs (single file or carousel)
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
        const { data, error } = supabase.storage
          .from("post-variations")
          .getPublicUrl(path);
        if (error) {
          console.error("Error fetching media URL:", error);
          throw error;
        }
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
    const { data, error } = supabase.storage
      .from("post-variations")
      .getPublicUrl(variation.audio_file_name);
    if (error) {
      console.error("Error fetching audio URL:", error);
      setAudioUrl(null);
    } else {
      setAudioUrl(data.publicUrl);
    }
  }, [variation?.audio_file_name]);

  if (!variation) return null;

  const hasMedia = mediaUrls.length > 0;
  const hasCarousel = mediaUrls.length > 1;
  const activeUrl = hasMedia ? mediaUrls[currentIndex] : null;

  const isImageFile = (url) =>
    /\.(jpe?g|png|gif|webp)$/i.test(url || "");
  
  const isVideoFile = (url) =>
    /\.(mp4|mov|webm|ogg)$/i.test(url || "");
  

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

// --- Main Page ---
export default function ThisWeek() {
  const [weekDays, setWeekDays] = useState([]);
  const [posts, setPosts] = useState([]);
  const [variations, setVariations] = useState([]);
  const [artistMap, setArtistMap] = useState(new Map());
  const [error, setError] = useState("");
  // For next weeks stuff
  const [nextWeekDays, setNextWeekDays] = useState([]);
  const [nextWeekPosts, setNextWeekPosts] = useState([]);
  const [nextWeekVariations, setNextWeekVariations] = useState([]);
  const [showNextWeek, setShowNextWeek] = useState(false);

  const [showSocialLinksModal, setShowSocialLinksModal] = useState(false);
  const [allVariations, setAllVariations] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [uploadMode, setUploadMode] = useState('new');
  const [replaceVariation, setReplaceVariation] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Modals
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [postDetails, setPostDetails] = useState(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMediaPlayer, setShowMediaPlayer] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    {
      href: "https://supabase.com/dashboard/project/gtccctajvobfvhlonaot/editor/17407?schema=public",
      label: "Supabase",
    },
    { href: "/dashboard/calendar", label: "Calendar" },
    { href: "/dashboard/edit-next", label: "Edit Next" },
    { href: "/dashboard/leads", label: "Leads" },
    { href: "/dashboard/onboarding-admin", label: "Onboarding" },
    { href: "/dashboard/menu", label: "Home" },
    { href: "/dashboard/posts-stats", label: "Posts Stats" },
  ];
  

  // Inline post-name editing (ThisWeek)
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

    // Update the open modal
    setPostDetails(prev => ({
      ...prev,
      post: { ...prev.post, post_name: newName }
    }));

    // Update This Week grid
    setPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, post_name: newName } : p));

    // Update Next Week grid (if the post appears there)
    setNextWeekPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, post_name: newName } : p));

    setEditingName(false);
  } catch (e) {
    console.error('Failed to rename post:', e);
    alert('Failed to rename post. See console for details.');
  } finally {
    setSavingName(false);
  }
}
  async function refreshWeekData() {
    try {
      // Current week
      if (weekDays.length) {
        const from = weekDays[0].ymd, to = weekDays[6].ymd;
        const { data: postData } = await supabase
          .from("posts").select("*").gte("post_date", from).lte("post_date", to).order("post_date", { ascending: true });
        const postIds = (postData || []).map((p) => p.id);
        let varData = [];
        if (postIds.length) {
          const { data: vData } = await supabase
            .from("postvariations")
            .select(`
              id,
              variation_post_date,
              post_id,
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
            .in("post_id", postIds);
          varData = vData || [];
        }
        setPosts(postData || []);
        setVariations(varData);
      }
        // Next 2 weeks (reload full nextWeekDays range)
        if (nextWeekDays.length) {
          const from = nextWeekDays[0].ymd;
          const to = nextWeekDays[nextWeekDays.length - 1].ymd; // <- use last day (index 13 for 14 days)
          const { data: postData } = await supabase
            .from("posts").select("*").gte("post_date", from).lte("post_date", to).order("post_date", { ascending: true });
          const postIds = (postData || []).map((p) => p.id);
          let varData = [];
          if (postIds.length) {
            const { data: vData } = await supabase
              .from("postvariations")
              .select(`
                id,
                variation_post_date,
                post_id,
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
              .in("post_id", postIds);
            varData = vData || [];
          }
          setNextWeekPosts(postData || []);
          setNextWeekVariations(varData);
        }
    } catch (e) {
      console.error("refreshWeekData failed", e);
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        // --- Current Week ---
        const start = startOfWeekMonday(new Date());
        const end = addDays(start, 6);
        const from = toYMD(start);
        const to = toYMD(end);
  
        const days = [];
        for (let i = 0; i < 7; i++) {
          const date = addDays(start, i);
          days.push({ date, ymd: toYMD(date) });
        }
        setWeekDays(days);
  
        const { data: artistData } = await supabase.from("artists").select("id,name");
        const map = new Map(artistData.map((a) => [a.id, a.name]));
        setArtistMap(map);
  
        const { data: postData } = await supabase
          .from("posts")
          .select("*")
          .gte("post_date", from)
          .lte("post_date", to)
          .order("post_date", { ascending: true });
  
        const postIds = postData.map((p) => p.id);
        let varData = [];
        if (postIds.length > 0) {
          const { data: vData } = await supabase
            .from("postvariations")
            .select(`
              id,
              variation_post_date,
              post_id,
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
            .in("post_id", postIds);
          varData = vData;
        }
  
        setPosts(postData);
        setVariations(varData);
  
          // --- Next 2 Weeks (after this week) ---
          const nextStart = addDays(start, 7);
          const nextEnd = addDays(nextStart, 13); // 14 days = 2 weeks
          const nextFrom = toYMD(nextStart);
          const nextTo = toYMD(nextEnd);
  
          const nextDays = [];
          for (let i = 0; i < 14; i++) {
            const date = addDays(nextStart, i);
            nextDays.push({ date, ymd: toYMD(date) });
          }
          setNextWeekDays(nextDays);
  
          const { data: nextPostData } = await supabase
            .from("posts")
            .select("*")
            .gte("post_date", nextFrom)
            .lte("post_date", nextTo)
            .order("post_date", { ascending: true });
  
          const nextPostIds = nextPostData.map((p) => p.id);
          let nextVarData = [];
          if (nextPostIds.length > 0) {
            const { data: vData } = await supabase
              .from("postvariations")
              .select(`
                id,
                variation_post_date,
                post_id,
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
              .in("post_id", postIds);
            nextVarData = vData;
          }
  
          setNextWeekPosts(nextPostData);
          setNextWeekVariations(nextVarData);
        
      } catch (err) {
        console.error(err);
        setError("Failed to load weekly posts");
      }
    };
    load();
  }, []);
  
  

  // Open modal + fetch details (post + variations) in two queries
async function openPostDetails(postId) {
  setSelectedPostId(postId)
  setPostLoading(true)
  setPostError('')
  setPostDetails(null)
   try {
    // 1) Fetch the post (use * to avoid column mismatches)
    const { data: post, error: postErr } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()
    if (postErr) throw postErr
     // 2) Fetch variations for that post (removed caption_a and caption_b)
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
      .order('test_version', { ascending: true })
      
     if (varErr) throw varErr
     setPostDetails({
      post,
      variations: variations || [],
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
  
  function closeModal() {
    setSelectedPostId(null);
    setPostDetails(null);
    refreshWeekData();
  }
  
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

async function updatePostStatus(newStatus) {
  if (!selectedPostId) return;
  setUpdatingStatus(true);
  setUpdateError('');
  try {
    const { error } = await supabase
      .from('posts')
      .update({ status: newStatus })
      .eq('id', selectedPostId);

    if (error) throw error;

    setPostDetails(prev => ({
      ...prev,
      post: { ...prev.post, status: newStatus }
    }));

    setPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, status: newStatus } : p));
    setNextWeekPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, status: newStatus } : p));

  } catch (error) {
    console.error('Error updating status:', error);
    setUpdateError('Failed to update status');
  } finally {
    setUpdatingStatus(false);
  }
}

async function updatePostDate(newDate) {
  if (!selectedPostId) return;
  try {
    const { error } = await supabase
      .from('posts')
      .update({ post_date: newDate })
      .eq('id', selectedPostId);

    if (error) throw error;

    setPostDetails(prev => ({
      ...prev,
      post: { ...prev.post, post_date: newDate }
    }));

    refreshWeekData();
  } catch (error) {
    console.error('Error updating date:', error);
    setUpdateError('Failed to update date');
  }
}

  async function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
  
    const sourceDate = source.droppableId;
    const destDate = destination.droppableId;
    if (sourceDate === destDate) return;
  
    const movedPostId = parseInt(draggableId.replace(/\D/g, ""), 10);
    if (isNaN(movedPostId)) return;
  
    try {
      const { error } = await supabase
        .from("posts")
        .update({ post_date: destDate })
        .eq("id", movedPostId);
  
      if (error) throw error;
  
      // 🔹 Update both arrays
      setPosts((prev) =>
        prev.map((p) =>
          p.id === movedPostId ? { ...p, post_date: destDate } : p
        )
      );
      setNextWeekPosts((prev) =>
        prev.map((p) =>
          p.id === movedPostId ? { ...p, post_date: destDate } : p
        )
      );
    } catch (err) {
      console.error("Error updating post date:", err);
      alert("Could not save new date. See console for details.");
    }
  }
  
  

  return (
    <div className="p-6">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
          <Link href="/dashboard/calendar">
            <button className="px-4 py-2 bg-[#a89ee4] rounded hover:bg-[#bfb7f2] shadow-md">
              Back to Calendar
            </button>
          </Link>

          <button
            onClick={() => setShowNextWeek(!showNextWeek)}
            className="px-4 py-2 bg-[#a89ee4] rounded hover:bg-[#bfb7f2] shadow-md"
          >
            {showNextWeek ? "Hide Coming Weeks" : "Show Coming Weeks"}
          </button>

          {/* Menu bubble – same style as calendar, purple */}
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
                p-3
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
                  bg-[#a89ee4]
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
                          bg-[#dcd4fa]
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

      <h1 className="text-2xl font-bold mb-4">This Week’s Posts</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* Calendar grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 border-b">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-3 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weekDays.map((day) => (
              <Droppable droppableId={day.ymd} key={day.ymd} type="POST">
                {(dropProvided) => (
                  <div
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                    className="min-h-[140px] border-l first:border-l-0 p-2"
                    style={{
                      backgroundColor:
                        day.date.toDateString() === new Date().toDateString()
                          ? "#eef8ea"
                          : "transparent",
                    }}
                  >
                    <div className="text-xs text-gray-500 mb-1">
                      {day.date.toLocaleDateString(undefined, { weekday: "short" })}{" "}
                      -{" "}
                      {day.date.getDate().toString().padStart(2, "0")}/
                      {(day.date.getMonth() + 1).toString().padStart(2, "0")}
                    </div>
                    <div className="space-y-1">
                    {[...posts
                        .filter((p) => toYMD(new Date(p.post_date)) === day.ymd)
                        .map((p) => ({ type: "post", data: p })),
                        ...variations
                        .filter((v) => toYMD(new Date(v.variation_post_date)) === day.ymd)
                        .map((v) => ({ type: "var", data: v }))
                      ].map((item, index) => {
                        if (item.type === "post") {
                          const post = item.data;
                        
                          // 🔹 Variations for this post (used for bubbles)
                          const postVariations = variations.filter((v) => v.post_id === post.id);

                          // 🔹 Count how many variations for this post have feedback
                          const feedbackCount = postVariations.filter(
                            (v) =>
                              v.feedback &&
                              v.feedback.trim() !== "" &&
                              !v.feedback_resolved
                          ).length;

                          // Count how many variations for this post have been greenlit
                          const greenlitCount = postVariations.filter((v) => v.greenlight === true || v.greenlight === 'true').length;
                        
                          return (
                            <Draggable
                              key={`post-${post.id}`}
                              draggableId={`post-${post.id}`}
                              index={index}
                            >
                              {(dragProvided) => (
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
                                  {/* Post name + artist */}
                                  {post.post_name} — {artistMap.get(post.artist_id)}
                        
                                  {/* 🔔 Notification bubble (feedback / greenlight) */}
                                  {postVariations.length > 0 && (() => {
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
                                          "absolute -top-1 -right-1",
                                          bgClass,
                                          "text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center",
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
                                </div>
                              )}
                            </Draggable>
                          );
                        }
                         else {
                          const v = item.data;
                          const parent = posts.find((p) => p.id === v.post_id);
                          return (
                            <Draggable
                              key={`var-${v.id}`}
                              draggableId={`var-${v.id}`}
                              index={index}
                            >
                              {(dragProvided) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className="text-xs px-2 py-1 rounded cursor-pointer bg-[#dcd9f4] border border-gray-300"
                                  style={dragProvided.draggableProps.style}
                                  onClick={() => openPostDetails(v.post_id)}
                                >
                                  {parent?.post_name} (var)
                                </div>
                              )}
                            </Draggable>
                          );
                        }
                      })}

                      {dropProvided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>
    
        {showNextWeek && nextWeekDays.length >= 14 && (
        <div className="mt-10 space-y-8">
          {/* Heading only */}
          <h2 className="text-xl font-semibold">Next 2 Weeks</h2>

          {/* Week 1 */}
          <div>
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 border-b">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="px-3 py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {nextWeekDays.slice(0, 7).map((day) => (
                  <Droppable droppableId={day.ymd} key={day.ymd} type="POST">
                    {(dropProvided) => (
                      <div
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                        className="min-h-[140px] border-l first:border-l-0 p-2"
                      >
                        {/* Date only: DD Mon */}
                        <div className="text-xs text-gray-500 mb-1">
                          {day.date.toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                        <div className="space-y-1">
                          {nextWeekPosts
                            .filter(
                              (p) => toYMD(new Date(p.post_date)) === day.ymd
                            )
                            .map((post, index) => {
                              // 🔹 ALL variations for this post (not filtered by date)
                              const postVariations = nextWeekVariations.filter((v) => v.post_id === post.id);

                              // 🔹 Count unresolved feedback
                              const feedbackCount = postVariations.filter(
                                (v) =>
                                  v.feedback &&
                                  v.feedback.trim() !== "" &&
                                  !v.feedback_resolved
                              ).length;

                              // 🔹 Count greenlit variations
                              const greenlitCount = postVariations.filter(
                                (v) => v.greenlight === true || v.greenlight === 'true'
                              ).length;

                              return (
                                <Draggable
                                  key={`post-${post.id}`}
                                  draggableId={`post-${post.id}`}
                                  index={index}
                                >
                                  {(dragProvided) => (
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
                                      {post.post_name} – {artistMap.get(post.artist_id)}
                                      
                                      {/* 🔔 Notification bubble */}
                                      {postVariations.length > 0 && (() => {
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
                                              "absolute -top-1 -right-1",
                                              bgClass,
                                              "text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center",
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
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}

                          {nextWeekVariations
                            .filter(
                              (v) =>
                                toYMD(new Date(v.variation_post_date)) === day.ymd
                            )
                            .map((v, vIndex) => {
                              const parent = nextWeekPosts.find(
                                (p) => p.id === v.post_id
                              );
                              return (
                                <Draggable
                                  key={`var-${v.id}`}
                                  draggableId={`var-${v.id}`}
                                  index={nextWeekPosts.length + vIndex}
                                >
                                  {(dragProvided) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className="text-xs px-2 py-1 rounded cursor-pointer bg-[#dcd9f4] border border-gray-300"
                                      style={dragProvided.draggableProps.style}
                                      onClick={() =>
                                        openPostDetails(v.post_id)
                                      }
                                    >
                                      {parent?.post_name} (var)
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                          {dropProvided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </div>
          </div>

          {/* Week 2 */}
          <div>
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 border-b">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="px-3 py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {nextWeekDays.slice(7, 14).map((day) => (
                  <Droppable droppableId={day.ymd} key={day.ymd} type="POST">
                    {(dropProvided) => (
                      <div
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                        className="min-h-[140px] border-l first:border-l-0 p-2"
                      >
                        {/* Date only: DD Mon */}
                        <div className="text-xs text-gray-500 mb-1">
                          {day.date.toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                        <div className="space-y-1">
                          {nextWeekPosts
                            .filter(
                              (p) => toYMD(new Date(p.post_date)) === day.ymd
                            )
                            .map((post, index) => {
                              // 🔹 ALL variations for this post (not filtered by date)
                              const postVariations = nextWeekVariations.filter((v) => v.post_id === post.id);

                              // 🔹 Count unresolved feedback
                              const feedbackCount = postVariations.filter(
                                (v) =>
                                  v.feedback &&
                                  v.feedback.trim() !== "" &&
                                  !v.feedback_resolved
                              ).length;

                              // 🔹 Count greenlit variations
                              const greenlitCount = postVariations.filter(
                                (v) => v.greenlight === true || v.greenlight === 'true'
                              ).length;

                              return (
                                <Draggable
                                  key={`post-${post.id}`}
                                  draggableId={`post-${post.id}`}
                                  index={index}
                                >
                                  {(dragProvided) => (
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
                                      {post.post_name} – {artistMap.get(post.artist_id)}
                                      
                                      {/* 🔔 Notification bubble */}
                                      {postVariations.length > 0 && (() => {
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
                                              "absolute -top-1 -right-1",
                                              bgClass,
                                              "text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center",
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
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}

                          {nextWeekVariations
                            .filter(
                              (v) =>
                                toYMD(new Date(v.variation_post_date)) === day.ymd
                            )
                            .map((v, vIndex) => {
                              const parent = nextWeekPosts.find(
                                (p) => p.id === v.post_id
                              );
                              return (
                                <Draggable
                                  key={`var-${v.id}`}
                                  draggableId={`var-${v.id}`}
                                  index={nextWeekPosts.length + vIndex}
                                >
                                  {(dragProvided) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className="text-xs px-2 py-1 rounded cursor-pointer bg-[#dcd9f4] border border-gray-300"
                                      style={dragProvided.draggableProps.style}
                                      onClick={() =>
                                        openPostDetails(v.post_id)
                                      }
                                    >
                                      {parent?.post_name} (var)
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                          {dropProvided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
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
                            {v.test_version || "—"} •{" "}
                            <span className={v.greenlight ? "text-green-600 font-medium" : "text-gray-500"}>
                              {v.greenlight ? "Greenlit" : "Not Greenlit"}
                            </span>
                          </div>

                          {/* Download icon button */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
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

      {showCaptions && (
        <CaptionsModal
          captions={postDetails?.captions || {}}
          onClose={() => setShowCaptions(false)}
          onSave={async (newCaptions) => {
            try {
              const { error } = await supabase
                .from("posts")
                .update({
                  caption_a: newCaptions.a,
                  caption_b: newCaptions.b,
                })
                .eq("id", selectedPostId);
          
              if (error) throw error;
          
              // Update local state so UI matches
              setPostDetails((prev) => ({
                ...prev,
                captions: newCaptions,
                post: {
                  ...prev.post,
                  caption_a: newCaptions.a,
                  caption_b: newCaptions.b,
                },
              }));
          
              setShowCaptions(false);
            } catch (err) {
              console.error("Failed to save captions:", err);
              alert("Could not save captions — see console for details.");
            }
          }}
          
        />
      )}

      {showSocialLinksModal && postDetails?.post && (
        <SocialLinksModal
          post={postDetails.post}
          onClose={() => setShowSocialLinksModal(false)}
          onSaved={() => {
            // Close modal and refresh this post's details so URLs are up to date
            setShowSocialLinksModal(false);
            if (selectedPostId) {
              openPostDetails(selectedPostId);
            }
          }}
        />
      )}

      {showMediaPlayer && selectedVariation && (
        <MediaPlayer
          variation={selectedVariation}
          onClose={() => setShowMediaPlayer(false)}
          onRefreshPost={refreshWeekData}
        />
      )}

      {showUploadModal && postDetails && (
        <UploadModal
          postId={postDetails.post.id}
          artistId={postDetails.post.artist_id}
          defaultDate={postDetails.post.post_date}
          onClose={() => setShowUploadModal(false)}
          onSave={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}
