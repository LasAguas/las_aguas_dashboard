// components/HomeMenuIcon.js
"use client";

import { useState } from "react";
import SiteMenu from "./SiteMenu";

export default function HomeMenuIcon() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* HAMBURGER ICON — hidden when menu is open */}
      {!open && (
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          style={{
            position: "absolute",
            top: "1.2rem",
            right: "1.2rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            zIndex: 60,
            padding: "0.4rem",
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            stroke="#a89fe4"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* SIDE MENU */}
      <SiteMenu open={open} setOpen={setOpen} />
    </>
  );
}
