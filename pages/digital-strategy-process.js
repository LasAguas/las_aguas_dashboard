// pages/digital-strategy-process.js
import Head from "next/head";
import Link from "next/link";
import "../styles/site.css";
import SiteHeader from "../components/SiteHeader";
import Script from "next/script";

export default function DigitalStrategyProcessPage() {
  return (
    <>
      <Head>
        <title>Digital Strategy Process · Las Aguas Productions</title>
        <meta
          name="description"
          content="A full breakdown of Las Aguas Productions' audience and income growth strategy for independent artists, based on funnel theory and Jay Abraham’s three-pronged income-growth model."
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
          {/* HEADER */}
          <h1 className="site-heading">
            A Full Breakdown of Audience and Income Growth Strategy
          </h1>

          <div className="site-bodycopy" style={{ lineHeight: "1.7" }}>
            <p>
              Here is the text-heavy breakdown on our approach and the marketing
              theories that uphold it.
            </p>

            <p style={{ marginTop: "0.75rem" }}>
              If you are looking for practical tools and guides instead, head
              over to our{" "}
              <Link href="/resources" className="underline text-[#a89fe4]">
                free resources page
              </Link>
              .
            </p>

            {/* -------------------------------------------------------- */}
            {/* SECTION 1: Our Goals                                      */}
            {/* -------------------------------------------------------- */}
            <h2 className="site-heading" style={{ fontSize: "1.3rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>
              Our Goals
            </h2>

            <p>
              Our approach is built on Jay Abraham's three-pronged approach to
              income growth and on the funnel approach to audience building.
              This is what we are currently working with based on a standard set
              of goals:
            </p>

            <ol style={{ marginTop: "1rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                Building a fanbase that is owned outside of social media —
                meaning artists maintain contact with their fans directly,
                bypassing the power of major platforms like Instagram.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                Securing regular income for independent artists that is
                minimally dictated by rollout cycles.
              </li>
              <li>
                Making sure the gap between the actual income and the potential
                income (as dictated by fans) is as small as possible.
              </li>
            </ol>

            <blockquote style={{ marginTop: "1.5rem", paddingLeft: "1rem", borderLeft: "3px solid rgba(168, 159, 228, 0.5)", fontStyle: "italic" }}>
              "The goal of social media is to turn fans into customers, and
              customers into advocates."
              <br />
              <span style={{ fontStyle: "normal", fontSize: "0.85rem" }}>
                — Jay Baer, marketing consultant. (Source:{" "}
                <em>Hug Your Haters</em>)
              </span>
            </blockquote>

            {/* -------------------------------------------------------- */}
            {/* SECTION 2: The Funnel                                     */}
            {/* -------------------------------------------------------- */}
            <h2 className="site-heading" style={{ fontSize: "1.3rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>
              The Funnel
            </h2>

            <p>
              These goals are built into our strategy at several phases of the
              funnel approach. While this changes case by case, there are four
              main stages of the funnel that we use for reference:
            </p>

            <ol style={{ marginTop: "1rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.75rem" }}>
                <strong>Building attention:</strong> getting your art and brand
                in front of people who may be interested in what you make but
                have never heard of you before. This phase emphasises reach on
                social media.
              </li>
              <li style={{ marginBottom: "0.75rem" }}>
                <strong>Turning attention into awareness:</strong> delivering
                consistently recognisable imagery to build brand recognition in
                people at the "attention" stage. This encourages profile visits
                and social following.
              </li>
              <li style={{ marginBottom: "0.75rem" }}>
                <strong>Turning awareness into followership:</strong> bringing
                people one step further into being connected to your work. This
                may mean moving them to YouTube to watch documentaries or to a
                mailing list so they can stay up to date with shows.
              </li>
              <li>
                <strong>Turning followership into fandom:</strong> the final
                stage — creating experiences and content that allow fans to
                actually support your project. This includes first-time show
                visitors, merch buyers, and Patreon subscribers.
              </li>
            </ol>

            <blockquote style={{ marginTop: "1.5rem", paddingLeft: "1rem", borderLeft: "3px solid rgba(168, 159, 228, 0.5)", fontStyle: "italic" }}>
              "Social media is about the people! Not about your business.
              Provide for the people and the people will provide for you."
              <br />
              <span style={{ fontStyle: "normal", fontSize: "0.85rem" }}>
                — Matt Goulart, founder of Ignite Digital. (Source: Ignite
                Digital Blog)
              </span>
            </blockquote>

            {/* -------------------------------------------------------- */}
            {/* SECTION 3: Authenticity                                   */}
            {/* -------------------------------------------------------- */}
            <h2 className="site-heading" style={{ fontSize: "1.3rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>
              Authenticity in Content
            </h2>

            <p>
              Each stage of this funnel requires a different set of content —
              and at every level the content must remain authentic to you and
              your music.
            </p>

            <p style={{ marginTop: "0.75rem" }}>
              "Authentic" is often wrongly interpreted as handheld, intimate
              videos, but we do not share that view. Authenticity means you
              actually like what you are making for social media, and you are
              proud to share it.
            </p>

            <p style={{ marginTop: "0.75rem" }}>
              For practical content ideas at each stage of the funnel, check out
              our{" "}
              <Link href="/resources" className="underline text-[#a89fe4]">
                templates and guides
              </Link>
              .
            </p>

            {/* -------------------------------------------------------- */}
            {/* SECTION 4: Income Growth Model                            */}
            {/* -------------------------------------------------------- */}
            <h2 className="site-heading" style={{ fontSize: "1.3rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>
              Income Growth Model
            </h2>

            <p>
              While the funnel secures audience ownership and prepares the
              foundation for monetisation, it does not complete our three goals
              alone.
            </p>

            <p style={{ marginTop: "0.75rem" }}>
              Our strategy is heavily influenced by the three-pronged approach
              to income growth described by Jay Abraham in his book{" "}
              <em>Getting Everything You Can Out of All You've Got</em>. This
              method defines the three universal ways to increase income in any
              business:
            </p>

            <ol style={{ marginTop: "1rem", marginBottom: "1rem" }}>
              <li style={{ marginBottom: "0.75rem" }}>
                <strong>Increase the number of customers</strong>
                <br />
                This can be done through targeted marketing, partnerships, or
                expanding your reach.
              </li>
              <li style={{ marginBottom: "0.75rem" }}>
                <strong>Increase the average transaction value</strong>
                <br />
                This includes premium products, bundles, or add-ons.
              </li>
              <li>
                <strong>Increase the frequency of transactions</strong>
                <br />
                Programs like subscriptions, loyalty rewards, or regular
                promotions encourage recurring support. For musicians, this
                relates directly to live show frequency, fan-engagement cycles,
                and monetising the gaps between releases.
              </li>
            </ol>

            {/* -------------------------------------------------------- */}
            {/* CTA                                                       */}
            {/* -------------------------------------------------------- */}
            <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(168, 159, 228, 0.35)" }}>
              <p>
                For free tools to help you apply these principles, visit our{" "}
                <Link href="/resources" className="underline text-[#a89fe4]">
                  resources page
                </Link>
                .
              </p>

              <p style={{ marginTop: "0.75rem" }}>
                If you have any questions, feel free to{" "}
                <a
                  href="mailto:lasaguasproductions@gmail.com"
                  className="underline text-[#a89fe4]"
                >
                  reach out by email
                </a>{" "}
                to book a strategy session!
              </p>
            </div>

            {/* -------------------------------------------------------- */}
            {/* Sources                                                   */}
            {/* -------------------------------------------------------- */}
            <h2 className="site-heading" style={{ fontSize: "1.3rem", marginTop: "2.5rem", marginBottom: "0.75rem" }}>
              Sources
            </h2>

            <ul style={{ paddingLeft: "1.2rem" }}>
              <li style={{ marginBottom: "0.4rem" }}>
                Abraham, J. (2000). <em>Getting Everything You Can Out of All
                You've Got</em>. Truman Talley Books.
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                Baer, J. (2016). <em>Hug Your Haters</em>. Portfolio/Penguin.
              </li>
              <li style={{ marginBottom: "0.4rem" }}>
                Goulart, M. "Social media is about the people…" Ignite Digital
                Blog.{" "}
                <a
                  href="https://ignitedigital.com/resources/blog/"
                  className="underline text-[#a89fe4]"
                  target="_blank"
                >
                  https://ignitedigital.com/resources/blog/
                </a>
              </li>
              <li>
                Chaffey, D. &amp; Smith, P. (2022).{" "}
                <em>Digital Marketing Excellence</em>. Routledge.
              </li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
