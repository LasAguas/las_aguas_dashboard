'use client';
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Link from "next/link";

// Helpers
const pad = (n) => String(n).padStart(2, '0')
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

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

  const POST_TYPES = ['H+LS', 'Storytelling', 'Performance', 'Smash Cut', 'Visualiser', 'Long Form', 'Carousel', 'Education', 'Other'];
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
function MediaPlayer({ variation, onClose, onRefreshPost, onReplaceRequested, onPlatformsUpdated }) {
  const [mediaUrls, setMediaUrls] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);

  const [localResolved, setLocalResolved] = useState(!!variation?.feedback_resolved);
  const [saving, setSaving] = useState(false);

  const [platforms, setPlatforms] = useState(variation?.platforms || []);
  const [savingPlatforms, setSavingPlatforms] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [touchStartX, setTouchStartX] = useState(null);

  useEffect(() => {
    setPlatforms(variation?.platforms || []);
  }, [variation?.platforms]);

  useEffect(() => {
    setLocalResolved(!!variation?.feedback_resolved);
  }, [variation?.feedback_resolved]);

  useEffect(() => {
    const loadMedia = async () => {
      try {
        setLoading(true);
        setError("");

        const paths =
          (variation.carousel_files && variation.carousel_files.length > 0)
            ? variation.carousel_files
            : (variation.file_name ? [variation.file_name] : []);

        const urls = [];
        for (const path of paths) {
          const { data, error: urlErr } = supabase.storage
            .from("post-variations")
            .getPublicUrl(path);
          if (urlErr) {
            console.error("Error fetching media URL:", urlErr);
            setError("Could not load media.");
            break;
          }
          urls.push(data.publicUrl);
        }
        setMediaUrls(urls);

        if (variation.audio_file_name) {
          const { data: aData, error: aErr } = supabase.storage
            .from("post-variations")
            .getPublicUrl(variation.audio_file_name);
          if (aErr) {
            console.error("Error fetching audio URL:", aErr);
          } else {
            setAudioUrl(aData.publicUrl);
          }
        }
      } catch (e) {
        console.error(e);
        setError("Could not load media.");
      } finally {
        setLoading(false);
      }
    };

    loadMedia();
  }, [variation]);

  const hasCarousel = mediaUrls.length > 1;
  const mainUrl = mediaUrls[currentIndex] || null;
  const isImage = mainUrl ? mainUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) : false;
  const isVideo = mainUrl ? mainUrl.match(/\.(mp4|mov|webm)$/i) : false;

  const goPrev = () => {
    if (!hasCarousel) return;
    setCurrentIndex((i) => (i - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const goNext = () => {
    if (!hasCarousel) return;
    setCurrentIndex((i) => (i + 1) % mediaUrls.length);
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX == null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 50) goPrev();
    else if (deltaX < -50) goNext();
    setTouchStartX(null);
  };

  const handleToggleResolved = async () => {
    if (saving) return;
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
    if (typeof onRefreshPost === "function") onRefreshPost(variation.id, next);
  };

  const handlePlatformsSave = async (nextPlatforms) => {
    if (savingPlatforms) return;
    setSavingPlatforms(true);
    try {
      const { error } = await supabase
        .from("postvariations")
        .update({ platforms: nextPlatforms })
        .eq("id", variation.id);
      if (error) throw error;
      setPlatforms(nextPlatforms);
      if (onPlatformsUpdated) onPlatformsUpdated(variation.id, nextPlatforms);
    } catch (err) {
      console.error("Error updating platforms:", err);
      alert("Could not update platforms.");
    } finally {
      setSavingPlatforms(false);
    }
  };

  const handlePlaySnippet = () => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    const start = variation.audio_start_seconds || 0;
    audio.currentTime = start;
    audio.play().catch((e) => console.error("Audio play error:", e));
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString(undefined, {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 text-sm text-gray-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              Variation {variation.test_version || ""}
            </span>
            {variation.variation_post_date && (
              <span className="text-xs text-gray-400">
                {formatDate(variation.variation_post_date)}
              </span>
            )}
          </div>
          <button
            className="text-gray-400 hover:text-white text-lg"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Media area */}
        <div className="flex-1 flex flex-col md:flex-row bg-black">
          <div className="flex-1 flex items-center justify-center relative">
            {loading && (
              <div className="text-gray-400 text-sm">Loading media…</div>
            )}
            {!loading && error && (
              <div className="text-red-400 text-sm px-4">{error}</div>
            )}
            {!loading && !error && mainUrl && (
              <div
                className="relative flex items-center justify-center w-full h-full"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {isImage && (
                  <img
                    src={mainUrl}
                    alt={variation.file_name || "variation media"}
                    className="max-h-[70vh] max-w-[70vw] object-contain"
                  />
                )}
                {isVideo && (
                  <video
                    src={mainUrl}
                    controls
                    className="max-h-[70vh] max-w-[70vw] object-contain"
                  />
                )}
                {!isImage && !isVideo && (
                  <div className="text-gray-200 text-sm">
                    Unsupported file type
                  </div>
                )}

                {hasCarousel && (
                  <>
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                      onClick={goPrev}
                    >
                      ‹
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                      onClick={goNext}
                    >
                      ›
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {mediaUrls.map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i === currentIndex ? "bg-white" : "bg-gray-500"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right side: meta, platforms, audio, feedback */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-gray-800 text-sm text-gray-100 flex flex-col">
            <div className="p-3 border-b border-gray-800">
              <div className="font-semibold mb-1">Platforms</div>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((p) => (
                  <label
                    key={p.value}
                    className="inline-flex items-center gap-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-500"
                      checked={platforms.includes(p.value)}
                      onChange={() => {
                        const next = platforms.includes(p.value)
                          ? platforms.filter((v) => v !== p.value)
                          : [...platforms, p.value];
                        setPlatforms(next);
                        handlePlatformsSave(next);
                      }}
                    />
                    <span>{p.short || p.label}</span>
                  </label>
                ))}
              </div>
              {savingPlatforms && (
                <div className="text-[10px] text-gray-400 mt-1">
                  Saving platforms…
                </div>
              )}
            </div>

            {/* Audio snippet */}
            {audioUrl && (
              <div className="p-3 border-b border-gray-800">
                <div className="font-semibold mb-1">Audio snippet</div>
                <div className="text-xs text-gray-300 mb-2">
                  Starts at{" "}
                  <strong>
                    {variation.audio_start_seconds
                      ? `${Math.floor(variation.audio_start_seconds / 60)}:${String(
                          variation.audio_start_seconds % 60
                        ).padStart(2, "0")}`
                      : "0:00"}
                  </strong>
                </div>
                <button
                  className="px-2 py-1 rounded-full bg-white text-gray-900 text-xs hover:bg-gray-200"
                  onClick={handlePlaySnippet}
                >
                  Play snippet
                </button>
              </div>
            )}

            {/* Feedback */}
            <div className="p-3 flex-1 flex flex-col gap-2">
              <div>
                <div className="font-semibold mb-1">Feedback</div>
                <div className="text-xs text-gray-300 whitespace-pre-line">
                  {variation.feedback || "No feedback yet."}
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  onClick={() => onReplaceRequested && onReplaceRequested(variation)}
                  className="px-3 py-1.5 rounded-full border border-gray-500 text-xs hover:bg-gray-800"
                >
                  Replace media
                </button>
                {variation.feedback && (
                  <button
                    onClick={handleToggleResolved}
                    disabled={saving}
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      localResolved
                        ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
                        : "bg-green-600 text-white border-transparent hover:bg-green-700"
                    } ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {saving
                      ? "Saving…"
                      : localResolved
                      ? "Mark as unresolved"
                      : "Mark feedback resolved"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800 flex justify-end">
          <button
            className="px-3 py-1.5 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


//Upload Modal Function
//Upload Modal Function
function UploadModal({ postId, artistId, defaultDate, mode = 'new', variation, onClose, onSave }) {
  const isReplace = mode === 'replace';

  const [mediaFiles, setMediaFiles] = useState([]);
  const [platforms, setPlatforms] = useState(variation?.platforms || []); // multi-select
  const [notes, setNotes] = useState(variation?.notes || '');
  const [variationDate, setVariationDate] = useState(defaultDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [audioFile, setAudioFile] = useState(null);
  const [audioDuration, setAudioDuration] = useState(null);
  const [audioStart, setAudioStart] = useState(0);

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      setMediaFiles([]);
      return;
    }

    const firstType = files[0].type.split('/')[0]; // "image" or "video"

    if (firstType !== 'image' && firstType !== 'video') {
      alert('Please upload images or a single video.');
      return;
    }

    if (firstType === 'video' && files.length > 1) {
      alert('Video variations currently support a single file only.');
      return;
    }

    // Ensure all selected are same base type
    if (files.some((f) => f.type.split('/')[0] !== firstType)) {
      alert('Please select only images OR only a single video in one upload.');
      return;
    }

    setMediaFiles(files);
  };

  const handleAudioChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAudioFile(null);
      setAudioDuration(null);
      setAudioStart(0);
      return;
    }
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file (mp3).');
      return;
    }
    setAudioFile(file);

    // Load to get duration
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration || null);
      setAudioStart(0);
      URL.revokeObjectURL(audio.src);
    };
    audio.src = URL.createObjectURL(file);
  };

  const handleReorder = (result) => {
    if (!result.destination) return;
    const items = Array.from(mediaFiles);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setMediaFiles(items);
  };

  const formatSeconds = (sec) => {
    if (!sec && sec !== 0) return '';
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!mediaFiles.length) {
      alert('Please select at least one media file.');
      return;
    }
    if (!isReplace && (!platforms || platforms.length === 0)) {
      alert('Please select at least one platform.');
      return;
    }

    setUploading(true);

    try {
      const mainFile = mediaFiles[0];
      const isVideo = mainFile.type.startsWith('video/');
      const isImage = mainFile.type.startsWith('image/');
      const targetPostId = isReplace && variation ? variation.post_id : postId;

      // compute video length if needed
      let lengthSeconds = null;
      if (isVideo) {
        lengthSeconds = await new Promise((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = function () {
            window.URL.revokeObjectURL(video.src);
            resolve(Math.round(video.duration));
          };
          video.src = URL.createObjectURL(mainFile);
        });
      }

      // upload media files (carousel or single)
      const uploadedMediaPaths = [];
      for (const file of mediaFiles) {
        const filePath = `${artistId}/${targetPostId}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('post-variations')
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        uploadedMediaPaths.push(filePath);
      }

      // upload audio file (optional)
      let audioPath = null;
      if (audioFile) {
        const audioPathCandidate = `${artistId}/${targetPostId}/audio_${audioFile.name}`;
        const { error: audioErr } = await supabase.storage
          .from('post-variations')
          .upload(audioPathCandidate, audioFile, { upsert: true });
        if (audioErr) throw audioErr;
        audioPath = audioPathCandidate;
      }

      const isCarousel = isImage && uploadedMediaPaths.length > 1;
      const firstPath = uploadedMediaPaths[0];

      if (isReplace && variation) {
        // UPDATE existing variation
        const { error: updateError } = await supabase
          .from('postvariations')
          .update({
            file_name: firstPath,
            length_seconds: lengthSeconds,
            carousel_files: isCarousel ? uploadedMediaPaths : null,
            audio_file_name: audioPath,
            audio_start_seconds: audioFile ? Math.round(audioStart) : null,
            ...(platforms && platforms.length ? { platforms } : {}),
            notes,
            variation_post_date: variationDate,
          })
          .eq('id', variation.id);

        if (updateError) throw updateError;
      } else {
        // NEW variation – compute next test_version
        const { data: existingVars, error: tvError } = await supabase
          .from('postvariations')
          .select('test_version')
          .eq('post_id', postId)
          .order('test_version', { ascending: true });

        if (tvError) throw tvError;

        let nextVersion = 'A';
        if (existingVars && existingVars.length > 0) {
          const last = existingVars[existingVars.length - 1]?.test_version || 'A';
          const code = last.toUpperCase().charCodeAt(0);
          nextVersion = String.fromCharCode(code + 1);
        }

        const { error: insertError } = await supabase
          .from('postvariations')
          .insert([{
            post_id: postId,
            platforms,
            file_name: firstPath,
            test_version: nextVersion,
            length_seconds: lengthSeconds,
            variation_post_date: variationDate,
            notes,
            carousel_files: isCarousel ? uploadedMediaPaths : null,
            audio_file_name: audioPath,
            audio_start_seconds: audioFile ? Math.round(audioStart) : null,
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
          {isReplace ? 'Replace Media' : 'Upload Media'}
        </h2>

        {/* Media files (single or carousel) */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Select Media File{mediaFiles.length !== 1 ? 's' : ''}
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleMediaChange}
            className="w-full text-sm"
          />
          {mediaFiles.length > 0 && (
            <div className="mt-2 border rounded p-2 max-h-40 overflow-auto text-xs bg-gray-50">
              <p className="font-semibold mb-1">
                Order (top = first in carousel)
              </p>
              <DragDropContext onDragEnd={handleReorder}>
                <Droppable droppableId="media-files">
                  {(provided) => (
                    <ul
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-1"
                    >
                      {mediaFiles.map((f, index) => (
                        <Draggable key={f.name + index} draggableId={f.name + index} index={index}>
                          {(drag) => (
                            <li
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              className="flex items-center justify-between bg-white rounded px-2 py-1 border"
                            >
                              <span className="truncate max-w-[200px]">{f.name}</span>
                              <span className="text-gray-400 text-[10px]">drag</span>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </div>

        {/* Optional audio overlay */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Audio (optional, mp3)</label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleAudioChange}
            className="w-full text-sm"
          />
          {audioFile && (
            <div className="mt-2 text-xs text-gray-700 space-y-1">
              <div>Selected: {audioFile.name}</div>
              {audioDuration && (
                <>
                  <div>
                    Snippet start: <strong>{formatSeconds(audioStart)}</strong> /{' '}
                    {formatSeconds(audioDuration)}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, Math.floor(audioDuration - 15))}
                    value={audioStart}
                    onChange={(e) => setAudioStart(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-[10px] text-gray-500">
                    (We’ll use a ~15s snippet starting from this point.)
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Platform multi-select */}
        {!isReplace && (
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
                    checked={platforms.includes(p.value)}
                    onChange={() => {
                      setPlatforms((prev) =>
                        prev.includes(p.value)
                          ? prev.filter((v) => v !== p.value)
                          : [...prev, p.value]
                      );
                    }}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Variation date (for this media)
          </label>
          <button
            type="button"
            onClick={() => setShowDatePicker(true)}
            className="text-left w-full border rounded px-2 py-1 text-sm"
          >
            {variationDate
              ? new Date(variationDate).toLocaleDateString()
              : 'Select date'}
          </button>
          {showDatePicker && (
            <div className="mt-2">
              <DatePicker
                selected={variationDate ? new Date(variationDate) : null}
                onChange={(date) => {
                  setVariationDate(date ? toYMD(date) : null);
                  setShowDatePicker(false);
                }}
                inline
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes || ''}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
            rows={3}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded text-sm border border-gray-300 bg-white hover:bg-gray-100"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded text-sm text-white ${
              uploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={handleSave}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : isReplace ? 'Save replacement' : 'Save media'}
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

// View switching
const [viewMode, setViewMode] = useState('4weeks') // '4weeks' (Current) | 'month'
const [months, setMonths] = useState([])
const [selectedMonth, setSelectedMonth] = useState('')

// Checking width for dates
const [isNarrow, setIsNarrow] = useState(false);

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
        feedback_resolved
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
       carousel_files,
       audio_file_name,
       audio_start_seconds
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
  setSelectedPostId(null)
  setPostDetails(null)
  setPostLoading(false)
  setPostError('')
}

//for stats page button functionality
function goToStats() {
  router('/stats-view');
}

return (
  <div className="p-6">
      <div className="absolute top-4 right-4 flex space-x-2">
        <Link
          href="https://supabase.com/dashboard/project/gtccctajvobfvhlonaot/editor/17407?schema=public"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 shadow-md">
            Supabase Tables
          </button>
        </Link>

        <Link
          href="/thisweek"
        >
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-md">
            This Week's Posts
          </button>
        </Link>
        
        <Link href="/stats-view">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-md">
            View Stats
          </button>
        </Link>
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
            <div className="px-4 py-2 bg-gray-50 border-b text-sm font-medium">
              Week of {week.weekStart.toLocaleDateString()}
            </div>

            <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 border-b">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
                <div key={d} className="px-3 py-2">{d}</div>
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
                        backgroundColor: day.date.toDateString() === new Date().toDateString()
                          ? "#eef8ea" // halfway between #bbe1ac and white
                          : "transparent"
                      }}
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {isNarrow
                          ? `${day.date.toLocaleDateString(undefined, { weekday: "short" })} - ${day.date
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
                              .padStart(2, "0")}/${day.date.getFullYear()}`
                        }
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

                        const postPlatforms = Array.from(
                          new Set(
                            allVariations
                              .filter((v) => v.post_id === post.id)
                              .flatMap((v) => v.platforms || [])
                              .filter(Boolean)
                          )
                        );

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
                                  ...dragProvided.draggableProps.style
                                }}
                                title={post.status || ''}
                                onClick={() => openPostDetails(post.id)}
                                >
                                <div className="flex items-start justify-between gap-2">
                                  <span>{post.post_name}</span>

                                  {postPlatforms.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                      {postPlatforms
                                        .sort((a, b) =>
                                          PLATFORM_OPTIONS.findIndex(o => o.value === a) -
                                          PLATFORM_OPTIONS.findIndex(o => o.value === b)
                                        )
                                        .map((plat) => {
                                          const cfg = PLATFORM_OPTIONS.find(o => o.value === plat)
                                          const short = cfg?.short || plat[0] || '?'
                                          return (
                                            <span
                                              key={plat}
                                              className="inline-flex items-center justify-center rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] leading-none"
                                            >
                                              {short}
                                            </span>
                                          )
                                        })}
                                    </div>
                                  )}
                                </div>


                                {/* 🔴 Feedback notification bubble */}
                                {feedbackCount > 0 && (

                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                                    {feedbackCount}
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
                                border: "1px solid #ccc",      // optional styling to distinguish
                                ...dragProvided.draggableProps.style
                              }}
                              onClick={() => openPostDetails(variation.post_id)}
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
                              setNewPostDate(day.ymd)
                              setShowAddPostModal(true)
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
          <span className="font-medium">
            {(v.platforms && v.platforms.length ? v.platforms : ['—']).join(', ')}
          </span>{' '}
          — {v.test_version || "—"}<span className="font-medium">{v.platform}</span> — {v.test_version || "—"}
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
            <div className="text-right mt-4 flex justify-end gap-2">
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
        onPlatformsUpdated={handleVariationPlatformsChange}  // NEW
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