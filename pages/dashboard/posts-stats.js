"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import TeamLayout from "../../components/team/TeamLayout";

// ----- helpers -----

const PLATFORM_YOUTUBE_SHORTS = "youtube_shorts"; // adjust if you use a different value

function computeStandoutMetric({ postId, tierPosts, latestSnapshotByPostId }) {
  const metrics = [
    { key: "views", label: "Views" },
    { key: "reach", label: "Reach" },
    { key: "likes", label: "Likes" },
    { key: "comments", label: "Comments" },
    { key: "avg_view_duration", label: "Avg view duration" },
    { key: "retention_rate", label: "Viewer retention" },
    { key: "completion_rate", label: "% stayed to watch" },
  ];

  const targetSnap = latestSnapshotByPostId.get(postId);
  if (!targetSnap) return null;

  // Build peer snapshots (same tier)
  const peerSnaps = (tierPosts || [])
    .map((p) => latestSnapshotByPostId.get(p.id))
    .filter(Boolean);

  if (peerSnaps.length < 3) return null; // avoid noisy comparisons

  let best = null;

  for (const m of metrics) {
    const postVal = Number(targetSnap[m.key]);
    if (!Number.isFinite(postVal)) continue;

    const peerVals = peerSnaps
      .map((s) => Number(s[m.key]))
      .filter((v) => Number.isFinite(v));

    if (peerVals.length < 3) continue;

    const avg = peerVals.reduce((a, b) => a + b, 0) / peerVals.length;
    if (!Number.isFinite(avg) || avg === 0) continue;

    const pctDiff = ((postVal - avg) / avg) * 100; // positive = outperforming
    if (best == null || pctDiff > best.pctDiff) {
      best = { key: m.key, label: m.label, pctDiff, postVal, avg };
    }
  }

  return best;
}


function formatNumber(n) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function formatHalfStep(n) {
  if (n == null || isNaN(n)) return "—";
  const num = Number(n);
  const rounded = Math.round(num * 2) / 2; // nearest 0.5
  return rounded.toFixed(1);
}

function formatPerThousand(n) {
  if (n == null || isNaN(n)) return "—";
  const num = Number(n) * 1000; // convert ratio to per-1000
  return num.toFixed(1); // 1 decimal place
}

function formatPercent(p) {
  if (p == null || isNaN(p)) return "—";
  return p.toFixed(1) + "%";
}

function formatSecondsToHMS(sec) {
  if (sec == null || isNaN(sec)) return "—";
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return `${m}m ${r}s`;
}

function formatShortDate(dateInput) {
  if (!dateInput) return "No date";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "No date";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function getMetricDelta(postValue, avgValue) {
  const post = Number(postValue);
  const avg = Number(avgValue);
  if (!isFinite(post) || !isFinite(avg)) {
    return { className: "", symbol: null };
  }
  if (post > avg) {
    return { className: "text-green-600", symbol: "▲" };
  }
  if (post < avg) {
    return { className: "text-red-600", symbol: "▼" };
  }
  return { className: "", symbol: null };
}

// ----- ranking helpers -----

function safeProductScore(values) {
  let score = 1;
  let used = false;
  for (const v of values) {
    const n = Number(v);
    if (!isFinite(n) || n <= 0) continue; // “remove any values of 0”
    score *= n;
    used = true;
  }
  return used ? score : 0;
}

// YouTube Score: (comments*10)*(likes)*(views*0.5)
function computeYouTubeScore(snapshot) {
  if (!snapshot) return 0;
  const comments = Number(snapshot.comments) || 0;
  const likes = Number(snapshot.likes) || 0;
  const views = Number(snapshot.views) || 0;

  return safeProductScore([
    comments > 0 ? comments * 10 : 0,
    likes > 0 ? likes : 0,
    views > 0 ? views * 0.5 : 0,
  ]);
}

// TikTok Score: (shareability*10)*(retention*8)*(comments*3)*(views*0.1)
function computeTikTokScore(snapshot) {
  if (!snapshot) return 0;
  const shareability = Number(snapshot.tiktok_shareability_score) || 0;
  const retention = Number(snapshot.tiktok_retention_score) || 0;
  const comments = Number(snapshot.comments) || 0;
  const views = Number(snapshot.views) || 0;

  return safeProductScore([
    shareability > 0 ? shareability * 10 : 0,
    retention > 0 ? retention * 6 : 0,
    comments > 0 ? comments * 4 : 0,
    views > 0 ? views * 1 : 0,
  ]);
}

// Instagram Score: (shares*3)*(comments*2)*(likes)*(views*0.1)
function computeInstagramScore(snapshot) {
  if (!snapshot) return 0;
  const shares = Number(snapshot.shares) || 0;
  const comments = Number(snapshot.comments) || 0;
  const likes = Number(snapshot.likes) || 0;
  const views = Number(snapshot.views) || 0;

  return safeProductScore([
    shares > 0 ? shares * 3 : 0,
    comments > 0 ? comments * 2 : 0,
    likes > 0 ? likes : 0,
    views > 0 ? views * 0.1 : 0,
  ]);
}

// Thumbnail component for recent posts carousel
function RecentPostThumbnail({ post }) {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadThumbnail() {
      try {
        setLoading(true);
        
        // Fetch the first variation for this post
        const { data: variations, error: varErr } = await supabase
          .from("postvariations")
          .select("*")
          .eq("post_id", post.id)
          .order("test_version", { ascending: true })
          .limit(1);

        if (varErr || !variations || variations.length === 0) {
          setThumbnailUrl(null);
          setLoading(false);
          return;
        }

        const variation = variations[0];
        let path = null;
        
        if (Array.isArray(variation.carousel_files) && variation.carousel_files.length > 0) {
          path = variation.carousel_files[0];
        } else if (variation.file_name) {
          path = variation.file_name;
        }

        if (!path) {
          setThumbnailUrl(null);
          setLoading(false);
          return;
        }

        const { data, error } = supabase.storage
          .from("post-variations")
          .getPublicUrl(path);

        if (error) {
          console.error("Error getting thumbnail URL", error);
          setThumbnailUrl(null);
        } else {
          setThumbnailUrl(data.publicUrl);
        }
      } catch (e) {
        console.error(e);
        setThumbnailUrl(null);
      } finally {
        setLoading(false);
      }
    }

    loadThumbnail();
  }, [post.id]);

  if (loading) {
    return (
      <div className="w-full aspect-[9/16] bg-gray-100 flex items-center justify-center overflow-hidden">
        <div className="text-[10px] text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!thumbnailUrl) {
    return (
      <div className="w-full aspect-[9/16] bg-gray-100 flex items-center justify-center overflow-hidden">
        <div className="text-[10px] text-gray-400">No media</div>
      </div>
    );
  }

  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(thumbnailUrl);
  const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(thumbnailUrl);

  return (
    <div className="w-full aspect-[9/16] bg-black overflow-hidden">
      {isImage && (
        <img
          src={thumbnailUrl}
          alt={post.post_name || "post thumbnail"}
          className="w-full h-full object-cover"
        />
      )}
      {isVideo && (
        <video
          src={thumbnailUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
      )}
      {!isImage && !isVideo && (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
          Preview unavailable
        </div>
      )}
    </div>
  );
}

// Very small inline line chart, no external libs.
function MiniLineChart({ points, avgValue, height = 120, labelFormatter }) {
  if (!points || points.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-gray-500">
        Not enough data yet
      </div>
    );
  }

  const width = 360;
  const padding = 16;

  const xs = points.map((p, i) => i); // simple index-based x
  const ys = points.map((p) => (p.value == null ? 0 : p.value));

  const minY = 0;
  const maxY = Math.max(...ys, avgValue ?? ys[0]);

  const spanY = maxY - minY || 1;

  const scaleX = (x) =>
    padding + ((width - padding * 2) * x) / Math.max(points.length - 1, 1);
  const scaleY = (y) =>
    height - padding - ((height - padding * 2) * (y - minY)) / spanY;

  const lastIdx = points.length - 1;
  const lastX = scaleX(lastIdx);
  const lastY = scaleY(ys[lastIdx] ?? 0);

    const linePath =
    points.length === 1
        // tiny segment so it visibly renders even with 1 point
        ? `M ${Math.max(padding, lastX - 6)} ${lastY} L ${Math.min(width - padding, lastX + 6)} ${lastY}`
        : points
            .map((p, idx) => `${idx === 0 ? "M" : "L"} ${scaleX(idx)} ${scaleY(p.value ?? 0)}`)
            .join(" ");

  const avgPath =
    avgValue == null
      ? ""
      : `M ${padding} ${scaleY(avgValue)} L ${width - padding} ${scaleY(avgValue)}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
      {/* axes (very minimal) */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#ccc"
        strokeWidth="1"
      />
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="#ccc"
        strokeWidth="1"
      />

      {/* avg line */}
      {avgPath && (
        <path
          d={avgPath}
          stroke="#888"
          strokeDasharray="4 4"
          strokeWidth="1"
          fill="none"
        />
      )}

      {/* main line */}
      <path d={linePath} stroke="#1f2937" strokeWidth="2" fill="none" />

      {/* last point label */}
      {points.length > 0 && (
        <text
          x={scaleX(points.length - 1)}
          y={scaleY(points[points.length - 1].value ?? 0) - 4}
          textAnchor="end"
          fontSize="10"
          fill="#111827"
        >
          {labelFormatter
            ? labelFormatter(points[points.length - 1].value)
            : points[points.length - 1].value}
        </text>
      )}
    </svg>
  );
}

// Minimal media player for a variation (single file or first carousel item)
function VariationMediaPlayer({ variation }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!variation) return;
    setLoading(true);
    try {
      let path = null;
      if (Array.isArray(variation.carousel_files) && variation.carousel_files.length > 0) {
        path = variation.carousel_files[0];
      } else if (variation.file_name) {
        path = variation.file_name;
      }
      if (!path) {
        setMediaUrl(null);
        setLoading(false);
        return;
      }
      const { data, error } = supabase.storage
        .from("post-variations")
        .getPublicUrl(path);
      if (error) {
        console.error("Error getting media URL", error);
        setMediaUrl(null);
      } else {
        setMediaUrl(data.publicUrl);
      }
    } catch (e) {
      console.error(e);
      setMediaUrl(null);
    } finally {
      setLoading(false);
    }
  }, [variation]);

  if (loading) {
    return <div className="text-sm text-gray-600">Loading media…</div>;
  }
  if (!mediaUrl) {
    return <div className="text-sm text-gray-500">No media attached.</div>;
  }

  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(mediaUrl);
  const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(mediaUrl);

  return (
    <div className="w-full">
      {isImage && (
        <img
          src={mediaUrl}
          alt={variation.file_name || "variation media"}
          className="max-h-[320px] w-full object-contain rounded-lg"
        />
      )}
      {isVideo && (
        <video
          src={mediaUrl}
          controls
          className="max-h-[320px] w-full object-contain rounded-lg bg-black"
        />
      )}
      {!isImage && !isVideo && (
        <div className="text-sm text-gray-500">
          Unsupported file type for preview.
        </div>
      )}
    </div>
  );
}

// ----- main page -----

export default function PostsStatsPage() {
  const [activeTab, setActiveTab] = useState("youtube");

  const [artistOptions, setArtistOptions] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");

  const [artists, setArtists] = useState([]);
  const [posts, setPosts] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [tiktokInfo, setTiktokInfo] = useState({
    loading: false,
    error: "",
    tokenCount: 0,
    postCount: 0,
    snapshotCount: 0,
  });

  const [ytManualRun, setYtManualRun] = useState({ loading: false, msg: "" });
  const [tierTopLimit, setTierTopLimit] = useState({});
  const [tierShowWorst, setTierShowWorst] = useState({});

  // TikTok stats state
  const [ttManualRun, setTtManualRun] = useState({ loading: false, msg: "" });
  const [tiktokPosts, setTiktokPosts] = useState([]);
  const [tiktokSnapshots, setTiktokSnapshots] = useState([]);
  const [tiktokLoadingData, setTiktokLoadingData] = useState(false);
  const [tiktokErrorMsg, setTiktokErrorMsg] = useState("");
  const [tiktokTierTopLimit, setTiktokTierTopLimit] = useState({});
  const [tiktokTierShowWorst, setTiktokTierShowWorst] = useState({});

   // Instagram stats state
   const [igManualRun, setIgManualRun] = useState({ loading: false, msg: "" });
   const [instagramPosts, setInstagramPosts] = useState([]);
   const [instagramSnapshots, setInstagramSnapshots] = useState([]);
   const [instagramLoadingData, setInstagramLoadingData] = useState(false);
   const [instagramErrorMsg, setInstagramErrorMsg] = useState("");
   const [instagramTierTopLimit, setInstagramTierTopLimit] = useState({});
   const [instagramTierShowWorst, setInstagramTierShowWorst] = useState({});

  async function runYouTubeManualCollect() {
    try {
      setYtManualRun({ loading: true, msg: "" });
  
      const res = await fetch("/api/metrics/youtube-batch-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
  
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        console.error("Manual collect returned non-JSON:", text);
        setYtManualRun({ loading: false, msg: "Manual collect failed: non-JSON response (see console)" });
        return;
      }
  
      console.log("YouTube manual batch result:", json);
  
      if (!res.ok) {
        setYtManualRun({ loading: false, msg: json?.error || "Manual collect failed (see console)" });
        return;
      }
  
      setYtManualRun({
        loading: false,
        msg: `Collected. successCount=${json.successCount ?? "?"}, processed=${json.processed ?? "?"}`,
      });
  
      //window.location.reload();
    } catch (e) {
      console.error(e);
      setYtManualRun({ loading: false, msg: "Manual collect crashed (see console)" });
    }
  }  

async function runInstagramManualCollect() {
  try {
    setIgManualRun({ loading: true, msg: "" });

    const res = await fetch("/api/metrics/instagram-batch-manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("IG manual collect returned non-JSON:", text);
      setIgManualRun({
        loading: false,
        msg: "Manual collect failed: non-JSON response (see console)",
      });
      return;
    }

    console.log("Instagram manual batch result:", json);

    if (!res.ok) {
      setIgManualRun({
        loading: false,
        msg: `Manual collect failed: ${json?.error || res.statusText}`,
      });
      return;
    }

    setIgManualRun({
      loading: false,
      msg: `OK: processed ${json?.processed ?? "?"} posts`,
    });
  } catch (e) {
    console.error(e);
    setIgManualRun({ loading: false, msg: `Manual collect error: ${String(e)}` });
  }
}


  async function runTikTokManualCollect() {
    try {
      setTtManualRun({ loading: true, msg: "" });
  
      const res = await fetch("/api/metrics/tiktok-batch-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
  
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        console.error("TikTok manual batch returned non-JSON:", text);
        setTtManualRun({
          loading: false,
          msg: "TikTok collect failed: non-JSON response (see console)",
        });
        return;
      }
  
      console.log("TikTok batch result:", json);
  
      if (!res.ok) {
        setTtManualRun({
          loading: false,
          msg: json?.error || "TikTok collect failed (see console)",
        });
        return;
      }
  
      setTtManualRun({
        loading: false,
        msg: `TikTok collected: successCount=${json.successCount ?? "?"}, processed=${json.processed ?? "?"}`,
      });
  
      // reload TikTok posts + snapshots
      await loadTikTokData();
    } catch (e) {
      console.error(e);
      setTtManualRun({
        loading: false,
        msg: "TikTok collect crashed (see console)",
      });
    }
  }  

  // Modal state
  const [selectedPost, setSelectedPost] = useState(null);
  const [recentPostsDays, setRecentPostsDays] = useState(14);
  const [selectedPostVariations, setSelectedPostVariations] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [igLinkModalPost, setIgLinkModalPost] = useState(null);
  const [ytLinkModalPost, setYtLinkModalPost] = useState(null);
  const [ttLinkModalPost, setTtLinkModalPost] = useState(null);

  useEffect(() => {
    async function loadTikTokInfo() {
      if (activeTab !== "tiktok") return;
  
      setTiktokInfo((p) => ({ ...p, loading: true, error: "" }));
  
      try {
        // 1) count connected TikTok tokens
        const { data: tokens, error: tokenErr } = await supabase
          .from("artist_social_auth_status")
          .select("artist_id", { count: "exact", head: true })
          .eq("platform", "tiktok")
          .eq("status", "ok");
  
        if (tokenErr) throw tokenErr;
  
        // 2) count posted posts with tiktok_url
        // IMPORTANT: if your column is not tiktok_url, tell me the correct name.
        const { error: postErr, count: postCount } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "posted")
          .not("tiktok_url", "is", null);
  
        if (postErr) throw postErr;
  
        // 3) count tiktok snapshots
        const { error: snapErr, count: snapCount } = await supabase
          .from("post_metrics_snapshots")
          .select("id", { count: "exact", head: true })
          .eq("platform", "tiktok");
  
        if (snapErr) throw snapErr;
  
        setTiktokInfo({
          loading: false,
          error: "",
          tokenCount: tokens?.length ? tokens.length : 0, // head:true often returns null data; count not returned by v2 client reliably
          postCount: postCount || 0,
          snapshotCount: snapCount || 0,
        });
      } catch (e) {
        console.error(e);
        setTiktokInfo((p) => ({
          ...p,
          loading: false,
          error: "Failed to load TikTok status (check console / column name).",
        }));
      }
    }
  
    loadTikTokInfo();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "tiktok" || activeTab === "standout") {
      loadTikTokData();
    }
  }, [activeTab, selectedArtistId]);

  async function loadTikTokData() {
    try {
      setTiktokLoadingData(true);
      setTiktokErrorMsg("");
  
      // 1) Load posted posts that have a TikTok URL
      const { data: postRows, error: postErr } = selectedArtistId
        ? await supabase
            .from("posts")
            .select("id, post_name, post_date, status, artist_id, tiktok_url, notes, post_type")
            .eq("status", "posted")
            .not("tiktok_url", "is", null)
            .eq("artist_id", Number(selectedArtistId))
        : await supabase
            .from("posts")
            .select("id, post_name, post_date, status, artist_id, tiktok_url, notes, post_type")
            .eq("status", "posted")
            .not("tiktok_url", "is", null);
      if (postErr) throw postErr;
  
      const postIds = (postRows || []).map((p) => p.id);

      // 🐛 DEBUG: Check postIds array
      console.log('🔍 postIds array length:', postIds.length);
      console.log('🔍 Is 312 in postIds?', postIds.includes(312));
      console.log('🔍 Is "312" (string) in postIds?', postIds.includes("312"));
      console.log('🔍 Type of first post ID:', typeof postIds[0], postIds[0]);
      const post312Data = postRows?.find(p => p.id === 312);
      if (post312Data) {
        console.log('🔍 Post 312 data:', {
          id: post312Data.id,
          type: typeof post312Data.id,
          instagram_url: post312Data.instagram_url
        });
      }

      // 2) Load TikTok snapshots for those posts (only last 90 days)
      let snapshotRows = [];
        if (postIds.length > 0) {
          // Only fetch snapshots from the last 90 days to improve performance
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          
          // Load snapshots with pagination to get ALL rows
          let allSnapshots = [];
          let from = 0;
          const pageSize = 1000;
          let hasMore = true;

          console.log('🔍 Starting snapshot pagination for TikTok...');

          while (hasMore) {
            const { data: snapRows, error: snapErr } = await supabase
              .from("post_metrics_snapshots")
              .select("*")
              .in("post_id", postIds)
              .eq("platform", "tiktok")
              .order("snapshot_at", { ascending: true })
              .range(from, from + pageSize - 1);

            if (snapErr) throw snapErr;

            console.log(`🔍 TikTok page: ${from}-${from + pageSize}, got ${snapRows?.length || 0} rows`);

            if (snapRows && snapRows.length > 0) {
              allSnapshots = allSnapshots.concat(snapRows);
              from += pageSize;
              if (snapRows.length < pageSize) hasMore = false;
            } else {
              hasMore = false;
            }

            if (from > 100000) {
              console.warn('⚠️ Hit safety limit');
              hasMore = false;
            }
          }

          snapshotRows = allSnapshots;
          console.log('🔍 Total TikTok snapshots after pagination:', snapshotRows.length);
      }
  
      setTiktokPosts(postRows || []);
      setTiktokSnapshots(snapshotRows);
      setTiktokTierTopLimit({});
      setTiktokTierShowWorst({});
    } catch (err) {
      console.error("Error loading TikTok stats data:", err);
      setTiktokErrorMsg(
        "Could not load TikTok stats data. Check console for details."
      );
    } finally {
      setTiktokLoadingData(false);
    }
  }  

  useEffect(() => {
    if (activeTab === "instagram" || activeTab === "standout") {
      loadInstagramData();
    }
  }, [activeTab, selectedArtistId]);

  async function loadInstagramData() {
    try {
      setInstagramLoadingData(true);
      setInstagramErrorMsg("");

      // 1) Load posted posts that have an Instagram URL
      const { data: postRows, error: postErr } = selectedArtistId
        ? await supabase
            .from("posts")
            .select("id, post_name, post_date, status, artist_id, instagram_url, notes")
            .eq("status", "posted")
            .not("instagram_url", "is", null)
            .eq("artist_id", Number(selectedArtistId))
        : await supabase
            .from("posts")
            .select("id, post_name, post_date, status, artist_id, instagram_url, notes")
            .eq("status", "posted")
            .not("instagram_url", "is", null);
      if (postErr) throw postErr;

      // 🐛 DEBUG: Check if post 312 is included
      console.log('🔍 Instagram posts loaded:', postRows?.length || 0);
      const post312 = postRows?.find(p => p.id === 312);
      console.log('🔍 Post 312 in Instagram posts?', post312 ? 'YES' : 'NO', post312);

      const postIds = (postRows || []).map((p) => p.id);

      // 2) Load Instagram snapshots for those posts
      let snapshotRows = [];
        if (postIds.length > 0) {
          // Only fetch snapshots from the last 90 days
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          
          // Load snapshots with pagination to get ALL rows (not just 1000)
          let allSnapshots = [];
          let from = 0;
          const pageSize = 1000;
          let hasMore = true;

          console.log('🔍 Starting snapshot pagination for Instagram...');

          while (hasMore) {
            const { data: snapRows, error: snapErr, count } = await supabase
              .from("post_metrics_snapshots")
              .select("*", { count: 'exact' })
              .in("post_id", postIds)
              .eq("platform", "instagram")
              .order("snapshot_at", { ascending: true })
              .range(from, from + pageSize - 1);

            if (snapErr) throw snapErr;

            console.log(`🔍 Loaded page: ${from}-${from + pageSize}, got ${snapRows?.length || 0} rows, total count: ${count}`);

            if (snapRows && snapRows.length > 0) {
              allSnapshots = allSnapshots.concat(snapRows);
              from += pageSize;
              
              // Check if we got fewer than pageSize (means we're done)
              if (snapRows.length < pageSize) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }

            // Safety: don't infinite loop if something goes wrong
            if (from > 100000) {
              console.warn('⚠️ Hit safety limit of 100k rows');
              hasMore = false;
            }
          }

          snapshotRows = allSnapshots;
          console.log('🔍 Total Instagram snapshots after pagination:', snapshotRows.length);
      }

      // 🐛 DEBUG: Check snapshots for post 312
      const snaps312 = snapshotRows.filter(s => s.post_id === 312);
      console.log('🔍 Instagram snapshots for post 312:', snaps312.length, snaps312);
      if (snaps312.length > 0) {
        const latest = snaps312[snaps312.length - 1]; // Last one (most recent due to sort)
        console.log('🔍 Latest Instagram snapshot for 312:', {
          views: latest.views,
          likes: latest.likes,
          comments: latest.comments,
          snapshot_at: latest.snapshot_at
        });
      }

      setInstagramPosts(postRows || []);
      setInstagramSnapshots(snapshotRows);
      setInstagramTierTopLimit({});
      setInstagramTierShowWorst({});
      
      // 🐛 DEBUG: Log final state
      console.log('🔍 Total Instagram snapshots loaded:', snapshotRows.length);
      
    } catch (err) {
      console.error(err);
      setInstagramErrorMsg(err.message || "Failed to load Instagram data");
    } finally {
      setInstagramLoadingData(false);
    }
  }

  useEffect(() => {
    const loadArtists = async () => {
      try {
        const { data, error } = await supabase
          .from("artists")
          .select("id, name")
          .not("id", "in", "(1, 2, 3)")
          .eq("active_client", true)
          .order("name", { ascending: true });
  
        if (error) {
          console.error("Supabase error (artists):", error);
          return;
        }
        setArtistOptions(data || []);
        
      } catch (e) {
        console.error("Failed to load artists list", e);
      }
    };
    loadArtists();
  }, []);

  // ---- load overview data ----
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg("");

        // load artists (all columns so future fields like youtube_followers work automatically)
        const { data: artistRows, error: artistErr } = await supabase
          .from("artists")
          .select("*");
        if (artistErr) throw artistErr;

        // load YT posts only for now (status posted & has youtube_url)
        const { data: postRows, error: postErr } = selectedArtistId
        ? await supabase
            .from("posts")
            .select("id, post_name, post_date, status, artist_id, youtube_url, notes, post_type")
            .eq("status", "posted")
            .not("youtube_url", "is", null)
            .eq("artist_id", Number(selectedArtistId))
        : await supabase
            .from("posts")
            .select("id, post_name, post_date, status, artist_id, youtube_url, notes, post_type")
            .eq("status", "posted")
            .not("youtube_url", "is", null);
        if (postErr) throw postErr;

        const postIds = (postRows || []).map((p) => p.id);
          let snapshotRows = [];
          if (postIds.length > 0) {
            // Only fetch snapshots from the last 90 days to improve performance
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            // Load snapshots with pagination to get ALL rows
            let allSnapshots = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            console.log('🔍 Starting snapshot pagination for YouTube...');

            while (hasMore) {
              const { data: snapRows, error: snapErr } = await supabase
                .from("post_metrics_snapshots")
                .select("*")
                .in("post_id", postIds)
                .eq("platform", PLATFORM_YOUTUBE_SHORTS)
                .order("snapshot_at", { ascending: true })
                .range(from, from + pageSize - 1);

              if (snapErr) throw snapErr;

              console.log(`🔍 YouTube page: ${from}-${from + pageSize}, got ${snapRows?.length || 0} rows`);

              if (snapRows && snapRows.length > 0) {
                allSnapshots = allSnapshots.concat(snapRows);
                from += pageSize;
                if (snapRows.length < pageSize) hasMore = false;
              } else {
                hasMore = false;
              }

              if (from > 100000) {
                console.warn('⚠️ Hit safety limit');
                hasMore = false;
              }
            }

            snapshotRows = allSnapshots;
            console.log('🔍 Total YouTube snapshots after pagination:', snapshotRows.length);
        }

        setArtists(artistRows || []);
        setPosts(postRows || []);
        setSnapshots(snapshotRows);
        setTierTopLimit({});
        setTierShowWorst({});
      } catch (err) {
        console.error("Error loading stats data:", err);
        setErrorMsg("Could not load stats data. Check console for details.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedArtistId]);

  // helpful maps
  const artistById = useMemo(() => {
    const map = new Map();
    artists.forEach((a) => map.set(a.id, a));
    return map;
  }, [artists]);

  const postById = useMemo(() => {
    const map = new Map();

    (posts || []).forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
    });

    (tiktokPosts || []).forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
      else map.set(p.id, { ...map.get(p.id), ...p });
    });

    (instagramPosts || []).forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
      else map.set(p.id, { ...map.get(p.id), ...p });
    });

    return map;
  }, [posts, tiktokPosts, instagramPosts]);

  const snapshotsByPostId = useMemo(() => {
    const map = new Map();
    snapshots.forEach((s) => {
      if (!map.has(s.post_id)) map.set(s.post_id, []);
      map.get(s.post_id).push(s);
    });
    return map;
  }, [snapshots]);

  const latestSnapshotByPostId = useMemo(() => {
    const map = new Map();
    snapshots.forEach((s) => {
      const prev = map.get(s.post_id);
      if (!prev || new Date(s.snapshot_at) > new Date(prev.snapshot_at)) {
        map.set(s.post_id, s);
      }
    });

    // DEBUG: Log info about the map
    console.log('🔍 YouTube latest snapshots map built:', map.size, 'posts');
    if (map.has(312)) {
      const snap = map.get(312);
      console.log('🔍 YouTube snap for 312:', {
        views: snap.views,
        likes: snap.likes,
        comments: snap.comments,
        snapshot_at: snap.snapshot_at
      });
    } else {
      console.log('🔍 YouTube snap for 312: NOT FOUND in map');
    }

    return map;
  }, [snapshots]);

  // TikTok-specific maps
const tiktokSnapshotsByPostId = useMemo(() => {
  const map = new Map();
  tiktokSnapshots.forEach((s) => {
    if (!map.has(s.post_id)) map.set(s.post_id, []);
    map.get(s.post_id).push(s);
  });
  return map;
}, [tiktokSnapshots]);

const tiktokLatestSnapshotByPostId = useMemo(() => {
  const map = new Map();
  tiktokSnapshots.forEach((s) => {
    const prev = map.get(s.post_id);
    if (!prev || new Date(s.snapshot_at) > new Date(prev.snapshot_at)) {
      map.set(s.post_id, s);
    }
  });
  
  // DEBUG: Log info about the map
  console.log('🔍 TikTok latest snapshots map built:', map.size, 'posts');
  if (map.has(312)) {
    const snap = map.get(312);
    console.log('🔍 TikTok snap for 312:', {
      views: snap.views,
      likes: snap.likes,
      comments: snap.comments,
      snapshot_at: snap.snapshot_at
    });
  } else {
    console.log('🔍 TikTok snap for 312: NOT FOUND in map');
  }
  
  return map;
}, [tiktokSnapshots]);

  
  const postsWithData = useMemo(() => {
    return (posts || []).filter((p) => latestSnapshotByPostId.has(p.id));
  }, [posts, latestSnapshotByPostId]);

  const tiktokPostsWithData = useMemo(() => {
    return (tiktokPosts || []).filter((p) =>
      tiktokLatestSnapshotByPostId.has(p.id)
    );
  }, [tiktokPosts, tiktokLatestSnapshotByPostId]);

    // Instagram-specific maps
    const instagramSnapshotsByPostId = useMemo(() => {
      const map = new Map();
      instagramSnapshots.forEach((s) => {
        if (!map.has(s.post_id)) map.set(s.post_id, []);
        map.get(s.post_id).push(s);
      });
      return map;
    }, [instagramSnapshots]);
  
    const instagramLatestSnapshotByPostId = useMemo(() => {
      const map = new Map();
      instagramSnapshots.forEach((s) => {
        const prev = map.get(s.post_id);
        if (!prev || new Date(s.snapshot_at) > new Date(prev.snapshot_at)) {
          map.set(s.post_id, s);
        }
      });

      //DEBUG: Log info about the map
      console.log('🔍 Instagram latest snapshots map built:', map.size, 'posts');
      if (map.has(312)) {
        const snap = map.get(312);
        console.log('🔍 Instagram snap for 312:', {
          views: snap.views,
          likes: snap.likes,
          comments: snap.comments,
          snapshot_at: snap.snapshot_at
        });
      } else {
        console.log('🔍 Instagram snap for 312: NOT FOUND in map');
      }

      return map;
    }, [instagramSnapshots]);
  
    const instagramPostsWithData = useMemo(() => {
      return (instagramPosts || []).filter((p) =>
        instagramLatestSnapshotByPostId.has(p.id)
      );
    }, [instagramPosts, instagramLatestSnapshotByPostId]);

    // 🐛 DEBUG: Check if post 312 makes it through the filters
    useEffect(() => {
      if (activeTab === 'instagram') {
        console.log('━━━ INSTAGRAM TAB STATE CHECK ━━━');
        console.log('🔍 instagramPosts count:', instagramPosts.length);
        console.log('🔍 instagramSnapshots count:', instagramSnapshots.length);
        console.log('🔍 instagramPostsWithData count:', instagramPostsWithData.length);
        
        const post312InPosts = instagramPosts.find(p => p.id === 312);
        console.log('🔍 Post 312 in instagramPosts?', post312InPosts ? 'YES' : 'NO');
        
        const snap312 = instagramLatestSnapshotByPostId.get(312);
        console.log('🔍 Latest snapshot for 312:', snap312 ? {
          views: snap312.views,
          likes: snap312.likes,
          comments: snap312.comments
        } : 'NONE');
        
        const post312HasData = instagramPostsWithData.find(p => p.id === 312);
        console.log('🔍 Post 312 in instagramPostsWithData?', post312HasData ? 'YES' : 'NO');
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    }, [activeTab, instagramPosts, instagramSnapshots, instagramPostsWithData, instagramLatestSnapshotByPostId]);
  
    const instagramPostsWithoutData = useMemo(() => {
      if (!instagramPosts || instagramPosts.length === 0) return [];
      return instagramPosts.filter(
        (p) => !instagramLatestSnapshotByPostId.has(p.id)
      );
    }, [instagramPosts, instagramLatestSnapshotByPostId]);

    // ADD THIS NEW MEMO FOR YOUTUBE:
    const postsWithoutData = useMemo(() => {
      if (!posts || posts.length === 0) return [];
      return posts.filter(
        (p) => !latestSnapshotByPostId.has(p.id) && p.post_type !== "Carousel"
      );
    }, [posts, latestSnapshotByPostId]);

    // ADD THIS NEW MEMO FOR TIKTOK:
    const tiktokPostsWithoutData = useMemo(() => {
      if (!tiktokPosts || tiktokPosts.length === 0) return [];
      return tiktokPosts.filter(
        (p) => !tiktokLatestSnapshotByPostId.has(p.id) && p.post_type !== "Carousel"
      );
    }, [tiktokPosts, tiktokLatestSnapshotByPostId]);

    const instagramArtistAverages = useMemo(() => {
      const byArtist = new Map();
  
      instagramPosts.forEach((post) => {
        const snap = instagramLatestSnapshotByPostId.get(post.id);
        if (!snap) return;
        if (!byArtist.has(post.artist_id)) {
          byArtist.set(post.artist_id, { rows: [] });
        }
        byArtist.get(post.artist_id).rows.push(snap);
      });
  
      const result = new Map();
      byArtist.forEach((value, artistId) => {
        const rows = value.rows
          .sort(
            (a, b) =>
              new Date(b.snapshot_at).getTime() -
              new Date(a.snapshot_at).getTime()
          )
          .slice(0, 15);
  
        if (rows.length === 0) return;
        const avg = (key) =>
          rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0) /
          rows.length;
  
        result.set(artistId, {
          views: avg("views"),
          likes: avg("likes"),
          comments: avg("comments"),
          saves: avg("saves"),
          shares: avg("shares"),
        });
      });
  
      return result;
    }, [instagramPosts, instagramLatestSnapshotByPostId]);  
  
  // YT compute per-artist averages from last 15 posts (using latest snapshot only)
  const artistAverages = useMemo(() => {
    const byArtist = new Map();

    posts.forEach((post) => {
      const snap = latestSnapshotByPostId.get(post.id);
      if (!snap) return;
      if (!byArtist.has(post.artist_id)) {
        byArtist.set(post.artist_id, { rows: [] });
      }
      byArtist.get(post.artist_id).rows.push(snap);
    });

    const result = new Map();
    byArtist.forEach((value, artistId) => {
      const rows = value.rows
        .sort(
          (a, b) =>
            new Date(b.snapshot_at).getTime() - new Date(a.snapshot_at).getTime()
        )
        .slice(0, 15);

      if (rows.length === 0) return;
      const sum = (key) =>
        rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0) / rows.length;

      result.set(artistId, {
        views: sum("views"),
        likes: sum("likes"),
        comments: sum("comments"),
        reach: sum("reach"),
        avg_view_duration: sum("avg_view_duration"),
        retention_rate: sum("retention_rate"),
        completion_rate: sum("completion_rate"),
      });
    });

    return result;
  }, [posts, latestSnapshotByPostId]);

  // TikTok per-artist averages from last 15 posts (latest snapshot only)
const tiktokArtistAverages = useMemo(() => {
  const byArtist = new Map();

  tiktokPosts.forEach((post) => {
    const snap = tiktokLatestSnapshotByPostId.get(post.id);
    if (!snap) return;
    if (!byArtist.has(post.artist_id)) {
      byArtist.set(post.artist_id, { rows: [] });
    }
    byArtist.get(post.artist_id).rows.push(snap);
  });

  const result = new Map();
  byArtist.forEach((value, artistId) => {
    const rows = value.rows
      .sort(
        (a, b) =>
          new Date(b.snapshot_at).getTime() - new Date(a.snapshot_at).getTime()
      )
      .slice(0, 15);

    if (rows.length === 0) return;
    const avg = (key) =>
      rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0) / rows.length;

    result.set(artistId, {
      views: avg("views"),
      likes: avg("likes"),
      comments: avg("comments"),
      shares: avg("shares"),
      tiktok_retention_score: avg("tiktok_retention_score"),
      tiktok_shareability_score: avg("tiktok_shareability_score"),
    });
  });

  return result;
}, [tiktokPosts, tiktokLatestSnapshotByPostId]);

const crossStandoutsByCategory = useMemo(() => {
  const result = {
    shares: [],
    comments: [],
    retention: [],
    views: [],
  };

  const allPostIds = new Set();
  (posts || []).forEach((p) => allPostIds.add(p.id));
  (tiktokPosts || []).forEach((p) => allPostIds.add(p.id));
  (instagramPosts || []).forEach((p) => allPostIds.add(p.id));

  const rel = (postVal, avgVal) => {
    const pv = Number(postVal);
    const av = Number(avgVal);
    if (!isFinite(pv) || !isFinite(av) || av <= 0) return 0;
    return (pv - av) / av;
  };

  allPostIds.forEach((postId) => {
    const post = postById.get(postId);
    if (!post) return;
    const artistId = post.artist_id;
    if (!artistId) return;

    const categoryState = {
      shares: { score: 0, platforms: new Set() },
      comments: { score: 0, platforms: new Set() },
      retention: { score: 0, platforms: new Set() },
      views: { score: 0, platforms: new Set() },
    };

    // ----- YouTube contributions -----
    const ytSnap = latestSnapshotByPostId.get(postId);
    const ytAvg = artistAverages.get(artistId);

    if (ytSnap && ytAvg) {
      const ytViews = Number(ytSnap.views) || 0;
      const ytAvgViews = Number(ytAvg.views) || 0;

      // Comments / 1k views
      if (ytViews > 0 && ytAvgViews > 0) {
        const postRate =
          ((Number(ytSnap.comments) || 0) / ytViews) * 1000;
        const avgRate =
          ((Number(ytAvg.comments) || 0) / ytAvgViews) * 1000;
        const d = rel(postRate, avgRate);
        if (d > 0) {
          categoryState.comments.score += d;
          categoryState.comments.platforms.add("YouTube");
        }
      }

      // Retention rate
      const dRet = rel(ytSnap.retention_rate, ytAvg.retention_rate);
      if (dRet > 0) {
        categoryState.retention.score += dRet;
        categoryState.retention.platforms.add("YouTube");
      }

      // Views
      const dViews = rel(ytSnap.views, ytAvg.views);
      if (dViews > 0) {
        categoryState.views.score += dViews;
        categoryState.views.platforms.add("YouTube");
      }
    }

    // ----- TikTok contributions -----
    const ttSnap = tiktokLatestSnapshotByPostId.get(postId);
    const ttAvg = tiktokArtistAverages.get(artistId);

    if (ttSnap && ttAvg) {
      const ttViews = Number(ttSnap.views) || 0;
      const ttAvgViews = Number(ttAvg.views) || 0;

      // Shareability (shares / 1k views)
      const dShare = rel(
        ttSnap.tiktok_shareability_score,
        ttAvg.tiktok_shareability_score
      );
      if (dShare > 0) {
        categoryState.shares.score += dShare;
        categoryState.shares.platforms.add("TikTok");
      }

      // Comments / 1k views
      if (ttViews > 0 && ttAvgViews > 0) {
        const postCommentsRate =
          ((Number(ttSnap.comments) || 0) / ttViews) * 1000;
        const avgCommentsRate =
          ((Number(ttAvg.comments) || 0) / ttAvgViews) * 1000;
        const dComments = rel(postCommentsRate, avgCommentsRate);
        if (dComments > 0) {
          categoryState.comments.score += dComments;
          categoryState.comments.platforms.add("TikTok");
        }

        // Views
        const dViews = rel(ttSnap.views, ttAvg.views);
        if (dViews > 0) {
          categoryState.views.score += dViews;
          categoryState.views.platforms.add("TikTok");
        }
      }

      // Retention (tiktok_retention_score)
      const dRet = rel(
        ttSnap.tiktok_retention_score,
        ttAvg.tiktok_retention_score
      );
      if (dRet > 0) {
        categoryState.retention.score += dRet;
        categoryState.retention.platforms.add("TikTok");
      }
    }

    // ----- Instagram contributions -----
    const igSnap = instagramLatestSnapshotByPostId.get(postId);
    const igAvg = instagramArtistAverages.get(artistId);

    if (igSnap && igAvg) {
      const igViews = Number(igSnap.views) || 0;
      const igAvgViews = Number(igAvg.views) || 0;

      if (igViews > 0 && igAvgViews > 0) {
        // Shares / 1k views
        const postSharesRate =
          ((Number(igSnap.shares) || 0) / igViews) * 1000;
        const avgSharesRate =
          ((Number(igAvg.shares) || 0) / igAvgViews) * 1000;
        const dShares = rel(postSharesRate, avgSharesRate);
        if (dShares > 0) {
          categoryState.shares.score += dShares;
          categoryState.shares.platforms.add("Instagram");
        }

        // Comments / 1k views
        const postCommentsRate =
          ((Number(igSnap.comments) || 0) / igViews) * 1000;
        const avgCommentsRate =
          ((Number(igAvg.comments) || 0) / igAvgViews) * 1000;
        const dComments = rel(postCommentsRate, avgCommentsRate);
        if (dComments > 0) {
          categoryState.comments.score += dComments;
          categoryState.comments.platforms.add("Instagram");
        }

        // Views
        const dViews = rel(igSnap.views, igAvg.views);
        if (dViews > 0) {
          categoryState.views.score += dViews;
          categoryState.views.platforms.add("Instagram");
        }
      }
    }

    ["shares", "comments", "retention", "views"].forEach((key) => {
      const st = categoryState[key];
      if (st.platforms.size >= 2 && st.score > 0) {
        result[key].push({
          postId,
          artistId,
          score: st.score,
          platforms: Array.from(st.platforms),
        });
      }
    });
  });

  Object.keys(result).forEach((key) => {
    result[key].sort((a, b) => b.score - a.score);
  });

  return result;
}, [
  posts,
  tiktokPosts,
  instagramPosts,
  postById,
  artistById,
  latestSnapshotByPostId,
  tiktokLatestSnapshotByPostId,
  instagramLatestSnapshotByPostId,
  artistAverages,
  tiktokArtistAverages,
  instagramArtistAverages,
]);

const recentPosts = useMemo(() => {
    console.log('━━━ BUILDING RECENT POSTS ━━━');
    
    const allPostIds = new Set();
    (posts || []).forEach((p) => allPostIds.add(p.id));
    (tiktokPosts || []).forEach((p) => allPostIds.add(p.id));
    (instagramPosts || []).forEach((p) => allPostIds.add(p.id));

    console.log('🔍 Total unique post IDs:', allPostIds.size);
    console.log('🔍 YouTube posts:', posts?.length || 0);
    console.log('🔍 TikTok posts:', tiktokPosts?.length || 0);
    console.log('🔍 Instagram posts:', instagramPosts?.length || 0);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - recentPostsDays);
    console.log('🔍 Cutoff date:', cutoffDate.toISOString());

    const filtered = [];
    allPostIds.forEach((postId) => {
      const post = postById.get(postId);
      if (!post || !post.post_date) return;
      
      const postDate = new Date(post.post_date);
      if (postDate >= cutoffDate) {
        const ytSnap = latestSnapshotByPostId.get(postId);
        const ttSnap = tiktokLatestSnapshotByPostId.get(postId);
        const igSnap = instagramLatestSnapshotByPostId.get(postId);

        // DEBUG for specific post
        if (postId === 312) {
          console.log('🔍 Post 312 in recent posts calculation:');
          console.log('  - Post date:', postDate.toISOString());
          console.log('  - YT snapshot:', ytSnap ? `${ytSnap.views} views` : 'NONE');
          console.log('  - TT snapshot:', ttSnap ? `${ttSnap.views} views` : 'NONE');
          console.log('  - IG snapshot:', igSnap ? `${igSnap.views} views` : 'NONE');
        }

        const totalViews =
          (Number(ytSnap?.views) || 0) +
          (Number(ttSnap?.views) || 0) +
          (Number(igSnap?.views) || 0);

        if (totalViews > -1) {
          filtered.push({
            post,
            totalViews,
            ytSnap,
            ttSnap,
            igSnap,
          });
        }
      }
    });

    console.log('🔍 Filtered recent posts:', filtered.length);
    console.log('🔍 Sample recent post IDs:', filtered.slice(0, 5).map(p => p.post.id));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    filtered.sort((a, b) => b.totalViews - a.totalViews);
    return filtered;
  }, [
    posts,
    tiktokPosts,
    instagramPosts,
    postById,
    latestSnapshotByPostId,
    tiktokLatestSnapshotByPostId,
    instagramLatestSnapshotByPostId,
    recentPostsDays,
  ]);

  // YT group posts by channel size tier (based on artist.youtube_followers or "Unknown")
  function getArtistTier(artist) {
    const followers = artist?.youtube_followers;
    if (followers == null || Number.isNaN(Number(followers))) return "Unknown size";
    if (followers < 100) return "Under 100 followers";
    if (followers < 1000) return "100–1k followers";
    return "Over 1k followers";
  }  

  function getTikTokTier(artist) {
    const followers = artist?.tiktok_followers;
    if (followers == null || Number.isNaN(Number(followers)))
      return "Unknown size";
    if (followers < 300) return "Under 300 followers";
    if (followers < 1000) return "300–1k followers";
    return "Over 1k followers";
  }  

  function getInstagramTier(artist) {
    // adjust this field name if your artists table uses a different one
    const followers = artist?.ig_followers;
    if (followers == null || Number.isNaN(Number(followers)))
      return "Unknown size";
    if (followers < 1000) return "Under 1k followers";
    if (followers < 3000) return "1k–3k followers";
    return "Over 3k followers";
  }

  const instagramPostsByTier = useMemo(() => {
    const buckets = new Map();

    instagramPostsWithData.forEach((p) => {
      const artist = artistById.get(p.artist_id);
      const tier = getInstagramTier(artist);
      if (!buckets.has(tier)) buckets.set(tier, []);
      buckets.get(tier).push(p);
    });

    // sort each tier's posts by Instagram score desc
    buckets.forEach((list) => {
      list.sort((a, b) => {
        const snapA = instagramLatestSnapshotByPostId.get(a.id);
        const snapB = instagramLatestSnapshotByPostId.get(b.id);
        const scoreA = computeInstagramScore(snapA);
        const scoreB = computeInstagramScore(snapB);
        return scoreB - scoreA;
      });
    });

    return buckets;
  }, [instagramPostsWithData, artistById, instagramLatestSnapshotByPostId]);

  const postsByTier = useMemo(() => {
    const buckets = new Map();

    postsWithData.forEach((p) => {
      const artist = artistById.get(p.artist_id);
      const tier = getArtistTier(artist);
      if (!buckets.has(tier)) buckets.set(tier, []);
      buckets.get(tier).push(p);
    });

    buckets.forEach((list) => {
      list.sort((a, b) => {
        const snapA = latestSnapshotByPostId.get(a.id);
        const snapB = latestSnapshotByPostId.get(b.id);
        const scoreA = computeYouTubeScore(snapA);
        const scoreB = computeYouTubeScore(snapB);
        return scoreB - scoreA;
      });
    });

    return buckets;
  }, [postsWithData, artistById, latestSnapshotByPostId]);

  const tiktokPostsByTier = useMemo(() => {
    const buckets = new Map();

    tiktokPostsWithData.forEach((p) => {
      const artist = artistById.get(p.artist_id);
      const tier = getTikTokTier(artist);
      if (!buckets.has(tier)) buckets.set(tier, []);
      buckets.get(tier).push(p);
    });

    // sort each tier's posts by TikTok score desc
    buckets.forEach((list) => {
      list.sort((a, b) => {
        const snapA = tiktokLatestSnapshotByPostId.get(a.id);
        const snapB = tiktokLatestSnapshotByPostId.get(b.id);
        const scoreA = computeTikTokScore(snapA);
        const scoreB = computeTikTokScore(snapB);
        return scoreB - scoreA;
      });
    });

    return buckets;
  }, [tiktokPostsWithData, artistById, tiktokLatestSnapshotByPostId]);

  async function openPostModal(post) {
    try {

      const artist = artistById.get(post.artist_id);
      const tierKey = getArtistTier(artist);
      const tierPosts = postsByTier.get(tierKey) || [];

      const standout = computeStandoutMetric({
        postId: post.id,
        tierPosts,
        latestSnapshotByPostId,
      });

      setSelectedPost((prev) => ({
        ...prev,
        __tierKey: tierKey,
        __standout: standout,
      }));

      setSelectedPost(post);
      setSelectedPostVariations([]);
      setModalLoading(true);

      const { data: variations, error: varErr } = await supabase
        .from("postvariations")
        .select("*")
        .eq("post_id", post.id)
        .order("test_version", { ascending: true });

      if (varErr) throw varErr;

      setSelectedPostVariations(variations || []);
    } catch (err) {
      console.error("Error loading post variations:", err);
      alert("Could not load variations for this post.");
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setSelectedPost(null);
    setSelectedPostVariations([]);
    setModalLoading(false);
  }

  function openIgLinkModal(post) {
    setIgLinkModalPost(post);
  }

  function closeIgLinkModal() {
    setIgLinkModalPost(null);
  }

  function openYtLinkModal(post) {
    setYtLinkModalPost(post);
  }

  function closeYtLinkModal() {
    setYtLinkModalPost(null);
  }

  function openTtLinkModal(post) {
    setTtLinkModalPost(post);
  }

  function closeTtLinkModal() {
    setTtLinkModalPost(null);
  }


  // ----- render helpers -----

  function renderYouTubeTab() {
    if (loading) {
      return <div className="text-sm text-gray-700">Loading…</div>;
    }
    if (errorMsg) {
      return (
        <div className="text-sm text-red-700 bg-white/70 rounded px-3 py-2">
          {errorMsg}
        </div>
      );
    }
    
    if (!posts.length) {
      return (
        <div className="text-sm text-gray-800">
          No posted YouTube items with URLs yet.
        </div>
      );
    }
    
    if (!postsWithData.length) {
      return (
        <div className="text-sm text-gray-800">
          No metrics collected yet (run “Manually collect data”).
        </div>
      );
    }
    

    const tiers = Array.from(postsByTier.keys()).sort((a, b) => {
      const order = ["0–10k subs", "10k–50k subs", "50k–100k subs", "100k+ subs", "Unknown size"];
      return order.indexOf(a) - order.indexOf(b);
    });

    return (
      <div className="space-y-6">

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-700">
            {ytManualRun.msg ? ytManualRun.msg : " "}
          </div>

          <button
            type="button"
            className="text-[11px] px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={runYouTubeManualCollect}
            disabled={ytManualRun.loading}
          >
            {ytManualRun.loading ? "Collecting…" : "Manually collect data"}
          </button>
        </div>
        
        {tiers.map((tierKey) => {
          const allTierPosts = postsByTier.get(tierKey) || [];
          const limit = tierTopLimit[tierKey] ?? 4;
          const postsInTier = allTierPosts.slice(0, limit);
          
          // worst 4 in tier (by latest views, falling back to 0)
          const worstInTier = [...allTierPosts]
            .filter((p) => latestSnapshotByPostId.has(p.id))
            .sort((a, b) => {
              const snapA = latestSnapshotByPostId.get(a.id);
              const snapB = latestSnapshotByPostId.get(b.id);
              const scoreA = computeYouTubeScore(snapA);
              const scoreB = computeYouTubeScore(snapB);
              return scoreA - scoreB;
            })
            .slice(0, 4);

          if (!postsInTier.length) return null;

          return (
            <details
                key={tierKey}
                className="bg-[#eef8ea] rounded-xl p-4 shadow-inner"
                open
                >
                <summary className="cursor-pointer select-none flex items-center justify-between">
                    <span className="text-lg font-semibold">{tierKey}</span>
                    <span className="text-xs text-gray-600">click to collapse</span>
                </summary>

                <div className="mt-3 mb-4 flex items-center gap-2">
                  <button
                    type="button"
                    className="text-[11px] px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTierTopLimit((prev) => ({
                        ...prev,
                        [tierKey]: (prev[tierKey] ?? 4) + 4,
                      }));
                    }}
                  >
                    Show more
                  </button>

                  <button
                    type="button"
                    className="text-[11px] px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTierShowWorst((prev) => ({
                        ...prev,
                        [tierKey]: !prev[tierKey],
                      }));
                    }}
                  >
                    See worst performing
                  </button>

                  <div className="text-[11px] text-gray-600 ml-auto">
                    Showing {Math.min(limit, allTierPosts.length)} of {allTierPosts.length}
                  </div>
                </div>

                {tierShowWorst[tierKey] && (
                  <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200 pb-4">
                    <div className="text-sm font-semibold mb-2">Worst performing (bottom 4)</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {worstInTier.map((post) => {
                        const artist = artistById.get(post.artist_id);
                        const latest = latestSnapshotByPostId.get(post.id);
                        const views = latest?.views;
                        const likes = latest?.likes;
                        const comments = latest?.comments;

                        return (
                          <button
                            key={post.id}
                            onClick={() => openPostModal(post)}
                            className="text-left bg-[#eef8ea] rounded-lg p-3 border border-gray-200 hover:border-gray-400 hover:shadow-sm transition flex flex-col gap-1"
                          >
                            <div className="text-sm font-semibold">
                              {post.post_name || "Untitled post"}
                            </div>
                            <div className="text-xs text-gray-600">
                              {artist?.name || "Unknown artist"} •{" "}
                              {post.post_date
                                ? new Date(post.post_date).toLocaleDateString()
                                : "No date"}
                            </div>
                            <div className="text-xs text-gray-700 mt-1">
                              <span className="font-semibold">{formatNumber(views)}</span> views •{" "}
                              {formatNumber(likes)} likes • {formatNumber(comments)} comments
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}


              <div className="grid gap-3 md:grid-cols-2">
              {postsInTier.map((post) => {
                const artist = artistById.get(post.artist_id);
                const latest = latestSnapshotByPostId.get(post.id);
                const artistAvg = artistAverages.get(post.artist_id);

                const views = latest?.views;
                const reach = latest?.reach;
                const likes = latest?.likes;
                const comments = latest?.comments;
                const completion = latest?.completion_rate;
                const retention = latest?.retention_rate;
                const avgViewDur = latest?.avg_view_duration;

                const viewsDelta = getMetricDelta(views, artistAvg?.views);
                const likesDelta = getMetricDelta(likes, artistAvg?.likes);
                const commentsDelta = getMetricDelta(comments, artistAvg?.comments);
                const retentionDelta = getMetricDelta(
                  retention,
                  artistAvg?.retention_rate
                );
                const avgViewDurDelta = getMetricDelta(
                  avgViewDur,
                  artistAvg?.avg_view_duration
                );

                return (
                  <button
                    key={post.id}
                    onClick={() => openPostModal(post)}
                    className="text-left bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-400 hover:shadow-sm transition flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="text-sm font-semibold">
                          {post.post_name || "Untitled post"}
                        </div>
                        <div className="text-xs text-gray-600">
                          {artist?.name || "Unknown artist"} •{" "}
                          {post.post_date ? formatShortDate(post.post_date) : "No date"}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <span className={viewsDelta.className}>
                          <span className="font-semibold">
                            {formatNumber(views)}
                          </span>
                          {viewsDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {viewsDelta.symbol}
                            </span>
                          )}
                        </span>{" "}
                        views
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-700">
                      <div>
                        Likes:{" "}
                        <span className={likesDelta.className}>
                          {formatNumber(likes)}
                          {likesDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {likesDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistAvg?.likes != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg:{" "}
                            {Number(artistAvg.likes).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </>
                        )}
                      </div>

                      <div>
                        Comments:{" "}
                        <span className={commentsDelta.className}>
                          {formatNumber(comments)}
                          {commentsDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {commentsDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistAvg?.comments != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg:{" "}
                            {Number(artistAvg.comments).toLocaleString(undefined, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </>
                        )}
                      </div>

                      <div>
                        Retention:{" "}
                        <span className={retentionDelta.className}>
                          {formatPercent(retention)}
                          {retentionDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {retentionDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistAvg?.retention_rate != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg: {formatPercent(artistAvg.retention_rate)}
                          </>
                        )}
                      </div>

                      <div>
                        Avg view duration:{" "}
                        <span className={avgViewDurDelta.className}>
                          {formatSecondsToHMS(avgViewDur)}
                          {avgViewDurDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {avgViewDurDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistAvg?.avg_view_duration != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg:{" "}
                            {formatSecondsToHMS(artistAvg.avg_view_duration)}
                          </>
                        )}
                      </div>
                    </div>

                  </button>
                );
              })}
</div>
            </details>
          );
        })}

        {/* Posts with YouTube link but no stats yet */}
        {postsWithoutData.length > 0 && (
          <div className="mt-8 bg-white rounded-xl p-4 border border-dashed border-gray-300">
            <h3 className="text-sm font-semibold mb-1">
              Posts with YouTube link but no stats yet
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              These posts have a <code className="bg-gray-100 px-1 rounded">youtube_url</code>{" "}
              saved but no YouTube metrics snapshots. This usually means the
              collector hasn&apos;t found a matching video for the link yet, or
              hasn&apos;t run since the link was updated.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {postsWithoutData.map((post) => {
                const artist = artistById.get(post.artist_id);

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => openYtLinkModal(post)}
                    className="w-full min-w-0 text-left bg-[#eef8ea] rounded-lg p-3 border border-dashed border-gray-300 hover:border-gray-500 hover:shadow-sm transition flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="text-sm font-semibold">
                          {post.post_name || "Untitled post"}
                        </div>
                        <div className="text-xs text-gray-600">
                          {artist?.name || "Unknown artist"} •{" "}
                          {post.post_date
                            ? new Date(post.post_date).toLocaleDateString()
                            : "No date"}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-700">
                      <div className="break-all">
                        <span className="font-medium">Current link:</span>{" "}
                        {post.youtube_url || "—"}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        Click to review the link, see possible issues, and fetch stats.
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    );
  }

  function renderTikTokTab() {
    if (tiktokLoadingData) {
      return <div className="text-sm text-gray-700">Loading…</div>;
    }
    if (tiktokErrorMsg) {
      return (
        <div className="text-sm text-red-700 bg-white/70 rounded px-3 py-2">
          {tiktokErrorMsg}
        </div>
      );
    }
  
    if (!tiktokPosts.length) {
      return (
        <div className="text-sm text-gray-800">
          No posted TikTok items with links yet.
        </div>
      );
    }
  
    if (!tiktokPostsWithData.length) {
      return (
        <div className="text-sm text-gray-800">
          No TikTok metrics collected yet (run “Manually collect TikTok data”).
        </div>
      );
    }
  
    const tiers = Array.from(tiktokPostsByTier.keys()).sort((a, b) => {
      const order = [
        "Under 400 followers",
        "400–1k followers",
        "Over 1k followers",
        "Unknown size",
      ];
      return order.indexOf(a) - order.indexOf(b);
    });
  
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-700">
            {ttManualRun.msg ? (
              <>
                {ttManualRun.msg}
                {tiktokInfo && (
                  <>
                    <br />
                    Tokens: {tiktokInfo.tokenCount} • Posts:{" "}
                    {tiktokInfo.postCount} • Snapshots:{" "}
                    {tiktokInfo.snapshotCount}
                  </>
                )}
              </>
            ) : (
              " "
            )}
          </div>
  
          <button
            type="button"
            className="text-[11px] px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={runTikTokManualCollect}
            disabled={ttManualRun.loading}
          >
            {ttManualRun.loading ? "Collecting…" : "Manually collect TikTok data"}
          </button>
        </div>
  
        {tiers.map((tierKey) => {
          const allTierPosts = tiktokPostsByTier.get(tierKey) || [];
          const limit = tiktokTierTopLimit[tierKey] ?? 4;
          const postsInTier = allTierPosts.slice(0, limit);
  
          // worst 4 in tier (by TikTok score)
          const worstInTier = [...allTierPosts]
            .filter((p) => tiktokLatestSnapshotByPostId.has(p.id))
            .sort((a, b) => {
              const snapA = tiktokLatestSnapshotByPostId.get(a.id);
              const snapB = tiktokLatestSnapshotByPostId.get(b.id);
              const scoreA = computeTikTokScore(snapA);
              const scoreB = computeTikTokScore(snapB);
              return scoreA - scoreB;
            })
            .slice(0, 4);
  
          if (!postsInTier.length) return null;
  
          return (
            <details
              key={tierKey}
              className="bg-[#eef8ea] rounded-xl p-4 shadow-inner"
              open
            >
              <summary className="cursor-pointer select-none flex items-center justify-between">
                <span className="text-lg font-semibold">{tierKey}</span>
                <span className="text-xs text-gray-600">click to collapse</span>
              </summary>
  
              <div className="mt-3 mb-4 flex items-center gap-2">
                <button
                  type="button"
                  className="text-[11px] px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTiktokTierTopLimit((prev) => ({
                      ...prev,
                      [tierKey]: (prev[tierKey] ?? 4) + 4,
                    }));
                  }}
                >
                  Show more
                </button>
  
                <button
                  type="button"
                  className="text-[11px] px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTiktokTierShowWorst((prev) => ({
                      ...prev,
                      [tierKey]: !prev[tierKey],
                    }));
                  }}
                >
                  See worst performing
                </button>
  
                <div className="text-[11px] text-gray-600 ml-auto">
                  Showing {Math.min(limit, allTierPosts.length)} of{" "}
                  {allTierPosts.length}
                </div>
              </div>
  
              {tiktokTierShowWorst[tierKey] && (
                <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200 pb-4">
                  <div className="text-sm font-semibold mb-2">
                    Worst performing (bottom 4)
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {worstInTier.map((post) => {
                      const artist = artistById.get(post.artist_id);
                      const latest =
                        tiktokLatestSnapshotByPostId.get(post.id);
                      const views = latest?.views;
                      const likes = latest?.likes;
                      const comments = latest?.comments;
                      const shares = latest?.shares;
  
                      return (
                        <button
                          key={post.id}
                          onClick={() => openPostModal(post)}
                          className="text-left bg-[#eef8ea] rounded-lg p-3 border border-gray-200 hover:border-gray-400 hover:shadow-sm transition flex flex-col gap-1"
                        >
                          <div className="text-sm font-semibold">
                            {post.post_name || "Untitled post"}
                          </div>
                          <div className="text-xs text-gray-600">
                            {artist?.name || "Unknown artist"} •{" "}
                            {post.post_date
                              ? new Date(
                                  post.post_date
                                ).toLocaleDateString()
                              : "No date"}
                          </div>
                          <div className="text-xs text-gray-700 mt-1">
                            <span className="font-semibold">
                              {formatNumber(views)}
                            </span>{" "}
                            views • {formatNumber(likes)} likes •{" "}
                            {formatNumber(comments)} comments •{" "}
                            {formatNumber(shares)} shares
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
  
              <div className="grid gap-3 md:grid-cols-2">
              {postsInTier.map((post) => {
                const artist = artistById.get(post.artist_id);
                const latest = tiktokLatestSnapshotByPostId.get(post.id);
                const artistAvg = tiktokArtistAverages.get(post.artist_id);

                const views = latest?.views;
                const likes = latest?.likes;
                const comments = latest?.comments;
                const shares = latest?.shares;
                const retentionScore = latest?.tiktok_retention_score;
                const shareScore = latest?.tiktok_shareability_score;

                const viewsDelta = getMetricDelta(views, artistAvg?.views);

                const likesPerK =
                  views && views > 0 ? (Number(likes || 0) / views) * 1000 : null;
                const commentsPerK =
                  views && views > 0 ? (Number(comments || 0) / views) * 1000 : null;

                const artistLikesPerK =
                  artistAvg?.views && artistAvg.views > 0
                    ? (Number(artistAvg.likes || 0) / artistAvg.views) * 1000
                    : null;
                const artistCommentsPerK =
                  artistAvg?.views && artistAvg.views > 0
                    ? (Number(artistAvg.comments || 0) / artistAvg.views) * 1000
                    : null;

                const likesPerKDelta = getMetricDelta(likesPerK, artistLikesPerK);
                const commentsPerKDelta = getMetricDelta(
                  commentsPerK,
                  artistCommentsPerK
                );
                const retentionDelta = getMetricDelta(
                  retentionScore,
                  artistAvg?.tiktok_retention_score
                );
                const shareDelta = getMetricDelta(
                  shareScore,
                  artistAvg?.tiktok_shareability_score
                );

                return (
                  <button
                    key={post.id}
                    onClick={() => openPostModal(post)}
                    className="text-left bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-400 hover:shadow-sm transition flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="text-sm font-semibold">
                          {post.post_name || "Untitled post"}
                        </div>
                        <div className="text-xs text-gray-600">
                          {artist?.name || "Unknown artist"} •{" "}
                          {post.post_date ? formatShortDate(post.post_date) : "No date"}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <span className={viewsDelta.className}>
                          <span className="font-semibold">
                            {formatNumber(views)}
                          </span>
                          {viewsDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {viewsDelta.symbol}
                            </span>
                          )}
                        </span>{" "}
                        views
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-700">
                      {/* LEFT: likes/comments per 1k views */}
                      <div>
                        Likes / 1k views:{" "}
                        <span className={likesPerKDelta.className}>
                          {likesPerK != null ? likesPerK.toFixed(1) : "—"}
                          {likesPerKDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {likesPerKDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistLikesPerK != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg: {artistLikesPerK.toFixed(1)}
                          </>
                        )}
                      </div>

                      {/* RIGHT: retention */}
                      <div>
                        Retention (views/hr):{" "}
                        <span className={retentionDelta.className}>
                          {formatHalfStep(retentionScore)}
                          {retentionDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {retentionDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistAvg?.tiktok_retention_score != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg: {formatHalfStep(artistAvg.tiktok_retention_score)}
                          </>
                        )}
                      </div>

                      <div>
                        Comments / 1k views:{" "}
                        <span className={commentsPerKDelta.className}>
                          {commentsPerK != null ? commentsPerK.toFixed(1) : "—"}
                          {commentsPerKDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {commentsPerKDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistCommentsPerK != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg: {artistCommentsPerK.toFixed(1)}
                          </>
                        )}
                      </div>

                      {/* RIGHT: shareability */}
                      <div>
                        Shareability (shares / 1k views):{" "}
                        <span className={shareDelta.className}>
                          {formatPerThousand(shareScore)}
                          {shareDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {shareDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistAvg?.tiktok_shareability_score != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg: {formatPerThousand(artistAvg.tiktok_shareability_score)}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              </div>
            </details>
          );
        })}

        {/* Posts with TikTok link but no stats yet */}
        {tiktokPostsWithoutData.length > 0 && (
          <div className="mt-8 bg-white rounded-xl p-4 border border-dashed border-gray-300">
            <h3 className="text-sm font-semibold mb-1">
              Posts with TikTok link but no stats yet
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              These posts have a <code className="bg-gray-100 px-1 rounded">tiktok_url</code>{" "}
              saved but no TikTok metrics snapshots. This usually means the
              collector hasn&apos;t found a matching video for the link yet, or
              hasn&apos;t run since the link was updated.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {tiktokPostsWithoutData.map((post) => {
                const artist = artistById.get(post.artist_id);

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => openTtLinkModal(post)}
                    className="w-full min-w-0 text-left bg-[#eef8ea] rounded-lg p-3 border border-dashed border-gray-300 hover:border-gray-500 hover:shadow-sm transition flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="text-sm font-semibold">
                          {post.post_name || "Untitled post"}
                        </div>
                        <div className="text-xs text-gray-600">
                          {artist?.name || "Unknown artist"} •{" "}
                          {post.post_date
                            ? new Date(post.post_date).toLocaleDateString()
                            : "No date"}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-700">
                      <div className="break-all">
                        <span className="font-medium">Current link:</span>{" "}
                        {post.tiktok_url || "—"}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        Click to review the link, see possible issues, and fetch stats.
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    );
  }

  function renderInstagramTab() {
    if (instagramLoadingData) {
      return <div className="text-sm text-gray-700">Loading…</div>;
    }
    if (instagramErrorMsg) {
      return (
        <div className="text-sm text-red-700 bg-white/70 rounded px-3 py-2">
          {instagramErrorMsg}
        </div>
      );
    }
  
    if (!instagramPosts.length) {
      return (
        <div className="text-sm text-gray-800">
          No Instagram posts found yet (status=posted & instagram_url present).
        </div>
      );
    }
  
    const tiers = Array.from(instagramPostsByTier.keys()).sort((a, b) => {
      const order = [
        "Under 1k followers",
        "1k–3k followers",
        "Over 3k followers",
        "Unknown size",
      ];
      return order.indexOf(a) - order.indexOf(b);
    });
  
    return (
      <div className="space-y-6">
        {/* header: manual collect + status */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-700">
            {igManualRun.msg ? igManualRun.msg : " "}
          </div>
  
          <button
            type="button"
            className="text-[11px] px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={runInstagramManualCollect}
            disabled={igManualRun.loading}
          >
            {igManualRun.loading ? "Collecting…" : "Fetch IG stats"}
          </button>
        </div>
  
        {tiers.map((tierKey) => {
          const allTierPosts = instagramPostsByTier.get(tierKey) || [];
          const limit = instagramTierTopLimit[tierKey] ?? 4;
          const postsInTier = allTierPosts.slice(0, limit);
  
          // worst 4 in tier (by latest views)
          const worstInTier = [...allTierPosts]
          .filter((p) => instagramLatestSnapshotByPostId.has(p.id))
          .sort((a, b) => {
            const snapA = instagramLatestSnapshotByPostId.get(a.id);
            const snapB = instagramLatestSnapshotByPostId.get(b.id);
            const scoreA = computeInstagramScore(snapA);
            const scoreB = computeInstagramScore(snapB);
            return scoreA - scoreB;
          })
          .slice(0, 4);
  
          if (!postsInTier.length) return null;
  
          return (
            <details
              key={tierKey}
              className="bg-[#eef8ea] rounded-xl p-4 shadow-inner"
              open
            >
              <summary className="cursor-pointer select-none flex items-center justify-between">
                <span className="text-lg font-semibold">{tierKey}</span>
                <span className="text-xs text-gray-600">
                  {allTierPosts.length} posts with IG stats
                </span>
              </summary>
  
              <div className="mt-3 grid gap-3 md:grid-cols-2">
              {postsInTier.map((post) => {
                const artist = artistById.get(post.artist_id);
                const latest = instagramLatestSnapshotByPostId.get(post.id);
                const artistAvg = instagramArtistAverages.get(post.artist_id);

                const views = latest?.views;
                const likes = latest?.likes;
                const comments = latest?.comments;
                const saves = latest?.saves;
                const shares = latest?.shares;

                const viewsDelta = getMetricDelta(views, artistAvg?.views);
                const commentsDelta = getMetricDelta(comments, artistAvg?.comments);
                const likesDelta = getMetricDelta(likes, artistAvg?.likes);
                const savesDelta = getMetricDelta(saves, artistAvg?.saves);
                const sharesDelta = getMetricDelta(shares, artistAvg?.shares);

                return (
                  <button
                    key={post.id}
                    onClick={() => openPostModal(post)}
                    className="text-left bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-400 hover:shadow-sm transition flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="text-sm font-semibold">
                          {post.post_name || "Untitled post"}
                        </div>
                        <div className="text-xs text-gray-600">
                          {artist?.name || "Unknown artist"} •{" "}
                          {post.post_date ? formatShortDate(post.post_date) : "No date"}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <span className={viewsDelta.className}>
                          <span className="font-semibold">
                            {formatNumber(views)}
                          </span>
                          {viewsDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {viewsDelta.symbol}
                            </span>
                          )}
                        </span>{" "}
                        views
                      </div>
                    </div>

                    {/* body stats: left = comments/likes, right = shares/saves */}
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-700 mt-1">
                      <div>
                        Comments:{" "}
                        <span className={commentsDelta.className}>
                          {formatNumber(comments)}
                          {commentsDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {commentsDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistAvg?.comments != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg:{" "}
                            {Number(artistAvg.comments).toLocaleString(undefined, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </>
                        )}
                      </div>

                      <div>
                        Shares:{" "}
                        <span className={sharesDelta.className}>
                          {formatNumber(shares)}
                          {sharesDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {sharesDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistAvg?.shares != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg:{" "}
                            {Number(artistAvg.shares).toLocaleString(undefined, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </>
                        )}
                      </div>

                      <div>
                        Likes:{" "}
                        <span className={likesDelta.className}>
                          {formatNumber(likes)}
                          {likesDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {likesDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistAvg?.likes != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg:{" "}
                            {Number(artistAvg.likes).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </>
                        )}
                      </div>

                      <div>
                        Saves:{" "}
                        <span className={savesDelta.className}>
                          {formatNumber(saves)}
                          {savesDelta.symbol && (
                            <span className="ml-1 text-[9px]">
                              {savesDelta.symbol}
                            </span>
                          )}
                        </span>
                        {artistAvg?.saves != null && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            avg:{" "}
                            {Number(artistAvg.saves).toLocaleString(undefined, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              </div>
  
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  className="text-[11px] px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInstagramTierTopLimit((prev) => ({
                      ...prev,
                      [tierKey]: (prev[tierKey] ?? 4) + 4,
                    }));
                  }}
                >
                  Show more
                </button>
  
                <button
                  type="button"
                  className="text-[11px] px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInstagramTierShowWorst((prev) => ({
                      ...prev,
                      [tierKey]: !prev[tierKey],
                    }));
                  }}
                >
                  See worst performing
                </button>
  
                <div className="text-[11px] text-gray-600 ml-auto">
                  Showing {Math.min(limit, allTierPosts.length)} of{" "}
                  {allTierPosts.length}
                </div>
              </div>
  
              {instagramTierShowWorst[tierKey] && (
                <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200 pb-4">
                  <div className="text-sm font-semibold mb-2">
                    Worst performing (bottom 4)
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {worstInTier.map((post) => {
                      const artist = artistById.get(post.artist_id);
                      const latest =
                        instagramLatestSnapshotByPostId.get(post.id);
  
                      const views = latest?.views;
                      const likes = latest?.likes;
                      const comments = latest?.comments;
  
                      return (
                        <button
                          key={post.id}
                          onClick={() => openPostModal(post)}
                          className="text-left bg-[#eef8ea] rounded-lg p-3 border border-gray-200 hover:border-gray-400 hover:shadow-sm transition flex flex-col gap-1"
                        >
                          <div className="text-sm font-semibold">
                            {post.post_name || "Untitled post"}
                          </div>
                          <div className="text-xs text-gray-600">
                            {artist?.name || "Unknown artist"} •{" "}
                            {post.post_date
                              ? new Date(post.post_date).toLocaleDateString()
                              : "No date"}
                          </div>
                          <div className="text-xs text-gray-700 mt-1">
                            {views != null && (
                              <span className="mr-2">
                                {views.toLocaleString()} views
                              </span>
                            )}
                            {likes != null && (
                              <span className="mr-2">{likes} likes</span>
                            )}
                            {comments != null && (
                              <span>{comments} comments</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </details>
          );
        })}
              {instagramPostsWithoutData.length > 0 && (
        <div className="mt-8 bg-white rounded-xl p-4 border border-dashed border-gray-300">
          <h3 className="text-sm font-semibold mb-1">
            Posts with IG link but no stats yet
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            These posts have an <code className="bg-gray-100 px-1 rounded">instagram_url</code>{" "}
            saved but no Instagram metrics snapshots. This usually means the
            collector hasn&apos;t found a matching IG media for the link yet, or
            hasn&apos;t run since the link was updated.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {instagramPostsWithoutData.map((post) => {
              const artist = artistById.get(post.artist_id);

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => openIgLinkModal(post)}
                  className="w-full min-w-0 text-left bg-[#eef8ea] rounded-lg p-3 border border-dashed border-gray-300 hover:border-gray-500 hover:shadow-sm transition flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-sm font-semibold">
                        {post.post_name || "Untitled post"}
                      </div>
                      <div className="text-xs text-gray-600">
                        {artist?.name || "Unknown artist"} •{" "}
                        {post.post_date
                          ? new Date(post.post_date).toLocaleDateString()
                          : "No date"}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-700">
                    <div className="break-all">
                      <span className="font-medium">Current link:</span>{" "}
                      {post.instagram_url || "—"}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      Click to review the link, see possible issues, and save a new URL.
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      )}

      </div>
    );
  }
  
  function renderStandoutTab() {
    const isLoading = loading || tiktokLoadingData || instagramLoadingData;

    if (isLoading) {
      return <div className="text-sm text-gray-700">Loading…</div>;
    }

    if (
      !crossStandoutsByCategory.shares.length &&
      !crossStandoutsByCategory.comments.length &&
      !crossStandoutsByCategory.retention.length &&
      !crossStandoutsByCategory.views.length &&
      !recentPosts.length
    ) {
      return (
        <div className="text-sm text-gray-800 bg-[#eef8ea] rounded-xl p-4">
          No cross-platform standouts yet. Try collecting stats for YouTube,
          TikTok, and Instagram first.
        </div>
      );
    }

    const categories = [
      { key: "shares", label: "Shares standouts" },
      { key: "comments", label: "Comments standouts" },
      { key: "retention", label: "Retention standouts" },
      { key: "views", label: "Views standouts" },
    ];

    return (
      <div className="space-y-6">
        {/* Recent Posts Carousel */}
        {recentPosts.length > 0 && (
          <div className="bg-[#eef8ea] rounded-xl p-4 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Recent Posts</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Time period:</label>
                <select
                  className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white"
                  value={recentPostsDays}
                  onChange={(e) => setRecentPostsDays(Number(e.target.value))}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={28}>Last 28 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto w-full max-w-full"> 
              <div className="flex gap-3 pb-2 w-max">
                {recentPosts.map(({ post, totalViews, ytSnap, ttSnap, igSnap }) => {
                  const artist = artistById.get(post.artist_id);
                  const platforms = [];
                  if (ytSnap) platforms.push('YT');
                  if (ttSnap) platforms.push('TT');
                  if (igSnap) platforms.push('IG');

                  return (
                    <button
                      key={post.id}
                      onClick={() => openPostModal(post)}
                      className="flex-shrink-0 w-48 bg-white rounded-lg border border-gray-200 hover:border-gray-400 hover:shadow-md transition overflow-hidden flex flex-col"
                    >
                      <RecentPostThumbnail post={post} />
                      <div className="p-2">
                        <div className="text-xs font-semibold line-clamp-2 mb-1">
                          {post.post_name || "Untitled post"}
                        </div>
                        <div className="text-[10px] text-gray-600 mb-1">
                          {artist?.name || "Unknown"}
                        </div>
                        <div className="text-[10px] text-gray-700">
                          <div className="space-y-0.5">
                            <div>
                              <span className="text-gray-500">Shares:</span>{" "}
                              <span className="font-semibold">
                                {formatNumber(
                                  (Number(ytSnap?.shares) || 0) +
                                  (Number(ttSnap?.shares) || 0) +
                                  (Number(igSnap?.shares) || 0)
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Comments:</span>{" "}
                              <span className="font-semibold">
                                {formatNumber(
                                  (Number(ytSnap?.comments) || 0) +
                                  (Number(ttSnap?.comments) || 0) +
                                  (Number(igSnap?.comments) || 0)
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Views:</span>{" "}
                              <span className="font-semibold">
                                {formatNumber(totalViews)}
                              </span>
                            </div>
                          </div>
                          <div className="text-gray-500 mt-1">
                            {platforms.join(' • ')}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {categories.map((cat) => {
          const entries = crossStandoutsByCategory[cat.key] || [];
          if (!entries.length) return null;

          return (
            <details
              key={cat.key}
              className="bg-[#eef8ea] rounded-xl p-4 shadow-inner"
              open
            >
              <summary className="cursor-pointer select-none flex items-center justify-between">
                <span className="text-lg font-semibold">
                  {cat.label}
                </span>
                <span className="text-xs text-gray-600">
                  {entries.length} posts
                </span>
              </summary>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {entries.slice(0, 8).map((entry) => {
                  const post = postById.get(entry.postId);
                  if (!post) return null;
                  const artist = artistById.get(entry.artistId);

                  const ytSnap = latestSnapshotByPostId.get(entry.postId);
                  const ttSnap =
                    tiktokLatestSnapshotByPostId.get(entry.postId);
                  const igSnap =
                    instagramLatestSnapshotByPostId.get(entry.postId);

                  const totalViews =
                    (Number(ytSnap?.views) || 0) +
                    (Number(ttSnap?.views) || 0) +
                    (Number(igSnap?.views) || 0);

                  const percent = Math.round(entry.score * 100);

                  return (
                    <button
                      key={entry.postId}
                      onClick={() => openPostModal(post)}
                      className="w-full min-w-0 text-left bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-400 hover:shadow-sm transition flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-sm font-semibold">
                            {post.post_name || "Untitled post"}
                          </div>
                          <div className="text-xs text-gray-600">
                            {artist?.name || "Unknown artist"} •{" "}
                            {post.post_date
                              ? formatShortDate(post.post_date)
                              : "No date"}
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          <span className="font-semibold">
                            {formatNumber(totalViews)}
                          </span>{" "}
                          total views
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-700">
                        <div>
                          {cat.label.replace(" standouts", "")}:{" "}
                          <span className="text-green-700 font-semibold">
                            +{percent}%
                          </span>{" "}
                          vs artist average across{" "}
                          {entry.platforms.length} platforms
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          Platforms: {entry.platforms.join(", ")}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------

  return (
    <TeamLayout title="Posts Stats">
        <div className="flex flex-col gap-4 min-w-0">
          <section className="bg-[#bbe1ac] rounded-2xl shadow-lg p-4 md:p-6 flex-1">
            {/* Artist Dropdown */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="text-sm font-semibold">Artist:</div>
              <select
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
                value={selectedArtistId || ""}
                onChange={(e) => setSelectedArtistId(e.target.value || "")}
              >
                <option value="">All artists</option>
                {artistOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || `Artist ${a.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* tabs */}
            <div className="flex gap-2 mb-4 text-sm">
              {[
                { key: "youtube", label: "YouTube" },
                { key: "instagram", label: "Instagram" },
                { key: "tiktok", label: "TikTok" },
                { key: "standout", label: "Cross-platform Standouts" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-full border text-xs md:text-sm ${
                    activeTab === tab.key
                      ? "bg-white border-gray-700 font-semibold"
                      : "bg-[#eef8ea] border-transparent hover:border-gray-400"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* tab content */}
            {activeTab === "youtube" && renderYouTubeTab()}

            {activeTab === "instagram" && renderInstagramTab()}

            {activeTab === "tiktok" && renderTikTokTab()}

            {activeTab === "standout" && renderStandoutTab()}
          </section>
        </div>

      {/* POST DETAILS MODAL */}
      {selectedPost && (
        <PostDetailsModal
          post={selectedPost}
          artist={artistById.get(selectedPost.artist_id)}
          // Determine which snapshot data to use based on the post's platform
          snapshots={(() => {
            // Check which URL the post has to determine platform
            if (selectedPost.instagram_url) {
              return instagramSnapshotsByPostId.get(selectedPost.id) || [];
            }
            if (selectedPost.tiktok_url) {
              return tiktokSnapshotsByPostId.get(selectedPost.id) || [];
            }
            // Default to YouTube
            return snapshotsByPostId.get(selectedPost.id) || [];
          })()}
          // Use the appropriate artist averages for the platform
          artistAverages={(() => {
            if (selectedPost.instagram_url) {
              return instagramArtistAverages.get(selectedPost.artist_id) || null;
            }
            if (selectedPost.tiktok_url) {
              return tiktokArtistAverages.get(selectedPost.artist_id) || null;
            }
            // Default to YouTube
            return artistAverages.get(selectedPost.artist_id) || null;
          })()}
          variations={selectedPostVariations}
          loading={modalLoading}
          onClose={closeModal}
        />
      )}

      {/* IG LINK FIX MODAL */}
      {igLinkModalPost && (
        <InstagramLinkFixModal
          post={igLinkModalPost}
          artist={artistById.get(igLinkModalPost.artist_id)}
          onClose={closeIgLinkModal}
          onUpdatedUrl={(newUrl) => {
            setInstagramPosts((prev) =>
              (prev || []).map((p) =>
                p.id === igLinkModalPost.id ? { ...p, instagram_url: newUrl } : p
              )
            );
          }}
        />
      )}

      {/* YT LINK FIX MODAL */}
      {ytLinkModalPost && (
        <YouTubeLinkFixModal
          post={ytLinkModalPost}
          artist={artistById.get(ytLinkModalPost.artist_id)}
          onClose={closeYtLinkModal}
          onUpdatedUrl={(newUrl) => {
            setPosts((prev) =>
              (prev || []).map((p) =>
                p.id === ytLinkModalPost.id ? { ...p, youtube_url: newUrl } : p
              )
            );
          }}
        />
      )}

      {/* TT LINK FIX MODAL */}
      {ttLinkModalPost && (
        <TikTokLinkFixModal
          post={ttLinkModalPost}
          artist={artistById.get(ttLinkModalPost.artist_id)}
          onClose={closeTtLinkModal}
          onUpdatedUrl={(newUrl) => {
            setTiktokPosts((prev) =>
              (prev || []).map((p) =>
                p.id === ttLinkModalPost.id ? { ...p, tiktok_url: newUrl } : p
              )
            );
          }}
        />
      )}
    </TeamLayout>
  );
}


// ----- Post Details Modal -----

function PostDetailsModal({
  post,
  artist,
  snapshots,
  artistAverages,
  variations,
  loading,
  onClose,
}) {
  const [selectedVariationId, setSelectedVariationId] = useState(null);

  useEffect(() => {
    if (variations && variations.length > 0 && selectedVariationId == null) {
      setSelectedVariationId(variations[0].id);
    }
  }, [variations, selectedVariationId]);

  const selectedVariation =
    variations.find((v) => v.id === selectedVariationId) || null;

  const isTikTokPost = !!post.tiktok_url && !post.youtube_url;
  const platformLabel = isTikTokPost ? "TikTok" : "YouTube Shorts";
  
    const metricDefs = [
    {
      key: "views",
      label: "Views",
      formatter: formatNumber,
    },
    {
      key: "reach",
      label: "Reach",
      formatter: formatNumber,
    },
    {
      key: "avg_view_duration",
      label: "Average view duration",
      formatter: formatSecondsToHMS,
    },
    {
      key: "retention_rate",
      label: "Viewer retention",
      formatter: formatPercent,
    },
    {
      key: "completion_rate",
      label: "% stayed to watch",
      formatter: formatPercent,
    },
    {
      key: "likes",
      label: "Likes",
      formatter: formatNumber,
    },
    {
      key: "comments",
      label: "Comments",
      formatter: formatNumber,
    },
  ];

  function buildSeries(metricKey) {
    if (!snapshots || snapshots.length === 0) return [];
    return snapshots
      .filter((s) => s[metricKey] != null)
      .map((s) => ({
        date: new Date(s.snapshot_at),
        value: Number(s[metricKey]),
      }));
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto p-5 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold mb-1">
              {post.post_name || "Post details"}
            </h2>
            <div className="text-xs text-gray-600">
              {artist?.name || "Unknown artist"} •{" "}
              {post.post_date
                ? new Date(post.post_date).toLocaleString()
                : "No date"}{" "}
              • {platformLabel}
            </div>
            {post.youtube_url && (
              <a
                href={post.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1 mr-2 text-xs text-blue-600 underline"
              >
                Open on YouTube
              </a>
            )}
            {post.tiktok_url && (
              <a
                href={post.tiktok_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1 text-xs text-blue-600 underline"
              >
                Open on TikTok
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-lg"
          >
            ✕
          </button>
        </div>

        {/* layout: media + stats */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* left: variations & media */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Variations</h3>
            {loading && (
              <div className="text-sm text-gray-600 mb-3">Loading…</div>
            )}
            {!loading && (!variations || variations.length === 0) && (
              <div className="text-sm text-gray-500 mb-3">
                No variations found for this post.
              </div>
            )}

            {variations && variations.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex flex-wrap gap-1">
                  {variations.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariationId(v.id)}
                      className={`px-2 py-1 rounded-full text-xs border ${
                        selectedVariationId === v.id
                          ? "bg-[#bbe1ac] border-gray-800"
                          : "bg-gray-100 hover:bg-gray-200 border-transparent"
                      }`}
                    >
                      {v.test_version || "Version"}{" "}
                      {v.test_version ? String(v.test_version) : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#eef8ea] rounded-lg p-3">
              <VariationMediaPlayer variation={selectedVariation} />
            </div>
          </div>

          {/* right: metrics & charts */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Metrics over time</h3>
            <p className="text-xs text-gray-600 mb-3">
              Each chart compares this post (solid line) against the artist
              average for the last 15 shorts (dashed line).
            </p>

            {post.__standout ? (
            <div className="mt-2 text-sm bg-[#eef8ea] rounded-lg px-3 py-2 border border-gray-200">
              <div className="font-semibold">Standout statistic</div>
              <div className="text-xs text-gray-700">
                {post.__standout.label}:{" "}
                <span className="font-semibold">
                  +{post.__standout.pctDiff.toFixed(0)}%
                </span>{" "}
                vs tier average ({post.__tierKey})
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">
              Standout statistic: not enough peer data yet.
            </div>
          )}<br />


            <div className="space-y-4">
              {metricDefs.map((metric) => {
                const series = buildSeries(metric.key);
                const avgValue =
                  artistAverages && artistAverages[metric.key] != null
                    ? Number(artistAverages[metric.key])
                    : null;

                return (
                  <div
                    key={metric.key}
                    className="bg-[#eef8ea] rounded-lg p-2 border border-gray-200"
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="text-xs font-semibold">
                        {metric.label}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        Latest:{" "}
                        {series.length
                          ? metric.formatter(
                              series[series.length - 1].value ?? null
                            )
                          : "—"}{" "}
                        {avgValue != null && (
                          <>
                            <span className="mx-1 text-gray-400">•</span>
                            Artist avg: {metric.formatter(avgValue)}
                          </>
                        )}
                      </div>
                    </div>
                    <MiniLineChart
                      points={series}
                      avgValue={avgValue}
                      labelFormatter={metric.formatter}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* notes */}
        {post.notes && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-1">Post notes</h3>
            <div className="text-sm bg-[#eef8ea] rounded-lg p-3 whitespace-pre-wrap">
              {post.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InstagramLinkFixModal({ post, artist, onClose, onUpdatedUrl }) {
  const [url, setUrl] = useState(post.instagram_url || "");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Existing handleSave function
  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a valid Instagram URL.");
      return;
    }

    try {
      setSaving(true);
      const { error: supaErr } = await supabase
        .from("posts")
        .update({ instagram_url: trimmed })
        .eq("id", post.id);

      if (supaErr) {
        setError(supaErr.message || "Failed to update Instagram URL.");
      } else {
        setMessage(
          "Saved. You can now fetch stats for this post."
        );
        if (onUpdatedUrl) onUpdatedUrl(trimmed);
      }
    } catch (err) {
      setError(err.message || "Failed to update Instagram URL.");
    } finally {
      setSaving(false);
    }
  }

  // New function to fetch stats for this specific post
  async function handleFetchStats() {
    setError("");
    setMessage("");

    // Check if there's a URL set
    if (!post.instagram_url && !url.trim()) {
      setError("Please save an Instagram URL first before fetching stats.");
      return;
    }

    try {
      setFetching(true);
      
      // Call the single-post Instagram API route
      const response = await fetch(
        `/api/metrics/instagram-single?postId=${post.id}&secret=${process.env.NEXT_PUBLIC_CRON_SECRET}`
      );
      
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error || "Failed to fetch Instagram stats");
        if (data.details) {
          console.error("API error details:", data.details);
        }
        if (data.hint) {
          setError(`${data.error}. ${data.hint}`);
        }
      } else {
        setMessage(
          `✅ Success! Fetched ${data.metrics?.views || 0} views, ${data.metrics?.likes || 0} likes. The page will reload to show updated metrics.`
        );
        
        // Reload the page after 2 seconds to show the new data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      console.error("Fetch stats error:", err);
      setError("Network error. Please check console for details.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold mb-1">Fix Instagram link</h2>
            <div className="text-xs text-gray-600">
              {artist?.name || "Unknown artist"} •{" "}
              {post.post_name || "Untitled post"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Close
          </button>
        </div>

        <div className="text-xs text-gray-700 mb-3 space-y-1">
          <p>No Instagram metrics snapshots exist yet for this post.</p>
          <p>Common reasons:</p>
          <ul className="list-disc pl-4">
            <li>The collector hasn&apos;t run since this post was created.</li>
            <li>
              The{" "}
              <code className="bg-gray-100 px-1 rounded">instagram_url</code>{" "}
              doesn&apos;t exactly match any media permalink.
            </li>
          </ul>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Instagram URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
            {post.instagram_url && (
              <a
                href={post.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-[11px] text-blue-600 underline"
              >
                Open current link in new tab
              </a>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-md px-2 py-1">
              {error}
            </div>
          )}
          {message && (
            <div className="text-xs text-green-700 bg-green-50 rounded-md px-2 py-1">
              {message}
            </div>
          )}

          <div className="flex justify-between items-center gap-2 pt-2">
            {/* Left side: Fetch stats button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleFetchStats}
                disabled={fetching || !post.instagram_url}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!post.instagram_url ? "Save a URL first" : "Fetch Instagram stats for this post"}
              >
                {fetching ? "Fetching stats…" : "🔄 Fetch stats"}
              </button>
              <button
                type="button"
                onClick={() => setShowManualEntry(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
              >
                ✏️ Add stats manually
              </button>
            </div>

            {/* Right side: Cancel and Save buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save new link"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Manual Stats Entry Modal */}
      {showManualEntry && (
        <InstagramManualStatsModal
          post={post}
          artist={artist}
          onClose={() => setShowManualEntry(false)}
        />
      )}
    </div>
  );
}

function InstagramManualStatsModal({ post, artist, onClose }) {
  const [views, setViews] = useState("");
  const [reach, setReach] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [saves, setSaves] = useState("");
  const [shares, setShares] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validate at least one metric is provided
    if (!views && !reach && !likes && !comments && !saves && !shares) {
      setError("Please enter at least one metric.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/metrics/instagram-manual?secret=${process.env.NEXT_PUBLIC_CRON_SECRET}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: post.id,
            views: views || null,
            reach: reach || null,
            likes: likes || null,
            comments: comments || null,
            saves: saves || null,
            shares: shares || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error || "Failed to save stats");
      } else {
        setMessage("Stats saved successfully! The page will reload.");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error("Manual stats error:", err);
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Add Instagram Stats Manually</h2>
            <div className="text-xs text-gray-600">
              {artist?.name || "Unknown artist"} • {post.post_name || "Untitled post"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-gray-600 mb-4">
          Enter the Instagram metrics from your Insights. Leave fields blank if unknown.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Views (Plays)
              </label>
              <input
                type="number"
                value={views}
                onChange={(e) => setViews(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reach
              </label>
              <input
                type="number"
                value={reach}
                onChange={(e) => setReach(e.target.value)}
                placeholder="e.g. 1200"
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Likes
              </label>
              <input
                type="number"
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                placeholder="e.g. 150"
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Comments
              </label>
              <input
                type="number"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="e.g. 12"
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Saves
              </label>
              <input
                type="number"
                value={saves}
                onChange={(e) => setSaves(e.target.value)}
                placeholder="e.g. 25"
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Shares
              </label>
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="e.g. 8"
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-md px-2 py-1">
              {error}
            </div>
          )}
          {message && (
            <div className="text-xs text-green-700 bg-green-50 rounded-md px-2 py-1">
              {message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Stats"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function YouTubeLinkFixModal({ post, artist, onClose, onUpdatedUrl }) {
  const [url, setUrl] = useState(post.youtube_url || "");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a valid YouTube URL.");
      return;
    }

    try {
      setSaving(true);
      const { error: supaErr } = await supabase
        .from("posts")
        .update({ youtube_url: trimmed })
        .eq("id", post.id);

      if (supaErr) {
        setError(supaErr.message || "Failed to update YouTube URL.");
      } else {
        setMessage("Saved. You can now fetch stats for this post.");
        if (onUpdatedUrl) onUpdatedUrl(trimmed);
      }
    } catch (err) {
      setError(err.message || "Failed to update YouTube URL.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFetchStats() {
    setError("");
    setMessage("");

    if (!post.youtube_url && !url.trim()) {
      setError("Please save a YouTube URL first before fetching stats.");
      return;
    }

    try {
      setFetching(true);

      const response = await fetch(
        `/api/metrics/youtube-single?postId=${post.id}&secret=${process.env.NEXT_PUBLIC_CRON_SECRET}`
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error || "Failed to fetch YouTube stats");
        if (data.details) {
          console.error("API error details:", data.details);
        }
        if (data.hint) {
          setError(`${data.error}. ${data.hint}`);
        }
      } else {
        setMessage(
          `Success! Fetched ${data.metrics?.views || 0} views, ${data.metrics?.likes || 0} likes. The page will reload to show updated metrics.`
        );

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      console.error("Fetch stats error:", err);
      setError("Network error. Please check console for details.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold mb-1">Fix YouTube link</h2>
            <div className="text-xs text-gray-600">
              {artist?.name || "Unknown artist"} •{" "}
              {post.post_name || "Untitled post"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Close
          </button>
        </div>

        <div className="text-xs text-gray-700 mb-3 space-y-1">
          <p>No YouTube metrics snapshots exist yet for this post.</p>
          <p>Common reasons:</p>
          <ul className="list-disc pl-4">
            <li>The collector hasn&apos;t run since this post was created.</li>
            <li>
              The{" "}
              <code className="bg-gray-100 px-1 rounded">youtube_url</code>{" "}
              doesn&apos;t match a valid YouTube video.
            </li>
          </ul>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              YouTube URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
            {post.youtube_url && (
              <a
                href={post.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-[11px] text-blue-600 underline"
              >
                Open current link in new tab
              </a>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-md px-2 py-1">
              {error}
            </div>
          )}
          {message && (
            <div className="text-xs text-green-700 bg-green-50 rounded-md px-2 py-1">
              {message}
            </div>
          )}

          <div className="flex justify-between items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleFetchStats}
              disabled={fetching || !post.youtube_url}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!post.youtube_url ? "Save a URL first" : "Fetch YouTube stats for this post"}
            >
              {fetching ? "Fetching stats…" : "Fetch stats for this post"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save new link"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function TikTokLinkFixModal({ post, artist, onClose, onUpdatedUrl }) {
  const [url, setUrl] = useState(post.tiktok_url || "");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a valid TikTok URL.");
      return;
    }

    try {
      setSaving(true);
      const { error: supaErr } = await supabase
        .from("posts")
        .update({ tiktok_url: trimmed })
        .eq("id", post.id);

      if (supaErr) {
        setError(supaErr.message || "Failed to update TikTok URL.");
      } else {
        setMessage("Saved. You can now fetch stats for this post.");
        if (onUpdatedUrl) onUpdatedUrl(trimmed);
      }
    } catch (err) {
      setError(err.message || "Failed to update TikTok URL.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFetchStats() {
    setError("");
    setMessage("");

    if (!post.tiktok_url && !url.trim()) {
      setError("Please save a TikTok URL first before fetching stats.");
      return;
    }

    try {
      setFetching(true);

      const response = await fetch(
        `/api/metrics/tiktok-single?postId=${post.id}&secret=${process.env.NEXT_PUBLIC_CRON_SECRET}`
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error || "Failed to fetch TikTok stats");
        if (data.details) {
          console.error("API error details:", data.details);
        }
        if (data.hint) {
          setError(`${data.error}. ${data.hint}`);
        }
      } else {
        setMessage(
          `Success! Fetched ${data.metrics?.views || 0} views, ${data.metrics?.likes || 0} likes. The page will reload to show updated metrics.`
        );

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      console.error("Fetch stats error:", err);
      setError("Network error. Please check console for details.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold mb-1">Fix TikTok link</h2>
            <div className="text-xs text-gray-600">
              {artist?.name || "Unknown artist"} •{" "}
              {post.post_name || "Untitled post"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Close
          </button>
        </div>

        <div className="text-xs text-gray-700 mb-3 space-y-1">
          <p>No TikTok metrics snapshots exist yet for this post.</p>
          <p>Common reasons:</p>
          <ul className="list-disc pl-4">
            <li>The collector hasn&apos;t run since this post was created.</li>
            <li>
              The{" "}
              <code className="bg-gray-100 px-1 rounded">tiktok_url</code>{" "}
              doesn&apos;t match a valid TikTok video.
            </li>
            <li>The artist hasn&apos;t connected their TikTok account yet.</li>
          </ul>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              TikTok URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
            {post.tiktok_url && (
              <a
                href={post.tiktok_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-[11px] text-blue-600 underline"
              >
                Open current link in new tab
              </a>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-md px-2 py-1">
              {error}
            </div>
          )}
          {message && (
            <div className="text-xs text-green-700 bg-green-50 rounded-md px-2 py-1">
              {message}
            </div>
          )}

          <div className="flex justify-between items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleFetchStats}
              disabled={fetching || !post.tiktok_url}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!post.tiktok_url ? "Save a URL first" : "Fetch TikTok stats for this post"}
            >
              {fetching ? "Fetching stats…" : "Fetch stats for this post"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="text-xs px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save new link"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
