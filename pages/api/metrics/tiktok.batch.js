// pages/api/metrics/tiktok-batch.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function requireCronAuth(req, res) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// NOTE: update this once we confirm your posts table column name
function extractTikTokVideoIdFromUrl(url) {
  // TikTok URLs vary a lot. We'll start with the common /video/<id> pattern.
  if (!url) return null;
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/video\/(\d+)/);
    return m?.[1] || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    if (!requireCronAuth(req, res)) return;

    // 1) Load TikTok tokens per artist
    const { data: authRows, error: authErr } = await supabaseAdmin
      .from("artist_social_auth_status")
      .select("artist_id, platform, status, access_token")
      .eq("platform", "tiktok")
      .eq("status", "ok");

    if (authErr) return res.status(500).json({ error: "Failed to load TikTok tokens" });

    const tokenByArtistId = new Map((authRows || []).map(r => [String(r.artist_id), r.access_token]));

    // 2) Load posts that are posted and have TikTok URLs
    // TODO: confirm your column name is `tiktok_url` (very likely).
    const { data: posts, error: postErr } = await supabaseAdmin
      .from("posts")
      .select("id, artist_id, status, post_date, tiktok_url")
      .eq("status", "posted")
      .not("tiktok_url", "is", null)
      .limit(200);

    if (postErr) return res.status(500).json({ error: "Failed to load TikTok posts", detail: postErr });

    const results = [];
    for (const p of posts || []) {
      const token = tokenByArtistId.get(String(p.artist_id));
      if (!token) {
        results.push({ postId: p.id, ok: false, reason: "No TikTok token for artist" });
        continue;
      }

      const videoId = extractTikTokVideoIdFromUrl(p.tiktok_url);
      if (!videoId) {
        results.push({ postId: p.id, ok: false, reason: "Could not parse TikTok video id from URL" });
        continue;
      }

      // 3) Attempt to fetch metrics (will fail until scopes are approved)
      const metrics = await fetchTikTokVideoMetrics({ accessToken: token, videoId });

      if (!metrics.ok) {
        results.push({ postId: p.id, ok: false, reason: metrics.reason, detail: metrics.detail });
        continue;
      }

      // 4) Insert snapshot
      const { error: insErr } = await supabaseAdmin
        .from("post_metrics_snapshots")
        .insert({
          post_id: p.id,
          platform: "tiktok",
          snapshot_at: new Date().toISOString(),
          views: metrics.data.views ?? null,
          likes: metrics.data.likes ?? null,
          comments: metrics.data.comments ?? null,
          shares: metrics.data.shares ?? null,
          avg_view_duration: metrics.data.avg_view_duration ?? null,
          retention_rate: metrics.data.retention_rate ?? null,
          completion_rate: metrics.data.completion_rate ?? null,
          raw_metrics: metrics.raw ?? null,
        });

      if (insErr) {
        results.push({ postId: p.id, ok: false, reason: "DB insert failed", detail: insErr });
        continue;
      }

      results.push({ postId: p.id, ok: true });
    }

    return res.status(200).json({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Unexpected error" });
  }
}

async function fetchTikTokVideoMetrics({ accessToken, videoId }) {
  try {
    // TikTok endpoints vary by product/scopes. This is intentionally “pluggable”.
    // Replace the endpoint/fields once we confirm what scopes your app actually has.
    const url = "https://open.tiktokapis.com/v2/video/query/";
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: { video_ids: [videoId] },
        // fields depend on your entitlement
        fields: ["id", "like_count", "comment_count", "share_count", "view_count"],
      }),
    });

    const json = await resp.json();

    if (!resp.ok) {
      // common case: scope missing / not approved
      return { ok: false, reason: "TikTok API error (likely missing scopes)", detail: json };
    }

    const item = json?.data?.videos?.[0];
    if (!item) return { ok: false, reason: "No video returned", detail: json };

    // Normalize into your snapshot shape
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
  } catch (e) {
    return { ok: false, reason: "TikTok fetch exception", detail: String(e) };
  }
}
