// pages/tech-specs.js
import Head from "next/head";
import "../styles/site.css";
import SiteHeader from "../components/SiteHeader";

export default function TechSpecsPage() {
  return (
    <>
      <Head>
        <title>Tech Specs · Las Aguas Productions</title>
        <meta
          name="description"
          content="Studio tech specs for Las Aguas Productions in Berlin: monitoring chain, microphones, outboard gear and instruments."
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
