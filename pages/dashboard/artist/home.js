"use client";

import { useEffect, useMemo, useState } from "react";
import ArtistLayout from "../../../components/artist/ArtistLayout";
import { getMyArtistContext } from "../../../components/artist/artistData";
import { supabase } from "../../../lib/supabaseClient";

/** -------- helpers -------- */
const pad2 = (n) => String(n).padStart(2, "0");
function formatDDMMYY(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return String(dateLike);
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

/**
 * Robust "is active now" check.
 * Handles date-only strings, timestamps, and null end_date.
 */
function isActiveNow(start_date, end_date, now = new Date()) {
  const s = start_date ? new Date(start_date) : null;
  if (!s || Number.isNaN(s.getTime())) return false;

  // If start_date is date-only (YYYY-MM-DD), treat as start of day.
  // JS Date("YYYY-MM-DD") is UTC-midnight; we still keep it consistent by comparing Date objects.
  const e = end_date ? new Date(end_date) : null;
  const startOK = s.getTime() <= now.getTime();
  const endOK = !e || Number.isNaN(e.getTime()) ? true : e.getTime() >= now.getTime();
  return startOK && endOK;
}

function Panel({ title, children }) {
  return (
    <div className="artist-panel p-4 md:p-5">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

/** -------- media modal (opened ONLY when clicking a variation) -------- */
function VariationMediaModal({ variation, onClose }) {
    const [publicUrl, setPublicUrl] = useState("");
    const [feedback, setFeedback] = useState("");
    const [savingFeedback, setSavingFeedback] = useState(false);
    const [savingGreenlight, setSavingGreenlight] = useState(false);
  
    const filePath = variation?.file_name || "";
  
    // Load public URL
    useEffect(() => {
      if (!variation?.file_name) return;
      const { data } = supabase.storage
        .from("post-variations")
        .getPublicUrl(variation.file_name);
      setPublicUrl(data?.publicUrl || "");
    }, [variation?.id]);
  
    // Sync local feedback with variation
    useEffect(() => {
      setFeedback(variation?.feedback || "");
    }, [variation?.id, variation?.feedback]);
  
    const ext = (filePath.split(".").pop() || "").toLowerCase();
    const isVideo = ["mp4", "mov", "webm", "m4v"].includes(ext);
    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  
    async function handleSaveFeedback() {
      if (!variation?.id) return;
      try {
        setSavingFeedback(true);
        const { error } = await supabase
          .from("postvariations")
          .update({ feedback })
          .eq("id", variation.id);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to save feedback", err);
        alert("Failed to save feedback. See console for details.");
      } finally {
        setSavingFeedback(false);
      }
    }
  
    async function handleGreenlight() {
      if (!variation?.id) return;
      try {
        setSavingGreenlight(true);
        const { error } = await supabase
          .from("postvariations")
          .update({ greenlight: true })
          .eq("id", variation.id);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to greenlight variation", err);
        alert("Failed to greenlight variation. See console for details.");
      } finally {
        setSavingGreenlight(false);
      }
    }
  
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" onClick={onClose}>
        <div
            className="artist-panel rounded-2xl shadow-lg w-[92vw] max-w-4xl max-h-[90vh] overflow-auto p-4 md:p-6 relative"
            onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-semibold text-[#33296b]">
                {variation?.test_version ? `Variation ${variation.test_version}` : "Variation"}
              </div>
              <div className="text-xs text-gray-600">
                {variation?.platforms?.length ? variation.platforms.join(", ") : "No platforms"}{" "}
                {variation?.length_seconds ? `• ${variation.length_seconds}s` : ""}
                {variation?.greenlight ? " • ✅ greenlit" : ""}
              </div>
            </div>
  
            <button
              className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
              onClick={onClose}
            >
              Close
            </button>
          </div>
  
          {/* Media */}
          <div className="rounded-xl bg-[#eef9ea] p-3 border border-gray-200 mb-4">
            {!publicUrl ? (
              <div className="text-sm text-gray-600">Loading media…</div>
            ) : isVideo ? (
              <video src={publicUrl} controls className="w-full rounded-lg" />
            ) : isImage ? (
              <img src={publicUrl} alt="variation" className="w-full rounded-lg" />
            ) : (
              <div className="text-sm text-gray-700">
                Unsupported file type.{" "}
                <a className="underline" href={publicUrl} target="_blank" rel="noreferrer">
                  Open file
                </a>
              </div>
            )}
          </div>
  
          {/* Feedback + greenlight controls */}
          <div className="rounded-xl bg-[#eef9ea] p-3 border border-gray-200">
            <div className="text-sm font-semibold text-[#33296b] mb-2">Feedback</div>
            <textarea
              className="w-full border rounded-md p-2 text-xs resize-vertical"
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write your feedback for this variation…"
            />
            <div className="mt-3 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={handleSaveFeedback}
                disabled={savingFeedback}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#e6e7eb] text-[#33296b] hover:opacity-90 disabled:opacity-60"
              >
                {savingFeedback ? "Saving…" : "Save feedback"}
              </button>
              <button
                type="button"
                onClick={handleGreenlight}
                disabled={savingGreenlight}
                className="px-3 py-1.5 text-xs rounded-lg text-[#33296b] hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#bce1ac" }}
              >
                {savingGreenlight ? "Greenlighting…" : "Greenlight"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  

/** -------- post details modal (NO media at top) -------- */
function PostDetailsModal({ postId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [post, setPost] = useState(null);
  const [variations, setVariations] = useState([]);

  const [mediaVar, setMediaVar] = useState(null);

  useEffect(() => {
    if (!postId) return;
    const run = async () => {
      try {
        setLoading(true);
        setErr("");

        const { data: postRow, error: postErr } = await supabase
          .from("posts")
          .select("id, post_name, post_date, status, caption_a, caption_b, notes, song")
          .eq("id", postId)
          .single();

        if (postErr) throw postErr;
        setPost(postRow);

        const { data: vars, error: varsErr } = await supabase
          .from("postvariations")
          .select("id, post_id, file_name, test_version, platforms, length_seconds, greenlight, feedback, feedback_resolved")
          .eq("post_id", postId)
          .order("test_version", { ascending: true });

        if (varsErr) throw varsErr;
        setVariations(vars || []);
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load post details.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [postId]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" onClick={onClose}>
        <div
          className="artist-panel rounded-2xl shadow-lg w-[92vw] max-w-4xl max-h-[90vh] overflow-auto p-4 md:p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
                <div className="text-lg font-bold text-[#33296b]">Post Details</div>
                <div className="text-sm text-[#33296b]">
                {post?.post_name || "Post"}
                {post?.post_date && (
                    <>
                    {" "}
                    • {formatDDMMYY(post.post_date)}
                    </>
                )}
                </div>
            </div>

            <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
            >
                Close
            </button>
            </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : err ? (
            <div className="text-sm text-red-700">{err}</div>
          ) : (
            <>
              <div className="artist-secondary-panel p-3 rounded-xl mb-4">

                {post?.notes ? (
                  <div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">
                    <span className="font-semibold">Notes:</span> {post.notes}
                  </div>
                ) : null}

                {(() => {
                const hasA = !!(post?.caption_a && post.caption_a.trim());
                const hasB = !!(post?.caption_b && post.caption_b.trim());

                if (!hasA && !hasB) return null;

                return (
                    <div className="mt-3 max-w-xl w-full">
                    <div className="space-y-2">
                        {hasA && (
                        <div className="p-3 rounded-xl artist-card">
                            <div className="text-xs font-semibold text-[#33296b] mb-1">
                            Caption A
                            </div>
                            <div className="text-xs text-gray-700 whitespace-pre-wrap">
                            {post.caption_a}
                            </div>
                        </div>
                        )}
                        {hasB && (
                        <div className="p-3 rounded-xl artist-card">
                            <div className="text-xs font-semibold text-[#33296b] mb-1">
                            Caption B
                            </div>
                            <div className="text-xs text-gray-700 whitespace-pre-wrap">
                            {post.caption_b}
                            </div>
                        </div>
                        )}
                    </div>
                    </div>
                );
                })()}



              </div>

              <div>
                <div className="text-sm font-semibold text-[#33296b] mb-2">Variations</div>
                {variations.length === 0 ? (
                    <div className="text-sm text-gray-600">No variations yet.</div>
                ) : (
                    <div className="max-w-xl w-full">
                    <ul className="space-y-2">
                        {variations.map((v) => (
                        <button
                            key={v.id}
                            type="button"
                            className="w-full text-left p-3 rounded-xl artist-card flex items-start justify-between gap-3 disabled:opacity-60"
                            onClick={() => v.file_name && setMediaVar(v)}
                            disabled={!v.file_name}
                        >
                            <div className="min-w-0">
                            <div className="text-sm font-medium text-[#33296b] truncate">
                                {v.test_version ? `Variation ${v.test_version}` : `Variation ${v.id}`}
                            </div>
                            <div className="text-xs text-gray-600">
                                {Array.isArray(v.platforms) && v.platforms.length
                                ? v.platforms.join(", ")
                                : "No platforms"}
                                {v.length_seconds ? ` • ${v.length_seconds}s` : ""}
                                {v.greenlight ? " • ✅ greenlit" : ""}
                            </div>
                            </div>

                            <div className="text-xs text-gray-500 whitespace-nowrap">
                            {v.file_name ? "Tap to open" : "No media"}
                            </div>
                        </button>
                        ))}
                    </ul>
                    </div>
                )}
                </div>

            </>
          )}
        </div>
      </div>

      {mediaVar && (
        <VariationMediaModal
          variation={mediaVar}
          onClose={() => setMediaVar(null)}
        />
      )}
    </>
  );
}

/** -------- main page -------- */
export default function ArtistHomePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [readyPosts, setReadyPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [selectedPostId, setSelectedPostId] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");

        const { artistId } = await getMyArtistContext();

        const todayYMD = new Date().toISOString().slice(0, 10);

        // Upcoming ready posts
        const { data: posts, error: postsErr } = await supabase
          .from("posts")
          .select("id, artist_id, post_name, post_date, status, caption_a, caption_b, notes, song")
          .eq("artist_id", artistId)
          .eq("status", "ready")
          .gte("post_date", todayYMD)
          .order("post_date", { ascending: true })
          .limit(25);

        if (postsErr) throw postsErr;
        setReadyPosts(posts || []);

        // Notifications (filter client-side using robust parsing)
        const { data: notifs, error: notifErr } = await supabase
          .from("artist_notifications")
          .select("id, artist_id, notification, start_date, end_date")
          .eq("artist_id", artistId)
          .order("start_date", { ascending: false })
          .limit(100);

        if (notifErr) throw notifErr;

        const now = new Date();
        const active = (notifs || []).filter((n) => isActiveNow(n.start_date, n.end_date, now));
        setNotifications(active);

        // Preload upcoming-content cache (unchanged behavior)
        const postIds = (posts || []).map((p) => p.id);
        if (postIds.length) {
          const { data: vars, error: varsErr } = await supabase
            .from("postvariations")
            .select("id, post_id, file_name, test_version, platforms, length_seconds, greenlight, feedback, feedback_resolved")
            .in("post_id", postIds)
            .not("file_name", "is", null);

          if (!varsErr) {
            sessionStorage.setItem(
              "artistUpcomingCache",
              JSON.stringify({
                ts: Date.now(),
                posts: posts || [],
                variations: vars || [],
              })
            );
          }
        }
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const readyNeedingAction = useMemo(() => readyPosts, [readyPosts]);

  return (
    <ArtistLayout title="Home" forceDesktopOpen>
      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm artist-muted">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel title="Upcoming posts (ready) — need feedback / greenlight">
            {readyNeedingAction.length === 0 ? (
              <div className="text-sm text-gray-600">No upcoming ready posts.</div>
            ) : (
              <div className="space-y-3">
                {readyNeedingAction.map((p) => (
                <div
                    key={p.id}
                    className="w-full p-3 rounded-xl artist-panel-secondary hover:opacity-95"
                >
                    <div className="flex items-start justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setSelectedPostId(p.id)}
                        className="text-left w-full min-w-0"
                    >
                        <div className="text-sm font-medium text-[#33296b] truncate">
                        {p.post_name || `Post ${p.id}`}
                        </div>
                        <div className="text-xs text-gray-700">
                        {p.post_date ? formatDDMMYY(p.post_date) : ""} {p.song ? `• ${p.song}` : ""}
                        </div>
                        {p.notes ? (
                        <div className="mt-1 text-xs text-gray-700 line-clamp-2 whitespace-pre-wrap">
                            {p.notes}
                        </div>
                        ) : null}
                    </button>

                    <button
                        type="button"
                        onClick={async (e) => {
                        e.stopPropagation();
                        try {
                            const { error } = await supabase
                            .from("postvariations")
                            .update({ greenlight: true })
                            .eq("post_id", p.id);

                            if (error) throw error;
                        } catch (err) {
                            console.error("Failed to greenlight post", err);
                            alert("Failed to greenlight this post. See console for details.");
                        }
                        }}
                        className="px-2 py-1 text-[11px] rounded-lg shrink-0"
                        style={{ backgroundColor: "#bce1ac", color: "#33296b" }}
                    >
                        Greenlight
                    </button>
                    </div>
                </div>
                ))}


              </div>
            )}
          </Panel>

          <Panel title="Notifications">
            {notifications.length === 0 ? (
              <div className="text-sm text-gray-600">No notifications right now.</div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl artist-panel-secondary">
                    {/* show START DATE only (no end date), dd-mm-yy */}
                    <div className="text-xs text-gray-700 mb-1">
                      {n.start_date ? formatDDMMYY(n.start_date) : ""}
                    </div>
                    <div className="text-sm text-[#33296b] whitespace-pre-wrap">
                      {n.notification}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {selectedPostId && (
        <PostDetailsModal postId={selectedPostId} onClose={() => setSelectedPostId(null)} />
      )}
    </ArtistLayout>
  );
}
