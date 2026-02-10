"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ArtistLayout from "../../../components/artist/ArtistLayout";
import { getMyArtistContext, publicOnboardingUrl } from "../../../components/artist/artistData";
import { supabase } from "../../../lib/supabaseClient";

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

function ProgressDial({ pct }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const dash = (p / 100) * c;
  const isDone = p >= 100;

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="justify-center p-3">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="10" />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke={isDone ? "rgb(34 197 94)" : "rgba(0,0,0,0.7)"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 55 55)"
        />
        <text x="55" y="60" textAnchor="middle" fontSize="18" fontWeight="700" fill="rgba(0,0,0,0.85)">
          {p}%
        </text>
      </svg>
        </div>

      <div>
        <div className="text-sm font-semibold text-center max-w-xs">Onboarding completion</div>
        <div className="text-xs text-gray-600 text-center max-w-xs">Fill everything to hit 100%</div>
      </div>
    </div>
  );
}

function FontsDownloadPanel({ artistId }) {
  const [fonts, setFonts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId) return;
    (async () => {
      const { data, error } = await supabase.storage
        .from("artist-onboarding")
        .list(`${artistId}/fonts`, { limit: 100 });
      if (error) {
        console.error("Failed to list fonts:", error);
        setLoading(false);
        return;
      }
      setFonts((data || []).filter((f) => f.name && f.name !== ".emptyFolderPlaceholder"));
      setLoading(false);
    })();
  }, [artistId]);

  function getFontUrl(name) {
    const { data } = supabase.storage
      .from("artist-onboarding")
      .getPublicUrl(`${artistId}/fonts/${name}`);
    return data?.publicUrl || "";
  }

  if (loading) return null;
  if (fonts.length === 0) return null;

  return (
    <div className="artist-panel p-4">
      <h2 className="text-sm font-semibold mb-3">Your Fonts</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {fonts.map((f) => (
          <a
            key={f.name}
            href={getFontUrl(f.name)}
            download={f.name}
            className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium truncate hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate">{f.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function Collapsible({ title, completed, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="artist-panel">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className={["w-3 h-3 rounded-full", completed ? "bg-green-500" : "bg-black/10"].join(" ")} />
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-gray-500">{completed ? "Completed" : "Incomplete"}</div>
          </div>
        </div>
        <div className="text-xs rounded-lg px-2 py-1 bg-black/5">{open ? "Hide" : "Open"}</div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function bytesToGB(b) {
  return (b / (1024 ** 3)).toFixed(2);
}

async function estimateFolderBytes(prefix) {
  // Best-effort estimate (single list call); good enough for UX cap
  const { data, error } = await supabase.storage.from("artist-onboarding").list(prefix, { limit: 1000 });
  if (error) return 0;
  return (data || []).reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
}

async function uploadFileToBucket({ path, file, upsert = false }) {
    const bucket = "artist-onboarding";
  
    const userRes = await supabase.auth.getUser();
    const sessionRes = await supabase.auth.getSession();
  
    console.groupCollapsed("[STORAGE DEBUG] upload attempt");
    console.log("bucket:", bucket);
    console.log("path:", path);
    console.log("file:", { name: file?.name, size: file?.size, type: file?.type });
    console.log("getUser:", userRes);
    console.log("getSession:", sessionRes);
    console.log("has access token:", Boolean(sessionRes?.data?.session?.access_token));
  
    const bucketsRes = await supabase.storage.listBuckets();
    console.log("listBuckets:", bucketsRes);
  
    const listRoot = await supabase.storage.from(bucket).list("", { limit: 5 });
    console.log("list(''):", listRoot);
  
    const prefix = path?.split("/")?.[0] || "";
    if (prefix) {
      const listArtist = await supabase.storage.from(bucket).list(prefix, { limit: 5 });
      console.log(`list('${prefix}'):` , listArtist);
    }
    
    const s = await supabase.auth.getSession();
    console.log("[TOKEN CHECK before upload]", Boolean(s?.data?.session?.access_token));

    const uploadRes = await supabase.storage.from(bucket).upload(path, file, { upsert });
    console.log("uploadRes:", uploadRes);
  
    console.groupEnd();
    return uploadRes;
  }
  
function AddLinkForm({ onAdd }) {
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div className="space-y-2">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
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

function AddWebsiteRefForm({ onAdd }) {
  const [url, setUrl] = useState("");
  const [why, setWhy] = useState("");
  return (
    <div className="artist-panel-secondary p-4">
      <div className="text-sm font-semibold mb-2">Add reference</div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        className="w-full rounded-xl border border-gray-200 p-2 text-sm mb-2"
      />
      <textarea
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        rows={2}
        placeholder="What do you like about the website?"
        className="w-full rounded-xl border border-gray-200 p-2 text-sm"
      />
      <button
        onClick={() => {
          if (!url.trim()) return alert("Please enter a URL.");
          onAdd?.(url.trim(), why);
          setUrl("");
          setWhy("");
        }}
        className="mt-2 rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
      >
        add
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [artistId, setArtistId] = useState(null);

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

  const [epkPath, setEpkPath] = useState("");
  const [moodboardPath, setMoodboardPath] = useState("");

  // pending PDFs + saving state for EPK / mood board
  const [pendingEpkFile, setPendingEpkFile] = useState(null);
  const [pendingMoodboardFile, setPendingMoodboardFile] = useState(null);
  const [savingEpk, setSavingEpk] = useState(false);
  const [savingMoodboard, setSavingMoodboard] = useState(false);

  // onboarding tables
  const [photoAssets, setPhotoAssets] = useState([]);
  const [oldPosts, setOldPosts] = useState([]);
  const [pressLinks, setPressLinks] = useState([]);
  const [showLinks, setShowLinks] = useState([]);
  const [websiteRefs, setWebsiteRefs] = useState([]);
  const [releaseNotes, setReleaseNotes] = useState([]);

  // Photo gallery UI state
    const photoInputRef = useRef(null);
    const [photoMode, setPhotoMode] = useState("view"); // "view" | "add" | "edit"
    const [pendingPhotoFiles, setPendingPhotoFiles] = useState([]); // File[]
    const [photoSaving, setPhotoSaving] = useState(false);
    const [selectedPhotoIds, setSelectedPhotoIds] = useState(() => new Set()); // Set<number>

    const isAudioFileAllowed = (file) => {
        if (!file) return false;
      
        const name = String(file.name || "").toLowerCase();
        const type = String(file.type || "").toLowerCase();
      
        const okByExt = name.endsWith(".mp3") || name.endsWith(".wav");
        const okByMime = type === "audio/mpeg" || type === "audio/mp3" || type === "audio/wav" || type === "audio/x-wav";
      
        return okByExt || okByMime;
      };
      
      const hasAnyAudioFile = (filePath) => Boolean(String(filePath || "").trim());
      
  // music (audio_library view)
  const [audioRows, setAudioRows] = useState([]);
  const [uploadingSongId, setUploadingSongId] = useState(null);

  // socials auth status
  const [socialStatus, setSocialStatus] = useState([]);

  // section storage usage estimates
  const [photoBytes, setPhotoBytes] = useState(0);
  const [oldPostsBytes, setOldPostsBytes] = useState(0);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");

        const { artistId } = await getMyArtistContext();
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

        // DEBUG: Log the entire artist object
        console.log("[DEBUG] Full artist data from DB:", artist);
        console.log("[DEBUG] Artist ID:", artistId);
        console.log("[DEBUG] EPK path raw value:", artist?.epk_pdf_path, "type:", typeof artist?.epk_pdf_path);
        console.log("[DEBUG] Moodboard path raw value:", artist?.moodboard_pdf_path, "type:", typeof artist?.moodboard_pdf_path);

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
        
        // Handle EPK/Moodboard paths - only use truthy values
        const epkValue = artist?.epk_pdf_path;
        const moodValue = artist?.moodboard_pdf_path;
        setEpkPath(epkValue && typeof epkValue === 'string' && epkValue.trim() ? epkValue.trim() : "");
        setMoodboardPath(moodValue && typeof moodValue === 'string' && moodValue.trim() ? moodValue.trim() : "");
        
        console.log("[DEBUG] Loaded EPK path:", epkValue, "-> setState:", epkValue && typeof epkValue === 'string' && epkValue.trim() ? epkValue.trim() : "");
        console.log("[DEBUG] Loaded Moodboard path:", moodValue, "-> setState:", moodValue && typeof moodValue === 'string' && moodValue.trim() ? moodValue.trim() : "");

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
          supabase.from("artist_photo_assets").select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
          supabase.from("artist_old_posts").select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
          supabase.from("artist_press_links").select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
          supabase.from("artist_show_links").select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
          supabase.from("artist_website_references").select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
          supabase.from("artist_release_notes").select("*").eq("artist_id", artistId).order("release", { ascending: true }),
          supabase.from("audio_library").select("*").eq("artist_id", artistId).order("release", { ascending: true }),
          supabase.from("artist_social_auth_status").select("*").eq("artist_id", artistId),
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

        // estimate per-section storage usage
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
  }, []);

  async function saveArtistFields(patch = {}) {
    if (!artistId) {
      console.error("[saveArtistFields] No artistId!");
      return;
    }
  
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
  
    console.log("[saveArtistFields] Attempting update for artist ID:", artistId);
    console.log("[saveArtistFields] Update payload:", merged);
  
    // First, try the update
    const { error: updateError, count } = await supabase
      .from("artists")
      .update(merged)
      .eq("id", artistId);
  
    console.log("[saveArtistFields] Update result:", { updateError, count });
  
    if (updateError) {
      console.error("[saveArtistFields] Update failed:", updateError);
      alert(`Update failed: ${updateError.message}`);
      return;
    }
  
    // Then verify it was saved by re-fetching
    const { data: verifyData, error: verifyError } = await supabase
      .from("artists")
      .select("epk_pdf_path, moodboard_pdf_path")
      .eq("id", artistId)
      .single();
  
    console.log("[saveArtistFields] Verification query result:", { verifyData, verifyError });
  
    if (verifyError) {
      console.error("[saveArtistFields] Verification failed:", verifyError);
    } else {
      console.log("[saveArtistFields] Confirmed data in DB:", verifyData);
      
      // Update local state to match what's actually in the DB
      if (verifyData.epk_pdf_path !== undefined) {
        setEpkPath(verifyData.epk_pdf_path || "");
      }
      if (verifyData.moodboard_pdf_path !== undefined) {
        setMoodboardPath(verifyData.moodboard_pdf_path || "");
      }
    }
  }

  const PDF_BUCKET = "artist-onboarding";
  async function uploadPdf(kind, file) {
    if (!artistId || !file) return;
  
    // store just "4/epk.pdf" / "4/moodboard.pdf" in DB
    const filePath = `${artistId}/${kind}.pdf`;
    
    console.log("[uploadPdf] Uploading:", { kind, filePath, artistId });
  
    const { error } = await supabase
      .storage
      .from(PDF_BUCKET)
      .upload(filePath, file, { upsert: true });
  
    if (error) {
      console.error("uploadPdf error", error);
      alert(error.message);
      return;
    }
    
    console.log("[uploadPdf] Upload successful, updating DB with path:", filePath);
  
    // update artist row
    const updatePayload = {
      epk_pdf_path: kind === "epk" ? filePath : epkPath,
      moodboard_pdf_path: kind === "moodboard" ? filePath : moodboardPath,
    };
    
    console.log("[uploadPdf] Saving to DB:", updatePayload);
    
    await saveArtistFields(updatePayload);
  
    // update local state
    if (kind === "epk") {
      console.log("[uploadPdf] Setting epkPath state to:", filePath);
      setEpkPath(filePath);
    }
    if (kind === "moodboard") {
      console.log("[uploadPdf] Setting moodboardPath state to:", filePath);
      setMoodboardPath(filePath);
    }
  }

  async function handleSaveEpk() {
    if (!artistId) {
      alert("Missing artist id.");
      return;
    }
    if (!pendingEpkFile) {
      alert("Please choose an EPK PDF first.");
      return;
    }
    try {
      setSavingEpk(true);
      await uploadPdf("epk", pendingEpkFile);
      setPendingEpkFile(null);
    } catch (e) {
      console.error("Failed to save EPK PDF", e);
      alert(e?.message || "Failed to save EPK PDF.");
    } finally {
      setSavingEpk(false);
    }
  }

  async function handleSaveMoodboard() {
    if (!artistId) {
      alert("Missing artist id.");
      return;
    }
    if (!pendingMoodboardFile) {
      alert("Please choose a mood board PDF first.");
      return;
    }
    try {
      setSavingMoodboard(true);
      await uploadPdf("moodboard", pendingMoodboardFile);
      setPendingMoodboardFile(null);
    } catch (e) {
      console.error("Failed to save mood board PDF", e);
      alert(e?.message || "Failed to save mood board PDF.");
    } finally {
      setSavingMoodboard(false);
    }
  }

  async function uploadManyWithDbRow({ folder, files, limitGB, table }) {
    const { data: userData } = await supabase.auth.getUser();
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("[AUTH CHECK]", {
    uid: userData?.user?.id ?? null,
    hasSession: Boolean(sessionData?.session),
    expiresAt: sessionData?.session?.expires_at ?? null,
    });

    if (!artistId || !files?.length) return;

    const prefix = `${artistId}/${folder}`;
    const maxBytes = limitGB * (1024 ** 3);

    const currentBytes = folder === "bio-photos" ? photoBytes : oldPostsBytes;
    const newBytes = Array.from(files).reduce((acc, f) => acc + (f.size || 0), 0);

    if (currentBytes + newBytes > maxBytes) {
      alert(`Upload would exceed the ${limitGB}GB limit for this section.`);
      return;
    }

    for (const file of Array.from(files)) {
      const path = `${artistId}/bio-photos/${Date.now()}-${file.name}`;
      console.log("[uploadManyWithDbRow]", { artistId, folder, table, path });
      const upRes = await uploadFileToBucket({ path, file, upsert: false });

        if (upRes?.error) {
        console.error("STORAGE UPLOAD ERROR FULL:", upRes.error);
        console.log("STORAGE UPLOAD RESPONSE FULL:", upRes);
        alert(
            "STORAGE upload blocked: " +
            (upRes.error?.message || JSON.stringify(upRes.error))
        );
        // IMPORTANT: stop the loop after logging everything
        return;
        }


      const { data, error: insErr } = await supabase
        .from(table)
        .insert({ artist_id: artistId, file_path: path, description: "" })
        .select("*")
        .single();

        if (insErr) {
            console.error("DB INSERT ERROR:", insErr);
            alert("DB insert blocked: " + (insErr.message || JSON.stringify(insErr)));
            return;
            }

      if (table === "artist_photo_assets") setPhotoAssets((prev) => [data, ...prev]);
      if (table === "artist_old_posts") setOldPosts((prev) => [data, ...prev]);
    }

    // refresh usage estimate
    if (folder === "bio-photos") setPhotoBytes(await estimateFolderBytes(`${artistId}/bio-photos`));
    if (folder === "old-posts") setOldPostsBytes(await estimateFolderBytes(`${artistId}/old-posts`));
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
        limitGB: 10,
        table: "artist_photo_assets",
      });
  
      setPendingPhotoFiles([]);
      if (photoInputRef.current) photoInputRef.current.value = "";
      setPhotoMode("view");
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
    const bucket = "artist-onboarding"; // must match publicOnboardingUrl() bucket
  
    if (paths.length) {
      await supabase.storage.from(bucket).remove(paths);
    }
  
    const { error } = await supabase.from("artist_photo_assets").delete().in("id", ids);
    if (error) return alert(error.message);
  
    setPhotoAssets((prev) => prev.filter((p) => !ids.includes(p.id)));
    setSelectedPhotoIds(new Set());
    setPhotoMode("view");
  }
  
  async function updateRow(table, id, patch, setState) {
    const { data, error } = await supabase.from(table).update(patch).eq("id", id).select("*").single();
    if (error) return alert(error.message);
    setState((prev) => prev.map((r) => (r.id === id ? data : r)));
  }

  async function addLink(table, url, description, setState) {
    if (!artistId) return;
    const { data, error } = await supabase
      .from(table)
      .insert({ artist_id: artistId, url, description })
      .select("*")
      .single();
    if (error) return alert(error.message);
    setState((prev) => [data, ...prev]);
  }

  async function addWebsiteRef(url, why) {
    if (!artistId) return;
    const { data, error } = await supabase
      .from("artist_website_references")
      .insert({ artist_id: artistId, url, why_you_like_it: why })
      .select("*")
      .single();
    if (error) return alert(error.message);
    setWebsiteRefs((prev) => [data, ...prev]);
  }

  // Music grouping
  const releases = useMemo(() => {
    const byRelease = new Map();
    (audioRows || []).forEach((r) => {
      const rel = r.release || "Unreleased";
      if (!byRelease.has(rel)) byRelease.set(rel, []);
      byRelease.get(rel).push(r);
    });
    return Array.from(byRelease.entries()); // [ [release, tracks] ]
  }, [audioRows]);

  const REQUIRED_SOCIAL_PLATFORMS = ["tiktok", "instagram", "youtube"];

  const SOCIALS = [
    {
      key: "tiktok",
      label: "TikTok",
      href: "/api/tiktok/tiktok-auth-start.js",
    },
    {
      key: "instagram",
      label: "Instagram",
      //href: "/dashboard/token-health",
    },
    {
      key: "youtube",
      label: "YouTube",
      href: "/api/youtube/auth-start.js",
    },
  ];
  
  const normalizePlatform = (p) => String(p || "").trim().toLowerCase();

  // Find the *best matching row* for a given platform key.
  // e.g. platformKey="tiktok" matches "tiktok", "tiktok_business", "tiktok-ads", etc.
  const findPlatformRow = (rows, platformKey) => {
    const key = normalizePlatform(platformKey);
    const list = Array.isArray(rows) ? rows : [];
  
    // Prefer exact match first
    const exact = list.find((r) => normalizePlatform(r.platform) === key);
    if (exact) return exact;
  
    // Fallback: contains match
    return list.find((r) => normalizePlatform(r.platform).includes(key)) || null;
  };
  
  // “Connected” = the relevant row exists AND status is ok (don’t gate on expiry here)
  const isTokenHealthy = (row) => {
    if (!row) return false;
    return normalizePlatform(row.status) === "ok";
  };
  
  const socialsComplete = useMemo(() => {
    const rows = Array.isArray(socialStatus) ? socialStatus : [];
    return SOCIALS.every((s) => isTokenHealthy(findPlatformRow(rows, s.key)));
  }, [socialStatus]);
  
  // Completion rules (weighted)
  const completion = useMemo(() => {
    const clamp01 = (n) => Math.max(0, Math.min(1, n));

    const checks = [];

    // --- Socials connections (4%) ---
    // If you want "all tokens healthy", update socialsComplete separately to reflect that.
    checks.push({ key: "socials", label: "Socials connections", weight: 4, ratio: socialsComplete ? 1 : 0 });

    // --- Artist Bio (4%) ---
    const bioDone = Boolean((bio ?? "").trim());
    checks.push({ key: "bio_text", label: "Artist Bio", weight: 4, ratio: bioDone ? 1 : 0 });

    // --- Preferred pronouns (4%) ---
    const pronounsDone = Boolean((preferredPronouns ?? "").trim());
    checks.push({ key: "pronouns", label: "Preferred pronouns", weight: 4, ratio: pronounsDone ? 1 : 0 });

    // --- Photo assets (8%) ---
    const photosDone = (photoAssets?.length || 0) > 0;
    checks.push({ key: "photos", label: "Photo assets", weight: 8, ratio: photosDone ? 1 : 0 });

    // --- Music (20%) ---
    // Each song is worth equal value. Within each song: master = 0.5, lyrics = 0.5.
    const songs = Array.isArray(audioRows) ? audioRows : [];
    const songCount = songs.length;

    let musicRatio = 0;
    if (songCount > 0) {
      let totalSongPoints = 0; // each song max = 1
      for (const s of songs) {
        const hasMaster = Boolean((s?.file_path ?? "").trim()); // your existing master path
        const hasLyrics = Boolean((s?.lyrics ?? "").trim());    // requires lyrics column
        totalSongPoints += (hasMaster ? 0.5 : 0) + (hasLyrics ? 0.5 : 0);
      }
      musicRatio = clamp01(totalSongPoints / songCount);
    }
    checks.push({ key: "music", label: "Music", weight: 20, ratio: musicRatio });

    // --- Funding checklist (4%) ---
    // Completed when 3/5 checked
    const fundingTrueCount =
      (funding?.ksk ? 1 : 0) +
      (funding?.gema ? 1 : 0) +
      (funding?.musicDegree ? 1 : 0) +
      (funding?.gvl ? 1 : 0) +
      (funding?.labelOrPublisher ? 1 : 0);
    checks.push({
      key: "funding",
      label: "Funding checklist",
      weight: 4,
      ratio: fundingTrueCount >= 3 ? 1 : 0,
    });

    // --- EPK (4%) ---
    const epkDone = Boolean((epkPath ?? "").trim());
    checks.push({ key: "epk", label: "EPK", weight: 4, ratio: epkDone ? 1 : 0 });

    // --- Mood Board (4%) ---
    const moodDone = Boolean((moodboardPath ?? "").trim());
    checks.push({ key: "moodboard", label: "Mood Board", weight: 4, ratio: moodDone ? 1 : 0 });

    // --- Press (8%) ---
    // Completed when >=2 rows have url OR description
    const pressCount = (pressLinks || []).filter((r) =>
      Boolean((r?.url ?? "").trim()) || Boolean((r?.description ?? "").trim())
    ).length;
    checks.push({ key: "press", label: "Press", weight: 8, ratio: pressCount >= 2 ? 1 : 0 });

    // --- Shows (8%) ---
    const showCount = (showLinks || []).filter((r) =>
      Boolean((r?.url ?? "").trim()) || Boolean((r?.description ?? "").trim())
    ).length;
    checks.push({ key: "shows", label: "Shows", weight: 8, ratio: showCount >= 2 ? 1 : 0 });

    // --- Old posts that didn’t make it (4%) ---
    const oldPostsDone = (oldPosts?.length || 0) > 0;
    checks.push({ key: "old_posts", label: "Old posts", weight: 4, ratio: oldPostsDone ? 1 : 0 });

    // --- Website references (8%) ---
    const webCount = (websiteRefs || []).filter((r) =>
      Boolean((r?.url ?? "").trim()) || Boolean((r?.description ?? "").trim())
    ).length;
    checks.push({ key: "web", label: "Website references", weight: 8, ratio: webCount >= 2 ? 1 : 0 });

    // --- YouTube verification (4%) ---
    const ytDone = youtubeVerified === true;
    checks.push({ key: "youtube", label: "YouTube verification", weight: 4, ratio: ytDone ? 1 : 0 });

    const total = checks.reduce((sum, c) => sum + c.weight, 0);   // your weights sum to 80
    const earned = checks.reduce((sum, c) => sum + c.weight * clamp01(c.ratio), 0);

    const pct = total > 0 ? Math.round((earned / total) * 100) : 0;

    return { pct, checks, earned, total, songCount, musicRatio };
  }, [
    socialsComplete,
    bio,
    preferredPronouns,
    photoAssets,
    audioRows,
    funding,
    epkPath,
    moodboardPath,
    pressLinks,
    showLinks,
    oldPosts,
    websiteRefs,
    youtubeVerified,
  ]);

  // Sort: incomplete first, completed at bottom
  const sections = useMemo(() => {
    const findRatio = (key) => completion.checks.find((c) => c.key === key)?.ratio ?? 0;

    // Grouped "done" rules for collapsibles
    const socialsDone = findRatio("socials") === 1;

    // Bio section = bio text + pronouns + photos
    const bioSectionDone =
      findRatio("bio_text") === 1 &&
      findRatio("pronouns") === 1 &&
      findRatio("photos") === 1;

    // Music section: only "done" if there are songs and ratio is 1
    const musicDone = completion.songCount > 0 && completion.musicRatio === 1;

    const youtubeDone = findRatio("youtube") === 1;
    const fundingDone = findRatio("funding") === 1;

    // EPK section = epk + moodboard
    const epkMoodDone = findRatio("epk") === 1 && findRatio("moodboard") === 1;

    // Press and Shows section = both done
    const pressShowsDone = findRatio("press") === 1 && findRatio("shows") === 1;

    const oldPostsDone = findRatio("old_posts") === 1;
    const webDone = findRatio("web") === 1;

    const list = [
      { key: "socials", title: "Socials connections", done: socialsDone },
      { key: "bio", title: "Bio + Photo assets", done: bioSectionDone },
      { key: "music", title: "Music", done: musicDone },
      { key: "youtube", title: "YouTube verification", done: youtubeDone },
      { key: "funding", title: "Funding checklist", done: fundingDone },
      { key: "epk", title: "EPK and mood board", done: epkMoodDone },
      { key: "press", title: "Press and Shows", done: pressShowsDone },
      { key: "old", title: "Old posts that didn’t make it to YouTube", done: oldPostsDone },
      { key: "web", title: "Website References", done: webDone },
    ];

    // incomplete first
    return list.sort((a, b) => Number(a.done) - Number(b.done));
  }, [completion]);

  return (
    <ArtistLayout title="Uploads">
      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="artist-panel">
            <ProgressDial pct={completion.pct} />
          </div>

          <FontsDownloadPanel artistId={artistId} />

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
                    Connect your TikTok and Instagram accounts so stats can load correctly. Note: YouTube May Not Work Yet
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

            // EPK + moodboard PDFs
            if (s.key === "epk") {
              // derive public URLs directly from Supabase Storage
              console.log("epkPath from state:", epkPath);
              console.log("moodboardPath from state:", moodboardPath);

              const epkPublicUrl =
                epkPath && epkPath.trim()
                  ? supabase.storage
                      .from("artist-onboarding")
                      .getPublicUrl(epkPath.trim()).data.publicUrl
                  : "";

              const moodboardPublicUrl =
                moodboardPath && moodboardPath.trim()
                  ? supabase.storage
                      .from("artist-onboarding")
                      .getPublicUrl(moodboardPath.trim()).data.publicUrl
                  : "";

              console.log("epkPublicUrl generated:", epkPublicUrl);
              console.log("moodboardPublicUrl generated:", moodboardPublicUrl);

              return (
                <Collapsible
                  key={s.key}
                  title="EPK and mood board"
                  completed={Boolean(s.done)}
                  defaultOpen={!s.done}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* EPK */}
                    <div className="artist-panel-secondary p-4">
                      <div className="text-sm font-semibold mb-2">EPK (PDF)</div>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPendingEpkFile(e.target.files?.[0] || null)}
                      />
                      {pendingEpkFile && (
                        <div className="mt-1 text-[11px] text-gray-600">
                          Selected: {pendingEpkFile.name}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveEpk}
                          disabled={!pendingEpkFile || savingEpk}
                          className="px-3 py-1.5 rounded-lg text-xs bg-[#bce1ac] text-[#33296b] hover:opacity-90 disabled:opacity-60"
                        >
                          {savingEpk ? "Saving…" : "Save EPK"}
                        </button>
                        {epkPublicUrl && (
                          <a
                            className="text-xs underline"
                            href={epkPublicUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            open epk
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Mood board */}
                    <div className="artist-panel-secondary p-4">
                      <div className="text-sm font-semibold mb-2">Mood board (PDF)</div>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) =>
                          setPendingMoodboardFile(e.target.files?.[0] || null)
                        }
                      />
                      {pendingMoodboardFile && (
                        <div className="mt-1 text-[11px] text-gray-600">
                          Selected: {pendingMoodboardFile.name}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveMoodboard}
                          disabled={!pendingMoodboardFile || savingMoodboard}
                          className="px-3 py-1.5 rounded-lg text-xs bg-[#bce1ac] text-[#33296b] hover:opacity-90 disabled:opacity-60"
                        >
                          {savingMoodboard ? "Saving…" : "Save mood board"}
                        </button>
                        {moodboardPublicUrl && (
                          <a
                            className="text-xs underline"
                            href={moodboardPublicUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            open mood board
                          </a>
                        )}
                      </div>
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
                <Collapsible key={s.key} title="Old posts that didn’t make it to YouTube" completed={Boolean(s.done)} defaultOpen={!s.done}>
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
