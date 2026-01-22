export default async function handler(req, res) {
  console.log("=== YOUTUBE-BATCH-MANUAL DEBUG START ===");
  console.log("Method:", req.method);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Query params:", req.query);
  
  try {
    if (req.method !== "POST") {
      console.log("ERROR: Wrong method, expected POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Get the cron secret from environment
    const cronSecret = process.env.CRON_SECRET;
    console.log("CRON_SECRET exists?", !!cronSecret);
    console.log("CRON_SECRET value (first 10 chars):", cronSecret?.substring(0, 10));
    
    if (!cronSecret) {
      console.log("ERROR: CRON_SECRET not set");
      return res.status(500).json({ error: "CRON_SECRET not set on server (.env.local / Vercel env)" });
    }

    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = (req.headers["x-forwarded-proto"] || "http").toString().split(",")[0];
    const baseUrl = `${proto}://${host}`;
    
    console.log("Base URL:", baseUrl);

    // Call youtube-batch with the secret
    const url = `${baseUrl}/api/metrics/youtube-batch?cron=1&force=1&secret=${encodeURIComponent(cronSecret)}`;
    console.log("Calling URL:", url.replace(cronSecret, "***SECRET***"));

    console.log("Making fetch request...");
    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    console.log("Fetch response status:", r.status);
    console.log("Fetch response headers:", JSON.stringify(Object.fromEntries(r.headers.entries()), null, 2));

    const text = await r.text();
    console.log("Response text (first 500 chars):", text.substring(0, 500));

    // Try to parse JSON
    let json;
    try {
      json = JSON.parse(text);
      console.log("Successfully parsed JSON:", JSON.stringify(json, null, 2));
    } catch (parseError) {
      console.log("ERROR: Failed to parse JSON:", parseError);
      return res.status(500).json({
        error: "youtube-batch did not return JSON",
        status: r.status,
        bodyPreview: text.slice(0, 300),
        urlCalled: url.replace(cronSecret, "***SECRET***"),
      });
    }

    console.log("=== YOUTUBE-BATCH-MANUAL DEBUG END (SUCCESS) ===");
    return res.status(r.status).json(json);
  } catch (e) {
    console.error("=== YOUTUBE-BATCH-MANUAL CRASHED ===");
    console.error("Error:", e);
    console.error("Error stack:", e.stack);
    return res.status(500).json({
      error: "youtube-batch-manual crashed",
      detail: String(e),
      stack: e.stack,
    });
  }
}