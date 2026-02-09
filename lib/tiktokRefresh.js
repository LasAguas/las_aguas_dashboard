// lib/tiktokRefresh.js
// Refreshes a TikTok access token if it's expired or about to expire.
// Returns the current (or refreshed) access_token, or null on failure.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function ensureFreshTikTokToken(artistId) {
  // Load current token row
  const { data: row, error: loadErr } = await supabaseAdmin
    .from("artist_social_auth_status")
    .select("access_token, refresh_token, access_expires_at")
    .eq("artist_id", Number(artistId))
    .eq("platform", "tiktok")
    .eq("status", "ok")
    .single();

  if (loadErr || !row?.access_token) {
    return { ok: false, reason: "No TikTok token for this artist" };
  }

  // Check if token is still valid (with 5-min buffer)
  if (row.access_expires_at) {
    const expiresAt = new Date(row.access_expires_at).getTime();
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    if (Date.now() < expiresAt - bufferMs) {
      // Token is still fresh
      return { ok: true, access_token: row.access_token };
    }
  }

  // Token is expired or about to expire — refresh it
  if (!row.refresh_token) {
    return { ok: false, reason: "Token expired and no refresh_token stored" };
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return { ok: false, reason: "Missing TikTok env vars" };
  }

  const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
  });

  const tokenJson = await resp.json();

  if (!resp.ok || !tokenJson.access_token) {
    // Mark the token as broken so we don't keep retrying
    await supabaseAdmin
      .from("artist_social_auth_status")
      .update({ status: "expired" })
      .eq("artist_id", Number(artistId))
      .eq("platform", "tiktok");

    return {
      ok: false,
      reason: "TikTok refresh failed — artist needs to re-authenticate",
      detail: tokenJson,
    };
  }

  const { access_token, refresh_token, expires_in, refresh_expires_in } =
    tokenJson;

  const now = Date.now();
  const accessExpiresAt = expires_in
    ? new Date(now + Number(expires_in) * 1000).toISOString()
    : null;
  const refreshExpiresAt = refresh_expires_in
    ? new Date(now + Number(refresh_expires_in) * 1000).toISOString()
    : null;

  const { error: saveErr } = await supabaseAdmin
    .from("artist_social_auth_status")
    .upsert(
      {
        artist_id: Number(artistId),
        platform: "tiktok",
        status: "ok",
        access_token,
        refresh_token,
        access_expires_at: accessExpiresAt,
        refresh_expires_at: refreshExpiresAt,
        token_json: tokenJson,
        last_token_updated_at: new Date().toISOString(),
      },
      { onConflict: "artist_id,platform" }
    );

  if (saveErr) {
    return { ok: false, reason: "Failed to save refreshed token", detail: saveErr };
  }

  console.log(`Refreshed TikTok token for artist ${artistId}`);
  return { ok: true, access_token };
}
