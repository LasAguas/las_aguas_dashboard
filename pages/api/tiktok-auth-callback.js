// pages/api/tiktok-auth-callback.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.redirect("/dashboard/token-health?error=method_not_allowed");
    }

    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error("TikTok auth error:", error, error_description);
      return res.redirect("/dashboard/token-health?error=tiktok_auth");
    }

    if (!code || !state) {
      console.error("Missing code or state in TikTok callback", req.query);
      return res.redirect(
        "/dashboard/token-health?error=missing_code_or_state"
      );
    }

    const artistId = state;
    if (!artistId) {
      console.error("Invalid artistId (state):", state);
      return res.redirect("/dashboard/token-health?error=invalid_artist");
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientKey || !clientSecret) {
      console.error("TikTok env vars missing");
      return res.redirect("/dashboard/token-health?error=server_config");
    }

    // Build the SAME redirectUri as in tiktok-auth-start
    const protoHeader = req.headers["x-forwarded-proto"] || "http";
    const protocol = Array.isArray(protoHeader)
      ? protoHeader[0]
      : protoHeader.split(",")[0];
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const redirectUri = `${protocol}://${host}/api/tiktok-auth-callback`;

    // Exchange code for access_token
    const tokenRes = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      }
    );

    const tokenJson = await tokenRes.json();
    console.log("TikTok token response:", tokenJson);

    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("Failed to get TikTok access_token:", tokenJson);
      return res.redirect("/dashboard/token-health?error=tiktok_token");
    }

    const accessToken = tokenJson.access_token;
    const now = new Date().toISOString();

    const { error: upsertError } = await supabaseAdmin
      .from("artist_social_auth_status")
      .upsert(
        {
          artist_id: artistId,
          platform: "tiktok",
          status: "ok",
          access_token: accessToken,
          last_checked_at: now,
          last_token_updated_at: now,
        },
        { onConflict: "artist_id,platform" }
      );

    if (upsertError) {
      console.error("Error saving TikTok token:", upsertError);
      return res.redirect("/dashboard/token-health?error=save_token");
    }

    return res.redirect("/dashboard/token-health?connected=tiktok");
  } catch (err) {
    console.error("TikTok callback error:", err);
    return res.redirect("/dashboard/token-health?error=unknown");
  }
}
