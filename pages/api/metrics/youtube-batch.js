// pages/api/metrics/youtube-batch.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper: extract the YouTube video ID from a URL
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

// Helper: detect shorts vs longform from URL
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

// Helper: get age in days from a date string
function getAgeInDays(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Infinity;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

// Main handler – can be called by a cron job (GET request)
export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // --- CRON PROTECTION ---
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized (cron secret mismatch)" });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error("YOUTUBE_API_KEY not configured");
      return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });
    }

    // 1) Load all posts that have a YouTube URL and are posted
    const { data: posts, error: postsError } = await supabaseAdmin
      .from("posts")
      .select("id, youtube_url, post_date, status")
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
      if (ageDays > 45) return false; // ignore older than 45 days
      return true;
    });

    if (eligible.length === 0) {
      return res.status(200).json({ ok: true, processed: 0, reason: "no eligible posts" });
    }

    const eligibleIds = eligible.map((p) => p.id);

    // 2) Load latest snapshots for these posts (for both YT platforms)
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
      const platform = type === "shorts" ? "youtube_shorts" : "youtube_longform";
      const key = `${post.id}:${platform}`;
      const ageDays = getAgeInDays(post.post_date);

      let minIntervalDays = 7;
      if (ageDays <= 3) minIntervalDays = 1; // daily for first 3 days

      const lastTs = latestMap.get(key);
      if (!lastTs) {
        // never fetched → always refresh
        toRefresh.push({ post, type, platform });
        continue;
      }

      const lastAgeDays =
        (now.getTime() - lastTs) / (1000 * 60 * 60 * 24);

      if (lastAgeDays >= minIntervalDays) {
        toRefresh.push({ post, type, platform });
      }
    }

    // Optional: cap how many we process per run
    const MAX_PER_RUN = 20;
    const slice = toRefresh.slice(0, MAX_PER_RUN);

    let successCount = 0;
    const errors = [];

    for (const item of slice) {
      try {
        const result = await fetchAndSaveYouTubeSnapshot({
          post: item.post,
          type: item.type,
          platform: item.platform,
          apiKey,
        });
        if (result) successCount++;
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
  } catch (err) {
    console.error("YouTube batch handler error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}

// Call YouTube Data API and write a snapshot for one post
async function fetchAndSaveYouTubeSnapshot({ post, type, platform, apiKey }) {
  const videoId = extractYouTubeVideoId(post.youtube_url);
  if (!videoId) {
    console.error("Could not parse video ID for post", post.id, post.youtube_url);
    return false;
  }

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

  const { error: insertError } = await supabaseAdmin
    .from("post_metrics_snapshots")
    .insert({
      post_id: post.id,
      platform,
      snapshot_at: new Date().toISOString(),
      views,
      likes,
      comments,
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
