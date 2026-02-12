// pages/api/metrics/collect-all.js
// Single daily cron endpoint that collects metrics for all platforms.
// Calls each batch handler directly instead of making HTTP requests.

import youtubeHandler from "./youtube-batch";
import tiktokHandler from "./tiktok-batch";
import instagramHandler from "./instagram-batch";

// Fake res object to capture what a handler would send back
function createMockRes() {
  let result = null;
  let statusCode = 200;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      result = data;
      return res;
    },
  };

  return { res, getResult: () => ({ statusCode, result }) };
}

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

  const results = {};

  // --- YouTube batch ---
  try {
    const mock = createMockRes();
    // YouTube handler expects cron=1&secret=... in query
    const fakeReq = {
      method: "GET",
      headers: req.headers,
      query: { cron: "1", secret },
    };
    await youtubeHandler(fakeReq, mock.res);
    results.youtube = mock.getResult().result;
  } catch (e) {
    console.error("collect-all: YouTube failed", e);
    results.youtube = { ok: false, error: String(e) };
  }

  // --- TikTok batch ---
  try {
    const mock = createMockRes();
    // TikTok handler expects Authorization: Bearer header
    const fakeReq = {
      method: "GET",
      headers: { authorization: `Bearer ${secret}` },
      query: {},
    };
    await tiktokHandler(fakeReq, mock.res);
    results.tiktok = mock.getResult().result;
  } catch (e) {
    console.error("collect-all: TikTok failed", e);
    results.tiktok = { ok: false, error: String(e) };
  }

  // --- Instagram batch ---
  try {
    const mock = createMockRes();
    // Instagram handler expects Authorization: Bearer header
    const fakeReq = {
      method: "GET",
      headers: { authorization: `Bearer ${secret}` },
      query: {},
    };
    await instagramHandler(fakeReq, mock.res);
    results.instagram = mock.getResult().result;
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
