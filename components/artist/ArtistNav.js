"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getMyArtistContext } from "./artistData";

const NAV = [
  {
    href: "/dashboard/artist/artist-calendar",
    label: "Artist Calendar",
    icon: "/icons/artist-nav/calendar-icon.png",
  },
  {
    href: "/dashboard/artist/upcoming-content",
    label: "Upcoming Content",
    icon: "/icons/artist-nav/Videos-icon.png",
  },
  {
    href: "/dashboard/artist/home",
    label: "Home",
    icon: "/icons/artist-nav/Home-icon.png",
  },
  {
    href: "/dashboard/artist/insights",
    label: "Insights",
    icon: "/icons/artist-nav/Insights-icon.png",
  },
  {
    href: "/dashboard/artist/onboarding",
    label: "Uploads",
    icon: "/icons/artist-nav/Upload-icon.png",
  },
];

function needsReviewForPost(postId, allVariations) {
  const vars = (allVariations || []).filter((v) => v.post_id === postId);

  // If there are no media variations, we don't count this post
  if (!vars.length) return false;

  const hasGreenlight = vars.some((v) => v.greenlight === true);
  const hasFeedback = vars.some(
    (v) => v.feedback && v.feedback.trim() !== ""
  );

  // Only count posts where NONE of the variations are greenlit
  // and NONE have feedback
  return !hasGreenlight && !hasFeedback;
}

function NavIcon({ src, alt, active }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={24}
      height={24}
      priority={false}
      className={[
        "select-none",
        active ? "opacity-100" : "opacity-70",
      ].join(" ")}
    />
  );
}


export default function ArtistNav({ forceDesktopOpen = false, desktopOpen, setDesktopOpen }) {
  const router = useRouter();
  const path = router.asPath || "";

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPending() {
      try {
        setPendingCount(0);

        const { artistId } = await getMyArtistContext();
        if (!artistId) return;

        const todayYMD = new Date().toISOString().slice(0, 10);

        // 1) Posts must be status 'ready' and in the future
        const { data: postsData, error: postsErr } = await supabase
          .from("posts")
          .select("id, artist_id, post_date, status")
          .eq("artist_id", artistId)
          .eq("status", "ready")
          .gte("post_date", todayYMD);

        if (postsErr) throw postsErr;

        const posts = postsData || [];
        if (!posts.length) {
          if (!cancelled) setPendingCount(0);
          return;
        }

        // 2) Get variations for those posts (must have media)
        const postIds = posts.map((p) => p.id);
        const { data: varsData, error: varsErr } = await supabase
          .from("postvariations")
          .select("id, post_id, file_name, greenlight, feedback, text_only")
          .in("post_id", postIds)
          .or("file_name.not.is.null,text_only.eq.true");

        if (varsErr) throw varsErr;
        const vars = varsData || [];

        // 3) Count posts that still need review (same logic as Home / Upcoming)
        const pending = posts.filter((p) =>
          needsReviewForPost(p.id, vars)
        ).length;

        if (!cancelled) setPendingCount(pending);
      } catch (e) {
        console.error("[ArtistNav] pending count error", e);
        if (!cancelled) setPendingCount(0);
      }
    }

    loadPending();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-xl artist-bottomnav">
          <div className="flex items-center justify-between px-6 py-3">
            {NAV.map((item) => {
              const active = path.startsWith(item.href);
              const showBadge = item.label === "Home" && pendingCount > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-center"
                  aria-label={item.label}
                >
                  <div className="relative flex items-center justify-center">
                    <NavIcon src={item.icon} alt={item.label} active={active} />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-[10px] text-white text-center leading-[16px]">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:block">
        <div
          className={[
            "h-screen sticky top-0 artist-sidebar transition-all duration-200",
            (forceDesktopOpen || desktopOpen) ? "w-64" : "w-16",
          ].join(" ")}
        >
          <div className="p-3 flex items-center justify-between">
            <div className={(forceDesktopOpen || desktopOpen) ? "text-sm font-semibold" : "sr-only"}>Artist</div>
            {!forceDesktopOpen && (
              <button
                onClick={() => setDesktopOpen?.((v) => !v)}
                className="text-xs px-2 py-1 rounded-md bg-black/5 hover:bg-black/10"
              >
                {desktopOpen ? "Collapse" : "Menu"}
              </button>
            )}
          </div>

          <div className="px-2 pb-3">
            {NAV.map((item) => {
              const active = path.startsWith(item.href);
              const showBadge = item.label === "Home" && pendingCount > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2 my-1",
                    active ? "bg-black/5" : "hover:bg-black/5",
                  ].join(" ")}
                >
                  <div className="relative">
                    <NavIcon src={item.icon} alt={item.label} active={active} />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-[10px] text-white text-center leading-[16px]">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                  <span className={(forceDesktopOpen || desktopOpen) ? "text-sm" : "sr-only"}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

          </div>
        </div>
      </aside>
    </>
  );
}
