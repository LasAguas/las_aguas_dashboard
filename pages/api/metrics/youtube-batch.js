// pages/api/metrics/youtube-batch.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------- Helpers ----------------

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

// Get age in days from a date string
function getAgeInDays(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Infinity;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

// Parse JSON body (pages API)
async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function requireCronAuth(req, res) {
  // Allow Vercel cron to hit the endpoint without custom headers,
  // but require a shared secret via query string.
  const cronFlag = req.query?.cron;
  const secret = req.query?.secret;

  // Option A: simplest (only allow cron=1 AND env secret is not required)
  // if (cronFlag === "1") return true;

  // Option B (recommended): require secret in query too
  if (!process.env.CRON_SECRET) {
    res.status(500).json({ error: "CRON_SECRET not set" });
    return false;
  }
  if (cronFlag !== "1" || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ---------------- Main Handler ----------------

export default async function handler(req, res) {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error("YOUTUBE_API_KEY not configured");
      return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });
    }

    // =========================
    // POST = single snapshot mode
    // =========================
    if (req.method === "POST") {
      // For safety, keep it protected (same secret you use for cron/manual triggers).
      // If you want a localhost bypass later, we can add it.
      if (!requireCronAuth(req, res)) return;

      const { postId, type } = await parseBody(req);

      if (!postId) {
        return res.status(400).json({ error: "Missing postId" });
      }

      // Load post to get youtube_url
      const { data: post, error: postError } = await supabaseAdmin
        .from("posts")
        .select("id, youtube_url")
        .eq("id", postId)
        .single();

      if (postError || !post) {
        console.error("Post not found:", postError);
        return res.status(404).json({ error: "Post not found" });
      }

      if (!post.youtube_url) {
        return res.status(400).json({ error: "Post has no youtube_url set" });
      }

      // Determine type:
      // - Prefer provided "type" if valid
      // - Otherwise infer from URL
      let finalType = type;
      if (!["shorts", "longform"].includes(finalType)) {
        finalType = detectYouTubeTypeFromUrl(post.youtube_url);
      }

      const platform =
        finalType === "shorts" ? "youtube_shorts" : "youtube_longform";

      const ok = await fetchAndSaveYouTubeSnapshot({
        post,
        type: finalType,
        platform,
        apiKey,
      });

      if (!ok) {
        return res.status(500).json({ error: "Failed to fetch/save snapshot" });
      }

      return res.status(200).json({
        ok: true,
        postId: post.id,
        platform,
        type: finalType,
      });
    }

    // =========================
    // GET = batch mode (cron)
    // =========================
    if (req.method === "GET") {
      const force = req.query?.force === "1";
      if (!requireCronAuth(req, res)) return;

      // 1) Load all posts that have a YouTube URL
      const { data: posts, error: postsError } = await supabaseAdmin
        .from("posts")
        .select("id, youtube_url, post_date, status, artist_id")
        .not("youtube_url", "is", null);

      if (postsError) {
        console.error("Error loading posts:", postsError);
        return res.status(500).json({ error: "Failed to load posts" });
      }

      const now = new Date();

      // Filter to eligible posts based on age/status
      const eligible = (posts || []).filter((post) => {
        if (post.status !== "posted") return false;
        const ageDays = getAgeInDays(post.post_date);
        if (ageDays > 45) return false;
        return true;
      });

      if (eligible.length === 0) {
        return res
          .status(200)
          .json({ ok: true, processed: 0, reason: "no eligible posts" });
      }

      const eligibleIds = eligible.map((p) => p.id);

      // 2) Load latest snapshot timestamps for these posts (both platforms)
      const { data: snapshots, error: snapshotsError } = await supabaseAdmin
        .from("post_metrics_snapshots")
        .select("post_id, platform, snapshot_at")
        .in("post_id", eligibleIds)
        .in("platform", ["youtube_shorts", "youtube_longform"]);

      if (snapshotsError) {
        console.error("Error loading snapshots:", snapshotsError);
        return res.status(500).json({ error: "Failed to load snapshots" });
      }

      const latestMap = new Map();
      (snapshots || []).forEach((row) => {
        const key = `${row.post_id}:${row.platform}`;
        const existing = latestMap.get(key);
        const ts = new Date(row.snapshot_at).getTime();
        if (!existing || ts > existing) {
          latestMap.set(key, ts);
        }
      });

      // 3) Decide which posts to refresh based on age & last snapshot
      const toRefresh = [];
      for (const post of eligible) {
        const type = detectYouTubeTypeFromUrl(post.youtube_url);
        const platform =
          type === "shorts" ? "youtube_shorts" : "youtube_longform";
        const key = `${post.id}:${platform}`;
        const ageDays = getAgeInDays(post.post_date);

        let minIntervalDays = 7;
        if (ageDays <= 3) minIntervalDays = 1; // daily for first 3 days

        const lastTs = latestMap.get(key);
        // Force mode: refresh everything eligible (still respects MAX_PER_RUN)
        if (force) {
          toRefresh.push({ post, type, platform });
          continue;
        }

        if (!lastTs) {
          toRefresh.push({ post, type, platform });
          continue;
        }

        const lastAgeDays = (now.getTime() - lastTs) / (1000 * 60 * 60 * 24);
        if (lastAgeDays >= minIntervalDays) {
          toRefresh.push({ post, type, platform });
        }
      }

      // cap per run
      const MAX_PER_RUN = 20;
      const slice = toRefresh.slice(0, MAX_PER_RUN);

      let successCount = 0;
      const errors = [];

      for (const item of slice) {
        try {
          const ok = await fetchAndSaveYouTubeSnapshot({
            post: item.post,
            type: item.type,
            platform: item.platform,
            apiKey,
          });
          if (ok) successCount++;
        } catch (e) {
          console.error("Error refreshing post", item.post.id, e);
          errors.push({ postId: item.post.id, error: String(e) });
        }
      }

      return res.status(200).json({
        ok: true,
        eligiblePosts: eligible.length,
        toRefresh: toRefresh.length,
        processed: slice.length,
        successCount,
        errors,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("YouTube batch handler error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}

// ---------------- Worker ----------------

// Call YouTube Data API and write a snapshot for one post
async function fetchAndSaveYouTubeSnapshot({ post, type, platform, apiKey }) {
  const videoId = extractYouTubeVideoId(post.youtube_url);
  if (!videoId) {
    console.error("Could not parse video ID for post", post.id, post.youtube_url);
    return false;
  }

  // --- 1) Basic stats via YouTube Data API (unchanged) ---
  const ytRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(
      videoId
    )}&key=${encodeURIComponent(apiKey)}`
  );
  const ytJson = await ytRes.json();

  if (!ytRes.ok || !ytJson.items || ytJson.items.length === 0) {
    console.error("YouTube API error for post", post.id, ytJson);
    return false;
  }

  const stats = ytJson.items[0].statistics || {};
  const views = stats.viewCount ? Number(stats.viewCount) : null;
  const likes = stats.likeCount ? Number(stats.likeCount) : null;
  const comments = stats.commentCount ? Number(stats.commentCount) : null;

  // --- 2) Compute your existing scores (unchanged) ---
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
    return false;
  }

  return true;
}
