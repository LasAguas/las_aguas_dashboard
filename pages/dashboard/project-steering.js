"use client";

import { useEffect, useRef, useState } from "react";
import ArtistLayout from "../../components/team/TeamLayout";
import { supabase } from "../../lib/supabaseClient";

const FIELDS = [
  { key: "steering_audience_avatar", label: "Audience Avatar" },
  { key: "steering_long_term_goals", label: "Long-term Goals (6–12 months)" },
  { key: "steering_current_focus", label: "Current Focus" },
  { key: "steering_active_services", label: "Active Services" },
  { key: "steering_communication_rules", label: "Communication Rules" },
  { key: "steering_current_bottlenecks", label: "Current Bottlenecks" },
];

function EditablePanel({ title, value, onSave }) {
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const dirty = draft !== (value || "");
  const textareaRef = useRef(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  // Sync draft when artist changes
  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  // Auto-resize whenever draft changes
  useEffect(() => {
    autoResize();
  }, [draft]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="artist-panel p-4">
      <h2 className="text-sm font-semibold mb-2">{title}</h2>
      <textarea
        ref={textareaRef}
        className="w-full rounded-lg border border-gray-300 bg-white text-xs p-2 leading-relaxed focus:ring-2 focus:ring-[#33296b]/20 focus:border-[#33296b]/40 min-h-[80px] resize-none overflow-hidden"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type here…"
      />
      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 px-3 py-1.5 rounded-lg text-xs bg-[#33296b] text-white font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}

export default function ProjectSteeringPage() {
  const [artistOptions, setArtistOptions] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [artist, setArtist] = useState(null);
  const [loadingArtist, setLoadingArtist] = useState(false);
  const [moodboardUrl, setMoodboardUrl] = useState("");

  // Load artist list for dropdown
  useEffect(() => {
    async function loadArtists() {
      try {
        const { data, error } = await supabase
          .from("artists")
          .select("id, name")
          .not("id", "in", "(1, 2, 3)")
          .eq("active_client", true)
          .order("name", { ascending: true });

        if (error) {
          console.error("Supabase error (artists):", error);
          return;
        }
        setArtistOptions(data || []);
        if (data && data.length) {
          setSelectedArtistId(String(data[0].id));
        }
      } catch (e) {
        console.error("Failed to load artists list", e);
      }
    }
    loadArtists();
  }, []);

  // Load steering data whenever selected artist changes
  useEffect(() => {
    async function loadSteering() {
      if (!selectedArtistId) return;
      try {
        setLoadingArtist(true);
        const id = Number(selectedArtistId);

        // Try with steering columns first; fall back to basic columns if they don't exist yet
        let data, error;
        ({ data, error } = await supabase
          .from("artists")
          .select(
            [
              "id",
              "name",
              "moodboard_pdf_path",
              ...FIELDS.map((f) => f.key),
            ].join(",")
          )
          .eq("id", id)
          .single());

        if (error) {
          // Steering columns may not exist yet — retry without them
          console.warn("Steering columns query failed, retrying basic:", error.message);
          ({ data, error } = await supabase
            .from("artists")
            .select("id, name, moodboard_pdf_path")
            .eq("id", id)
            .single());
          if (error) throw error;
        }

        setArtist(data);

        if (data?.moodboard_pdf_path?.trim()) {
          const { data: urlData } = supabase.storage
            .from("artist-onboarding")
            .getPublicUrl(data.moodboard_pdf_path.trim());
          setMoodboardUrl(urlData?.publicUrl || "");
        } else {
          setMoodboardUrl("");
        }
      } catch (err) {
        console.error("Failed to load project steering data:", err);
        setArtist(null);
        setMoodboardUrl("");
      } finally {
        setLoadingArtist(false);
      }
    }
    loadSteering();
  }, [selectedArtistId]);

  async function saveField(fieldKey, value) {
    if (!artist) return;
    const { error } = await supabase
      .from("artists")
      .update({ [fieldKey]: value })
      .eq("id", artist.id);

    if (error) {
      console.error("Save failed:", error);
      alert("Failed to save. Please try again.");
      return;
    }
    // Update local state so dirty flag clears
    setArtist((prev) => ({ ...prev, [fieldKey]: value }));
  }

  return (
    <ArtistLayout title="Project Steering">
      {/* Artist picker */}
      <div className="artist-panel mb-4 p-3 flex flex-wrap items-center gap-3">
        <div className="text-sm font-semibold text-[#33296b]">Artist</div>
        <select
          className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
          value={selectedArtistId}
          onChange={(e) => setSelectedArtistId(e.target.value)}
        >
          <option value="">Select an artist…</option>
          {artistOptions.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {a.name || `Artist ${a.id}`}
            </option>
          ))}
        </select>
      </div>

      {!selectedArtistId ? (
        <div className="text-sm text-gray-600">Select an artist above.</div>
      ) : loadingArtist ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : !artist ? (
        <div className="text-sm text-gray-600">Could not load artist data.</div>
      ) : (
        <>
          {/* Mood Board — full width */}
          <div className="artist-panel p-4 mb-4">
            <h2 className="text-sm font-semibold mb-2">Mood Board</h2>
            {moodboardUrl ? (
              <div className="flex flex-col gap-2">
                <iframe
                  src={moodboardUrl}
                  className="w-full rounded-lg border border-gray-200"
                  style={{ height: "450px" }}
                  title="Mood board PDF"
                />
                <a
                  href={moodboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline"
                >
                  Open full mood board
                </a>
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic">
                No mood board uploaded yet.
              </div>
            )}
          </div>

          {/* Three-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1 */}
            <div className="flex flex-col gap-4">
              <EditablePanel
                title="Audience Avatar"
                value={artist.steering_audience_avatar}
                onSave={(v) => saveField("steering_audience_avatar", v)}
              />
              <EditablePanel
                title="Long-term Goals (6–12 months)"
                value={artist.steering_long_term_goals}
                onSave={(v) => saveField("steering_long_term_goals", v)}
              />
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-4">
              <EditablePanel
                title="Current Focus"
                value={artist.steering_current_focus}
                onSave={(v) => saveField("steering_current_focus", v)}
              />
              <EditablePanel
                title="Active Services"
                value={artist.steering_active_services}
                onSave={(v) => saveField("steering_active_services", v)}
              />
            </div>

            {/* Column 3 */}
            <div className="flex flex-col gap-4">
              <EditablePanel
                title="Communication Rules"
                value={artist.steering_communication_rules}
                onSave={(v) => saveField("steering_communication_rules", v)}
              />
              <EditablePanel
                title="Current Bottlenecks"
                value={artist.steering_current_bottlenecks}
                onSave={(v) => saveField("steering_current_bottlenecks", v)}
              />
            </div>
          </div>
        </>
      )}
    </ArtistLayout>
  );
}
