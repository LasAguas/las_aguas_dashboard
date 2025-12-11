// pages/api/tiktok-auth-start.js

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
  
      // Build redirect URI from the actual request host/proto
      const protoHeader = req.headers["x-forwarded-proto"] || "http";
      const protocol = Array.isArray(protoHeader)
        ? protoHeader[0]
        : protoHeader.split(",")[0];
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const redirectUri = `${protocol}://${host}/api/tiktok-auth-callback`;
  
      const params = new URLSearchParams({
        client_key: clientKey,
        response_type: "code",
        // Start simple: only request the basic user scope that all Login apps get
        scope: "user.info.basic",
        redirect_uri: redirectUri,
        state: String(artistId),
      });
  
      const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
      return res.redirect(url);
    } catch (err) {
      console.error("Error in tiktok-auth-start:", err);
      return res.status(500).json({ error: "Unexpected error" });
    }
  }
  