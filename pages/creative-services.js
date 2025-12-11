// pages/creative-services.js
import Head from "next/head";
import Link from "next/link";
import "../styles/site.css";
import SiteHeader from "../components/SiteHeader";

export default function CreativeServicesPage() {
  return (
    <>
      <Head>
        <title>
          Creative Services · Mixing, Production &amp; Video – Las Aguas Productions
        </title>
        <meta
          name="description"
          content="Creative services for independent artists: mixing and mastering, tracking engineering, music production and videography from our Berlin-based studio."
        />
      </Head>

      <main className="site-page">
      <SiteHeader />
        <div className="site-page__inner">
          <h1 className="site-heading">Creative Services</h1>

          <div className="site-bodycopy">
            {/* TODO: paste the Our Services / Creative Services intro copy from Cargo */}
            <p>
              We provide creative services all the way from songwriting and production through to videography so you can promote the music you make. We strongly believe that quality  at each step is vital for the success of the next - "we'll fix it in the mix" is damaging at every stage, not just tracking.<br /><br />
              All services provided in English and Spanish.
            </p>
          </div>

          {/* VIDEOGRAPHY SECTION */}
          <section
            id="videography"
            style={{
              marginTop: "3rem",
              padding: "1.75rem 1.5rem",
              borderRadius: "1.5rem",
              backgroundColor: "#271f5a",
              border: "1px solid rgba(168,159,228,0.4)",
            }}
          >
            <h2 className="site-heading" style={{ fontSize: "1.5rem" }}>
              Videography
            </h2>
            <div className="site-bodycopy">
              {/* Lorem ipsum with requested ending sentence */}
              <p>
                The video work that we provide is typically sorted into three types: live shows, social media content, and music videos.
                To see examples of our work, <a href="/video-portfolio" className="underline text-[#a89fe4]">check out our portfolio!</a><br /><br />
                If you are interested in getting help with your social media content, maybe {" "}
                <a href="/digital-strategy" className="underline text-[#a89fe4]">
                check out our digital strategy services too
                </a>{" "} - this is where we build out your digital presence and create a marketing strategy for you so the work you put into your social media is not put to waste!
              </p>
            </div>

            {/* Image strip / placeholder carousel */}
            <div className="site-strip" style={{ marginTop: "1.75rem" }}>
            <div className="site-carousel">
            <div className="site-carousel__inner">

              <div className="site-carousel__item">
                <img 
                  src="/videography/CORP and Las Aguas.jpeg"
                  alt="CORP and Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/videography/Yannick Solandt Filming at the BMVAs.jpeg"
                  alt="Yannick Solandt Filming at the BMVAs"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/videography/Yannick Solandt Filming Live Session.jpeg"
                  alt="Yannick Solandt Filming Live Session"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/videography/Yannick Solandt filming Maia Valentine.jpeg"
                  alt="Yannick Solandt filming Maia Valentine"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/videography/Emetres Filming with Las Aguas.jpeg"
                  alt="Emetres Filming with Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/videography/Yannick Solandt Filming for Las Aguas.jpeg"
                  alt="Yannick Solandt Filming for Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/videography/Maia Valentine Live Session Team.jpeg"
                  alt="Maia Valentine Live Session Team"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/videography/Yannick Solandt Filming for Las Aguas Digital Strategy.jpeg"
                  alt="Yannick Solandt Filming for Las Aguas Digital Strategy"
                  className="site-carousel__img"
                />
              </div>
              
              <div className="site-carousel__item">
                <img 
                  src="/videography/Yannick at Drums Video.jpeg"
                  alt="Yannick at Drums Video"
                  className="site-carousel__img"
                />
              </div>
              
              <div className="site-carousel__item">
                <img 
                  src="/videography/Yannick Filming Sorvina Live Session 2.jpeg"
                  alt="Yannick Filming Sorvina Live Session 2"
                  className="site-carousel__img"
                />
              </div>
              
            </div>
          </div>
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <Link href="/forms/videography" className="site-btn site-btn--primary">
                Book in a shoot day!
              </Link>
            </div>
          </section>

          {/* TRACKING + PRODUCTION SECTION */}
          <section
            id="tracking-production"
            style={{
              marginTop: "2.75rem",
              padding: "1.75rem 1.5rem",
              borderRadius: "1.5rem",
              backgroundColor: "#271f5a",
              border: "1px solid rgba(168,159,228,0.4)",
            }}
          >
            <h2 className="site-heading" style={{ fontSize: "1.5rem" }}>
              Mixing &amp; Mastering
            </h2>
            <div className="site-bodycopy">
              {/* TODO: paste your mixing/mastering copy from Cargo */}
              <p>
                This is where we pull your track across the finish line! With both online and in-studio sessions, we work to pull your productions up to the professional standard of mixing and mastering so they sound great, regardless of the environment.
              </p>
            </div>
            <div style={{ marginTop: "1.25rem" }}>
              <Link
                href="/forms/mixing-mastering"
                className="site-btn site-btn--primary"
              >
                Book mixing &amp; mastering
              </Link>
            </div>
            <br /><br />
            <h2 className="site-heading" style={{ fontSize: "1.5rem" }}>
              Tracking Engineering &amp; Music Production
            </h2>
            <div className="site-bodycopy">
              {/* TODO: paste tracking/production copy from Cargo */}
              <p>
                Before you can have a perfect master, your mix has to be great. And before you can have a great mix, your tracking and production has to be just right.
                We offer tracking from our small two-room studio in Berlin - whether that's a full band or if you want to track instruments individually.
              </p>
            </div>

            <div className="site-strip" style={{ marginTop: "1.75rem" }}>
            <div className="site-carousel">
            <div className="site-carousel__inner">

              <div className="site-carousel__item">
                <img 
                  src="/tracking and engineering/Aura-and-Jair-at-Las-Aguas.jpeg"
                  alt="Aura and Jair at Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/tracking and engineering/Drum Kit at Las Aguas.jpeg"
                  alt="Drum Kit at Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/tracking and engineering/Maia Valentine at Las Aguas.jpeg"
                  alt="Maia Valentine at Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/tracking and engineering/Simon Timm at Las Aguas.jpeg"
                  alt="Simon Timm at Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/tracking and engineering/Nikolai and Efro at Las Aguas.jpeg"
                  alt="Nikolai and Efro at Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/tracking and engineering/Sebastian Sheath Saxophone.jpeg"
                  alt="Sebastian Sheath Saxophone"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/tracking and engineering/Nikolai Looft at Las Aguas.jpeg"
                  alt="Nikolai Looft at Las Aguas"
                  className="site-carousel__img"
                />
              </div>

            </div>
          </div>
            </div>
            <div style={{ marginTop: "1.25rem" }}>
              <Link
                href="/forms/music-production"
                className="site-btn site-btn--primary"
              >
                Get in touch to book
              </Link>
            </div><br /><br />
            <h2 className="site-heading" style={{ fontSize: "1.5rem" }}>
              Songwriting &amp; Arrangement
            </h2>
            <div className="site-bodycopy">
              {/* TODO: paste tracking/production copy from Cargo */}
              <p>
                The beginning of the process - songwriting and arrangment. 
                For this, we work with a variety of freelance songwriters and the team at Mesa Redonda to provide the essential services that bring your idea to life, before we even get into the technical processes with tracking, mixing, and mastering.
              </p>
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <Link
                href="/forms/music-production"
                className="site-btn site-btn--primary"
              >
                Start Your Project Now!
              </Link>
            </div>
          </section>

         {/* <div style={{ marginTop: "2.5rem" }}>
            <Link href="/tech-specs" className="site-btn site-btn--ghost">
              View studio tech specs
            </Link>
          </div> */}
        </div>
      </main>
    </>
  );
}
