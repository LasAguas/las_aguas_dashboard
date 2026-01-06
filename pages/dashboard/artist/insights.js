"use client";

import { useEffect, useMemo, useState } from "react";
import ArtistLayout from "../../../components/artist/ArtistLayout";
import { getMyArtistContext } from "../../../components/artist/artistData";
import { supabase } from "../../../lib/supabaseClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// -------------------- helpers --------------------

function normalizePlatform(p) {
  const s = String(p || "").toLowerCase();
  if (s.includes("insta")) return "instagram";
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("youtube")) return "youtube";
  if (s.includes("yt")) return "youtube";
  return s || "unknown";
}

function formatNumber(n) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function formatShortDate(dateInput) {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function getMetricDelta(postValue, avgValue) {
  const post = Number(postValue);
  const avg = Number(avgValue);
  if (!isFinite(post) || !isFinite(avg) || avg === 0) return { className: "", symbol: null };
  if (post > avg) return { className: "text-green-600", symbol: "▲" };
  if (post < avg) return { className: "text-red-600", symbol: "▼" };
  return { className: "", symbol: null };
}

// rank by score but do not show score
function performanceScoreTotals(t) {
  const views = Number(t.views ?? 0);
  const comments = Number(t.comments ?? 0);
  const likes = Number(t.likes ?? 0);
  const shares = Number(t.shares ?? 0);
  const saves = Number(t.saves ?? 0);
  return views + 10 * comments + 3 * likes + 5 * shares + 5 * saves;
}

function buildMergedSeriesByDay(platformSnaps, metricKey) {
  const byDay = new Map();

  const ingest = (platformKey, rows) => {
    (rows || []).forEach((r) => {
      const at = r.snapshot_at || r.created_at;
      if (!at) return;
      const day = new Date(at).toISOString().slice(0, 10);
      const v = Number(r?.[metricKey] ?? 0);
      if (!byDay.has(day)) {
        byDay.set(day, { t: day, instagram: null, tiktok: null, youtube: null });
      }
      byDay.get(day)[platformKey] = v;
    });
  };

  // fill per-platform values into byDay
  ingest("instagram", platformSnaps.instagram);
  ingest("tiktok", platformSnaps.tiktok);
  ingest("youtube", platformSnaps.youtube);

  // turn the map into a time-ordered array
  const series = Array.from(byDay.values()).sort((a, b) =>
    a.t > b.t ? 1 : -1
  );

  // ----- backfill late-starting platforms with 0 at earliest day -----
  const platformKeys = ["instagram", "tiktok", "youtube"];

  // find the earliest index where ANY platform has data
  let globalFirstIdx = null;
  for (let i = 0; i < series.length; i++) {
    const row = series[i];
    const hasAny = platformKeys.some((k) => row[k] != null);
    if (hasAny) {
      globalFirstIdx = i;
      break;
    }
  }

  if (globalFirstIdx != null) {
    for (const key of platformKeys) {
      // first index where this platform has data
      let firstIdx = -1;
      for (let i = 0; i < series.length; i++) {
        if (series[i][key] != null) {
          firstIdx = i;
          break;
        }
      }

      // no data at all for this platform → skip
      if (firstIdx === -1) continue;

      // if this platform already starts on the earliest day, nothing to do
      if (firstIdx <= globalFirstIdx) continue;

      // otherwise, backfill a 0 at the earliest day so the line runs from 0
      // on that day up to its first real datapoint
      const baseRow = series[globalFirstIdx];

      // clone row if you want to avoid mutating map values elsewhere
      // but this function owns the objects, so mutation is fine
      if (baseRow[key] == null) {
        baseRow[key] = 0;
      }
    }
  }

  return series;
}

function seriesHasVariance(series, keys) {
  if (!series || series.length < 2) return false;
  for (const k of keys) {
    const vals = series.map((p) => Number(p[k] ?? 0));
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    if (max !== min) return true;
  }
  return false;
}

// -------------------- UI --------------------

function SectionCard({ title, note, children }) {
  return (
    <div className="artist-panel p-4 md:p-5">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
      <div className="mt-4 artist-panel-secondary p-3">
        <div className="text-xs font-semibold mb-1">Notes</div>
        <div className="text-sm whitespace-pre-wrap">{note || "—"}</div>
      </div>
    </div>
  );
}

function formatAvg2(n) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return Number(n).toFixed(2);
  }
  
function StatBlock({ label, value, avg }) {
  const { className, symbol } = getMetricDelta(value, avg);
  return (
    <div className="min-w-0">
      {/* line 1: post value */}
      <div className={`text-xs md:text-sm font-semibold truncate ${className}`}>
        {label}: {formatNumber(value)} {symbol ? <span className="ml-1">{symbol}</span> : null}
      </div>
      {/* line 2: average */}
        <div className="text-[11px] md:text-xs opacity-70 truncate">
        avg: {formatAvg2(avg)}
        </div>
    </div>
  );
}

function PostRowButton({ row, avgs, onOpen }) {
  const p = row.post;
  const t = row.totals;

  return (
    <button
      onClick={() => onOpen(p)}
      className="w-full text-left rounded-2xl px-3 py-3 artist-panel-secondary hover:opacity-90 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{p.post_name || "Untitled post"}</div>
          <div className="text-xs opacity-70">{formatShortDate(p.post_date)}</div>
        </div>
      </div>

      {/* three stats in a row */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        <StatBlock label="Likes" value={t.likes} avg={avgs.likes} />
        <StatBlock label="Views" value={t.views} avg={avgs.views} />
        <StatBlock label="Comments" value={t.comments} avg={avgs.comments} />
      </div>
    </button>
  );
}

function MediaPreview({ publicUrl, fileName }) {
  if (!publicUrl) {
    return (
      <div className="artist-panel-secondary p-3 text-sm opacity-70">
        No media preview available for this post yet.
      </div>
    );
  }

  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(publicUrl);
  const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(publicUrl);

  return (
    <div className="w-full">
      {isImage && (
        <img
          src={publicUrl}
          alt={fileName || "post media"}
          className="max-h-[340px] w-full object-contain rounded-2xl bg-black/10"
        />
      )}
      {isVideo && (
        <video
          src={publicUrl}
          controls
          className="max-h-[340px] w-full object-contain rounded-2xl bg-black"
        />
      )}
      {!isImage && !isVideo && (
        <div className="artist-panel-secondary p-3 text-sm opacity-70">
          Unsupported file type for preview.
        </div>
      )}
    </div>
  );
}

function PostModal({ open, onClose, post, platformSnapsByPostId }) {
    const [loading, setLoading] = useState(false);
    const [mediaUrl, setMediaUrl] = useState(null);
    const [mediaFileName, setMediaFileName] = useState(null);
    const [loadErr, setLoadErr] = useState("");
  
    // Always define stable defaults so hooks never become conditional
    const postId = post?.id ?? null;
  
    const platformSnaps = useMemo(() => {
      if (!postId) return { instagram: [], tiktok: [], youtube: [] };
      return (
        platformSnapsByPostId?.get(postId) || {
          instagram: [],
          tiktok: [],
          youtube: [],
        }
      );
    }, [platformSnapsByPostId, postId]);
  
    const charts = useMemo(() => {
      // When closed or no post, just return empty (still runs the hook)
      if (!open || !postId) return [];
  
      const metrics = [
        { key: "views", label: "Views" },
        { key: "likes", label: "Likes" },
        { key: "comments", label: "Comments" },
        { key: "shares", label: "Shares" },
        { key: "saves", label: "Saves" },
      ];
  
      return metrics
        .map((m) => {
          const series = buildMergedSeriesByDay(platformSnaps, m.key);
          const ok = seriesHasVariance(series, ["instagram", "tiktok", "youtube"]);
          return ok ? { ...m, series } : null;
        })
        .filter(Boolean);
    }, [open, postId, platformSnaps]);
  
    useEffect(() => {
      const run = async () => {
        // If closed, reset and bail (but hook still ran)
        if (!open || !postId) {
          setLoadErr("");
          setMediaUrl(null);
          setMediaFileName(null);
          return;
        }
  
        setLoadErr("");
        setMediaUrl(null);
        setMediaFileName(null);
  
        try {
          setLoading(true);
  
          const { data: variations, error: varErr } = await supabase
            .from("postvariations")
            .select("id, file_name")
            .eq("post_id", postId)
            .not("file_name", "is", null)
            .order("test_version", { ascending: true })
            .limit(1);
  
          if (varErr) throw varErr;
  
          const v = variations?.[0];
          if (!v?.file_name) return;
  
          const { data, error: urlErr } = supabase.storage
            .from("post-variations")
            .getPublicUrl(v.file_name);
  
          if (urlErr) throw urlErr;
  
          setMediaFileName(v.file_name);
          setMediaUrl(data?.publicUrl || null);
        } catch (e) {
          console.error(e);
          setLoadErr(e?.message || "Failed to load media preview.");
        } finally {
          setLoading(false);
        }
      };
  
      run();
    }, [open, postId]);
  
    // Now it’s safe to early-return AFTER hooks
    if (!open || !post) return null;
  
    const linkButtons = [
      { key: "instagram_url", label: "Instagram" },
      { key: "tiktok_url", label: "TikTok" },
      { key: "youtube_url", label: "YouTube" },
    ].filter((b) => post?.[b.key]);
  
    return (
      <div className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-3" onClick={onClose}>
        <div
          className="w-full max-w-4xl artist-panel p-4 md:p-5 max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{post.post_name || "Post"}</div>
              <div className="text-xs opacity-70">{formatShortDate(post.post_date)}</div>
            </div>
            <button onClick={onClose} className="rounded-xl px-3 py-2 artist-btn-secondary text-sm">
              Close
            </button>
          </div>
  
          <div className="mt-4">
            {loadErr ? (
              <div className="artist-panel-secondary p-3 text-sm text-red-700">{loadErr}</div>
            ) : loading ? (
              <div className="artist-panel-secondary p-3 text-sm opacity-70">Loading preview…</div>
            ) : (
              <MediaPreview publicUrl={mediaUrl} fileName={mediaFileName} />
            )}
          </div>
  
          <div className="mt-3 flex flex-wrap gap-2">
            {linkButtons.length ? (
              linkButtons.map((b) => (
                <a
                  key={b.key}
                  href={post[b.key]}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full px-3 py-2 text-xs md:text-sm artist-btn"
                >
                  View on {b.label}
                </a>
              ))
            ) : (
              <div className="text-xs opacity-70">No platform links saved for this post yet.</div>
            )}
          </div>
  
          <div className="mt-5">
            {charts.length === 0 ? (
              <div className="text-sm opacity-70">No chartable data yet for this post.</div>
            ) : (
              <div className="space-y-4">
                {charts.map((c) => (
                  <div key={c.key} className="artist-panel-secondary p-3 md:p-4">
                    <div className="text-sm font-semibold mb-2">{c.label}</div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={c.series}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="t" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="youtube"
                            dot={false}
                            stroke="#ff0000"
                            connectNulls={true}
                          />
                          <Line
                            type="monotone"
                            dataKey="instagram"
                            dot={false}
                            stroke="#ffd400"
                            connectNulls={true}
                          />
                          <Line
                            type="monotone"
                            dataKey="tiktok"
                            dot={false}
                            stroke="#8000ff"
                            connectNulls={true}
                          />

                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
// -------------------- page --------------------

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [posts, setPosts] = useState([]);
  // Map(post_id -> { instagram: [], tiktok: [], youtube: [] })
  const [platformSnapsByPostId, setPlatformSnapsByPostId] = useState(new Map());
  // Map(post_id -> totals {views, likes, comments, shares, saves}
  const [totalsByPostId, setTotalsByPostId] = useState(new Map());

  const [notesBySection, setNotesBySection] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPost, setModalPost] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");

        const { artistId } = await getMyArtistContext();

        // last 6 weeks
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 42);
        const cutoffYMD = cutoff.toISOString().slice(0, 10);

        // include urls for the modal buttons
        const { data: postsData, error: postsErr } = await supabase
          .from("posts")
          .select("id, artist_id, post_name, post_date, status, instagram_url, tiktok_url, youtube_url")
          .eq("artist_id", artistId)
          .eq("status", "posted")
          .gte("post_date", cutoffYMD)
          .order("post_date", { ascending: false })
          .limit(250);

        if (postsErr) throw postsErr;

        // Only keep posts that have at least one platform link
        const filteredPosts = (postsData || []).filter((p) => {
          const ig = (p.instagram_url || "").trim();
          const tt = (p.tiktok_url || "").trim();
          const yt = (p.youtube_url || "").trim();
          return ig || tt || yt;
        });

        setPosts(filteredPosts);


        const postIds = filteredPosts.map((p) => p.id).filter(Boolean);

        if (postIds.length) {
          // need platform to build multi-line charts
          const { data: snaps, error: snapsErr } = await supabase
            .from("post_metrics_snapshots")
            .select("id, post_id, platform, snapshot_at, created_at, views, likes, comments, shares, saves")
            .in("post_id", postIds)
            .order("snapshot_at", { ascending: true });

          if (snapsErr) throw snapsErr;

          const byPost = new Map();
          const latestByPostPlatform = new Map(); // `${post_id}:${platform}` => latest snap

          (snaps || []).forEach((s) => {
            const pid = s.post_id;
            const plat = normalizePlatform(s.platform);

            if (!byPost.has(pid)) byPost.set(pid, { instagram: [], tiktok: [], youtube: [] });

            if (plat === "instagram" || plat === "tiktok" || plat === "youtube") {
              byPost.get(pid)[plat].push(s);
              latestByPostPlatform.set(`${pid}:${plat}`, s); // ordered asc => last wins
            }
          });

          const totals = new Map();
          postIds.forEach((pid) => {
            const ig = latestByPostPlatform.get(`${pid}:instagram`);
            const tt = latestByPostPlatform.get(`${pid}:tiktok`);
            const yt = latestByPostPlatform.get(`${pid}:youtube`);

            const sum = (k) => Number(ig?.[k] ?? 0) + Number(tt?.[k] ?? 0) + Number(yt?.[k] ?? 0);

            totals.set(pid, {
              views: sum("views"),
              likes: sum("likes"),
              comments: sum("comments"),
              shares: sum("shares"),
              saves: sum("saves"),
            });
          });

          setPlatformSnapsByPostId(byPost);
          setTotalsByPostId(totals);
        } else {
          setPlatformSnapsByPostId(new Map());
          setTotalsByPostId(new Map());
        }

        const { data: noteRows, error: notesErr } = await supabase
          .from("artist_insight_notes")
          .select("section, note")
          .eq("artist_id", artistId);

        if (notesErr) throw notesErr;

        const map = {};
        (noteRows || []).forEach((r) => (map[r.section] = r.note));
        setNotesBySection(map);
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const rows = useMemo(() => {
    return posts
      .map((p) => {
        const totals = totalsByPostId.get(p.id);
        if (!totals) return null;
        return {
          post: p,
          totals,
          score: performanceScoreTotals(totals),
          comments: Number(totals.comments ?? 0),
        };
      })
      .filter(Boolean);
  }, [posts, totalsByPostId]);

  const avgs = useMemo(() => {
    if (!rows.length) return { likes: 0, views: 0, comments: 0 };
    const sum = rows.reduce(
      (acc, r) => {
        acc.likes += Number(r.totals.likes ?? 0);
        acc.views += Number(r.totals.views ?? 0);
        acc.comments += Number(r.totals.comments ?? 0);
        return acc;
      },
      { likes: 0, views: 0, comments: 0 }
    );
    return {
      likes: sum.likes / rows.length,
      views: sum.views / rows.length,
      comments: sum.comments / rows.length,
    };
  }, [rows]);

  // limit each category to 3 posts
  const best = useMemo(() => [...rows].sort((a, b) => b.score - a.score).slice(0, 3), [rows]);
  const worst = useMemo(() => [...rows].sort((a, b) => a.score - b.score).slice(0, 3), [rows]);

  // never include posts with 0 comments
  const mostComments = useMemo(
    () => [...rows].filter((r) => r.comments > 0).sort((a, b) => b.comments - a.comments).slice(0, 3),
    [rows]
  );

  function openPost(p) {
    setModalPost(p);
    setModalOpen(true);
  }

  return (
    <ArtistLayout title="Insights">
      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm opacity-70">Loading…</div>
      ) : (
        <div className="space-y-4">
          <SectionCard title="Best performers" note={notesBySection.best_performers}>
            <div className="space-y-2">
              {best.length ? (
                best.map((r) => <PostRowButton key={r.post.id} row={r} avgs={avgs} onOpen={openPost} />)
              ) : (
                <div className="text-sm opacity-70">No posts in the last 6 weeks.</div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Worst performers" note={notesBySection.worst_performers}>
            <div className="space-y-2">
              {worst.length ? (
                worst.map((r) => <PostRowButton key={r.post.id} row={r} avgs={avgs} onOpen={openPost} />)
              ) : (
                <div className="text-sm opacity-70">No posts in the last 6 weeks.</div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Most comments" note={notesBySection.most_comments}>
            <div className="space-y-2">
              {mostComments.length ? (
                mostComments.map((r) => <PostRowButton key={r.post.id} row={r} avgs={avgs} onOpen={openPost} />)
              ) : (
                <div className="text-sm opacity-70">No posts with comments in the last 6 weeks.</div>
              )}
            </div>
          </SectionCard>

          <div className="artist-panel p-4 md:p-5">
            <h2 className="text-sm font-semibold mb-2">Profile Stats</h2>
            <p className="text-sm opacity-80">This section is quite hard to make and is coming soon.</p>
          </div>
        </div>
      )}

      <PostModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        post={modalPost}
        platformSnapsByPostId={platformSnapsByPostId}
      />
    </ArtistLayout>
  );
}
