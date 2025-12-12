export default async function handler(req, res) {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }
  
      // ✅ allow local dev without auth (so you can test quickly)
      const host = req.headers.host || "";
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  
      // ✅ in production, require a basic guard (same secret is fine)
      const auth = req.headers.authorization || "";
      if (!isLocal) {
        if (!process.env.CRON_SECRET) {
          return res.status(500).json({ error: "Missing CRON_SECRET on server" });
        }
        if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
          return res.status(401).json({ error: "Unauthorized" });
        }
      }
  
      // call the real batch route with server secret
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        `http://${host}`;
  
      const batchRes = await fetch(`${baseUrl}/api/metrics/tiktok-batch`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
        },
      });
  
      const text = await batchRes.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return res.status(500).json({
          error: "Batch route did not return JSON",
          status: batchRes.status,
          bodyPreview: text.slice(0, 200),
        });
      }
  
      return res.status(batchRes.status).json(json);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Unexpected error" });
    }
  }
  