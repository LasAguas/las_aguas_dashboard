"use client";

import { useEffect, useMemo, useState } from "react";
import ArtistLayout from "../../components/artist/ArtistLayoutAdmin";
import { supabase } from "../../lib/supabaseClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// -------------------- helpers (copied from artist insights) --------------------

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

      if (baseRow[key] == null) {
        baseRow[key] = 0;
      }
    }
  }

  return series;
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
        {label}: {formatNumber(value)}{" "}
        {symbol ? <span className="ml-1">{symbol}</span> : null}
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
          <div className="text-sm font-semibold truncate">
            {p.post_name || "Untitled post"}
          </div>
          <div className="text-xs opacity-70">
            {formatShortDate(p.post_date)}
          </div>
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
          className="w-full rounded-xl"
        />
      )}
      {isVideo && (
        <video
          src={publicUrl}
          controls
          className="w-full rounded-xl"
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
        const hasAny = series.some(
          (row) =>
            row.instagram != null ||
            row.tiktok != null ||
            row.youtube != null
        );
        if (!hasAny) return null;
        return { ...m, series };
      })
      .filter(Boolean);
  }, [platformSnaps, open, postId]);

  useEffect(() => {
    if (!open || !postId) return;

    const run = async () => {
      try {
        setLoading(true);
        setLoadErr("");
        setMediaUrl(null);
        setMediaFileName(null);

        const { data: vars, error } = await supabase
          .from("postvariations")
          .select("file_name")
          .eq("post_id", postId)
          .not("file_name", "is", null)
          .limit(1);

        if (error) throw error;
        if (!vars || !vars.length) return;

        const v = vars[0];
        const { data } = supabase.storage
          .from("post-variations")
          .getPublicUrl(v.file_name);

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

  if (!open || !postId || !post) return null;

  const buttons = [
    { key: "instagram_url", label: "Instagram", color: "#ffd400" },
    { key: "tiktok_url", label: "TikTok", color: "#8000ff" },
    { key: "youtube_url", label: "YouTube", color: "#ff0000" },
  ].filter((b) => !!post[b.key]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-[95vw] max-w-4xl max-h-[95vh] overflow-auto p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-semibold text-[#33296b]">
              {post.post_name || "Untitled post"}
            </div>
            <div className="text-xs opacity-70">
              {formatShortDate(post.post_date)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#e6e7eb] text-xs"
          >
            Close
          </button>
        </div>

        {/* Media player */}
        <div className="mb-4">
          {loading ? (
            <div className="artist-panel-secondary p-3 text-sm opacity-70">
              Loading media preview…
            </div>
          ) : loadErr ? (
            <div className="artist-panel-secondary p-3 text-sm text-red-700">
              {loadErr}
            </div>
          ) : (
            <MediaPreview publicUrl={mediaUrl} fileName={mediaFileName} />
          )}
        </div>

        {/* View on platform buttons */}
        <div className="artist-panel-secondary p-3 mb-4">
          <div className="text-xs font-semibold mb-2">
            View this post on platforms
          </div>
          <div className="flex flex-wrap gap-2">
            {buttons.length ? (
              buttons.map((b) => (
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
              <div className="text-xs opacity-70">
                No platform links saved for this post yet.
              </div>
            )}
          </div>
        </div>

        {/* Charts */}
        <div>
          {charts.length === 0 ? (
            <div className="text-sm opacity-70">
              No chartable data yet for this post.
            </div>
          ) : (
            <div className="space-y-4">
              {charts.map((c) => (
                <div
                  key={c.key}
                  className="artist-panel-secondary p-3 rounded-xl"
                >
                  <div className="text-xs font-semibold mb-2">
                    {c.label}
                  </div>
                  <div className="w-full h-40">
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

// -------------------- editable section card for admin --------------------

function AdminSectionCard({
  title,
  note,
  onChangeNote,
  onSaveNote,
  saving,
  children,
}) {
  return (
    <div className="artist-panel p-4 md:p-5">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
      <div className="mt-4 artist-panel-secondary p-3 rounded-xl">
        <div className="text-xs font-semibold mb-1 text-[#33296b]">
          Notes for artist
        </div>
        <textarea
          className="w-full border border-gray-200 rounded-lg p-2 text-xs md:text-sm resize-vertical"
          rows={3}
          value={note || ""}
          onChange={(e) => onChangeNote?.(e.target.value)}
          placeholder="Write your notes about this section. Artists will see this on their Insights page."
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onSaveNote}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs bg-[#bce1ac] text-[#33296b] hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save notes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------- page (admin) --------------------

const SECTION_KEYS = {
  best: "best_performers",
  worst: "worst_performers",
  comments: "most_comments",
};

export default function InsightsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [artistOptions, setArtistOptions] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const artistId = selectedArtistId ? Number(selectedArtistId) : null;

  const [posts, setPosts] = useState([]);
  const [platformSnapsByPostId, setPlatformSnapsByPostId] = useState(
    new Map()
  );
  const [totalsByPostId, setTotalsByPostId] = useState(new Map());

  const [notesBySection, setNotesBySection] = useState({});
  const [savingSections, setSavingSections] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalPost, setModalPost] = useState(null);

  // Load artist options (same filter pattern as onboarding-admin)
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
  }, [selectedArtistId]);

  // Load posts + metrics for selected artist
  useEffect(() => {
    const run = async () => {
      if (!artistId) {
        setPosts([]);
        setPlatformSnapsByPostId(new Map());
        setTotalsByPostId(new Map());
        return;
      }

      try {
        setLoading(true);
        setErr("");

        // last 6 weeks
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 42);
        const cutoffYMD = cutoff.toISOString().slice(0, 10);

        const { data: postsData, error: postsErr } = await supabase
          .from("posts")
          .select(
            "id, artist_id, post_name, post_date, status, instagram_url, tiktok_url, youtube_url"
          )
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
          const { data: snaps, error: snapsErr } = await supabase
            .from("post_metrics_snapshots")
            .select(
              "id, post_id, platform, snapshot_at, created_at, views, likes, comments, shares, saves"
            )
            .in("post_id", postIds)
            .order("snapshot_at", { ascending: true });

          if (snapsErr) throw snapsErr;

          const byPost = new Map();
          const latestByPostPlatform = new Map();

          (snaps || []).forEach((s) => {
            const pid = s.post_id;
            const plat = normalizePlatform(s.platform);

            if (!byPost.has(pid)) {
              byPost.set(pid, { instagram: [], tiktok: [], youtube: [] });
            }

            if (
              plat === "instagram" ||
              plat === "tiktok" ||
              plat === "youtube"
            ) {
              byPost.get(pid)[plat].push(s);
              latestByPostPlatform.set(`${pid}:${plat}`, s);
            }
          });

          const totals = new Map();
          postIds.forEach((pid) => {
            const ig = latestByPostPlatform.get(`${pid}:instagram`);
            const tt = latestByPostPlatform.get(`${pid}:tiktok`);
            const yt = latestByPostPlatform.get(`${pid}:youtube`);

            const sum = (k) =>
              Number(ig?.[k] ?? 0) +
              Number(tt?.[k] ?? 0) +
              Number(yt?.[k] ?? 0);

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

        // Load notes for this artist (same shape as artist-side insights)
        try {
            const { data: notesRows, error: notesErr } = await supabase
            .from("artist_insight_notes")
            .select("section, note")
            .eq("artist_id", artistId);
        
            if (notesErr) {
            console.error("Supabase error (artist_insight_notes):", notesErr);
            } else {
            const map = {};
            (notesRows || []).forEach((r) => {
                map[r.section] = r.note || "";
            });
            setNotesBySection(map);
            }
        } catch (e) {
            console.error("Failed to load insight notes", e);
        }
  
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load insights.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [artistId]);

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
      .filter((row) => {
        // Filter out null rows and rows where all metrics are zero
        if (!row) return false;
        const hasMetrics = 
          Number(row.totals.views ?? 0) > 0 ||
          Number(row.totals.likes ?? 0) > 0 ||
          Number(row.totals.comments ?? 0) > 0;
        return hasMetrics;
      });
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

  const best = useMemo(
    () => [...rows].sort((a, b) => b.score - a.score).slice(0, 3),
    [rows]
  );
  const worst = useMemo(
    () => [...rows].sort((a, b) => a.score - b.score).slice(0, 3),
    [rows]
  );
  const mostComments = useMemo(
    () =>
      [...rows]
        .filter((r) => r.comments > 0)
        .sort((a, b) => b.comments - a.comments)
        .slice(0, 3),
    [rows]
  );

  function openPost(p) {
    setModalPost(p);
    setModalOpen(true);
  }

  async function saveNote(sectionKey) {
    if (!artistId) return;
    const note = notesBySection[sectionKey] || "";
  
    setSavingSections((prev) => ({ ...prev, [sectionKey]: true }));
    try {
      // First, see if a note already exists for this artist + section
      const { data: existingRows, error: fetchErr } = await supabase
        .from("artist_insight_notes")
        .select("id")
        .eq("artist_id", artistId)
        .eq("section", sectionKey)
        .limit(1);
  
      if (fetchErr) throw fetchErr;
  
      if (existingRows && existingRows.length > 0) {
        // Update existing row
        const id = existingRows[0].id;
        const { error: updateErr } = await supabase
          .from("artist_insight_notes")
          .update({ note })
          .eq("id", id);
  
        if (updateErr) throw updateErr;
      } else {
        // Insert a new row
        const { error: insertErr } = await supabase
          .from("artist_insight_notes")
          .insert({
            artist_id: artistId,
            section: sectionKey,
            note,
          });
  
        if (insertErr) throw insertErr;
      }
    } catch (e) {
      console.error("Failed to save insight note", e);
      alert(e?.message || "Failed to save note.");
    } finally {
      setSavingSections((prev) => ({ ...prev, [sectionKey]: false }));
    }
  }
  

  return (
    <ArtistLayout title="Insights (admin)">
      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Artist dropdown */}
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

      {!artistId ? (
        <div className="text-sm text-gray-600">
          Please select an artist to view insights.
        </div>
      ) : loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-4">
          <AdminSectionCard
            title="Best performers"
            note={notesBySection[SECTION_KEYS.best]}
            onChangeNote={(val) =>
              setNotesBySection((prev) => ({
                ...prev,
                [SECTION_KEYS.best]: val,
              }))
            }
            onSaveNote={() => saveNote(SECTION_KEYS.best)}
            saving={!!savingSections[SECTION_KEYS.best]}
          >
            <div className="space-y-2">
              {best.length ? (
                best.map((r) => (
                  <PostRowButton
                    key={r.post.id}
                    row={r}
                    avgs={avgs}
                    onOpen={openPost}
                  />
                ))
              ) : (
                <div className="text-sm opacity-70">
                  No posts in the last 6 weeks.
                </div>
              )}
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Worst performers"
            note={notesBySection[SECTION_KEYS.worst]}
            onChangeNote={(val) =>
              setNotesBySection((prev) => ({
                ...prev,
                [SECTION_KEYS.worst]: val,
              }))
            }
            onSaveNote={() => saveNote(SECTION_KEYS.worst)}
            saving={!!savingSections[SECTION_KEYS.worst]}
          >
            <div className="space-y-2">
              {worst.length ? (
                worst.map((r) => (
                  <PostRowButton
                    key={r.post.id}
                    row={r}
                    avgs={avgs}
                    onOpen={openPost}
                  />
                ))
              ) : (
                <div className="text-sm opacity-70">
                  No posts in the last 6 weeks.
                </div>
              )}
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Most comments"
            note={notesBySection[SECTION_KEYS.comments]}
            onChangeNote={(val) =>
              setNotesBySection((prev) => ({
                ...prev,
                [SECTION_KEYS.comments]: val,
              }))
            }
            onSaveNote={() => saveNote(SECTION_KEYS.comments)}
            saving={!!savingSections[SECTION_KEYS.comments]}
          >
            <div className="space-y-2">
              {mostComments.length ? (
                mostComments.map((r) => (
                  <PostRowButton
                    key={r.post.id}
                    row={r}
                    avgs={avgs}
                    onOpen={openPost}
                  />
                ))
              ) : (
                <div className="text-sm opacity-70">
                  No posts with comments in the last 6 weeks.
                </div>
              )}
            </div>
          </AdminSectionCard>

          <div className="artist-panel p-4 md:p-5">
            <h2 className="text-sm font-semibold mb-2">Profile Stats</h2>
            <p className="text-sm opacity-80">
              This section is quite hard to make and is coming soon.
            </p>
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
