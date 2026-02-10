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

// Videos for CORP. at Junction Bar
const EVENT_VIDEOS_CORP = [
  { title: "CORP. Live at Junction Bar", path: "CORP Live at Junction Bar.mp4" },
  // TODO: add more 9:16 event reels here
];

// Videos for VAMOS A BAILAR at Junction Bar
const EVENT_VIDEOS_VAB = [
  { title: "Conexion Salsa Live", path: "Conexion Salsa Reel.mp4" },
];

// Videos for Cafe at Marla event
const EVENT_VIDEOS_MARLA = [
  { title: "Cafe at Marla Event Reel", path: "Cafe at Marla Event Reel.mp4" },
];

// Saba Lou listening party image
const SABA_LOU_IMAGE = "/rhubarb/Saba-Lou-Listening-Party.JPG";

// Artist data
const ARTISTS = [
  {
    name: "CONEXION",
    subtitle: "Salsa Live Band",
    origin: "Germany / Cuba / Colombia",
    description:
      "CONEXION is a large live salsa band delivering high-energy performances. They are ideal for a lively, dancing-oriented event. Due to the size of the ensemble and volume, they may not be the best fit for a quieter restaurant opening, but would be perfect for a bar launch or party setting.",
    image: "/rhubarb/CONEXION-Salsa.JPG",
    epk: null,
    setup: "6 musicians: trombone, percussion, drums, bass, piano, vocals",
    links: {
      youtube: "https://www.youtube.com/@Conexionsalsa",
      spotify: "https://open.spotify.com/artist/1GYEE0p9IdRek9nq5hctgQ",
      apple: "https://music.apple.com/gb/artist/conexi%C3%B3n-salsa-live-band/1518567010",
      tidal: "https://tidal.com/artist/19792344/u",
      instagram: "https://www.instagram.com/conexionsalsa/",
      tiktok: "https://www.tiktok.com/@conexionsalsa",
      website: "https://conexion-salsa.com/",
    },
  },
  {
    name: "Cataroh",
    subtitle: "Singer-Songwriter in Spanish",
    origin: "Chile",
    description:
      "Cataroh is a Chilean singer-songwriter based in Hamburg, performing in Spanish and English. Her music, a mix of RnB and Pop in Spanish, creates a relaxed, intimate atmosphere — perfect for a more laid-back opening event. The set-up is flexible depending on available facilities, ranging from solo acoustic to a small ensemble.",
    image: "/rhubarb/Cataroh-Album.jpg",
    epk: null,
    setup: "Solo vocals + guitar, or with small accompanying ensemble",
    links: {
      youtube: "https://youtube.com/@TODO",
      spotify: "https://open.spotify.com/artist/7G090Dm7RJ1lb7riAprrxq",
      apple: "https://music.apple.com/gb/artist/cataroh/1630499078",
      tidal: "https://tidal.com/artist/32761795/u",
      instagram: "https://www.instagram.com/cataroh/",
      tiktok: "https://www.tiktok.com/@cataroh",
    },
  },
  {
    name: "Emetres",
    subtitle: "Pop in Spanish",
    origin: "Venezuelan / Catalunya",
    description:
      "Emetres makes wholesome, warm pop music in Spanish with Venezuelan and Catalan roots, like a pop-leaning version of the Marias. This is great for a relaxed opening event or a calm bar. The set-up is flexible depending on the available facilities and can be adapted to fit the space.",
    image: "/rhubarb/Emetres-Presspic.JPG",
    epk: null,
    setup: "Duo: vocals + guitar/keys, or with backing musicians. Best with acoustic piano if possible",
    links: {
      youtube: "https://www.youtube.com/@soyemetres",
      spotify: "https://open.spotify.com/artist/0kyn948FvzvuJ5a2CJkUP3",
      apple: "https://music.apple.com/gb/artist/emetres/1585897181",
      tidal: "https://tidal.com/artist/8052967/u",
      instagram: "https://www.instagram.com/soyemetres/",
      tiktok: "https://www.tiktok.com/@soyemetres",
      website: "https://www.soyemetres.com/",
    },
  },
  {
    name: "Aura",
    subtitle: "Modern Latin Folk",
    origin: "Colombia",
    description:
      "Aura performs singer-songwriter music with strong roots in traditional Andean music and Latin rock, think Cerati meets Natalia Lafourcade. The set-up would be guitar and vocals, potentially accompanied by a double bassist who is based in Hamburg. This would be my choice for an event that wants to feel both contemporary and culturally rich.",
    image: "/rhubarb/Aura-at-Las-Aguas.jpeg",
    epk: "/rhubarb/Aura EPK ENG.pdf",
    setup: "Vocals + Guitar, optionally with double bass",
    links: {
      youtube: "https://www.youtube.com/@AuraSofiaMusica",
      spotify: "https://open.spotify.com/artist/3vqTj29POCaPTtlFzZKRTl",
      apple: "https://music.apple.com/gb/artist/aura/1744347651",
      tidal: "https://tidal.com/artist/48071512/u",
      instagram: "https://www.instagram.com/aurasofiasotelo/",
      tiktok: "https://www.tiktok.com/@aurasofiamusica",
    },
  },
  {
    name: "Saba Lou",
    subtitle: "Indie / World Music",
    origin: "Germany (audiences in Latin America, especially Brazil & Chile)",
    description:
      "Saba Lou doesn't sing in Spanish, but she has a strong audience in Germany and has played shows in Hamburg before. She also has a large following in Latin America, especially Brazil and Chile. A versatile and well-known artist who would bring a draw to any event.",
    image: "/rhubarb/Presspic-from-Store.JPG",
    epk: "https://freight.cargo.site/m/B2560573123844327582325990100444/Saba-Lou-EPK.pdf",
    setup: "Solo Vocals + Guitar (flexibly with more band members)",
    links: {
      youtube: "https://www.youtube.com/@sabalouland",
      spotify: "https://open.spotify.com/artist/4FctzCzQuNPwtblJLp7LFQ",
      apple: "https://music.apple.com/gb/artist/saba-lou/568050451",
      tidal: "https://tidal.com/artist/8785220/u",
      instagram: "https://www.instagram.com/sabalouland/",
      tiktok: "https://www.tiktok.com/@sabalouland",
      website: "https://sabalouland.com/",
    },
  },
  {
    name: "Mercedes & Marxx",
    subtitle: "Latin Punk / Post-Pop",
    origin: "Latin America",
    description:
      "Mercedes & Marxx make punk and post-pop music. This might not be the choice for a restaurant or bar opening, but depending on the concept and energy you're going for, they could bring an cool, gritty edge to the event.",
    image: "/rhubarb/Mercedes-and-Marxx.jpeg",
    epk: null,
    setup: "4-Person band, drums, bass, lead vocalist with guitar",
    links: {
      youtube: "https://www.youtube.com/@MercedesMarxx",
      spotify: "https://open.spotify.com/artist/11Biva5YYueJ1lSg2UzoS8",
      apple: "https://music.apple.com/gb/artist/mercedes-marxx/1674920419",
      tidal: "https://tidal.com/artist/46038973/u",
      instagram: "https://www.instagram.com/mercedes.marxx/",
      tiktok: "https://www.tiktok.com/@mercedes_marxx",
    },
  },
  {
    name: "Silver Omen",
    subtitle: "Europop / Queer Dance",
    origin: "Argentina",
    description:
      "Silver Omen is an Argentine artist based in Berlin making English-language Dance-Pop oriented at the queer dance scene. This is probably not what you're looking for for a traditional restaurant opening, but depending on the bar concept it could be a higher-energy fit.",
    image: "/rhubarb/Silver-Omen.jpg",
    epk: "https://silveromen.com/epk",
    setup: "Solo electronic performance with vocals",
    links: {
      youtube: "https://www.youtube.com/@silveromen.mp4",
      spotify: "https://open.spotify.com/artist/04PVbCwPl3UEsNnVJUZbUl",
      apple: "https://music.apple.com/gb/artist/silver-omen/1820988833",
      tidal: "https://tidal.com/artist/57012043/u",
      instagram: "https://www.instagram.com/silver.omen",
      tiktok: "https://www.tiktok.com/@silver.omen",
      website: "https://silveromen.com/",
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
    const all = [...EVENT_VIDEOS_CORP, ...EVENT_VIDEOS_VAB, ...EVENT_VIDEOS_MARLA];
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

            {/* --- Row 1: 3 reel events in columns --- */}
            <div className="rh-events-row-3">
              {/* Cafe at Marla */}
              <div className="rh-event-block">
                <h3 className="rh-event-title">Cafe at Marla — Presented by Las Aguas</h3>
                <p className="rh-event-text">
                  The show at Cafe at Marla is the only &quot;Presented by Las Aguas&quot; live music
                  event we have produced to date. This was a fully Las Aguas-branded event where we
                  were brought in to help the launching of the cafe so we curated the line-up,
                  handled promotion, and managed it from start to finish.
                </p>

                <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {EVENT_VIDEOS_MARLA.map((reel) => (
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
                  ))}
                </div>
              </div>

              {/* CORP. at Junction Bar */}
              <div className="rh-event-block">
                <h3 className="rh-event-title">CORP. at Junction Bar</h3>
                <p className="rh-event-text">
                  For the CORP. show at Junction Bar, Las Aguas handled the marketing and
                  videography for the event. We coordinated the booking with the artist, managed
                  on-site operations including merch tables and newsletter sign-ups, and produced
                  all promotional video content.
                </p>

                <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {EVENT_VIDEOS_CORP.map((reel) => (
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
                  ))}
                </div>
              </div>

              {/* VAMOS A BAILAR */}
              <div className="rh-event-block">
                <h3 className="rh-event-title">¡VAMOS A BAILAR!</h3>
                <p className="rh-event-text">
                  For CONEXION&apos;s &quot;¡VAMOS A BAILAR!&quot; January show at Pfefferberg Haus 13, we managed the marketing and
                  videography and handled on-site work including working the door and newsletter sign-ups.
                  We are continuing to do this work throughout the recurring event series.
                </p>

                <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {EVENT_VIDEOS_VAB.map((reel) => (
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
                  ))}
                </div>
              </div>

            </div>

            {/* --- Row 2: Saba Lou — text left, image right --- */}
            <div className="rh-events-row" style={{ marginTop: "2.5rem" }}>
              <div className="rh-event-block">
                <h3 className="rh-event-title">
                  Saba Lou — Listening Party at Rhino&ccedil;eros Bar, Berlin
                </h3>
                <p className="rh-event-text">
                  To celebrate a new vinyl print we organised a listening party for Saba Lou at Rhino&ccedil;eros Bar in Berlin.
                  The event brought together fans and the team behind the album for a listening session and Q&amp;A at Berlin&apos;s highest-regarded Jazz Kissa.
                </p>
              </div>
              <div className="rh-event-block">
                <img
                  src={SABA_LOU_IMAGE}
                  alt="Saba Lou listening party at Rhinoçeros Bar"
                  style={{
                    width: "100%",
                    borderRadius: "1.25rem",
                    display: "block",
                    objectFit: "cover",
                  }}
                />
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

          /* ---------- event rows (3 columns for reels) ---------- */
          .rh-events-row-3 {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 2rem;
          }
          @media (min-width: 900px) {
            .rh-events-row-3 {
              grid-template-columns: repeat(3, minmax(0, 1fr));
              align-items: start;
            }
          }

          /* ---------- event rows (2 columns for Saba Lou) ---------- */
          .rh-events-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 2rem;
          }
          @media (min-width: 768px) {
            .rh-events-row {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              align-items: center;
            }
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
