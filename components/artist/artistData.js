"use client";

import { supabase } from "../../lib/supabaseClient";

export async function getMyArtistContext() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("You must be logged in.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("artist_id, role")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  if (!profile?.artist_id) throw new Error("No artist linked to this profile.");

  return { artistId: profile.artist_id, role: profile.role || null };
}

export function isActiveRange(startDate, endDate, today = new Date()) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  s.setHours(0, 0, 0, 0);
  e.setHours(23, 59, 59, 999);
  return today >= s && today <= e;
}

export function detectMediaType(path) {
  const p = (path || "").toLowerCase();
  if (p.endsWith(".mp4") || p.endsWith(".mov") || p.endsWith(".webm")) return "video";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg") || p.endsWith(".png") || p.endsWith(".webp") || p.endsWith(".gif")) return "image";
  return "unknown";
}

export function publicVariationUrl(path) {
  const { data } = supabase.storage.from("post-variations").getPublicUrl(path);
  return data?.publicUrl || "";
}

export function publicOnboardingUrl(path) {
  const { data } = supabase.storage.from("artist-onboarding").getPublicUrl(path);
  return data?.publicUrl || "";
}
