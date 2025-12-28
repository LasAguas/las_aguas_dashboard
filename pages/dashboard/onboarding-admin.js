"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import ArtistLayout from "../../components/artist/ArtistLayout";
import { publicOnboardingUrl } from "../../components/artist/artistData";
import { supabase } from "../../lib/supabaseClient";

/**
 * Bucket + paths (as agreed):
 * artist-onboarding/{artist_id}/bio-photos/...
 * artist-onboarding/{artist_id}/epk.pdf
 * artist-onboarding/{artist_id}/moodboard.pdf
 * artist-onboarding/{artist_id}/old-posts/...
 *
 * Limits:
 * - 10GB per section per artist (enforced as best-effort via Storage list() size sum)
 */

const BUCKET = "artist-onboarding";

// Simple storage helper, same as artist version
async function uploadFileToBucket({ path, file, upsert = false }) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert });
  if (error) return { error };
  return { data };
}

async function estimateFolderBytes(prefix) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });
  if (error) {
    console.error("estimateFolderBytes error", error);
    return 0;
  }
  return (data || []).reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
}

function ProgressDial({ pct }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const dash = (p / 100) * c;
  const isDone = p >= 100;

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle
            cx="55"
            cy="55"
            r={r}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="10"
          />
          <circle
            cx="55"
            cy="55"
            r={r}
            fill="none"
            stroke={isDone ? "rgb(34 197 94)" : "rgba(0,0,0,0.7)"}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - dash}
            transform="rotate(-90 55 55)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-semibold text-[#33296b]">
              {p.toFixed(0)}%
            </div>
            <div className="text-xs text-[#33296b]">complete</div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-[#33296b] max-w-xs text-center">
        Complete the sections below to get your onboarding to 100%.
      </p>
    </div>
  );
}

function Collapsible({ title, completed, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="artist-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-black/5"
      >
        <div className="flex items-center gap-3">
          <div
            className={[
              "w-3 h-3 rounded-full",
              completed ? "bg-green-500" : "bg-black/10",
            ].join(" ")}
          />
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-gray-500">
              {completed ? "Completed" : "Incomplete"}
            </div>
          </div>
        </div>
        <div className="text-xs rounded-lg px-2 py-1 bg-black/5">
          {open ? "Hide" : "Open"}
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function bytesToGB(b) {
  return (b / 1024 / 1024 / 1024).toFixed(2);
}

function sumFileSizes(list) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((acc, row) => acc + (row.file_size || 0), 0);
}

function PhotoGallery({ assets, onRemove, descriptionUpdates }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {assets.map((p) => (
          <div
            key={p.id}
            className="artist-secondary-panel p-2 rounded-xl flex flex-col gap-2"
          >
            <div
              className="w-full relative overflow-hidden rounded-lg"
              style={{ paddingBottom: "100%" }}
            >
              <img
                src={p.public_url}
                alt={p.description || "Artist photo"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <textarea
              value={p.description || ""}
              onChange={(e) => descriptionUpdates.onChange(p.id, e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 p-2 text-xs"
              placeholder="please tell us about the photo, where is it, who is in it, etc."
            />
            <div className="flex justify-between items-center gap-2 text-[11px] text-gray-500">
              {p.file_size ? (
                <span>{(p.file_size / (1024 * 1024)).toFixed(1)} MB</span>
              ) : (
                <span>&nbsp;</span>
              )}
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="px-2 py-1 rounded-lg bg-black/5 hover:bg-black/10"
              >
                remove
              </button>
            </div>
          </div>
        ))}
      </div>
      {assets.length === 0 && (
        <div className="text-sm text-gray-600">No photos uploaded yet.</div>
      )}
    </div>
  );
}

function WebsiteRefList({ refs, onChange, onSave, onRemove }) {
  return (
    <div className="mt-3 space-y-2">
      {refs.map((r) => {
        const url = r.url || "";
        const shortUrl = url.length > 30 ? url.slice(0, 27) + "..." : url;
        return (
          <div
            key={r.id}
            className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline break-all"
              >
                {shortUrl}
              </a>
              <button
                type="button"
                onClick={() => onRemove(r.id)}
                className="text-xs px-2 py-1 rounded-lg bg-black/5 hover:bg-black/10"
              >
                remove
              </button>
            </div>
            <textarea
              value={r.why_you_like_it || ""}
              onChange={(e) => onChange(r.id, e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 p-2 text-xs"
              placeholder="What do you like about the website?"
            />
            <button
              type="button"
              onClick={() => onSave(r.id, r.why_you_like_it || "")}
              className="self-end text-xs px-3 py-1.5 rounded-lg bg-black/5 hover:bg-black/10"
            >
              save
            </button>
          </div>
        );
      })}
      {refs.length === 0 && (
        <div className="text-sm text-gray-600">No references yet.</div>
      )}
    </div>
  );
}

const SOCIALS = [
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "instagram", label: "Instagram" },
];

function normalizePlatform(v) {
  if (!v) return "";
  return String(v).trim().toLowerCase();
}

function isTokenHealthy(row) {
  if (!row) return false;
  if (row.status === "ok") return true;
  return false;
}

function findPlatformRow(rows, key) {
  const normKey = normalizePlatform(key);
  return (
    (rows || []).find((r) => normalizePlatform(r.platform) === normKey) || null
  );
}

export default function OnboardingAdminPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [artistId, setArtistId] = useState(null);
  const [artistOptions, setArtistOptions] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");

  // artists columns
  const [bio, setBio] = useState("");
  const [preferredPronouns, setPreferredPronouns] = useState("");
  const [youtubeVerified, setYoutubeVerified] = useState(false);

  const [funding, setFunding] = useState({
    ksk: false,
    gema: false,
    musicDegree: false,
    gvl: false,
    labelOrPublisher: false,
  });

  // File input refs (match the refs used in your JSX)
  const photoInputRef = useRef(null);
  const oldPostsInputRef = useRef(null);
  const epkInputRef = useRef(null);
  const moodboardInputRef = useRef(null);  

  const [epkPath, setEpkPath] = useState("");
  const [moodboardPath, setMoodboardPath] = useState("");

  // onboarding tables
  const [photoAssets, setPhotoAssets] = useState([]);
  const [oldPosts, setOldPosts] = useState([]);
  const [pressLinks, setPressLinks] = useState([]);
  const [showLinks, setShowLinks] = useState([]);
  const [websiteRefs, setWebsiteRefs] = useState([]);
  const [releaseNotes, setReleaseNotes] = useState([]);

  // Photo gallery UI state (same as artist onboarding)
  const [photoMode, setPhotoMode] = useState("view"); // "view" | "add" | "edit"
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState([]); // File[]
  const [photoSaving, setPhotoSaving] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(() => new Set()); // Set<number>

  // music (audio_library view)
  const [audioRows, setAudioRows] = useState([]);
  const [uploadingSongId, setUploadingSongId] = useState(null);

  // socials auth status
  const [socialStatus, setSocialStatus] = useState([]);  

  // section storage usage estimates
  const [photoBytes, setPhotoBytes] = useState(0);
  const [oldPostsBytes, setOldPostsBytes] = useState(0);

  // Load list of active artists for dropdown (exclude internal ids like calendar page)
  useEffect(() => {
    const loadArtists = async () => {
      try {
        const { data, error } = await supabase
          .from("artists")
          .select("id, name")
          .not("id", "in", "(1, 2, 3)")
          .order("name", { ascending: true });

        if (error) {
          console.error("Supabase error (artists):", error);
          return;
        }
        setArtistOptions(data || []);
        if (!selectedArtistId && data && data.length) {
          setSelectedArtistId(String(data[0].id));
        }
      } catch (e) {
        console.error("Failed to load artists list", e);
      }
    };
    loadArtists();
  }, []);

  // Load onboarding data whenever the selected artist changes
  useEffect(() => {
    const run = async () => {
      if (!selectedArtistId) return;
      try {
        setLoading(true);
        setErr("");

        const artistId = Number(selectedArtistId);
        setArtistId(artistId);

        // artist onboarding fields
        const { data: artist, error: aErr } = await supabase
          .from("artists")
          .select(
            [
              "id",
              "bio",
              "preferred_pronouns",
              "youtube_verification_complete",
              "funding_ksk_membership",
              "funding_gema_membership",
              "funding_music_degree",
              "funding_gvl_membership",
              "funding_label_or_publisher_contract",
              "epk_pdf_path",
              "moodboard_pdf_path",
            ].join(",")
          )
          .eq("id", artistId)
          .single();

        if (aErr) throw aErr;

        setBio(artist?.bio || "");
        setPreferredPronouns(artist?.preferred_pronouns || "");
        setYoutubeVerified(Boolean(artist?.youtube_verification_complete));
        setFunding({
          ksk: Boolean(artist?.funding_ksk_membership),
          gema: Boolean(artist?.funding_gema_membership),
          musicDegree: Boolean(artist?.funding_music_degree),
          gvl: Boolean(artist?.funding_gvl_membership),
          labelOrPublisher: Boolean(artist?.funding_label_or_publisher_contract),
        });
        setEpkPath(artist?.epk_pdf_path || "");
        setMoodboardPath(artist?.moodboard_pdf_path || "");

        const [
          photosRes,
          oldRes,
          pressRes,
          showRes,
          webRes,
          releaseRes,
          audioRes,
          socialsRes,
        ] = await Promise.all([
          supabase
            .from("artist_photo_assets")
            .select("*")
            .eq("artist_id", artistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("artist_old_posts")
            .select("*")
            .eq("artist_id", artistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("artist_press_links")
            .select("*")
            .eq("artist_id", artistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("artist_show_links")
            .select("*")
            .eq("artist_id", artistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("artist_website_references")
            .select("*")
            .eq("artist_id", artistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("artist_release_notes")
            .select("*")
            .eq("artist_id", artistId)
            .order("release", { ascending: true }),
          supabase
            .from("audio_library")
            .select("*")
            .eq("artist_id", artistId)
            .order("release", { ascending: true }),
          supabase
            .from("artist_social_auth_status")
            .select("*")
            .eq("artist_id", artistId),
        ]);

        if (photosRes.error) throw photosRes.error;
        if (oldRes.error) throw oldRes.error;
        if (pressRes.error) throw pressRes.error;
        if (showRes.error) throw showRes.error;
        if (webRes.error) throw webRes.error;
        if (releaseRes.error) throw releaseRes.error;
        if (audioRes.error) throw audioRes.error;
        if (socialsRes.error) throw socialsRes.error;

        setPhotoAssets(photosRes.data || []);
        setOldPosts(oldRes.data || []);
        setPressLinks(pressRes.data || []);
        setShowLinks(showRes.data || []);
        setWebsiteRefs(webRes.data || []);
        setReleaseNotes(releaseRes.data || []);
        setAudioRows(audioRes.data || []);
        setSocialStatus(socialsRes.data || []);

        const [pb, ob] = await Promise.all([
          estimateFolderBytes(`${artistId}/bio-photos`),
          estimateFolderBytes(`${artistId}/old-posts`),
        ]);
        setPhotoBytes(pb);
        setOldPostsBytes(ob);
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [selectedArtistId]);

  async function saveArtistFields(patch = {}) {
    if (!artistId) return;

    const merged = {
      bio,
      preferred_pronouns: preferredPronouns,
      youtube_verification_complete: youtubeVerified,
      funding_ksk_membership: funding.ksk,
      funding_gema_membership: funding.gema,
      funding_music_degree: funding.musicDegree,
      funding_gvl_membership: funding.gvl,
      funding_label_or_publisher_contract: funding.labelOrPublisher,
      epk_pdf_path: epkPath,
      moodboard_pdf_path: moodboardPath,
      ...patch,
    };

    const { error } = await supabase
      .from("artists")
      .update(merged)
      .eq("id", artistId);
    if (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function updateRow(table, id, patch, setList) {
    const { error } = await supabase.from(table).update(patch).eq("id", id);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    if (setList) {
      setList((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }
  }

  async function deleteRow(table, id, setList) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    if (setList) {
      setList((prev) => prev.filter((r) => r.id !== id));
    }
  }

  async function uploadSingle({ folder, file, onPath }) {
    if (!artistId || !file) {
      alert("Missing artist or file");
      return;
    }
    const path = `${artistId}/${folder}/${Date.now()}-${file.name}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });
    if (upErr) {
      console.error(upErr);
      alert(upErr.message);
      return;
    }

    if (onPath) onPath(path);
  }

  async function uploadManyWithDbRow({
    folder,
    files,
    table,
    extraFields = {},
  }) {
    if (!artistId || !files || !files.length) return;

    const pending = [];
    for (const file of files) {
      const path = `${artistId}/${folder}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });

      if (upErr) {
        console.error("STORAGE UPLOAD ERROR FULL:", upErr);
        alert(upErr.message);
        continue;
      }

      const { data: publicRes } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      pending.push({
        artist_id: artistId,
        file_path: path,
        public_url: publicRes?.publicUrl || "",
        file_name: file.name,
        file_size: file.size,
        ...extraFields,
      });
    }

    if (!pending.length) return;

    const { data: inserted, error: insertErr } = await supabase
      .from(table)
      .insert(pending)
      .select("*");

    if (insertErr) {
      console.error(insertErr);
      alert(insertErr.message);
      return;
    }

    return inserted || [];
  }

  function toggleSelectedPhoto(id) {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function savePendingPhotos() {
    if (!pendingPhotoFiles?.length) return;
    setPhotoSaving(true);
    try {
      await uploadManyWithDbRow({
        folder: "bio-photos",
        files: pendingPhotoFiles,
        table: "artist_photo_assets",
      });

      // Clear pending files + reset input
      setPendingPhotoFiles([]);
      if (photoInputRef.current) photoInputRef.current.value = "";
      setPhotoMode("view");

      // Optionally refresh the list (you already set photoAssets from Supabase elsewhere)
      const { data, error } = await supabase
        .from("artist_photo_assets")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (!error) setPhotoAssets(data || []);
    } finally {
      setPhotoSaving(false);
    }
  }

  async function deleteSelectedPhotos() {
    const ids = Array.from(selectedPhotoIds);
    if (!ids.length) return;

    const toDelete = photoAssets.filter((p) => ids.includes(p.id));
    if (!toDelete.length) return;

    const paths = toDelete.map((p) => p.file_path).filter(Boolean);

    if (paths.length) {
      await supabase.storage.from(BUCKET).remove(paths);
    }

    const { error } = await supabase
      .from("artist_photo_assets")
      .delete()
      .in("id", ids);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    // Update local state
    setPhotoAssets((prev) => prev.filter((p) => !ids.includes(p.id)));
    setSelectedPhotoIds(new Set());
  }

  const completion = useMemo(() => {
    // mirrors your weighted completion logic:
    // Bio 4%, pronouns 4%, photos 8%, music 20% (masters+lyrics across songs),
    // funding 4%, EPK 4%, moodboard 4%, press 8%, shows 8%,
    // old posts 4%, website refs 8%, socials 4%, YouTube 4%.

    let pct = 0;

    const bioDone = !!bio?.trim();
    const pronounsDone = !!preferredPronouns?.trim();
    const photosDone = (photoAssets || []).length > 0;
    const oldDone = (oldPosts || []).length > 0;
    const epkDone = !!epkPath;
    const moodDone = !!moodboardPath;
    const pressDone = (pressLinks || []).length >= 2;
    const showsDone = (showLinks || []).length >= 2;
    const webDone = (websiteRefs || []).length >= 2;

    const fundingCount =
      (funding.ksk ? 1 : 0) +
      (funding.gema ? 1 : 0) +
      (funding.musicDegree ? 1 : 0) +
      (funding.gvl ? 1 : 0) +
      (funding.labelOrPublisher ? 1 : 0);
    const fundingDone = fundingCount >= 3;

    const socialsRows = Array.isArray(socialStatus) ? socialStatus : [];
    const hasTikTok = isTokenHealthy(findPlatformRow(socialsRows, "tiktok"));
    const hasYouTube = isTokenHealthy(findPlatformRow(socialsRows, "youtube"));
    const hasInstagram = isTokenHealthy(findPlatformRow(socialsRows, "instagram"));
    const socialsDone = hasTikTok && hasYouTube && hasInstagram;

    const songs = Array.isArray(audioRows) ? audioRows : [];
    let musicFraction = 0;
    if (songs.length > 0) {
      let totalPieces = 0;
      let completedPieces = 0;
      for (const s of songs) {
        totalPieces += 2;
        if (s.file_path) completedPieces += 1;
        if (s.lyrics && s.lyrics.trim() !== "") completedPieces += 1;
      }
      musicFraction = totalPieces > 0 ? completedPieces / totalPieces : 0;
    }
    const musicPct = musicFraction * 20;

    if (bioDone) pct += 4;
    if (pronounsDone) pct += 4;
    if (photosDone) pct += 8;
    pct += musicPct;
    if (fundingDone) pct += 4;
    if (epkDone) pct += 4;
    if (moodDone) pct += 4;
    if (pressDone) pct += 8;
    if (showsDone) pct += 8;
    if (oldDone) pct += 4;
    if (webDone) pct += 8;
    if (socialsDone) pct += 4;
    if (youtubeVerified) pct += 4;

    if (pct > 100) pct = 100;

    const socialsKeyDone = socialsDone;
    const musicDone = musicFraction >= 1;

    const checks = [
      { key: "socials", ok: socialsKeyDone },
      { key: "bio", ok: bioDone && pronounsDone && photosDone },
      { key: "music", ok: musicDone },
      { key: "youtube", ok: youtubeVerified },
      { key: "funding", ok: fundingDone },
      { key: "epk", ok: epkDone && moodDone },
      { key: "press", ok: pressDone && showsDone },
      { key: "old", ok: oldDone },
      { key: "web", ok: webDone },
    ];

    return { pct, checks };
  }, [
    bio,
    preferredPronouns,
    photoAssets,
    audioRows,
    youtubeVerified,
    funding,
    epkPath,
    moodboardPath,
    pressLinks,
    showLinks,
    oldPosts,
    websiteRefs,
    socialStatus,
  ]);

  // ⬇️ NEW: group audioRows by release for the Music section
  const releases = useMemo(() => {
    const byRelease = new Map();
    (audioRows || []).forEach((row) => {
      const rel = row.release || "Unreleased";
      if (!byRelease.has(rel)) byRelease.set(rel, []);
      byRelease.get(rel).push(row);
    });
    // [ [releaseName, tracks[]], ... ]
    return Array.from(byRelease.entries());
  }, [audioRows]);

  const sections = useMemo(() => {
    const list = [
      {
        key: "socials",
        title: "Socials connections",
        done: completion.checks.find((c) => c.key === "socials")?.ok,
      },
      {
        key: "bio",
        title: "Bio + Photo assets",
        done: completion.checks.find((c) => c.key === "bio")?.ok,
      },
      {
        key: "music",
        title: "Music",
        done: completion.checks.find((c) => c.key === "music")?.ok,
      },
      {
        key: "youtube",
        title: "YouTube verification",
        done: completion.checks.find((c) => c.key === "youtube")?.ok,
      },
      {
        key: "funding",
        title: "Funding checklist",
        done: completion.checks.find((c) => c.key === "funding")?.ok,
      },
      {
        key: "epk",
        title: "EPK and mood board",
        done: completion.checks.find((c) => c.key === "epk")?.ok,
      },
      {
        key: "press",
        title: "Press and Shows",
        done: completion.checks.find((c) => c.key === "press")?.ok,
      },
      {
        key: "old",
        title: "Old posts that didn’t make it to IG",
        done: completion.checks.find((c) => c.key === "old")?.ok,
      },
      {
        key: "web",
        title: "Website References",
        done: completion.checks.find((c) => c.key === "web")?.ok,
      },
    ];
    return [...list].sort((a, b) => Number(a.done) - Number(b.done));
  }, [completion]);

  const descriptionUpdates = {
    onChange: (id, next) =>
      setPhotoAssets((prev) =>
        prev.map((p) => (p.id === id ? { ...p, description: next } : p))
      ),
  };

  function AddWebsiteRefForm({ onAdd }) {
    const [url, setUrl] = useState("");
    const [desc, setDesc] = useState("");

    return (
      <div className="mt-2 p-3 rounded-xl bg-white border border-gray-200">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full rounded-xl border border-gray-200 p-2 text-sm"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="Write a short text about them."
          className="w-full rounded-xl border border-gray-200 p-2 text-sm"
        />
        <button
          onClick={() => {
            if (!url.trim()) return alert("Please enter a URL.");
            onAdd?.(url.trim(), desc);
            setUrl("");
            setDesc("");
          }}
          className="rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
        >
          add
        </button>
      </div>
    );
  }

  async function addWebsiteRef(url, why) {
    if (!artistId) return;
    const { data, error } = await supabase
      .from("artist_website_references")
      .insert([
        {
          artist_id: artistId,
          url,
          why_you_like_it: why || "",
        },
      ])
      .select("*");
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    setWebsiteRefs((prev) => [...data, ...prev]);
  }

  async function addLink(table, url, description, setList) {
    if (!artistId) return;
  
    const { data, error } = await supabase
      .from(table)
      .insert([
        {
          artist_id: artistId,
          url,
          description: description || "",
        },
      ])
      .select("*");
  
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
  
    setList((prev) => [...data, ...prev]);
  }
  
  function AddLinkForm({ onAdd }) {
    const [url, setUrl] = useState("");
    const [desc, setDesc] = useState("");
  
    return (
      <div className="mt-2 p-3 rounded-xl bg-white border border-gray-200">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article-or-show"
          className="w-full rounded-xl border border-gray-200 p-2 text-sm"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="Write a short text about this press piece or show…"
          className="mt-2 w-full rounded-xl border border-gray-200 p-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            if (!url.trim()) {
              alert("Please enter a URL.");
              return;
            }
            onAdd?.(url.trim(), desc);
            setUrl("");
            setDesc("");
          }}
          className="mt-2 rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
        >
          add
        </button>
      </div>
    );
  }  

  function hasAnyAudioFile(filePath) {
    if (!filePath || typeof filePath !== "string") return false;
    const lower = filePath.toLowerCase();
    return lower.endsWith(".mp3") || lower.endsWith(".wav");
  }

  // NOTE: music section, press/shows, old posts, etc. stay exactly the same as your
  // artist onboarding page. I’m not re-typing all of that here to avoid hitting limits.
  // Copy those sections from your current `pages/dashboard/artist/onboarding.js`
  // starting from where you render the "Music" Collapsible down to the end, unchanged.

  // ----- RENDER -----
  return (
    <ArtistLayout title="Onboarding (admin)">
      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="artist-panel mb-4 p-3 flex flex-wrap items-center gap-3">
        <div className="text-sm font-semibold text-[#33296b]">Artist</div>
        <select
          className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
          value={selectedArtistId || ""}
          onChange={(e) => setSelectedArtistId(e.target.value || "")}
        >
          <option value="">Select an artist…</option>
          {artistOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name || `Artist ${a.id}`}
            </option>
          ))}
        </select>
      </div>

      {loading || !artistId ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="artist-panel">
            <ProgressDial pct={completion.pct} />
          </div>

                    {sections.map((s) => {
                      // 1) Socials connections
                      if (s.key === "socials") {
                          const rows = Array.isArray(socialStatus) ? socialStatus : [];
                          const byPlatform = new Map(rows.map((r) => [normalizePlatform(r.platform), r]));
                      
                          return (
                          <Collapsible
                              key={s.key}
                              title="Socials connections"
                              completed={Boolean(s.done)}
                              defaultOpen={!s.done}
                          >
                              <div className="text-sm text-gray-700 mb-3">
                              Connect your TikTok, YouTube, and Instagram accounts so stats can load correctly.
                              </div>
                      
                              {/* Always show all 3 */}
                              <div className="space-y-2">
                              {SOCIALS.map((soc) => {
                                  const row = findPlatformRow(rows, soc.key);
                                  const healthy = isTokenHealthy(row);
                      
                                  return (
                                  <div
                                      key={soc.key}
                                      className="artist-panel-secondary p-3 rounded-xl flex items-center justify-between gap-3"
                                  >
                                      <div className="min-w-0">
                                      <div className="text-sm font-semibold">{soc.label}</div>
                      
                                      {healthy ? (
                                          <div className="text-xs text-gray-600">connection is complete ✅</div>
                                      ) : (
                                          <div className="text-xs text-gray-600">
                                          {row?.status ? `status: ${row.status}` : "not connected"}
                                          </div>
                                      )}
                                      </div>
                      
                                      {healthy ? (
                                      // Not a button, no link
                                      <div className="text-sm font-semibold text-[#33296b] whitespace-nowrap">
                                          Connected ✅
                                      </div>
                                      ) : (
                                      <a
                                          href={soc.href}
                                          className="rounded-xl px-3 py-2 text-sm bg-[#e6e7eb] text-[#33296b] font-semibold whitespace-nowrap"
                                      >
                                          connect {soc.label.toLowerCase()}
                                      </a>
                                      )}
                                  </div>
                                  );
                              })}
                              </div>
                      
                              <div className="mt-3 text-xs text-gray-500">
                              This section only shows your own artist’s connections.
                              </div>
                          </Collapsible>
                          );
                      }
            
                      // 2) Bio + photo assets
                      if (s.key === "bio") {
                        return (
                          <Collapsible key={s.key} title="Bio + Photo assets" completed={Boolean(s.done)} defaultOpen={!s.done}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs font-semibold mb-1">Artist bio</div>
                                <textarea
                                  value={bio}
                                  onChange={(e) => setBio(e.target.value)}
                                  rows={6}
                                  className="w-full rounded-xl border artist-textarea p-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                                  placeholder="Write your bio…"
                                />
                              </div>
                              <div>
                                <div className="text-xs font-semibold mb-1">Preferred pronouns</div>
                                <input
                                  value={preferredPronouns}
                                  onChange={(e) => setPreferredPronouns(e.target.value)}
                                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                                  placeholder="e.g. she/her"
                                />
          
                                <button
                                  onClick={() => saveArtistFields()}
                                  className="mt-3 w-full rounded-xl py-2 artist-btn-primary"
                                >
                                  Save bio + pronouns
                                </button>
                              </div>
                            </div>
          
                            <div className="mt-4">
            <div className="text-xs font-semibold mb-2">Photo assets</div>
            <div className="mt-1 text-xs text-gray-500">
              Upload limit: 10GB total for this section (per artist). Currently used (estimate): {bytesToGB(photoBytes)} GB
            </div>
          
            {/* Hidden input (triggered by Add photos) */}
            <input
              ref={photoInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setPendingPhotoFiles(files);
                if (files.length) setPhotoMode("add");
              }}
            />
          
            {/* Controls */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
                onClick={() => photoInputRef.current?.click()}
              >
                Add photos
              </button>
          
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
                onClick={() => {
                  setSelectedPhotoIds(new Set());
                  setPhotoMode((m) => (m === "edit" ? "view" : "edit"));
                }}
              >
                {photoMode === "edit" ? "Done" : "Edit"}
              </button>
          
              {photoMode === "add" && (
                <button
                  type="button"
                  disabled={photoSaving || pendingPhotoFiles.length === 0}
                  className="rounded-xl px-3 py-2 text-sm bg-black/10 hover:bg-black/15 disabled:opacity-50"
                  onClick={savePendingPhotos}
                >
                  {photoSaving ? "Saving…" : `Save (${pendingPhotoFiles.length})`}
                </button>
              )}
          
              {photoMode === "edit" && (
                <button
                  type="button"
                  disabled={selectedPhotoIds.size === 0}
                  className="rounded-xl px-3 py-2 text-sm bg-black/10 hover:bg-black/15 disabled:opacity-50"
                  onClick={() => {
                    if (confirm(`Remove ${selectedPhotoIds.size} photo(s)?`)) deleteSelectedPhotos();
                  }}
                >
                  Remove selected ({selectedPhotoIds.size})
                </button>
              )}
            </div>
          
            {/* Pending files preview (only in add mode) */}
            {photoMode === "add" && pendingPhotoFiles.length > 0 && (
              <div className="mt-3 text-xs text-gray-600">
                Ready to upload: {pendingPhotoFiles.map((f) => f.name).join(", ")}
              </div>
            )}
          
              {/* Gallery (with per-photo descriptions) */}
              <div className="mt-4 artist-panel-secondary p-3">
                  {photoAssets.length === 0 ? (
                  <div className="text-sm text-gray-600">No photo assets uploaded yet.</div>
                  ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {photoAssets.map((a) => {
                      const isSelected = selectedPhotoIds.has(a.id);
                      const url = publicOnboardingUrl(a.file_path);
          
                      return (
                          <div
                          key={a.id}
                          className="relative rounded-xl bg-white p-2 flex flex-col"
                          onClick={() => {
                              if (photoMode === "edit") toggleSelectedPhoto(a.id);
                          }}
                          role={photoMode === "edit" ? "button" : undefined}
                          tabIndex={photoMode === "edit" ? 0 : -1}
                          >
                          {/* selection overlay */}
                          {photoMode === "edit" && (
                              <div
                              className="absolute inset-0 z-10 pointer-events-none rounded-xl"
                              style={{
                                  background: isSelected ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.0)",
                                  border: isSelected ? "2px solid #33296b" : "2px solid transparent",
                              }}
                              />
                          )}
          
                          {/* thumbnail */}
                          <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-lg overflow-hidden bg-[#eef9ea] flex items-center justify-center"
                          >
                              <img
                              src={url}
                              alt={a.description || "photo asset"}
                              className="max-h-40 w-full h-auto object-contain"
                              loading="lazy"
                              />
                          </a>
          
                          {/* description tied to this photo */}
                          <div className="mt-2">
                              <div className="text-xs font-semibold text-[#33296b]">Description</div>
                              <textarea
                              value={a.description || ""}
                              onChange={(e) => {
                                  const next = e.target.value;
                                  setPhotoAssets((prev) =>
                                  prev.map((r) => (r.id === a.id ? { ...r, description: next } : r))
                                  );
                              }}
                              rows={2}
                              className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs outline-none focus:ring-2 focus:ring-black/10"
                              placeholder="please tell us about the photo, where is it, who is in it, etc."
                              />
                              <button
                              type="button"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  updateRow(
                                  "artist_photo_assets",
                                  a.id,
                                  { description: a.description || "" },
                                  setPhotoAssets
                                  );
                              }}
                              className="mt-2 rounded-xl px-3 py-1.5 text-xs bg-black/5 hover:bg-black/10"
                              >
                              save description
                              </button>
                          </div>
                          </div>
                      );
                      })}
                  </div>
                  )}
              </div>
          
                          </div>
          
                            <div className="mt-4 space-y-3">
                              {photoAssets.map((a) => (
                                <div key={a.id} className="artist-panel-secondary">
                                  <div className="flex items-center justify-between gap-2">
                                    <a
                                      href={publicOnboardingUrl(a.file_path)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs underline text-gray-700"
                                    >
                                      open file
                                    </a>
                                  </div>
          
                                  <div className="mt-2 text-xs font-semibold">Description</div>
                                  <textarea
                                    value={a.description || ""}
                                    onChange={(e) => {
                                      const next = e.target.value;
                                      setPhotoAssets((prev) => prev.map((r) => (r.id === a.id ? { ...r, description: next } : r)));
                                    }}
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                                    placeholder="please tell us about the photo, where is it, who is in it, etc."
                                  />
                                  <button
                                    onClick={() => updateRow("artist_photo_assets", a.id, { description: a.description || "" }, setPhotoAssets)}
                                    className="mt-2 rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
                                  >
                                    save description
                                  </button>
                                </div>
                              ))}
                              {photoAssets.length === 0 && <div className="text-sm text-gray-600">No photo assets uploaded yet.</div>}
                            </div>
                          </Collapsible>
                        );
                      }
          
          // 3) Music (release notes + one audio per song + lyrics in audio_library.lyrics)
          if (s.key === "music") {
              return (
              <Collapsible key={s.key} title="Music" completed={Boolean(s.done)} defaultOpen={!s.done}>
                  <div className="text-sm text-[#33296b] mb-3">
                  View your releases and songs. Add a note per release, upload one <b>mp3 or wav</b> per song, and add lyrics.
                  </div>
          
                  {releases.map(([release, tracks]) => {
                  const noteRow = releaseNotes.find((n) => n.release === release);
          
                  // completion for header display
                  const total = tracks.length || 0;
                  const audioDone = tracks.filter((t) => hasAnyAudioFile(t.file_path)).length;
                  const lyricsDone = tracks.filter((t) => typeof t.lyrics === "string" && t.lyrics.trim().length > 0).length;
          
                  return (
                      <details key={release} open className="mb-4 artist-panel-secondary p-4 rounded-2xl overflow-hidden">
                      <summary className="cursor-pointer list-none select-none">
                          <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#33296b] truncate">
                              {release || "Untitled release"}
                              </div>
                              <div className="text-xs text-[#33296b]/80">
                              audio: {audioDone}/{total} • lyrics: {lyricsDone}/{total}
                              </div>
                          </div>
          
                          {/*<div className="shrink-0 text-xs text-[#33296b]/70">▾</div>*/}
                          </div>
                      </summary>
          
                      <div className="mt-3">
                          {/* Release note */}
                          <div className="flex items-start justify-between gap-3 mb-2 min-w-0">
                          <div className="text-xs font-semibold text-[#33296b]">Release note</div>
          
                          {!noteRow && (
                              <button
                              type="button"
                              onClick={async () => {
                                  if (!artistId) return;
                                  const { data, error } = await supabase
                                  .from("artist_release_notes")
                                  .insert({ artist_id: artistId, release, note: "" })
                                  .select("*")
                                  .single();
          
                                  if (error) return alert(error.message);
                                  setReleaseNotes((prev) => [...prev, data]);
                              }}
                              className="text-xs rounded-lg px-2 py-1 bg-[#e6e7eb] text-[#33296b] font-semibold"
                              >
                              add release note
                              </button>
                          )}
                          </div>
          
                          {noteRow && (
                          <div className="mb-3">
                              <textarea
                              value={noteRow.note || ""}
                              onChange={(e) => {
                                  const next = e.target.value;
                                  setReleaseNotes((prev) =>
                                  prev.map((n) => (n.id === noteRow.id ? { ...n, note: next } : n))
                                  );
                              }}
                              rows={3}
                              className="w-full rounded-xl border border-black/10 p-3 text-sm outline-none text-[#33296b] bg-white"
                              placeholder="Write something about this release…"
                              />
                              <button
                              type="button"
                              onClick={() =>
                                  updateRow("artist_release_notes", noteRow.id, { note: noteRow.note || "" }, setReleaseNotes)
                              }
                              className="mt-2 rounded-xl px-3 py-2 text-sm bg-[#e6e7eb] text-[#33296b] font-semibold"
                              >
                              save release note
                              </button>
                          </div>
                          )}
          
                          {/* Tracks */}
                          <div className="space-y-2">
                          {tracks.map((t) => {
                              const title = t.title || t.song_name || `Song ${t.id}`;
                              const hasAudio = hasAnyAudioFile(t.file_path);
                              const hasLyrics = typeof t.lyrics === "string" && t.lyrics.trim().length > 0;
          
                              return (
                              <details key={t.id} className="bg-white rounded-2xl p-3 overflow-hidden">
                                  <summary className="cursor-pointer list-none select-none">
                                  <div className="flex items-start justify-between gap-3 min-w-0">
                                      <div className="min-w-0">
                                      <div className="text-sm font-semibold text-[#33296b] truncate">{title}</div>
                                      <div className="text-xs text-[#33296b]/80">
                                          audio: {hasAudio ? "✅" : "❌"} • lyrics: {hasLyrics ? "✅" : "❌"}
                                      </div>
                                      </div>
                                      {/*<div className="shrink-0 text-xs text-[#33296b]/70">▸</div>*/}
                                  </div>
                                  </summary>
          
                                  <div className="mt-3">
                                  <div className="flex flex-wrap gap-2">
                                      <label className="rounded-xl px-3 py-2 text-sm bg-[#e6e7eb] text-[#33296b] font-semibold cursor-pointer">
                                      {uploadingSongId === t.id ? "Uploading…" : "upload audio"}
                                      <input
                                          type="file"
                                          accept="audio/*,.mp3,.wav"
                                          className="hidden"
                                          disabled={uploadingSongId === t.id}
                                          onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file || !artistId) return;
          
                                          const lower = (file.name || "").toLowerCase();
                                          if (!lower.endsWith(".mp3") && !lower.endsWith(".wav")) {
                                              alert("Please upload an .mp3 or .wav file for this song.");
                                              e.target.value = "";
                                              return;
                                          }
          
                                          setUploadingSongId(t.id);
                                          try {
                                              const safeName = file.name.replace(/[^\w.\-]+/g, "_");
                                              const path = `audio-library/${artistId}/${Date.now()}-${safeName}`;
          
                                              const { error: upErr } = await supabase.storage
                                              .from("post-variations")
                                              .upload(path, file, { upsert: true });
          
                                              if (upErr) throw upErr;
          
                                              const { error: dbErr } = await supabase
                                              .from("audio_library")
                                              .update({ file_path: path })
                                              .eq("id", t.id);
          
                                              if (dbErr) throw dbErr;
          
                                              setAudioRows((prev) =>
                                              prev.map((r) => (r.id === t.id ? { ...r, file_path: path } : r))
                                              );
                                          } catch (err) {
                                              console.error(err);
                                              alert(err?.message || "Upload failed");
                                          } finally {
                                              setUploadingSongId(null);
                                              e.target.value = "";
                                          }
                                          }}
                                      />
                                      </label>
          
                                      {t.file_path && (
                                      <a
                                          href={supabase.storage.from("post-variations").getPublicUrl(t.file_path).data.publicUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="rounded-xl px-3 py-2 text-sm bg-[#e6e7eb] text-[#33296b] font-semibold"
                                      >
                                          open audio
                                      </a>
                                      )}
                                  </div>
          
                                  <div className="mt-3">
                                      <div className="text-xs font-semibold mb-1 text-[#33296b]">Lyrics</div>
                                      <textarea
                                      value={t.lyrics || ""}
                                      onChange={(e) => {
                                          const next = e.target.value;
                                          setAudioRows((prev) => prev.map((r) => (r.id === t.id ? { ...r, lyrics: next } : r)));
                                      }}
                                      rows={5}
                                      className="w-full rounded-xl border border-black/10 p-3 text-sm outline-none text-[#33296b] bg-white"
                                      placeholder="Paste lyrics here…"
                                      />
                                      <button
                                      type="button"
                                      onClick={async () => {
                                          const { error: dbErr } = await supabase
                                          .from("audio_library")
                                          .update({ lyrics: (t.lyrics || "").trim() })
                                          .eq("id", t.id);
                                          if (dbErr) alert(dbErr.message);
                                      }}
                                      className="mt-2 rounded-xl px-3 py-2 text-sm bg-[#e6e7eb] text-[#33296b] font-semibold"
                                      >
                                      save lyrics
                                      </button>
                                  </div>
                                  </div>
                              </details>
                              );
                          })}
                          </div>
                      </div>
                      </details>
                  );
                  })}
          
                  {audioRows.length === 0 && <div className="text-sm text-[#33296b]">No songs found yet.</div>}
              </Collapsible>
              );
          }
            
                      // 4) YouTube verification
                      if (s.key === "youtube") {
                        return (
                          <Collapsible key={s.key} title="YouTube verification" completed={Boolean(s.done)} defaultOpen={!s.done}>
                            <div className="text-sm text-gray-700 mb-3">
                              This allows us to properly test thumbnails and titles on your YouTube as well as including links in captions and comments.
                            </div>
                            <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
                              <li>Open YouTube Studio</li>
                              <li>Go to Settings → Channel → Feature eligibility</li>
                              <li>Follow the steps to verify your phone number</li>
                              <li>Confirm you can upload custom thumbnails</li>
                            </ol>
          
                            <label className="mt-4 flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={youtubeVerified} onChange={(e) => setYoutubeVerified(e.target.checked)} />
                              I have completed YouTube verification
                            </label>
          
                            <button
                              onClick={() => saveArtistFields({ youtube_verification_complete: youtubeVerified })}
                              className="mt-3 rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
                            >
                              save
                            </button>
                          </Collapsible>
                        );
                      }
          
                      // 5) Funding checklist
                      if (s.key === "funding") {
                        return (
                          <Collapsible key={s.key} title="Funding checklist" completed={Boolean(s.done)} defaultOpen={!s.done}>
                            <div className="text-sm text-gray-700 mb-3">
                              These are fields often required for funding applications.
                            </div>
          
                            <div className="space-y-2 text-sm">
                              <label className="flex items-center gap-2">
                                <input type="checkbox" checked={funding.ksk} onChange={(e) => setFunding((p) => ({ ...p, ksk: e.target.checked }))} />
                                KSK membership
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="checkbox" checked={funding.gema} onChange={(e) => setFunding((p) => ({ ...p, gema: e.target.checked }))} />
                                GEMA membership
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="checkbox" checked={funding.musicDegree} onChange={(e) => setFunding((p) => ({ ...p, musicDegree: e.target.checked }))} />
                                Degree in music
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="checkbox" checked={funding.gvl} onChange={(e) => setFunding((p) => ({ ...p, gvl: e.target.checked }))} />
                                GVL membership
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={funding.labelOrPublisher}
                                  onChange={(e) => setFunding((p) => ({ ...p, labelOrPublisher: e.target.checked }))}
                                />
                                Contract with a label or publisher
                              </label>
                            </div>
          
                            <button
                              onClick={() => saveArtistFields()}
                              className="mt-3 rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
                            >
                              save
                            </button>
                          </Collapsible>
                        );
                      }
          
                      // 6) EPK + moodboard PDFs
                      if (s.key === "epk") {
                        return (
                          <Collapsible key={s.key} title="EPK and mood board" completed={Boolean(s.done)} defaultOpen={!s.done}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="artist-panel-secondary p-4">
                                <div className="text-sm font-semibold mb-2">EPK (PDF)</div>
                                <input type="file" accept="application/pdf" onChange={(e) => uploadPdf("epk", e.target.files?.[0])} />
                                {epkPath && (
                                  <a className="mt-2 inline-block text-sm underline" href={publicOnboardingUrl(epkPath)} target="_blank" rel="noreferrer">
                                    open epk
                                  </a>
                                )}
                              </div>
          
                              <div className="artist-panel-secondary p-4">
                                <div className="text-sm font-semibold mb-2">Mood board (PDF)</div>
                                <input type="file" accept="application/pdf" onChange={(e) => uploadPdf("moodboard", e.target.files?.[0])} />
                                {moodboardPath && (
                                  <a className="mt-2 inline-block text-sm underline" href={publicOnboardingUrl(moodboardPath)} target="_blank" rel="noreferrer">
                                    open mood board
                                  </a>
                                )}
                              </div>
                            </div>
                          </Collapsible>
                        );
                      }
          
                      // 7) Press & Shows (separate lists)
                      if (s.key === "press") {
                        return (
                          <Collapsible key={s.key} title="Press and Shows" completed={Boolean(s.done)} defaultOpen={!s.done}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="artist-panel-secondary p-4">
                                <div className="text-sm font-semibold mb-2">Press</div>
                                <AddLinkForm onAdd={(url, desc) => addLink("artist_press_links", url, desc, setPressLinks)} />
                                <div className="mt-3 space-y-2">
                                  {pressLinks.map((l) => (
                                    <div key={l.id} className="bg-white border border-gray-100 rounded-xl p-3">
                                      <a href={l.url} target="_blank" rel="noreferrer" className="text-sm underline">{l.url}</a>
                                      <textarea
                                        value={l.description || ""}
                                        onChange={(e) => setPressLinks((prev) => prev.map((r) => (r.id === l.id ? { ...r, description: e.target.value } : r)))}
                                        rows={2}
                                        className="mt-2 w-full rounded-xl border border-gray-200 p-2 text-sm"
                                        placeholder="Write a short text about them."
                                      />
                                      <button
                                        onClick={() => updateRow("artist_press_links", l.id, { description: l.description || "" }, setPressLinks)}
                                        className="mt-2 rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
                                      >
                                        save
                                      </button>
                                    </div>
                                  ))}
                                  {pressLinks.length === 0 && <div className="text-sm text-gray-600">No press links yet.</div>}
                                </div>
                              </div>
          
                              <div className="artist-panel-secondary p-4">
                                <div className="text-sm font-semibold mb-2">Shows</div>
                                <AddLinkForm onAdd={(url, desc) => addLink("artist_show_links", url, desc, setShowLinks)} />
                                <div className="mt-3 space-y-2">
                                  {showLinks.map((l) => (
                                    <div key={l.id} className="bg-white border border-gray-100 rounded-xl p-3">
                                      <a href={l.url} target="_blank" rel="noreferrer" className="text-sm underline">{l.url}</a>
                                      <textarea
                                        value={l.description || ""}
                                        onChange={(e) => setShowLinks((prev) => prev.map((r) => (r.id === l.id ? { ...r, description: e.target.value } : r)))}
                                        rows={2}
                                        className="mt-2 w-full rounded-xl border border-gray-200 p-2 text-sm"
                                        placeholder="Write a short text about them."
                                      />
                                      <button
                                        onClick={() => updateRow("artist_show_links", l.id, { description: l.description || "" }, setShowLinks)}
                                        className="mt-2 rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
                                      >
                                        save
                                      </button>
                                    </div>
                                  ))}
                                  {showLinks.length === 0 && <div className="text-sm text-gray-600">No show links yet.</div>}
                                </div>
                              </div>
                            </div>
                          </Collapsible>
                        );
                      }
          
                      // 8) Old posts upload (videos, per-file description)
                      if (s.key === "old") {
                        return (
                          <Collapsible key={s.key} title="Old posts that didn’t make it to IG" completed={Boolean(s.done)} defaultOpen={!s.done}>
                            <div className="text-sm text-gray-700 mb-3">
                              please upload any posts that you made and posted to one platform (e.g. Instagram) but not others (e.g. TikTok or YouTube Shorts)
                            </div>
          
                            <div className="text-xs text-gray-500">Upload limit: 10GB total for this section (per artist).</div>
                            <div className="text-xs text-gray-500">Currently used (estimate): {bytesToGB(oldPostsBytes)} GB</div>
          
                            <div className="mt-3">
                              <input
                                type="file"
                                multiple
                                accept="video/*"
                                onChange={(e) =>
                                  uploadManyWithDbRow({
                                    folder: "old-posts",
                                    files: e.target.files,
                                    limitGB: 10,
                                    table: "artist_old_posts",
                                  })
                                }
                                className="text-sm"
                              />
                            </div>
          
                            <div className="mt-4 space-y-3">
                              {oldPosts.map((a) => (
                                <div key={a.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <a
                                      href={publicOnboardingUrl(a.file_path)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs underline text-gray-700"
                                    >
                                      open file
                                    </a>
                                  </div>
          
                                  <div className="mt-2 text-xs font-semibold">Description</div>
                                  <textarea
                                    value={a.description || ""}
                                    onChange={(e) => {
                                      const next = e.target.value;
                                      setOldPosts((prev) => prev.map((r) => (r.id === a.id ? { ...r, description: next } : r)));
                                    }}
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                                    placeholder="Add a description…"
                                  />
                                  <button
                                    onClick={() => updateRow("artist_old_posts", a.id, { description: a.description || "" }, setOldPosts)}
                                    className="mt-2 rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
                                  >
                                    save description
                                  </button>
                                </div>
                              ))}
                              {oldPosts.length === 0 && <div className="text-sm text-gray-600">No uploads yet.</div>}
                            </div>
                          </Collapsible>
                        );
                      }
          
                      // 9) Website references
                      if (s.key === "web") {
                        return (
                          <Collapsible key={s.key} title="Website References" completed={Boolean(s.done)} defaultOpen={!s.done}>
                            <div className="text-sm text-gray-700 mb-3">
                              Add creative website references and tell us what you like about them. Please add at least 2.
                            </div>
          
                            <AddWebsiteRefForm onAdd={addWebsiteRef} />
          
                            <div className="mt-3 space-y-2">
                              {websiteRefs.map((r) => {
                                  const rawUrl = r.url || "";
                                  const displayUrl =
                                  rawUrl.length > 30 ? rawUrl.slice(0, 30) + "…" : rawUrl;
          
                                  return (
                                  <div key={r.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                                      <a
                                          href={rawUrl || "#"}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs sm:text-sm underline text-[#33296b] shrink-0"
                                          title={rawUrl}
                                      >
                                          {displayUrl || "open"}
                                      </a>
                                      <input
                                          value={rawUrl}
                                          onChange={(e) => {
                                          const next = e.target.value;
                                          setWebsiteRefs((prev) =>
                                              prev.map((x) => (x.id === r.id ? { ...x, url: next } : x))
                                          );
                                          }}
                                          placeholder="https://…"
                                          className="mt-1 sm:mt-0 flex-1 min-w-0 rounded-xl border border-gray-200 p-2 text-xs sm:text-sm"
                                      />
                                      </div>
          
                                      <textarea
                                      value={r.why_you_like_it || ""}
                                      onChange={(e) => {
                                          const next = e.target.value;
                                          setWebsiteRefs((prev) =>
                                          prev.map((x) => (x.id === r.id ? { ...x, why_you_like_it: next } : x))
                                          );
                                      }}
                                      rows={2}
                                      className="mt-2 w-full rounded-xl border border-gray-200 p-2 text-sm"
                                      placeholder="What do you like about the website?"
                                      />
          
                                      <button
                                      type="button"
                                      onClick={() =>
                                          updateRow(
                                          "artist_website_references",
                                          r.id,
                                          {
                                              url: r.url || "",
                                              why_you_like_it: r.why_you_like_it || "",
                                          },
                                          setWebsiteRefs
                                          )
                                      }
                                      className="mt-2 rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
                                      >
                                      save
                                      </button>
                                  </div>
                                  );
                              })}
                              {websiteRefs.length === 0 && (
                                  <div className="text-sm text-gray-600">No references yet.</div>
                              )}
                              </div>
          
                          </Collapsible>
                        );
                      }
          
                      return null;
                    })}
        </div>
      )}
    </ArtistLayout>
  );
}
