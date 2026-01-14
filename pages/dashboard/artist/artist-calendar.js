'use client';
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Link from "next/link";
import ArtistLayout from "../../../components/artist/ArtistLayout";

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

// ✅ Get cached URL - returns null if expired or missing
function cacheGetUrl(path) {
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
}

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

  const [feedback, setFeedback] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

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
    setFeedback(variation.feedback || "");
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

  // ✅ Async function to fetch ALL URLs in parallel (not sequentially)
  async function loadAllMediaUrls() {
      try {
        // Create promises for all paths at once
        const urlPromises = paths.map(async (path) => {
          // Check cache first
          const cachedUrl = cacheGetUrl(path);
          if (cachedUrl) {
            return { path, url: cachedUrl, type: detectType(path) };
          }

          // If not cached, get signed URL from Supabase
          const url = await getOptimizedMediaUrl(path); // This caches internally
          return { path, url, type: detectType(path) };
        });

        // ✅ Wait for ALL URLs to resolve in parallel (much faster than sequential)
        const items = await Promise.all(urlPromises);

        setMediaItems(items);
        setCurrentIndex(0);
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

  const { data, error } = supabase.storage
    .from("post-variations")
    .getPublicUrl(variation.audio_file_name);

  if (error) {
    console.error("Error fetching audio URL:", error);
    setAudioUrl(null);
  } else {
    cacheSetUrl(variation.audio_file_name, data.publicUrl); // cache it
    setAudioUrl(data.publicUrl);
  }
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

  const handleSaveFeedback = async () => {
    if (!variation?.id) return;
    setSavingFeedback(true);

    const { error } = await supabase
      .from("postvariations")
      .update({ feedback })
      .eq("id", variation.id);

    setSavingFeedback(false);

    if (error) {
      console.error("Error saving feedback:", error);
      alert("Could not save feedback: " + error.message);
      return;
    }

    variation.feedback = feedback; // keep local in sync
    if (typeof onRefreshPost === "function") onRefreshPost();
    alert("Feedback saved!");
  };

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
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
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

            {/* Feedback (artist allowed) */}
            <div className="text-sm font-semibold mb-2">Feedback</div>
            <textarea
              className="w-full border rounded p-2 min-h-[180px]"
              placeholder="Leave feedback here…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button
              onClick={handleSaveFeedback}
              disabled={savingFeedback}
              className="mt-3 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {savingFeedback ? "Saving..." : "Save Feedback"}
            </button>
            {/* ✅ Greenlight button */}
            <button
              type="button"
              onClick={toggleGreenlight}
              disabled={savingGreenlight}
              className={[
                "mt-2 w-full py-2 rounded transition-colors disabled:opacity-60",
                localGreenlight
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900",
              ].join(" ")}
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

// ✅ Preload variations for a specific post when it becomes visible
async function preloadPostVariations(postId, allVariations) {
  if (!postId || !allVariations) return;
  
  // Find variations for this post
  const postVariations = allVariations.filter(v => v.post_id === postId);
  if (!postVariations.length) return;
  
  console.log(`🔄 Preloading ${postVariations.length} variations for post ${postId}`);
  
  // Preload each variation's media (first item only for speed)
  for (const variation of postVariations) {
    const paths = Array.isArray(variation.carousel_files) && variation.carousel_files.length
      ? variation.carousel_files
      : variation.file_name ? [variation.file_name] : [];
    
    if (!paths.length) continue;
    
    try {
      // Only preload first item (most likely to be viewed)
      const firstPath = paths[0];
      const url = await getOptimizedMediaUrl(firstPath);
      
      // Trigger browser preload
      const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(getPathname(url));
      if (isVideo) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.src = url;
        video.load();
      } else {
        const img = new Image();
        img.src = url;
      }
    } catch (err) {
      console.log("Preload failed for variation", variation.id, err);
    }
  }
}

function ArtistCalendarInner() {
  const [artists, setArtists] = useState([]) // I think this might be an issue if it's messing with the artist_id of the logged in profile
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedArtistId, setSelectedArtistId] = useState('') //This one too
  const [weeks, setWeeks] = useState([])
  const [rangeLabel, setRangeLabel] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [allVariations, setAllVariations] = useState([])

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
      // warm cache with a small range request (helps MP4 start time)
      preloadVideoBytes(url);

      const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(getPathname(url));
      if (isVideo) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.src = url;
        video.load();
      } else {
        const img = new Image();
        img.src = url;
      }
    };

    // preload first item ASAP, then the rest
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      try {
        const cached = cacheGetUrl(path);
        const url = cached || (await getOptimizedMediaUrl(path)); // caches signed URL internally
        preloadMediaUrl(url);
      } catch (err) {
        console.log("Priority preload failed for", path, err);
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

      // 🔄 Fetch variations for these posts so we can show platform badges
      const postIds = (posts || []).map((p) => p.id);
      let variations = [];
      if (postIds.length) {
        const { data: varData, error: varError } = await supabase
          .from('postvariations')
          .select('id, post_id, platforms')
          .in('post_id', postIds);

        if (varError) {
          console.error('Supabase error (variations):', varError);
        } else {
          variations = varData;
        }
      }

      setAllVariations(variations || []);

      // Build week rows across range
      const startDate = new Date(from)
      const endDate = new Date(to)
      const weeksArr = []
      let currentStart = startOfWeekMonday(startDate)

      while (currentStart <= endDate) {
        const days = []
        for (let d = 0; d < 7; d++) {
          const dayDate = addDays(currentStart, d)
          const ymd = toYMD(dayDate)
          const postsForDay = (posts || []).filter(p => toYMD(new Date(p.post_date)) === ymd)
          days.push({ date: dayDate, ymd, posts: postsForDay })
        }
        weeksArr.push({ weekStart: currentStart, days })
        currentStart = addDays(currentStart, 7)
      }

      setWeeks(weeksArr)
      
      // ✅ SMART PRELOADING: Actually download media files for likely-to-be-viewed posts
      {/*const preloadVariations = async () => {
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
      setTimeout(preloadVariations, 500);*/}

    }
    loadPosts()
  }, [selectedArtistId, viewMode, selectedMonth, platformFilter])

   // Smart preloading: Load media when posts become visible in viewport
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!weeks.length || !allVariations.length) return;
    
    // Create observer that watches when post elements enter viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Post is visible - start preloading its media
            const postId = entry.target.dataset.postId;
            if (postId) {
              preloadPostVariations(parseInt(postId), allVariations);
            }
          }
        });
      },
      { 
        // ✅ Start loading 200px BEFORE post enters viewport
        rootMargin: '200px',
        // ✅ Only trigger when at least 10% of post is visible
        threshold: 0.1
      }
    );
    
    // Find all post elements and observe them
    const postElements = document.querySelectorAll('[data-post-id]');
    postElements.forEach(el => observer.observe(el));
    
    // Cleanup: stop observing when component unmounts
    return () => observer.disconnect();
  }, [weeks, allVariations]);

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
    
        // 2) Fetch variations for that post
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
    
        // ✅ Attach captions to each variation so MediaPlayer can display them
        const variationsWithCaptions = (variations || []).map(v => ({
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
                            const postPlatforms = Array.from(
                              new Set(
                                allVariations
                                  .filter((v) => v.post_id === post.id)
                                  .flatMap((v) => v.platforms || [])
                                  .filter(Boolean)
                              )
                            );

                            return (
                              <div
                                key={post.id}
                                data-post-id={post.id}  // ✅ Add data attribute for Intersection Observer
                                className="text-xs px-2 py-1 rounded text-white cursor-pointer"
                                style={{ backgroundColor: statusColor(post.status) }}
                                title={post.status || ""}
                                onClick={() => openPostDetails(post.id)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span>{post.post_name}</span>

                                  {postPlatforms.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                      {postPlatforms
                                        .sort(
                                          (a, b) =>
                                            PLATFORM_OPTIONS.findIndex((o) => o.value === a) -
                                            PLATFORM_OPTIONS.findIndex((o) => o.value === b)
                                        )
                                        .map((plat) => {
                                          const cfg = PLATFORM_OPTIONS.find((o) => o.value === plat);
                                          const short = cfg?.short || plat[0] || "?";
                                          return (
                                            <span
                                              key={plat}
                                              className="inline-flex items-center rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] leading-none"
                                            >
                                              {short}
                                            </span>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
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
          priorityPreload(v);
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