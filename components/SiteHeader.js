// components/SiteHeader.js
"use client";

import { useState } from "react";
import Link from "next/link";
import SiteMenu from "./SiteMenu";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        style={{
          width: "100%",
          padding: "1.2rem 1.5rem",
          backgroundColor: "#33296b",
          borderBottom: "1px solid rgba(168,159,228,0.3)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                color: "#bbe1ac",
                fontSize: "0.85rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "0.2rem",
              }}
            >
              Las Aguas Productions · Creative and Label Services
            </p>

            <p style={{ color: "#a89fe4", fontSize: "1rem", fontWeight: 600 }}>
              You be the artist, we handle the tech
            </p>
          </div>

          {/* Menu Icon */}
          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.4rem",
            }}
          >
            <svg
              width="28"
              height="28"
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
        </div>
      </header>

      <SiteMenu open={open} setOpen={setOpen} />
    </>
  );
}
