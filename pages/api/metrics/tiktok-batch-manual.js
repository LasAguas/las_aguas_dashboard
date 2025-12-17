// pages/api/metrics/tiktok-batch-manual.js

export default async function handler(req, res) {
  try {
    // 1) Only allow POST (your button in posts-stats uses POST)
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // 2) Ensure we have the shared cron secret on the server
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return res.status(500).json({
        error: "CRON_SECRET not set on server (.env.local / Vercel env)",
      });
    }

    // 3) Build a base URL that works locally and on Vercel
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = (req.headers["x-forwarded-proto"] || "http")
      .toString()
      .split(",")[0]; // handle "https,http" multi-values

    const baseUrl = `${proto}://${host}`;

    // 4) Call the real TikTok batch endpoint.
    //    We send auth both in query string AND Authorization header
    //    so it works regardless of how /api/metrics/tiktok-batch checks it.
    const url = `${baseUrl}/api/metrics/tiktok-batch?cron=1&secret=${encodeURIComponent(
      cronSecret
    )}`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const text = await r.text();

    // 5) Try to parse JSON; if the batch route ever returns HTML or something else,
    //    surface a helpful debug payload instead of crashing.
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "tiktok-batch did not return JSON",
        status: r.status,
        bodyPreview: text.slice(0, 300),
        urlCalled: url,
      });
    }

    // 6) Pass through status + JSON from the underlying batch call
    return res.status(r.status).json(json);
  } catch (e) {
    console.error("tiktok-batch-manual crashed:", e);
    return res.status(500).json({
      error: "tiktok-batch-manual crashed",
      detail: String(e),
    });
  }
}
