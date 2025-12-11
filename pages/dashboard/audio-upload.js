"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AudioUploadPage() {
  const [artistId, setArtistId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!artistId || !title || !file) {
      setMessage("Artist, title and file are required.");
      return;
    }

    setUploading(true);
    try {
      const artist = Number(artistId);
      if (Number.isNaN(artist)) {
        throw new Error("Artist ID must be a number.");
      }

      // 1) Upload to Supabase Storage (post-variations bucket)
      const path = `audio-library/${artist}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("post-variations")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2) Insert row into audio_library
      const dur =
        durationSeconds && !Number.isNaN(Number(durationSeconds))
          ? Number(durationSeconds)
          : null;

      const { error: insertError } = await supabase
        .from("audio_library")
        .insert([
          {
            artist_id: artist,
            title,
            file_path: path,
            duration_seconds: dur,
          },
        ]);

      if (insertError) throw insertError;

      setMessage("Uploaded and saved to audio_library ✅");
      setTitle("");
      setFile(null);
      setDurationSeconds("");
      (document.getElementById("audio-file-input") || {}).value = "";
    } catch (err) {
      console.error("Audio upload error:", err);
      setMessage(err.message || "Error uploading audio.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#a89ee4]">
      <div className="w-full max-w-md bg-[#bbe1ac] p-6 rounded-2xl shadow-lg">
        <h1 className="text-xl font-bold mb-4 text-center">
          Audio Library Upload
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block mb-1 font-medium">Artist ID</label>
            <input
              type="number"
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              className="w-full border rounded px-2 py-1"
              placeholder="e.g. 8"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Song title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-2 py-1"
              placeholder="Song name"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Audio file (mp3)</label>
            <input
              id="audio-file-input"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="w-full"
            />
            {file && (
              <p className="mt-1 text-xs text-gray-700">{file.name}</p>
            )}
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Duration (seconds, optional)
            </label>
            <input
              type="number"
              min={0}
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
              className="w-full border rounded px-2 py-1"
              placeholder="Leave blank to skip"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-2 rounded-md bg-[#599b40] text-[#33296b] hover:bg-[#a89ee4]"
          >
            {uploading ? "Uploading…" : "Upload to Supabase"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-xs text-[#33296b] text-center">{message}</p>
        )}
      </div>
    </div>
  );
}

