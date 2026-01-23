// pages/about.js
import Head from "next/head";
import "../styles/site.css";
import SiteHeader from "../components/SiteHeader";
import Script from "next/script";

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About · Las Aguas Productions</title>
        <meta
          name="description"
          content="Learn more about Las Aguas Productions, a Berlin-based music studio and label services team supporting independent artists from Berlin and beyond."
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
          <h1 className="site-heading">About Las Aguas Productions</h1>

          <div className="site-bodycopy">
            {/* TODO: Paste the full About text from your Cargo site here */}
            <p>
              Las Aguas Productions is a music studio and label services hub
              based in Berlin. We work with independent artists and small labels
              that want professional support without giving up control of their
              masters or creative direction.
            </p>
            <p style={{ marginTop: "1rem" }}>
              Our work sits at the intersection of studio production, artist
              development, and digital strategy. We run sessions from our space
              in Lichtenberg and support releases for artists across Berlin and
              Latin America.
            </p>
          </div>

          {/* Example team layout – fill in with your real people */}
          <section style={{ marginTop: "3rem" }}>
            <h2 className="site-heading" style={{ fontSize: "1.4rem" }}>
              The team
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gap: "1.5rem",
              }}
            >
              {/* TODO: Replace with your real team members + copy from Cargo */}
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.25rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <img
                  style={{
                    width: "100%",
                    height: "350px",
                    borderRadius: "1rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/about/Miguel Lee in Studio.jpeg"
                    alt="Miguel Lee in Studio"
                    className="About-Image"
                >
                </img>
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "#bbe1ac",
                  }}
                >
                  {/* Name */}
                  Miguel Lee
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.5rem",
                  }}
                >
                  {/* Bio text from Cargo */}
                  Miguel is a music producer and sound engineer with a background in latin influenced production. His work spans in reggaeton, indie latin, pop, and house, with additional experience in punk, experimental, and alternative projects.
                  <br /><br />
                  His work extends to sound design, post-production, and film scoring. At Las Aguas Miguel is also reponsible for artist relations and outreach.
                  <br /><br />
                  Languages: English, Spanish
                </p>
              </article>
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.25rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <img
                  style={{
                    width: "100%",
                    height: "350px",
                    borderRadius: "1rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/about/Sebastian Sheath in Studio.jpeg"
                    alt="Sebastian Sheath in Studio"
                    className="About-Image"
                >
                </img>
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "#bbe1ac",
                  }}
                >
                  {/* Name */}
                  Sebastian Sheath
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.5rem",
                  }}
                >
                  {/* Bio text from Cargo */}
                  Sebastian is a multi-instrumentalist producer and tracking/mixing engineer. Focussing on live sounds, his specialty lies in arrangement, vocal and instrumental production, and the mixing following that.
                  <br /><br />
                  Sebastian is the head of Las Aguas, handling the company's organisation and most of the marketing for digital strategy.
                  <br /><br />
                  Languages: English, Spanish, German
                </p>
              </article>
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.25rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <img
                  style={{
                    width: "100%",
                    height: "380px",
                    borderRadius: "1rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                    src="/about/Yannick Solandt on Set.png"
                    alt="Yannick Solandt on Set"
                    className="About-Image"
                >
                </img>
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "#bbe1ac",
                  }}
                >
                  {/* Name */}
                  Yannick Solandt
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.5rem",
                  }}
                >
                  {/* Bio text from Cargo */}
                  Yannick is the head of videography at Las Aguas Productions. He handles the visuals for live sessions or any other video projects Las Aguas takes on.
                  <br /><br />
                  His specialty is in videography for live events, including live editing for interviews and podcasts, and capturing musical performances.
                  <br /><br />
                  Yannick also handles the editing for Las Aguas projects, making sure the projects carry a cohesive vision from start to finish.
                </p>
              </article>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
