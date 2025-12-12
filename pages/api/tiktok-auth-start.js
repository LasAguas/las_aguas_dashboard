// pages/api/tiktok-auth-start.js
import crypto from "crypto";

function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { artistId } = req.query;

    if (!artistId) {
      return res.status(400).json({ error: "Missing artistId" });
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) {
      console.error("TikTok client key missing");
      return res.status(500).json({ error: "Server config error" });
    }

    // Build redirect URI from the actual request host/proto (your existing logic)
    const protoHeader = req.headers["x-forwarded-proto"] || "http";
    const protocol = Array.isArray(protoHeader)
      ? protoHeader[0]
      : protoHeader.split(",")[0];
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;
      if (!redirectUri) {
        console.error("Missing TIKTOK_REDIRECT_URI");
        return res.redirect("/dashboard/token-health?error=server_config");
      }

    // --- PKCE ---
    const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(
      crypto.createHash("sha256").update(codeVerifier).digest()
    );

    // Store verifier in an httpOnly cookie for the callback to use
    // keep it short-lived
    res.setHeader("Set-Cookie", [
      `tt_pkce_${artistId}=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    ]);

    const params = new URLSearchParams({
      client_key: clientKey,
      response_type: "code",

      // ✅ Update scopes here later once you confirm the exact TikTok scope names you’ve enabled
      // (your file currently uses user.info.basic) :contentReference[oaicite:2]{index=2}
      scope: "user.info.basic,user.info.stats,video.list",

      redirect_uri: redirectUri,
      state: String(artistId),

      // ✅ PKCE required by TikTok
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    return res.redirect(url);
  } catch (err) {
    console.error("Error in tiktok-auth-start:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
