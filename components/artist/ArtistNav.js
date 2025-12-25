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
    label: "artist-calendar",
    icon: "/icons/artist-nav/calendar-icon.png",
  },
  {
    href: "/dashboard/artist/upcoming-content",
    label: "upcoming-content",
    icon: "/icons/artist-nav/Videos-icon.png",
  },
  {
    href: "/dashboard/artist/home",
    label: "home",
    icon: "/icons/artist-nav/Home-icon.png",
  },
  {
    href: "/dashboard/artist/insights",
    label: "insights",
    icon: "/icons/artist-nav/Insights-icon.png",
  },
  {
    href: "/dashboard/artist/onboarding",
    label: "Uploads",
    icon: "/icons/artist-nav/Upload-icon.png",
  },
];

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

    async function load() {
      try {
        const { artistId } = await getMyArtistContext();
        if (!artistId) return;

        const todayYMD = new Date().toISOString().slice(0, 10);

        // Upcoming ready posts for this artist
        const { data: posts, error: postsErr } = await supabase
          .from("posts")
          .select("id")
          .eq("artist_id", artistId)
          .eq("status", "ready")
          .gte("post_date", todayYMD);

        if (postsErr) throw postsErr;

        const postIds = (posts || []).map((p) => p.id);
        if (!postIds.length) {
          if (!cancelled) setPendingCount(0);
          return;
        }

        const { data: vars, error: varsErr } = await supabase
          .from("postvariations")
          .select("post_id, feedback, feedback_resolved")
          .in("post_id", postIds);

        if (varsErr) throw varsErr;

        const waiting = new Set();
        (vars || []).forEach((v) => {
          const noFeedback = !v.feedback || !v.feedback.trim();
          const unresolved =
            v.feedback && v.feedback.trim() && (v.feedback_resolved === false || v.feedback_resolved === null);
          if (noFeedback || unresolved) {
            waiting.add(v.post_id);
          }
        });

        if (!cancelled) setPendingCount(waiting.size);
      } catch (err) {
        console.error("[ArtistNav] failed to compute pendingCount", err);
        if (!cancelled) setPendingCount(0);
      }
    }

    load();
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
            const showBadge = item.label === "home" && pendingCount > 0;
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
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] px-1 rounded-full bg-red-600 text-[10px] text-white text-center leading-[16px]">
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
            const showBadge = item.label === "home" && pendingCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2 my-1",
                  active ? "bg-black/5" : "hover:bg-black/5",
                ].join(" ")}
              >
                <div className="relative flex items-center justify-center">
                  <NavIcon src={item.icon} alt={item.label} active={active} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] px-1 rounded-full bg-red-600 text-[10px] text-white text-center leading-[16px]">
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
