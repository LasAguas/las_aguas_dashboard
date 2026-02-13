// pages/api/metrics/collect-all.js
// Single daily cron endpoint that collects metrics for all platforms.
// Imports and calls each batch handler directly (no HTTP self-calls)
// to avoid Vercel Deployment Protection blocking the requests.

import youtubeHandler from "./youtube-batch";
import tiktokHandler from "./tiktok-batch";
import instagramHandler from "./instagram-batch";

// Creates a fake res object that captures what a handler sends back
function createMockRes() {
  let _status = 200;
  let _body = null;
  let _ended = false;

  const res = {
    status(code) {
      _status = code;
      return res;
    },
    json(data) {
      _body = data;
      _ended = true;
      return res;
    },
    send(data) {
      _body = data;
      _ended = true;
      return res;
    },
    end() {
      _ended = true;
      return res;
    },
    setHeader() { return res; },
    getHeader() { return null; },
  };

  return {
    res,
    getResult: () => ({ status: _status, body: _body, ended: _ended }),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "CRON_SECRET not set" });
  }

  // Vercel cron sends Authorization header; also accept query-string for manual testing
  const authHeader = req.headers.authorization || "";
  const querySecret = req.query?.secret;
  const authorized =
    authHeader === `Bearer ${secret}` || querySecret === secret;

  if (!authorized) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const results = {};

  // --- YouTube batch ---
  try {
    const mock = createMockRes();
    await youtubeHandler(
      { method: "GET", headers: req.headers, query: { cron: "1", secret } },
      mock.res
    );
    results.youtube = mock.getResult().body;
  } catch (e) {
    console.error("collect-all: YouTube failed", e);
    results.youtube = { ok: false, error: String(e) };
  }

  // --- TikTok batch ---
  try {
    const mock = createMockRes();
    await tiktokHandler(
      { method: "GET", headers: { authorization: `Bearer ${secret}` }, query: {} },
      mock.res
    );
    results.tiktok = mock.getResult().body;
  } catch (e) {
    console.error("collect-all: TikTok failed", e);
    results.tiktok = { ok: false, error: String(e) };
  }

  // --- Instagram batch ---
  try {
    const mock = createMockRes();
    await instagramHandler(
      { method: "GET", headers: { authorization: `Bearer ${secret}` }, query: {} },
      mock.res
    );
    results.instagram = mock.getResult().body;
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
