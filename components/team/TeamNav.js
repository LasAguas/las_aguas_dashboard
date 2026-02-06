"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

const NAV = [
  { href: "/dashboard/menu",              label: "Home" },
  { href: "/dashboard/calendar",          label: "Calendar" },
  { href: "/dashboard/project-steering",  label: "Project Steering" },
  { href: "/dashboard/leads",             label: "Leads" },
  { href: "/dashboard/onboarding-admin",  label: "Onboarding" },
  { href: "/dashboard/posts-stats",       label: "Posts Stats" },
  { href: "/dashboard/edit-next",         label: "Edit Next" },
];

export default function TeamNav({ forceDesktopOpen = false, desktopOpen, setDesktopOpen }) {
  const router = useRouter();
  const path = router.asPath || "";
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href) {
    if (href === "/dashboard/menu") return path === "/dashboard/menu" || path === "/dashboard";
    return path.startsWith(href);
  }

  return (
    <>
      {/* ───── Mobile: burger button (fixed top-right) ───── */}
      <button
        className="md:hidden fixed top-5 right-5 z-50 inline-flex items-center justify-center w-11 h-11 rounded-xl artist-panel shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
      </button>

      {/* ───── Mobile: overlay menu ───── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />

          {/* Menu panel */}
          <div className="absolute top-0 right-0 h-full w-72 artist-sidebar p-5 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm font-semibold">Las Aguas</div>
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/5 hover:bg-black/10"
                aria-label="Close menu"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="2" y1="2" x2="12" y2="12" />
                  <line x1="12" y1="2" x2="2" y2="12" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {NAV.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active ? "bg-black/5 font-semibold" : "hover:bg-black/5",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ───── Desktop: sidebar ───── */}
      <aside className="hidden md:block">
        <div
          className={[
            "h-screen sticky top-0 artist-sidebar transition-all duration-200",
            (forceDesktopOpen || desktopOpen) ? "w-64" : "w-16",
          ].join(" ")}
        >
          <div className="p-3 flex items-center justify-between">
            <div className={(forceDesktopOpen || desktopOpen) ? "text-sm font-semibold" : "sr-only"}>
              Las Aguas
            </div>
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
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2 my-1 text-sm",
                    active ? "bg-black/5 font-semibold" : "hover:bg-black/5",
                  ].join(" ")}
                >
                  <span className={(forceDesktopOpen || desktopOpen) ? "" : "sr-only"}>
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
