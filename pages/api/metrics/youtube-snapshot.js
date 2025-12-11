// pages/api/metrics/youtube-snapshot.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1) Helper: extract the YouTube video ID from a URL
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

    // Fallback: last path segment
    const parts = u.pathname.split("/");
    const last = parts[parts.length - 1];
    return last || null;
  } catch (e) {
    console.error("Invalid YouTube URL:", url, e);
    return null;
  }
}

// 2) Small helper to parse JSON body (pages API)
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

// 3) Main handler: create a snapshot for one post
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { postId, type } = await parseBody(req);

    if (!postId || !type) {
      return res.status(400).json({ error: "Missing postId or type" });
    }

    if (!["shorts", "longform"].includes(type)) {
      return res.status(400).json({ error: "type must be 'shorts' or 'longform'" });
    }

    // 3.1 Load post to get youtube_url
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

    // 3.2 Extract video ID
    const videoId = extractYouTubeVideoId(post.youtube_url);
    if (!videoId) {
      return res.status(400).json({ error: "Could not parse video ID from URL" });
    }

    // 3.3 Call YouTube Data API for public stats
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });
    }

    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(
        videoId
      )}&key=${encodeURIComponent(apiKey)}`
    );
    const ytJson = await ytRes.json();

    if (!ytRes.ok || !ytJson.items || ytJson.items.length === 0) {
      console.error("YouTube API error:", ytJson);
      return res.status(500).json({ error: "YouTube API error", detail: ytJson });
    }

    const stats = ytJson.items[0].statistics || {};
    const views = stats.viewCount ? Number(stats.viewCount) : null;
    const likes = stats.likeCount ? Number(stats.likeCount) : null;
    const comments = stats.commentCount ? Number(stats.commentCount) : null;

    // 3.4 Compute very simple scores just to see something
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

    const platform = type === "shorts" ? "youtube_shorts" : "youtube_longform";

    // 3.5 Insert into post_metrics_snapshots
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
      console.error("Error inserting snapshot:", insertError);
      return res.status(500).json({ error: "Failed to save snapshot" });
    }

    return res.status(200).json({
      ok: true,
      platform,
      views,
      likes,
      comments,
      yt_shorts_score,
      yt_longform_intent_score,
    });
  } catch (err) {
    console.error("YouTube snapshot handler error:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
