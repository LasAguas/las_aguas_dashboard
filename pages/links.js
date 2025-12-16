// pages/links.js
import Head from "next/head";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import "../styles/site.css";
import Script from "next/script";

export default function LinksPage() {
  return (
    <>
      <Head>
        <title>Las Aguas · Links</title>
        <meta
          name="description"
          content="Quick links to Las Aguas Productions."
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

      <SiteHeader />

      <main
        className="site-container"
        style={{
          minHeight: "100vh",
          paddingTop: "3rem",
          paddingBottom: "4rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingBottom: "20vh",
          maxWidth: "90vw",
          margin: "0 auto",
          gap: "1.25rem",
        }}
      >
        {/* BUTTON SET — NO HEADING */}
        {/* MAIN WEBSITE */}
        <Link href="/" legacyBehavior>
          <a className="linktree-btn">Website</a>
        </Link>

        {/* DIGITAL STRATEGY */}
        <Link href="/digital-strategy" legacyBehavior>
          <a className="linktree-btn">Digital Strategy</a>
        </Link>

        {/* SABA LOU TICKETS */}
        <a
          href="https://sabalouland.com/rhinoceros-tickets"
          target="_blank"
          rel="noopener noreferrer"
          className="linktree-btn"
        >
          Saba Lou · Rhinoceros Tickets
        </a>

        {/* CREATIVE SERVICES */}
        <Link href="/creative-services" legacyBehavior>
          <a className="linktree-btn">Creative Services</a>
        </Link>
      </main>

      <style jsx>{`
        /* Full dark purple background */
        body,
        html,
        :global(#__next) {
          background: #271f5a !important;
        }

        /* Perfect unified button design */
        .linktree-btn {
          display: block;
          width: 100%;
          padding: 1.1rem 1.4rem;

          background: #a89fe4; /* light purple */
          color: #271f5a; /* dark purple */

          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.22);

          font-size: 1.05rem;
          font-weight: 600;
          text-align: center;

          transition: background 0.18s ease, transform 0.15s ease;
        }

        .linktree-btn:hover {
          background: #bcb4f2;
          transform: translateY(-2px);
        }
      `}</style>
    </>
  );
}
