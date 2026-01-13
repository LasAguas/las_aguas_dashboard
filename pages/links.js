// pages/links.js
"use client";

import Link from "next/link";
import { useMemo } from "react";

// -----------------------------------------------------------------------------
// Config: replace these URLs with Las Aguas real links
// -----------------------------------------------------------------------------
const LAS_AGUAS = {
  name: "Las Aguas",
  //tagline: "Links",
  socials: {
    instagram: "https://instagram.com/lasaguas", // TODO
    //tiktok: "https://tiktok.com/@lasaguas", // TODO
    youtube: "https://www.youtube.com/@LasAguasProductions", // TODO
    website: "https://open.spotify.com/", // optional TODO
  },
  forms: {
    DigitalStrategy: "/forms/digital-strategy", // TODO (or external form URL)
    MixingMastering: "/forms/mixing-mastering", // TODO
    Videography: "/forms/videography", // TODO
  },
  resources: {
    resource1: "https://freight.cargo.site/m/R2619736070357291154163775180252/Las-Aguas-20-Sales-Offers-for-Each-Holiday-Sale.pdf", // TODO
    resource2: "https://docs.google.com/presentation/d/1WfDM20CUogbUYXYYbZD6bxo90kcuey7oPEqlx8j0up8/edit?usp=sharing", // TODO
  },
  homepage: "https://lasaguasproductions.com", // TODO
  mailingList: "https://wordpress.us13.list-manage.com/subscribe?u=85a39786a7175aca97b4eef8b&id=0e148d7f25", // TODO
};

// -----------------------------------------------------------------------------
// Small UI helpers (mirrors the “pill/button card” vibe in your pages)
// -----------------------------------------------------------------------------
function IconButton({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#eef8ea] shadow hover:bg-white hover:shadow transition"
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  );
}

function LinkCard({ href, label, sublabel, external = true }) {
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#33286a]">{label}</div>
        {sublabel ? (
          <div className="text-xs text-[#33286a]/80 mt-1">{sublabel}</div>
        ) : null}
      </div>
      <div className="shrink-0 text-xs text-[#33286a]/60 mt-0.5">▸</div>
    </div>
  );

  const className =
    "block w-full text-left bg-[#eef8ea] rounded-2xl p-4 shadow-sm hover:shadow transition border border-black/10";

  if (!href) {
    return (
      <div className={`${className} opacity-60`} aria-disabled="true">
        {inner}
      </div>
    );
  }

  if (!external && href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  );
}

function SectionDetails({ title, subtitle, defaultOpen = false, children }) {
  return (
    <details
      open={defaultOpen}
      className="bg-white rounded-2xl p-3 border border-black/10"
    >
      <summary className="cursor-pointer list-none select-none">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#33286a]">{title}</div>
            {subtitle ? (
              <div className="text-xs text-[#33286a]/70 mt-0.5">{subtitle}</div>
            ) : null}
          </div>
          <div className="shrink-0 text-xs text-[#33286a]/60">▾</div>
        </div>
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

// -----------------------------------------------------------------------------
// Inline SVG icons (no deps)
// -----------------------------------------------------------------------------
function InstagramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"
        stroke="#33286a"
        strokeWidth="2"
      />
      <path
        d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="#33286a"
        strokeWidth="2"
      />
      <path
        d="M17.5 6.5h.01"
        stroke="#33286a"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M14 3v10.1a4.9 4.9 0 1 1-4-4.8"
        stroke="#33286a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 3c.8 3.5 3.1 5.5 6 5.9V12c-3-.2-4.9-1.5-6-3"
        stroke="#33286a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 8.2s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C15.8 5 12 5 12 5h0s-3.8 0-6.1.3c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S3 9.8 3 11.4v1.2c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.9.8 2.4.9 1.7.2 5.6.3 5.6.3s3.8 0 6.1-.3c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.2C21.2 9.8 21 8.2 21 8.2Z"
        stroke="#33286a"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 15.2V8.8L16 12l-5.5 3.2Z"
        fill="#33286a"
      />
    </svg>
  );
}

function WebsiteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="#33286a"
        strokeWidth="2"
      />
      <path
        d="M2 12h20"
        stroke="#33286a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 2c2.5 2.7 2.5 16.3 0 20c-2.5-3.7-2.5-17.3 0-20Z"
        stroke="#33286a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
export default function LinksPage() {
  const socialItems = useMemo(
    () => [
      { key: "instagram", label: "Instagram", href: LAS_AGUAS.socials.instagram, icon: <InstagramIcon /> },
      { key: "tiktok", label: "TikTok", href: LAS_AGUAS.socials.tiktok, icon: <TikTokIcon /> },
      { key: "youtube", label: "YouTube", href: LAS_AGUAS.socials.youtube, icon: <YouTubeIcon /> },
      { key: "spotify", label: "Spotify", href: LAS_AGUAS.socials.spotify, icon: <WebsiteIcon /> },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#a89ee4] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#bbe1ac] p-6 md:p-8 rounded-2xl shadow-lg">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="text-2xl font-bold text-[#33296b]">{LAS_AGUAS.name}</div>
          <div className="text-sm text-[#33296b]/80 mt-1">{LAS_AGUAS.tagline}</div>

          {/* Social icons */}
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            {socialItems
              .filter((s) => !!s.href)
              .map((s) => (
                <IconButton key={s.key} href={s.href} label={s.label}>
                  {s.icon}
                </IconButton>
              ))}
          </div>
        </div>

        {/* Main links */}
        <div className="mt-6 space-y-3">
          {/* Contact (collapsed by default) */}
          <SectionDetails
            title="Contact"
            subtitle="Get in touch!"
            defaultOpen={false}
          >
            <LinkCard
              href={LAS_AGUAS.forms.DigitalStrategy}
              label="Digital Strategy"
              sublabel="Grow Your Audience and Increase Your Income"
              external={!(LAS_AGUAS.forms.contactGeneral || "").startsWith("/")}
            />
            <LinkCard
              href={LAS_AGUAS.forms.MixingMastering}
              label="Mixing/Mastering"
              sublabel="Tracking and Other Audio Services at our Studio"
              external={!(LAS_AGUAS.forms.press || "").startsWith("/")}
            />
            <LinkCard
              href={LAS_AGUAS.forms.Videography}
              label="Videography"
              sublabel="Music Videos, Gig Shoots, and Socials Content"
              external={!(LAS_AGUAS.forms.bookings || "").startsWith("/")}
            />
          </SectionDetails>

          {/* Free resources (collapsed by default) */}
          <SectionDetails
            title="Free resources"
            subtitle="Open for free resources for independent artists"
            defaultOpen={false}
          >
            <LinkCard
              href={LAS_AGUAS.resources.resource1}
              label="Sales Offers PDF"
              sublabel="20 sales offers to use for every major sales holiday"
              external={true}
            />
            <LinkCard
              href={LAS_AGUAS.resources.resource2}
              label="Vertical Video Content Guide"
              sublabel="References for different types of vertical video content"
              external={true}
            />
          </SectionDetails>

          {/* Always-visible primary links */}
          {/*<LinkCard
            href={LAS_AGUAS.homepage}
            label="Homepage"
            sublabel="Visit our main site"
            external={true}
          />*/}
          <LinkCard
            href={LAS_AGUAS.mailingList}
            label="Newsletter Sign Up"
            sublabel="Get updates + announcements"
            external={true}
          />
        </div>

        {/* Tiny footer */}
        <div className="mt-6 text-center text-xs text-[#33296b]/70">
          You be the artist, we'll handle the tech
        </div>
      </div>
    </div>
  );
}
