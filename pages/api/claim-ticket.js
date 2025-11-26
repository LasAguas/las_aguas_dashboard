// pages/api/claim-ticket.js
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseKey);

function generateCode(prefix) {
  const randomPart = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 chars
  return `${prefix}-${randomPart}`;
}

export default async function handler(req, res) {
  const { method } = req;

  // Allow preflight
  if (method === "OPTIONS") {
    return res.status(200).end();
  }

  if (method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, cargoOrderNumber, quantity, ticketType } = req.body || {};

  if (!email || !ticketType) {
    return res.status(400).json({ error: "Email and ticketType are required" });
  }

  if (!["early_bird", "regular"].includes(ticketType)) {
    return res.status(400).json({ error: "Invalid ticketType" });
  }

  const qty = Number(quantity) || 1;
  if (qty < 1 || qty > 20) {
    return res
      .status(400)
      .json({ error: "Quantity must be between 1 and 20" });
  }

  const orderNumber = cargoOrderNumber
    ? String(cargoOrderNumber).trim()
    : null;

  // 1) Check if we already created tickets for this email + type (+ optional order)
  let existingQuery = supabase
    .from("tickets")
    .select("code")
    .eq("email", email)
    .eq("ticket_type", ticketType)
    .order("created_at", { ascending: true });

  if (orderNumber) {
    existingQuery = existingQuery.eq("cargo_order_number", orderNumber);
  }

  const { data: existing, error: existingError } = await existingQuery;

  if (existingError) {
    console.error("Supabase existing tickets error:", existingError);
    return res.status(500).json({ error: "Failed to check existing tickets" });
  }

  const existingCodes = existing || [];
  const missingCount = Math.max(0, qty - existingCodes.length);

  // 2) Insert any missing tickets
  if (missingCount > 0) {
    const prefix = ticketType === "early_bird" ? "EB" : "RG";

    const newRows = Array.from({ length: missingCount }, () => ({
      code: generateCode(prefix),
      ticket_type: ticketType,
      email,
      cargo_order_number: orderNumber,
      quantity: 1,
    }));

    const { error: insertError } = await supabase
      .from("tickets")
      .insert(newRows);

    if (insertError) {
      console.error("Supabase insert tickets error:", insertError);
      return res.status(500).json({ error: "Failed to create tickets" });
    }
  }

  // 3) Read back all tickets for this email + type (+ optional order)
  let finalQuery = supabase
    .from("tickets")
    .select("code")
    .eq("email", email)
    .eq("ticket_type", ticketType)
    .order("created_at", { ascending: true });

  if (orderNumber) {
    finalQuery = finalQuery.eq("cargo_order_number", orderNumber);
  }

  const { data: finalTickets, error: finalError } = await finalQuery;

  if (finalError) {
    console.error("Supabase final fetch error:", finalError);
    return res.status(500).json({ error: "Failed to load tickets" });
  }

  const codes = (finalTickets || []).slice(0, qty).map((t) => t.code);

  return res.status(200).json({
    ticketType,
    quantity: codes.length,
    codes,
  });
}
