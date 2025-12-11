// pages/forms/music-production.js
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

const isValidUrl = (value) => {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export default function MusicProductionForm() {
  const [email, setEmail] = useState("");
  const [about, setAbout] = useState("");
  const [budget, setBudget] = useState(150);
  const [musicLink, setMusicLink] = useState("");
  const [references, setReferences] = useState(["", "", ""]);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReferenceChange = (i, value) => {
    setReferences((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

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
      setFormError("Please tell us about your project.");
      return;
    }
    if (musicLink && !isValidUrl(musicLink)) {
      setFormError("Please enter a valid URL for your music link.");
      return;
    }
    for (const r of references) {
      if (r && !isValidUrl(r)) {
        setFormError(
          "Please enter valid URLs for reference tracks, or leave them empty."
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const reference_music_links = references
        .map((r) => r.trim())
        .filter(Boolean);

      const payload = {
        lead_type: "music_production",
        email: trimmedEmail,
        phone: null,
        about_project: trimmedAbout,
        budget_per_song: budget,
        ideal_release_date: null,
        music_link: musicLink.trim() || null,
        social_links: null,
        monthly_marketing_budget: null,
        budget_tier: null,
        epk_url: null,
        notes: null,
        reference_music_links:
          reference_music_links.length ? reference_music_links : null,
        reference_video_links: null,
        what_to_film: null,
        wants_additional_digital_strategy: false,
        extra_fields: null,
      };

      const { error } = await supabase.from("ad_leads_en").insert([payload]);
      if (error) throw error;

      setSuccess("Thank you – we’ve received your production enquiry.");
      setEmail("");
      setAbout("");
      setBudget(150);
      setMusicLink("");
      setReferences(["", "", ""]);
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
          Music production enquiry
        </h1>
        <p className="text-sm text-[#33296b] mb-4">
          Share a bit about the project and your budget per song so we can
          suggest the right way to work together.
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
              About the project<span className="text-red-600">*</span>
            </label>
            <textarea
              rows={5}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Budget per song (EUR)
            </label>
            <input
              type="range"
              min={50}
              max={1000}
              step={10}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-1 text-xs text-[#33296b]">
              Approx. budget per song:{" "}
              <span className="font-semibold">€{budget}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Link to your music (optional)
            </label>
            <input
              type="url"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
              placeholder="https://"
              value={musicLink}
              onChange={(e) => setMusicLink(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Reference tracks (up to 3 – optional)
            </label>
            <p className="text-xs text-[#33296b] mb-1">
              Links to songs that are close to what you&apos;re aiming for.
            </p>
            {references.map((ref, i) => (
              <input
                key={i}
                type="url"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
                placeholder={`Reference ${i + 1} (https://)`}
                value={ref}
                onChange={(e) => handleReferenceChange(i, e.target.value)}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-[#33296b] text-[#bbe1ac] font-semibold text-sm px-4 py-2 shadow-md disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send production enquiry"}
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
