'use client';
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Link from "next/link";

// Helpers
const pad = (n) => String(n).padStart(2, '0')
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

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

function MediaPlayer({ variation, onClose, onRefreshPost }) {
    const [mediaUrl, setMediaUrl] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [feedback, setFeedback] = useState("");   // start empty
    const [savingFeedback, setSavingFeedback] = useState(false);
  
    useEffect(() => {
      if (!variation) return;
  
      // ✅ always sync with latest variation
      setFeedback(variation.feedback || "");
  
      if (!variation.file_name) return;
  
      const { data, error } = supabase.storage
        .from("post-variations")
        .getPublicUrl(variation.file_name);
  
      if (error) {
        console.error("Error fetching media URL:", error);
      } else {
        setMediaUrl(data.publicUrl);
  
        const media = variation.file_name.match(/\.(jpe?g|png|gif|webp)$/i)
          ? new Image()
          : document.createElement("video");
  
        media.onloadedmetadata = function () {
          setDimensions({
            width: this.naturalWidth || this.videoWidth,
            height: this.naturalHeight || this.videoHeight,
          });
        };
        media.src = data.publicUrl;
      }
    }, [variation]);
  
    if (!variation || !mediaUrl) return null;
  
    const isImage = /\.(jpe?g|png|gif|webp)$/i.test(variation.file_name || "");
    const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(variation.file_name || "");
  
    const handleSaveFeedback = async () => {
      setSavingFeedback(true);
      const { data, error } = await supabase
        .from("postvariations")
        .update({ feedback })
        .eq("id", variation.id)
        .select();
  
      setSavingFeedback(false);
  
      if (error) {
        console.error("Error saving feedback:", error);
        alert("Could not save feedback: " + error.message);
      } else {
        console.log("Feedback saved:", data);
        if (onRefreshPost) onRefreshPost();
        alert("Feedback saved!");
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="relative bg-white rounded-lg p-6 max-w-5xl w-full flex gap-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-white bg-black/50 rounded-full p-1"
          >
            ✕
          </button>
  
          {/* Left: Media */}
          <div className="flex-1 flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
            {isImage && (
              <img
                src={mediaUrl}
                alt={variation.file_name}
                className="h-[60h] max-h-[70vh] object-contain"
              />
            )}
            {isVideo && (
              <video controls controlsList="nodownload" className="max-h-[70vh] object-contain">
                <source src={mediaUrl} type="video/mp4" />
              </video>
            )}
            {!isImage && !isVideo && (
              <div className="text-gray-600 p-4">
                Unsupported file type: {variation.file_name}
              </div>
            )}
          </div>
  
          {/* Right: Feedback */}
          <div className="flex-1 flex flex-col">
            <div className="mb-4 text-sm">
              <p>
                <strong>Platform:</strong> {variation.platform}
              </p>
              <p>
                <strong>Version:</strong> {variation.test_version || "N/A"}
              </p>
            </div>
  
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback
            </label>
            <textarea
              className="w-full border rounded p-2 text-sm flex-grow"
              rows={8}
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
   if (!file || !platform || !notes) return;
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
         platform,
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
  case 'assets obtained': return '#F1E68C' // yellow
  case 'uploaded': return '#3b82f6' // blue-500
  case 'ready': return '#10b981' // emerald-500
  case 'posted': return '#9ca3af' // gray-400
  default: return '#d1d5db' // gray-300
}
}

export default function Home() {
const [artists, setArtists] = useState([]) // I think this might be an issue if it's messing with the artist_id of the logged in profile
const [selectedArtistId, setSelectedArtistId] = useState('') //This one too
const [weeks, setWeeks] = useState([])
const [rangeLabel, setRangeLabel] = useState('')
const [errorMsg, setErrorMsg] = useState('')

// Checking width for dates
const [isNarrow, setIsNarrow] = useState(false);

useEffect(() => {
  const handleResize = () => setIsNarrow(window.innerWidth < 800);
  handleResize(); // run once at mount
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

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
  }
  loadPosts()
}, [selectedArtistId, viewMode, selectedMonth])

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
  
      // 2) Fetch variations for that post (✅ now includes feedback)
      const { data: variations, error: varErr } = await supabase
        .from('postvariations')
        .select('id, platform, test_version, file_name, length_seconds, feedback')
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

// Close post details modal
function closeModal() {
  setSelectedPostId(null)
  setPostDetails(null)
  setPostLoading(false)
  setPostError('')
}

return (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Las Aguas Dashboard</h1>
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
  {weeks.map((week, wi) => (
    <div
      key={wi}
      className="border rounded-lg overflow-hidden bg-white shadow-sm"
    >
      <div className="px-4 py-2 bg-gray-50 border-b text-sm font-medium">
        Week of {week.weekStart.toLocaleDateString()}
      </div>

      <div className="grid grid-cols-7 text-xs font-semibold text-gray-600 border-b">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
          <div key={d} className="px-3 py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {week.days.map((day) => (
          <div
            key={day.ymd}
            className={`min-h-[120px] border-l first:border-l-0 border-t-0 p-2 ${
              day.date.toDateString() === new Date().toDateString()
                ? 'bg-[#eef8ea]'  // highlight today
                : ''
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">
              {isNarrow
                ? `${day.date.getDate().toString().padStart(2, '0')}/${(day.date.getMonth()+1).toString().padStart(2,'0')}`
                : `${day.date.getDate().toString().padStart(2, '0')}/${(day.date.getMonth()+1).toString().padStart(2,'0')}/${day.date.getFullYear()}`
              }
            </div>

            <div className="space-y-1">
              {day.posts.map((post) => (
                <div
                  key={post.id}
                  className="text-xs px-2 py-1 rounded text-white cursor-pointer"
                  style={{ backgroundColor: statusColor(post.status) }}
                  title={post.status || ''}
                  onClick={() => openPostDetails(post.id)}
                >
                  {post.post_name}
                </div>
              ))}

            </div>
          </div>
        ))}
      </div>
    </div>
  ))}
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
        <span className="font-medium">{v.platform}</span> — {v.test_version || '—'}
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
    captions={{
      a: postDetails.post?.caption_a,
      b: postDetails.post?.caption_b,
      post_id: postDetails.post?.id   // ✅ add post_id here
    }}
    onClose={() => setShowCaptions(false)}
    onSave={(newCaptions) => {
      // ✅ update parent state so re-opening shows fresh captions
      setPostDetails(prev => ({
        ...prev,
        post: {
          ...prev.post,
          caption_a: newCaptions.a,
          caption_b: newCaptions.b,
        }
      }));
    }}
    />
)}
    {showMediaPlayer && selectedVariation && (
<MediaPlayer
  variation={selectedVariation}
  onClose={() => {
    setShowMediaPlayer(false)
    setSelectedVariation(null)
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