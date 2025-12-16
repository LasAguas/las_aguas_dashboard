// pages/tech-specs.js
import Head from "next/head";
import "../styles/site.css";
import SiteHeader from "../components/SiteHeader";
import Script from "next/script";

export default function TechSpecsPage() {
  return (
    <>
      <Head>
        <title>Tech Specs · Las Aguas Productions</title>
        <meta
          name="description"
          content="Studio tech specs for Las Aguas Productions in Berlin: monitoring chain, microphones, outboard gear and instruments."
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
          <h1 className="site-heading">Tech Specs</h1>

          {/* TODO: Replace the lists below with the actual gear spec content from Cargo */}
          <section className="site-bodycopy">
            <h2 style={{ marginTop: "1.5rem", fontWeight: 600 }}>Monitoring</h2>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
              <li>TODO – your monitors, subs, headphones, etc.</li>
            </ul>

            <h2 style={{ marginTop: "1.5rem", fontWeight: 600 }}>Microphones</h2>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
              <li>TODO – condenser mics list</li>
              <li>TODO – dynamic mics list</li>
            </ul>

            <h2 style={{ marginTop: "1.5rem", fontWeight: 600 }}>Outboard &amp; Interfaces</h2>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
              <li>TODO – interface / preamps / compressors</li>
            </ul>

            <h2 style={{ marginTop: "1.5rem", fontWeight: 600 }}>Instruments</h2>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
              <li>TODO – guitars, keys, drums etc.</li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
