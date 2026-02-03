// pages/api/metrics/youtube-single.js
// Fetches YouTube stats for a single post by postId (GET request)

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Extract the YouTube video ID from a URL
function extractYouTubeVideoId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);

    // Short URL: https://youtu.be/VIDEOID
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "");
    }

    // Standard: https://www.youtube.com/watch?v=VIDEOID
    if (u.searchParams.has("v")) {
      return u.searchParams.get("v");
    }

    // Shorts: https://www.youtube.com/shorts/VIDEOID
    const parts = u.pathname.split("/");
    const last = parts[parts.length - 1];
    return last || null;
  } catch (e) {
    console.error("Invalid YouTube URL:", url, e);
    return null;
  }
}

// Detect shorts vs longform from URL
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

// Helper: load YouTube auth + channel ID for an artist
async function getYouTubeAuthAndChannel(artistId) {
  const { data: artistRow, error: artistErr } = await supabaseAdmin
    .from("artists")
    .select("youtube_channel_id")
    .eq("id", artistId)
    .single();

  if (artistErr) {
    console.error("Error loading artist for YouTube", artistId, artistErr);
  }

  const { data: authRow, error: authErr } = await supabaseAdmin
    .from("artist_social_auth_status")
    .select("access_token, refresh_token, access_expires_at, token_json, status")
    .eq("artist_id", artistId)
    .eq("platform", "youtube")
    .eq("status", "ok")
    .single();

  if (authErr) {
    console.error("Error loading YouTube auth for artist", artistId, authErr);
  }

  return {
    artistChannelId: artistRow?.youtube_channel_id || null,
    authRow: authRow || null,
  };
}

// Helper: refresh YouTube OAuth access token
async function refreshYouTubeAccessToken(authRow) {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("YouTube OAuth env vars missing");
  }
  if (!authRow.refresh_token) {
    throw new Error("No YouTube refresh_token stored");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: authRow.refresh_token,
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const json = await resp.json();
  if (!resp.ok || !json.access_token) {
    console.error("YouTube refresh failed", json);
    throw new Error("YouTube refresh failed");
  }

  const now = Date.now();
  const accessExpiresAt = json.expires_in
    ? new Date(now + Number(json.expires_in) * 1000).toISOString()
    : null;

  // Save refreshed token
  await supabaseAdmin
    .from("artist_social_auth_status")
    .upsert(
      {
        artist_id: authRow.artist_id,
        platform: "youtube",
        status: "ok",
        access_token: json.access_token,
        refresh_token: authRow.refresh_token,
        access_expires_at: accessExpiresAt,
        token_json: json,
        last_token_updated_at: new Date().toISOString(),
      },
      { onConflict: "artist_id,platform" }
    );

  return { accessToken: json.access_token, accessExpiresAt };
}

// Helper: call YouTube Analytics API for a single video
async function fetchYouTubeAnalyticsForVideo({
  accessToken,
  channelId,
  videoId,
  startDate,
  endDate,
}) {
  const params = new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate, // "YYYY-MM-DD"
    endDate,   // "YYYY-MM-DD"
    dimensions: "video",
    filters: `video==${videoId}`,
    metrics: "views,averageViewDuration,averageViewPercentage,impressions",
  });

  const resp = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const json = await resp.json();
  if (!resp.ok || !json.rows || json.rows.length === 0) {
    console.error("YouTube Analytics error", json);
    return null;
  }

  // rows: [[views, avgViewDuration, avgViewPercentage, impressions]]
  const [views, avgViewDuration, avgViewPercentage, impressions] = json.rows[0];

  return {
    reach: impressions,
    avg_view_duration: avgViewDuration, // seconds
    retention_rate: avgViewPercentage,  // can be 0–1 or 0–100 depending on API config
  };
}

// Fetch and save YouTube snapshot for a single post
async function fetchAndSaveYouTubeSnapshot({ post, type, platform, apiKey }) {
  const videoId = extractYouTubeVideoId(post.youtube_url);
  if (!videoId) {
    console.error("Could not parse video ID for post", post.id, post.youtube_url);
    return { ok: false, reason: "Could not parse video ID from URL" };
  }

  // --- 1) Basic stats via YouTube Data API ---
  const ytRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(
      videoId
    )}&key=${encodeURIComponent(apiKey)}`
  );
  const ytJson = await ytRes.json();

  if (!ytRes.ok || !ytJson.items || ytJson.items.length === 0) {
    console.error("YouTube API error for post", post.id, ytJson);
    return { ok: false, reason: "Video not found or YouTube API error", detail: ytJson };
  }

  const stats = ytJson.items[0].statistics || {};
  const views = stats.viewCount ? Number(stats.viewCount) : null;
  const likes = stats.likeCount ? Number(stats.likeCount) : null;
  const comments = stats.commentCount ? Number(stats.commentCount) : null;

  // --- 2) Compute scores ---
  let yt_shorts_score = null;
  let yt_longform_intent_score = null;

  if (type === "shorts") {
    yt_shorts_score =
      (views || 0) * 0.1 +
      (likes || 0) * 2 +
      (comments || 0) * 3;
  } else {
    yt_longform_intent_score =
      (likes || 0) * 1 +
      (comments || 0) * 2;
  }

  // --- 3) Try to fetch Analytics metrics (reach, avg_view_duration, retention_rate) ---
  let reach = null;
  let avgViewDuration = null;
  let retentionRate = null;

  try {
    const { artistChannelId, authRow } = await getYouTubeAuthAndChannel(
      post.artist_id
    );

    if (artistChannelId && authRow) {
      let accessToken = authRow.access_token;
      let expiresAtMs = authRow.access_expires_at
        ? new Date(authRow.access_expires_at).getTime()
        : null;

      const needsRefresh =
        !accessToken || (expiresAtMs && expiresAtMs < Date.now() + 60_000);

      if (needsRefresh) {
        const refreshed = await refreshYouTubeAccessToken({
          ...authRow,
          artist_id: post.artist_id,
        });
        accessToken = refreshed.accessToken;
      }

      if (accessToken) {
        const startDate =
          post.post_date?.slice(0, 10) ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
        const endDate = new Date().toISOString().slice(0, 10);

        const analytics = await fetchYouTubeAnalyticsForVideo({
          accessToken,
          channelId: artistChannelId,
          videoId,
          startDate,
          endDate,
        });

        if (analytics) {
          reach = analytics.reach ?? null;
          avgViewDuration = analytics.avg_view_duration ?? null;
          retentionRate = analytics.retention_rate ?? null;
        }
      }
    }
  } catch (e) {
    console.error("YouTube Analytics fetch failed for post", post.id, e);
    // Swallow error so basic stats still get stored
  }

  // --- 4) Insert snapshot including Analytics fields ---
  const { error: insertError } = await supabaseAdmin
    .from("post_metrics_snapshots")
    .insert({
      post_id: post.id,
      platform,
      snapshot_at: new Date().toISOString(),
      views,
      likes,
      comments,
      reach,
      avg_view_duration: avgViewDuration,
      retention_rate: retentionRate,
      yt_shorts_score,
      yt_longform_intent_score,
      raw_metrics: ytJson,
    });

  if (insertError) {
    console.error("Error inserting snapshot for post", post.id, insertError);
    return { ok: false, reason: "Failed to save snapshot", detail: insertError };
  }

  return {
    ok: true,
    metrics: {
      views,
      likes,
      comments,
      reach,
      avg_view_duration: avgViewDuration,
      retention_rate: retentionRate,
    },
  };
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

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });
    }

    const postId = req.query?.postId;
    if (!postId) {
      return res.status(400).json({ error: "Missing postId parameter" });
    }

    // Load the post
    const { data: post, error: postErr } = await supabaseAdmin
      .from("posts")
      .select("id, youtube_url, post_date, status, artist_id")
      .eq("id", postId)
      .single();

    if (postErr || !post) {
      return res.status(404).json({
        ok: false,
        error: "Post not found",
        hint: "Check that the post ID is correct",
      });
    }

    if (post.status !== "posted") {
      return res.status(400).json({
        ok: false,
        error: "Post is not marked as posted",
        hint: "Only posts with status 'posted' can have stats fetched",
      });
    }

    if (!post.youtube_url) {
      return res.status(400).json({
        ok: false,
        error: "Post has no YouTube URL",
        hint: "Save a YouTube URL first before fetching stats",
      });
    }

    // Determine type from URL
    const type = detectYouTubeTypeFromUrl(post.youtube_url);
    const platform = type === "shorts" ? "youtube_shorts" : "youtube_longform";

    const result = await fetchAndSaveYouTubeSnapshot({
      post,
      type,
      platform,
      apiKey,
    });

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        error: result.reason || "Failed to fetch stats",
        details: result.detail,
      });
    }

    return res.status(200).json({
      ok: true,
      postId: post.id,
      platform,
      type,
      metrics: result.metrics,
    });
  } catch (err) {
    console.error("youtube-single handler error:", err);
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
