"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import TeamLayout from "../../components/team/TeamLayout";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- helpers ---
const pad = (n) => String(n).padStart(2, "0");
const toYMD = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const stripTime = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

const PLATFORM_OPTIONS = [
  { value: "Instagram",   label: "Instagram",   short: "IG" },
  { value: "TikTok",      label: "TikTok",      short: "TT" },
  { value: "YouTube",     label: "YouTube",     short: "YT" },
  { value: "Mailing List", label: "Mailing List", short: "ML" },
];

const STATUS_OPTIONS = [
  "not planned",
  "planned",
  "assets obtained",
  "uploaded",
  "ready",
  "posted",
];

// Higher number = more "ready"
const STATUS_ORDER = {
    idea: 0,
    draft: 1,
    "in progress": 2,
    scheduled: 3,
    ready: 4,
  };

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday -> 7
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Media Player Function
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

  // Text-only editing
  const [editableText, setEditableText] = useState(variation?.notes || '');
  const [savingText, setSavingText] = useState(false);

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
  const isTextOnly = Boolean(variation.text_only);

  async function handleSaveText() {
    if (!variation?.id || savingText) return;
    setSavingText(true);
    const { error } = await supabase
      .from("postvariations")
      .update({ notes: editableText })
      .eq("id", variation.id);
    setSavingText(false);
    if (error) {
      console.error(error);
      alert("Could not save text content.");
      return;
    }
    variation.notes = editableText;
  }

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
            {isTextOnly ? (
              <div className="bg-gray-50 rounded-lg border p-4 min-h-[300px] flex flex-col">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Text Content (Mailing List)
                </div>
                <textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  className="flex-1 w-full border rounded p-3 text-sm min-h-[250px] resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={savingText}
                />
                <button
                  onClick={handleSaveText}
                  disabled={savingText || editableText === (variation.notes || '')}
                  className="mt-2 self-end px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                  style={{ backgroundColor: "#a89ee4", color: "#33296b" }}
                >
                  {savingText ? 'Saving…' : 'Save text'}
                </button>
              </div>
            ) : (
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
            )}
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

            {/* Audio snippet — hidden for text-only */}
            {audioUrl && !isTextOnly && (
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

// Make filenames safe for Supabase Storage keys
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
  const [textOnly, setTextOnly] = useState(false);

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
    if (textOnly) {
      if (!notes.trim()) { alert('Please enter text content.'); return; }
      if (mode !== 'replace' && (!platforms || platforms.length === 0)) { alert('Please select at least one platform.'); return; }
      setUploading(true);
      try {
        if (mode === 'replace' && variation) {
          const { error: updateError } = await supabase
            .from('postvariations')
            .update({ text_only: true, file_name: null, notes, carousel_files: null, audio_file_name: null, length_seconds: null, ...(platforms && platforms.length ? { platforms } : {}) })
            .eq('id', variation.id);
          if (updateError) throw updateError;
        } else {
          const { data: existingVars, error: tvError } = await supabase.from('postvariations').select('test_version').eq('post_id', postId).order('test_version', { ascending: true });
          if (tvError) throw tvError;
          let nextVersion = 'A';
          if (existingVars && existingVars.length > 0) { const lastVersion = existingVars[existingVars.length - 1].test_version || 'A'; nextVersion = String.fromCharCode(lastVersion.charCodeAt(0) + 1); }
          const { error: insertError } = await supabase.from('postvariations').insert([{ post_id: postId, platforms, file_name: null, text_only: true, test_version: nextVersion, variation_post_date: variationDate, notes }]);
          if (insertError) throw insertError;
        }
        onSave();
      } catch (err) { console.error('Upload error:', err); alert('Failed to save text variation. See console.'); }
      finally { setUploading(false); }
      return;
    }

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
            text_only: false,
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
            text_only: false,
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

        {/* Text-only toggle */}
        {mode !== 'replace' && (
          <div className="mb-4">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={textOnly}
                onChange={(e) => {
                  setTextOnly(e.target.checked);
                  if (e.target.checked) { setFile(null); setExtraFiles([]); setSelectedAudioId(null); setAudioPreviewUrl(null); }
                }}
                disabled={uploading}
              />
              <span className="font-medium">Text Only (mailing list)</span>
            </label>
          </div>
        )}

        {/* File upload — hidden when text-only */}
        {!textOnly && (
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
        )}

        {/* Audio library selection + snippet controls — hidden when text-only */}
        {!textOnly && (
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
        )}


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

        {/* Notes / Text Content */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            {textOnly ? 'Text Content' : 'Notes'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={textOnly ? 8 : 3}
            className="w-full border rounded p-2 text-sm"
            placeholder={textOnly ? 'Enter the mailing list text content…' : ''}
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

export default function MenuPage() {
  // Posts that need edits (your existing notifications)
  const [notifications, setNotifications] = useState([]);

  // NEW: feedback notifications (per post)
  const [feedbackByPostId, setFeedbackByPostId] = useState(new Map());

  // NEW: ad leads notifications + modal
  const [leadNotifications, setLeadNotifications] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);

  const [artistsById, setArtistsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [postDetails, setPostDetails] = useState(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState("");

  // NEW: media player + upload modal
  const [showMediaPlayer, setShowMediaPlayer] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState("new"); // 'new' | 'replace'
  const [replaceVariation, setReplaceVariation] = useState(null);

  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedArtistId, setSelectedArtistId] = useState(null);

  const router = useRouter();

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
  
      // Update the modal details
      setPostDetails((prev) =>
        prev && prev.post?.id === postId
          ? { ...prev, post: { ...prev.post, status: newStatus } }
          : prev
      );
  
      // Update the notifications list shown in the menu cards
      setNotifications((prev) =>
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

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg("");

        // --- date range: remaining days of this week + full next week (Mon-Sun) ---
        const today = new Date();
        const weekStart = startOfWeekMonday(today);

        const thisWeekEnd = new Date(weekStart);
        thisWeekEnd.setDate(weekStart.getDate() + 6); // Monday -> Sunday

        const nextWeekEnd = new Date(weekStart);
        nextWeekEnd.setDate(weekStart.getDate() + 13); // end of next week

        const from = toYMD(today);        // remaining days of current week (today → end)
        const to = toYMD(nextWeekEnd);    // end of next week

        // --- load posts not marked as "ready" ---
        const { data: posts, error } = await supabase
        .from("posts")
        .select("id, post_name, post_date, status, artist_id")
        .gte("post_date", from)
        .lte("post_date", to)
        .neq("status", "posted")
        .neq("status", "ready")
        .order("post_date", { ascending: true });

        if (error) throw error;

        // --- load artists just for labels ---
        const { data: artists, error: artistError } = await supabase
        .from("artists")
        .select("id, name");

        if (artistError) {
        console.error("Error loading artists:", artistError);
        }

        const map = {};
        (artists || []).forEach((a) => {
          map[a.id] = a.name;
        });

        // Filter out Lemon Eye posts from notifications
        const lemonEyeArtistIds = new Set(
          (artists || [])
            .filter((a) => String(a.name || "").trim().toLowerCase() === "lemon eye")
            .map((a) => a.id)
        );

        const filteredPosts = (posts || []).filter(
          (p) => !lemonEyeArtistIds.has(p.artist_id)
        );

        setArtistsById(map);
        setNotifications(filteredPosts);


        // -----------------------------
        // NEW: feedback notifications
        // “If there is feedback on any upcoming posts”
        // (count unresolved feedback across postvariations)
        // -----------------------------
        try {
        const postIds = (posts || []).map((p) => p.id).filter(Boolean);

        if (postIds.length) {
          const { data: vars, error: varErr } = await supabase
            .from("postvariations")
            .select("id, post_id, feedback, feedback_resolved")
            .in("post_id", postIds);

          if (varErr) throw varErr;

          const fbMap = new Map();
          (vars || []).forEach((v) => {
            const hasFeedback =
              v.feedback && String(v.feedback).trim() !== "" && !v.feedback_resolved;
            if (!hasFeedback) return;
            fbMap.set(v.post_id, (fbMap.get(v.post_id) || 0) + 1);
          });

          setFeedbackByPostId(fbMap);
        } else {
          setFeedbackByPostId(new Map());
        }
        } catch (e) {
        console.error("Error loading feedback notifications:", e);
        setFeedbackByPostId(new Map());
        }

        // -----------------------------
        // NEW: ad leads notifications (EN + ES)
        // Show bubbles for unanswered leads, with priority ranking rules
        // -----------------------------
        try {
          const { data: enLeads, error: enErr } = await supabase
          .from("ad_leads_en")
          .select("*")
          .or("answered.is.null,answered.eq.false");
        
        if (enErr) throw enErr;
        
        const { data: esLeads, error: esErr } = await supabase
          .from("ad_leads_es")
          .select("*")
          .or("answered.is.null,answered.eq.false");
        
        if (esErr) throw esErr;
        
        const normalizeLead = (row, sourceTable) => ({
          ...row,
          __sourceTable: sourceTable, // "ad_leads_en" | "ad_leads_es"
        });
        
        const allLeads = [
          ...(enLeads || []).map((r) => normalizeLead(r, "ad_leads_en")),
          ...(esLeads || []).map((r) => normalizeLead(r, "ad_leads_es")),
        ];

        console.log("Lead counts:", {
          en: enLeads?.length,
          es: esLeads?.length,
          total: allLeads.length,
        });   

        const budgetTierScore = (tier) => {
          // Higher = more important. Tries to handle numeric tiers or strings.
          if (tier == null) return 0;
          const n = Number(tier);
          if (!Number.isNaN(n)) return n;

          const s = String(tier).toLowerCase();
          // crude fallback ordering if tiers are words
          if (s.includes("high")) return 3;
          if (s.includes("mid")) return 2;
          if (s.includes("low")) return 1;
          return 0;
        };

        allLeads.sort((a, b) => {
          // 1) reached out date: earlier = more important
          const da = new Date(a.created_at).getTime();
          const db = new Date(b.created_at).getTime();
          if (da !== db) return da - db;

          // 2) budget tier: higher = more important
          const ba = budgetTierScore(a.budget_tier);
          const bb = budgetTierScore(b.budget_tier);
          if (ba !== bb) return bb - ba;

          // 3) release date: earlier = more important
          const ra = a.ideal_release_date ? new Date(a.ideal_release_date).getTime() : Infinity;
          const rb = b.ideal_release_date ? new Date(b.ideal_release_date).getTime() : Infinity;
          return ra - rb;
        });

        setLeadNotifications(allLeads);
        } catch (e) {
        console.error("Error loading lead notifications:", e);
        setLeadNotifications([]);
        }

      } catch (err) {
        console.error("Error loading notifications:", err);
        setErrorMsg("Error loading notifications.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const limitedNotifications = useMemo(() => {
    if (!notifications || notifications.length === 0) return [];

    const scoreStatus = (status) => {
      if (!status) return 0;
      const key = String(status).toLowerCase();
      return STATUS_ORDER[key] ?? 0;
    };

    const sorted = [...notifications].sort((a, b) => {
      const da = stripTime(a.post_date);
      const db = stripTime(b.post_date);

      // 1) closest date first
      if (da.getTime() !== db.getTime()) {
        return da - db;
      }

      // 2) more "ready" status first (higher score)
      const sa = scoreStatus(a.status);
      const sb = scoreStatus(b.status);
      if (sa !== sb) {
        return sb - sa;
      }

      // 3) alphabetical by post_name
      const nameA = (a.post_name || "").toLowerCase();
      const nameB = (b.post_name || "").toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    // Only keep the 7 closest posts
    return sorted.slice(0, 7);
  }, [notifications]);

  const grouped = useMemo(() => {
    // Work with *dates only* (no time component) to avoid timezone issues
    const today = stripTime(new Date());
    const weekStart = startOfWeekMonday(today); // already strips time internally
    const thisWeekEnd = new Date(weekStart);
    thisWeekEnd.setDate(weekStart.getDate() + 6); // Monday → Sunday
    thisWeekEnd.setHours(0, 0, 0, 0);
  
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(weekStart.getDate() + 7);
    nextWeekStart.setHours(0, 0, 0, 0);
  
    const currentWeek = [];
    const nextWeek = [];
  
    for (const post of limitedNotifications) {
      const d = stripTime(post.post_date); // normalise post_date as well
  
      if (d >= today && d <= thisWeekEnd) {
        currentWeek.push(post);
      } else if (d >= nextWeekStart) {
        nextWeek.push(post);
      }
    }
  
    return { currentWeek, nextWeek };
  }, [limitedNotifications]);
  
  const handleNotificationClick = (post) => {
    setSelectedPost(post);
    setSelectedPostId(post.id);
    setSelectedArtistId(post.artist_id || null);
    loadPostDetails(post.id);
  };

  const closeModal = () => {
    setSelectedPost(null);
  };

  const handleViewInCalendar = () => {
    if (!selectedPost) return;
    if (!selectedPost.artist_id) {
      router.push(`/dashboard/calendar?date=${selectedPost.post_date}`);
      return;
    }
  
    router.push(
      `/dashboard/calendar?artist=${selectedPost.artist_id}&date=${selectedPost.post_date}`
    );
  };
  
  const statusPost = postDetails?.post || selectedPost;

  return (
    <TeamLayout title="Home">
        <div className="flex flex-col gap-4">
          {/* Notifications section (main content) */}
          <section className="bg-[#bbe1ac] rounded-2xl shadow-lg p-4 md:p-6 flex-1">
            <h1 className="text-xl md:text-2xl font-bold mb-4">Notifications</h1>

            {errorMsg && (
              <div className="text-red-600 text-sm mb-3 bg-white/60 rounded px-3 py-2">
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div className="text-gray-700 text-sm">Loading notifications…</div>
            ) : (
              <>
                {/* NEW: Leads notifications (highest priority) */}
                {leadNotifications?.length > 0 && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Leads</h2>
                      <span className="text-xs text-gray-600">
                        Unanswered: {leadNotifications.length}
                      </span>
                    </div>

                    <ul className="mt-3 space-y-2">
                      {leadNotifications.slice(0, 7).map((lead) => (
                        <li
                          key={`${lead.__sourceTable}-${lead.id}`}
                          className="border rounded-md px-3 py-2 text-sm flex justify-between items-start bg-[#eef8ea] cursor-pointer hover:bg-white"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <div className="min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              <span className="truncate">
                                {lead.lead_type || "Lead"}
                              </span>
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                {new Date(lead.created_at).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                              </span>
                            </div>

                            <div className="text-xs text-gray-700">
                              {lead.email ? `Email: ${lead.email}` : ""}
                              {lead.budget_tier ? ` • Budget tier: ${lead.budget_tier}` : ""}
                              {lead.ideal_release_date
                                ? ` • Release: ${new Date(lead.ideal_release_date).toLocaleDateString()}`
                                : ""}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Remaining days of this week */}
                <div className="mb-6">
                  <h2 className="font-semibold mb-2 text-sm uppercase tracking-wide text-gray-800">
                    Remaining This Week
                  </h2>
                  {grouped.currentWeek.length === 0 ? (
                    <div className="text-xs text-gray-700 bg-[#eef8ea] rounded px-3 py-2">
                      No posts pending this week 🎉
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {grouped.currentWeek.map((post) => {
                        const fbCount = feedbackByPostId.get(post.id) || 0;

                        return (
                          <li
                            key={post.id}
                            className="border rounded-md px-3 py-2 text-sm flex justify-between items-start bg-[#eef8ea] cursor-pointer hover:bg-white"
                            onClick={() => handleNotificationClick(post)}
                          >
                            <div className="min-w-0">
                              <div className="font-medium flex items-center gap-2">
                                <span className="truncate">{post.post_name || "(Untitled post)"}</span>

                                {/* NEW: feedback bubble (lower priority than “normal edits”, but visible) */}
                                {fbCount > 0 && (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                    Feedback {fbCount}
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-gray-700">
                                {new Date(post.post_date).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                                {" • "}
                                Status: <span className="font-semibold">{post.status || "unknown"}</span>
                                {post.artist_id && artistsById?.[post.artist_id]
                                  ? ` • ${artistsById[post.artist_id]}`
                                  : ""}
                              </div>
                            </div>
                          </li>
                        );
                      })}

                    </ul>
                  )}
                </div>

                {/* Next week */}
                <div>
                  <h2 className="font-semibold mb-2 text-sm uppercase tracking-wide text-gray-800">
                    Coming Next Week
                  </h2>
                  {grouped.nextWeek.length === 0 ? (
                    <div className="text-xs text-gray-700 bg-[#eef8ea] rounded px-3 py-2">
                      No posts pending next week yet.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {grouped.nextWeek.map((post) => (
                        <li
                          key={post.id}
                          className="border rounded-md px-3 py-2 text-sm flex justify-between items-start bg-[#eef8ea] cursor-pointer hover:bg-white"
                          onClick={() => handleNotificationClick(post)}
                        >
                          <div>
                            <div className="font-medium">
                              {post.post_name || "(Untitled post)"}
                            </div>
                            <div className="text-xs text-gray-700">
                              {new Date(post.post_date).toLocaleDateString(
                                undefined,
                                {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "2-digit",
                                }
                              )}
                              {" • "}
                              Status:{" "}
                              <span className="font-semibold">
                                {post.status || "unknown"}
                              </span>
                              {post.artist_id && artistsById[post.artist_id] && (
                                <>
                                  {" • "}
                                  Artist: {artistsById[post.artist_id]}
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Bottom placeholder section with empty graph */}
          <section className="bg-[#bbe1ac] rounded-2xl shadow-lg p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-2">Upcoming Insights</h2>
            <p className="text-sm text-gray-800 mb-4">
              What do you guys think would be useful to have here?
            </p>
            <div className="bg-[#eef8ea] rounded-xl border border-dashed border-gray-400 h-48 md:h-56 flex items-center justify-center">
              <span className="text-xs text-gray-600">
                Graph placeholder – data coming soon.
              </span>
            </div>
          </section>
        </div>

    {/* Post modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-[90vw] w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header row matching calendar modal */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Post Details</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Post title */}
            <div className="text-lg font-semibold mb-2">
              {selectedPost.post_name || "(Untitled post)"}
            </div>

            {/* Basic metadata */}
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
              <p className="text-sm text-gray-700 mb-2">
                <strong>Artist:</strong> {artistsById[selectedPost.artist_id]}
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
            {/* Post details loading / error */}
            {postLoading && (
              <div className="text-xs text-gray-500 mb-2">
                Loading variations…
              </div>
            )}
            {postError && (
              <div className="text-xs text-red-600 mb-2">
                {postError}
              </div>
            )}

            {/* Notes + variations */}
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

                          {/* Optional: add calendar-style download button here if desired */}
                          {/* e.g. same small icon/button block you use in calendar.js */}
                        </div>

                        {/* Clickable file info opens media player */}
                        <div
                          className="text-xs text-gray-600 cursor-pointer mt-1"
                          onClick={() => {
                            setSelectedVariation(v);
                            setShowMediaPlayer(true);
                          }}
                        >
                          {v.text_only
                            ? "Text only (mailing list)"
                            : <>{v.file_name || "no file"} • {v.length_seconds ? `${v.length_seconds}s` : "length n/a"}</>
                          }
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">
                      No variations yet. Use “New Variation” to upload one.
                    </li>
                  )}
                </ul>

                {/* Footer buttons */}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setUploadMode("new");
                      setReplaceVariation(null);
                      setShowUploadModal(true);
                    }}
                    className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                  >
                    New Variation
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-[#bbe1ac] rounded hover:bg-[#a5d296]"
                    onClick={handleViewInCalendar}
                  >
                    View in calendar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    {/* NEW: LeadsDetailsModal */}
    {selectedLead && (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        onClick={() => setSelectedLead(null)}
      >
        <div
          className="bg-white rounded-lg shadow-lg max-w-[90vw] w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">
                Lead details: {selectedLead.lead_type || "Lead"}
              </h2>
              <div className="text-xs text-gray-600">
                Submitted{" "}
                {new Date(selectedLead.created_at).toLocaleString()}
                {" • "}
                Source: {selectedLead.__sourceTable}
              </div>
            </div>

            <button
              className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              onClick={() => setSelectedLead(null)}
              type="button"
            >
              Close
            </button>
          </div>

          {/* Everything in English labels + clickable links */}
          <div className="text-sm space-y-2">
            {[
              ["Email", selectedLead.email],
              ["Phone", selectedLead.phone],
              ["About project", selectedLead.about_project],
              ["Budget per song", selectedLead.budget_per_song],
              ["Monthly marketing budget", selectedLead.monthly_marketing_budget],
              ["Budget tier", selectedLead.budget_tier],
              ["Ideal release date", selectedLead.ideal_release_date],
              ["Music link", selectedLead.music_link],
              ["Social links", selectedLead.social_links],
              ["EPK URL", selectedLead.epk_url],
              ["Notes", selectedLead.notes],
              ["Reference music links", selectedLead.reference_music_links],
              ["Reference video links", selectedLead.reference_video_links],
              ["What to film", selectedLead.what_to_film],
              ["Wants additional digital strategy", String(!!selectedLead.wants_additional_digital_strategy)],
              ["Extra fields", selectedLead.extra_fields ? JSON.stringify(selectedLead.extra_fields, null, 2) : ""],
            ].map(([label, value]) => {
              if (!value) return null;

              const s = String(value);

              // make URLs clickable (basic)
              const isUrl = /^https?:\/\//i.test(s);
              return (
                <div key={label} className="border rounded p-3 bg-white">
                  <div className="text-xs font-semibold text-gray-700 mb-1">{label}</div>
                  {isUrl ? (
                    <a className="text-blue-600 underline break-words" href={s} target="_blank" rel="noreferrer">
                      {s}
                    </a>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{s}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}

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
                        v.id === variationId
                          ? { ...v, platforms: nextPlatforms }
                          : v
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

    </TeamLayout>
  );
}
