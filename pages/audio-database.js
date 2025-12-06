"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

const navItems = [
  { href: "/calendar", label: "Calendar" },
  { href: "/edit-next", label: "Edit Next" },
  { href: "/leads", label: "Leads" },
  { href: "/stats-view", label: "Stats" },
  { href: "/menu", label: "Home" },
];

export default function AudioDatabasePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [artists, setArtists] = useState([]); // active clients only
  const [audioRows, setAudioRows] = useState([]); // audio_library rows

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Upload modal state
  const [uploadArtistId, setUploadArtistId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadRelease, setUploadRelease] = useState("");
  const [newReleaseName, setNewReleaseName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  // Load artists (active clients) + audio library
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setErrorMsg("");

      try {
        // Only active clients
        const { data: artistData, error: artistErr } = await supabase
          .from("artists")
          .select("id, name, active_client")
          .eq("active_client", true)
          .order("name", { ascending: true });

        if (artistErr) throw artistErr;

        const { data: audioData, error: audioErr } = await supabase
          .from("audio_library")
          .select("id, artist_id, title, file_path, release")
          .order("title", { ascending: true });

        if (audioErr) throw audioErr;

        setArtists(artistData || []);
        setAudioRows(audioData || []);
      } catch (err) {
        console.error("Error loading audio database:", err);
        setErrorMsg("Error loading audio database. Check console for details.");
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  // Group songs by artist
  const audioByArtist = useMemo(() => {
    const map = {};
    for (const row of audioRows) {
      if (!map[row.artist_id]) map[row.artist_id] = [];
      map[row.artist_id].push(row);
    }
    return map;
  }, [audioRows]);

  // Existing releases per artist (distinct release values)
  const releasesByArtist = useMemo(() => {
    const map = {};
    for (const row of audioRows) {
      if (!row.release) continue;
      if (!map[row.artist_id]) map[row.artist_id] = new Set();
      map[row.artist_id].add(row.release);
    }
    // Convert sets to arrays for easier mapping
    const result = {};
    for (const [artistId, setOfReleases] of Object.entries(map)) {
      result[artistId] = Array.from(setOfReleases).sort((a, b) =>
        a.localeCompare(b)
      );
    }
    return result;
  }, [audioRows]);

  const handleOpenUpload = () => {
    setUploadMessage("");
    setUploadTitle("");
    setUploadFile(null);
    setNewReleaseName("");
    setUploadRelease("");

    // Default to first active artist if present
    const first = artists[0];
    setUploadArtistId(first ? String(first.id) : "");

    setUploadOpen(true);
  };

  const handleUploadFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setUploadFile(f);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadMessage("");

    if (!uploadArtistId || !uploadTitle || !uploadFile) {
      setUploadMessage("Artist, song title and audio file are required.");
      return;
    }

    setUploading(true);
    try {
      const artistIdNum = Number(uploadArtistId);
      if (Number.isNaN(artistIdNum)) {
        throw new Error("Selected artist is invalid.");
      }

      // Determine final release text
      let finalRelease = null;
      if (uploadRelease === "NEW") {
        const name = newReleaseName.trim();
        if (!name) {
          throw new Error("Please enter a name for the new release.");
        }
        finalRelease = name;
      } else if (uploadRelease) {
        finalRelease = uploadRelease;
      }

      // Upload file to Storage
      const safeName = uploadFile.name.replace(/\s+/g, "-");
      const path = `audio-library/${artistIdNum}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from("post-variations")
        .upload(path, uploadFile, { upsert: true });

      if (uploadErr) throw uploadErr;

      // Insert into audio_library with release text
      const { data: inserted, error: insertErr } = await supabase
        .from("audio_library")
        .insert([
          {
            artist_id: artistIdNum,
            title: uploadTitle,
            file_path: path,
            release: finalRelease,
          },
        ])
        .select("id, artist_id, title, file_path, release")
        .single();

      if (insertErr) throw insertErr;

      setAudioRows((prev) => [...prev, inserted]);

      setUploadMessage("Uploaded and saved ✅");
      setUploadTitle("");
      setUploadFile(null);
      setNewReleaseName("");
      setUploadRelease("");
      (document.getElementById("audio-upload-file-input") || {}).value = "";
    } catch (err) {
      console.error("Audio upload error:", err);
      setUploadMessage(err.message || "Error uploading audio.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#a89ee4] flex justify-center">
      <div className="w-full max-w-6xl p-4 md:p-8 relative">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-[#33286a]">
            Audio Database
          </h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenUpload}
              className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
            >
              Upload music
            </button>
            {/* Menu bubble */}
            <div className="relative">
              <button
                type="button"
                className="rounded-full bg-[#bbe1ac] shadow-lg border border-white p-2 flex flex-col justify-center items-center"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <span className="block w-5 h-0.5 bg-[#33286a] mb-1" />
                <span className="block w-5 h-0.5 bg-[#33286a] mb-1" />
                <span className="block w-3 h-0.5 bg-[#33286a]" />
              </button>

              {menuOpen && (
                <aside className="absolute right-0 top-10 z-40 w-56 bg-[#bbe1ac] rounded-2xl shadow-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Menu</h2>
                    <button
                      type="button"
                      className="text-xs text-[#33286a]"
                      onClick={() => setMenuOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {navItems.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block w-full rounded-lg bg-[#eef8ea] px-3 py-2 text-sm font-medium hover:bg-white hover:shadow"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 text-sm text-red-700 bg-white/70 rounded-xl px-4 py-3">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-800 bg-[#bbe1ac] rounded-2xl shadow-lg px-4 py-6">
            Loading audio database…
          </div>
        ) : (
          <div className="space-y-4">
            {artists.length === 0 ? (
              <div className="bg-[#bbe1ac] rounded-2xl shadow-lg px-4 py-6 text-sm">
                No active clients yet. Make sure{" "}
                <code className="text-xs bg-white/60 px-1 rounded">
                  artists.active_client
                </code>{" "}
                is set to <strong>true</strong> for the artists you want to see.
              </div>
            ) : (
              artists.map((artist) => {
                const rows = audioByArtist[artist.id] || [];

                // Group by release text (null/empty => "Singles / Unassigned")
                const grouped = {};
                for (const row of rows) {
                  const key = row.release && row.release.trim().length
                    ? row.release
                    : "__none__";
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(row);
                }

                const groups = Object.entries(grouped).sort(([a], [b]) => {
                  if (a === "__none__") return -1;
                  if (b === "__none__") return 1;
                  return a.localeCompare(b);
                });

                return (
                  <details
                    key={artist.id}
                    className="bg-[#bbe1ac] rounded-2xl shadow-lg"
                  >
                    <summary className="cursor-pointer px-4 py-3 flex items-center justify-between">
                      <span className="font-semibold text-[#33286a]">
                        {artist.name}
                      </span>
                      <span className="text-xs text-gray-700">
                        {rows.length} track{rows.length === 1 ? "" : "s"}
                      </span>
                    </summary>
                    <div className="border-t border-[#a1c596] px-4 py-3 text-sm space-y-3">
                      {groups.length === 0 ? (
                        <p className="text-xs text-gray-700">
                          No audio uploaded yet for this artist.
                        </p>
                      ) : (
                        groups.map(([releaseKey, tracks]) => {
                          const releaseName =
                            releaseKey === "__none__"
                              ? "Singles / Unassigned"
                              : releaseKey;
                          return (
                            <div
                              key={releaseKey}
                              className="bg-[#eef8ea] rounded-xl p-3"
                            >
                              <div className="font-semibold text-xs text-gray-800 mb-2">
                                {releaseName}
                              </div>
                              <ul className="space-y-1 text-xs text-gray-800">
                                {tracks.map((track) => (
                                  <li
                                    key={track.id}
                                    className="flex items-center justify-between"
                                  >
                                    <span>{track.title}</span>
                                    <a
                                      href={
                                        supabase.storage
                                          .from("post-variations")
                                          .getPublicUrl(track.file_path).data
                                          .publicUrl
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] text-blue-700 underline"
                                    >
                                      open
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </details>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button
              type="button"
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setUploadOpen(false)}
            >
              ✕
            </button>
            <h2 className="text-lg font-bold mb-4 text-[#33286a]">
              Upload music
            </h2>
            <form onSubmit={handleUploadSubmit} className="space-y-4 text-sm">
              {/* Artist select by name */}
              <div>
                <label className="block mb-1 font-medium">Artist</label>
                <select
                  value={uploadArtistId}
                  onChange={(e) => {
                    setUploadArtistId(e.target.value);
                    setUploadRelease("");
                    setNewReleaseName("");
                  }}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">Select an artist…</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Song title */}
              <div>
                <label className="block mb-1 font-medium">Song title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="Song name"
                />
              </div>

              {/* Audio file */}
              <div>
                <label className="block mb-1 font-medium">Audio file (mp3)</label>
                <input
                  id="audio-upload-file-input"
                  type="file"
                  accept="audio/*"
                  onChange={handleUploadFileChange}
                  className="w-full"
                />
                {uploadFile && (
                  <p className="mt-1 text-xs text-gray-700">
                    {uploadFile.name}
                  </p>
                )}
              </div>

              {/* Album / EP (release) */}
              <div>
                <label className="block mb-1 font-medium">
                  Album / EP (optional)
                </label>
                <select
                  value={uploadRelease}
                  onChange={(e) => {
                    setUploadRelease(e.target.value);
                    if (e.target.value !== "NEW") {
                      setNewReleaseName("");
                    }
                  }}
                  className="w-full border rounded px-2 py-1"
                  disabled={!uploadArtistId}
                >
                  <option value="">No release / Single</option>
                  {(releasesByArtist[uploadArtistId] || []).map((relName) => (
                    <option key={relName} value={relName}>
                      {relName}
                    </option>
                  ))}
                  <option value="NEW">+ Add release…</option>
                </select>
                {uploadRelease === "NEW" && (
                  <input
                    type="text"
                    value={newReleaseName}
                    onChange={(e) => setNewReleaseName(e.target.value)}
                    className="w-full border rounded px-2 py-1 mt-2 text-xs"
                    placeholder="New album / EP name"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2 rounded-md bg-[#599b40] text-[#33296b] hover:bg-[#a89ee4]"
              >
                {uploading ? "Uploading…" : "Upload to Supabase"}
              </button>

              {uploadMessage && (
                <p className="mt-2 text-xs text-[#33296b] text-center">
                  {uploadMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
