// pages/digital-strategy.js
import Head from "next/head";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import "../styles/site.css";
import Script from "next/script";

export default function DigitalStrategyPage() {
  return (
    <>
      <Head>
        <title>Digital Strategy · Las Aguas Productions</title>
        <meta
          name="description"
          content="Digital strategy services for independent and Latin-American artists: audience growth, social media systems, web presence, and long-term income strategy."
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
              Book a Meeting!
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
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Saba Lou Roster Pic.jpg"
                    alt="Saba Lou Roster Pic"
                    className="roster-img"
                >
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

              {/* Efro */}
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
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Efro Roster Pic.jpg"
                    alt="Efro Roster Pic"
                    className="roster-img"
                >

                </img>
                <h3
                  style={{
                    color: "#bbe1ac",
                    fontSize: "1.1rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  Efro
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                  }}
                >
                  Efro is a Berlin-based,{" "}
                  <span style={{ color: "#a89fe4" }}>
                    indie rock
                  </span>{" "}
                  artist making music that falls somewhere in between{" "}
                  <span style={{ color: "#a89fe4" }}>
                  Radiohead and PJ Harvey
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
                  Efro's first full album is coming soon and we are working with her to build out her digital presence in the lead up to the release.
                </p>

                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://open.spotify.com/artist/26VdeiPhYb7YIg9LpXMTdw"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Check out her music!
                  </a>
                </p>
              </article>

              {/* CONEXION. */}
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
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Conexion Roster Pic.jpg"
                    alt="Conexion - Salsa Live Band Roster Pic"
                    className="roster-img"
                >
                </img>
                <h3
                  style={{
                    color: "#bbe1ac",
                    fontSize: "1.1rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  CONEXIÓN - SALSA LIVE BAND
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                  }}
                >
                  CONEXIÓN is a sextet of musicians from
                  <span style={{ color: "#a89fe4" }}>
                    Cuba, Colombia, & Germany,
                  </span>
                  that have come together to form a salsa band, bringing fiery music to Berlin's small salsa scene. <br /><br />
                  Their bi-monthly event, ¡VAMOS A BAILAR!, is the perfect example, regularly filling the dancefloor of Pfefferberg Haus 13, Berlin, with
                  and hosting a Salsa dance class before the show for the first-timers!
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
                    social media and marketing strategy.
                  </span>
                </p>
                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://conexion-salsa.com/termine-2-2-2-2/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Check out their upcoming shows!
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
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Lemon Eye Roster Pic.jpg"
                    alt="Lemon Eye Roster Pic"
                    className="roster-img"
                >
                </img>
                <h3
                  style={{
                    color: "#bbe1ac",
                    fontSize: "1.1rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  Lemon Eye
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                  }}
                >

                  Lemon Eye spent some time jumping between genres: rock, chamber pop, and RnB, but now they've got it figured out. 
                  Their new single Honey? exactly what they want to sound like. <span style={{ color: "#a89fe4" }}>A mix of rock energy, indie cool, and just the right amount of miam miam, mmmmm, and grrr.</span> 
                  It’s got all the attitude and all the heart. <br /><br />
                  Band members: Aicha (vocals/guitar), Ada (lead guitar), AC (backing vocals/cello), Julien (bass) and Jakob (drums).
                </p>
                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://open.spotify.com/artist/0TWRk3ga3JAtCHFyGZFWiT"
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
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Aura Roster Pic.jpg"
                    alt="Aura Roster Pic"
                    className="roster-img"
                >
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

              {/* Silver Omen */}
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
                    borderRadius: "1.25rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/roster/Silver Omen Roster Pic.jpg"
                    alt="Silver Omen Roster Pic"
                    className="roster-img"
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
                  Silver Omen
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                  }}
                >
                  Silver Omen is an {" "} <span style={{ color: "#a89fe4" }}> Argentine </span> Berlin-based dance pop artist, whose approach to pop blends deep topics of sexuality, self-image, and acceptance with the light and the dark of a life lived in the Berlin club and party scene. His music is a mix of influences including{" "}
                  <span style={{ color: "#a89fe4" }}> The Weeknd, Charli XCX, Troye Sivan, and Robyn.</span> 
                </p>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.6rem",
                  }}
                >
                  His artist name is a direct reference to his roots: “Silver” represents Argentina, named after the Latin word argentum,
                  while “Omen” symbolizes the duality of his themes – finding the good in the bad, and the bad in the good.
                  Even at the end of the world, his music leaves room to {" "}
                  <span style={{ color: "#a89fe4" }}>
                    dance and shine.
                  </span>
                </p>
                {/*<p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.6rem",
                  }}
                >
                  With Las Aguas, we are working on their{" "}
                  <span style={{ color: "#a89fe4" }}>
                    social media and marketing strategy.
                  </span>
                </p>*/}
                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem" }}>
                  <a
                    href="https://tidal.com/artist/57012043/u"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "#599b40" }}
                  >
                    Check out his music!
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
