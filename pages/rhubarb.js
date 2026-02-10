// pages/rhubarb.js
import Head from "next/head";
import SiteHeader from "../components/SiteHeader";
import "../styles/site.css";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const BUCKET = "video-portfolio";

function getPublicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/** LazyVideo – loads video only when scrolled into view */
function LazyVideo({ src, ...props }) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {isVisible ? (
        <video src={src} {...props} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#000" }} />
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────
   DATA
   ─────────────────────────────────────────────────────── */

// Videos for VAMOS A BAILAR / CORP. events
const EVENT_VIDEOS_CORP = [
  { title: "CORP. Live at Junction Bar", path: "CORP Live at Junction Bar.mp4" },
  // TODO: add more 9:16 event reels here
];

// Videos for Cafe at Marla event
const EVENT_VIDEOS_MARLA = [
  // TODO: add 9:16 reels from the Marla event
  // { title: "Marla Event Reel 1", path: "marla-reel-1.mp4" },
];

// Images for Saba Lou listening party carousel
const SABA_LOU_IMAGES = [
  // TODO: replace with real image paths from /public or Supabase
  "/rhubarb/saba-lou-1.jpg",
  "/rhubarb/saba-lou-2.jpg",
  "/rhubarb/saba-lou-3.jpg",
  "/rhubarb/saba-lou-4.jpg",
];

// Artist data
const ARTISTS = [
  {
    name: "CONEXION",
    subtitle: "Salsa Live Band",
    origin: "Germany / Cuba / Colombia",
    description:
      "CONEXION is a large live salsa band delivering high-energy, high-level performances. They are ideal for a lively, dancing-oriented event. Due to the size of the ensemble and volume, they may not be the best fit for a quieter restaurant opening, but would be perfect for a bar launch or party setting.",
    image: "/rhubarb/conexion.jpg",
    epk: null,
    setup: "8–12 musicians: horns, percussion, bass, piano, vocals",
    links: {
      youtube: "https://youtube.com/@TODO",
      spotify: "https://open.spotify.com/artist/TODO",
      apple: "https://music.apple.com/artist/TODO",
      tidal: "https://tidal.com/artist/TODO",
      instagram: "https://instagram.com/TODO",
      tiktok: "https://tiktok.com/@TODO",
      website: "https://TODO.com",
    },
  },
  {
    name: "Cataroh",
    subtitle: "Singer-Songwriter in Spanish",
    origin: "Chile (based in Hamburg)",
    description:
      "Cataroh is a Chilean singer-songwriter based in Hamburg, performing in Spanish. Her music creates a relaxed, intimate atmosphere — perfect for a more laid-back opening event. The set-up is flexible depending on available facilities, ranging from solo acoustic to a small ensemble.",
    image: "/rhubarb/cataroh.jpg",
    epk: "https://TODO-epk-link.com",
    setup: "Solo vocals + guitar, or with small accompanying ensemble",
    links: {
      youtube: "https://youtube.com/@TODO",
      spotify: "https://open.spotify.com/artist/TODO",
      apple: "https://music.apple.com/artist/TODO",
      tidal: "https://tidal.com/artist/TODO",
      instagram: "https://instagram.com/TODO",
      tiktok: "https://tiktok.com/@TODO",
      website: "https://TODO.com",
    },
  },
  {
    name: "Emetres",
    subtitle: "Pop in Spanish",
    origin: "Venezuelan / Catalan",
    description:
      "Emetres makes wholesome, warm pop music in Spanish with Venezuelan and Catalan roots. This is great for a more relaxed energy at an opening event. The set-up is flexible depending on the available facilities and can be adapted to fit the space.",
    image: "/rhubarb/emetres.jpg",
    epk: "https://TODO-epk-link.com",
    setup: "Solo vocals + guitar/keys, or with backing musicians",
    links: {
      youtube: "https://youtube.com/@TODO",
      spotify: "https://open.spotify.com/artist/TODO",
      apple: "https://music.apple.com/artist/TODO",
      tidal: "https://tidal.com/artist/TODO",
      instagram: "https://instagram.com/TODO",
      tiktok: "https://tiktok.com/@TODO",
      website: "https://TODO.com",
    },
  },
  {
    name: "Aura",
    subtitle: "Modern Latin Folk",
    origin: "Colombia",
    description:
      "Aura performs modern music with strong roots in traditional Andean music and Latin folk. The set-up would be guitar and vocals, potentially accompanied by a double bassist who is based in Hamburg. A beautiful choice for an event that wants to feel both contemporary and culturally rich.",
    image: "/rhubarb/aura.jpg",
    epk: "https://TODO-epk-link.com",
    setup: "Vocals + guitar, optionally with double bass",
    links: {
      youtube: "https://youtube.com/@TODO",
      spotify: "https://open.spotify.com/artist/TODO",
      apple: "https://music.apple.com/artist/TODO",
      tidal: "https://tidal.com/artist/TODO",
      instagram: "https://instagram.com/TODO",
      tiktok: "https://tiktok.com/@TODO",
      website: "https://TODO.com",
    },
  },
  {
    name: "Saba Lou",
    subtitle: "Indie / World Music",
    origin: "Germany (audiences in Latin America, especially Brazil & Chile)",
    description:
      "Saba Lou doesn't sing in Spanish, but she has a strong audience in Germany and has played shows in Hamburg before. She also has a large following in Latin America, especially Brazil and Chile. A versatile and well-known artist who would bring a draw to any event.",
    image: "/rhubarb/saba-lou.jpg",
    epk: "https://TODO-epk-link.com",
    setup: "Vocals + band (flexible configuration)",
    links: {
      youtube: "https://youtube.com/@TODO",
      spotify: "https://open.spotify.com/artist/TODO",
      apple: "https://music.apple.com/artist/TODO",
      tidal: "https://tidal.com/artist/TODO",
      instagram: "https://instagram.com/TODO",
      tiktok: "https://tiktok.com/@TODO",
      website: "https://TODO.com",
    },
  },
  {
    name: "Mercedes & Marxx",
    subtitle: "Latin Punk / Post-Pop",
    origin: "Latin America (based in Berlin)",
    description:
      "Mercedes & Marxx make punk and post-pop music. This may not be the typical choice for a restaurant or bar opening, but depending on the concept and energy you're going for, they could bring an exciting, unconventional edge to the event.",
    image: "/rhubarb/mercedes-marxx.jpg",
    epk: null,
    setup: "Duo: vocals + guitar/bass, or with full band",
    links: {
      youtube: "https://youtube.com/@TODO",
      spotify: "https://open.spotify.com/artist/TODO",
      apple: "https://music.apple.com/artist/TODO",
      tidal: "https://tidal.com/artist/TODO",
      instagram: "https://instagram.com/TODO",
      tiktok: "https://tiktok.com/@TODO",
      website: "https://TODO.com",
    },
  },
  {
    name: "Silver Omen",
    subtitle: "Europop / Queer Dance",
    origin: "Argentina (based in Berlin)",
    description:
      "Silver Omen is an Argentine artist based in Berlin making europop oriented at the queer dance scene. This is probably not what you're looking for for a traditional restaurant opening, but depending on the bar concept it could be an exciting fit.",
    image: "/rhubarb/silver-omen.jpg",
    epk: null,
    setup: "Solo electronic performance with vocals",
    links: {
      youtube: "https://youtube.com/@TODO",
      spotify: "https://open.spotify.com/artist/TODO",
      apple: "https://music.apple.com/artist/TODO",
      tidal: "https://tidal.com/artist/TODO",
      instagram: "https://instagram.com/TODO",
      tiktok: "https://tiktok.com/@TODO",
      website: "https://TODO.com",
    },
  },
];

/* ───────────────────────────────────────────────────────
   LINK ICONS (inline SVGs)
   ─────────────────────────────────────────────────────── */

const PLATFORM_LABELS = {
  youtube: "YouTube",
  spotify: "Spotify",
  apple: "Apple Music",
  tidal: "Tidal",
  instagram: "Instagram",
  tiktok: "TikTok",
  website: "Website",
};

/* ───────────────────────────────────────────────────────
   COMPONENT
   ─────────────────────────────────────────────────────── */

export default function RhubarbPage() {
  // Build public URLs for Supabase-hosted videos
  const [urlMap, setUrlMap] = useState({});

  useEffect(() => {
    const all = [...EVENT_VIDEOS_CORP, ...EVENT_VIDEOS_MARLA];
    const next = {};
    for (const item of all) {
      next[item.path] = getPublicUrl(item.path);
    }
    setUrlMap(next);
  }, []);

  return (
    <>
      <Head>
        <title>Rhubarb Hospitality Collection · Las Aguas Productions</title>
        <meta
          name="description"
          content="Las Aguas' roster and event portfolio for upcoming restaurant and bar openings in Hamburg."
        />
      </Head>

      <main className="site-page">
        <SiteHeader />

        <div className="site-page__inner">
          {/* ══════════════════════════════════════════════════
              PAGE HEADER
              ══════════════════════════════════════════════════ */}
          <h1 className="site-heading" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            Rhubarb Hospitality Collection — Artists for Opening Events
          </h1>
          <p className="rh-subtitle">
            Las Aguas&apos; roster and event portfolio for upcoming restaurant and bar openings in Hamburg.
          </p>

          {/* ══════════════════════════════════════════════════
              SECTION 1 — PREVIOUS EVENTS
              ══════════════════════════════════════════════════ */}
          <section style={{ marginTop: "3rem" }}>
            <h2 className="site-heading" style={{ fontSize: "1.6rem" }}>
              Previous Events
            </h2>

            {/* --- VAMOS A BAILAR / CORP. at Junction Bar --- */}
            <div className="rh-event-block">
              <h3 className="rh-event-title">VAMOS A BAILAR &amp; CORP. at Junction Bar</h3>
              <p className="rh-event-text">
                For the VAMOS A BAILAR and CORP. shows at Junction Bar, Las Aguas handled the full
                marketing and videography for the events. We coordinated the bookings with the
                artists, managed on-site operations including merch tables and newsletter sign-ups,
                and produced all promotional video content. These events demonstrate our end-to-end
                capability — from artist liaison and event set-up through to content creation and
                post-event marketing.
              </p>

              <div className="music-grid" style={{ marginTop: "1.5rem" }}>
                {EVENT_VIDEOS_CORP.length > 0 ? (
                  EVENT_VIDEOS_CORP.map((reel) => (
                    <article className="rh-card" key={reel.path}>
                      <div className="video-frame-9x16">
                        {urlMap[reel.path] ? (
                          <LazyVideo
                            src={urlMap[reel.path]}
                            muted
                            playsInline
                            controls
                            preload="metadata"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <div style={{ color: "#fff", padding: "1rem" }}>Loading...</div>
                        )}
                      </div>
                      <h4 className="rh-card-title">{reel.title}</h4>
                    </article>
                  ))
                ) : (
                  <p style={{ color: "#a89fe4", fontStyle: "italic" }}>
                    Video reels coming soon — add paths to EVENT_VIDEOS_CORP array.
                  </p>
                )}
              </div>
            </div>

            {/* --- Cafe at Marla --- */}
            <div className="rh-event-block" style={{ marginTop: "3rem" }}>
              <h3 className="rh-event-title">Cafe at Marla — Presented by Las Aguas</h3>
              <p className="rh-event-text">
                The show at Cafe at Marla is the only &quot;Presented by Las Aguas&quot; live music
                event we have produced to date. This was a fully Las Aguas-branded event where we
                curated the line-up, handled promotion, and managed the evening from start to
                finish.
              </p>

              <div className="music-grid" style={{ marginTop: "1.5rem" }}>
                {EVENT_VIDEOS_MARLA.length > 0 ? (
                  EVENT_VIDEOS_MARLA.map((reel) => (
                    <article className="rh-card" key={reel.path}>
                      <div className="video-frame-9x16">
                        {urlMap[reel.path] ? (
                          <LazyVideo
                            src={urlMap[reel.path]}
                            muted
                            playsInline
                            controls
                            preload="metadata"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <div style={{ color: "#fff", padding: "1rem" }}>Loading...</div>
                        )}
                      </div>
                      <h4 className="rh-card-title">{reel.title}</h4>
                    </article>
                  ))
                ) : (
                  <p style={{ color: "#a89fe4", fontStyle: "italic" }}>
                    Video reels coming soon — add paths to EVENT_VIDEOS_MARLA array.
                  </p>
                )}
              </div>
            </div>

            {/* --- Saba Lou Listening Party at Rhinoçeros Bar --- */}
            <div className="rh-event-block" style={{ marginTop: "3rem" }}>
              <h3 className="rh-event-title">
                Saba Lou — Listening Party at Rhino&ccedil;eros Bar, Berlin
              </h3>
              <p className="rh-event-text">
                We organised a listening party for Saba Lou at Rhino&ccedil;eros Bar in Berlin. The
                event brought together fans, press, and industry in an intimate setting to preview
                new material.
              </p>

              {/* Image carousel */}
              <div className="rh-carousel" style={{ marginTop: "1.5rem" }}>
                <div className="rh-carousel__inner">
                  {SABA_LOU_IMAGES.map((src, i) => (
                    <div className="rh-carousel__item" key={i}>
                      <img
                        src={src}
                        alt={`Saba Lou listening party photo ${i + 1}`}
                        className="rh-carousel__img"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              SECTION 2 — ARTISTS
              ══════════════════════════════════════════════════ */}
          <section style={{ marginTop: "4rem" }}>
            <h2 className="site-heading" style={{ fontSize: "1.6rem" }}>
              Artists
            </h2>

            <div className="rh-artists-grid">
              {ARTISTS.map((artist) => (
                <article className="rh-artist-card" key={artist.name}>
                  {/* Artist image */}
                  <div className="rh-artist-img-wrap">
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="rh-artist-img"
                    />
                  </div>

                  {/* Name & subtitle */}
                  <h3 className="rh-artist-name">{artist.name}</h3>
                  <p className="rh-artist-subtitle">
                    {artist.subtitle} · {artist.origin}
                  </p>

                  {/* Description */}
                  <p className="rh-artist-desc">{artist.description}</p>

                  {/* Band outline / setup */}
                  <div className="rh-artist-setup">
                    <strong style={{ color: "#bbe1ac" }}>Rough set-up:</strong>{" "}
                    {artist.setup}
                  </div>

                  {/* Platform links */}
                  <div className="rh-artist-links">
                    {Object.entries(artist.links).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rh-link-pill"
                      >
                        {PLATFORM_LABELS[platform] || platform}
                      </a>
                    ))}
                  </div>

                  {/* EPK link */}
                  {artist.epk && (
                    <a
                      href={artist.epk}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rh-epk-link"
                    >
                      View EPK &rarr;
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* ═══════════════════════════════════════════════════
            SCOPED STYLES
            ═══════════════════════════════════════════════════ */}
        <style jsx>{`
          /* ---------- page subtitle ---------- */
          .rh-subtitle {
            font-size: 1.05rem;
            color: #a89fe4;
            max-width: 42rem;
            line-height: 1.45;
          }

          /* ---------- event blocks ---------- */
          .rh-event-block {
            margin-top: 0;
          }
          .rh-event-title {
            font-size: 1.2rem;
            color: #bbe1ac;
            margin-bottom: 0.6rem;
          }
          .rh-event-text {
            font-size: 0.95rem;
            color: #599b40;
            line-height: 1.5;
            max-width: 52rem;
          }

          /* ---------- reusable card (events) ---------- */
          .rh-card {
            background-color: #271f5a;
            border-radius: 1.5rem;
            padding: 1.25rem 1.5rem;
            border: 1px solid rgba(168, 159, 228, 0.4);
          }
          .rh-card-title {
            color: #bbe1ac;
            margin-top: 0.75rem;
            font-size: 1rem;
          }

          /* ---------- video frames ---------- */
          .video-frame-9x16 {
            width: 100%;
            aspect-ratio: 9 / 16;
            background: #000;
            border-radius: 1.25rem;
            overflow: hidden;
          }

          /* ---------- image carousel (Saba Lou) ---------- */
          .rh-carousel {
            width: 100%;
            overflow: hidden;
            border-radius: 1.25rem;
          }
          .rh-carousel__inner {
            display: flex;
            gap: 1rem;
            overflow-x: auto;
            scroll-snap-type: x proximity;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 0.5rem;
          }
          .rh-carousel__inner::-webkit-scrollbar {
            display: none;
          }
          .rh-carousel__item {
            flex: 0 0 auto;
            height: 420px;
            border-radius: 1.25rem;
            overflow: hidden;
            background: #000;
            scroll-snap-align: start;
          }
          .rh-carousel__img {
            height: 100%;
            width: auto;
            display: block;
            object-fit: cover;
          }

          /* ---------- artists grid (2 columns) ---------- */
          .rh-artists-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 2rem;
          }
          @media (min-width: 768px) {
            .rh-artists-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          /* ---------- artist card ---------- */
          .rh-artist-card {
            background-color: #271f5a;
            border-radius: 1.5rem;
            padding: 1.5rem;
            border: 1px solid rgba(168, 159, 228, 0.4);
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
          }

          .rh-artist-img-wrap {
            width: 100%;
            height: 280px;
            border-radius: 1.25rem;
            overflow: hidden;
            background: #000;
          }
          .rh-artist-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .rh-artist-name {
            font-size: 1.25rem;
            color: #bbe1ac;
            margin-top: 0.4rem;
          }
          .rh-artist-subtitle {
            font-size: 0.9rem;
            color: #a89fe4;
            margin-top: -0.2rem;
          }
          .rh-artist-desc {
            font-size: 0.9rem;
            color: #599b40;
            line-height: 1.5;
          }
          .rh-artist-setup {
            font-size: 0.85rem;
            color: #599b40;
            background: rgba(168, 159, 228, 0.1);
            border-radius: 0.75rem;
            padding: 0.6rem 0.8rem;
            line-height: 1.4;
          }

          /* ---------- platform link pills ---------- */
          .rh-artist-links {
            display: flex;
            flex-wrap: wrap;
            gap: 0.4rem;
            margin-top: 0.25rem;
          }
          .rh-link-pill {
            display: inline-block;
            padding: 0.3rem 0.7rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            color: #bbe1ac;
            border: 1px solid rgba(187, 225, 172, 0.35);
            text-decoration: none;
            transition: background-color 0.15s ease, border-color 0.15s ease;
          }
          .rh-link-pill:hover {
            background-color: rgba(187, 225, 172, 0.12);
            border-color: rgba(187, 225, 172, 0.6);
          }

          /* ---------- EPK link ---------- */
          .rh-epk-link {
            display: inline-block;
            font-size: 0.85rem;
            font-weight: 600;
            color: #a89fe4;
            text-decoration: none;
            margin-top: 0.25rem;
          }
          .rh-epk-link:hover {
            text-decoration: underline;
          }
        `}</style>
      </main>
    </>
  );
}
