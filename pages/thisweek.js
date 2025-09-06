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
      return "#F1E68C";
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
      <div className="relative bg-white rounded-lg w-auto max-w-[85vw] p-4 mx-auto">
        <div className="space-y-3 min-w-[28rem]">
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
            <div className="bg-gray-50 p-3 rounded text-sm min-h-[3rem]">
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
                <div className="bg-gray-50 p-3 rounded text-sm min-h-[3rem]">
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
function MediaPlayer({ variation, onClose }) {
  const [mediaUrl, setMediaUrl] = useState(null);

  useEffect(() => {
    if (!variation?.file_name) return;
    const { data, error } = supabase.storage
      .from("post-variations")
      .getPublicUrl(variation.file_name);
    if (!error) setMediaUrl(data.publicUrl);
  }, [variation]);

  if (!variation || !mediaUrl) return null;
  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(variation.file_name || "");
  const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(variation.file_name || "");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg p-6 max-w-2xl w-full">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
        >
          ✕
        </button>
        {isImage && (
          <img src={mediaUrl} alt={variation.file_name} className="max-h-[70vh] mx-auto" />
        )}
        {isVideo && (
          <video controls className="max-h-[70vh] mx-auto">
            <source src={mediaUrl} type="video/mp4" />
          </video>
        )}
        <div className="mt-4 text-sm">
          <p><strong>Platform:</strong> {variation.platform}</p>
          <p><strong>Version:</strong> {variation.test_version || "N/A"}</p>
        </div>
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

  useEffect(() => {
    const load = async () => {
      try {
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
    try {
      const { data: post } = await supabase.from("posts").select("*").eq("id", postId).single();
      const { data: vars } = await supabase
        .from("postvariations")
        .select("*")
        .eq("post_id", postId)
        .order("test_version", { ascending: true });

      setPostDetails({
        post,
        variations: vars || [],
        captions: { a: post.caption_a, b: post.caption_b },
      });
    } catch (e) {
      console.error(e);
      setPostError("Could not load post details.");
    } finally {
      setPostLoading(false);
    }
  }
  function closeModal() {
    setSelectedPostId(null);
    setPostDetails(null);
  }

  return (
    <div className="p-6">
      <div className="absolute top-4 right-4 flex space-x-2">
        <Link href="/">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-md">
            Back to Calendar
          </button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-4">This Week’s Posts</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* Calendar grid */}
      <DragDropContext onDragEnd={() => {}}>
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
                      {day.date.getDate()}/{day.date.getMonth() + 1}
                    </div>
                    <div className="space-y-1">
                      {posts
                        .filter((p) => toYMD(new Date(p.post_date)) === day.ymd)
                        .map((post, index) => (
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
                                className="text-xs px-2 py-1 rounded text-white cursor-pointer"
                                style={{
                                  backgroundColor: statusColor(post.status),
                                  ...dragProvided.draggableProps.style,
                                }}
                                onClick={() => openPostDetails(post.id)}
                              >
                                {post.post_name} — {artistMap.get(post.artist_id)}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {variations
                        .filter((v) => toYMD(new Date(v.variation_post_date)) === day.ymd)
                        .map((v, vIndex) => {
                          const parent = posts.find((p) => p.id === v.post_id);
                          return (
                            <Draggable
                              key={`var-${v.id}`}
                              draggableId={`var-${v.id}`}
                              index={posts.length + vIndex}
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
                        })}
                      {dropProvided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>
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
                  <p className="font-semibold">{postDetails.post.post_name}</p>
                  <p className="text-sm text-gray-600">
                    {artistMap.get(postDetails.post.artist_id)}
                  </p>
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
          onSave={() => setShowCaptions(false)}
        />
      )}

      {showMediaPlayer && selectedVariation && (
        <MediaPlayer variation={selectedVariation} onClose={() => setShowMediaPlayer(false)} />
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
