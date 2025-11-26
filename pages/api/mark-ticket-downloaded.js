// pages/api/mark-ticket-downloaded.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log("➡️ API hit: mark-ticket-downloaded");

  if (req.method !== "POST") {
    console.log("❌ Wrong method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  let code;
  try {
    const body = req.body;
    console.log("📥 Raw body received:", body);

    code = body?.code;
  } catch (err) {
    console.error("❌ Error parsing body:", err);
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (!code) {
    console.log("❌ Missing code in request body");
    return res.status(400).json({ error: "Ticket code is required" });
  }

  console.log("🔎 Updating ticket in Supabase for code:", code);

  const { error } = await supabase
    .from("tickets")
    .update({ downloaded: true })
    .eq("code", code);

  if (error) {
    console.error("❌ Supabase update error:", error);
    return res.status(500).json({ error: "Failed to update ticket" });
  }

  console.log("✅ Ticket updated successfully:", code);
  return res.status(200).json({ ok: true });
}
