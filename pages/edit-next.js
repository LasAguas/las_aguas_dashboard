"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

// --- helpers (copied pattern from menu.js) ---
const pad = (n) => String(n).padStart(2, "0");
const toYMD = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const stripTime = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const PLATFORM_OPTIONS = [
    { value: 'Instagram',   label: 'Instagram',   short: 'IG' },
    { value: 'TikTok',      label: 'TikTok',      short: 'TT' },
    { value: 'YouTube',     label: 'YouTube',     short: 'YT' },
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

// Spreadsheet-driven value table
// Rows: status; Columns: days-from-now buckets
// Only buckets with numbers in the sheet are included; "Not relevant" => ignored
const STATUS_VALUE_TABLE = {
  "not planned": {
    "0-2": 1,
    "3-4": 2,
    "5-8": 4,
    "9-14": 9,
    "15-21": 12,
  },
  planned: {
    "0-2": 2,
    "3-4": 3,
    "5-8": 5,
    "9-14": 10,
    "15-21": 13,
  },
  "assets obtained": {
    "0-2": 6,
    "3-4": 7,
    "5-8": 8,
    "9-14": 11,
    "15-21": 14,
  },
  // uploaded / ready / posted => all "Not relevant" in the sheet
};

function getBucketKey(daysFromNow) {
  // Treat overdue posts as 0 days away (0–2 bucket)
  const d = daysFromNow < 0 ? 0 : daysFromNow;

  if (d <= 2) return "0-2";
  if (d <= 4) return "3-4";
  if (d <= 8) return "5-8";
  if (d <= 14) return "9-14";
  if (d <= 21) return "15-21";
  // "more than 21 days from now" is "Not relevant" for every status in your table
  return null;
}

function computeBaseValue(post, today) {
  const statusKey = String(post.status || "").toLowerCase();
  const row = STATUS_VALUE_TABLE[statusKey];
  if (!row) return null;

  const postDate = stripTime(post.post_date);
  const msDiff = postDate.getTime() - today.getTime();
  const daysFromNow = Math.round(msDiff / (1000 * 60 * 60 * 24));

  const bucket = getBucketKey(daysFromNow);
  if (!bucket) return null;

  const v = row[bucket];
  if (typeof v !== "number") return null;
  return v;
}

function MediaPlayer({ variation, onClose, onRefreshPost, onReplaceRequested, onPlatformsUpdated }) {
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

  // 🔊 snippet state for THIS player
  const [snippetStart, setSnippetStart] = useState(
    typeof variation?.audio_start_seconds === "number"
      ? variation.audio_start_seconds
      : 0
  );
  const [savingSnippet, setSavingSnippet] = useState(false);
  const [snippetDuration, setSnippetDuration] = useState(15); // seconds, for preview only

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

    const paths =
      Array.isArray(variation.carousel_files) && variation.carousel_files.length > 0
        ? variation.carousel_files
        : variation.file_name
        ? [variation.file_name]
        : [];

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

  const isImage = activeUrl ? /\.(jpe?g|png|gif|webp)$/i.test(activeUrl) : false;
  const isVideo = activeUrl ? /\.(mp4|mov|webm|ogg)$/i.test(activeUrl) : false;

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
                  {isImage && (
                    <img
                      src={activeUrl}
                      alt={variation.file_name}
                      className="max-h-[70vh] max-w-full object-contain"
                    />
                  )}
                  {isVideo && (
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


                  {!isImage && !isVideo && (
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
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleDelete}
                className="flex-1 bg-gray-200 text-black py-2 rounded hover:bg-gray-300 transition-colors text-sm"
              >
                Delete Variation
              </button>
              <button
                onClick={() =>
                  onReplaceRequested && onReplaceRequested(variation)
                }
                className="flex-1 bg-gray-200 text-black py-2 rounded hover:bg-gray-300 transition-colors text-sm"
              >
                Replace Variation
              </button>
              <button
                onClick={toggleResolve}
                disabled={saving || !variation.feedback}
                className={`flex-1 py-2 rounded text-white transition-colors text-sm ${
                  localResolved
                    ? "bg-gray-500 hover:bg-gray-600"
                    : "bg-green-600 hover:bg-green-700"
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

  const handleFileChange = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) {
      setFile(null);
      setExtraFiles([]);
      return;
    }
  
    const first = files[0];
    const baseType = first.type.split("/")[0]; // "image" or "video"
  
    // Disallow mixing images and videos
    if (files.some((f) => f.type.split("/")[0] !== baseType)) {
      alert("Please select only images OR only a single video.");
      setFile(null);
      setExtraFiles([]);
      return;
    }
  
    // Only one video allowed
    if (baseType === "video" && files.length > 1) {
      alert("Video variations support a single file only.");
      setFile(first);
      setExtraFiles([]);
      return;
    }
  
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
            accept="image/*,video/*"
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

export default function EditNextPage() {
    const [posts, setPosts] = useState([]);
    const [artistsById, setArtistsById] = useState({});
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [selectedArtistId, setSelectedArtistId] = useState(null); 

    const router = useRouter();
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updateError, setUpdateError] = useState("");

  // For post details + variations (like calendar Post Details modal)
    const [postDetails, setPostDetails] = useState(null); // { post, variations, captions? }
    const [postLoading, setPostLoading] = useState(false);
    const [postError, setPostError] = useState("");

    // For media player + upload modal
    const [showMediaPlayer, setShowMediaPlayer] = useState(false);
    const [selectedVariation, setSelectedVariation] = useState(null);

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadMode, setUploadMode] = useState("new"); // 'new' | 'replace'
    const [replaceVariation, setReplaceVariation] = useState(null);


  const navItems = [
    { href: "/calendar", label: "Calendar" },
    { href: "/edit-next", label: "Edit Next" },
    { href: "/leads", label: "Leads" },
    { href: "/stats-view", label: "Stats" },
    { href: "/audio-database", label: "Audio Database" },
    { href: "/menu", label: "Home" },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg("");

        const today = stripTime(new Date());
        const from = toYMD(today);

        // All upcoming posts from today onwards
        // (posted are ignored; "upcoming" = not posted)
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("id, post_name, post_date, status, artist_id")
          .gte("post_date", from)
          .neq("status", "posted")
          .order("post_date", { ascending: true });

        if (postsError) throw postsError;

        // Fetch artist names for labels
        const { data: artists, error: artistsError } = await supabase
          .from("artists")
          .select("id, name");

        if (artistsError) {
          console.error("Error loading artists:", artistsError);
        }

        const map = {};
        (artists || []).forEach((a) => {
          map[a.id] = a.name;
        });

        setArtistsById(map);
        setPosts(postsData || []);
      } catch (err) {
        console.error("Error loading queue:", err);
        setErrorMsg("Error loading upcoming posts.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const scoredPosts = useMemo(() => {
    if (!posts || posts.length === 0) return [];

    const today = stripTime(new Date());

    // 1) compute base values from the status/time table
    const withBase = posts
      .map((p) => {
        const baseValue = computeBaseValue(p, today);
        if (baseValue == null) return null;
        return { ...p, baseValue };
      })
      .filter(Boolean);

    if (withBase.length === 0) return [];

    // 2) normalise by "one divided by all the artists' upcoming posts' values summed together"
    const totalBase = withBase.reduce((sum, p) => sum + p.baseValue, 0);
    const factor = totalBase > 0 ? 1 / totalBase : 1;

    const withPriority = withBase.map((p) => ({
      ...p,
      priorityValue: p.baseValue * factor,
    }));

    // 3) smallest priorityValue = most important
    withPriority.sort((a, b) => {
      if (a.priorityValue !== b.priorityValue) {
        return a.priorityValue - b.priorityValue;
      }

      // tie-breaker 1: nearer date first
      const da = stripTime(a.post_date).getTime();
      const db = stripTime(b.post_date).getTime();
      if (da !== db) return da - db;

      // tie-breaker 2: alphabetical name
      const nameA = (a.post_name || "").toLowerCase();
      const nameB = (b.post_name || "").toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;

      // tie-breaker 3: id
      return a.id - b.id;
    });

    return withPriority;
  }, [posts]);

    async function loadPostDetails(postId) {
        if (!postId) return;
        setPostLoading(true);
        setPostError("");
        try {
        // 1) load post
        const { data: post, error: postErr } = await supabase
            .from("posts")
            .select("*")
            .eq("id", postId)
            .single();
    
        if (postErr) throw postErr;
    
        // 2) load variations
        const { data: variations, error: varErr } = await supabase
            .from("postvariations")
            .select("*")
            .eq("post_id", postId)
            .order("test_version", { ascending: true });
    
        if (varErr) throw varErr;
    
        setPostDetails({
            post,
            variations: variations || [],
            captions: {
            a: post.caption_a,
            b: post.caption_b,
            },
        });
        } catch (e) {
        console.error("Error loading post details:", e);
        setPostError("Could not load post details");
        } finally {
        setPostLoading(false);
        }
    }

    async function updatePostStatus(postId, newStatus) {
        if (!postId) return;
      
        setUpdatingStatus(true);
        setUpdateError("");
      
        try {
          const { error } = await supabase
            .from("posts")
            .update({ status: newStatus })
            .eq("id", postId);
      
          if (error) throw error;
      
          // Update modal details
          setPostDetails((prev) =>
            prev && prev.post?.id === postId
              ? { ...prev, post: { ...prev.post, status: newStatus } }
              : prev
          );
      
          // Update main table list
          setPosts((prev) =>
            (prev || []).map((p) =>
              p.id === postId ? { ...p, status: newStatus } : p
            )
          );
        } catch (err) {
          console.error("Error updating status:", err);
          setUpdateError("Failed to update status. See console for details.");
        } finally {
          setUpdatingStatus(false);
        }
      }
      
  
    function handleRowClick(post) {
        setSelectedPost(post);
        setSelectedPostId(post.id);
        setSelectedArtistId(post.artist_id || null);
        loadPostDetails(post.id);
      }

  const closeModal = () => {
    setSelectedPost(null);
  };

  const handleViewInCalendar = () => {
    if (!selectedPost) return;
    router.push(`/calendar?date=${selectedPost.post_date}`);
  };

  const statusPost = postDetails?.post || selectedPost;

  return (
    <div className="min-h-screen bg-[#a89ee4] flex justify-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4 p-4 md:p-8">
        {/* Collapsible left menu (same style as menu.js) */}
        <div className="md:w-64 md:shrink-0">
          <button
            className="md:hidden mb-2 px-3 py-1.5 text-sm rounded-full bg-[#bbe1ac] shadow"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? "Hide menu" : "Show menu"}
          </button>
          <aside
            className={`${
              menuOpen ? "block" : "hidden"
            } md:block bg-[#bbe1ac] rounded-2xl shadow-lg p-4`}
          >
            <h2 className="text-lg font-semibold mb-3">Menu</h2>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block w-full rounded-lg px-3 py-2 text-sm font-medium hover:bg-white hover:shadow ${
                      item.href === "/edit-next"
                        ? "bg-white"
                        : "bg-[#eef8ea]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-4">
          <section className="bg-[#bbe1ac] rounded-2xl shadow-lg p-4 md:p-6 flex-1">
            <h1 className="text-xl md:text-2xl font-bold mb-4">
              Edit Next Queue
            </h1>

            {errorMsg && (
              <div className="text-red-600 text-sm mb-3 bg-white/60 rounded px-3 py-2">
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div className="text-gray-700 text-sm">
                Calculating priorities…
              </div>
            ) : scoredPosts.length === 0 ? (
              <div className="text-sm text-gray-800 bg-[#eef8ea] rounded px-3 py-2">
                No upcoming posts that need editing based on your rules.
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-700 mb-3">
                  Priority is calculated from the status + days-from-now table,
                  then multiplied by{" "}
                  <span className="font-semibold">
                    1 / (sum of all upcoming posts&rsquo; values)
                  </span>
                  . The smallest value is the most important.
                </p>

                <ul className="space-y-2">
                  {scoredPosts.map((post, idx) => (
                    <li
                      key={post.id}
                      className="border rounded-md px-3 py-2 text-sm flex justify-between items-start bg-[#eef8ea] cursor-pointer hover:bg-white"
                      onClick={() => handleRowClick(post)}
                    >
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <span>
                            {post.post_name || "(Untitled post)"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-700">
                          {new Date(post.post_date).toLocaleDateString(
                            undefined,
                            {
                              weekday: "short",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                          {" • "}
                          Status:{" "}
                          <span className="font-semibold">
                            {post.status || "unknown"}
                          </span>
                          {" • "}
                          Artist:{" "}
                          <span className="font-semibold">
                            {artistsById[post.artist_id] || "unknown"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-700 pl-3">
                        <div className="font-semibold">
                          #{idx + 1} in queue
                        </div>
                        <div>
                          Base value:{" "}
                          <span className="font-mono">
                            {post.baseValue}
                          </span>
                        </div>
                        <div>
                          Priority:{" "}
                          <span className="font-mono">
                            {post.priorityValue.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        {/* Modal for clicked post (same pattern as menu.js) */}
        {selectedPost && (
            <div
                className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                onClick={closeModal}
            >
                <div
                className="bg-white rounded-lg shadow-lg max-w-[90vw] w-full p-6"
                onClick={(e) => e.stopPropagation()}
                >
                {/* Header row matching calendar Post Details modal */}
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold">Post Details</h2>
                    <button
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700"
                    >
                    ✕
                    </button>
                </div>

                {/* Post title, same data you already showed */}
                <div className="text-lg font-semibold mb-2">
                    {selectedPost.post_name || "(Untitled post)"}
                </div>

                {/* Existing body content from your original modal */}
                <p className="text-sm text-gray-700 mb-1">
                    <strong>Date:</strong>{" "}
                    {new Date(selectedPost.post_date).toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    })}
                </p>
                {selectedPost.artist_id && artistsById[selectedPost.artist_id] && (
                    <p className="text-sm text-gray-700 mb-1">
                    <strong>Artist:</strong>{" "}
                    {artistsById[selectedPost.artist_id]}
                    </p>
                )}
                {statusPost && (
                <div className="mt-3 mb-5">
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    disabled={updatingStatus}
                    value={statusPost.status || "not planned"}
                    onChange={(e) =>
                        updatePostStatus(statusPost.id, e.target.value)
                    }
                    >
                    {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                        {s}
                        </option>
                    ))}
                    </select>

                    {updatingStatus && (
                    <p className="mt-1 text-xs text-gray-500">Saving…</p>
                    )}
                    {updateError && (
                    <p className="mt-1 text-xs text-red-600">{updateError}</p>
                    )}
                </div>
                )}
                {/* Errors / loading for post details */}
                {postLoading && (
                <div className="text-xs text-gray-500 mb-2">Loading variations…</div>
                )}
                {postError && (
                <div className="text-xs text-red-600 mb-2">{postError}</div>
                )}

                {/* Variations list */}
                {postDetails && (
                <>
                    {postDetails.post?.notes && (
                    <p className="mb-4 text-sm text-gray-700">
                        <strong>Notes:</strong> {postDetails.post.notes}
                    </p>
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
                                <span className="font-medium">
                                {(v.platforms && v.platforms.length
                                    ? v.platforms
                                    : ["—"]
                                ).join(", ")}
                                </span>{" "}
                                — {v.test_version || "—"}
                            </div>

                            {/* Download button from calendar.js */}
                            {/* copy the same download button block from calendar here */}
                            </div>

                            {/* Clickable file info that opens the media player */}
                            <div
                            className="text-xs text-gray-600 cursor-pointer mt-1"
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
                        <li className="text-sm text-gray-500">
                        No variations yet. Use “New Variation” to upload one.
                        </li>
                    )}
                    </ul>

                    <div className="text-right mt-4 flex justify-end gap-2">
                    <button
                        onClick={() => {
                        setUploadMode("new");
                        setReplaceVariation(null);
                        setShowUploadModal(true);
                        }}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    >
                        New Variation
                    </button>
                    <button
                        onClick={closeModal}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleViewInCalendar}
                        className="px-3 py-1.5 text-sm bg-[#bbe1ac] rounded hover:opacity-90"
                    >
                        View in Calendar
                    </button>
                    </div>
                </>
                )}

                </div>
            </div>
            )}

      </div>
        {/* Media player modal */}
        {showMediaPlayer && selectedVariation && (
        <MediaPlayer
            variation={selectedVariation}
            onClose={() => setShowMediaPlayer(false)}
            onRefreshPost={() => {
            if (selectedPostId) loadPostDetails(selectedPostId);
            }}
            onReplaceRequested={(variation) => {
            setUploadMode("replace");
            setReplaceVariation(variation);
            setShowMediaPlayer(false);
            setShowUploadModal(true);
            }}
            onPlatformsUpdated={(variationId, nextPlatforms) => {
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
            }}
        />
        )}

        {/* Upload modal */}
        {showUploadModal && selectedPost && (
        <UploadModal
            postId={selectedPost.id}
            artistId={selectedPost.artist_id}
            defaultDate={selectedPost.post_date}
            mode={uploadMode}
            variation={replaceVariation}
            onClose={() => setShowUploadModal(false)}
            onSave={() => {
            setShowUploadModal(false);
            if (selectedPostId) loadPostDetails(selectedPostId);
            }}
        />
        )}


    </div>
  );
}
