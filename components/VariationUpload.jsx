import { useState } from "react";
import { supabase } from '../lib/supabaseClient'

export default function VariationUpload({ post, onClose, onUploaded }) {
  const [platform, setPlatform] = useState("");
  const [variationDate, setVariationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file || !platform || !variationDate) {
      alert("Please fill in all required fields.");
      return;
    }
    setLoading(true);

    // Get next test version for this post
    const { data: existing } = await supabase
      .from("postvariations")
      .select("test_version")
      .eq("post_id", post.id);

    let nextVersion = "A";
    if (existing && existing.length > 0) {
      const letters = existing.map(v => v.test_version);
      const lastLetter = letters.sort().pop();
      nextVersion = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
    }

    // Build storage path
    const path = `${post.artist_id}/${post.id}/${file.name}`;

    // Upload file to storage
    const { error: uploadError } = await supabase
      .storage
      .from("post-variations")
      .upload(path, file);

    if (uploadError) {
      console.error(uploadError);
      alert("File upload failed.");
      setLoading(false);
      return;
    }

    // Get media length in seconds
    const length_seconds = await getMediaLength(file);

    // Insert row in postvariations
    const { error: insertError } = await supabase
      .from("postvariations")
      .insert([{
        post_id: post.id,
        file_name: path,
        length_seconds,
        test_version: nextVersion,
        platform,
        variation_post_date: variationDate,
        notes
      }]);

    if (insertError) {
      console.error(insertError);
      alert("Database insert failed.");
      setLoading(false);
      return;
    }

    setLoading(false);
    onUploaded();
    onClose();
  };

  const getMediaLength = (file) => {
    return new Promise((resolve) => {
      const media = document.createElement("video");
      media.preload = "metadata";
      media.onloadedmetadata = () => {
        resolve(Math.round(media.duration));
      };
      media.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Upload New Variation</h2>

        <label className="block mb-2">Platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        >
          <option value="">Select platform</option>
          <option value="Instagram">Instagram</option>
          <option value="TikTok">TikTok</option>
          <option value="YouTube">YouTube</option>
          <option value="Facebook">Facebook</option>
        </select>

        <label className="block mb-2">Variation Post Date</label>
        <input
          type="date"
          value={variationDate}
          onChange={(e) => setVariationDate(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />

        <label className="block mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />

        <label className="block mb-2">Upload File</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
