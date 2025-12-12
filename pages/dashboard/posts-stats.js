"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("youtube");

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

  // Modal state
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedPostVariations, setSelectedPostVariations] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const navItems = [
    { href: "/dashboard/calendar", label: "Calendar" },
    { href: "/dashboard/edit-next", label: "Edit Next" },
    { href: "/dashboard/leads", label: "Leads" },
    { href: "/dashboard/stats-view", label: "Stats" },
    { href: "/dashboard/audio-database", label: "Audio Database" },
    { href: "/dashboard/menu", label: "Home" },
    { href: "/dashboard/posts-stats", label: "Posts Stats" },
  ];
  
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
        const { data: postRows, error: postErr } = await supabase
          .from("posts")
          .select(
            "id, post_name, post_date, status, artist_id, youtube_url, notes"
          )
          .eq("status", "posted")
          .not("youtube_url", "is", null);
        if (postErr) throw postErr;

        const postIds = (postRows || []).map((p) => p.id);
        let snapshotRows = [];
        if (postIds.length > 0) {
          const { data: snapRows, error: snapErr } = await supabase
            .from("post_metrics_snapshots")
            .select("*")
            .in("post_id", postIds)
            .eq("platform", PLATFORM_YOUTUBE_SHORTS)
            .order("snapshot_at", { ascending: true });
          if (snapErr) throw snapErr;
          snapshotRows = snapRows || [];
        }

        setArtists(artistRows || []);
        setPosts(postRows || []);
        setSnapshots(snapshotRows);
      } catch (err) {
        console.error("Error loading stats data:", err);
        setErrorMsg("Could not load stats data. Check console for details.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // helpful maps
  const artistById = useMemo(() => {
    const map = new Map();
    artists.forEach((a) => map.set(a.id, a));
    return map;
  }, [artists]);

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
    return map;
  }, [snapshots]);

  // compute per-artist averages from last 15 posts (using latest snapshot only)
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

  // group posts by channel size tier (based on artist.youtube_followers or "Unknown")
  function getArtistTier(artist) {
    const followers = artist?.youtube_followers;
    if (followers == null || Number.isNaN(Number(followers))) return "Unknown size";
    if (followers < 400) return "Under 400 followers";
    if (followers < 1000) return "400–1k followers";
    return "Over 1k followers";
  }  

  const postsByTier = useMemo(() => {
    const buckets = new Map();
    posts.forEach((p) => {
      const artist = artistById.get(p.artist_id);
      const tier = getArtistTier(artist);
      if (!buckets.has(tier)) buckets.set(tier, []);
      buckets.get(tier).push(p);
    });

    // within each bucket, sort by views (latest snapshot)
    buckets.forEach((list, tier) => {
      list.sort((a, b) => {
        const snapA = latestSnapshotByPostId.get(a.id);
        const snapB = latestSnapshotByPostId.get(b.id);
        const viewsA = snapA ? Number(snapA.views) || 0 : 0;
        const viewsB = snapB ? Number(snapB.views) || 0 : 0;
        return viewsB - viewsA;
      });
    });

    return buckets;
  }, [posts, artistById, latestSnapshotByPostId]);

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

    const tiers = Array.from(postsByTier.keys()).sort((a, b) => {
      const order = ["0–10k subs", "10k–50k subs", "50k–100k subs", "100k+ subs", "Unknown size"];
      return order.indexOf(a) - order.indexOf(b);
    });

    return (
      <div className="space-y-6">
        {tiers.map((tierKey) => {
          const postsInTier = (postsByTier.get(tierKey) || []).slice(0, 4);
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
                            {post.post_date
                              ? new Date(post.post_date).toLocaleDateString()
                              : "No date"}
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          <div>
                            <span className="font-semibold">
                              {formatNumber(views)}
                            </span>{" "}
                            views
                          </div>
                          <div>
                            {formatNumber(likes)} likes •{" "}
                            {formatNumber(comments)} comments
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700">
                        <div>
                          <div className="font-semibold">Completion</div>
                          <div>
                            Post: {formatPercent(completion)}{" "}
                            {artistAvg?.completion_rate != null && (
                              <>
                                <span className="text-gray-400 mx-1">•</span>
                                Avg: {formatPercent(artistAvg.completion_rate)}
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">Retention</div>
                          <div>
                            Post: {formatPercent(retention)}{" "}
                            {artistAvg?.retention_rate != null && (
                              <>
                                <span className="text-gray-400 mx-1">•</span>
                                Avg: {formatPercent(artistAvg.retention_rate)}
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">Reach</div>
                          <div>
                            Post: {formatNumber(reach)}{" "}
                            {artistAvg?.reach != null && (
                              <>
                                <span className="text-gray-400 mx-1">•</span>
                                Avg: {formatNumber(artistAvg.reach)}
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">
                            Avg view duration
                          </div>
                          <div>
                            Post: {formatSecondsToHMS(avgViewDur)}{" "}
                            {artistAvg?.avg_view_duration != null && (
                              <>
                                <span className="text-gray-400 mx-1">•</span>
                                Avg:{" "}
                                {formatSecondsToHMS(
                                  artistAvg.avg_view_duration
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-1 text-[10px] text-gray-500">
                        Click to see full timeline & variations
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
    <div className="min-h-screen bg-[#a89ee4] flex justify-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4 p-4 md:p-8">
        {/* SIDE MENU */}
        <div className="md:w-64 md:shrink-0">
          <div className="md:hidden flex justify-end mb-2">
            <button
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#bbe1ac] shadow"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? "Hide menu" : "Show menu"}
            >
              <span className="text-xl leading-none">
                {menuOpen ? "×" : "☰"}
              </span>
            </button>
          </div>

          <aside
            className={`${
              menuOpen ? "block" : "hidden"
            } md:block w-full bg-[#bbe1ac] rounded-2xl shadow-lg p-4`}
          >
            <h2 className="text-lg font-semibold mb-3">Menu</h2>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block w-full rounded-lg px-3 py-2 text-sm font-medium hover:bg-white hover:shadow ${
                      item.href === "/dashboard/posts-stats"
                        ? "bg-white"
                        : "bg-[#eef8ea]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col gap-4">
          <section className="bg-[#bbe1ac] rounded-2xl shadow-lg p-4 md:p-6 flex-1">
            <h1 className="text-xl md:text-2xl font-bold mb-4">
              Posts Stats (YouTube first pass)
            </h1>

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

            {activeTab === "instagram" && (
              <div className="text-sm text-gray-800 bg-[#eef8ea] rounded-xl p-4">
                This tab is under construction. Once the Instagram Graph API is
                wired in, you&apos;ll see similar per-post metrics and
                comparisons here.
              </div>
            )}

            {activeTab === "tiktok" && (
              <div className="bg-[#eef8ea] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">TikTok (stub)</div>
                    <div className="text-xs text-gray-600 mt-1">
                      This tab will mirror YouTube once TikTok metrics scopes are enabled.
                      For now, it shows what’s missing.
                    </div>
                  </div>

                  <button
                    className="text-[11px] px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/metrics/tiktok-batch", {
                          method: "GET",
                          headers: {
                            Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
                          },
                        });
                        const json = await res.json();
                        console.log("TikTok batch result:", json);
                        alert("Ran TikTok batch. Check console for details.");
                      } catch (e) {
                        console.error(e);
                        alert("Failed to run TikTok batch (check console).");
                      }
                    }}
                  >
                    Run TikTok fetch (manual)
                  </button>
                </div>

                <div className="mt-4 grid md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-gray-500">Connected TikTok tokens</div>
                    <div className="text-lg font-semibold">
                      {tiktokInfo.loading ? "…" : tiktokInfo.tokenCount}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-gray-500">Posted posts w/ TikTok links</div>
                    <div className="text-lg font-semibold">
                      {tiktokInfo.loading ? "…" : tiktokInfo.postCount}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-gray-500">TikTok snapshots</div>
                    <div className="text-lg font-semibold">
                      {tiktokInfo.loading ? "…" : tiktokInfo.snapshotCount}
                    </div>
                  </div>
                </div>

                {tiktokInfo.error && (
                  <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {tiktokInfo.error}
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-700">
                  <div className="font-semibold mb-1">Next steps</div>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Ensure each post has a TikTok link saved in <code>posts.tiktok_url</code>.</li>
                    <li>Ensure the artist has TikTok connected (Token Health page → Connect via TikTok).</li>
                    <li>Enable TikTok API scopes for video metrics (requires TikTok approval).</li>
                    <li>Once scopes are enabled, the cron will begin generating snapshots here.</li>
                  </ol>
                </div>
              </div>
            )}


            {activeTab === "standout" && (
              <div className="text-sm text-gray-800 bg-[#eef8ea] rounded-xl p-4">
                This tab is under construction. It will highlight posts that
                over- or under-perform on one platform vs others, plus a space
                for notes.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* POST DETAILS MODAL */}
      {selectedPost && (
        <PostDetailsModal
          post={selectedPost}
          artist={artistById.get(selectedPost.artist_id)}
          snapshots={snapshotsByPostId.get(selectedPost.id) || []}
          artistAverages={artistAverages.get(selectedPost.artist_id) || null}
          variations={selectedPostVariations}
          loading={modalLoading}
          onClose={closeModal}
        />
      )}
    </div>
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
              • YouTube Shorts
            </div>
            {post.youtube_url && (
              <a
                href={post.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1 text-xs text-blue-600 underline"
              >
                Open on YouTube
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
