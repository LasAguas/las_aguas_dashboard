// pages/music-portfolio.js
import Head from "next/head";
import "../styles/site.css";
import SiteHeader from "../components/SiteHeader";

export default function MusicPortfolioPage() {
  return (
    <>
      <Head>
        <title>Music Portfolio · Las Aguas Productions</title>
        <meta
          name="description"
          content="A selection of music we have mixed, mastered and produced at Las Aguas Productions in Berlin."
        />
      </Head>

      <main className="site-page">
      <SiteHeader />
        <div className="site-page__inner">
          <h1 className="site-heading">Music Portfolio</h1>

          <div className="site-bodycopy">
            {/* TODO: paste intro text from Cargo music portfolio page */}
            <p>
              Here&apos;s a small selection of projects we&apos;ve worked on –
              from full production and tracking through to mixing and mastering.
            </p>
          </div>

          {/* Example project grid – each block gets a black placeholder for artwork */}
          <section style={{ marginTop: "2.5rem" }}>
          <div className="music-grid" style={{ marginTop: "1.5rem" }}>
              {/* Repeat this card for each featured release */}
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.5rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "220px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                >
                  {/* TODO: replace with cover art */}
                </div>
                <h2
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "#bbe1ac",
                  }}
                >
                  Refréscate el Chip
                </h2>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#599b40",
                    marginTop: "0.35rem",
                  }}
                >
                  We produced and mixed Facundo Swing’s debut album, Refréscate el Chip. The full 7-track album was recorded at the Las Aguas studio in Lichtenberg and we continue to work with Facundo Swing for their digital strategy.
                  <br /><br />
                Production, tracking, and mixing: Miguel Lee<br />
                Additional mixing: Sebastian Sheath
                  {/* TODO: replace with real descriptions from Cargo */}
                </p>
              </article>
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.5rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "220px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                >
                  {/* TODO: replace with cover art */}
                </div>
                <h2
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "#bbe1ac",
                  }}
                >
                  MujerPlantaEco
                </h2>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#599b40",
                    marginTop: "0.35rem",
                  }}
                >
                  At Las Aguas we recorded Aura’s first two EPs, MujerPlantaEco and Musgo. Each EP is 3 tracks long and we provided the full bredth of creative services at Las Aguas from production to mastering. 
                  <br /><br />Production, mixing, and mastering: Sebastian Sheath
                  {/* TODO: replace with real descriptions from Cargo */}
                </p>
              </article>
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.5rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "220px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                >
                  {/* TODO: replace with cover art */}
                </div>
                <h2
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "#bbe1ac",
                  }}
                >
                  Latin American Post-Pop
                </h2>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#599b40",
                    marginTop: "0.35rem",
                  }}
                >
                  For Mercedes & Marxx’s recent EP, Latin American Post-Pop, we mixed and mastered all three tracks. Vida en Crisis (Live) stands out as an interesting project as we were working from a single track, separating stems and using samples to bring the mix to life. 
                    <br /><br />Mixing for Carta de Atenas and Crimen y Castigo: Sebastian Sheath
                    <br />Mixing for Vida en Crisis (Live): Miguel Lee
                    <br />Mastering: Sebastian Sheath
                  {/* TODO: replace with real descriptions from Cargo */}
                </p>
              </article>
            </div>
          </section>
          {/* LIVE SESSION PRODUCTION */}
        <section style={{ marginTop: "3rem" }}>
        <h2 className="site-heading" style={{ fontSize: "1.45rem" }}>
            Live Session Production
        </h2>

        <div className="music-grid" style={{ marginTop: "1.5rem" }}>
            {/* Project 1 */}
            <article
            style={{
                backgroundColor: "#271f5a",
                borderRadius: "1.5rem",
                padding: "1.25rem 1.5rem",
                border: "1px solid rgba(168,159,228,0.4)",
            }}
            >
            <div
                style={{
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: "1.25rem",
                overflow: "hidden",
                backgroundColor: "#000",
                marginBottom: "0.9rem",
                }}
            >
                <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/watch?v=vJBtMCSeA2k&list=RDvJBtMCSeA2k&start_radio=1"
                title="Live Session 1 - Sorvina"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                ></iframe>
            </div>

            <h3 style={{ color: "#bbe1ac", fontSize: "1.05rem" }}>
                Sorvina: Live From Riverside Studios
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#599b40", marginTop: "0.35rem" }}>
                Working with Jakohitsdifferent on the audio, we produced this session for jazz-hop artist Sorvina in April 2024.
            </p>
            </article>

            {/* Project 2 */}
            <article
            style={{
                backgroundColor: "#271f5a",
                borderRadius: "1.5rem",
                padding: "1.25rem 1.5rem",
                border: "1px solid rgba(168,159,228,0.4)",
            }}
            >
            <div
                style={{
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: "1.25rem",
                overflow: "hidden",
                backgroundColor: "#000",
                marginBottom: "0.9rem",
                }}
            >
                <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/VIDEO_ID_HERE"
                title="Live Session 2 - CORP."
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                ></iframe>
            </div>

            <h3 style={{ color: "#bbe1ac", fontSize: "1.05rem" }}>
                CORP: Live at LA Recordings
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#599b40", marginTop: "0.35rem" }}>
                One of the first live sessions we did, in December 2023, was with CORP., an office-core indie rock band. For this we recorded at the beautiful LA Recordings in Berlin.
            </p>
            </article>

            {/* Project 3 */}
            <article
            style={{
                backgroundColor: "#271f5a",
                borderRadius: "1.5rem",
                padding: "1.25rem 1.5rem",
                border: "1px solid rgba(168,159,228,0.4)",
            }}
            >
            <div
                style={{
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: "1.25rem",
                overflow: "hidden",
                backgroundColor: "#000",
                marginBottom: "0.9rem",
                }}
            >
                <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/iBCTlDAVHNU&list=RDiBCTlDAVHNU&start_radio=1"
                title="Live Session 3"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                ></iframe>
            </div>

            <h3 style={{ color: "#bbe1ac", fontSize: "1.05rem" }}>
                Maia Valentine - Unausgesprochenes Versprechen
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#599b40", marginTop: "0.35rem" }}>
                Recorded at ORWO Haus in Marzahn, we produced this live session for Maia Valentine in early 2025.
            </p>
            </article>
        </div>
        </section>

        {/* CLIENT REVIEWS */}
        <section style={{ marginTop: "3rem", marginBottom: "2rem" }}>
        <h2 className="site-heading" style={{ fontSize: "1.45rem" }}>
            Client Reviews
        </h2>

        <div className="music-grid" style={{ marginTop: "1.5rem" }}>
            {/* Review 1 */}
            <article
            style={{
                backgroundColor: "#271f5a",
                borderRadius: "1.5rem",
                padding: "1.25rem 1.5rem",
                border: "1px solid rgba(168,159,228,0.4)",
            }}
            >
            <h3 style={{ color: "#bbe1ac", fontSize: "1.05rem" }}>Mercedes & Marxx</h3>
            <p style={{ fontSize: "0.9rem", color: "#599b40", marginTop: "0.35rem" }}>
            Las Aguas Productions reached out to us via email after we made a post in an artist forum offering their services. After scheduling an initial meeting to work on the mixing and mastering of our material, we quickly realized we were dealing with passionate people—attentive to the artist’s needs, eager to offer tailored solutions, flexible, and above all, professionally outstanding.
            <br /><br />
            We released an EP they worked on, and the entire process went smoothly and fast. We must also highlight the warmth and human value of everyone at Las Aguas. <span style={{ color: "#a89fe4" }}>We can only recommend their work, and we’ll definitely keep working with them in the future.</span>
            </p>
            </article>

            {/* Review 2 */}
            <article
            style={{
                backgroundColor: "#271f5a",
                borderRadius: "1.5rem",
                padding: "1.25rem 1.5rem",
                border: "1px solid rgba(168,159,228,0.4)",
            }}
            >
            <h3 style={{ color: "#bbe1ac", fontSize: "1.05rem" }}>Sancta</h3>
            <p style={{ fontSize: "0.9rem", color: "#599b40", marginTop: "0.35rem" }}>
            Big love to Las Aguas for mixing and mastering my EP — they immediately understood the atmosphere I was going for and brought out the emotion in every track. The few revisions I asked for were handled with care, but <span style={{ color: "#a89fe4" }}>honestly, they nailed it from the start.</span>
            </p>
            </article>

            {/* Review 3 */}
            <article
            style={{
                backgroundColor: "#271f5a",
                borderRadius: "1.5rem",
                padding: "1.25rem 1.5rem",
                border: "1px solid rgba(168,159,228,0.4)",
            }}
            >
            <h3 style={{ color: "#bbe1ac", fontSize: "1.05rem" }}>CORP.</h3>
            <p style={{ fontSize: "0.9rem", color: "#599b40", marginTop: "0.35rem" }}>
            We worked with Las Aguas Productions for 4 months to increase the social visibility and following of our band CORP.<span style={{ color: "#a89fe4" }}>The team helped us immensely with realising what good engaging content is and how to create it.</span> We had always wanted to work on the brand behind our band, and with Las Aguas we managed to fulfill this for the first time. 
            <br /><br />
            <span style={{ color: "#a89fe4" }}>Our social pages have never looked so consistently good, which also reflected in increasing followers and engagement.</span> What helped in this process is that they are able to co-create the content, which is a part that a lot of musicians do not have the skills or patience for. We could definitely recommend Las Aguas to our peers; an excellent partner to boost your digital footprint as an independent artist.
            </p>
            </article>
        </div>
        </section>

        </div>
      </main>
    </>
  );
}
