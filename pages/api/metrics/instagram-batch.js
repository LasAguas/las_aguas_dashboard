// pages/api/metrics/instagram-batch.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- shared helpers ---

function requireCronAuth(req, res) {
  const auth = req.headers.authorization || "";
  if (!process.env.CRON_SECRET) {
    res.status(500).json({ error: "CRON_SECRET not set on server" });
    return false;
  }
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

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

// -------- Instagram helpers --------

// Normalize URLs (strip trailing slash etc.)
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString();
  } catch {
    return url;
  }
}

// Find the IG media whose permalink matches the `instagram_url`
// using a known facebook_page_id instead of /me/accounts
async function findInstagramMediaByUrl({ accessToken, postUrl, facebookPageId }) {
  const target = normalizeUrl(postUrl);

  if (!facebookPageId) {
    return {
      ok: false,
      reason: "No facebook_page_id for this artist",
      detail: null,
    };
  }

  // 1) Get the IG business account attached to this Page
  const pageResp = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(facebookPageId)}` +
      "?fields=instagram_business_account{username,id}" +
      `&access_token=${encodeURIComponent(accessToken)}`
  );
  const pageJson = await pageResp.json();

  if (!pageResp.ok) {
    return {
      ok: false,
      reason: "IG media list error",
      detail: pageJson,
    };
  }

  const igAccount = pageJson.instagram_business_account;
  if (!igAccount || !igAccount.id) {
    return {
      ok: false,
      reason: "No instagram_business_account for this page",
      detail: pageJson,
    };
  }

  const igUserId = igAccount.id;

  // 2) Walk that IG user's media looking for a matching permalink
  let url =
    `https://graph.facebook.com/v21.0/${encodeURIComponent(igUserId)}/media` +
    "?fields=id,permalink,media_type,timestamp,like_count,comments_count" +
    "&limit=50" +
    `&access_token=${encodeURIComponent(accessToken)}`;

  let pagesChecked = 0;
  const MAX_PAGES = 10;

  while (url && pagesChecked < MAX_PAGES) {
    const resp = await fetch(url);
    const json = await resp.json();

    if (!resp.ok) {
      return { ok: false, reason: "IG media list error", detail: json };
    }

    const data = json.data || [];
    for (const m of data) {
      if (!m.permalink) continue;
      const perm = normalizeUrl(m.permalink);
      if (perm === target) {
        return { ok: true, media: m, raw: json };
      }
    }

    pagesChecked += 1;
    url = json.paging?.next || null;
  }

  return { ok: false, reason: "No matching media for instagram_url", detail: null };
}

// Fetch insights for a single media
async function fetchInstagramInsights({ accessToken, mediaId }) {
  const url =
    // v21.0 where /{ig-media-id}/insights is supported
    `https://graph.facebook.com/v21.0/${encodeURIComponent(mediaId)}/insights` +
    // debug: start with a single, known-valid metric
    "?metric=impressions" +
    `&access_token=${encodeURIComponent(accessToken)}`;

  console.log("IG insights URL:", url); // <– helps confirm what is actually called

  const resp = await fetch(url);
  const json = await resp.json();

  if (!resp.ok) {
    return { ok: false, reason: "IG insights error", detail: json };
  }

  const metricsArray = json.data || [];
  const metricsMap = {};
  for (const m of metricsArray) {
    const name = m.name;
    const values = m.values || [];
    const first = values[0];
    metricsMap[name] = first ? first.value : null;
  }

  const impressions = metricsMap.impressions ?? null;

  // Keep the same shape so the rest of your code doesn’t break
  return {
    ok: true,
    data: {
      impressions,         // filled
      reach: null,         // not requested yet
      engagement: null,    // not computed yet
      saves: null,         // not requested yet
    },
    raw: json,
  };
}

// Build snapshot row for post_metrics_snapshots
function buildSnapshotRow({ post, media, insights }) {
  const likes = media.like_count ?? null;
  const comments = media.comments_count ?? null;

  const views = insights.impressions ?? null; // treat impressions as views for now
  const reach = insights.reach ?? null;
  const saves = insights.saves ?? null;

  // simple combined score – tweak later if you want
  const igScore =
    (likes || 0) * 1 +
    (comments || 0) * 2 +
    (saves || 0) * 3;

  return {
    post_id: post.id,
    platform: "instagram",
    snapshot_at: new Date().toISOString(),
    views,
    reach,
    likes,
    comments,
    saves,
    ig_score: igScore,
    raw_metrics: {
      media,
      insights,
    },
  };
}

// Snapshot a single post
async function snapshotOneInstagramPost({ postId }) {
  // 1) Load post
  const { data: post, error: postErr } = await supabaseAdmin
    .from("posts")
    .select("id, artist_id, instagram_url, status")
    .eq("id", postId)
    .single();

  if (postErr || !post) {
    return { ok: false, reason: "Post not found", detail: postErr };
  }

  if (post.status !== "posted") {
    return { ok: false, reason: "Post is not marked posted" };
  }

  if (!post.instagram_url) {
    return { ok: false, reason: "Post has no instagram_url" };
  }

  // 2) Load artist to get facebook_page_id
  const { data: artist, error: artistErr } = await supabaseAdmin
    .from("artists")
    .select("id, facebook_page_id")
    .eq("id", post.artist_id)
    .single();

  if (artistErr || !artist) {
    return { ok: false, reason: "Artist not found", detail: artistErr };
  }

  if (!artist.facebook_page_id) {
    return {
      ok: false,
      reason: "No facebook_page_id for this artist",
      detail: { artistId: artist.id },
    };
  }

  // 3) Load IG token for this artist
  const { data: authRow, error: authErr } = await supabaseAdmin
    .from("artist_social_auth_status")
    .select("access_token")
    .eq("artist_id", post.artist_id)
    .eq("platform", "instagram")
    .eq("status", "ok")
    .single();

  if (authErr || !authRow?.access_token) {
    return {
      ok: false,
      reason: "No Instagram token for this artist",
      detail: authErr,
    };
  }

  const accessToken = authRow.access_token;

  // 4) Find media by URL using the known facebook_page_id
  const mediaResult = await findInstagramMediaByUrl({
    accessToken,
    postUrl: post.instagram_url,
    facebookPageId: artist.facebook_page_id,
  });

  if (!mediaResult.ok) return mediaResult;
  const media = mediaResult.media;

  // 4) Fetch insights
  const insightsResult = await fetchInstagramInsights({
    accessToken,
    mediaId: media.id,
  });
  if (!insightsResult.ok) return insightsResult;

  // 5) Insert snapshot
  const snapshotRow = buildSnapshotRow({
    post,
    media,
    insights: insightsResult.data,
  });

  const { error: insErr } = await supabaseAdmin
    .from("post_metrics_snapshots")
    .insert(snapshotRow);

  if (insErr) {
    return { ok: false, reason: "Insert failed", detail: insErr };
  }

  return {
    ok: true,
    postId: post.id,
    instagram_url: post.instagram_url,
    media_id: media.id,
    metrics: snapshotRow,
  };
}

// ------------- main handler -------------

export default async function handler(req, res) {
  try {
    if (!requireCronAuth(req, res)) return;

    // POST: snapshot a single post
    if (req.method === "POST") {
      const body = await parseBody(req);
      const postId = body.postId;
      if (!postId) return res.status(400).json({ error: "Missing postId" });

      const result = await snapshotOneInstagramPost({ postId: Number(postId) });
      return res.status(result.ok ? 200 : 400).json(result);
    }

    // GET: batch over recent posts
    if (req.method === "GET") {
      const { data: posts, error: postErr } = await supabaseAdmin
        .from("posts")
        .select("id")
        .eq("status", "posted")
        .not("instagram_url", "is", null)
        .limit(200);

      if (postErr) {
        return res
          .status(500)
          .json({ error: "Failed to load posts", detail: postErr });
      }

      const results = [];
      let processed = 0;

      for (const p of posts || []) {
        processed += 1;
        const r = await snapshotOneInstagramPost({ postId: p.id });
        results.push(r);
      }

      return res.json({ ok: true, processed, results });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("instagram-batch crashed:", e);
    return res.status(500).json({ error: "Unexpected error", detail: String(e) });
  }
}
