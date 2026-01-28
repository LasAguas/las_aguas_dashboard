// pages/resources.js
"use client";

import Link from "next/link";
import { useMemo } from "react";

const LAS_AGUAS = {
  name: "Las Aguas Productions",
  tagline: "Free Resources",
  socials: {
    instagram: "https://www.instagram.com/lasaguas.productions/",
    youtube: "https://www.youtube.com/@LasAguasProductions",
    website: "https://lasaguasproductions.com",
  },
  resources: {
    marketingGuide: "#", // TODO: Add your full marketing guide URL when ready
    resource1: "https://freight.cargo.site/m/R2619736070357291154163775180252/Las-Aguas-20-Sales-Offers-for-Each-Holiday-Sale.pdf",
    resource2: "https://docs.google.com/presentation/d/1WfDM20CUogbUYXYYbZD6bxo90kcuey7oPEqlx8j0up8/edit?usp=sharing",
  },
  youtube: "https://www.youtube.com/@LasAguasProductions?sub_confirmation=1",
  homepage: "https://lasaguasproductions.com",
  mailingList: "https://wordpress.us13.list-manage.com/subscribe?u=85a39786a7175aca97b4eef8b&id=0e148d7f25",
};

// -----------------------------------------------------------------------------
// Small UI helpers (mirrors the "pill/button card" vibe in your pages)
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
export default function ResourcesPage() {
  const socialItems = useMemo(
    () => [
      { key: "instagram", label: "Instagram", href: LAS_AGUAS.socials.instagram, icon: <InstagramIcon /> },
      { key: "youtube", label: "YouTube", href: LAS_AGUAS.socials.youtube, icon: <YouTubeIcon /> },
      { key: "website", label: "Website", href: LAS_AGUAS.socials.website, icon: <WebsiteIcon /> },
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
          {/* Complete Marketing Guide - Featured */}
          <SectionDetails
            title="Complete Marketing Guide"
            subtitle="Full guide for independent artists"
            defaultOpen={true}
          >
            <div className="bg-[#eef8ea] rounded-2xl p-4 border border-black/10">
              <div className="text-sm font-semibold text-[#33286a] mb-2">
                The Independent Artist Marketing Guide
              </div>
              <div className="text-xs text-[#33286a]/80 mb-3 leading-relaxed">
                Comprehensive guide covering social media strategy, release planning, 
                playlist pitching, email marketing, monetization, and building a sustainable 
                music career.
              </div>
              
              {/* What's Included List */}
              <div className="text-xs text-[#33286a]/70 mb-3 space-y-1">
                <div>✓ How to define your brand</div>
                <div>✓ What to avoid with websites</div>
                <div>✓ Platform recommendations</div>
                <div>✓ Schedules to get consistent</div>
              </div>

              <a
                href={LAS_AGUAS.resources.marketingGuide}
                className="inline-block px-4 py-2 bg-[#33286a] text-white text-xs font-semibold rounded-lg hover:bg-[#33286a]/90 transition"
              >
                Coming Soon
              </a>
            </div>
          </SectionDetails>

          {/* Free resources (templates & downloads) */}
          <SectionDetails
            title="Templates & Downloads"
            subtitle="Practical tools for your music career"
            defaultOpen={true}
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

          {/* YouTube Educational Series */}
          <SectionDetails
            title="Video Tutorials"
            subtitle="Subscribe to our YouTube channel"
            defaultOpen={true}
          >
            <div className="bg-[#eef8ea] rounded-2xl p-4 border border-black/10">
              <div className="text-sm font-semibold text-[#33286a] mb-2">
                Educational Video Series
              </div>
              <div className="text-xs text-[#33286a]/80 mb-3 leading-relaxed">
                In-depth tutorials, behind-the-scenes content, artist interviews, and 
                practical production advice. New videos every week covering everything 
                from mixing techniques to marketing strategies.
              </div>
              <a
                href={LAS_AGUAS.youtube}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-4 py-2 bg-[#33286a] text-white text-xs font-semibold rounded-lg hover:bg-[#33286a]/90 transition"
              >
                Subscribe on YouTube
              </a>
            </div>
          </SectionDetails>

          {/* Always-visible primary links */}
          <LinkCard
            href={LAS_AGUAS.mailingList}
            label="Newsletter Sign Up"
            sublabel="Get new resources, guides, and updates delivered to your inbox"
            external={true}
          />
          <LinkCard
            href={LAS_AGUAS.homepage}
            label="Back to Homepage"
            sublabel="Explore our services and learn more about Las Aguas"
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