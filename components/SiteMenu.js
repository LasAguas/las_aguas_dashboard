// components/SiteMenu.js
"use client";

import Link from "next/link";

export default function SiteMenu({ open, setOpen }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: open ? "rgba(0,0,0,0.45)" : "transparent",
          pointerEvents: open ? "auto" : "none",
          transition: "background-color 0.25s ease",
          zIndex: 49,
        }}
      ></div>

      {/* Drawer */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "280px",
          height: "100vh",
          backgroundColor: "#271f5a",
          borderLeft: "1px solid rgba(168,159,228,0.4)",
          padding: "2rem 1.5rem",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          style={{
            background: "none",
            border: "none",
            color: "#a89fe4",
            alignSelf: "flex-end",
            marginBottom: "2rem",
            cursor: "pointer",
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Menu Items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Link href="/" onClick={() => setOpen(false)} className="site-menu-link">
            Home
          </Link>
          <Link href="/about" onClick={() => setOpen(false)} className="site-menu-link">
            About
          </Link>
          <Link
            href="/creative-services"
            onClick={() => setOpen(false)}
            className="site-menu-link"
          >
            Creative Services
          </Link>
          <Link
            href="/digital-strategy"
            onClick={() => setOpen(false)}
            className="site-menu-link"
          >
            Digital Strategy
          </Link>
          <Link
            href="/video-portfolio"
            onClick={() => setOpen(false)}
            className="site-menu-link"
          >
            Video Portfolio
          </Link>
          <Link
            href="/music-portfolio"
            onClick={() => setOpen(false)}
            className="site-menu-link"
          >
            Music Portfolio
          </Link>
          <Link
            href="/dashboard/login"
            onClick={() => setOpen(false)}
            className="site-menu-link"
          >
            Dashboard Login
          </Link>
          {/*<Link
            href="/tech-specs"
            onClick={() => setOpen(false)}
            className="site-menu-link"
          >
            Tech Specs
          </Link>*/}

          <Link
            href="/forms/contact"
            onClick={() => setOpen(false)}
            className="site-btn site-btn--primary"
            style={{ marginTop: "1.5rem", textAlign: "center" }}
          >
            Contact Us
          </Link>
        </nav>
      </aside>

      <style jsx>{`
        .site-menu-link {
          color: #bbe1ac;
          font-size: 1.05rem;
          text-decoration: none;
          font-weight: 500;
        }
        .site-menu-link:hover {
          color: #a89fe4;
        }
      `}</style>
    </>
  );
}
