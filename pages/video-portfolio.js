// pages/video-portfolio.js
import Head from "next/head";
import SiteHeader from "../components/SiteHeader";
import "../styles/site.css";

export default function VideoPortfolio() {
  return (
    <>
      <Head>
        <title>Video Portfolio · Las Aguas Productions</title>
        <meta
          name="description"
          content="Long-form live performances, live show reels, and visualiser videos produced by Las Aguas Productions."
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

        {/* ---------- ROW 1 ---------- */}
        <div className="music-grid" style={{ marginTop: "1.5rem" }}>
            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/Laiz Live at 90mil.mp4"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Live Show Reel 1</h3>
            </article>

            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/KOOB Live at Kantine am Berghain Reel 2.mp4"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Live Show Reel 2</h3>
            </article>

            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/CORP Live at Junction Bar.mp4"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Live Show Reel 3</h3>
            </article>
        </div>

        {/* ---------- ROW 2 ---------- */}
        <div className="music-grid" style={{ marginTop: "1.5rem" }}>
            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/Conexion Salsa Reel.mp4"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Live Show Reel 4</h3>
            </article>

            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/Carcara Reel Laiz.mp4"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Live Show Reel 5</h3>
            </article>

            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/KOOB Live at Kantine am Berghain Reel 1.mp4"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Live Show Reel 6</h3>
            </article>
        </div>
        </section>

        {/* ========================================================= */}
        {/* VISUALISER REELS — Also 9:16, MP4 files */}
        {/* ========================================================= */}

        <section style={{ marginTop: "3rem", marginBottom: "3rem" }}>
        <h2 className="site-heading" style={{ fontSize: "1.45rem" }}>
            Visualiser Reels
        </h2>

        {/* ---------- ROW 1 ---------- */}
        <div className="music-grid" style={{ marginTop: "1.5rem" }}>
            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/Avui Reel Emetres.mp4"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Visualiser Reel 1</h3>
            </article>

            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/CORP Visualiser Super Base.mp4"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Visualiser Reel 2</h3>
            </article>

            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/Cuchibeats Cover Art Breakdown.mp4"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Visualiser Reel 3</h3>
            </article>
        </div>

        {/* ---------- ROW 2 ---------- */}
        <div className="music-grid" style={{ marginTop: "1.5rem" }}>
            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/Escape the Rat Song Breakdown.mov"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Visualiser Reel 4</h3>
            </article>

            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/Facundo Swing 3B Visualiser.mov"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Visualiser Reel 5</h3>
            </article>

            <article className="music-card">
            <div className="video-frame-9x16">
                <video
                src="/video-portfolio/Saba Lou Visualiser.mp4"
                muted
                playsInline
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            </div>
            <h3 className="music-title">Visualiser Reel 6</h3>
            </article>
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
