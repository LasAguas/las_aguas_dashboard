// pages/index.js
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import "../styles/site.css";
import HomeMenuIcon from "../components/HomeMenuIcon";
import Script from "next/script";

export default function HomePage() {
  const router = useRouter();

  const handleHelpChange = (e) => {
    const value = e.target.value;
    if (!value) return;

    switch (value) {
      case "mixing-mastering":
        router.push("/creative-services#tracking-production");
        break;
      case "music-production":
        router.push("/creative-services#tracking-production");
        break;
      case "artist-development":
        router.push("/artist-development");
        break;
      case "video":
        router.push("/creative-services#videography");
        break;
      case "social-media":
        router.push("/digital-strategy");
        break;
      case "branding-marketing":
        router.push("/digital-strategy");
        break;
      case "monetising-music":
        router.push("/digital-strategy");
        break;
      default:
        break;
    }

    // reset dropdown so the placeholder text comes back
    e.target.value = "";
  };

  return (
    <>
      <Head>
        <title>Las Aguas Productions Label Services</title>
        <meta
          name="description"
          content="Las Aguas Productions is a Berlin-based music studio and label services team helping independent artists with tracking, mixing, mastering, artist development, creative production, and digital strategy."
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
      <HomeMenuIcon />
        <div className="site-page__inner">
          {/* HERO */}
          <section className="site-hero" aria-labelledby="home-hero-heading">
            <div>
              <div className="site-hero__eyebrow">
                Las Aguas Productions · Creative and Label Services
              </div>
              <h1 id="home-hero-heading" className="site-hero__title">
                You be the artist, we handle{" "}
                <span className="site-hero__title-accent">the tech</span>
              </h1>

              <p className="site-hero__body">
                Independent artists are confronted with an unmanageable set of
                challenges: learning to produce, mix, master, play instruments,
                write, shoot and edit video, and, on top of all of it, paying
                extortionate prices for studios and event spaces.
                <br />
                <br />
                Working to help overcome this, we provide professional level
                tracking, mixing, and mastering services from our studio in
                Lichtenberg.
              </p>

              <div className="site-hero__buttons">
                {/* Homepage CTA now goes to general contact form */}
                <Link href="/forms/contact" className="site-btn site-btn--primary">
                  Get in Touch!
                </Link>
              </div>
            </div>

            {/* Visual placeholder: replace with a real studio image later */}
            <div className="site-hero__image" aria-hidden="true">
                <img 
                  src="/homepage/Headphones at Las Aguas.jpeg"
                  alt="Headphones at Las Aguas"
                  className="site-hero__img"
                />
              {/* You can swap this whole div for an <img /> once you have assets */}
              <div className="site-hero__image-tag">Berlin · Studio & Label Services</div>
            </div>
          </section>

          {/* CAROUSEL STRIP */}
          <section className="site-strip" aria-label="Las Aguas projects">
          <div className="site-strip__label">Selected work &amp; BTS</div>

          <div className="site-carousel">
            <div className="site-carousel__inner">

              <div className="site-carousel__item">
                <img 
                  src="/homepage/Aura and Jair at Las Aguas.jpeg"
                  alt="Aura and Jair at Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/homepage/Yannick Solandt Filming for Las Aguas.jpeg"
                  alt="Yannick Solandt filming for Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/homepage/Emetres Filming with Las Aguas.jpeg"
                  alt="Emetres filming with Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/homepage/Nikolai Looft on Drums at Las Aguas.jpeg"
                  alt="Nikolai Looft on drums at Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/homepage/Yannick Solandt Filming for Las Aguas Digital Strategy.jpeg"
                  alt="Yannick Solandt filming digital strategy content for Las Aguas"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/homepage/Sebastian in Old Las Aguas Studio.jpeg"
                  alt="Sebastian in Old Las Aguas studio"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/homepage/Yannick and Sebastian at the BMVAs.jpeg"
                  alt="Yannick and Sebastian at the BMVAs"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/homepage/Las Aguas Team.jpeg"
                  alt="Las Aguas Team"
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/homepage/Wouter from CORP..jpeg"
                  alt="Wouter from CORP."
                  className="site-carousel__img"
                />
              </div>

              <div className="site-carousel__item">
                <img 
                  src="/homepage/Sebastian Sheath Saxophone.jpeg"
                  alt="Sebastian Sheath Saxophone"
                  className="site-carousel__img"
                />
              </div>

            </div>
          </div>
        </section>


          {/* “I need help with…” */}
          <section className="site-help">
            <p className="site-help__label">I need help with…</p>
            <div className="site-help__controls">
              <select
                defaultValue=""
                className="site-select"
                onChange={handleHelpChange}
              >
                <option value="" disabled>
                  Choose an option
                </option>
                <option value="mixing-mastering">Mixing and mastering</option>
                <option value="music-production">Music production</option>
                {/*<option value="artist-development">Artist development</option>*/}
                <option value="video">Video</option>
                <option value="social-media">Social media</option>
                <option value="branding-marketing">Branding and marketing</option>
                <option value="monetising-music">Monetising my music</option>
              </select>

              
            </div>

            <p className="site-footer-note">
              We work primarily with music professionals and independent
              artists who want to stay in control of their masters while
              building teams around studio, strategy, and release campaigns.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
