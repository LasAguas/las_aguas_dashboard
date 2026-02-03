// pages/api/metrics/instagram-manual.js
// Manually add Instagram metrics for a single post

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check CRON_SECRET for security
  const { secret } = req.query;

  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { postId, views, reach, likes, comments, saves, shares } = req.body;

    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    // Verify the post exists
    const { data: post, error: postError } = await supabaseAdmin
      .from("posts")
      .select("id, post_name, artist_id")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({
        ok: false,
        error: "Post not found"
      });
    }

    // Calculate ig_score same as automatic fetch
    const ig_score =
      (Number(likes) || 0) * 1 +
      (Number(comments) || 0) * 2 +
      (Number(saves) || 0) * 3 +
      (Number(shares) || 0) * 3;

    // Build and insert snapshot
    const snapshot = {
      post_id: post.id,
      platform: "instagram",
      snapshot_at: new Date().toISOString(),

      // Instagram-specific metrics
      views: views ? Number(views) : null,
      reach: reach ? Number(reach) : null,
      likes: likes ? Number(likes) : null,
      comments: comments ? Number(comments) : null,
      saves: saves ? Number(saves) : null,
      shares: shares ? Number(shares) : null,

      // Engagement score
      ig_score,

      // Mark as manually entered
      raw_metrics: {
        source: "manual_entry",
        entered_at: new Date().toISOString(),
      }
    };

    const { error: insertError } = await supabaseAdmin
      .from("post_metrics_snapshots")
      .insert(snapshot);

    if (insertError) {
      console.error("Error inserting manual snapshot:", insertError);
      return res.status(500).json({
        ok: false,
        error: "Failed to save metrics to database",
        details: insertError.message
      });
    }

    return res.status(200).json({
      ok: true,
      post_id: post.id,
      message: "Instagram stats saved successfully",
      metrics: {
        views: snapshot.views,
        reach: snapshot.reach,
        likes: snapshot.likes,
        comments: snapshot.comments,
        saves: snapshot.saves,
        shares: snapshot.shares,
        ig_score: snapshot.ig_score,
      }
    });

  } catch (err) {
    console.error("instagram-manual handler error:", err);
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
