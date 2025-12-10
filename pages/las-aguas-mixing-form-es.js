// pages/las-aguas-mixing-lead-es.js
"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Link from "next/link";

const pad = (n) => String(n).padStart(2, "0");
const toYMD = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidUrl = (value) => {
  if (!value) return true; // opcional
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export default function LasAguasMixingLeadEsPage() {
  const [email, setEmail] = useState("");
  const [aboutProject, setAboutProject] = useState("");
  const [budgetPerSong, setBudgetPerSong] = useState(""); // "<180" | ">180"
  const [idealReleaseDate, setIdealReleaseDate] = useState(null); // Date | null
  const [musicLink, setMusicLink] = useState("");
  const [socialMediaLink, setSocialMediaLink] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const resetForm = () => {
    setEmail("");
    setAboutProject("");
    setBudgetPerSong("");
    setIdealReleaseDate(null);
    setMusicLink("");
    setSocialMediaLink("");
  };

  const validate = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = "El correo electrónico es obligatorio.";
    } else if (!isValidEmail(email)) {
      errors.email = "Por favor introduce un correo electrónico válido.";
    }

    if (!aboutProject.trim()) {
      errors.aboutProject = "Por favor cuéntanos sobre el proyecto.";
    } else if (aboutProject.trim().length > 600) {
      errors.aboutProject = "Máximo 600 caracteres.";
    }

    if (!budgetPerSong) {
      errors.budgetPerSong = "Por favor selecciona un presupuesto por canción.";
    }

    if (musicLink && !isValidUrl(musicLink)) {
      errors.musicLink =
        "Por favor introduce una URL válida (que empiece por http/https).";
    }

    if (socialMediaLink && !isValidUrl(socialMediaLink)) {
      errors.socialMediaLink =
        "Por favor introduce una URL válida (que empiece por http/https).";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        lead_type: "mixing",
        email: email.trim(),
        phone: null,
        about_project: aboutProject.trim(),
        budget_per_song: budgetPerSong,
        ideal_release_date: idealReleaseDate ? toYMD(idealReleaseDate) : null,
        music_link: musicLink.trim() || null,
        social_links: socialMediaLink.trim()
          ? [socialMediaLink.trim()]
          : null,
        monthly_marketing_budget: null,
        budget_tier: null,
        epk_url: null,
        notes: null,
      };

      const { error } = await supabase.from("ad_leads_es").insert([payload]);
      if (error) {
        console.error("Error inserting mixing lead (ES):", error);
        setFormError(
          "Ha ocurrido un error al guardar tus datos. Por favor inténtalo de nuevo."
        );
      } else {
        setSuccessMessage(
          "¡Gracias! Hemos recibido tu información y nos pondremos en contacto contigo."
        );
        resetForm();
        setFieldErrors({});
      }
    } catch (err) {
      console.error("Unexpected error inserting mixing lead (ES):", err);
      setFormError("Error inesperado. Por favor inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#a89ee4] p-4">
      <div className="w-full max-w-xl bg-[#bbe1ac] p-6 md:p-8 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-[#33296b]">
            Las Aguas – Mezcla
          </h1>
        </div>

        <p className="text-sm text-[#33296b] mb-4">
          Cuéntanos un poco sobre tu proyecto para ver si encajamos bien.
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
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Correo electrónico<span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
              placeholder="tu@ejemplo.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-700">{fieldErrors.email}</p>
            )}
          </div>

          {/* About the project */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Sobre el proyecto<span className="text-red-600">*</span>
            </label>
            <textarea
              value={aboutProject}
              onChange={(e) => setAboutProject(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
              rows={4}
              maxLength={600}
              placeholder="Cuéntanos sobre tu música, número de canciones, referencias, etc."
            />
            <div className="flex justify-between items-center mt-1">
              {fieldErrors.aboutProject && (
                <p className="text-xs text-red-700">
                  {fieldErrors.aboutProject}
                </p>
              )}
              <p className="text-xs text-[#33296b] ml-auto">
                {aboutProject.length}/600
              </p>
            </div>
          </div>

          {/* Budget per song */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Presupuesto por canción (EUR)
              <span className="text-red-600">*</span>
            </label>
            <div className="flex gap-4 mt-1">
              <label className="inline-flex items-center text-sm text-[#33296b]">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={budgetPerSong === "<180"}
                  onChange={() =>
                    setBudgetPerSong(
                      budgetPerSong === "<180" ? "" : "<180"
                    )
                  }
                />
                &lt; 180€
              </label>
              <label className="inline-flex items-center text-sm text-[#33296b]">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={budgetPerSong === ">180"}
                  onChange={() =>
                    setBudgetPerSong(
                      budgetPerSong === ">180" ? "" : ">180"
                    )
                  }
                />
                &gt; 180€
              </label>
            </div>
            {fieldErrors.budgetPerSong && (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.budgetPerSong}
              </p>
            )}
          </div>

          {/* Ideal release date (optional) */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Fecha de lanzamiento ideal (opcional)
            </label>
            <DatePicker
              selected={idealReleaseDate}
              onChange={(date) => setIdealReleaseDate(date)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2 bg-white"
              placeholderText="Selecciona una fecha"
            />
          </div>

          {/* Link to music */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Enlace a la música (opcional)
            </label>
            <input
              type="url"
              value={musicLink}
              onChange={(e) => setMusicLink(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
              placeholder="https://..."
            />
            {fieldErrors.musicLink && (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.musicLink}
              </p>
            )}
          </div>

          {/* Social media link */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Enlace a redes sociales (opcional)
            </label>
            <input
              type="url"
              value={socialMediaLink}
              onChange={(e) => setSocialMediaLink(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
              placeholder="https://instagram.com/tuartista"
            />
            {fieldErrors.socialMediaLink && (
              <p className="mt-1 text-xs text-red-700">
                {fieldErrors.socialMediaLink}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#599b40] text-[#33296b] py-2 px-4 rounded-md hover:bg-[#a89ee4] focus:outline-none focus:ring-2 focus:ring-[#33296b] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
