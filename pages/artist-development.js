// pages/artist-development.js
import Head from "next/head";
import "../styles/site.css";
import SiteHeader from "../components/SiteHeader";
import Script from "next/script";

export default function ArtistDevelopmentPage() {
  return (
    <>
      <Head>
        <title>Artist Development · Las Aguas Productions</title>
        <meta
          name="description"
          content="Artist development support for independent artists in Berlin – vocal coaching, guitar coaching and guidance on building a sustainable team around your project."
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
          <h1 className="site-heading">Artist Development</h1>

          <div className="site-bodycopy">
            {/* TODO: Replace with your detailed artist development text */}
            <p>
              This is where we work with artists on the long-term picture:
              performance, recordings, live show readiness, and the structure
              around your project so you can stay independent.
            </p>
          </div>

          <section style={{ marginTop: "3rem" }}>
            <h2 className="site-heading" style={{ fontSize: "1.4rem" }}>
              Coaching
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gap: "1.5rem",
              }}
            >
              {/* Vocal coaching card */}
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.25rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "190px",
                    borderRadius: "1rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                >
                  {/* TODO: replace with vocal coach image */}
                </div>
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "#bbe1ac",
                  }}
                >
                  Vocal Coaching
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.5rem",
                  }}
                >
                  {/* TODO: coach name + bio from you */}
                  Work on studio and live performance, phrasing, stamina, and
                  translating emotion on record.
                </p>
              </article>

              {/* Guitar coaching card */}
              <article
                style={{
                  backgroundColor: "#271f5a",
                  borderRadius: "1.25rem",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(168,159,228,0.4)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "190px",
                    borderRadius: "1rem",
                    backgroundColor: "#000",
                    marginBottom: "0.9rem",
                  }}
                >
                  {/* TODO: replace with guitar coach image */}
                </div>
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: "#bbe1ac",
                  }}
                >
                  Guitar Coaching
                </h3>
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#599b40",
                    marginTop: "0.5rem",
                  }}
                >
                  {/* TODO: coach name + bio from you */}
                  Sessions focused on tone, arranging guitar parts for recordings
                  and building a live set that feels like the record.
                </p>
              </article>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
