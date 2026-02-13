// pages/faqs.js
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import "../styles/site.css";
import HomeMenuIcon from "../components/HomeMenuIcon";

/* ------------------------------------------------------------------ */
/* Links used across answers                                           */
/* ------------------------------------------------------------------ */
const LINKS = {
  youtube: "https://www.youtube.com/@LasAguasProductions?sub_confirmation=1",
  resources: "/resources",
  digitalStrategyForm: "/forms/digital-strategy",
  /* TODO: update this to the specific video link when available */
  youtubeBranding: "https://www.youtube.com/@LasAguasProductions?sub_confirmation=1",
  contentDeck:
    "https://docs.google.com/presentation/d/1WfDM20CUogbUYXYYbZD6bxo90kcuey7oPEqlx8j0up8/edit?usp=sharing",
};

/* ------------------------------------------------------------------ */
/* Collapsible FAQ Item — site style (dark purple bg, green accents)   */
/* ------------------------------------------------------------------ */
function FAQItem({ question, children, id }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl border border-[#a89fe4]/30 bg-[#271f5a] overflow-hidden"
      id={id}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
        aria-expanded={open}
        aria-controls={id ? `${id}-answer` : undefined}
      >
        <span className="text-sm font-semibold text-[#bbe1ac]">{question}</span>
        <span className="text-xs rounded-lg px-2 py-1 bg-[#a89fe4]/20 text-[#a89fe4] shrink-0">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div
          className="px-5 pb-5 text-sm text-[#599b40] leading-relaxed space-y-3"
          id={id ? `${id}-answer` : undefined}
          role="region"
          aria-labelledby={id}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */
function SectionHeading({ children }) {
  return (
    <h2 className="text-lg font-bold text-[#bbe1ac] mt-8 mb-3">{children}</h2>
  );
}

/* ------------------------------------------------------------------ */
/* Structured data for SEO (JSON-LD FAQPage)                          */
/* ------------------------------------------------------------------ */
function faqStructuredData() {
  const items = [
    {
      q: "What is music marketing?",
      a: "Music marketing is the reaching of a new audience, maintaining relationships with existing fans, developing a strategy around your full artist project that communicates your brand image, and creating great sales offers that create sustainable and consistent income from your music.",
    },
    {
      q: "How does music marketing work?",
      a: "Las Aguas' music marketing strategy is built around a marketing funnel. The concept is to reach new people and develop their relationship with your project to and beyond the point where they become fans and customers.",
    },
    {
      q: "What is digital strategy for musicians?",
      a: "Digital strategy is the development and maintenance of your social media marketing and digital presence, from websites to streaming platforms, optimised to create a great fan experience and pull the right people into your fan and customer base.",
    },
    {
      q: "How do musicians make money online?",
      a: "Musicians typically create several income streams including merch sales through a webstore, digital subscriptions with gated content, streaming services, sync licensing, selling digital copies of music, livestreaming, crowdfunding, and affiliate and brand partnerships.",
    },
    {
      q: "Does mixing and mastering matter?",
      a: "Mixing and mastering are very important if you want your music to sound professional. Without professional mixing and mastering, music cannot reach into professional areas like editorial playlists or culture magazines.",
    },
    {
      q: "Do independent artists need a team?",
      a: "Yes, independent artists absolutely need a team. When you have the budget for label services or are spending time on business that could be spent on music, you should look for a team of professionals or a label services company.",
    },
    {
      q: "What is label services for artists?",
      a: "Label services is the provision of services that labels provide but without predatory deal structures. Artists pay the company and retain creative freedom and publishing rights. Services usually include marketing, videography, songwriting, artist development, production, mixing and mastering, and merch production.",
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function PublicFAQsPage() {
  return (
    <>
      <Head>
        <title>
          Music Marketing &amp; Digital Strategy FAQs · Las Aguas Productions
        </title>
        <meta
          name="description"
          content="Answers to common questions about music marketing, digital strategy, video production, audio services, and label services for independent artists. Free guidance from Las Aguas Productions."
        />
        <meta
          name="keywords"
          content="music marketing, digital strategy for musicians, independent artist marketing, music video production, mixing and mastering, label services, artist development, Las Aguas Productions"
        />
        <link rel="canonical" href="https://lasaguasproductions.com/faqs" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqStructuredData()),
          }}
        />
      </Head>

      <main className="site-page">
        <HomeMenuIcon />
        <div className="site-page__inner">
          {/* HERO */}
          <header className="mb-6">
            <div className="site-hero__eyebrow">Las Aguas Productions</div>
            <h1 className="site-heading">
              Frequently Asked Questions
            </h1>
            <p className="site-bodycopy">
              Everything you need to know about music marketing, digital
              strategy, video production, audio services, and working with a
              label-services team as an independent artist.
            </p>
          </header>

          <div className="space-y-3 max-w-3xl">
            {/* ====================================================== */}
            {/* CORE "WHAT / HOW" INTENT                               */}
            {/* ====================================================== */}
            <SectionHeading>Music Marketing &amp; Digital Strategy</SectionHeading>

            <FAQItem question="What is music marketing?" id="faq-what-is-music-marketing">
              <p>
                Music marketing, in the way that we view it, is not only the
                reaching of a new audience, but maintaining relationships with
                existing fans, developing a strategy around your full artist
                project that communicates your brand image, and creating great
                sales offers that create sustainable and consistent income from
                your music.
              </p>
            </FAQItem>

            <FAQItem question="How does music marketing work?" id="faq-how-music-marketing-works">
              <p>
                Our music marketing strategy is built around a marketing funnel.
                The basic concept is to reach new people and develop their
                relationship with your project to and beyond the point where
                they become fans and customers.
              </p>
            </FAQItem>

            <FAQItem
              question="What is digital strategy for musicians?"
              id="faq-digital-strategy"
            >
              <p>
                Digital strategy is the development and maintenance of your
                social media marketing and digital presence, from websites to
                streaming platforms. Each element should be not just fully
                functional, but optimised to create a great fan experience and
                pull the right people into your fan and customer base.
              </p>
            </FAQItem>

            <FAQItem
              question="How can artists grow an audience online?"
              id="faq-grow-audience"
            >
              <p>
                This is complicated and depends a lot on your artist project.
                For a comprehensive guide, visit our{" "}
                <a
                  href={LINKS.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#a89fe4]"
                >
                  YouTube channel
                </a>{" "}
                and our{" "}
                <Link href={LINKS.resources} className="underline text-[#a89fe4]">
                  resources page
                </Link>
                .
              </p>
            </FAQItem>

            <FAQItem
              question="How do independent artists promote their music?"
              id="faq-promote-music"
            >
              <p>
                The major channels are usually through live shows, social media,
                and networking. For a free comprehensive guide, visit our{" "}
                <a
                  href={LINKS.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#a89fe4]"
                >
                  YouTube channel
                </a>{" "}
                and our{" "}
                <Link href={LINKS.resources} className="underline text-[#a89fe4]">
                  resources page
                </Link>
                .
              </p>
            </FAQItem>

            <FAQItem
              question="How do musicians build a fanbase without a label?"
              id="faq-fanbase-no-label"
            >
              <p>
                There is no difference between building a fanbase with and
                without a label other than budget and contacts. Budget is a
                limiting factor that can be overcome as many of the marketing
                tools today can be used for free, especially social media which
                is currently the best way to reach a new audience that can then
                be nurtured to become fans.
              </p>
              {/* CHANGED: fixed typo "lot's" → "many of" and "yout" → "your" */}
              <p>
                Our recommendation is to work on your artist image and musical
                skills as you save up to bring on professional team members
                around your project. Posting for multiple years on social media
                and merch production to reach sustainable income levels takes
                significantly more time and work than paying a team and using
                your time to better your music.
              </p>
            </FAQItem>

            <FAQItem
              question="Is music marketing worth it?"
              id="faq-marketing-worth-it"
            >
              <p>
                In short, yes if done right. Without marketing, you are fighting
                a steeply uphill battle and hoping that hard work is done for
                you. Marketing, the work of reaching your audience, is vital to
                building a reliable, sustainable music career. If you are unsure
                where to start with marketing, check out our{" "}
                <Link href={LINKS.resources} className="underline text-[#a89fe4]">
                  free resources
                </Link>
                .
              </p>
            </FAQItem>

            {/* ====================================================== */}
            {/* PROMOTION & RELEASE STRATEGY                            */}
            {/* ====================================================== */}
            <SectionHeading>Promotion &amp; Release Strategy</SectionHeading>

            <FAQItem
              question="How do you promote new music releases effectively?"
              id="faq-promote-releases"
            >
              {/* CHANGED: reworded opening from "How to promote" to "How do you promote" for natural question format */}
              <p>
                The main pitfalls we see with independent artists are posting
                too little and rushing into a release. Here are some good
                guidelines:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Upload your release and have as much high-quality content
                  ready at least 6 weeks before the actual release. This way you
                  can pitch your release to radio, magazines, and streaming
                  platforms without a last-minute rush.
                </li>
                <li>
                  Post at least 10 times on your social media about the release.
                </li>
                <li>
                  Don&apos;t rush to post the morning of your release &mdash;
                  first check if it is on Spotify, Apple Music, Tidal, and
                  YouTube (and Deezer if you have an audience in France).
                  Usually people will see your release in the evening anyway and
                  it&apos;s best to avoid issues.
                </li>
              </ul>
            </FAQItem>

            <FAQItem
              question="How long should a music rollout last?"
              id="faq-rollout-length"
            >
              <p>
                This depends greatly on the size of your audience. Through
                carrying out many marketing strategies for independent artists,
                we have found that songs should be announced 3&ndash;7 days
                before the release and there should be 10&ndash;14 days between
                releases of singles and albums.
              </p>
            </FAQItem>

            <FAQItem
              question="How often should artists release music?"
              id="faq-release-frequency"
            >
              <p>
                This should not be a concern if you are releasing more than 7
                songs in any given 2-year period. This could be one album every
                two years or a single every 2 months. Quality is the absolute
                priority when it comes to music releases if your goal is a
                sustainable career.
              </p>
            </FAQItem>

            <FAQItem
              question="How do artists promote music without paid ads?"
              id="faq-promote-without-ads"
            >
              {/* CHANGED: fixed grammar "lot's" → "lots" */}
              <p>
                Essentially, lots of shows and &ldquo;organic&rdquo; content
                (content posted without money behind it). Ads are not the
                biggest mistake that we see artists make &mdash; boosted posts
                are. If you are going to set up ads, do it properly through Meta
                Business Suite. For a guide to this, check out our regularly
                updated free comprehensive marketing guide for independent
                artists on our{" "}
                <a
                  href={LINKS.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#a89fe4]"
                >
                  YouTube channel
                </a>{" "}
                or our{" "}
                <Link href={LINKS.resources} className="underline text-[#a89fe4]">
                  resource page
                </Link>
                .
              </p>
            </FAQItem>

            {/* ====================================================== */}
            {/* PLATFORMS & CHANNELS                                    */}
            {/* ====================================================== */}
            <SectionHeading>Platforms &amp; Channels</SectionHeading>

            <FAQItem
              question="Should artists focus on Spotify or social media?"
              id="faq-spotify-vs-social"
            >
              <p>
                When deciding to focus on streaming platforms like Spotify
                versus social media platforms like Instagram, social media is
                consistently a clear winner. Social media platforms like YouTube
                and Instagram have a very high ceiling when it comes to the
                connection you can build with your audience and the conversion
                to income, it can also be possible to actually contact your
                audience here. On Spotify, it is very hard to even make a little
                money and you have no access at all to the audience that
                discovers you there.
              </p>
            </FAQItem>

            <FAQItem
              question="How do artists move fans off social media?"
              id="faq-move-fans-off-social"
            >
              <p>
                Essentially this is about creating valuable offers. For a list
                of creative and simple offers, check out our{" "}
                <Link href={LINKS.resources} className="underline text-[#a89fe4]">
                  free resources page
                </Link>
                .
              </p>
            </FAQItem>

            <FAQItem
              question="How do mailing lists work for musicians?"
              id="faq-mailing-lists"
            >
              <p>
                The basics of a mailing list are very simple &mdash; gather
                direct contact information from your audience and consistently
                contact them when you have something of value to offer.
                There&apos;s of course more nuance to it in terms of increasing
                delivery rate, opens, and sales but for more information on
                this, follow our{" "}
                <a
                  href={LINKS.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#a89fe4]"
                >
                  YouTube channel
                </a>{" "}
                for a free comprehensive course on marketing for independent
                musicians.
              </p>
            </FAQItem>

            {/* ====================================================== */}
            {/* INCOME & SUSTAINABILITY                                */}
            {/* ====================================================== */}
            <SectionHeading>Income &amp; Sustainability</SectionHeading>

            <FAQItem
              question="How do musicians make money online?"
              id="faq-make-money-online"
            >
              <p>
                Typically musicians have to create several different income
                streams that come together to provide a consistent income. There
                are offline income streams like live shows and merch sales, but
                the majority of sustainable income can come from digital work.
                These could include:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Merch sales through a webstore</strong> &mdash;
                  Platforms we recommend are Cargo or Shopify. Great if you
                  already have a big audience but haven&apos;t developed the
                  bottom of your marketing funnel.
                </li>
                <li>
                  <strong>Digital subscriptions with gated content</strong>{" "}
                  &mdash; Patreon, your own website, or YouTube. This means
                  consistent revenue and great profit margins.
                </li>
                <li>
                  <strong>Streaming services and YouTube ad revenue</strong>{" "}
                  &mdash; This is barely a revenue stream; you need 100k streams
                  to make the same amount of money as selling around 30 shirts.
                </li>
                <li>
                  <strong>Sync licensing</strong> &mdash; Getting your music in
                  games, TV, or films. Big paycheck (&euro;10k+) followed by
                  residuals, but it&apos;s complicated to break into.
                </li>
                <li>
                  <strong>Selling digital copies of music</strong> &mdash; Good
                  profit margins and easy to do at home.
                </li>
                <li>
                  <strong>Livestreaming</strong> &mdash; Performing live via
                  Twitch, YouTube Live, Instagram Live, TikTok Live, or Stageit.
                </li>
                {/* CHANGED: fixed "Stagety" → "Stageit" (correct platform name) */}
                <li>
                  <strong>Crowdfunding</strong> &mdash; We usually don&apos;t
                  recommend this because it isn&apos;t sustainable. It only
                  makes sense if you have a big, unactivated audience and
                  temporarily need a revenue boost. For more guidance on
                  understanding your artist brand, visit our{" "}
                  <a
                    href={LINKS.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[#a89fe4]"
                  >
                    YouTube channel
                  </a>
                  .
                  {/* TODO: update link to specific branding video when available */}
                </li>
                <li>
                  <strong>Affiliation &amp; brand partnerships</strong> &mdash;
                  Can be easy to get much larger income streams, but it takes a
                  few months and is often difficult to navigate.
                </li>
              </ul>
            </FAQItem>

            <FAQItem
              question="How many streams do you need to make money?"
              id="faq-streams-to-money"
            >
              <p>
                There is no clean number for this. Each platform calculates
                streaming payouts differently. Spotify and Apple Music pay
                artists based on percentage stream share of all artists in their
                region &mdash; as regions have different subscription costs and
                proportions of free vs paid users, where you are streamed also
                affects this. Tidal has a user-centric model, meaning they pay
                artists based on the percentage of individual users&apos;
                streams that they make up.
              </p>
              {/* CHANGED: fixed double period ("this..") → single period */}
              <p>
                The average Spotify stream is roughly &euro;0.003 and across
                other platforms it&apos;s a little higher. At Las Aguas
                Productions, we use &euro;0.004 as a rough estimate, meaning
                &euro;100 is equivalent to around 25 thousand streams across
                platforms.
              </p>
            </FAQItem>

            {/* ====================================================== */}
            {/* VIDEO SERVICES                                         */}
            {/* ====================================================== */}
            <SectionHeading>
              Video Services &mdash; Content, Performance &amp; Visual Identity
            </SectionHeading>

            <FAQItem
              question="Do musicians need music videos?"
              id="faq-need-music-videos"
            >
              <p>
                Music videos are valuable assets for promoting your music but
                they are not an absolute necessity and can often cost more than
                they are worth. At Las Aguas, our suggestion is that you
                probably do need some music videos as long as you make them high
                quality and creative. If you specifically don&apos;t want to
                make music videos, try to understand the job that they would
                play in your marketing and make some other form of promotional
                material to replace them. An example of this could be long-form
                content like podcasts, interviews, or magazine articles.
              </p>
            </FAQItem>

            <FAQItem
              question="What kind of videos should artists post?"
              id="faq-what-videos-to-post"
            >
              <p>
                The kind of videos you should post depends on the goal and
                where in your marketing funnel the video fits in. Are you
                trying to reach a brand new audience? Then short-form videos
                with engaging hooks is the play. Are you trying to take people
                who already follow you and nurture them, deepening their
                connection with your work? Then long-form video like YouTube or
                behind-the-scenes content is probably more what you&apos;re
                looking for. Are you trying to convert existing leads into
                customers or resell customers for second purchases? Maybe make
                a series of long-form videos on the creative decisions behind
                the product you&apos;re offering.
              </p>
            </FAQItem>

            <FAQItem
              question="How important is video for music promotion?"
              id="faq-video-importance"
            >
              <p>
                Video is the cheapest and most effective way to reach a new
                audience, but it is not the only way. It is as important as
                keeping a low budget is to your project. If you have a big
                marketing budget that you&apos;re happy to spend and you know it
                is vital to your brand (and you truly understand why and how
                your marketing funnel works without video), it&apos;s ok to not
                produce.
              </p>
              {/* CHANGED: softened "happy to waste" → "happy to spend" for more professional tone */}
            </FAQItem>

            <FAQItem
              question="Are live performance videos good for promotion?"
              id="faq-live-performance-videos"
            >
              <p>
                In short, yes. Live performance videos are the most
                consistently well-performing content we have across many artist
                profiles and throughout many eras of content creation. There are
                video styles that do better but if you don&apos;t know what
                shape your marketing should look like or what your brand image
                is, live performance videos can&apos;t really go wrong.
              </p>
            </FAQItem>

            <FAQItem
              question="How do artists record live sessions?"
              id="faq-record-live-sessions"
            >
              <p>
                Typically, when we record live sessions, there are 4 parts:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>The band</strong> &mdash; Rehearsal is vital because
                  live sessions are expensive and/or time consuming. Getting a
                  great take can save hours on the shoot day and the edit.
                </li>
                <li>
                  <strong>The audio</strong> &mdash; We usually bring all music
                  equipment to the location, from mics and cables, to mufflers
                  and sound absorbers.
                </li>
                <li>
                  <strong>Video</strong> &mdash; We would recommend at least two
                  static angles and a third moving angle as well as some
                  lower-quality behind-the-scenes content (planned ahead of time
                  ideally).
                </li>
                <li>
                  <strong>Post-production</strong> &mdash; Here we usually take
                  the best audio take and work with that to match as much of the
                  video from that take that works. For parts that don&apos;t
                  work, we pick from other takes to get the best video out of
                  it, then go back to the audio and comp parts to match the
                  final cut and clear up small errors.
                </li>
              </ol>
            </FAQItem>

            <FAQItem
              question="What is the difference between live sessions and music videos?"
              id="faq-live-vs-music-video"
            >
              <p>
                There is a big, and simple, difference: live sessions are videos
                of musicians actually playing their music and music videos are
                any other type of video that goes over the studio version of a
                track.
              </p>
            </FAQItem>

            {/* ====================================================== */}
            {/* SHORT-FORM & SOCIAL CONTENT                            */}
            {/* ====================================================== */}
            <SectionHeading>Short-Form &amp; Social Content</SectionHeading>

            <FAQItem
              question="What video content works best on Instagram for musicians?"
              id="faq-instagram-content"
            >
              {/* NOTE: PDF instructed to copy answer from "what video content works best" */}
              <p>
                The kind of videos you should post depends on the goal and
                where in your marketing funnel the video fits in. Are you
                trying to reach a brand new audience? Then short-form videos
                with engaging hooks is the play. Are you trying to take people
                who already follow you and nurture them? Then long-form video
                or behind-the-scenes content is probably more what you&apos;re
                looking for. Are you trying to convert existing leads into
                customers? Make a series of long-form videos on the creative
                decisions behind the product you&apos;re offering.
              </p>
            </FAQItem>

            <FAQItem
              question="How do artists make content without being influencers?"
              id="faq-content-not-influencer"
            >
              {/* CHANGED: "focussed" → "focused" for consistency */}
              <p>
                This is simple &mdash; you don&apos;t need to make content that
                isn&apos;t focused on your music. There is a lot of pressure to
                make educational content or content about things you are
                interested in and honestly it&apos;s all unnecessary. You can
                post only music-oriented content and the quality and variety of
                content here is really wide &mdash; be as creative as you want
                with it. If you would like more specific advice about content
                you can make, check out our{" "}
                <a
                  href={LINKS.contentDeck}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#a89fe4]"
                >
                  reference deck
                </a>{" "}
                or{" "}
                <Link
                  href={LINKS.digitalStrategyForm}
                  className="underline text-[#a89fe4]"
                >
                  get in touch
                </Link>{" "}
                to get help with your social media workload and get a
                professional touch.
              </p>
            </FAQItem>

            <FAQItem
              question="How often should musicians post video content?"
              id="faq-posting-frequency"
            >
              <p>
                You should post as frequently as you can, while staying
                consistent and not sacrificing quality. Most social media really
                suffers if this drops under once per week but the more, the
                better. If you can only post less than once a week, make sure
                the quality is incredibly high and you are doing other work to
                make sure your marketing is working.
              </p>
            </FAQItem>

            <FAQItem
              question="Can short videos help grow a fanbase?"
              id="faq-short-videos"
            >
              <p>
                Absolutely. Short videos are incredibly effective in reaching a
                new audience on social media and converting them to listeners
                and, later, customers.
              </p>
            </FAQItem>

            {/* ====================================================== */}
            {/* AUDIO / PRODUCTION SERVICES                            */}
            {/* ====================================================== */}
            <SectionHeading>Audio &amp; Production Services</SectionHeading>

            <FAQItem
              question="Does mixing and mastering matter?"
              id="faq-mixing-mastering"
            >
              <p>
                Mixing and mastering are very important if you want your music
                to sound professional. If you are really trying to cut costs, we
                would say that mastering is probably less important (and there
                are some AI tools that do ok jobs for cheap). If you do not have
                your music mixed and mastered, it will never be able to reach
                into professional areas like editorial playlists or culture
                magazines and the average user will notice only that it
                doesn&apos;t feel that great to listen to.
              </p>
            </FAQItem>

            <FAQItem
              question="When should an artist get a song professionally mixed?"
              id="faq-when-to-mix"
            >
              <p>
                An artist should get their track professionally mixed any time
                that they are confident that this will become part of their
                portfolio throughout their career or it is going onto physical
                media like CDs, cassette tapes, or vinyls. If you are just
                uploading your music to YouTube as part of a hobby, there is no
                need, but if you are taking your artist project seriously, this
                is a step that needs to be taken.
              </p>
            </FAQItem>

            <FAQItem
              question="What is the difference between mixing and mastering?"
              id="faq-mixing-vs-mastering"
            >
              <p>
                Mixing and mastering are separate processes. Once a song is
                written, recorded, and produced, it has the feeling there but is
                a little messy. Mixing is the process of dialling in the way
                that parts of the song interact with one another &mdash; how
                space is created and how the track moves. Mastering is almost
                entirely technical &mdash; this is the process of taking the
                final mix (a single audio file) and making sure the dynamics are
                appropriate for the final listening environment, e.g. digital
                streaming or vinyl.
              </p>
            </FAQItem>

            <FAQItem
              question="Can better production help music marketing?"
              id="faq-production-helps-marketing"
            >
              <p>
                Absolutely. Music marketing can only perform as well as the
                product, the music, that it is promoting. If your music is not
                professional quality, no amount of marketing will bring it into
                the professional sphere.
              </p>
            </FAQItem>

            <FAQItem
              question="Should artists mix their own music?"
              id="faq-self-mixing"
            >
              {/* CHANGED: fixed "loose" → "lose" (spelling error) */}
              <p>
                There is no clear answer on whether or not artists mixing their
                own music is good or bad. At Las Aguas, we recommend outsourcing
                your mixing because, not only can you specialise and spend more
                time on music creation while having a mixing engineer cover the
                technical work, but you can get a second perspective in. It is
                very easy to lose perspective as you make music and bringing in a
                professional at this vital stage can bring a new level to your
                track.
              </p>
            </FAQItem>

            <FAQItem
              question="Is it better to record at home or in a studio?"
              id="faq-home-vs-studio"
            >
              <p>
                It is, of course, better to record in a studio than at home. The
                bigger question is whether or not it is worth the cost of a
                studio. Practically, if you are for example a hip-hop artist,
                the difference in audio quality between a treated studio and a
                duvet or closet is not that big. If you are recording drums or
                an ensemble, however, this can be a dramatic difference.
              </p>
            </FAQItem>

            <FAQItem
              question="How much does professional music production cost?"
              id="faq-production-cost"
            >
              <p>
                You should not expect to pay less than &euro;100 per day for
                professional music production. If you are offered less than this
                by a producer, there may be a variety of reasons &mdash; maybe
                they are specifically interested in your project, maybe they
                don&apos;t need the money, or maybe they can&apos;t charge
                more. In this case, we recommend staying skeptical of their work
                and thoroughly checking their portfolio. If you are being
                charged over &euro;500 per day, you need to be sure that you can
                see an ROI on that money or are ready to sink it into your music
                without a real return.
              </p>
            </FAQItem>

            <FAQItem
              question="What services do music studios offer artists?"
              id="faq-studio-services"
            >
              <p>
                Typically music studios just offer tracking, production, mixing,
                and mastering services. Often studios will work with labels,
                label services companies, or a network of freelancers to provide
                additional session musician or songwriting services. Services
                that are usually out of the domain of studios may include: vocal
                coaching, videography, publishing, marketing, and artist
                development.
              </p>
            </FAQItem>

            {/* ====================================================== */}
            {/* STRATEGIC / LABEL-SERVICES ADJACENT                    */}
            {/* ====================================================== */}
            <SectionHeading>
              Independence &amp; Label Services
            </SectionHeading>

            <FAQItem
              question="Do independent artists need a team?"
              id="faq-need-a-team"
            >
              <p>
                Yes, independent artists absolutely need a team but it is not
                the right time for lots of artists. When you have the money to
                spend at label services or having income but are spending time
                on the business when it could be spent on music, you should
                start looking for a team of professionals or a company that
                provides label services.
              </p>
              <p>
                If you are curious about what this could look like for you,{" "}
                <Link
                  href={LINKS.digitalStrategyForm}
                  className="underline text-[#a89fe4]"
                >
                  get in touch with Las Aguas
                </Link>{" "}
                and we can put together a free consultation.
              </p>
            </FAQItem>

            <FAQItem
              question="What does a music marketing team do?"
              id="faq-marketing-team"
            >
              <p>
                The goal of a music marketing team is to organise your artist
                project to make sure you are finding new audiences and
                converting those new audience members to paying customers,
                increasing the income to your artist project. This should cover
                both branding and the technical side of setting up your digital
                presence and the proper tracking to make sure your audience is
                activated as well as they can be.
              </p>
            </FAQItem>

            <FAQItem
              question="What is label services for artists?"
              id="faq-label-services"
            >
              <p>
                Label services is simply the provision of services that labels
                provide for artists but without the same deal structure &mdash;
                typically independent artists pay label services companies and
                retain their creative freedom and publishing rights (ownership
                of their music as IP). Services provided usually include:
                marketing, videography, songwriting, artist development,
                production, mixing and mastering, merch production, and with
                some older label services companies, publishing.
              </p>
            </FAQItem>

            <FAQItem
              question="How do artists get label-level support without signing a deal?"
              id="faq-label-support-no-deal"
            >
              <p>
                Artists can get label-level support without signing a predatory
                deal by going to boutique label services companies and asking
                for a contract in the form that benefits them. This is exactly
                why we founded Las Aguas Productions &mdash; to provide
                label-quality support to independent artists helping them grow
                their career without sacrificing their creative freedom or
                ownership of their music.
              </p>
            </FAQItem>
          </div>

          {/* CTA Section */}
          <div className="mt-12 pt-6 border-t border-[#a89fe4]/30 max-w-3xl">
            <p className="text-sm text-[#599b40] mb-4">
              Still have questions? We&apos;d love to help.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/forms/contact"
                className="site-btn site-btn--primary"
              >
                Get in Touch
              </Link>
              <Link href={LINKS.resources} className="site-btn site-btn--ghost">
                Free Resources
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
