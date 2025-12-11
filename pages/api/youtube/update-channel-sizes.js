import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeHandle(handle) {
  if (!handle) return null;
  return handle.trim().replace(/^@/, "");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Optional: protect route
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing YOUTUBE_API_KEY" });

    const { data: artists, error: aErr } = await supabaseAdmin
      .from("artists")
      .select("id, name, youtube_handle")
      .not("youtube_handle", "is", null);

    if (aErr) return res.status(500).json({ error: "Failed to load artists" });

    const results = [];
    for (const a of artists || []) {
      const q = normalizeHandle(a.youtube_handle);
      if (!q) continue;

      // 1) Search for channel
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(
          q
        )}&key=${encodeURIComponent(apiKey)}`
      );
      const searchJson = await searchRes.json();

      const channelId = searchJson?.items?.[0]?.snippet?.channelId;
      if (!channelId) {
        results.push({ artistId: a.id, ok: false, reason: "No channel match" });
        continue;
      }

      // 2) Fetch channel statistics
      const chanRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(
          channelId
        )}&key=${encodeURIComponent(apiKey)}`
      );
      const chanJson = await chanRes.json();
      const subs = chanJson?.items?.[0]?.statistics?.subscriberCount;

      const youtubeFollowers = subs != null ? Number(subs) : null;
      if (youtubeFollowers == null || Number.isNaN(youtubeFollowers)) {
        results.push({ artistId: a.id, ok: false, reason: "No subscriberCount" });
        continue;
      }

      // 3) Update artists.youtube_followers
      const { error: uErr } = await supabaseAdmin
        .from("artists")
        .update({ youtube_followers: youtubeFollowers })
        .eq("id", a.id);

      if (uErr) {
        results.push({ artistId: a.id, ok: false, reason: "DB update failed" });
        continue;
      }

      results.push({ artistId: a.id, ok: true, youtube_followers: youtubeFollowers });
    }

    return res.status(200).json({ ok: true, updated: results });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
