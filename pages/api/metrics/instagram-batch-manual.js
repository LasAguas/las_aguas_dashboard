// pages/api/metrics/instagram-batch-manual.js

export default async function handler(req, res) {
    try {
      // Accept BOTH POST and GET just to avoid method issues
      if (req.method !== "POST" && req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
      }
  
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) {
        return res.status(500).json({
          error: "CRON_SECRET not set on server (.env.local / Vercel env)",
        });
      }
  
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const proto = (req.headers["x-forwarded-proto"] || "http")
        .toString()
        .split(",")[0];
      const baseUrl = `${proto}://${host}`;
  
      const url = `${baseUrl}/api/metrics/instagram-batch`;
  
      // Always call the batch route with GET
      const r = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      });
  
      const text = await r.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        console.error("instagram-batch-manual: non-JSON response", {
          status: r.status,
          bodyPreview: text.slice(0, 300),
        });
        return res.status(500).json({
          error: "instagram-batch did not return JSON",
          status: r.status,
          bodyPreview: text.slice(0, 300),
          urlCalled: url,
        });
      }
  
      return res.status(r.status).json(json);
    } catch (e) {
      console.error("instagram-batch-manual crashed:", e);
      return res.status(500).json({
        error: "instagram-batch-manual crashed",
        detail: String(e),
      });
    }
  }
  