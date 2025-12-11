// pages/forms/videography.js
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

const budgetTier = (budget) => {
  if (budget == null) return null;
  if (budget < 150) return "low";
  if (budget < 500) return "medium";
  if (budget < 1500) return "high";
  return "very_high";
};

export default function VideographyForm() {
  const [email, setEmail] = useState("");
  const [about, setAbout] = useState("");
  const [whatToFilm, setWhatToFilm] = useState("");
  const [projectLink, setProjectLink] = useState("");
  const [references, setReferences] = useState(["", "", ""]);
  const [wantsStrategy, setWantsStrategy] = useState("no");
  const [budget, setBudget] = useState(300);
  const [socialLinks, setSocialLinks] = useState([""]);
  const [epkUrl, setEpkUrl] = useState("");
  const [strategyNotes, setStrategyNotes] = useState("");

  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRefChange = (i, value) => {
    setReferences((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const handleSocialChange = (i, value) => {
    setSocialLinks((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const handleAddSocial = () => {
    setSocialLinks((prev) => [...prev, ""]);
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
      setFormError("Please tell us about the project.");
      return;
    }
    if (!whatToFilm) {
      setFormError("Please tell us what you’d like to film.");
      return;
    }
    if (projectLink && !isValidUrl(projectLink)) {
      setFormError("Please enter a valid URL for your music/project link.");
      return;
    }
    for (const r of references) {
      if (r && !isValidUrl(r)) {
        setFormError(
          "Please enter valid URLs for reference videos, or leave them empty."
        );
        return;
      }
    }
    if (wantsStrategy === "yes") {
      for (const s of socialLinks) {
        if (s && !isValidUrl(s)) {
          setFormError(
            "Please enter valid URLs for social links, or leave them empty."
          );
          return;
        }
      }
      if (epkUrl && !isValidUrl(epkUrl)) {
        setFormError("Please enter a valid URL for your EPK / press kit.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const reference_video_links = references
        .map((r) => r.trim())
        .filter(Boolean);
      const social_links = socialLinks.map((s) => s.trim()).filter(Boolean);
      const monthly_budget = wantsStrategy === "yes" ? budget : null;

      const payload = {
        lead_type: "videography",
        email: trimmedEmail,
        phone: null,
        about_project: trimmedAbout,
        budget_per_song: null,
        ideal_release_date: null,
        music_link: projectLink.trim() || null,
        social_links: social_links.length ? social_links : null,
        monthly_marketing_budget: monthly_budget,
        budget_tier:
          monthly_budget != null ? budgetTier(monthly_budget) : null,
        epk_url: epkUrl.trim() || null,
        notes: strategyNotes.trim() || null,
        reference_music_links: null,
        reference_video_links:
          reference_video_links.length ? reference_video_links : null,
        what_to_film: whatToFilm || null,
        wants_additional_digital_strategy: wantsStrategy === "yes",
        extra_fields: null,
      };

      const { error } = await supabase.from("ad_leads_en").insert([payload]);
      if (error) throw error;

      setSuccess("Thank you – we’ve received your videography enquiry.");
      setEmail("");
      setAbout("");
      setWhatToFilm("");
      setProjectLink("");
      setReferences(["", "", ""]);
      setWantsStrategy("no");
      setBudget(300);
      setSocialLinks([""]);
      setEpkUrl("");
      setStrategyNotes("");
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
          Videography enquiry
        </h1>
        <p className="text-sm text-[#33296b] mb-4">
          Tell us what you&apos;d like to film and how video fits into your wider
          release plan. You can optionally add a mini digital strategy brief
          below.
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
          {/* Basic info */}
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
              What would you like to film?<span className="text-red-600">*</span>
            </label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
              value={whatToFilm}
              onChange={(e) => setWhatToFilm(e.target.value)}
            >
              <option value="">Select an option</option>
              <option value="live_show">Live show</option>
              <option value="rehearsal">Rehearsal</option>
              <option value="music_video">Music video</option>
              <option value="social_media_content">Social media content</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Link to your music / project (optional)
            </label>
            <input
              type="url"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
              placeholder="https://"
              value={projectLink}
              onChange={(e) => setProjectLink(e.target.value)}
            />
          </div>

        {/* Budget slider */}
        <div>
        <label className="block text-sm font-medium text-[#33296b] mb-1">
            Budget for your video (EUR)
        </label>

        <input
            type="range"
            min={100}
            max={3000}
            step={50}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full"
        />

        <div className="mt-1 text-xs text-[#33296b]">
            Selected budget: <strong>€{budget}</strong>
        </div>

        <p className="text-xs text-[#33296b] mt-1">
            Your chosen budget will not change our prices.
        </p>
        </div>

          {/* Reference videos */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Reference videos (up to 3 – optional)
            </label>
            <p className="text-xs text-[#33296b] mb-1">
              Links to videos that are close to what you have in mind.
            </p>
            {references.map((ref, i) => (
              <input
                key={i}
                type="url"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
                placeholder={`Reference ${i + 1} (https://)`}
                value={ref}
                onChange={(e) => handleRefChange(i, e.target.value)}
              />
            ))}
          </div>


          {/* Digital strategy interest */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Are you interested in additional digital strategy and help with
              marketing and social media?
            </label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
              value={wantsStrategy}
              onChange={(e) => setWantsStrategy(e.target.value)}
            >
              <option value="no">No, video is enough for now</option>
              <option value="yes">Yes, I’d like to add digital strategy</option>
            </select>
          </div>

          {wantsStrategy === "yes" && (
            <div className="mt-4 space-y-4 border border-[#33296b] rounded-lg p-4 bg-[#a89ee4]/40">
              <p className="text-xs text-[#33296b]">
                This section mirrors our digital strategy form so we can see the
                whole picture around your release.
              </p>

              <div>
                <label className="block text-sm font-medium text-[#33296b] mb-1">
                  Monthly marketing budget (EUR)
                </label>
                <input
                  type="range"
                  min={0}
                  max={1200}
                  step={5}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full"
                />
                <div className="mt-1 text-xs text-[#33296b]">
                  Approx. monthly budget:{" "}
                  <span className="font-semibold">€{budget}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#33296b] mb-1">
                  Social media links (optional)
                </label>
                {socialLinks.map((s, i) => (
                  <input
                    key={i}
                    type="url"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
                    placeholder="https://"
                    value={s}
                    onChange={(e) => handleSocialChange(i, e.target.value)}
                  />
                ))}
                <button
                  type="button"
                  onClick={handleAddSocial}
                  className="mt-1 text-xs text-[#33296b] underline"
                >
                  + Add another social link
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#33296b] mb-1">
                  EPK / press kit link (optional)
                </label>
                <input
                  type="url"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
                  placeholder="https://"
                  value={epkUrl}
                  onChange={(e) => setEpkUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#33296b] mb-1">
                  Anything else about your digital strategy we should know?
                  (optional)
                </label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33296b] focus:ring-[#33296b] text-sm px-3 py-2"
                  value={strategyNotes}
                  onChange={(e) => setStrategyNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-[#33296b] text-[#bbe1ac] font-semibold text-sm px-4 py-2 shadow-md disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send videography enquiry"}
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
