// pages/digital-strategy-process.js
import Head from "next/head";
import Link from "next/link";
import "../styles/site.css";
import SiteHeader from "../components/SiteHeader";

export default function DigitalStrategyProcessPage() {
  return (
    <>
      <Head>
        <title>Digital Strategy Process · Las Aguas Productions</title>
        <meta
          name="description"
          content="A full breakdown of Las Aguas Productions' audience and income growth strategy for independent artists, based on funnel theory and Jay Abraham’s three-pronged income-growth model."
        />
      </Head>

      <main className="site-page">
      <SiteHeader />
        <div className="site-page__inner">
          {/* HEADER */}
          <h1 className="site-heading">
            A Full Breakdown of Audience and Income Growth Strategy
          </h1>

          <div className="site-bodycopy">
            <p>
              Here is the text-heavy breakdown on our approach and the marketing
              theories that uphold it.
            </p>

            <p>
              Our approach, as mentioned above, is built on Jay Abraham’s
              three-pronged approach to income growth and on the funnel approach
              to audience building. This is what we are currently working with
              based on a standard set of goals:
            </p>

            <ol>
              <li>
                Building a fanbase that is owned outside of social media —
                meaning artists maintain contact with their fans directly,
                bypassing the power of major platforms like Instagram.
              </li>
              <li>
                Securing regular income for independent artists that is minimally
                dictated by rollout cycles.
              </li>
              <li>
                Making sure the gap between the actual income and the potential
                income (as dictated by fans) is as small as possible.
              </li>
            </ol>

            <p style={{ marginTop: "1rem", fontStyle: "italic" }}>
              “The goal of social media is to turn fans into customers, and
              customers into advocates.”
              <br />– Jay Baer, marketing consultant.
            </p>

            <p>
              (Source: <em>Hug Your Haters</em>)
            </p>

            <p>
              These goals are built into our strategy at several phases of the
              funnel approach. While this changes case by case, there are four
              main stages of the funnel that we use for reference:
            </p>

            <ol>
              <li>
                <strong>Building attention:</strong> getting your art and brand
                in front of people who may be interested in what you make but
                have never heard of you before. This phase emphasises reach on
                social media.
              </li>
              <li>
                <strong>Turning attention into awareness:</strong> delivering
                consistently recognisable imagery to build brand recognition in
                people at the “attention” stage. This encourages profile visits
                and social following.
              </li>
              <li>
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

            <p style={{ marginTop: "1rem", fontStyle: "italic" }}>
              “Social media is about the people! Not about your business. Provide
              for the people and the people will provide for you.”
              <br />– Matt Goulart, founder of Ignite Digital.
            </p>

            <p>
              (Source: Ignite Digital Blog)
            </p>

            <p>
              Each stage of this funnel requires a different set of content —
              and at every level the content must remain authentic to you and
              your music. “Authentic” is often wrongly interpreted as handheld,
              intimate videos, but we do not share that view. Authenticity means
              you actually like what you are making for social media, and you
              are proud to share it.
            </p>

            <p>
              While the funnel secures audience ownership and prepares the
              foundation for monetisation, it does not complete our three goals
              alone. As mentioned earlier, our strategy is heavily influenced by
              the three-pronged approach to income growth described by Jay
              Abraham in his book{" "}
              <em>Getting Everything You Can Out of All You’ve Got</em>. This
              method defines the three universal ways to increase income in any
              business:
            </p>

            <ol>
              <li>
                <strong>Increase the number of customers</strong>  
                — “<em>The easiest way to grow your business is to get more
                customers.</em>” This can be done through targeted marketing,
                partnerships, or expanding your reach.
              </li>
              <li>
                <strong>Increase the average transaction value</strong>  
                — “<em>The profit is in the upsell.</em>” This includes premium
                products, bundles, or add-ons.
              </li>
              <li>
                <strong>Increase the frequency of transactions</strong>  
                — “<em>The best customer is the one you already have.</em>”
                Programs like subscriptions, loyalty rewards, or regular
                promotions encourage recurring support.  
                For musicians, this relates directly to live show frequency,
                fan-engagement cycles, and monetising the gaps between releases.
              </li>
            </ol>

            <p style={{ marginTop: "1.25rem" }}>
              If you have any questions, feel free to{" "}
              <a
                href="mailto:lasaguasproductions@gmail.com"
                className="underline text-[#a89fe4]"
              >
                reach out by email to book a strategy session!
              </a>
            </p>

            <h2 className="site-heading" style={{ fontSize: "1.3rem", marginTop: "2.5rem" }}>
              Sources
            </h2>

            <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem" }}>
              <li>
                Abraham, J. (2000). <em>Getting Everything You Can Out of All
                You’ve Got</em>. Truman Talley Books.
              </li>
              <li>
                Baer, J. (2016). <em>Hug Your Haters</em>. Portfolio/Penguin.
              </li>
              <li>
                Goulart, M. “Social media is about the people…” Ignite Digital
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
