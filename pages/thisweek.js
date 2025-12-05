// pages/thisweek.js
"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
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

// --- Media Player ---
function MediaPlayer({ variation, onClose, onRefreshPost }) {
  // local feedback resolve state (component scope, not inside useEffect)
  const [localResolved, setLocalResolved] = useState(!!variation?.feedback_resolved);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalResolved(!!variation?.feedback_resolved);
  }, [variation]);

  const toggleResolve = async () => {
    if (!variation) return;
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
    variation.feedback_resolved = next; // keep prop object visually in sync
    if (typeof onRefreshPost === "function") onRefreshPost();
  };

  const [mediaUrl, setMediaUrl] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  useEffect(() => {
    console.log("Variation received:", variation);
    if (!variation) return;

    // Optional: check Supabase session (debugging / permissions)
    const fetchSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) console.error("Error fetching session:", error);
      else console.log("Supabase session:", session);
    };
    fetchSession();

    // Bail if missing file
    if (!variation?.file_name) return;

    // Get the public URL for the file
    const { data, error } = supabase.storage
      .from("post-variations")
      .getPublicUrl(variation.file_name);

    if (error) {
      console.error("Error fetching media URL:", error);
    } else {
      console.log("Media URL:", data.publicUrl);
      setMediaUrl(data.publicUrl);

      // Determine whether the file is an image or a video
      const media = variation.file_name.match(/\.(jpe?g|png|gif|webp)$/i)
        ? new Image()
        : document.createElement("video");

      media.onloadedmetadata = function () {
        setDimensions({
          width: this.naturalWidth || this.videoWidth,
          height: this.naturalHeight || this.videoHeight,
        });
        console.log(
          "Media dimensions set:",
          this.naturalWidth || this.videoWidth,
          this.naturalHeight || this.videoHeight
        );
      };
      media.src = data.publicUrl;
    }
  }, [variation]);

  if (!variation || !mediaUrl) return null;

  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(variation.file_name || "");
  const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(variation.file_name || "");

  // --- Responsive sizing ---
  const maxViewportWidth = window.innerWidth * 0.9;
  const maxViewportHeight = window.innerHeight * 0.8;
  let displayWidth = dimensions.width;
  let displayHeight = dimensions.height;

  if (displayWidth < 100) displayWidth = 100;
  if (displayHeight < 100) displayHeight = 100;

  if (dimensions.width > maxViewportWidth) {
    const scale = maxViewportWidth / dimensions.width;
    displayWidth = maxViewportWidth;
    displayHeight = dimensions.height * scale;
  }

  if (displayHeight > maxViewportHeight) {
    const scale = maxViewportHeight / displayHeight;
    displayHeight = maxViewportHeight;
    displayWidth = displayWidth * scale;
  }

  // --- Delete handler ---
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

  // --- Feedback modal ---
  console.log("Feedback value:", variation.feedback);
  const hasFeedback = Boolean(
    variation.feedback && variation.feedback.trim() !== ""
  );
  console.log("Has feedback?", hasFeedback);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div
        className="relative bg-white rounded-lg p-6"
        style={{
          width: `${displayWidth}px`,
          maxWidth: "90vw",
          minWidth: "100px",
          width: isImage ? "60vw" : `${displayWidth}px`,
          maxWidth: isImage ? "60vw" : "90vw",
          minWidth: "100px",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-white bg-black/50 rounded-full p-1"
        >
          ✕
        </button>

        <div className="overflow-hidden rounded-lg">
          {isImage && (
            <img
              src={mediaUrl}
              alt={variation.file_name}
              style={{
                width: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
              }}
            />
          )}
          {isVideo && (
            <video
              controls
              style={{
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                objectFit: "contain",
              }}
            >
              <source src={mediaUrl} type="video/mp4" />
            </video>
          )}
          {!isImage && !isVideo && (
            <div className="text-white p-4">
              Unsupported file type: {variation.file_name}
            </div>
          )}
        </div>

        <div className="mt-4 text-sm">
          <p>
            <strong>Platform:</strong> {variation.platform}
          </p>
          <p>
            <strong>Version:</strong> {variation.test_version || "N/A"}
          </p>
        </div>

        {/* --- Buttons --- */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleDelete}
            className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors"
          >
            Delete Variation
          </button>

          <button
            onClick={() => setFeedbackModalOpen(true)}
            className={`flex-1 py-2 rounded text-white transition-colors ${
              hasFeedback ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"
            }`}
            disabled={!hasFeedback}
          >
            Show Feedback
          </button>
        </div>

        {/* --- Feedback Modal --- */}
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
              <div className={`whitespace-pre-wrap rounded p-3 border ${localResolved ? "opacity-60 grayscale" : ""}`}>
                {variation.feedback || "—"}
              </div>
              {variation.feedback && (
                <button
                  onClick={toggleResolve}
                  disabled={saving}
                  className={`mt-3 inline-flex items-center px-3 py-1 rounded text-sm border ${
                    localResolved
                      ? "bg-gray-200 hover:bg-gray-300"
                      : "bg-green-600 hover:bg-green-700 text-white border-transparent"
                  } ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {saving ? "Saving…" : localResolved ? "Mark as unresolved" : "Mark feedback resolved"}
                </button>
              )}


            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// --- Upload Modal ---
function UploadModal({ postId, artistId, defaultDate, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [platform, setPlatform] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    if (!file || !platform) return;
    setUploading(true);
    try {
      const filePath = `${artistId}/${postId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("post-variations")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("postvariations")
        .insert([
          {
            post_id: postId,
            platform,
            file_name: filePath,
            test_version: "A",
            variation_post_date: defaultDate,
            notes,
          },
        ]);
      if (insertError) throw insertError;
      onSave();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload media.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold mb-4">Upload Media</h2>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0])} className="mb-3" />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full border p-2 mb-3"
        >
          <option value="">Select platform…</option>
          <option value="TikTok">TikTok</option>
          <option value="Instagram">Instagram</option>
          <option value="YouTube">YouTube</option>
        </select>
        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border p-2 mb-3"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={uploading}
            className="px-3 py-1 bg-[#bbe1ac] rounded"
          >
            {uploading ? "Uploading…" : "Save"}
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
            .select("*")
            .in("post_id", postIds)
            .gte("variation_post_date", from)
            .lte("variation_post_date", to);
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
              .select("*")
              .in("post_id", postIds)
              .gte("variation_post_date", from)
              .lte("variation_post_date", to);
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
            .select("*")
            .in("post_id", postIds)
            .gte("variation_post_date", from)
            .lte("variation_post_date", to);
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
              .select("*")
              .in("post_id", nextPostIds)
              .gte("variation_post_date", nextFrom)
              .lte("variation_post_date", nextTo);
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
  
  

  // Post details modal
  async function openPostDetails(postId) {
    setSelectedPostId(postId);
    setPostLoading(true);
    setPostError("");
    setPostDetails(null);
  
    try {
      // 1️⃣ Fetch the post
      const { data: post, error: postErr } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();
      if (postErr) throw postErr;
  
      // 2️⃣ Fetch all variations for that post
      const { data: variations, error: varErr } = await supabase
        .from("postvariations")
        .select("id, platform, test_version, file_name, length_seconds, feedback, feedback_resolved")
        .eq("post_id", postId)
        .order("test_version", { ascending: true });
      if (varErr) throw varErr;
  
      // 3️⃣ Set all the fetched data into state
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
      setPostError("Could not load post details. See console for more info.");
    } finally {
      setPostLoading(false);
    }
  }
  
  function closeModal() {
    setSelectedPostId(null);
    setPostDetails(null);
    refreshWeekData();
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
      <div className="absolute top-4 right-4 flex space-x-2">
        <Link href="/calendar">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-md">
            Back to Calendar
          </button>
        </Link>
        <button
          onClick={() => setShowNextWeek(!showNextWeek)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-md"
        >
          {showNextWeek ? "Hide Coming Weeks" : "Show Coming Weeks"}
        </button>
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
                        
                          // 🔹 Count how many variations for this post have feedback
                          const feedbackCount = variations.filter(
                            (v) =>
                              v.post_id === post.id &&
                              v.feedback &&
                              v.feedback.trim() !== "" &&
                              !v.feedback_resolved
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
                                  {/* Post name + artist */}
                                  {post.post_name} — {artistMap.get(post.artist_id)}
                        
                                  {/* 🔴 Notification bubble */}
                                  {feedbackCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                                      {feedbackCount}
                                    </span>
                                  )}
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
                        const feedbackCount = nextWeekVariations.filter(
                          (v) =>
                            v.post_id === post.id &&
                            v.feedback &&
                            v.feedback.trim() !== ""
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
                                {post.post_name} —{" "}
                                {artistMap.get(post.artist_id)}
                                {feedbackCount > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-red-600 text-[9px] leading-none text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                                    {feedbackCount}
                                  </span>
                                )}
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
                        const feedbackCount = nextWeekVariations.filter(
                          (v) =>
                            v.post_id === post.id &&
                            v.feedback &&
                            v.feedback.trim() !== ""
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
                                {post.post_name} —{" "}
                                {artistMap.get(post.artist_id)}
                                {feedbackCount > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-red-600 text-[9px] leading-none text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                                    {feedbackCount}
                                  </span>
                                )}
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
      {selectedPostId && postDetails && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Post Details</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {postLoading ? (
              <p>Loading…</p>
            ) : (
                <>
                <div className="mb-3">
                  {!editingName ? (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{postDetails.post.post_name}</p>
                        <button
                          onClick={startEditingName}
                          className="inline-flex items-center text-gray-500 hover:text-gray-700"
                          aria-label="Edit post name"
                          title="Edit name"
                        >
                          ✎
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        {artistMap.get(postDetails.post.artist_id)}
                      </p>
                    </>
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

              
                {/* Status dropdown */}
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={postDetails.post.status || ""}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    try {
                      const { error } = await supabase
                        .from("posts")
                        .update({ status: newStatus })
                        .eq("id", postDetails.post.id);
                      if (error) throw error;
                      setPostDetails((prev) =>
                        prev ? { ...prev, post: { ...prev.post, status: newStatus } } : prev
                      );
                    } catch (err) {
                      console.error("Error updating status:", err);
                    }
                  }}
                  className="w-full border rounded p-2 text-sm mb-3"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              
                {/* Post date picker */}
                <label className="block text-sm font-medium mb-1">Post Date</label>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full border rounded p-2 text-sm mb-3 text-left"
                >
                  {new Date(postDetails.post.post_date).toLocaleDateString()}
                </button>
                {showDatePicker && (
                  <div className="mb-3">
                    <DatePicker
                      selected={new Date(postDetails.post.post_date)}
                      onChange={async (date) => {
                        const formatted = toYMD(date);
                        try {
                          const { error } = await supabase
                            .from("posts")
                            .update({ post_date: formatted })
                            .eq("id", postDetails.post.id);
                          if (error) throw error;
                          setPostDetails((prev) =>
                            prev ? { ...prev, post: { ...prev.post, post_date: formatted } } : prev
                          );
                        } catch (err) {
                          console.error("Error updating post date:", err);
                        } finally {
                          setShowDatePicker(false);
                        }
                      }}
                      inline
                    />
                  </div>
                )}
              
                {/* Captions button */}
                <button
                  onClick={() => setShowCaptions(true)}
                  className="px-3 py-1.5 text-sm bg-[#bbe1ac] rounded hover:opacity-90 mb-3"
                >
                  View/Edit Captions
                </button>
              
                {/* Variations list */}
                <h3 className="text-md font-semibold mb-2">Variations</h3>
                <ul className="space-y-2 max-h-48 overflow-auto pr-1">
                  {postDetails.variations.map((v) => (
                    <li
                      key={v.id}
                      className="border rounded p-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedVariation(v);
                        setShowMediaPlayer(true);
                      }}
                    >
                      {postDetails.post.post_name} (var)
                    </li>
                  ))}
                </ul>
              
                <div className="text-right mt-4">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 mr-2"
                  >
                    New Variation
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
