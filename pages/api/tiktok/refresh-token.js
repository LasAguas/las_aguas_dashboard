import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function requireCronOrAdmin(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // allow if you haven't set one yet
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!requireCronOrAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

    const { artistId } = req.query;
    if (!artistId) return res.status(400).json({ error: "Missing artistId" });

    // load current refresh token
    const { data: row, error: loadErr } = await supabaseAdmin
      .from("artist_social_auth_status")
      .select("artist_id, platform, refresh_token")
      .eq("artist_id", Number(artistId))
      .eq("platform", "tiktok")
      .single();

    if (loadErr) return res.status(400).json({ error: loadErr.message });
    if (!row?.refresh_token) return res.status(400).json({ error: "No refresh_token stored for this artist" });

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientKey || !clientSecret) return res.status(500).json({ error: "Missing TikTok env vars" });

    // TikTok refresh token
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    });

    const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const tokenJson = await resp.json();
    if (!resp.ok) {
      return res.status(400).json({ error: "TikTok refresh failed", details: tokenJson });
    }

    const {
      access_token,
      refresh_token,
      expires_in,
      refresh_expires_in,
    } = tokenJson;

    const now = Date.now();
    const accessExpiresAt = expires_in ? new Date(now + Number(expires_in) * 1000).toISOString() : null;
    const refreshExpiresAt = refresh_expires_in ? new Date(now + Number(refresh_expires_in) * 1000).toISOString() : null;

    const { error: saveErr } = await supabaseAdmin
      .from("artist_social_auth_status")
      .upsert(
        {
          artist_id: Number(artistId),
          platform: "tiktok",
          status: "connected",
          access_token,
          refresh_token,
          access_expires_at: accessExpiresAt,
          refresh_expires_at: refreshExpiresAt,
          token_json: tokenJson,
        },
        { onConflict: "artist_id,platform" }
      );

    if (saveErr) return res.status(400).json({ error: saveErr.message });

    return res.json({ ok: true, artistId: Number(artistId), access_expires_at: accessExpiresAt });
  } catch (e) {
    console.error("tiktok refresh-token error:", e);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
