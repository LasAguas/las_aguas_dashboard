// pages/dashboard/metrics-debug.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function detectYouTubeTypeFromUrl(url) {
  if (!url) return "longform";
  try {
    const u = new URL(url);
    if (u.pathname.includes("/shorts/")) return "shorts";
    return "longform";
  } catch {
    return "longform";
  }
}

export default function MetricsDebugPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all"); // all | shorts | longform
  const [sortBy, setSortBy] = useState("date"); // date | views | score

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        // 1) Load posts that have a YouTube URL
        const { data: posts, error: postsError } = await supabase
          .from("posts")
          .select("id, artist_id, post_name, post_date, status, youtube_url")
          .not("youtube_url", "is", null)
          .order("post_date", { ascending: false })
          .limit(200);

        if (postsError) throw postsError;

        const postList = posts || [];
        if (postList.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        // 2) Load artist names
        const artistIds = Array.from(
          new Set(
            postList
              .map((p) => p.artist_id)
              .filter((id) => id !== null && id !== undefined)
          )
        );

        let artistMap = new Map();
        if (artistIds.length > 0) {
          const { data: artists, error: artistsError } = await supabase
            .from("artists")
            .select("id, name")
            .in("id", artistIds);

          if (artistsError) throw artistsError;

          artistMap = new Map((artists || []).map((a) => [a.id, a.name]));
        }

        // 3) Load latest snapshots for these posts (both YT platforms)
        const postIds = postList.map((p) => p.id);
        const { data: snaps, error: snapsError } = await supabase
          .from("post_metrics_snapshots")
          .select(
            "id, post_id, platform, snapshot_at, views, likes, comments, yt_shorts_score, yt_longform_intent_score"
          )
          .in("post_id", postIds)
          .in("platform", ["youtube_shorts", "youtube_longform"]);

        if (snapsError) throw snapsError;

        const snapshots = snaps || [];

        // Map of latest snapshot per post+platform
        const latestMap = new Map();
        snapshots.forEach((s) => {
          const key = `${s.post_id}:${s.platform}`;
          const existing = latestMap.get(key);
          const ts = new Date(s.snapshot_at).getTime();
          if (!existing || ts > existing.ts) {
            latestMap.set(key, { ts, snapshot: s });
          }
        });

        // 4) Build rows for UI
        const uiRows = postList.map((post) => {
          const type = detectYouTubeTypeFromUrl(post.youtube_url);
          const platform =
            type === "shorts" ? "youtube_shorts" : "youtube_longform";
          const entry = latestMap.get(`${post.id}:${platform}`);
          const snapshot = entry?.snapshot || null;

          const score =
            type === "shorts"
              ? snapshot?.yt_shorts_score ?? null
              : snapshot?.yt_longform_intent_score ?? null;

          return {
            id: post.id,
            postName: post.post_name || `(Post #${post.id})`,
            artistName: artistMap.get(post.artist_id) || `Artist #${post.artist_id}`,
            postDate: post.post_date,
            status: post.status,
            url: post.youtube_url,
            type, // shorts | longform
            snapshotAt: snapshot?.snapshot_at || null,
            views: snapshot?.views ?? null,
            likes: snapshot?.likes ?? null,
            comments: snapshot?.comments ?? null,
            score,
          };
        });

        setRows(uiRows);
      } catch (e) {
        console.error("Error loading metrics debug:", e);
        setError("Failed to load metrics");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Filtering & sorting
  let displayRows = rows;
  if (filterType !== "all") {
    displayRows = displayRows.filter((r) => r.type === filterType);
  }

  displayRows = [...displayRows].sort((a, b) => {
    if (sortBy === "views") {
      return (b.views ?? 0) - (a.views ?? 0);
    }
    if (sortBy === "score") {
      return (b.score ?? -Infinity) - (a.score ?? -Infinity);
    }
    // default: sort by date desc
    return String(b.postDate || "").localeCompare(String(a.postDate || ""));
  });

  const topRows = displayRows
    .filter((r) => r.score != null)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">YouTube Metrics Debug</h1>
        <p className="text-sm text-gray-600">
          Shows latest YouTube snapshots per post (Shorts & long-form) so you
          can verify the fetcher and see rough performance.
        </p>
      </header>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-600">Loading metrics…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600">
          No posts with YouTube URLs yet.
        </div>
      ) : (
        <>
          {/* Top posts summary */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Top YouTube posts (by score)</h2>
            {topRows.length === 0 ? (
              <p className="text-xs text-gray-500">
                No snapshots with scores yet. Once the cron has run and created
                snapshots, top posts will appear here.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {topRows.map((row) => (
                  <div
                    key={row.id}
                    className="border rounded-md p-3 bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-sm">
                        {row.postName}
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/10">
                        {row.type === "shorts" ? "Shorts" : "Long-form"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {row.artistName}
                      {row.postDate && ` · ${row.postDate}`}
                    </div>
                    <div className="flex gap-4 text-xs mt-1">
                      <span>Views: {row.views ?? "-"}</span>
                      <span>Likes: {row.likes ?? "-"}</span>
                      <span>Comments: {row.comments ?? "-"}</span>
                    </div>
                    <div className="text-xs mt-1">
                      <span className="font-semibold">Score:</span>{" "}
                      {row.score != null ? row.score.toFixed(1) : "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Filters */}
          <section className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Filter:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="shorts">Shorts</option>
                <option value="longform">Long-form</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="date">Latest date</option>
                <option value="views">Views</option>
                <option value="score">Score</option>
              </select>
            </div>
          </section>

          {/* Main table */}
          <section className="overflow-x-auto border rounded-md bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-2 px-2">Post</th>
                  <th className="text-left py-2 px-2">Artist</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-right py-2 px-2">Views</th>
                  <th className="text-right py-2 px-2">Likes</th>
                  <th className="text-right py-2 px-2">Comments</th>
                  <th className="text-right py-2 px-2">Score</th>
                  <th className="text-left py-2 px-2">Last snapshot</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="py-2 px-2 max-w-[220px]">
                      <div className="truncate" title={row.postName}>
                        {row.postName}
                      </div>
                    </td>
                    <td className="py-2 px-2">{row.artistName}</td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-black/5">
                        {row.type === "shorts" ? "Shorts" : "Long-form"}
                      </span>
                    </td>
                    <td className="py-2 px-2">{row.postDate || "-"}</td>
                    <td className="py-2 px-2 text-right">{row.views ?? "-"}</td>
                    <td className="py-2 px-2 text-right">{row.likes ?? "-"}</td>
                    <td className="py-2 px-2 text-right">
                      {row.comments ?? "-"}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {row.score != null ? row.score.toFixed(1) : "-"}
                    </td>
                    <td className="py-2 px-2 text-[11px] text-gray-500">
                      {row.snapshotAt || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
