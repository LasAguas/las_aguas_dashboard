// pages/digital-strategy-lead-es.js
"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());

const isValidPhone = (value) =>
  /^\+?[0-9\s\-()]{7,}$/.test((value || "").trim());

const isValidUrl = (value) => {
  if (!value) return true; // opcional
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
      return "Solo trabajo de vídeo";
    case "277_750_base_plus_video":
      return "Paquete base de estrategia digital + trabajo de vídeo";
    case "750_plus_premium":
      return "Nivel premium – contenido diario, lo configuramos y te olvidas";
    default:
      return ""; // por debajo de 195: sin texto intencionalmente
  }
};

export default function DigitalStrategyLeadEsPage() {
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

    // El correo electrónico es obligatorio
    if (!trimmedEmail) {
      errors.email = "El correo electrónico es obligatorio.";
    } else if (!isValidEmail(trimmedEmail)) {
      errors.email = "Por favor introduce un correo electrónico válido.";
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      errors.email = "Por favor introduce un correo electrónico válido.";
    }

    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      errors.phone =
        "Por favor introduce un número de teléfono válido (dígitos, espacios, +, - y paréntesis).";
    }

    // Presupuesto obligatorio
    if (budget === 0) {
      // puedes cambiar esta regla si quieres permitir 0
      errors.budget = "Por favor indica tu presupuesto mensual de marketing.";
    }

    // Enlaces a redes sociales
    socialLinks.forEach((link, idx) => {
      if (link && !isValidUrl(link)) {
        errors[`social_${idx}`] =
          "Por favor introduce una URL válida (que empiece por http/https).";
      }
    });

    if (epkMode === "link" && epkLink && !isValidUrl(epkLink)) {
      errors.epkLink =
        "Por favor introduce una URL válida (que empiece por http/https).";
    }

    if (epkMode === "upload" && epkFile && epkFile.type !== "application/pdf") {
      errors.epkFile = "El archivo EPK debe ser un PDF.";
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
          setFormError(
            "No se pudo subir el PDF del EPK. Por favor inténtalo de nuevo."
          );
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

      const { error } = await supabase.from("ad_leads_es").insert([payload]);

      if (error) {
        console.error("Error inserting digital strategy lead (ES):", error);
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
      console.error(
        "Unexpected error inserting digital strategy lead (ES):",
        err
      );
      setFormError("Error inesperado. Por favor inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const tierLabel = getTierLabel(budget);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#a89ee4] p-4">
      <div className="w-full max-w-xl bg-[#bbe1ac] p-6 md:p-8 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-[#33296b]">
            Formulario de Estrategia Digital
          </h1>
        </div>

        <p className="text-sm text-[#33296b] mb-4">
          Cuéntanos un poco sobre tu situación para que podamos recomendarte el
          nivel de apoyo adecuado.
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
                Correo electrónico <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
                placeholder="tu@ejemplo.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-700">
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#33296b] mb-1">
                Teléfono (opcional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
                placeholder="+34 600 000 000"
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
              Enlaces a redes sociales (opcional)
            </label>
            <div className="space-y-2">
              {socialLinks.map((link, idx) => (
                <div key={idx}>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => handleSocialChange(idx, e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
                    placeholder="https://instagram.com/tuartista"
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
                + Añadir otro enlace social
              </button>
            </div>
          </div>

          {/* Monthly marketing budget slider */}
          <div>
            <label className="block text-sm font-medium text-[#33296b] mb-1">
              Presupuesto mensual de marketing (EUR)
              <span className="text-red-600">*</span>
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
                    style={{ left: "16.25%" }}
                  >
                    195€
                  </span>

                  {/* 280€ at 280 / 1200 ≈ 23.3% */}
                  <span
                    className="absolute -translate-x-1/2"
                    style={{ left: "23.3%" }}
                  >
                    280€
                  </span>

                  {/* 750€ at 750 / 1200 = 62.5% */}
                  <span
                    className="absolute -translate-x-1/2"
                    style={{ left: "62.5%" }}
                  >
                    750€
                  </span>

                  {/* 1200€ at 100% */}
                  <span className="absolute right-0 translate-x-1/2">
                    1200€
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-sm text-[#33296b]">
                <span>
                  Seleccionado: <strong>€{budget}</strong>/mes
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
              EPK (opcional – subir PDF o enlace)
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
                <span>Usar enlace</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="mr-1"
                  value="upload"
                  checked={epkMode === "upload"}
                  onChange={() => setEpkMode("upload")}
                />
                <span>Subir PDF</span>
              </label>
            </div>

            {epkMode === "link" && (
              <>
                <input
                  type="url"
                  value={epkLink}
                  onChange={(e) => setEpkLink(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
                  placeholder="https://tu-epk.com/presskit.pdf"
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
              ¿En qué te podemos ayudar? / Cuéntanos tu situación
            </label>
            <textarea
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#33286a] focus:ring-[#33286a] text-sm px-3 py-2"
              rows={4}
              placeholder="Dónde estás ahora, qué intentas conseguir, cualquier contexto que quieras compartir..."
            />
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
