"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { detectMediaType, publicVariationUrl } from "./artistData";

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function Media({ path }) {
  const type = detectMediaType(path);
  const url = publicVariationUrl(path);
  if (!url) return <div className="w-full h-full flex items-center justify-center text-white/70">No media</div>;

  if (type === "video") {
    return <video className="w-full h-full object-cover" src={url} playsInline muted autoPlay loop />;
  }
  if (type === "image") {
    return <img className="w-full h-full object-cover" src={url} alt="" />;
  }
  return <div className="w-full h-full flex items-center justify-center text-white/70">Unsupported</div>;
}

function Caption({ text }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [text]);

  if (!text) return null;
  const needs = text.length > 160;
  const short = needs ? text.slice(0, 160) : text;

  return (
    <div className="text-sm text-white leading-snug">
      {expanded ? text : short}
      {needs && !expanded && (
        <button onClick={() => setExpanded(true)} className="ml-2 text-white/80 underline">more…</button>
      )}
      {needs && expanded && (
        <button onClick={() => setExpanded(false)} className="ml-2 text-white/80 underline">less</button>
      )}
    </div>
  );
}

export default function SwipeFeed({
  items, // [{ post, variations }]
  selectedByPostId,
  setSelectedByPostId,
  horizontalMode,
  setHorizontalMode,
  onMoreInfo,
  onWriteFeedback,
  onToggleGreenlight,
}) {
  const scrollerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchRef = useRef({ x: 0, y: 0, t: 0 });

  const activeItem = items?.[activeIndex] || null;

  const activeVariation = useMemo(() => {
    if (!activeItem) return null;
    const idx = selectedByPostId?.[activeItem.post.id] ?? 0;
    return activeItem.variations?.[clamp(idx, 0, (activeItem.variations?.length || 1) - 1)] || null;
  }, [activeItem, selectedByPostId]);

  const captionText = useMemo(() => {
    if (!activeItem?.post) return "";
    return [activeItem.post.caption_a, activeItem.post.caption_b].filter(Boolean).join("\n\n");
  }, [activeItem]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== activeIndex) setActiveIndex(clamp(idx, 0, items.length - 1));
  }

  function onTouchStart(e) {
    const t = e.touches?.[0];
    if (!t) return;
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function onTouchEnd(e) {
    const start = touchRef.current;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) && dt < 800) {
      setHorizontalMode?.((m) => (m === "post" ? "variations" : "post"));
    }
  }

  function changeVariation(delta) {
    if (!activeItem) return;
    const postId = activeItem.post.id;
    const cur = selectedByPostId?.[postId] ?? 0;
    const next = clamp(cur + delta, 0, (activeItem.variations?.length || 1) - 1);
    setSelectedByPostId?.((prev) => ({ ...(prev || {}), [postId]: next }));
  }

  return (
    <div className="md:hidden">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="h-[calc(100vh-64px)] overflow-y-scroll snap-y snap-mandatory rounded-2xl bg-black"
      >
        {items.map((it) => {
          const postId = it.post.id;
          const selIdx = selectedByPostId?.[postId] ?? 0;
          const v = it.variations?.[clamp(selIdx, 0, (it.variations?.length || 1) - 1)];

          return (
            <section key={postId} className="h-[calc(100vh-64px)] snap-start relative">
              <Media path={v?.file_name} />

              <button
                onClick={() => onMoreInfo?.(it)}
                className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center"
                aria-label="More info"
              >
                ⓘ
              </button>

              {horizontalMode === "variations" && (
                <div className="absolute inset-x-0 top-16 flex items-center justify-center gap-2">
                  <button onClick={() => changeVariation(-1)} className="px-3 py-1 rounded-full bg-black/40 text-white text-xs">
                    Prev variation
                  </button>
                  <div className="text-white/80 text-xs">
                    {selIdx + 1} / {it.variations?.length || 0}
                  </div>
                  <button onClick={() => changeVariation(1)} className="px-3 py-1 rounded-full bg-black/40 text-white text-xs">
                    Next variation
                  </button>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                <Caption text={captionText} />

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onWriteFeedback?.(it, v)}
                    className="flex-1 rounded-xl py-2 text-sm font-medium bg-[#B9A7FF] text-black"
                  >
                    write feedback
                  </button>
                  <button
                    onClick={() => onToggleGreenlight?.(v)}
                    className="flex-1 rounded-xl py-2 text-sm font-medium bg-green-500 text-black"
                  >
                    greenlight
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-white/60">
                  Swipe up/down for posts • Swipe right to toggle variations
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
