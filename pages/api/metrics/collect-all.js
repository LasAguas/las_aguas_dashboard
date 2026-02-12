// pages/api/metrics/collect-all.js
// Single daily cron endpoint that collects metrics for all platforms.
// Calls each batch endpoint via fetch with correct auth for each.

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "CRON_SECRET not set" });
  }

  // Vercel cron sends an Authorization header; also accept query-string for manual testing
  const authHeader = req.headers.authorization || "";
  const querySecret = req.query?.secret;
  const authorized =
    authHeader === `Bearer ${secret}` || querySecret === secret;

  if (!authorized) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Build base URL — try multiple sources to handle all environments
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = (req.headers["x-forwarded-proto"] || "https")
    .toString()
    .split(",")[0];

  let baseUrl;
  if (host) {
    baseUrl = `${proto}://${host}`;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    return res.status(500).json({ error: "Cannot determine base URL" });
  }

  const results = { _baseUrl: baseUrl };

  // Helper: fetch a batch endpoint, parse JSON safely
  async function callBatch(name, path, headers) {
    const url = `${baseUrl}${path}`;
    const resp = await fetch(url, { method: "GET", headers });
    const text = await resp.text();

    try {
      return JSON.parse(text);
    } catch {
      // Return debug info if we got HTML instead of JSON
      return {
        ok: false,
        error: "Non-JSON response",
        status: resp.status,
        bodyPreview: text.slice(0, 300),
        urlCalled: url.replace(secret, "***"),
      };
    }
  }

  // --- YouTube batch (uses query-string auth) ---
  try {
    results.youtube = await callBatch(
      "youtube",
      `/api/metrics/youtube-batch?cron=1&secret=${encodeURIComponent(secret)}`,
      { Authorization: `Bearer ${secret}` }
    );
  } catch (e) {
    console.error("collect-all: YouTube failed", e);
    results.youtube = { ok: false, error: String(e) };
  }

  // --- TikTok batch (uses Bearer auth) ---
  try {
    results.tiktok = await callBatch(
      "tiktok",
      `/api/metrics/tiktok-batch`,
      { Authorization: `Bearer ${secret}` }
    );
  } catch (e) {
    console.error("collect-all: TikTok failed", e);
    results.tiktok = { ok: false, error: String(e) };
  }

  // --- Instagram batch (uses Bearer auth) ---
  try {
    results.instagram = await callBatch(
      "instagram",
      `/api/metrics/instagram-batch`,
      { Authorization: `Bearer ${secret}` }
    );
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
