"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

/**
 * Admin page for las_aguas role:
 * - Create/edit/delete artist_notifications
 * - Edit artist_insight_notes per section
 *
 * RLS: only las_aguas can manage these tables (per your migration).
 */

function Panel({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function ArtistNotificationsAdmin() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [artists, setArtists] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");

  // notifications
  const [notifText, setNotifText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notifRows, setNotifRows] = useState([]);

  // insight notes
  const [notesRows, setNotesRows] = useState([]);
  const [notesDraft, setNotesDraft] = useState({});

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be logged in.");

        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (pErr) throw pErr;
        if (profile?.role !== "las_aguas") {
          throw new Error("You do not have access to this page.");
        }

        const { data: artistsData, error: aErr } = await supabase
          .from("artists")
          .select("id, name")
          .order("name", { ascending: true });

        if (aErr) throw aErr;

        setArtists(artistsData || []);
        if ((artistsData || [])[0]) setSelectedArtistId(String(artistsData[0].id));
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const loadArtistData = async () => {
      if (!selectedArtistId) return;
      const aid = Number(selectedArtistId);

      const [{ data: notifs, error: nErr }, { data: notes, error: notesErr }] = await Promise.all([
        supabase
          .from("artist_notifications")
          .select("*")
          .eq("artist_id", aid)
          .order("start_date", { ascending: false }),
        supabase
          .from("artist_insight_notes")
          .select("*")
          .eq("artist_id", aid)
          .order("section", { ascending: true }),
      ]);

      if (nErr) console.error(nErr);
      if (!nErr) setNotifRows(notifs || []);

      if (notesErr) console.error(notesErr);
      if (!notesErr) {
        setNotesRows(notes || []);
        const draft = {};
        (notes || []).forEach((r) => (draft[r.section] = r.note || ""));
        setNotesDraft(draft);
      }
    };

    loadArtistData();
  }, [selectedArtistId]);

  async function addNotification() {
    const aid = Number(selectedArtistId);
    if (!aid) return alert("Select an artist.");
    if (!notifText.trim()) return alert("Write a notification.");
    if (!startDate || !endDate) return alert("Pick start + end date.");

    const { data, error } = await supabase
      .from("artist_notifications")
      .insert({
        artist_id: aid,
        notification: notifText.trim(),
        start_date: startDate,
        end_date: endDate,
      })
      .select("*")
      .single();

    if (error) return alert(error.message);
    setNotifRows((prev) => [data, ...(prev || [])]);
    setNotifText("");
  }

  async function deleteNotification(id) {
    const { error } = await supabase.from("artist_notifications").delete().eq("id", id);
    if (error) return alert(error.message);
    setNotifRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function upsertNote(section) {
    const aid = Number(selectedArtistId);
    const note = notesDraft?.[section] || "";

    const existing = notesRows.find((r) => r.section === section);
    if (existing) {
      const { data, error } = await supabase
        .from("artist_insight_notes")
        .update({ note, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) return alert(error.message);
      setNotesRows((prev) => prev.map((r) => (r.id === existing.id ? data : r)));
      return;
    }

    const { data, error } = await supabase
      .from("artist_insight_notes")
      .insert({ artist_id: aid, section, note })
      .select("*")
      .single();

    if (error) return alert(error.message);
    setNotesRows((prev) => [...prev, data]);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-semibold">Artist notifications (las_aguas)</h1>
          <Link href="/dashboard" className="text-sm rounded-xl px-3 py-2 bg-black/5 hover:bg-black/10">
            back
          </Link>
        </div>

        {err && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (
          <div className="space-y-4">
            <Panel title="Select artist">
              <select
                value={selectedArtistId}
                onChange={(e) => setSelectedArtistId(e.target.value)}
                className="rounded-xl border border-gray-200 p-2 text-sm"
              >
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || `Artist ${a.id}`}
                  </option>
                ))}
              </select>
            </Panel>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Panel title="Notifications queue">
                <div className="space-y-2 mb-3">
                  <textarea
                    value={notifText}
                    onChange={(e) => setNotifText(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm"
                    placeholder="Notification text…"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-xl border border-gray-200 p-2 text-sm"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-xl border border-gray-200 p-2 text-sm"
                    />
                  </div>
                  <button onClick={addNotification} className="rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10">
                    add notification
                  </button>
                </div>

                <div className="space-y-2">
                  {notifRows.map((n) => (
                    <div key={n.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <div className="text-xs text-gray-500">{n.start_date} → {n.end_date}</div>
                      <div className="text-sm whitespace-pre-wrap">{n.notification}</div>
                      <button onClick={() => deleteNotification(n.id)} className="mt-2 text-xs underline text-red-600">
                        delete
                      </button>
                    </div>
                  ))}
                  {notifRows.length === 0 && <div className="text-sm text-gray-600">No notifications.</div>}
                </div>
              </Panel>

              <Panel title="Insights notes (per section)">
                <div className="space-y-3">
                  {["best_performers", "worst_performers", "most_comments", "profile_stats"].map((section) => (
                    <div key={section} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <div className="text-xs font-semibold mb-2">{section}</div>
                      <textarea
                        value={notesDraft?.[section] || ""}
                        onChange={(e) => setNotesDraft((p) => ({ ...(p || {}), [section]: e.target.value }))}
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 p-2 text-sm"
                        placeholder="Write notes shown to the artist under this section…"
                      />
                      <button
                        onClick={() => upsertNote(section)}
                        className="mt-2 rounded-xl px-3 py-2 text-sm bg-black/5 hover:bg-black/10"
                      >
                        save notes
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
