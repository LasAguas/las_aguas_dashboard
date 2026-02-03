"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function safeDate(d) {
  try {
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? null : x;
  } catch {
    return null;
  }
}

function addDaysYMD(dateStr, days) {
  if (!dateStr || days == null) return null;
  const base = safeDate(dateStr);
  if (!base) return null;
  const d = new Date(base);
  d.setDate(d.getDate() + Number(days));
  d.setHours(0, 0, 0, 0);
  return toYMD(d);
}

function computeNextInvoiceOn(plan) {
  if (!plan) return null;
  const { last_invoiced_on, start_date, interval_days } = plan || {};
  const anchor = last_invoiced_on || start_date;
  if (!anchor || interval_days == null) return null;
  return addDaysYMD(anchor, interval_days);
}

// returns Date (or null)
function computeNextFollowupAt(lastContactedAt, everyDays) {
  if (!lastContactedAt || everyDays == null) return null;
  const d = safeDate(lastContactedAt);
  if (!d) return null;
  d.setDate(d.getDate() + Number(everyDays));
  d.setHours(0, 0, 0, 0);
  return d;
}

function normStr(x) {
  return (x == null ? "" : String(x)).trim().toLowerCase();
}

function crmName(e) {
  return e?.display_name || e?.email || e?.phone || "(no name)";
}

function getFieldValue(row, field) {
  if (!row || !field) return null;
  return row[field];
}

// -----------------------------------------------------------------------------
// Filter builder (multi-filter, grouped via optgroups)
// -----------------------------------------------------------------------------
const OPS = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
];

function applyFilters(rows, filters) {
  if (!filters || filters.length === 0) return rows;

  return (rows || []).filter((row) => {
    for (const f of filters) {
      const op = f?.op || "contains";
      const field = f?.field || "";
      const val = f?.value ?? "";

      const raw = getFieldValue(row, field);
      const s = raw == null ? "" : String(raw);
      const sN = normStr(s);
      const vN = normStr(val);

      if (op === "is_empty") {
        if (sN !== "") return false;
        continue;
      }
      if (op === "is_not_empty") {
        if (sN === "") return false;
        continue;
      }

      if (op === "contains") {
        if (!sN.includes(vN)) return false;
        continue;
      }
      if (op === "equals") {
        if (sN !== vN) return false;
        continue;
      }
      if (op === "not_equals") {
        if (sN === vN) return false;
        continue;
      }

      if (op === "gt" || op === "lt") {
        const aNum = Number(raw);
        const bNum = Number(val);

        if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
          if (op === "gt" && !(aNum > bNum)) return false;
          if (op === "lt" && !(aNum < bNum)) return false;
          continue;
        }

        const aD = safeDate(raw);
        const bD = safeDate(val);
        if (aD && bD) {
          if (op === "gt" && !(aD.getTime() > bD.getTime())) return false;
          if (op === "lt" && !(aD.getTime() < bD.getTime())) return false;
          continue;
        }

        return false;
      }
    }
    return true;
  });
}

function FilterBuilder({ groups, filters, setFilters, allData = [] }) {
  // allData is the complete dataset so we can extract unique values
  const [draft, setDraft] = useState({ field: "", op: "contains", value: "" });

  // Extract unique values for the selected field from the dataset
  const getUniqueValuesForField = (fieldName) => {
    if (!fieldName || !allData || allData.length === 0) return [];
    
    const values = new Set();
    
    allData.forEach((row) => {
      const val = row?.[fieldName];
      
      // Skip null, undefined, empty strings
      if (val == null || val === "") return;
      
      // Convert to string for consistent comparison
      const strVal = String(val).trim();
      if (strVal) values.add(strVal);
    });
    
    // Convert Set to sorted array
    return Array.from(values).sort((a, b) => {
      // Try numeric sort first
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // Fall back to string sort
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
  };

  // Determine if selected field should use dropdown or text input
  const shouldUseDropdown = (fieldName) => {
    if (!fieldName) return false;
    
    // Fields that should always use text input (free-form text)
    const textFields = [
      'display_name', 
      'email', 
      'phone', 
      'notes',
      '__last_contacted_at',
      '__next_contact_on',
      'created_at'
    ];
    
    if (textFields.includes(fieldName)) return false;
    
    // For all other fields, use dropdown if we have values
    const uniqueValues = getUniqueValuesForField(fieldName);
    return uniqueValues.length > 0 && uniqueValues.length <= 50; // Cap at 50 options
  };

  // Get unique values for current field
  const uniqueValuesForCurrentField = draft.field 
    ? getUniqueValuesForField(draft.field) 
    : [];

  const add = () => {
    if (!draft.field) return;
    setFilters([...(filters || []), { ...draft }]);
    setDraft({ field: "", op: "contains", value: "" });
  };

  const removeAt = (idx) => {
    const next = [...(filters || [])];
    next.splice(idx, 1);
    setFilters(next);
  };

  return (
    <div className="bg-[#eef8ea] rounded-2xl p-3 mb-3">
      <div className="flex flex-col md:flex-row gap-2 md:items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-[#33286a] mb-1">Field</label>
          <select
            value={draft.field}
            onChange={(e) => setDraft((p) => ({ ...p, field: e.target.value }))}
            className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10"
          >
            <option value="">Select…</option>
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="md:w-48">
          <label className="block text-xs font-semibold text-[#33286a] mb-1">Op</label>
          <select
            value={draft.op}
            onChange={(e) => setDraft((p) => ({ ...p, op: e.target.value }))}
            className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10"
          >
            {OPS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-semibold text-[#33286a] mb-1">Value</label>
          {/* Show dropdown for fields with discrete values, text input for free-form fields */}
          {shouldUseDropdown(draft.field) ? (
            <select
              value={draft.value}
              onChange={(e) => setDraft((p) => ({ ...p, value: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10"
            >
              <option value="">Select value…</option>
              {uniqueValuesForCurrentField.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={draft.value}
              onChange={(e) => setDraft((p) => ({ ...p, value: e.target.value }))}
              placeholder={draft.field ? "Enter value…" : "Select field first"}
              disabled={!draft.field}
              className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={add}
            className="px-4 py-2 rounded-full bg-white text-[#33286a] text-sm font-semibold shadow hover:opacity-90"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setFilters([])}
            className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-white"
          >
            Clear
          </button>
        </div>
      </div>

      {filters?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((f, idx) => (
            <div
              key={`${f.field}-${idx}`}
              className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1 text-xs border border-black/10"
            >
              <span className="font-semibold text-[#33286a]">{f.field}</span>
              <span className="text-[#33286a]/70">{f.op}</span>
              {f.op !== "is_empty" && f.op !== "is_not_empty" ? (
                <span className="text-[#33286a]">“{f.value}”</span>
              ) : null}
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="text-[#33286a]/70 hover:text-[#33286a]"
                aria-label="Remove filter"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-xs text-[#33286a]/70">No filters applied.</div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// UI primitives (match Menu / Posts Stats vibe)
// -----------------------------------------------------------------------------
function Section({ title, subtitle, right, defaultOpen = true, children }) {
  return (
    <details open={defaultOpen} className="bg-[#bbe1ac] rounded-2xl shadow-lg overflow-hidden">
      <summary className="cursor-pointer list-none select-none px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base md:text-lg font-semibold text-[#33286a]">{title}</div>
            {subtitle ? <div className="text-xs text-[#33286a]/80 mt-0.5">{subtitle}</div> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </summary>
      <div className="border-t border-[#a1c596] px-4 py-3">{children}</div>
    </details>
  );
}

function FilterIconButton({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault(); // prevent toggling the <details> open/close
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full shadow ${
        active ? "bg-white" : "bg-[#eef8ea]"
      } hover:bg-white`}
      aria-label={active ? "Hide filters" : "Show filters"}
      title={active ? "Hide filters" : "Show filters"}
    >
      {/* simple funnel-ish icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
          stroke="#33286a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function ListCard({ onClick, title, meta }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-[#eef8ea] rounded-2xl p-3 shadow-sm hover:shadow transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#33286a] truncate">{title}</div>
          {meta ? <div className="text-xs text-[#33286a]/80 mt-1">{meta}</div> : null}
        </div>
        <div className="shrink-0 text-xs text-[#33286a]/60">▸</div>
      </div>
    </button>
  );
}

function ModalShell({ title, onClose, children, footer }) {
  // No background fade (per your request)
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl p-4 md:p-6 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full bg-black/10 p-2 text-sm hover:bg-black/20"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="mb-4">
          <div className="text-lg font-semibold text-[#33286a]">{title}</div>
        </div>

        {children}

        {footer ? <div className="mt-4 pt-4 border-t">{footer}</div> : null}
      </div>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-[#33286a] mb-1">{label}</div>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, placeholder = "Select…" }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TextInput({ value, onChange, placeholder = "" }) {
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10"
    />
  );
}

function TextArea({ value, onChange, placeholder = "", readOnly = false }) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10 min-h-[120px]"
    />
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
export default function LeadsPage() {
  const todayYMD = useMemo(() => toYMD(new Date()), []);

  // Left menu
  const [menuOpen, setMenuOpen] = useState(true);
  const navItems = useMemo(
    () => [
      { href: "/dashboard/calendar", label: "Calendar" },
      { href: "/dashboard/edit-next", label: "Edit Next" },
      { href: "/dashboard/leads", label: "Leads" },
      { href: "/dashboard/onboarding-admin", label: "Onboarding" },
      { href: "/dashboard/posts-stats", label: "Posts Stats" },
    ],
    []
  );

  // Ads leads (raw)
  const [adsLeads, setAdsLeads] = useState([]);
  const [loadingAds, setLoadingAds] = useState(true);

  // CRM
  const [crmEntities, setCrmEntities] = useState([]);
  const [crmInvoicePlans, setCrmInvoicePlans] = useState(new Map());
  const [crmLtvById, setCrmLtvById] = useState(new Map());
  const [crmLastContactById, setCrmLastContactById] = useState(new Map());
  const [loadingCrm, setLoadingCrm] = useState(true);

  const [errorMsg, setErrorMsg] = useState("");

  // Show-more limits
  const [invoiceLimit, setInvoiceLimit] = useState(5);
  const [adsUnansweredLimit, setAdsUnansweredLimit] = useState(5);
  const [adsAnsweredLimit, setAdsAnsweredLimit] = useState(5);
  const [crmLeadsLimit, setCrmLeadsLimit] = useState(5);
  const [crmDsClientsLimit, setCrmDsClientsLimit] = useState(5);
  const [crmCreativeClientsLimit, setCrmCreativeClientsLimit] = useState(5);

  // Filters (per section)
  const [invoiceFilters, setInvoiceFilters] = useState([]);
  const [adsUnansweredFilters, setAdsUnansweredFilters] = useState([]);
  const [adsAnsweredFilters, setAdsAnsweredFilters] = useState([]);
  const [crmLeadsFilters, setCrmLeadsFilters] = useState([]);
  const [crmDsClientFilters, setCrmDsClientFilters] = useState([]);
  const [crmCreativeClientFilters, setCrmCreativeClientFilters] = useState([]);

  // Filter visibility toggles (hidden by default)
  const [showInvoiceFilters, setShowInvoiceFilters] = useState(false);
  const [showAdsUnansweredFilters, setShowAdsUnansweredFilters] = useState(false);
  const [showAdsAnsweredFilters, setShowAdsAnsweredFilters] = useState(false);
  const [showCrmLeadsFilters, setShowCrmLeadsFilters] = useState(false);
  const [showCrmDsClientFilters, setShowCrmDsClientFilters] = useState(false);
  const [showCrmCreativeClientFilters, setShowCrmCreativeClientFilters] = useState(false);

  // Modals
  const [openAdsLead, setOpenAdsLead] = useState(null);
  const [openInvoiceEntity, setOpenInvoiceEntity] = useState(null); // { entity, plan, next_invoice_on, overdue }
  const [openCrmEntity, setOpenCrmEntity] = useState(null); // entity

  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  // ---------------------------------------------------------------------------
  // Loaders
  // ---------------------------------------------------------------------------
  async function loadAdsLeads() {
    setLoadingAds(true);
    setErrorMsg("");
    try {
      const { data: en, error: enErr } = await supabase.from("ad_leads_en").select("*");
      if (enErr) throw enErr;

      const { data: es, error: esErr } = await supabase.from("ad_leads_es").select("*");
      if (esErr) throw esErr;

      const normalize = (row, sourceTable) => ({ ...row, __sourceTable: sourceTable });

      const combined = [
        ...(en || []).map((r) => normalize(r, "ad_leads_en")),
        ...(es || []).map((r) => normalize(r, "ad_leads_es")),
      ];

      combined.sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
      });

      setAdsLeads(combined);
    } catch (e) {
      console.error(e);
      setErrorMsg("Error loading ads leads.");
      setAdsLeads([]);
    } finally {
      setLoadingAds(false);
    }
  }

  async function loadCrm() {
    setLoadingCrm(true);
    setErrorMsg("");
    try {
      const { data: entities, error: entErr } = await supabase
        .from("crm_entities")
        .select("*")
        .order("created_at", { ascending: false });
      if (entErr) throw entErr;

      const { data: plans, error: plErr } = await supabase.from("crm_invoice_plans").select("*");
      if (plErr) throw plErr;

      const planMap = new Map();
      (plans || []).forEach((p) => {
        if (p?.entity_id) planMap.set(p.entity_id, p);
      });

      const { data: txs, error: txErr } = await supabase
        .from("crm_transactions")
        .select("entity_id, amount");
      if (txErr) throw txErr;

      const ltvMap = new Map();
      (txs || []).forEach((t) => {
        const id = t?.entity_id;
        if (!id) return;
        const amt = t?.amount == null ? 0 : Number(t.amount);
        ltvMap.set(id, (ltvMap.get(id) || 0) + (Number.isFinite(amt) ? amt : 0));
      });

      const { data: contacts, error: cErr } = await supabase
        .from("crm_contact_events")
        .select("entity_id, contacted_at")
        .order("contacted_at", { ascending: false });
      if (cErr) throw cErr;

      const lastContactMap = new Map();
      (contacts || []).forEach((c) => {
        if (!c?.entity_id) return;
        if (!lastContactMap.has(c.entity_id)) lastContactMap.set(c.entity_id, c.contacted_at || null);
      });

      setCrmEntities(entities || []);
      setCrmInvoicePlans(planMap);
      setCrmLtvById(ltvMap);
      setCrmLastContactById(lastContactMap);
    } catch (e) {
      console.error(e);
      setErrorMsg("Error loading CRM.");
      setCrmEntities([]);
      setCrmInvoicePlans(new Map());
      setCrmLtvById(new Map());
      setCrmLastContactById(new Map());
    } finally {
      setLoadingCrm(false);
    }
  }

  useEffect(() => {
    loadAdsLeads();
    loadCrm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Derived (ads)
  // ---------------------------------------------------------------------------
  const adsUnanswered = useMemo(
    () => (adsLeads || []).filter((l) => l.answered == null || l.answered === false),
    [adsLeads]
  );
  const adsAnswered = useMemo(() => (adsLeads || []).filter((l) => l.answered === true), [adsLeads]);

  // Dynamic filter fields for ads
  const adsFieldGroups = useMemo(() => {
    const sample = adsLeads?.[0] || {};
    const keys = Object.keys(sample || {})
      .filter((k) => !k.startsWith("__"))
      .sort((a, b) => a.localeCompare(b));
    return [{ label: "Ads Leads", options: keys.map((k) => ({ value: k, label: k })) }];
  }, [adsLeads]);

  // ---------------------------------------------------------------------------
  // Derived (crm)
  // ---------------------------------------------------------------------------
  const crmLeads = useMemo(
    () => (crmEntities || []).filter((e) => normStr(e?.entity_type) === "lead"),
    [crmEntities]
  );
  const crmClientsAll = useMemo(
    () => (crmEntities || []).filter((e) => normStr(e?.entity_type) === "client"),
    [crmEntities]
  );

  // Extract unique services from all CRM entities for dropdown
  const serviceOptions = useMemo(() => {
    const services = new Set();
    (crmEntities || []).forEach((e) => {
      if (e?.service && String(e.service).trim()) {
        services.add(String(e.service).trim());
      }
    });
    return Array.from(services).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [crmEntities]);

  // Split clients:
  // - Active DS clients: DS service OR has invoice plan; but if DS and plan exists && status != active => hide
  // - Creative Services clients: everyone else
  const { crmDsClients, crmCreativeClients } = useMemo(() => {
    const ds = [];
    const creative = [];

    for (const e of crmClientsAll) {
      const plan = e?.id ? crmInvoicePlans.get(e.id) : null;
      const service = normStr(e?.service);
      const isDsService = service.includes("digital") && service.includes("strategy");
      const planStatus = normStr(plan?.status);

      const isDs = isDsService || !!plan;
      const isDsActive = isDs && (plan ? planStatus === "active" : true);

      if (isDs && !isDsActive) continue;

      if (isDs) ds.push(e);
      else creative.push(e);
    }

    return { crmDsClients: ds, crmCreativeClients: creative };
  }, [crmClientsAll, crmInvoicePlans]);

  // CRM filter fields (REAL columns)
  const crmFieldGroups = useMemo(() => {
    const base = [
      { value: "display_name", label: "display_name" },
      { value: "email", label: "email" },
      { value: "phone", label: "phone" },
      { value: "entity_type", label: "entity_type" },
      { value: "pipeline_status", label: "pipeline_status" },
      { value: "service", label: "service" },
      { value: "source", label: "source" },
      { value: "language", label: "language" },
      { value: "direction", label: "direction" },
      { value: "followup_every_days", label: "followup_every_days" },
      { value: "followup_paused", label: "followup_paused" },
      { value: "notes", label: "notes" },
      { value: "created_at", label: "created_at" },
    ];

    return [
      { label: "CRM Entity", options: base },
      {
        label: "Computed",
        options: [
          { value: "__ltv", label: "ltv (computed)" },
          { value: "__last_contacted_at", label: "last_contacted_at (computed)" },
          { value: "__next_contact_on", label: "next_contact_on (computed)" },
        ],
      },
    ];
  }, []);

  function decorateEntityForFiltering(e) {
    const id = e?.id;
    const ltv = id ? crmLtvById.get(id) || 0 : 0;
    const last = id ? crmLastContactById.get(id) || null : null;

    const nextDate = e?.followup_paused
      ? null
      : computeNextFollowupAt(last, e?.followup_every_days);
    const nextYMD = nextDate ? toYMD(nextDate) : null;

    return {
      ...e,
      __ltv: ltv,
      __last_contacted_at: last,
      __next_contact_on: nextYMD,
    };
  }

  // Sort by earliest next contact date (nulls last)
  function sortByNextContact(entities) {
    const rows = (entities || []).map((e) => decorateEntityForFiltering(e));

    rows.sort((a, b) => {
      const na = a.__next_contact_on;
      const nb = b.__next_contact_on;

      if (na && nb && na !== nb) return na.localeCompare(nb);
      if (na && !nb) return -1;
      if (!na && nb) return 1;

      const la = a.__last_contacted_at ? new Date(a.__last_contacted_at).getTime() : Infinity;
      const lb = b.__last_contacted_at ? new Date(b.__last_contacted_at).getTime() : Infinity;
      if (la !== lb) return la - lb;

      const ca = new Date(a.created_at || 0).getTime();
      const cb = new Date(b.created_at || 0).getTime();
      return cb - ca;
    });

    return rows;
  }

  // Invoice notifications
  const invoiceNotifications = useMemo(() => {
    const out = [];
    for (const e of crmEntities || []) {
      if (!e?.id) continue;
      const plan = crmInvoicePlans.get(e.id);
      if (!plan) continue;
      if (normStr(plan.status) !== "active") continue;

      const nextOn = computeNextInvoiceOn(plan);
      if (!nextOn) continue;

      if (nextOn <= todayYMD) {
        out.push({
          entity: decorateEntityForFiltering(e),
          plan,
          next_invoice_on: nextOn,
          overdue: nextOn < todayYMD,
        });
      }
    }

    out.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return (a.next_invoice_on || "").localeCompare(b.next_invoice_on || "");
    });

    return out;
  }, [crmEntities, crmInvoicePlans, crmLtvById, crmLastContactById, todayYMD]);

  // Filtering + sorting per section
  const filteredAdsUnanswered = useMemo(
    () => applyFilters(adsUnanswered, adsUnansweredFilters),
    [adsUnanswered, adsUnansweredFilters]
  );
  const filteredAdsAnswered = useMemo(
    () => applyFilters(adsAnswered, adsAnsweredFilters),
    [adsAnswered, adsAnsweredFilters]
  );

  const filteredCrmLeads = useMemo(() => {
    const sorted = sortByNextContact(crmLeads);
    return applyFilters(sorted, crmLeadsFilters);
  }, [crmLeads, crmLeadsFilters]);

  const filteredCrmDsClients = useMemo(() => {
    const sorted = sortByNextContact(crmDsClients);
    return applyFilters(sorted, crmDsClientFilters);
  }, [crmDsClients, crmDsClientFilters]);

  const filteredCrmCreativeClients = useMemo(() => {
    const sorted = sortByNextContact(crmCreativeClients);
    return applyFilters(sorted, crmCreativeClientFilters);
  }, [crmCreativeClients, crmCreativeClientFilters]);

  // Invoice filter groups
  const invoiceFilterGroups = useMemo(() => {
    return [
      ...crmFieldGroups,
      {
        label: "Invoice",
        options: [
          { value: "__invoice_next", label: "next_invoice_on (computed)" },
          { value: "__invoice_overdue", label: "overdue (computed)" },
        ],
      },
    ];
  }, [crmFieldGroups]);

  const filteredInvoiceRows = useMemo(() => {
    const flat = invoiceNotifications.map((x) => ({
      ...x.entity,
      __invoice_next: x.next_invoice_on,
      __invoice_overdue: x.overdue ? "true" : "false",
    }));

    const filteredFlat = applyFilters(flat, invoiceFilters);
    const keep = new Set(filteredFlat.map((r) => r.id));

    return invoiceNotifications.filter((x) => keep.has(x.entity.id));
  }, [invoiceNotifications, invoiceFilters]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  async function setAdsAnswered(lead, answered) {
    if (!lead?.id || !lead?.__sourceTable) return;
    try {
      const { error } = await supabase.from(lead.__sourceTable).update({ answered }).eq("id", lead.id);
      if (error) throw error;
      await loadAdsLeads();
    } catch (e) {
      console.error(e);
      setErrorMsg("Error updating ad lead answered status.");
    }
  }

  async function updateCrmEntity(entityId, patch) {
    if (!entityId) return;
    try {
      const { error } = await supabase
        .from("crm_entities")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", entityId);
      if (error) throw error;
      await loadCrm();
    } catch (e) {
      console.error(e);
      setErrorMsg("Error updating CRM entity.");
    }
  }

  async function addContactEvent(entityId, { contacted_at, method, note }) {
    if (!entityId) return;
    try {
      const { error } = await supabase.from("crm_contact_events").insert([
        {
          entity_id: entityId,
          contacted_at: contacted_at || new Date().toISOString(),
          method: method || null,
          note: note || null,
        },
      ]);
      if (error) throw error;
      await loadCrm();
    } catch (e) {
      console.error(e);
      setErrorMsg("Error logging contact event.");
    }
  }

  async function addTransaction(entityId, { paid_at, amount, currency, note }) {
    if (!entityId) return;
    try {
      const { error } = await supabase.from("crm_transactions").insert([
        {
          entity_id: entityId,
          paid_at: paid_at || null,
          amount: amount == null || amount === "" ? null : Number(amount),
          currency: currency || null,
          note: note || null,
        },
      ]);
      if (error) throw error;
      await loadCrm();
    } catch (e) {
      console.error(e);
      setErrorMsg("Error adding transaction.");
    }
  }

  async function updateInvoicePlan(entityId, patch) {
    if (!entityId) return;
    try {
      const { error } = await supabase
        .from("crm_invoice_plans")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("entity_id", entityId);
      if (error) throw error;
      await loadCrm();
    } catch (e) {
      console.error(e);
      setErrorMsg("Error updating invoice plan.");
    }
  }

  // ---------------------------------------------------------------------------
  // Modals (mirroring correct CRM columns)
  // ---------------------------------------------------------------------------
  function AdsLeadModal({ lead }) {
    if (!lead) return null;
    const title = lead.email || lead.phone || "(no email/phone)";
    const lang = lead.__sourceTable === "ad_leads_es" ? "ES" : "EN";

    return (
      <ModalShell
        title={`Ad Lead • ${title} (${lang})`}
        onClose={async () => {
          setOpenAdsLead(null);
          await loadAdsLeads();
        }}
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={async () => {
                await setAdsAnswered(lead, true);
                setOpenAdsLead(null);
              }}
              className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
            >
              Mark answered
            </button>
            <button
              type="button"
              onClick={async () => {
                await setAdsAnswered(lead, false);
                setOpenAdsLead(null);
              }}
              className="px-4 py-2 rounded-full bg-white text-[#33286a] text-sm font-semibold shadow hover:opacity-90"
            >
              Mark unanswered
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRow label="Primary">
              <div className="rounded-xl px-3 py-2 text-sm bg-[#eef8ea] border border-black/10">
                {title}
              </div>
            </FieldRow>
            <FieldRow label="Created at">
              <div className="rounded-xl px-3 py-2 text-sm bg-[#eef8ea] border border-black/10">
                {lead.created_at ? new Date(lead.created_at).toLocaleString() : "—"}
              </div>
            </FieldRow>
          </div>

          <FieldRow label="Notes">
            <div className="rounded-xl px-3 py-2 text-sm bg-[#eef8ea] border border-black/10">
              (Ad leads are raw for now — no CRM notes yet)
            </div>
          </FieldRow>

          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="text-sm font-semibold text-[#33286a]">Details</div>
            </summary>
            <div className="p-4 text-sm">
              <pre className="whitespace-pre-wrap break-words text-xs bg-white rounded-xl p-3 border border-black/10">
                {JSON.stringify(
                  Object.fromEntries(Object.entries(lead).filter(([k]) => !k.startsWith("__"))),
                  null,
                  2
                )}
              </pre>
            </div>
          </details>
        </div>
      </ModalShell>
    );
  }

  function InvoiceModal({ row }) {
    if (!row) return null;
    const entity = row.entity;
    const plan = row.plan;

    const [planStatus, setPlanStatus] = useState(plan?.status || null);
    const [startDate, setStartDate] = useState(plan?.start_date || null);
    const [intervalDays, setIntervalDays] = useState(plan?.interval_days ?? "");
    const [lastInvoicedOn, setLastInvoicedOn] = useState(plan?.last_invoiced_on || null);
    const [planNotes, setPlanNotes] = useState(plan?.notes || "");

    const [txPaidAt, setTxPaidAt] = useState(toYMD(new Date()));
    const [txAmount, setTxAmount] = useState("");
    const [txCurrency, setTxCurrency] = useState("USD");
    const [txNote, setTxNote] = useState("");

    const nextInvoice = computeNextInvoiceOn({
      last_invoiced_on: lastInvoicedOn,
      start_date: startDate,
      interval_days: intervalDays === "" ? null : Number(intervalDays),
    });

    return (
      <ModalShell
        title={`Invoice • ${crmName(entity)}`}
        onClose={async () => {
          setOpenInvoiceEntity(null);
          await loadCrm();
        }}
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={async () => {
                await updateInvoicePlan(entity.id, {
                  status: planStatus || null,
                  start_date: startDate || null,
                  interval_days: intervalDays === "" ? null : Number(intervalDays),
                  last_invoiced_on: lastInvoicedOn || null,
                  notes: planNotes || null,
                });
                setOpenInvoiceEntity(null);
              }}
              className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
            >
              Save plan
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Name + notes always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRow label="Client">
              <div className="rounded-xl px-3 py-2 text-sm bg-[#eef8ea] border border-black/10">
                {crmName(entity)}
              </div>
            </FieldRow>
            <FieldRow label="LTV (computed)">
              <div className="rounded-xl px-3 py-2 text-sm bg-[#eef8ea] border border-black/10">
                {Number(entity.__ltv || 0).toLocaleString()}
              </div>
            </FieldRow>
          </div>

          <FieldRow label="Notes (read-only here)">
            <TextArea value={entity.notes || ""} readOnly onChange={() => {}} />
          </FieldRow>

          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="text-sm font-semibold text-[#33286a]">Invoice plan</div>
            </summary>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRow label="Status">
                <Select
                  value={planStatus}
                  onChange={setPlanStatus}
                  options={[
                    { value: "active", label: "active" },
                    { value: "paused", label: "paused" },
                  ]}
                />
              </FieldRow>

              <FieldRow label="Interval (days)">
                <TextInput value={intervalDays} onChange={setIntervalDays} placeholder="e.g. 30" />
              </FieldRow>

              <FieldRow label="Start date">
                <input
                  type="date"
                  value={startDate || ""}
                  onChange={(e) => setStartDate(e.target.value || null)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10"
                />
              </FieldRow>

              <FieldRow label="Last invoiced on">
                <input
                  type="date"
                  value={lastInvoicedOn || ""}
                  onChange={(e) => setLastInvoicedOn(e.target.value || null)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10"
                />
              </FieldRow>

              <FieldRow label="Next invoice on (computed)">
                <div className="rounded-xl px-3 py-2 text-sm bg-[#eef8ea] border border-black/10">
                  {nextInvoice || "—"}
                </div>
              </FieldRow>

              <FieldRow label="Plan notes">
                <TextArea value={planNotes} onChange={setPlanNotes} placeholder="Notes…" />
              </FieldRow>
            </div>
          </details>

          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="text-sm font-semibold text-[#33286a]">Add transaction</div>
            </summary>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRow label="Paid at">
                <input
                  type="date"
                  value={txPaidAt}
                  onChange={(e) => setTxPaidAt(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10"
                />
              </FieldRow>

              <FieldRow label="Amount">
                <TextInput value={txAmount} onChange={setTxAmount} placeholder="e.g. 500" />
              </FieldRow>

              <FieldRow label="Currency">
                <Select
                  value={txCurrency}
                  onChange={(v) => setTxCurrency(v || "USD")}
                  options={[
                    { value: "USD", label: "USD" },
                    { value: "COP", label: "COP" },
                    { value: "EUR", label: "EUR" },
                    { value: "GBP", label: "GBP" },
                  ]}
                />
              </FieldRow>

              <FieldRow label="Note">
                <TextInput value={txNote} onChange={setTxNote} placeholder="Optional…" />
              </FieldRow>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    await addTransaction(entity.id, {
                      paid_at: txPaidAt ? new Date(`${txPaidAt}T12:00:00.000Z`).toISOString() : null,
                      amount: txAmount,
                      currency: txCurrency,
                      note: txNote,
                    });
                    setTxAmount("");
                    setTxNote("");
                  }}
                  className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
                >
                  Add transaction
                </button>
              </div>
            </div>
          </details>
        </div>
      </ModalShell>
    );
  }

  // Modal for adding a new CRM lead
  function AddLeadModal() {
    // Form state - initialize with empty/default values
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [entityType, setEntityType] = useState("lead"); // Default to "lead"
    const [pipelineStatus, setPipelineStatus] = useState("cold"); // Default status
    const [workedBefore, setWorkedBefore] = useState(false);
    const [service, setService] = useState("");
    const [language, setLanguage] = useState("");
    const [direction, setDirection] = useState("Outgoing");
    const [source, setSource] = useState("");
    const [followupEveryDays, setFollowupEveryDays] = useState("4"); // Default to 7 days
    const [followupPaused, setFollowupPaused] = useState(false);
    const [notes, setNotes] = useState("");

    // Individual link fields instead of JSON textarea
    const [youtubeLink, setYoutubeLink] = useState("");
    const [musicLink, setMusicLink] = useState("");
    const [instagramLink, setInstagramLink] = useState("");

    const [extraFields, setExtraFields] = useState(""); // Will be stored as JSONB
    // Loading state for save button
    const [saving, setSaving] = useState(false);

    // Function to create new lead in database
    const handleCreateLead = async () => {
      // Validate required fields
      if (!displayName.trim()) {
        alert("Display name is required");
        return;
      }

      setSaving(true);

      try {
        // Build links object from individual fields
        let linksJson = null;
        const linksObject = {};
        
        // Add each link if it has a value
        if (youtubeLink.trim()) {
          linksObject.youtube = youtubeLink.trim();
        }
        if (musicLink.trim()) {
          linksObject.music = musicLink.trim();
        }
        if (instagramLink.trim()) {
          linksObject.ig = instagramLink.trim();
        }
        
        // Only set linksJson if at least one link was provided
        if (Object.keys(linksObject).length > 0) {
          linksJson = linksObject;
        }

        // Parse extra fields JSON
        let extraFieldsJson = null;
        
        // Try to parse extra fields if provided
        if (extraFields.trim()) {
          try {
            extraFieldsJson = JSON.parse(extraFields);
          } catch (e) {
            alert("Extra fields must be valid JSON (e.g., {\"Quality\":10}). Leave empty if not needed.");
            setSaving(false);
            return;
          }
        }

        // Insert new entity into crm_entities table
        const { data, error } = await supabase
          .from("crm_entities")
          .insert([
            {
              display_name: displayName.trim() || null,
              email: email.trim() || null,
              phone: phone.trim() || null,
              entity_type: entityType,
              pipeline_status: pipelineStatus || null,
              worked_before: workedBefore || null,
              service: service.trim() || null,
              language: language.trim() || null,
              direction: direction || null,
              source: source.trim() || null,
              followup_every_days: followupEveryDays ? Number(followupEveryDays) : null,
              followup_paused: followupPaused || null,
              notes: notes.trim() || null,
              links: linksJson,
              extra_fields: extraFieldsJson,
            },
          ])
          .select();

        if (error) {
          console.error("Error creating lead:", error);
          alert("Failed to create lead. Check console for details.");
          setSaving(false);
          return;
        }

        console.log("✅ Lead created successfully:", data);

        // Close modal and refresh the CRM data
        setShowAddLeadModal(false);
        await loadCrm();

        // Reset form (in case user opens modal again)
        setDisplayName("");
        setEmail("");
        setPhone("");
        setEntityType("lead");
        setPipelineStatus("cold");
        setWorkedBefore(false);
        setService("");
        setLanguage("");
        setDirection("Outgoing");
        setSource("");
        setFollowupEveryDays("7");
        setFollowupPaused(false);
        setNotes("");
        // Reset individual link fields
        setYoutubeLink("");
        setMusicLink("");
        setInstagramLink("");
        setExtraFields("");
      } catch (err) {
        console.error("Unexpected error:", err);
        alert("An unexpected error occurred. Check console.");
      } finally {
        setSaving(false);
      }
    };

    return (
      <ModalShell
        title="Add New Lead"
        onClose={() => {
          setShowAddLeadModal(false);
        }}
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            {/* Cancel button */}
            <button
              type="button"
              onClick={() => setShowAddLeadModal(false)}
              className="px-4 py-2 rounded-full bg-gray-200 text-[#33286a] text-sm font-semibold shadow hover:bg-gray-300"
            >
              Cancel
            </button>
            {/* Save button */}
            <button
              type="button"
              onClick={handleCreateLead}
              disabled={saving}
              className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Creating..." : "Create Lead"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Basic Information Section */}
          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="text-sm font-semibold text-[#33286a]">Basic Information</div>
            </summary>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Display Name (Required) */}
              <FieldRow label="Display Name *">
                <TextInput
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="e.g., John Smith, Band Name"
                />
              </FieldRow>

              {/* Email */}
              <FieldRow label="Email">
                <TextInput
                  value={email}
                  onChange={setEmail}
                  placeholder="email@example.com"
                />
              </FieldRow>

              {/* Phone */}
              <FieldRow label="Phone">
                <TextInput
                  value={phone}
                  onChange={setPhone}
                  placeholder="+1234567890"
                />
              </FieldRow>

              {/* Entity Type */}
              <FieldRow label="Entity Type">
                <Select
                  value={entityType}
                  onChange={setEntityType}
                  options={[
                    { value: "lead", label: "Lead" },
                    { value: "client", label: "Client" },
                  ]}
                />
              </FieldRow>
            </div>
          </details>

          {/* Pipeline & Service Details */}
          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="text-sm font-semibold text-[#33286a]">Pipeline & Service</div>
            </summary>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Pipeline Status */}
              <FieldRow label="Pipeline Status">
                <Select
                  value={pipelineStatus}
                  onChange={setPipelineStatus}
                  options={[
                    { value: "cold", label: "Cold" },
                    { value: "known_uncontacted", label: "Known Uncontacted" },
                    { value: "contacted", label: "Contacted" },
                    { value: "meeting", label: "Meeting" },
                    { value: "signed", label: "Signed" },
                    { value: "worked_before", label: "Worked Before" },
                    { value: "ghosted", label: "Ghosted" },
                    { value: "said_no", label: "Said No" },
                  ]}
                />
              </FieldRow>

              {/* Service */}
              <FieldRow label="Service">
                <Select
                  value={service}
                  onChange={setService}
                  options={[
                    { value: "", label: "— Select —" },
                    ...serviceOptions.map((s) => ({ value: s, label: s })),
                  ]}
                />
              </FieldRow>

              {/* Language */}
              <FieldRow label="Language">
                <TextInput
                  value={language}
                  onChange={setLanguage}
                  placeholder="EN, ES, DE, EN/ES..."
                />
              </FieldRow>

              {/* Direction */}
              <FieldRow label="Direction">
                <Select
                  value={direction}
                  onChange={setDirection}
                  options={[
                    { value: "Outgoing", label: "Outgoing" },
                    { value: "Incoming", label: "Incoming" },
                  ]}
                />
              </FieldRow>

              {/* Source */}
              <FieldRow label="Source">
                <TextInput
                  value={source}
                  onChange={setSource}
                  placeholder="Referral, Web, FB, IG..."
                />
              </FieldRow>

              {/* Worked Before */}
              <FieldRow label="Worked Before">
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={workedBefore}
                    onChange={(e) => setWorkedBefore(e.target.checked)}
                    className="w-4 h-4 text-[#bbe1ac] rounded focus:ring-2 focus:ring-[#bbe1ac]"
                  />
                  <span className="text-sm text-[#33286a]">
                    Yes
                  </span>
                </div>
              </FieldRow>
            </div>
          </details>

          {/* Follow-up Settings */}
          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="text-sm font-semibold text-[#33286a]">Follow-up Settings</div>
            </summary>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Follow-up Every Days */}
              <FieldRow label="Follow-up Every (days)">
                <TextInput
                  value={followupEveryDays}
                  onChange={setFollowupEveryDays}
                  placeholder="7, 14, 30..."
                />
              </FieldRow>

              {/* Follow-up Paused */}
              <FieldRow label="Follow-up Paused">
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={followupPaused}
                    onChange={(e) => setFollowupPaused(e.target.checked)}
                    className="w-4 h-4 text-[#bbe1ac] rounded focus:ring-2 focus:ring-[#bbe1ac]"
                  />
                  <span className="text-sm text-[#33286a]">
                    Paused
                  </span>
                </div>
              </FieldRow>
            </div>
          </details>

          {/* Notes & Additional Info */}
          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="text-sm font-semibold text-[#33286a]">Notes & Additional Info</div>
            </summary>
            <div className="p-4 space-y-3">
              {/* Notes */}
              <FieldRow label="Notes">
                <TextArea
                  value={notes}
                  onChange={setNotes}
                  placeholder="Internal notes about this lead..."
                />
              </FieldRow>
            </div>
          </details>

          {/* Links Section - Separate text fields for each platform */}
          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="text-sm font-semibold text-[#33286a]">Links</div>
            </summary>
            <div className="p-4 space-y-3">
              {/* YouTube Link */}
              <FieldRow label="YouTube">
                <TextInput
                  value={youtubeLink}
                  onChange={setYoutubeLink}
                  placeholder="https://youtube.com/@channelname or video URL"
                />
              </FieldRow>

              {/* Music Link (Spotify, Apple Music, etc.) */}
              <FieldRow label="Music (Spotify, etc.)">
                <TextInput
                  value={musicLink}
                  onChange={setMusicLink}
                  placeholder="https://open.spotify.com/artist/... or Apple Music URL"
                />
              </FieldRow>

              {/* Instagram Link */}
              <FieldRow label="Instagram">
                <TextInput
                  value={instagramLink}
                  onChange={setInstagramLink}
                  placeholder="https://instagram.com/username"
                />
              </FieldRow>

              <div className="text-xs text-[#33286a]/60 mt-2">
                💡 Tip: Just paste the full URL from your browser. Leave empty if not applicable.
              </div>
            </div>
          </details>
        </div>
      </ModalShell>
    );
  }

  function CrmEntityModal({ entity }) {
    if (!entity) return null;

    const [email, setEmail] = useState(entity.email || "");
    const [phone, setPhone] = useState(entity.phone || "");
    const [pipelineStatus, setPipelineStatus] = useState(entity.pipeline_status || null);
    const [service, setService] = useState(entity.service || "");
    const [source, setSource] = useState(entity.source || null);
    const [followupEveryDays, setFollowupEveryDays] = useState(
      entity.followup_every_days == null ? "" : String(entity.followup_every_days)
    );
    const [notes, setNotes] = useState(entity.notes || "");

    // State for loading contact history
    const [contactHistory, setContactHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [contactMethod, setContactMethod] = useState("email");
    const [contactDate, setContactDate] = useState(toYMD(new Date()));
    const [contactNote, setContactNote] = useState("");

    const [txPaidAt, setTxPaidAt] = useState(toYMD(new Date()));
    const [txAmount, setTxAmount] = useState("");
    const [txCurrency, setTxCurrency] = useState("USD");
    const [txNote, setTxNote] = useState("");

    const isClient = normStr(entity.entity_type) === "client";

    // Function to load contact history for this entity
    const loadContactHistory = async () => {
      if (!entity?.id) return;
      
      setLoadingHistory(true);
      try {
        // Fetch all contact events for this entity, ordered by most recent first
        const { data, error } = await supabase
          .from("crm_contact_events")
          .select("*")
          .eq("entity_id", entity.id)
          .order("contacted_at", { ascending: false });

        if (error) {
          console.error("Error loading contact history:", error);
          setContactHistory([]);
        } else {
          setContactHistory(data || []);
        }
      } catch (err) {
        console.error("Unexpected error loading contact history:", err);
        setContactHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    // Load contact history when modal opens
    useEffect(() => {
      loadContactHistory();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entity?.id]);

    return (
      <ModalShell
        title={`${isClient ? "Client" : "Lead"} • ${crmName(entity)}`}
        onClose={async () => {
          setOpenCrmEntity(null);
          await loadCrm();
        }}
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={async () => {
                await updateCrmEntity(entity.id, {
                  email: email.trim() || null,
                  phone: phone.trim() || null,
                  pipeline_status: pipelineStatus || null,
                  service: service || null,
                  source: source || null,
                  followup_every_days: followupEveryDays === "" ? null : Number(followupEveryDays),
                  notes: notes || null,
                });
                setOpenCrmEntity(null);
              }}
              className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Name, Email, Phone, LTV - Always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRow label="Name">
              <div className="rounded-xl px-3 py-2 text-sm bg-[#eef8ea] border border-black/10">
                {crmName(entity)}
              </div>
            </FieldRow>

            <FieldRow label="LTV (computed)">
              <div className="rounded-xl px-3 py-2 text-sm bg-[#eef8ea] border border-black/10">
                {Number(entity.__ltv || 0).toLocaleString()}
              </div>
            </FieldRow>

            {/* Email - Editable */}
            <FieldRow label="Email">
              <TextInput
                value={email}
                onChange={setEmail}
                placeholder="email@example.com"
              />
            </FieldRow>

            {/* Phone - Editable */}
            <FieldRow label="Phone">
              <TextInput
                value={phone}
                onChange={setPhone}
                placeholder="+1234567890"
              />
            </FieldRow>
          </div>

          <FieldRow label="Notes">
            <TextArea value={notes} onChange={setNotes} placeholder="Notes…" />
          </FieldRow>

          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="text-sm font-semibold text-[#33286a]">Details</div>
            </summary>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRow label="Pipeline status">
                <Select
                  value={pipelineStatus}
                  onChange={setPipelineStatus}
                  options={[
                    { value: "cold", label: "cold" },
                    { value: "known_uncontacted", label: "known_uncontacted" },
                    { value: "contacted", label: "contacted" },
                    { value: "meeting", label: "meeting" },
                    { value: "signed", label: "signed" },
                    { value: "worked_before", label: "worked_before" },
                    { value: "ghosted", label: "ghosted" },
                    { value: "said_no", label: "said_no" },
                  ]}
                />
              </FieldRow>

              <FieldRow label="Service">
                <Select
                  value={service || ""}
                  onChange={(v) => setService(v)}
                  options={[
                    { value: "", label: "— Select —" },
                    ...serviceOptions.map((s) => ({ value: s, label: s })),
                  ]}
                />
              </FieldRow>

              <FieldRow label="Source">
                <TextInput value={source || ""} onChange={(v) => setSource(v)} placeholder="manual, referral, crm_import…" />
              </FieldRow>

              <FieldRow label="Follow up every (days)">
                <TextInput value={followupEveryDays} onChange={setFollowupEveryDays} placeholder="e.g. 7" />
              </FieldRow>

              <FieldRow label="Last contacted (computed)">
                <div className="rounded-xl px-3 py-2 text-sm bg-[#eef8ea] border border-black/10">
                  {entity.__last_contacted_at ? new Date(entity.__last_contacted_at).toLocaleString() : "—"}
                </div>
              </FieldRow>

              <FieldRow label="Next contact on (computed)">
                <div className="rounded-xl px-3 py-2 text-sm bg-[#eef8ea] border border-black/10">
                  {entity.__next_contact_on || "—"}
                </div>
              </FieldRow>
            </div>
          </details>

          {/* Links Section - Display social media and web links */}
          {entity.links && Object.keys(entity.links).length > 0 ? (
            <details open className="rounded-2xl border border-black/10 overflow-hidden">
              <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
                <div className="text-sm font-semibold text-[#33286a]">Links</div>
              </summary>
              <div className="p-4">
                <div className="space-y-2">
                  {/* Map through all links and display them */}
                  {Object.entries(entity.links).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2">
                      {/* Link label (e.g., "ig", "spotify", "website") */}
                      <div className="text-xs font-semibold text-[#33286a] min-w-[80px] capitalize">
                        {key}:
                      </div>
                      {/* Clickable link - opens in new tab */}
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline break-all flex-1"
                      >
                        {value}
                      </a>
                      {/* Copy button for convenience */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(value);
                          // Optional: You could add a toast notification here
                          console.log('📋 Copied:', value);
                        }}
                        className="text-xs text-[#33286a] hover:text-[#33286a]/70 px-2 py-1 rounded bg-[#eef8ea] hover:bg-[#bbe1ac] transition-colors"
                        title="Copy link"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ) : null}

          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="text-sm font-semibold text-[#33286a]">Log contact</div>
            </summary>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRow label="Method">
                <Select
                  value={contactMethod}
                  onChange={(v) => setContactMethod(v || "email")}
                  options={[
                    { value: "email", label: "email" },
                    { value: "instagram_dm", label: "instagram_dm" },
                    { value: "whatsapp", label: "whatsapp" },
                    { value: "call", label: "call" },
                    { value: "meeting", label: "meeting" },
                    { value: "tiktok_dm", label: "tiktok_dm" },
                    { value: "other", label: "other" },
                  ]}
                />
              </FieldRow>

              <FieldRow label="Date">
                <input
                  type="date"
                  value={contactDate}
                  onChange={(e) => setContactDate(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10"
                />
              </FieldRow>

              <div className="md:col-span-2">
                <FieldRow label="Note">
                  <TextInput value={contactNote} onChange={setContactNote} placeholder="Optional…" />
                </FieldRow>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    const iso = contactDate
                      ? new Date(`${contactDate}T12:00:00.000Z`).toISOString()
                      : new Date().toISOString();

                    await addContactEvent(entity.id, {
                      contacted_at: iso,
                      method: contactMethod,
                      note: contactNote,
                    });
                    
                    // Clear the note field
                    setContactNote("");
                    
                    // Reload contact history to show the new entry
                    await loadContactHistory();
                  }}
                  className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
                >
                  Log contact
                </button>
              </div>
            </div>
          </details>

                    {/* Contact History Section */}
          <details open className="rounded-2xl border border-black/10 overflow-hidden">
            <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[#33286a]">Contact History</div>
                <div className="text-xs text-[#33286a]/70">
                  {contactHistory.length} {contactHistory.length === 1 ? 'contact' : 'contacts'}
                </div>
              </div>
            </summary>
            <div className="p-4">
              {loadingHistory ? (
                <div className="text-sm text-[#33286a]/60 text-center py-4">
                  Loading contact history...
                </div>
              ) : contactHistory.length === 0 ? (
                <div className="text-sm text-[#33286a]/60 text-center py-4">
                  No contact history yet. Log your first contact below!
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Map through contact history and display each entry */}
                  {contactHistory.map((contact, index) => {
                    const date = contact.contacted_at 
                      ? new Date(contact.contacted_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : '—';
                    
                    const time = contact.contacted_at
                      ? new Date(contact.contacted_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '';

                    return (
                      <div
                        key={contact.id || index}
                        className="rounded-xl p-3 bg-[#eef8ea] border border-black/10"
                      >
                        {/* Header: Date and Method */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-[#33286a]">
                              {date}
                              {time && <span className="text-xs font-normal ml-2 text-[#33286a]/70">{time}</span>}
                            </div>
                          </div>
                          <div className="shrink-0">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-white text-[#33286a] border border-black/10">
                              {contact.method || 'contact'}
                            </span>
                          </div>
                        </div>

                        {/* Note (if exists) */}
                        {contact.note && (
                          <div className="text-sm text-[#33286a] mt-2 pl-3 border-l-2 border-[#bbe1ac]">
                            {contact.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </details>

          {isClient ? (
            <details open className="rounded-2xl border border-black/10 overflow-hidden">
              <summary className="cursor-pointer list-none select-none px-4 py-3 bg-[#eef8ea]">
                <div className="text-sm font-semibold text-[#33286a]">Add transaction</div>
              </summary>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldRow label="Paid at">
                  <input
                    type="date"
                    value={txPaidAt}
                    onChange={(e) => setTxPaidAt(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-sm bg-white border border-black/10"
                  />
                </FieldRow>

                <FieldRow label="Amount">
                  <TextInput value={txAmount} onChange={setTxAmount} placeholder="e.g. 500" />
                </FieldRow>

                <FieldRow label="Currency">
                  <Select
                    value={txCurrency}
                    onChange={(v) => setTxCurrency(v || "EUR")}
                    options={[
                      { value: "EUR", label: "EUR" },
                    ]}
                  />
                </FieldRow>

                <FieldRow label="Note">
                  <TextInput value={txNote} onChange={setTxNote} placeholder="Optional…" />
                </FieldRow>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      await addTransaction(entity.id, {
                        paid_at: txPaidAt ? new Date(`${txPaidAt}T12:00:00.000Z`).toISOString() : null,
                        amount: txAmount,
                        currency: txCurrency,
                        note: txNote,
                      });
                      setTxAmount("");
                      setTxNote("");
                    }}
                    className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
                  >
                    Add transaction
                  </button>
                </div>
              </div>
            </details>
          ) : null}
        </div>
      </ModalShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#a89ee4] flex justify-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4 p-4 md:p-8">
        {/* SIDE MENU */}
        <div className="md:w-64 md:shrink-0">
          <div className="md:hidden flex justify-end mb-2">
            <button
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#bbe1ac] shadow"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? "Hide menu" : "Show menu"}
              type="button"
            >
              <span className="text-xl leading-none">{menuOpen ? "×" : "☰"}</span>
            </button>
          </div>

          <aside className={`${menuOpen ? "block" : "hidden"} md:block w-full bg-[#bbe1ac] rounded-2xl shadow-lg p-4`}>
            <h2 className="text-lg font-semibold mb-3 text-[#33286a]">Menu</h2>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block w-full rounded-lg px-3 py-2 text-sm font-medium hover:bg-white hover:shadow ${
                      item.href === "/dashboard/leads" ? "bg-white" : "bg-[#eef8ea]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* MAIN */}
        <div className="flex-1 flex flex-col gap-4">
          {errorMsg ? (
            <div className="bg-white/70 rounded-2xl p-3 text-sm text-red-700 border border-red-200">{errorMsg}</div>
          ) : null}

          {/* 1) Invoice notifications */}
          <Section
            title="Invoice Notifications"
            subtitle="Due/overdue invoices (click to update plan + add transaction)"
            defaultOpen={true}
            right={
              <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-[#33286a]/80">{loadingCrm ? "Loading…" : `${invoiceNotifications.length} due`}</div>
                <FilterIconButton active={showInvoiceFilters} onClick={() => setShowInvoiceFilters((v) => !v)} />
              </div>
            }
          >
            {showInvoiceFilters ? (
              <FilterBuilder 
                groups={invoiceFilterGroups} 
                filters={invoiceFilters} 
                setFilters={setInvoiceFilters}
                allData={invoiceNotifications.map(x => x.entity)}
              />
            ) : null}

            {loadingCrm ? (
              <div className="text-sm text-[#33286a]/80">Loading invoices…</div>
            ) : filteredInvoiceRows.length === 0 ? (
              <div className="text-sm text-[#33286a]/80">No invoice notifications 🎉</div>
            ) : (
              <div className="space-y-2">
                {filteredInvoiceRows.slice(0, invoiceLimit).map((row) => {
                  const title = crmName(row.entity);
                  const meta = `${row.overdue ? "OVERDUE" : "DUE"} • next: ${row.next_invoice_on} • LTV: ${Number(
                    row.entity.__ltv || 0
                  ).toLocaleString()}`;
                  return <ListCard key={row.entity.id} title={title} meta={meta} onClick={() => setOpenInvoiceEntity(row)} />;
                })}

                {filteredInvoiceRows.length > invoiceLimit ? (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setInvoiceLimit((n) => n + 5)}
                      className="px-4 py-2 rounded-full bg-white text-[#33286a] text-sm font-semibold shadow hover:opacity-90"
                    >
                      Show more (+5)
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </Section>

          {/* 2) Ads leads */}
          <Section
            title="Ads Leads"
            subtitle="Raw leads from forms (no CRM entity created yet)"
            defaultOpen={false}
            right={<div className="text-xs text-[#33286a]/80">{loadingAds ? "Loading…" : `${adsLeads.length} total`}</div>}
          >
            <details open className="bg-white rounded-2xl p-3 mb-3 border border-black/10">
              <summary className="cursor-pointer list-none select-none">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#33286a]">Unanswered</div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-[#33286a]/70">{adsUnanswered.length}</div>
                    <FilterIconButton
                      active={showAdsUnansweredFilters}
                      onClick={() => setShowAdsUnansweredFilters((v) => !v)}
                    />
                  </div>
                </div>
              </summary>

              <div className="mt-3">
                {showAdsUnansweredFilters ? (
                  <FilterBuilder 
                    groups={adsFieldGroups} 
                    filters={adsUnansweredFilters} 
                    setFilters={setAdsUnansweredFilters}
                    allData={adsUnanswered}
                  />
                ) : null}

                {loadingAds ? (
                  <div className="text-sm text-[#33286a]/80">Loading…</div>
                ) : filteredAdsUnanswered.length === 0 ? (
                  <div className="text-sm text-[#33286a]/80">No unanswered ads leads.</div>
                ) : (
                  <div className="space-y-2">
                    {filteredAdsUnanswered.slice(0, adsUnansweredLimit).map((l) => {
                      const title = l.email || l.phone || "(no email/phone)";
                      const meta = `${l.__sourceTable === "ad_leads_es" ? "ES" : "EN"} • ${
                        l.lead_type || "—"
                      } • ${l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}`;
                      return <ListCard key={`${l.__sourceTable}-${l.id}`} title={title} meta={meta} onClick={() => setOpenAdsLead(l)} />;
                    })}

                    {filteredAdsUnanswered.length > adsUnansweredLimit ? (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setAdsUnansweredLimit((n) => n + 5)}
                          className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
                        >
                          Show more (+5)
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </details>

            <details className="bg-white rounded-2xl p-3 border border-black/10">
              <summary className="cursor-pointer list-none select-none">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#33286a]">Answered</div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-[#33286a]/70">{adsAnswered.length}</div>
                    <FilterIconButton
                      active={showAdsAnsweredFilters}
                      onClick={() => setShowAdsAnsweredFilters((v) => !v)}
                    />
                  </div>
                </div>
              </summary>

              <div className="mt-3">
                {showAdsAnsweredFilters ? (
                  <FilterBuilder 
                    groups={adsFieldGroups} 
                    filters={adsAnsweredFilters} 
                    setFilters={setAdsAnsweredFilters}
                    allData={adsAnswered}
                  />
                ) : null}

                {loadingAds ? (
                  <div className="text-sm text-[#33286a]/80">Loading…</div>
                ) : filteredAdsAnswered.length === 0 ? (
                  <div className="text-sm text-[#33286a]/80">No answered ads leads.</div>
                ) : (
                  <div className="space-y-2">
                    {filteredAdsAnswered.slice(0, adsAnsweredLimit).map((l) => {
                      const title = l.email || l.phone || "(no email/phone)";
                      const meta = `${l.__sourceTable === "ad_leads_es" ? "ES" : "EN"} • ${
                        l.lead_type || "—"
                      } • ${l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}`;
                      return <ListCard key={`${l.__sourceTable}-${l.id}`} title={title} meta={meta} onClick={() => setOpenAdsLead(l)} />;
                    })}

                    {filteredAdsAnswered.length > adsAnsweredLimit ? (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setAdsAnsweredLimit((n) => n + 5)}
                          className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
                        >
                          Show more (+5)
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </details>
          </Section>

          {/* 3) CRM Leads */}
          <Section
            title="CRM Leads"
            subtitle="Sorted by earliest next contact date (computed). Click to edit + log contact."
            defaultOpen={true}
            right={
              <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-[#33286a]/80">{loadingCrm ? "Loading…" : `${crmLeads.length} total`}</div>
                <div className="flex gap-2">
                  {/* Add Lead button - opens modal to create new CRM entity */}
                  <button
                    type="button"
                    onClick={() => setShowAddLeadModal(true)}
                    className="px-3 py-1.5 rounded-full bg-white text-[#33286a] text-xs font-semibold shadow hover:opacity-90 transition-opacity"
                    title="Add new lead"
                  >
                    + Add Lead
                  </button>
                  <FilterIconButton active={showCrmLeadsFilters} onClick={() => setShowCrmLeadsFilters((v) => !v)} />
                </div>
              </div>
            }
          >
            {showCrmLeadsFilters ? (
              <FilterBuilder 
                groups={crmFieldGroups} 
                filters={crmLeadsFilters} 
                setFilters={setCrmLeadsFilters}
                allData={crmLeads}
              />
            ) : null}

            {loadingCrm ? (
              <div className="text-sm text-[#33286a]/80">Loading…</div>
            ) : filteredCrmLeads.length === 0 ? (
              <div className="text-sm text-[#33286a]/80">No CRM leads.</div>
            ) : (
              <div className="space-y-2">
                {filteredCrmLeads.slice(0, crmLeadsLimit).map((e) => {
                  const title = crmName(e);
                  const meta = `next: ${e.__next_contact_on || "—"} • status: ${e.pipeline_status || "—"} • source: ${e.source || "—"}`;
                  return <ListCard key={e.id} title={title} meta={meta} onClick={() => setOpenCrmEntity(e)} />;
                })}

                {filteredCrmLeads.length > crmLeadsLimit ? (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setCrmLeadsLimit((n) => n + 5)}
                      className="px-4 py-2 rounded-full bg-white text-[#33286a] text-sm font-semibold shadow hover:opacity-90"
                    >
                      Show more (+5)
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </Section>

          {/* 4) Clients */}
          <Section
            title="Clients"
            subtitle="Split into Active DS clients + Creative Services clients. (Inactive DS clients hidden.)"
            defaultOpen={true}
          >
            <details open className="bg-white rounded-2xl p-3 mb-3 border border-black/10">
              <summary className="cursor-pointer list-none select-none">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#33286a]">Active DS Clients</div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-[#33286a]/70">{crmDsClients.length}</div>
                    <FilterIconButton active={showCrmDsClientFilters} onClick={() => setShowCrmDsClientFilters((v) => !v)} />
                  </div>
                </div>
              </summary>

              <div className="mt-3">
                {showCrmDsClientFilters ? (
                  <FilterBuilder 
                    groups={crmFieldGroups} 
                    filters={crmDsClientFilters} 
                    setFilters={setCrmDsClientFilters}
                    allData={crmDsClients}
                  />
                ) : null}

                {loadingCrm ? (
                  <div className="text-sm text-[#33286a]/80">Loading…</div>
                ) : filteredCrmDsClients.length === 0 ? (
                  <div className="text-sm text-[#33286a]/80">No active DS clients.</div>
                ) : (
                  <div className="space-y-2">
                    {filteredCrmDsClients.slice(0, crmDsClientsLimit).map((e) => {
                      const title = crmName(e);
                      const meta = `next: ${e.__next_contact_on || "—"} • LTV: ${Number(e.__ltv || 0).toLocaleString()} • service: ${e.service || "—"}`;
                      return <ListCard key={e.id} title={title} meta={meta} onClick={() => setOpenCrmEntity(e)} />;
                    })}

                    {filteredCrmDsClients.length > crmDsClientsLimit ? (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setCrmDsClientsLimit((n) => n + 5)}
                          className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
                        >
                          Show more (+5)
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </details>

            <details className="bg-white rounded-2xl p-3 border border-black/10">
              <summary className="cursor-pointer list-none select-none">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#33286a]">Creative Services Clients</div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-[#33286a]/70">{crmCreativeClients.length}</div>
                    <FilterIconButton
                      active={showCrmCreativeClientFilters}
                      onClick={() => setShowCrmCreativeClientFilters((v) => !v)}
                    />
                  </div>
                </div>
              </summary>

              <div className="mt-3">
                {showCrmCreativeClientFilters ? (
                  <FilterBuilder 
                    groups={crmFieldGroups} 
                    filters={crmCreativeClientFilters} 
                    setFilters={setCrmCreativeClientFilters}
                    allData={crmCreativeClients}
                  />
                ) : null}

                {loadingCrm ? (
                  <div className="text-sm text-[#33286a]/80">Loading…</div>
                ) : filteredCrmCreativeClients.length === 0 ? (
                  <div className="text-sm text-[#33286a]/80">No creative services clients.</div>
                ) : (
                  <div className="space-y-2">
                    {filteredCrmCreativeClients.slice(0, crmCreativeClientsLimit).map((e) => {
                      const title = crmName(e);
                      const meta = `next: ${e.__next_contact_on || "—"} • LTV: ${Number(e.__ltv || 0).toLocaleString()} • service: ${e.service || "—"}`;
                      return <ListCard key={e.id} title={title} meta={meta} onClick={() => setOpenCrmEntity(e)} />;
                    })}

                    {filteredCrmCreativeClients.length > crmCreativeClientsLimit ? (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setCrmCreativeClientsLimit((n) => n + 5)}
                          className="px-4 py-2 rounded-full bg-[#bbe1ac] text-[#33286a] text-sm font-semibold shadow hover:bg-[#eef8ea]"
                        >
                          Show more (+5)
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </details>
          </Section>
        </div>
      </div>

      {/* Modals */}
      {openAdsLead ? <AdsLeadModal lead={openAdsLead} /> : null}
      {openInvoiceEntity ? <InvoiceModal row={openInvoiceEntity} /> : null}
      {openCrmEntity ? <CrmEntityModal entity={decorateEntityForFiltering(openCrmEntity)} /> : null}
      {/* Add Lead Modal - shows when showAddLeadModal is true */}
      {showAddLeadModal ? <AddLeadModal /> : null}
    </div>
  );
}
