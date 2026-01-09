// pages/digital-strategy-lead.js
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import Script from "next/script";

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

const isValidPhone = (value) =>
  /^\+?[0-9\s\-()]{7,}$/.test((value || "").trim());

const isValidUrl = (value) => {
  if (!value) return true; // optional
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const getBudgetTier = (value) => {
  if (value < 195) return "below_195";
  if (value >= 195 && value < 277) return "195_277_video_only";
  if (value >= 277 && value <= 750) return "277_750_base_plus_video";
  return "750_plus_premium";
};

const getTierLabel = (value) => {
  const tier = getBudgetTier(value);
  switch (tier) {
    case "195_277_video_only":
      return "Only video work";
    case "277_750_base_plus_video":
      return "Digital strategy base package + video work";
    case "750_plus_premium":
      return "Premium tier – daily content, set it and forget it";
    default:
      return ""; // below 195: intentionally no info
  }
};

export default function DigitalStrategyLeadPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [socialLinks, setSocialLinks] = useState([""]);
  const [budget, setBudget] = useState(0); // 0–1500
  const [epkMode, setEpkMode] = useState("link"); // "link" | "upload"
  const [epkLink, setEpkLink] = useState("");
  const [epkFile, setEpkFile] = useState(null);
  const [helpText, setHelpText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const resetForm = () => {
    setEmail("");
    setPhone("");
    setSocialLinks([""]);
    setBudget(0);
    setEpkMode("link");
    setEpkLink("");
    setEpkFile(null);
    setHelpText("");
  };

  const validate = () => {
    const errors = {};
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    // Email is required
    if (!trimmedEmail) {
      errors.email = "Email is required.";
    } else if (!isValidEmail(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      errors.phone =
        "Please enter a valid phone number (digits, spaces, +, - and parentheses).";
    }

    // Budget required
    if (budget === 0) {
      // you can change this rule if you want 0 to be allowed
      errors.budget = "Please set your monthly marketing budget.";
    }

    // Social links
    socialLinks.forEach((link, idx) => {
      if (link && !isValidUrl(link)) {
        errors[`social_${idx}`] =
          "Please enter a valid URL (starting with http/https).";
      }
    });

    if (epkMode === "link" && epkLink && !isValidUrl(epkLink)) {
    errors.epkLink = "Please enter a valid URL (starting with http/https).";
    }

    if (epkMode === "upload" && epkFile && epkFile.type !== "application/pdf") {
    errors.epkFile = "EPK upload must be a PDF file.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSocialChange = (index, value) => {
    setSocialLinks((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleAddSocial = () => {
    setSocialLinks((prev) => [...prev, ""]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");
    if (!validate()) return;

    setSubmitting(true);
    try {
            const nonEmptySocialLinks = socialLinks
            .map((s) => s.trim())
            .filter(Boolean);

        let epkUrlToSave = null;

        if (epkMode === "link" && epkLink.trim()) {
            epkUrlToSave = epkLink.trim();
        } else if (epkMode === "upload" && epkFile) {
            const fileExt = epkFile.name.split(".").pop();
            const fileName = `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${fileExt}`;
            const filePath = `epk/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
            .from("epk")
            .upload(filePath, epkFile);

            if (uploadError) {
            console.error("Error uploading EPK:", uploadError);
            setFormError("Could not upload EPK PDF. Please try again.");
            setSubmitting(false);
            return;
            }

            const {
            data: { publicUrl },
            } = supabase.storage.from("epk").getPublicUrl(uploadData.path);

            epkUrlToSave = publicUrl;
        }

        const payload = {
            lead_type: "digital_strategy",
            email: email.trim() || null,
            phone: phone.trim() || null,
            about_project: null,
            budget_per_song: null,
            ideal_release_date: null,
            music_link: null,
            social_links: nonEmptySocialLinks.length ? nonEmptySocialLinks : null,
            monthly_marketing_budget: budget,
            budget_tier: getBudgetTier(budget),
            epk_url: epkUrlToSave,
            notes: helpText.trim() || null,
        };

        const { error } = await supabase.from("ad_leads_en").insert([payload]);

      if (error) {
        console.error("Error inserting digital strategy lead:", error);
        setFormError("Something went wrong saving your details. Please try again.");
      } else {
        setSuccessMessage("Thanks! We’ve received your info and will be in touch.");
        resetForm();
        setFieldErrors({});
      }
    } catch (err) {
      console.error("Unexpected error inserting digital strategy lead:", err);
      setFormError("Unexpected error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const tierLabel = getTierLabel(budget);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#a89ee4] p-4">

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

      <div className="w-full max-w-xl bg-[#bbe1ac] p-6 md:p-8 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-[#33296b]">
            Digital Strategy Form
          </h1>
        </div>

        <p className="text-sm text-[#33296b] mb-4">
          Share a bit about your situation so we can recommend the right level of support.
        </p>

        {formError && (
          <div className="mb-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded px-3 py-2">
            {formError}
          </div>
        )}
        {successMessage && (
          <div className="mb-3 text-sm text-green-800 bg-green-100 border border-green-300 rounded px-3 py-2">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email / phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#33296b] mb-1">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-700">
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#33296b] mb-1">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
                placeholder="+49 600 000 000"
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-700">
                  {fieldErrors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Social media links */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Social media links (optional)
            </label>
            <div className="space-y-2">
              {socialLinks.map((link, idx) => (
                <div key={idx}>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => handleSocialChange(idx, e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
                    placeholder="https://instagram.com/yourartist"
                  />
                  {fieldErrors[`social_${idx}`] && (
                    <p className="mt-1 text-xs text-red-700">
                      {fieldErrors[`social_${idx}`]}
                    </p>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddSocial}
                className="text-xs text-[#33296b] underline hover:opacity-80"
              >
                + Add another social link
              </button>
            </div>
          </div>

          {/* Monthly marketing budget slider */}
            <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
                Monthly marketing budget (EUR)<span className="text-red-600">*</span>
            </label>
            <div className="mt-2">
                <div className="relative">
                <input
                    type="range"
                    min={0}
                    max={1200}
                    step={5}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full"
                />

                {/* Tick labels aligned to actual values on 0–1200 scale */}
                <div className="pointer-events-none absolute left-0 right-0 top-full mt-1 text-xs text-[#33296b]">
                    {/* 0€ at 0% */}
                    <span className="absolute left-0 -translate-x-1/2">0€</span>

                    {/* 195€ at 195 / 1200 ≈ 16.25% */}
                    <span
                    className="absolute -translate-x-1/2"
                    style={{ left: "14.25%" }}
                    >
                    195
                    </span>

                    {/* 280€ at 280 / 1200 ≈ 23.3% */}
                    <span
                    className="absolute -translate-x-1/2"
                    style={{ left: "24.3%" }}
                    >
                    280
                    </span>

                    {/* 750€ at 750 / 1200 = 62.5% */}
                    <span
                    className="absolute -translate-x-1/2"
                    style={{ left: "62.5%" }}
                    >
                    750
                    </span>

                    {/* 1200€ at 100% */}
                    <span className="absolute right-0 translate-x-1/2">1200</span>
                </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-sm text-[#33296b]">
                <span>
                    Selected: <strong>€{budget}</strong>/month
                </span>
                </div>

                {tierLabel && (
                <div className="mt-2 text-xs bg-white/60 border border-[#33296b]/30 rounded px-3 py-2 text-[#33296b]">
                    {tierLabel}
                </div>
                )}

                {fieldErrors.budget && (
                <p className="mt-1 text-xs text-red-700">
                    {fieldErrors.budget}
                </p>
                )}
            </div>
            </div>


                    {/* EPK */}
                    <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              EPK (optional – PDF upload or link)
            </label>

            <div className="flex gap-4 text-xs text-[#33296b] mb-2">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="mr-1"
                  value="link"
                  checked={epkMode === "link"}
                  onChange={() => setEpkMode("link")}
                />
                <span>Use link</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="mr-1"
                  value="upload"
                  checked={epkMode === "upload"}
                  onChange={() => setEpkMode("upload")}
                />
                <span>Upload PDF</span>
              </label>
            </div>

            {epkMode === "link" && (
              <>
                <input
                  type="url"
                  value={epkLink}
                  onChange={(e) => setEpkLink(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
                  placeholder="https://your-epk.com/presskit.pdf"
                />
                {fieldErrors.epkLink && (
                  <p className="mt-1 text-xs text-red-700">
                    {fieldErrors.epkLink}
                  </p>
                )}
              </>
            )}

            {epkMode === "upload" && (
              <>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setEpkFile(
                      e.target.files && e.target.files[0]
                        ? e.target.files[0]
                        : null
                    )
                  }
                  className="mt-1 block w-full text-sm text-[#33296b]"
                />
                {fieldErrors.epkFile && (
                  <p className="mt-1 text-xs text-red-700">
                    {fieldErrors.epkFile}
                  </p>
                )}
              </>
            )}
          </div>


          {/* What would you like help with */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              What would you like help with? / Tell us about your situation
            </label>
            <textarea
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
              rows={4}
              placeholder="Where are you now, what are you trying to achieve, any context you want to share..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#599b40] text-[#33296b] py-2 px-4 rounded-md hover:bg-[#a89ee4] focus:outline-none focus:ring-2 focus:ring-[#33296b] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}

