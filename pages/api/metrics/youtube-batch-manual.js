export default async function handler(req, res) {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }
  
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) {
        return res.status(500).json({ error: "CRON_SECRET not set on server (.env.local / Vercel env)" });
      }
  
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const proto = (req.headers["x-forwarded-proto"] || "http").toString().split(",")[0];
      const baseUrl = `${proto}://${host}`;
  
      // Call youtube-batch in the most compatible way:
      // - include query auth (if your youtube-batch expects it)
      // - also include Authorization header (if your older version expects it)
      const url = `${baseUrl}/api/metrics/youtube-batch?cron=1&force=1&secret=${encodeURIComponent(cronSecret)}`;

  
      const r = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      });
  
      const text = await r.text();
  
      // Try to parse JSON; if not JSON, return a debug payload
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return res.status(500).json({
          error: "youtube-batch did not return JSON",
          status: r.status,
          bodyPreview: text.slice(0, 300),
          urlCalled: url,
        });
      }
  
      return res.status(r.status).json(json);
    } catch (e) {
      console.error("youtube-batch-manual crashed:", e);
      return res.status(500).json({
        error: "youtube-batch-manual crashed",
        detail: String(e),
      });
    }
  }
  