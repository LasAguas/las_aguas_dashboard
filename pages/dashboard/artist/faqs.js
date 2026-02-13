"use client";

import Head from "next/head";
import { useState } from "react";
import ArtistLayout from "../../../components/artist/ArtistLayout";

/* ------------------------------------------------------------------ */
/* Collapsible FAQ Item — matches onboarding Collapsible style         */
/* ------------------------------------------------------------------ */
function FAQItem({ question, children, id }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="artist-panel" id={id}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 flex items-center justify-between gap-3"
        aria-expanded={open}
        aria-controls={id ? `${id}-answer` : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#33296b]/30 shrink-0" />
          <div className="text-sm font-semibold">{question}</div>
        </div>
        <div className="text-xs rounded-lg px-2 py-1 bg-black/5 shrink-0">
          {open ? "Hide" : "Open"}
        </div>
      </button>
      {open && (
        <div
          className="px-4 pb-4 text-sm text-gray-700 leading-relaxed space-y-3"
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
    <h2 className="text-base font-bold text-[#33296b] mt-6 mb-2">{children}</h2>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function ArtistFAQsPage() {
  return (
    <ArtistLayout title="FAQs">
      <Head>
        <title>FAQs · Artist Dashboard · Las Aguas Productions</title>
        <meta
          name="description"
          content="Frequently asked questions for Las Aguas Productions artists covering working relationship, payments, services, availability, and more."
        />
      </Head>

      <div className="space-y-3">
        {/* -------------------------------------------------------- */}
        {/* Working With Las Aguas                                    */}
        {/* -------------------------------------------------------- */}
        <SectionHeading>Working With Las Aguas</SectionHeading>

        <FAQItem
          question="How is working with Las Aguas different from signing to a label?"
          id="faq-label-difference"
        >
          <p>
            You keep control and ownership. We provide label-level services
            without locking you into long contracts or creative restrictions.
          </p>
        </FAQItem>

        <FAQItem
          question="Who owns the content produced during my service?"
          id="faq-ownership"
        >
          {/* CHANGED: reworded heading from "Independence, Rights & Ownership" to a clear question for better SEO and LLM discoverability */}
          <p>
            You own everything on full payment of the service. We may use any
            content produced as part of our company marketing. If you want us
            to not use something, just let us know and we won&apos;t use it.
          </p>
        </FAQItem>

        <FAQItem
          question="Who is my main point of contact?"
          id="faq-contact"
        >
          <p>
            You&apos;ll have a primary contact depending on your services
            (production, digital strategy, or artist development), with others
            involved as needed.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>For general questions, please message our WhatsApp group chat.</li>
            <li>
              For urgent questions regarding posting, please call Miguel:{" "}
              <a href="tel:+4915758042481" className="underline text-[#33296b]">
                +49 1575 8042481
              </a>
            </li>
            <li>
              For urgent questions regarding video, please call Yannick:{" "}
              <a href="tel:+447975660374" className="underline text-[#33296b]">
                +44 7975 660374
              </a>
            </li>
          </ul>
        </FAQItem>

        {/* -------------------------------------------------------- */}
        {/* Payments & Pausing                                        */}
        {/* -------------------------------------------------------- */}
        <SectionHeading>Payments &amp; Pausing</SectionHeading>

        <FAQItem
          question="What happens if my payment is late?"
          id="faq-late-payment"
        >
          {/* CHANGED: reworded from "Late payment" to a question format for better SEO */}
          <p>
            In the case of payment delayed beyond one week, we will pause work
            until the payment arrives. If there is a clear issue and you give us
            enough notice, we can often stretch this further &mdash; no
            guarantee but please don&apos;t hesitate to ask.
          </p>
        </FAQItem>

        <FAQItem
          question="Can I pause or end services?"
          id="faq-pause-end"
        >
          <p>
            <strong>Ending services:</strong> You must give 28 days of notice.
          </p>
          <p>
            <strong>Pausing services:</strong> You can give any notice and we
            will post weekly throughout the paused period. The caveat is you
            must pay the first month back before pausing. For example, if you
            want to pause the services for February, you must pay March at the
            start of February. On returning, no additional March payment would
            be required.
          </p>
        </FAQItem>

        {/* -------------------------------------------------------- */}
        {/* Availability & Roster                                     */}
        {/* -------------------------------------------------------- */}
        <SectionHeading>Availability &amp; Roster</SectionHeading>

        <FAQItem
          question="What should I do if I'll be unavailable for a period?"
          id="faq-availability"
        >
          {/* CHANGED: reworded from "Your Availability" header to a question for better SEO/LLM format */}
          <p>
            If you will be offline for a period of time, let us know so we can
            prepare everything ahead of time and keep working while you&apos;re
            away.
          </p>
        </FAQItem>

        <FAQItem
          question="How many artists do you work with at the same time?"
          id="faq-roster-size"
        >
          <p>
            We intentionally keep our roster small to stay hands-on &mdash;
            until we grow our team, we limit our digital strategy clients to 8.
          </p>
        </FAQItem>
      </div>
    </ArtistLayout>
  );
}
