"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ArtistLayout from "../../../components/artist/ArtistLayout";
import { getMyArtistContext } from "../../../components/artist/artistData";
import { supabase } from "../../../lib/supabaseClient";

/** ---------- helpers ---------- */

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

function publicVariationUrl(fileName) {
  if (!fileName) return "";
  const { data } = supabase.storage.from("post-variations").getPublicUrl(fileName);
  return data?.publicUrl || "";
}

/** ---------- mute/unmute icon (2D SVG) ---------- */

function VolumeIcon({ muted }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path
        d="M4 9v6h4l5 4V5L8 9H4z"
        fill="white"
      />
      {!muted && (
        <path
          d="M15 9.5c1 .5 1.5 1.5 1.5 2.5s-.5 2-1.5 2.5"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {muted && (
        <path
          d="M17 8l4 4m0-4l-4 4"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/** ---------- media player modal (with feedback + greenlight) ---------- */

function VariationMediaModal({ variation, onClose }) {
  const [publicUrl, setPublicUrl] = useState("");
  const [feedback, setFeedback] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [savingGreenlight, setSavingGreenlight] = useState(false);

  const filePath = variation?.file_name || "";

  useEffect(() => {
    if (!variation?.file_name) return;
    const { data } = supabase.storage
      .from("post-variations")
      .getPublicUrl(variation.file_name);
    setPublicUrl(data?.publicUrl || "");
  }, [variation?.id]);

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

  if (!variation) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-[92vw] max-w-3xl max-h-[90vh] overflow-auto p-4 md:p-5 relative"
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
              className="px-3 py-1.5 text-xs rounded-lg bg-[#a89ee4] text-[#33296b] hover:opacity-90 disabled:opacity-60"
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

/** ---------- Info panels (mobile + desktop) ---------- */

function VariationsList({ variations, onOpenVariation }) {
  if (!variations?.length) {
    return <div className="text-sm text-gray-600">No variations yet.</div>;
  }

  return (
    <div className="space-y-2">
      {variations.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => v.file_name && onOpenVariation(v)}
          disabled={!v.file_name}
          className="w-full text-left artist-panel-secondary p-3 rounded-xl flex items-start justify-between gap-3 disabled:opacity-60"
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
            {v.feedback && (
              <div className="mt-1 text-xs text-gray-700 line-clamp-2 whitespace-pre-wrap">
                {v.feedback}
              </div>
            )}
          </div>
          <div className="text-[11px] text-gray-500 whitespace-nowrap">
            {v.file_name ? "Tap to play" : "No media"}
          </div>
        </button>
      ))}
    </div>
  );
}

function InfoPanel({ post, variations, onOpenVariation, onCaptionSaved }) {
  const [tempCaption, setTempCaption] = useState("");
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [savingCaption, setSavingCaption] = useState(false);
  
  useEffect(() => {
    // keep local draft in sync when selecting a different post
    const c = (post?.caption_a || post?.caption_b || "").trim();
    setTempCaption(c);
    setIsEditingCaption(false);
  }, [post?.id, post?.caption_a, post?.caption_b]);
  

  if (!post) {
    return (
      <div className="artist-panel p-4 md:p-5">
        <div className="text-sm text-gray-600">No post selected.</div>
      </div>
    );
  }

  const caption = (post.caption_a || post.caption_b || "").trim();

  return (
    <div className="artist-panel p-4 md:p-5">
      <div className="text-sm font-semibold text-[#33296b] mb-1">
        {post.post_name || "Post"}
      </div>
      <div className="text-xs text-gray-700 mb-2">
        {post.post_date ? formatDDMMYY(post.post_date) : "—"}
        {post.song ? ` • ${post.song}` : ""}
      </div>

      <div className="artist-panel-secondary p-3 rounded-xl mb-3 text-xs text-gray-700 whitespace-pre-wrap">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-[#33296b]">Caption</span>

          {!isEditingCaption ? (
            <button
              type="button"
              onClick={() => setIsEditingCaption(true)}
              className="px-3 py-1.5 text-xs rounded hover:opacity-90"
              style={{ backgroundColor: "#bbe1ac" }}
            >
              Edit
            </button>
          ) : null}
        </div>

        {isEditingCaption ? (
          <>
            <textarea
              value={tempCaption}
              onChange={(e) => setTempCaption(e.target.value)}
              className="w-full p-2 border rounded text-xs bg-white"
              rows={4}
              placeholder="Write a caption…"
            />

            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  const c = (post?.caption_a || post?.caption_b || "").trim();
                  setTempCaption(c);
                  setIsEditingCaption(false);
                }}
                className="px-3 py-1.5 text-xs bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={savingCaption}
                onClick={async () => {
                  try {
                    setSavingCaption(true);

                    const { error } = await supabase
                      .from("posts")
                      .update({ caption_a: tempCaption })
                      .eq("id", post.id);

                    if (error) throw error;

                    // keep UI in sync immediately
                    if (typeof onCaptionSaved === "function") onCaptionSaved(tempCaption);
                    setIsEditingCaption(false);
                  } catch (err) {
                    console.error("Error saving caption:", err);
                    alert("Failed to save caption.");
                  } finally {
                    setSavingCaption(false);
                  }
                }}
                className="px-3 py-1.5 text-xs rounded hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#bbe1ac" }}
              >
                {savingCaption ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </>
        ) : (
          <div className="min-h-[3rem] whitespace-pre-wrap break-words">
            {tempCaption?.trim() ? (
              tempCaption
            ) : (
              <span className="text-gray-400">No caption</span>
            )}
          </div>
        )}
      </div>


      {post.notes && (
        <div className="artist-panel-secondary p-3 rounded-xl mb-3 text-xs text-gray-700 whitespace-pre-wrap">
          <span className="font-semibold text-[#33296b]">Notes: </span>
          {post.notes}
        </div>
      )}

      <div className="text-sm font-semibold text-[#33296b] mb-2">Variations</div>
      <VariationsList variations={variations} onOpenVariation={onOpenVariation} />
    </div>
  );
}

function MobileInfoSheet({
  open,
  post,
  variations,
  onClose,
  onOpenVariation,
  onCaptionSaved,
}) {
  if (!open || !post) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center md:hidden"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative w-full max-w-xl artist-card rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-[#33296b]">Post info</div>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-md bg-black/5 hover:bg-black/10"
          >
            Close
          </button>
        </div>

        <InfoPanel
          post={post}
          variations={variations}
          onOpenVariation={onOpenVariation}
          onCaptionSaved={onCaptionSaved}
        />
      </div>
    </div>
  );
}

/** ---------- Vertical post feed item ---------- */

function PostFeedItem({
  post,
  variations,
  isActive,
  muted,
  captionExpanded,
  onToggleCaption,
  onToggleMute,
  onOpenInfo,
  onOpenFeedback,
  onGreenlightPost,
}) {
  const primaryVariation = variations?.find((v) => v.file_name) || null;
  const mediaUrl = primaryVariation ? publicVariationUrl(primaryVariation.file_name) : "";
  const filePath = primaryVariation?.file_name || "";
  const ext = (filePath.split(".").pop() || "").toLowerCase();
  const isVideo = ["mp4", "mov", "webm", "m4v"].includes(ext);
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);

  const videoRef = useRef(null);

  const captionText = (post.caption_a || post.caption_b || "No caption yet").trim();

  // Autoplay/pause when active changes
  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, isVideo]);

  const handleVideoClick = () => {
    if (!videoRef.current || !isVideo) return;
    const v = videoRef.current;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <div
        className="relative bg-black flex items-center justify-center rounded-2xl overflow-hidden w-full max-w-[520px]"
        style={{
          //height: "90vh",
          //maxHeight: "90vh",
          aspectRatio: "9 / 16",
          //width: "100%",
          //maxWidth: "520px",
        }}
      >
        {/* Media (letterboxed with dark bars when aspect doesn't match) */}
        {mediaUrl ? (
          isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-auto cursor-pointer"
              autoPlay={isActive}
              loop
              playsInline
              muted={muted}
              onClick={handleVideoClick}
            />
          ) : isImage ? (
            <img
              src={mediaUrl}
              alt={post.post_name || "Post media"}
              className="w-full h-auto"
            />
          ) : (
            <div className="text-sm text-white">Unsupported media type.</div>
          )
        ) : (
          <div className="text-sm text-white">No media attached yet.</div>
        )}

        {/* Dark overlay gradient at bottom for text/buttons */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Info button (top-left) */}
        <button
          type="button"
          onClick={onOpenInfo}
          className="absolute top-3 left-3 z-10 rounded-full w-8 h-8 flex items-center justify-center bg-black/60 text-white text-sm"
        >
          i
        </button>

        {/* Mute/unmute (top-right) */}
        <button
          type="button"
          onClick={onToggleMute}
          className="absolute top-3 right-3 z-10 rounded-full w-8 h-8 flex items-center justify-center bg-black/60 text-white"
        >
          <VolumeIcon muted={muted} />
        </button>

        {/* Bottom caption + buttons */}
        <div className="absolute inset-x-0 bottom-3 z-10 px-4 flex flex-col gap-2">
          <div
            className={
              "text-xs text-white mb-1 text-left cursor-pointer " +
              (captionExpanded
                ? "max-w-[60%] max-h-[50vh] overflow-y-auto"
                : "max-w-[60%] line-clamp-2")
            }
            onClick={onToggleCaption}
          >
            {captionText}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenFeedback}
              className="flex-1 rounded-full px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: "#a89ee4", color: "#33296b" }}
            >
              Write feedback
            </button>
            <button
              type="button"
              onClick={onGreenlightPost}
              className="flex-1 rounded-full px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: "#bce1ac", color: "#33296b" }}
            >
              Greenlight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- Main page ---------- */

export default function UpcomingContentPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [posts, setPosts] = useState([]);
  const [variationsByPostId, setVariationsByPostId] = useState(new Map());

  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false); // false = sound ON
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);
  const [mediaVar, setMediaVar] = useState(null);

  const itemRefs = useRef([]);

  // Reset caption expansion when changing post
  useEffect(() => {
    setCaptionExpanded(false);
  }, [activeIndex]);

  // Load data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const { artistId } = await getMyArtistContext();
        const todayYMD = new Date().toISOString().slice(0, 10);

        // 1) Posts must be status 'ready' and in the future
        const { data: postsData, error: postsErr } = await supabase
          .from("posts")
          .select(
            "id, artist_id, post_name, post_date, status, caption_a, caption_b, notes, song"
          )
          .eq("artist_id", artistId)
          .eq("status", "ready") // <- unchanged, only reading 'ready' posts
          .gte("post_date", todayYMD)
          .order("post_date", { ascending: true })
          .limit(100);

        if (postsErr) throw postsErr;

        const postIds = (postsData || []).map((p) => p.id);
        let varRows = [];

        // 2) Load variations for these posts
        if (postIds.length) {
          const { data: vars, error: varsErr } = await supabase
            .from("postvariations")
            .select(
              "id, post_id, file_name, test_version, platforms, length_seconds, greenlight, feedback, feedback_resolved"
            )
            .in("post_id", postIds)
            .order("post_id", { ascending: true })
            .order("test_version", { ascending: true });

          if (varsErr) throw varsErr;
          varRows = vars || [];
        }

        // 3) Build a full map of variations by post_id
        const fullMap = new Map();
        varRows.forEach((v) => {
          if (!fullMap.has(v.post_id)) fullMap.set(v.post_id, []);
          fullMap.get(v.post_id).push(v);
        });

        // 4) Filter posts to those that still need review:
        //    - must have at least one variation
        //    - no variation has feedback
        //    - no variation is greenlit
        const filteredPosts = (postsData || []).filter((p) => {
          const vars = fullMap.get(p.id) || [];
          if (!vars.length) return false;

          const hasGreenlight = vars.some((v) => v.greenlight === true);
          const hasFeedback = vars.some(
            (v) => v.feedback && v.feedback.trim() !== ""
          );

          return !hasGreenlight && !hasFeedback;
        });

        // 5) Keep only variations for those filtered posts
        const filteredMap = new Map();
        filteredPosts.forEach((p) => {
          const vars = fullMap.get(p.id) || [];
          filteredMap.set(p.id, vars);
        });

        setPosts(filteredPosts);
        setVariationsByPostId(filteredMap);
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load upcoming content.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // scroll-snap + active index detection
  useEffect(() => {
    const nodes = itemRefs.current;
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = activeIndex;
        let bestRatio = 0;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number(entry.target.dataset.index);
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = idx;
          }
        });

        if (bestRatio > 0.5 && bestIndex !== activeIndex) {
          setActiveIndex(bestIndex);
        }
      },
      {
        root: null,
        threshold: [0.4, 0.6, 0.8],
      }
    );

    nodes.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      nodes.forEach((el) => {
        if (el) observer.unobserve(el);
      });
      observer.disconnect();
    };
  }, [posts.length, activeIndex]);

  const activePost = posts[activeIndex] || null;
  const activeVariations = activePost
    ? variationsByPostId.get(activePost.id) || []
    : [];

  async function handleGreenlightPost(postId) {
    try {
      const { error } = await supabase
        .from("postvariations")
        .update({ greenlight: true })
        .eq("post_id", postId);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to greenlight post", err);
      alert("Failed to greenlight this post. See console for details.");
    }
  }

  function openVariationModal(v) {
    if (!v) return;
    setMuted(true); // mute background when modal opens
    setMediaVar(v);
  }

  function openFirstVariation(postId) {
    const vars = variationsByPostId.get(postId) || [];
    const v = vars.find((x) => x.file_name) || vars[0];
    if (v) openVariationModal(v);
  }

  return (
    <ArtistLayout title="Upcoming content">
      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm artist-muted">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="text-sm artist-muted">
          Congrats, all your upcoming posts have been reviewed – if you have a moment maybe try to{" "}
          <Link href="/dashboard/artist/onboarding" className="underline">
            finish off your uploads
          </Link>
          .
        </div>
      ) : (
        <>
          <div
            id="upcoming-feed"
            className="min-h-[90vh] overflow-y-scroll snap-y snap-mandatory"
          >
            {posts.map((post, idx) => {
              const variations = variationsByPostId.get(post.id) || [];
              const isActive = idx === activeIndex;

              return (
                <div
                  key={post.id}
                  data-index={idx}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  className="snap-start min-h-[90vh] flex flex-col md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)] md:gap-4"
                >
                  {/* Left: vertical video */}
                  <div className="flex items-center justify-center py-4 md:py-6">
                    <PostFeedItem
                      post={post}
                      variations={variations}
                      isActive={isActive}
                      muted={muted}
                      captionExpanded={captionExpanded}
                      onToggleCaption={() => setCaptionExpanded((v) => !v)}
                      onToggleMute={() => setMuted((m) => !m)}
                      onOpenInfo={() => setInfoOpen(true)}
                      onOpenFeedback={() => openFirstVariation(post.id)}
                      onGreenlightPost={() => handleGreenlightPost(post.id)}
                    />
                  </div>

                  {/* Right: desktop info for THIS post */}
                  <div className="hidden md:flex items-center">
                    <InfoPanel
                      post={post}
                      variations={variations}
                      onOpenVariation={openVariationModal}
                      onCaptionSaved={(nextCaption) => {
                        setPosts((prev) =>
                          prev.map((p) => (p.id === post.id ? { ...p, caption_a: nextCaption } : p))
                        );
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* hide scrollbar globally for this feed */}
          <style jsx global>{`
            #upcoming-feed {
              scrollbar-width: none; /* Firefox */
            }
            #upcoming-feed::-webkit-scrollbar {
              display: none; /* Chrome/Safari */
            }
          `}</style>
        </>
      )}

      {/* Mobile info sheet for active post */}
      <MobileInfoSheet
        open={infoOpen}
        post={activePost}
        variations={activeVariations}
        onClose={() => setInfoOpen(false)}
        onOpenVariation={openVariationModal}
        onCaptionSaved={(nextCaption) => {
          if (!activePost) return;
          setPosts((prev) =>
            prev.map((p) => (p.id === activePost.id ? { ...p, caption_a: nextCaption } : p))
          );
        }}
      />

      {/* Media player modal */}
      {mediaVar && (
        <VariationMediaModal
          variation={mediaVar}
          onClose={() => setMediaVar(null)}
        />
      )}
    </ArtistLayout>
  );
}
