// pages/forms/contact.js
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

export default function GeneralContactForm() {
  const [email, setEmail] = useState("");
  const [about, setAbout] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccess("");

    const trimmedEmail = email.trim();
    const trimmedAbout = about.trim();

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!trimmedAbout) {
      setFormError("Please tell us a bit about your project.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        lead_type: "general",
        email: trimmedEmail,
        phone: null,
        about_project: trimmedAbout,
        budget_per_song: null,
        ideal_release_date: null,
        music_link: null,
        social_links: null,
        monthly_marketing_budget: null,
        budget_tier: null,
        epk_url: null,
        notes: null,
        reference_music_links: null,
        reference_video_links: null,
        what_to_film: null,
        wants_additional_digital_strategy: false,
        extra_fields: null,
      };

      const { error } = await supabase.from("ad_leads_en").insert([payload]);
      if (error) throw error;

      setSuccess("Thank you – we’ve received your message.");
      setEmail("");
      setAbout("");
    } catch (err) {
      console.error(err);
      setFormError("Something went wrong submitting the form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#a89ee4] p-4">
      <div className="w-full max-w-xl bg-[#bbe1ac] p-6 md:p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-[#33296b] mb-2">
          General contact
        </h1>
        <p className="text-sm text-[#33296b] mb-4">
          Tell us a bit about your project and what you&apos;re looking for.
        </p>

        {formError && (
          <div className="mb-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded px-3 py-2">
            {formError}
          </div>
        )}
        {success && (
          <div className="mb-3 text-sm text-green-800 bg-green-100 border border-green-300 rounded px-3 py-2">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Email<span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              About your project<span className="text-red-600">*</span>
            </label>
            <textarea
              rows={5}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-[#33296b] text-[#bbe1ac] font-semibold text-sm px-4 py-2 shadow-md disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send"}
          </button>
        </form>

        <p className="mt-6 text-xs text-[#33296b]">
          If you’d like, you can directly write us an email{" "}
          <a
            href="mailto:lasaguasproductions@gmail.com"
            className="underline font-semibold"
          >
            here
          </a>
          . We won’t be as fast to respond but we will get to it!
        </p>
      </div>
    </div>
  );
}
