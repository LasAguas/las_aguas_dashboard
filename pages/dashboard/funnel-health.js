"use client";

import { useEffect, useState } from "react";
import TeamLayout from "../../components/team/TeamLayout";
import { supabase } from "../../lib/supabaseClient";

const FUNNEL_SECTIONS = [
  { key: "funnel_tofu_status", label: "TOFU", sublabel: "Top of Funnel" },
  { key: "funnel_mofu_status", label: "MOFU", sublabel: "Middle of Funnel" },
  { key: "funnel_bofu_status", label: "BOFU", sublabel: "Bottom of Funnel" },
];

const STATUS_CYCLE = ["green", "orange", "red"];

const STATUS_COLORS = {
  green:  { bg: "#22c55e" },
  orange: { bg: "#f59e0b" },
  red:    { bg: "#ef4444" },
};

// Each section is a trapezoid with identical taper angle (8% inset per side).
// Sections are separated by a small gap so each tier is visually distinct.
//
// TOFU:  top 0%/100%  → bottom  8%/92%
// MOFU:  top 8%/92%   → bottom 16%/84%
// BOFU:  top 16%/84%  → bottom 24%/76%
const TAPER = 8; // % inset per side per section
const FUNNEL_TIERS = [
  { topL: 0,            topR: 100,          botL: TAPER,       botR: 100 - TAPER },
  { topL: TAPER,        topR: 100 - TAPER,  botL: TAPER * 2,   botR: 100 - TAPER * 2 },
  { topL: TAPER * 2,    topR: 100 - TAPER * 2, botL: TAPER * 3, botR: 100 - TAPER * 3 },
];

function FunnelCard({ artist, onCycle, savingKey }) {
  return (
    <div className="artist-panel p-4">
      <h2 className="text-sm font-semibold mb-3 text-center">{artist.name}</h2>

      <div className="flex flex-col items-center gap-1.5">
        {FUNNEL_SECTIONS.map((section, index) => {
          const status = artist[section.key] || "green";
          const colors = STATUS_COLORS[status] || STATUS_COLORS.green;
          const isSaving = savingKey === `${artist.id}-${section.key}`;
          const t = FUNNEL_TIERS[index];
          const clip = `polygon(${t.topL}% 0%, ${t.topR}% 0%, ${t.botR}% 100%, ${t.botL}% 100%)`;

          return (
            <button
              key={section.key}
              onClick={() => onCycle(artist.id, section.key, status)}
              disabled={isSaving}
              className="relative w-full transition-colors duration-150 disabled:opacity-60"
              style={{
                backgroundColor: colors.bg,
                color: "#fff",
                padding: "14px 0",
                clipPath: clip,
                cursor: "pointer",
                textAlign: "center",
              }}
              title={`${section.sublabel}: ${status} — click to change`}
            >
              <div className="text-xs font-bold">{section.label}</div>
              <div className="text-[10px] opacity-80">{status}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FunnelHealthPage() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    loadArtists();
  }, []);

  async function loadArtists() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, funnel_tofu_status, funnel_mofu_status, funnel_bofu_status")
        .not("id", "in", "(1, 2, 3)")
        .eq("active_client", true)
        .order("name", { ascending: true });

      if (error) {
        // Columns may not exist yet — try without them
        console.warn("Funnel columns query failed, retrying basic:", error.message);
        const { data: basic, error: basicErr } = await supabase
          .from("artists")
          .select("id, name")
          .not("id", "in", "(1, 2, 3)")
          .eq("active_client", true)
          .order("name", { ascending: true });
        if (basicErr) throw basicErr;
        setArtists(basic || []);
      } else {
        setArtists(data || []);
      }
    } catch (err) {
      console.error("Failed to load artists:", err);
    } finally {
      setLoading(false);
    }
  }

  async function cycleStatus(artistId, fieldKey, currentStatus) {
    const currentIndex = STATUS_CYCLE.indexOf(currentStatus || "green");
    const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
    const saveKey = `${artistId}-${fieldKey}`;

    setSavingKey(saveKey);

    // Optimistic update
    setArtists((prev) =>
      prev.map((a) =>
        a.id === artistId ? { ...a, [fieldKey]: nextStatus } : a
      )
    );

    const { error } = await supabase
      .from("artists")
      .update({ [fieldKey]: nextStatus })
      .eq("id", artistId);

    if (error) {
      console.error("Save failed:", error);
      // Revert on error
      setArtists((prev) =>
        prev.map((a) =>
          a.id === artistId ? { ...a, [fieldKey]: currentStatus } : a
        )
      );
    }

    setSavingKey(null);
  }

  return (
    <TeamLayout title="Funnel Health">
      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : artists.length === 0 ? (
        <div className="text-sm text-gray-600">No active artists found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {artists.map((artist) => (
            <FunnelCard
              key={artist.id}
              artist={artist}
              onCycle={cycleStatus}
              savingKey={savingKey}
            />
          ))}
        </div>
      )}
    </TeamLayout>
  );
}
