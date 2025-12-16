// pages/video-portfolio.js
import Head from "next/head";
import SiteHeader from "../components/SiteHeader";
import "../styles/site.css";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Script from "next/script";

const BUCKET = "video-portfolio";

const LIVE_SHOW_REELS = [
  { title: "Laiz Live at 90mil", path: "Laiz Live at 90mil.mp4" },
  { title: "KOOB Live at Kantine am Berghain", path: "KOOB Live at Kantine am Berghain Reel 2.mp4" },
  { title: "CORP. Live at Junction Bar", path: "CORP Live at Junction Bar.mp4" },
  { title: "Conexion Salsa Live", path: "Conexion Salsa Reel.mp4" },
  { title: "Carcara Reel Laiz", path: "Carcara Reel Laiz.mp4" },
  { title: "KOOB Live at Kantine am Berghain", path: "KOOB-Live-at-Kantine-am-Berghain.mp4" },
];

const VISUALISER_REELS = [
  { title: "Emetres: Avui Visualiser", path: "Avui-Reel-Emetres.mp4" }, 
  { title: "CORP.: Escape the Rat Song Breakdown", path: "Escape the Rat Song Breakdown.mov" },
  { title: "Facundo Swing: 3B Visualiser", path: "Facundo Swing 3B Visualiser.mov" },
  { title: "Saba Lou: Visualiser", path: "Saba Lou Visualiser.mp4" },
  { title: "Emetres: Cuchibeats Cover Art Breakdown", path: "Cuchibeats Cover Art Breakdown.mp4" },
  { title: "CORP.: Greaseball Visualiser", path: "CORP Visualiser Super Base.mp4" },
];

function getPublicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null; // Supabase already returns an encoded URL
}

export default function VideoPortfolio() {
  const [urlMap, setUrlMap] = useState({});

  useEffect(() => {
    const all = [...LIVE_SHOW_REELS, ...VISUALISER_REELS];
    const next = {};
    for (const item of all) {
      next[item.path] = getPublicUrl(item.path);
    }
    setUrlMap(next);
  }, []);

  return (
    <>
      <Head>
        <title>Video Portfolio · Las Aguas Productions</title>
        <meta
          name="description"
          content="Long-form live performances, live show reels, and visualiser videos produced by Las Aguas Productions."
        />

        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1596969374985643');
            fbq('track', 'PageView');
          `}
        </Script>

        <noscript
          dangerouslySetInnerHTML={{
            __html:
              '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1596969374985643&ev=PageView&noscript=1" />',
          }}
        />
        {/* Mixing Mastering Form Pixel */}
        <Script id="meta-pixel-782404974822483" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '782404974822483');
            fbq('track', 'PageView');
          `}
        </Script>

        <noscript
          dangerouslySetInnerHTML={{
            __html:
              '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=782404974822483&ev=PageView&noscript=1" />',
          }}
        />
      </Head>

      <main className="site-page">
        <SiteHeader />

        <div className="site-page__inner">

          {/* PAGE TITLE */}
          <h1 className="site-heading" style={{ fontSize: "2rem" }}>
            Video Portfolio
          </h1>

          {/* ========================================================= */}
          {/* LONG PERFORMANCE VIDEOS — 4 items, 16:9 embeds           */}
          {/* ========================================================= */}

          <section style={{ marginTop: "2rem" }}>
            <h2 className="site-heading" style={{ fontSize: "1.45rem" }}>
              Long Performance Videos
            </h2>

            <div className="video-grid-4" style={{ marginTop: "1.5rem" }}>

              {/* Sorvina */}
              <article className="music-card">
                <div className="video-frame-16x9">
                  <iframe
                    src="https://www.youtube.com/embed/vJBtMCSeA2k"
                    title="Sorvina Live Session"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <h3 className="music-title">Sorvina — Live Session</h3>
              </article>

              {/* CORP. */}
              <article className="music-card">
                <div className="video-frame-16x9">
                  <iframe
                    src="https://www.youtube.com/embed/ZJQNVhkhfs8"
                    title="CORP. Live Session"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <h3 className="music-title">CORP. — Live Session</h3>
              </article>

              {/* Se Segura */}
              <article className="music-card">
                <div className="video-frame-16x9">
                  <iframe
                    src="https://www.youtube.com/embed/muTKDkeiQ3M"
                    title="Se Segura Live at 90mil"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <h3 className="music-title">Se Segura — Live at 90mil</h3>
              </article>

              {/* Maia Valentine */}
              <article className="music-card">
                <div className="video-frame-16x9">
                  <iframe
                    src="https://www.youtube.com/embed/iBCTlDAVHNU"
                    title="Maia Valentine Live Session"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <h3 className="music-title">Maia Valentine — Live Session</h3>
              </article>

            </div>
          </section>

        {/* ========================================================= */}
        {/* LIVE SHOW REELS — 9:16 aspect, MP4 files in /video-portfolio */}
        {/* ========================================================= */}

        <section style={{ marginTop: "3rem" }}>
            <h2 className="site-heading" style={{ fontSize: "1.45rem" }}>
              Live Show Reels
            </h2>

            <div className="music-grid" style={{ marginTop: "1.5rem" }}>
              {LIVE_SHOW_REELS.map((reel) => (
                <article className="music-card" key={reel.path}>
                  <div className="video-frame-9x16">
                    {urlMap[reel.path] ? (
                      <video
                        src={urlMap[reel.path]}
                        muted
                        playsInline
                        controls
                        preload="metadata"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          // This will show you the *real* failing URL in the console
                          console.error("Video failed to load:", reel.path, urlMap[reel.path], e?.currentTarget?.error);
                        }}
                      />
                    ) : (
                      <div style={{ color: "#fff", padding: "1rem" }}>Missing video: {reel.path}</div>
                    )}
                  </div>
                  <h3 className="music-title">{reel.title}</h3>
                </article>
              ))}
            </div>
          </section>

        {/* ========================================================= */}
        {/* VISUALISER REELS — Also 9:16, MP4 files */}
        {/* ========================================================= */}

        <section style={{ marginTop: "3rem" }}>
            <h2 className="site-heading" style={{ fontSize: "1.45rem" }}>
              Visualiser Reels
            </h2>

            <div className="music-grid" style={{ marginTop: "1.5rem" }}>
              {VISUALISER_REELS.map((reel) => (
                <article className="music-card" key={reel.path}>
                  <div className="video-frame-9x16">
                    {urlMap[reel.path] ? (
                      <video
                        src={urlMap[reel.path]}
                        muted
                        playsInline
                        controls
                        preload="metadata"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ color: "#fff", padding: "1rem" }}>Missing video: {reel.path}</div>
                    )}
                  </div>
                  <h3 className="music-title">{reel.title}</h3>
                </article>
              ))}
            </div>
          </section>

        </div>

        {/* Inline styles matching music-portfolio exactly */}
        <style jsx>{`
          .music-card {
            background-color: #271f5a;
            border-radius: 1.5rem;
            padding: 1.25rem 1.5rem;
            border: 1px solid rgba(168, 159, 228, 0.4);
          }

          .music-title {
            color: #bbe1ac;
            margin-top: 0.75rem;
            font-size: 1rem;
          }

          .video-frame-16x9 {
            width: 100%;
            aspect-ratio: 16 / 9;
            background: #000;
            border-radius: 1.25rem;
            overflow: hidden;
          }

          .video-frame-9x16 {
            width: 100%;
            aspect-ratio: 9 / 16;
            background: #000;
            border-radius: 1.25rem;
            overflow: hidden;
          }

          iframe {
            width: 100%;
            height: 100%;
          }
        `}</style>
      </main>
    </>
  );
}
