// pages/digital-strategy.js
import Head from "next/head";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import "../styles/site.css";

export default function DigitalStrategyPage() {
  return (
    <>
      <Head>
        <title>Digital Strategy · Las Aguas Productions</title>
        <meta
          name="description"
          content="Digital strategy services for independent and Latin-American artists: audience growth, social media systems, web presence, and long-term income strategy."
        />
      </Head>

      <main className="site-page">
        <SiteHeader />
        <div className="site-page__inner">
          {/* HERO */}
          <section>
            <h1 className="site-heading">Digital Strategy</h1>
          </section>

          {/* TOP 2-COLUMN INTRO */}
          <section
            className="ds-intro-grid"
            style={{ marginTop: "1.5rem" }}
          >
            <article className="site-bodycopy">
              <h2
                style={{
                  color: "#bbe1ac",
                  fontSize: "1.35rem",
                  marginBottom: "0.6rem",
                }}
              >
                Independence, Risk-Free
              </h2>
              <p>
                At Las Aguas, in addition to studio services, we provide digital
                strategy services – this covers everything from social media
                content creation and growing an audience to optimising your
                digital presence, website building, and merch production for web
                stores. Our goal here is twofold:
              </p>
              <p style={{ marginTop: "0.8rem" }}>
                1) Take the weight of marketing and social media management off
                the back of artists so they have time to work on music.
              </p>
              <p style={{ marginTop: "0.4rem" }}>
                2) Bring the expertise to find your audience and create the
                environment in which they want to and can support your career.
              </p>
            </article>

            <article className="site-bodycopy">
              <h2
                style={{
                  color: "#bbe1ac",
                  fontSize: "1.35rem",
                  marginBottom: "0.6rem",
                }}
              >
                Latin-American Artists
              </h2>
              <p>
                For artists working to build an audience in Latin America, we
                are proud to be able to offer a specialised service. Using our
                connections to both Central and South America, as well as an
                understanding of Latin music cultures and business, we can help
                reach Latin audiences that require a different approach than
                those of Germany.
              </p>
            </article>
          </section>

          {/* CTA TO WORK WITH US */}
          <section style={{ marginTop: "2rem" }}>
            <Link
              href="/forms/digital-strategy"
              className="site-btn site-btn--primary"
            >
              Book a Free Consultation
            </Link>
          </section>

          {/* ROSTER */}
          <section style={{ marginTop: "3rem" }}>
            <h2 className="site-heading" style={{ fontSize: "1.6rem" }}>
              Our Roster
            </h2>

            <div className="ds-roster-grid">
              {/* Saba Lou */}
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.5rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <img
                  style={{
                    width: "100%",
                    height: "220px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Saba Lou Roster Pic.jpeg"
                    alt="Saba Lou Roster Pic"
                >
                  {/* TODO: replace with Saba Lou image */}
                </img>
                <h3
                  style={{
                    color: "#bbe1ac",
                    fontSize: "1.1rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  Saba Lou
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                  }}
                >
                  Saba Lou is a German singer-songwriter based in Berlin. Her
                  first audience came through her song{" "}
                  <span style={{ color: "#a89fe4" }}>
                    Good Habits (and Bad)
                  </span>{" "}
                  featuring on Cartoon Network’s{" "}
                  <span style={{ color: "#a89fe4" }}>Clarence</span>. Since
                  then, she has released two full length albums and a series of
                  singles, each with a unique view into her personal life and
                  navigating a complex cultural and family background.
                </p>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.6rem",
                  }}
                >
                  We have been working with Saba Lou since the middle of
                  September and are working to establish a more stable digital
                  presence and move her audience away from Spotify and towards{" "}
                  <span style={{ color: "#a89fe4" }}>more artist-centric</span>{" "}
                  spaces like Bandcamp and Substack.
                </p>
                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://tidal.com/artist/8785220/u"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Check out her music!
                  </a>
                </p>
              </article>

              {/* Emetres */}
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.5rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <img
                  style={{
                    width: "100%",
                    height: "220px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Efro Roster Pic.jpeg"
                    alt="Efro Roster Pic"
                >
                  {/* TODO: replace with Saba Lou image */}
                </img>
                <h3
                  style={{
                    color: "#bbe1ac",
                    fontSize: "1.1rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  Emetres
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                  }}
                >
                  Emetres is a Berlin-based,{" "}
                  <span style={{ color: "#a89fe4" }}>
                    Venezuelan-Catalan
                  </span>{" "}
                  singer-songwriter making soft Latin pop, pulling inspiration
                  from{" "}
                  <span style={{ color: "#a89fe4" }}>
                    The Marías, Vicentico Garcia and Muerdo
                  </span>
                  .
                </p>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.6rem",
                  }}
                >
                  Released in March 2025, her debut album{" "}
                  <em>Cuchibeats</em> explores a soundscape inspired at times by{" "}
                  <span style={{ color: "#a89fe4" }}>
                    contemporary electronic artists
                  </span>{" "}
                  as well as a strong Latin folk heritage. Throughout the album,
                  her songwriting focuses on capturing the sensitivity and
                  creative lyrical tradition of her roots.
                </p>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.6rem",
                  }}
                >
                  With Las Aguas, we are working on Laíz’s{" "}
                  <span style={{ color: "#a89fe4" }}>
                    digital strategy and content creation.
                  </span>
                </p>
                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://open.spotify.com/artist/0kyn948FvzvuJ5a2CJkUP3"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Check out her music!
                  </a>
                </p>
              </article>

              {/* CORP. */}
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.5rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <img
                  style={{
                    width: "100%",
                    height: "220px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Uwineza Roster Pic.jpeg"
                    alt="Uwineza Roster Pic"
                >
                  {/* TODO: replace with Saba Lou image */}
                </img>
                <h3
                  style={{
                    color: "#bbe1ac",
                    fontSize: "1.1rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  CORP.
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                  }}
                >
                  <span style={{ color: "#a89fe4" }}>
                    Viagra Boys meets MGMT
                  </span>
                  , Talking Heads, and Surf Curse. CORP. is a Berlin-based
                  “corporation” which radically disrupts consumers’ livelihoods
                  through high-risk post-punk and pop. Their first EP{" "}
                  <em>Employee Orientation</em> was released in Q2 2024,
                  followed by{" "}
                  <em>Whispers from the Watercooler</em> in Q1 2025.
                </p>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.6rem",
                  }}
                >
                  Left to right, Rory is the band’s drummer; Conor is the
                  founder and covers half of the vocals; Uli is on bass; and
                  Wouter is on guitar and the other half of the vocals.
                </p>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.6rem",
                  }}
                >
                  With Las Aguas, we are working on their{" "}
                  <span style={{ color: "#a89fe4" }}>
                    social media strategy, content creation and merch
                    production.
                  </span>
                </p>
                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://corp.band/?window=music"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Check out their music!
                  </a>
                </p>
              </article>

              {/* Facundo Swing */}
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.5rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <img
                  style={{
                    width: "100%",
                    height: "220px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Lemon Eye Roster Pic.jpeg"
                    alt="Lemon Eye Roster Pic"
                >
                  {/* TODO: replace with Saba Lou image */}
                </img>
                <h3
                  style={{
                    color: "#bbe1ac",
                    fontSize: "1.1rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  Facundo Swing
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                  }}
                >
                  Facundo Swing is a Germany-based project by Nicaraguan artist
                  Sebastian Barberena and producer Miguel Lee (who is also part
                  of the Las Aguas studio team). Miguel and Sebastian have been
                  making music together since they were 12 and now, living far
                  from Nicaragua, their music explores their roots and{" "}
                  <span style={{ color: "#a89fe4" }}>
                    celebrates the Nicaraguan culture of urban and alternative
                    music.
                  </span>
                </p>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.6rem",
                  }}
                >
                  Their debut album <em>Refréscate el Chip</em> came out in
                  December 2024 and our approach to growing the project is
                  rooted in social media first,{" "}
                  <span style={{ color: "#a89fe4" }}>
                    growing a digital presence that adds value to their
                    portfolio beyond the music.
                  </span>{" "}
                  This involves not only vertical short-form video, but making
                  sure the appropriate infrastructure is in place to take
                  advantage of social growth – merchandise, regular shows,
                  behind-the-scenes admin, and a structured web presence.
                </p>
                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem" }}>
                  <a
                    href="http://facundoswing.com/musica"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Check out their music!
                  </a>
                </p>
              </article>

              {/* Aura */}
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.5rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <img
                  style={{
                    width: "100%",
                    height: "220px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Aura Roster Pic.jpeg"
                    alt="Aura Roster Pic"
                >
                  {/* TODO: replace with Saba Lou image */}
                </img>
                <h3
                  style={{
                    color: "#bbe1ac",
                    fontSize: "1.1rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  Aura
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                  }}
                >
                  Aura is a{" "}
                  <span style={{ color: "#a89fe4" }}>Colombian</span>{" "}
                  singer-songwriter based in Berlin, making music influenced by
                  various genres rooted in{" "}
                  <span style={{ color: "#a89fe4" }}>traditional Latin styles</span>.
                  She is a classically trained vocalist and brings a detailed,
                  educated approach to her music creation that shapes both her
                  songwriting and her performances.
                </p>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.6rem",
                  }}
                >
                  Her first EP <em>MujerPlantaEco</em> came out in July 2024 and
                  her second, <em>Musgo</em>, in November 2024. Because of her
                  personal goals and target audience,{" "}
                  <span style={{ color: "#a89fe4" }}>
                    our focus has been on playlisting and publicity through
                    radio and print
                  </span>{" "}
                  over social media. Since her first EP, Aura has been featured
                  on a variety of playlists and radio shows across Germany and
                  Latin America, as well as covered by magazines such as
                  IndieRocks Mexico.
                </p>
                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem" }}>
                  {/* No direct link given in your HTML; you can add one here if you like */}
                  <span className="underline" style={{ color: "#599b40" }}>
                    Check out her music!
                  </span>
                </p>
              </article>

              {/* KOOB */}
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.5rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <img
                  style={{
                    width: "100%",
                    height: "220px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/KOOB Roster Pic.jpeg"
                    alt="KOOB Roster Pic"
                >
                  {/* TODO: replace with Saba Lou image */}
                </img>
                <h3
                  style={{
                    color: "#bbe1ac",
                    fontSize: "1.1rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  KOOB
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                  }}
                >
                  Dubbed “the Belarusian Soul Princess”, KOOB first appeared on
                  the public radar in{" "}
                  <span style={{ color: "#a89fe4" }}>Belarus</span> as the
                  frontwoman of the soul band Dee Tree. After two years of a
                  busy band life, she entered her solo path with the single{" "}
                  <em>Jungle</em>.
                </p>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.6rem",
                  }}
                >
                  In 2020 two things happened – the political crisis in Belarus
                  and a subsequent move to Berlin – both of which heavily
                  influenced her music. While preserving her soulful roots, KOOB
                  is shifting towards songs for social change,{" "}
                  <span style={{ color: "#a89fe4" }}>
                    mixing electronic sounds, field recordings, gospel and
                    Belarusian spirituals.
                  </span>
                </p>
                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://tidal.com/artist/40379216/u"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Check out her music!
                  </a>
                </p>
              </article>
            </div>
          </section>

          {/* OUR PORTFOLIO */}{/* 
          <section style={{ marginTop: "3rem" }}>
            <h2 className="site-heading" style={{ fontSize: "1.6rem" }}>
              Our Portfolio
            </h2>

            <div
              style={{
                display: "grid",
                gap: "2rem",
                gridTemplateColumns: "minmax(0,1fr)",
              }}
            >
              <article className="site-bodycopy">
                <p>
                  Starting at the first thing that needs to happen – audience
                  growth and digital organisation. Our focus here is a balance
                  between reach-oriented content on social media (usually short
                  form vertical video for Reels or TikTok) and making sure an
                  artist’s digital presence is optimised. This means making sure
                  DSP profiles are correctly set up, YouTube videos are
                  optimised for SEO, and that there is a website acting as a
                  central hub.
                </p>

                <p style={{ marginTop: "0.9rem" }}>
                  Here are some of the websites we have put together for our
                  artists:
                </p>

                <div
                  style={{
                    marginTop: "1rem",
                    marginBottom: "0.6rem",
                    width: "100%",
                    height: "200px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                  }}
                >

                </div>
                <p style={{ fontSize: "0.9rem", color: "#599b40" }}>
                  For CORP.’s website, we went for a vintage Windows OS look
                  that matches their office theme. The idea with any website is
                  to bring viewers into the world of the artist and provide a
                  central point of information for new people, existing fans and
                  press.
                </p>
                <p style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://corp.band"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Visit corp.band
                  </a>
                </p>


                <div
                  style={{
                    marginTop: "1.2rem",
                    marginBottom: "0.6rem",
                    width: "100%",
                    height: "200px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                  }}
                >

                </div>
                <p style={{ fontSize: "0.9rem", color: "#599b40" }}>
                  A more classic approach, Facundo Swing’s website conveys the
                  tropical nostalgia and relaxed energy of the band without
                  going too experimental.
                </p>
                <p style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://facundoswing.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Visit facundoswing.com
                  </a>
                </p>


                <div
                  style={{
                    marginTop: "1.2rem",
                    marginBottom: "0.6rem",
                    width: "100%",
                    height: "200px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                  }}
                >

                </div>
                <p style={{ fontSize: "0.9rem", color: "#599b40" }}>
                  Another website we made, this time for Laiz. This one is much
                  better in motion – it’s worth clicking through and exploring
                  the full experience.
                </p>
                <p style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://laizmusica.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Visit laizmusica.com
                  </a>
                </p>
              </article>


              <article className="site-bodycopy">
                <p>
                  Short-form vertical video is a necessary element of growing an
                  audience in today’s media landscape. We have{" "}
                  <a
                    href="https://docs.google.com/presentation/d/1WfDM20CUogbUYXYYbZD6bxo90kcuey7oPEqlx8j0up8/edit?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    a variety of different clip styles we like to use
                  </a>
                  , but in our experience the more creative the artist is
                  willing to get, the better.
                </p>

                <p style={{ marginTop: "0.8rem" }}>
                  To view examples of our short-form work, check out{" "}
                  <a
                    href="https://docs.google.com/presentation/d/1cHwknrQHhhB2I1AbCngKuB7WvSYlVR3niCwbrLHcBps/edit?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    this short presentation on Google Slides.
                  </a>
                </p>

                <p style={{ marginTop: "0.8rem" }}>
                  If you are interested in other types of short-form videos
                  we’ve done for clients,{" "}
                  <a
                    href="mailto:lasaguasproductions@gmail.com"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    just reach out here!
                  </a>
                </p>
              </article>


              <article className="site-bodycopy">
                <p>
                  Further down the marketing funnel, we’re looking at converting
                  your audience into mailing-list subscribers and, in the
                  future, paying customers.
                </p>
                <p style={{ marginTop: "0.8rem" }}>
                  While not specifically targeted at owned media or sales, we
                  feel that long-form video, audio or writing provides a way for
                  supporters to connect better and build relationships that last
                  longer and improve lifetime value.
                </p>

                <p style={{ marginTop: "0.8rem" }}>
                  Here is an example of a production breakdown we did with
                  Facundo Swing:
                </p>
                <div
                  style={{
                    marginTop: "0.6rem",
                    marginBottom: "0.6rem",
                    width: "100%",
                    height: "200px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                  }}
                >

                </div>

                <p style={{ marginTop: "0.8rem" }}>
                  And here is an example of a song breakdown we did with CORP.:
                </p>
                <div
                  style={{
                    marginTop: "0.6rem",
                    marginBottom: "0.6rem",
                    width: "100%",
                    height: "200px",
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                  }}
                >

                </div>

                <p style={{ marginTop: "0.8rem" }}>
                  If you’d like to get your digital strategy sorted, you can{" "}
                  <a
                    href="mailto:lasaguasproductions@gmail.com"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    reach out to us now
                  </a>{" "}
                  or{" "}
                  <Link
                    href="/forms/digital-strategy"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    fill out our digital strategy form
                  </Link>
                  .
                </p>
              </article>
            </div>
          </section>
/*}
          {/* LINK TO FULL BREAKDOWN PAGE */}
          <section style={{ marginTop: "3rem" }}>
            <Link
              href="/digital-strategy-process"
              className="site-btn site-btn--ghost"
            >
              Get into the technicals of our process behind digital strategy
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
