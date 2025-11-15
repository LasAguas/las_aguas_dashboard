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
function MediaPlayer({ variation, onClose, onRefreshPost, onReplaceRequested }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  const [localResolved, setLocalResolved] = useState(!!variation?.feedback_resolved);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    setLocalResolved(!!variation?.feedback_resolved);
  }, [variation?.feedback_resolved]);
  
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
    variation.feedback_resolved = next; // keep modal in sync
    if (typeof onRefreshPost === "function") onRefreshPost(variation.id, next); // bubble update
  }


  useEffect(() => {
    console.log("Variation received:", variation);
    if (!variation) return;

    const fetchSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error("Error fetching session:", error);
      else console.log("Supabase session:", session);
    };
    fetchSession();

    if (!variation?.file_name) return;

    const { data, error } = supabase.storage
      .from("post-variations")
      .getPublicUrl(variation.file_name);

    if (error) {
      console.error("Error fetching media URL:", error);
    } else {
      console.log("Media URL:", data.publicUrl);
      setMediaUrl(data.publicUrl);

      const media = variation.file_name.match(/\.(jpe?g|png|gif|webp)$/i)
        ? new Image()
        : document.createElement("video");

      media.onloadedmetadata = function () {
        setDimensions({
          width: this.naturalWidth || this.videoWidth,
          height: this.naturalHeight || this.videoHeight,
        });
        console.log("Media dimensions set:", this.naturalWidth || this.videoWidth, this.naturalHeight || this.videoHeight);
      };
      media.src = data.publicUrl;
    }
  }, [variation]);

  if (!variation || !mediaUrl) return null;

  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(variation.file_name || "");
  const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(variation.file_name || "");

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

  // DEBUG
  console.log("Feedback value:", variation.feedback);
  const hasFeedback = Boolean(variation.feedback && variation.feedback.trim() !== "");
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
                width: "100%",         // now fill the parent (60vw)
                maxHeight: "70vh",     // keep it within viewport vertically
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
          <p><strong>Platform:</strong> {variation.platform}</p>
          <p><strong>Version:</strong> {variation.test_version || 'N/A'}</p>
        </div>

        {/* Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleDelete}
            className="flex-1 bg-gray-200 text-black py-2 rounded hover:bg-gray-300 transition-colors"
          >
            Delete Variation
          </button>
          <button
            onClick={() => onReplaceRequested && onReplaceRequested(variation)}
            className="flex-1 bg-gray-200 text-black py-2 rounded hover:bg-gray-300 transition-colors">
            Replace Variation
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

//Upload Modal Function
function UploadModal({ postId, artistId, defaultDate, mode = 'new', variation, onClose, onSave }) {
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
  // In replace mode we only need a file; in new mode keep your existing requirements
  if (!file || (mode !== 'replace' && (!platform || !notes))) return;
  setUploading(true);

  try {
    // 🔢 Determine which post to attach to (replace uses the variation's post)
    const targetPostId = mode === 'replace' && variation ? variation.post_id : postId;

    // ⏱️ Compute length if video
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

    // ☁️ Upload (upsert so we can replace files cleanly)
    const filePath = `${artistId}/${targetPostId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('post-variations')
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;

    const fullFilePath = `${artistId}/${targetPostId}/${file.name}`;

    if (mode === 'replace' && variation) {
      // 🔄 UPDATE existing variation with new file path + length
      const { error: updateError } = await supabase
        .from('postvariations')
        .update({
          file_name: fullFilePath,
          length_seconds: lengthSeconds
        })
        .eq('id', variation.id);
      if (updateError) throw updateError;
    } else {
      // ➕ NEW variation (existing behavior)
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

      const { error: insertError } = await supabase
        .from('postvariations')
        .insert([{
          post_id: postId,
          platform,
          file_name: fullFilePath,
          test_version: nextVersion,
          length_seconds: lengthSeconds,
          variation_post_date: variationDate,
          notes
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
const [selectedArtistId, setSelectedArtistId] = useState('')
const [weeks, setWeeks] = useState([])
const [rangeLabel, setRangeLabel] = useState('')
const [errorMsg, setErrorMsg] = useState('')
//const router = useRouter(); //for button links

const [uploadMode, setUploadMode] = useState('new'); // 'new' | 'replace'
const [replaceVariation, setReplaceVariation] = useState(null);
const [allVariations, setAllVariations] = useState([]);
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
    const { data, error } = await supabase.from('artists').select('id,name').order('name')
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

    const postIds = (posts || []).map(p => p.id)

    const { data: variations, error: varError } = await supabase
      .from("postvariations")
      .select(`
        id,
        variation_post_date,
        post_id,
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

    // make variations available in render scope
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
        const postsForDay = (posts || [])
          .filter(p => toYMD(new Date(p.post_date)) === ymd)
        
          const varsForDay = (variations || [])
          // only variations on this day
          .filter(v => toYMD(new Date(v.variation_post_date)) === ymd)
          // exclude variations that fall on the same day as their parent post
          .filter(v => {
            const parent = posts.find(p => p.id === v.post_id)
            if (!parent) return true // fallback if somehow orphaned
            return toYMD(new Date(parent.post_date)) !== ymd
          })
          // now format them for rendering
          .map(v => {
            const parentPost = posts.find(p => p.id === v.post_id)
            if (!parentPost) return null // 👈 skip if not found (filters out Untitleds)
            return {
              id: v.id,
              post_id: v.post_id,
              post_name: `${parentPost.post_name} (var)`,
              status: null,
              isVariation: true
            }
          })
          .filter(Boolean) // removes the nulls
        
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
}, [selectedArtistId, viewMode, selectedMonth, refreshCounter])

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
      .select('id, platform, test_version, file_name, length_seconds, feedback, feedback_resolved')
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
                          ? `${day.date.getDate().toString().padStart(2, '0')}/${(day.date.getMonth()+1).toString().padStart(2,'0')}`
                          : `${day.date.getDate().toString().padStart(2, '0')}/${(day.date.getMonth()+1).toString().padStart(2,'0')}/${day.date.getFullYear()}`
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
                                {post.post_name}

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
          <span className="font-medium">{v.platform}</span> — {v.test_version || "—"}
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