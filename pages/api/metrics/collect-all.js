// pages/api/metrics/collect-all.js
// Single daily cron endpoint that collects metrics for all platforms.
// Vercel cron config calls this once per day; it fans out to the
// existing batch endpoints with the correct auth for each.

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "CRON_SECRET not set" });
  }

  // Vercel cron sends an Authorization header we can check,
  // or we accept query-string secret for manual testing.
  const authHeader = req.headers.authorization || "";
  const querySecret = req.query?.secret;
  const authorized =
    authHeader === `Bearer ${secret}` || querySecret === secret;

  if (!authorized) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Build base URL from the request so it works in any environment
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const baseUrl = `${proto}://${host}`;

  const results = {};

  // --- YouTube batch (uses query-string auth) ---
  try {
    const url = `${baseUrl}/api/metrics/youtube-batch?cron=1&secret=${encodeURIComponent(secret)}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
    });
    results.youtube = await resp.json();
  } catch (e) {
    console.error("collect-all: YouTube failed", e);
    results.youtube = { ok: false, error: String(e) };
  }

  // --- TikTok batch (uses Bearer auth) ---
  try {
    const url = `${baseUrl}/api/metrics/tiktok-batch`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
    });
    results.tiktok = await resp.json();
  } catch (e) {
    console.error("collect-all: TikTok failed", e);
    results.tiktok = { ok: false, error: String(e) };
  }

  // --- Instagram batch (uses Bearer auth) ---
  try {
    const url = `${baseUrl}/api/metrics/instagram-batch`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
    });
    results.instagram = await resp.json();
  } catch (e) {
    console.error("collect-all: Instagram failed", e);
    results.instagram = { ok: false, error: String(e) };
  }

  const allOk =
    results.youtube?.ok !== false &&
    results.tiktok?.ok !== false &&
    results.instagram?.ok !== false;

  return res.status(allOk ? 200 : 207).json({
    ok: allOk,
    timestamp: new Date().toISOString(),
    results,
  });
}
