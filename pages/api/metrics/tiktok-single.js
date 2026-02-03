// pages/api/metrics/tiktok-single.js
// Fetches TikTok stats for a single post by postId (GET request)

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function extractTikTokVideoIdFromUrl(url) {
  // handles https://www.tiktok.com/@user/video/123...
  if (!url) return null;
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/(video|photo)\/(\d+)/);
    return m?.[2] || null;
  } catch {
    return null;
  }
}

async function fetchTikTokVideoMetrics({ accessToken, videoId }) {
  // TikTok expects `fields` in the query string, not the JSON body
  const url =
    "https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count";

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filters: { video_ids: [videoId] },
    }),
  });

  const json = await resp.json();

  if (!resp.ok) {
    return { ok: false, reason: "TikTok API error", detail: json };
  }

  const item = json?.data?.videos?.[0];
  if (!item) return { ok: false, reason: "No video returned", detail: json };

  return {
    ok: true,
    data: {
      views: item.view_count ?? null,
      likes: item.like_count ?? null,
      comments: item.comment_count ?? null,
      shares: item.share_count ?? null,
    },
    raw: json,
  };
}

async function snapshotOnePost({ postId }) {
  // Load post
  const { data: post, error: postErr } = await supabaseAdmin
    .from("posts")
    .select("id, artist_id, tiktok_url, status, post_date")
    .eq("id", postId)
    .single();

  if (postErr || !post) return { ok: false, reason: "Post not found", detail: postErr };
  if (post.status !== "posted") return { ok: false, reason: "Post is not marked posted" };
  if (!post.tiktok_url) return { ok: false, reason: "Post has no tiktok_url" };

  const videoId = extractTikTokVideoIdFromUrl(post.tiktok_url);
  if (!videoId) return { ok: false, reason: "Could not parse video id from tiktok_url" };

  // Load token for the artist
  const { data: authRow, error: authErr } = await supabaseAdmin
    .from("artist_social_auth_status")
    .select("access_token, refresh_token, access_expires_at")
    .eq("artist_id", post.artist_id)
    .eq("platform", "tiktok")
    .eq("status", "ok")
    .single();

  if (authErr || !authRow?.access_token) {
    return { ok: false, reason: "No TikTok token for this artist", detail: authErr };
  }

  const metrics = await fetchTikTokVideoMetrics({
    accessToken: authRow.access_token,
    videoId,
  });

  if (!metrics.ok) return { ok: false, reason: metrics.reason, detail: metrics.detail };

  // --- Derived scores ---
  let tiktokRetentionScore = null;
  let tiktokShareabilityScore = null;

  const views = metrics.data.views;
  const shares = metrics.data.shares;

  // Retention-ish score: views per hour since post_date
  if (post.post_date && typeof views === "number" && !Number.isNaN(views)) {
    const postDate = new Date(post.post_date);
    const ageHours = Math.max(
      1,
      (Date.now() - postDate.getTime()) / (1000 * 60 * 60)
    );
    tiktokRetentionScore = views / ageHours;
  }

  // Shareability: shares per view
  if (
    typeof views === "number" &&
    views > 0 &&
    typeof shares === "number" &&
    !Number.isNaN(shares)
  ) {
    tiktokShareabilityScore = shares / views;
  }

  const { error: insErr } = await supabaseAdmin
    .from("post_metrics_snapshots")
    .insert({
      post_id: post.id,
      platform: "tiktok",
      snapshot_at: new Date().toISOString(),
      views: metrics.data.views,
      likes: metrics.data.likes,
      comments: metrics.data.comments,
      shares: metrics.data.shares,
      tiktok_retention_score: tiktokRetentionScore,
      tiktok_shareability_score: tiktokShareabilityScore,
      raw_metrics: metrics.raw,
    });

  if (insErr) return { ok: false, reason: "Insert failed", detail: insErr };

  return { ok: true, postId: post.id, videoId, metrics: metrics.data };
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify secret
    const secret = req.query?.secret;
    if (!process.env.CRON_SECRET) {
      return res.status(500).json({ error: "CRON_SECRET not set" });
    }
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const postId = req.query?.postId;
    if (!postId) {
      return res.status(400).json({ error: "Missing postId parameter" });
    }

    const result = await snapshotOnePost({ postId: Number(postId) });

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        error: result.reason || "Failed to fetch stats",
        details: result.detail,
        hint: result.reason === "No TikTok token for this artist"
          ? "The artist needs to connect their TikTok account first"
          : undefined,
      });
    }

    return res.status(200).json({
      ok: true,
      postId: result.postId,
      videoId: result.videoId,
      metrics: result.metrics,
    });
  } catch (err) {
    console.error("tiktok-single handler error:", err);
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
