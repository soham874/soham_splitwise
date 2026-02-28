import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchMyExpenses, updateExpenseDetails, updateStayDates, syncExpenses } from "../api";

const EXPENSE_CATEGORIES = [
  "Important Documents",
  "Preparation",
  "Currency Conversion",
  "Local Transit",
  "Food",
  "Leisure",
  "Memento",
  "Sight Seeing",
  "Misc",
  "Transit - Flight",
  "Transit - Train",
  "Stays - Hotel",
  "Stays - Hostel"
];

const STAY_CATEGORIES = ["Stays - Hotel", "Stays - Hostel"];

const GRAPH_EXCLUDED_CATEGORIES = [
  "Transit - Flight",
];

const PIE_COLORS = [
  "#059669", "#0284c7", "#d97706", "#dc2626", "#7c3aed",
  "#db2777", "#0d9488", "#ca8a04", "#4f46e5", "#ea580c",
  "#16a34a", "#2563eb", "#263960"
];

/* ── Pure SVG Pie Chart ── */
function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumulative = 0;
  const slices = data.map((d, i) => {
    const frac = d.value / total;
    const startAngle = cumulative * 2 * Math.PI;
    cumulative += frac;
    const endAngle = cumulative * 2 * Math.PI;

    const x1 = 50 + 45 * Math.cos(startAngle);
    const y1 = 50 + 45 * Math.sin(startAngle);
    const x2 = 50 + 45 * Math.cos(endAngle);
    const y2 = 50 + 45 * Math.sin(endAngle);
    const largeArc = frac > 0.5 ? 1 : 0;

    // Full circle special case
    if (data.length === 1) {
      return (
        <circle key={i} cx="50" cy="50" r="45" fill={PIE_COLORS[i % PIE_COLORS.length]} />
      );
    }

    return (
      <path
        key={i}
        d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={PIE_COLORS[i % PIE_COLORS.length]}
        stroke="white"
        strokeWidth="1"
      />
    );
  });

  return (
    <svg viewBox="0 0 100 100" className="w-40 h-40 md:w-48 md:h-48 mx-auto">
      {slices}
    </svg>
  );
}

/* ── Grouped breakdown panel (pie + table) ── */
function BreakdownPanel({ title, icon, data, colorKey }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <PieChart data={data} />
      <div className="mt-4 space-y-1.5">
        {data.map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={d.label} className="flex items-center gap-2 text-xs">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="flex-1 text-gray-700 truncate">{d.label || "Not set"}</span>
              <span className="text-gray-400 w-12 text-right">{pct}%</span>
              <span className="font-mono font-bold text-gray-800 w-20 text-right">
                {d.value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Pure SVG Bar Chart ── */
function BarChart({ data, color, unit }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value));
  const barH = 22;
  const gap = 4;
  const labelW = 80;
  const valueW = 70;
  const chartW = 300;
  const totalH = data.length * (barH + gap);

  return (
    <svg viewBox={`0 0 ${labelW + chartW + valueW} ${totalH}`} className="w-full" style={{ maxHeight: Math.max(totalH, 120) }}>
      {data.map((d, i) => {
        const y = i * (barH + gap);
        const w = max > 0 ? (d.value / max) * chartW : 0;
        return (
          <g key={d.label}>
            <text x={labelW - 4} y={y + barH / 2 + 4} textAnchor="end" className="text-[10px] fill-gray-500">
              {d.label.length > 12 ? d.label.slice(5) : d.label}
            </text>
            <rect x={labelW} y={y} width={Math.max(w, 2)} height={barH} rx="3" fill={color} opacity="0.85" />
            <text x={labelW + w + 4} y={y + barH / 2 + 4} className="text-[10px] fill-gray-700 font-mono font-bold">
              {unit}{d.value.toFixed(0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const TABS = [
  { id: "update", label: "Update", icon: "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "stays", label: "Stays", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { id: "expenses", label: "Expenses", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" },
  { id: "breakdown", label: "Breakdown", icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" },
];

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white/10 rounded-xl p-3 md:p-4">
      <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-lg md:text-xl font-bold font-mono">{value}</p>
      {sub && <p className="text-emerald-300 text-[10px] mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage({ tripDetails, currentUser, onBack }) {
  const [expenses, setExpenses] = useState([]);
  const [editState, setEditState] = useState({});
  const [stayEditState, setStayEditState] = useState({});
  const [saving, setSaving] = useState({});
  const [activeTab, setActiveTab] = useState("update");

  const tripLocations = tripDetails?.locations || [];
  const groupId = tripDetails?.groupId;

  const loadExpenses = useCallback(async () => {
    if (!groupId) return;
    try {
      await syncExpenses(groupId).catch(() => {});
      const data = await fetchMyExpenses(groupId);
      setExpenses(data.expenses || []);
    } catch {
      /* ignore */
    }
  }, [groupId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const stayExpenses = useMemo(
    () => expenses.filter((e) => STAY_CATEGORIES.includes(e.category)),
    [expenses]
  );

  const nonStayExpenses = useMemo(
    () => expenses.filter((e) => !STAY_CATEGORIES.includes(e.category)),
    [expenses]
  );

  const incomplete = nonStayExpenses.filter(
    (e) => !e.location || !e.category
  );
  const allExpenses = expenses;

  const grandTotal = useMemo(
    () => allExpenses.reduce((s, e) => s + (e.amount_inr || 0), 0),
    [allExpenses]
  );

  /* ── Grouping helpers ── */
  const groupBy = useCallback((arr, keyFn) => {
    const map = {};
    arr.forEach((e) => {
      const key = keyFn(e) || "Not set";
      map[key] = (map[key] || 0) + (e.amount_inr || 0);
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const byCategory = useMemo(
    () => groupBy(allExpenses, (e) => e.category),
    [allExpenses, groupBy]
  );
  const graphExpenses = useMemo(
    () => allExpenses.filter((e) => !GRAPH_EXCLUDED_CATEGORIES.includes(e.category)),
    [allExpenses]
  );
  const byLocation = useMemo(
    () => groupBy(graphExpenses, (e) => e.location),
    [graphExpenses, groupBy]
  );
  const byDate = useMemo(() => {
    const map = {};
    graphExpenses.forEach((e) => {
      const amt = e.amount_inr || 0;
      if (STAY_CATEGORIES.includes(e.category) && e.start_date && e.end_date && e.start_date !== e.end_date) {
        const start = new Date(e.start_date);
        const end = new Date(e.end_date);
        const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        const perNight = amt / nights;
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10);
          map[key] = (map[key] || 0) + perNight;
        }
      } else {
        const key = e.date || "Not set";
        map[key] = (map[key] || 0) + amt;
      }
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [graphExpenses]);

  /* ── Stay per-night breakdown ── */
  const stayPerNight = useMemo(() => {
    const map = {};
    stayExpenses.forEach((e) => {
      const amt = e.amount_inr || 0;
      if (e.start_date && e.end_date && e.start_date !== e.end_date) {
        const start = new Date(e.start_date);
        const end = new Date(e.end_date);
        const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        const perNight = amt / nights;
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10);
          map[key] = (map[key] || 0) + perNight;
        }
      } else if (e.date) {
        map[e.date] = (map[e.date] || 0) + amt;
      }
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [stayExpenses]);

  const stayAvgPerNight = useMemo(() => {
    if (stayPerNight.length === 0) return 0;
    const total = stayPerNight.reduce((s, d) => s + d.value, 0);
    return total / stayPerNight.length;
  }, [stayPerNight]);

  /* ── Food per-day breakdown ── */
  const foodPerDay = useMemo(() => {
    const map = {};
    expenses
      .filter((e) => e.category === "Food")
      .forEach((e) => {
        const key = e.date || "Not set";
        map[key] = (map[key] || 0) + (e.amount_inr || 0);
      });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [expenses]);

  const foodAvgPerDay = useMemo(() => {
    if (foodPerDay.length === 0) return 0;
    const total = foodPerDay.reduce((s, d) => s + d.value, 0);
    return total / foodPerDay.length;
  }, [foodPerDay]);

  /* ── Detailed stats ── */
  const stats = useMemo(() => {
    if (allExpenses.length === 0) return null;
    const maxExpense = allExpenses.reduce((m, e) => (e.amount_inr || 0) > (m.amount_inr || 0) ? e : m, allExpenses[0]);
    const topCategory = byCategory[0] || { label: "—", value: 0 };
    const topLocation = byLocation[0] || { label: "—", value: 0 };
    const topDate = byDate[0] || { label: "—", value: 0 };
    return { maxExpense, topCategory, topLocation, topDate };
  }, [allExpenses, byCategory, byLocation, byDate]);

  const getEdit = (id) =>
    editState[id] || {};

  const setField = (id, field, value) => {
    setEditState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async (exp) => {
    const edits = getEdit(exp.id);
    const location = edits.location ?? exp.location ?? "";
    const category = edits.category ?? exp.category ?? "";
    setSaving((prev) => ({ ...prev, [exp.id]: true }));
    try {
      await updateExpenseDetails(exp.id, location, category);
      await loadExpenses();
      setEditState((prev) => {
        const next = { ...prev };
        delete next[exp.id];
        return next;
      });
    } finally {
      setSaving((prev) => ({ ...prev, [exp.id]: false }));
    }
  };

  return (
    <div className="container mx-auto py-4 md:py-8 px-4 max-w-5xl">
      <button
        onClick={onBack}
        className="flex items-center text-emerald-600 font-semibold mb-4 hover:translate-x-[-4px] transition-transform"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Trip
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">Analytics</h2>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{tripDetails?.name}</span>
            {tripDetails?.start && tripDetails?.end && (
              <span className="ml-2 text-gray-400">{tripDetails.start} — {tripDetails.end}</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-gray-200 mb-6 gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
            </svg>
            {tab.label}
            {tab.id === "update" && incomplete.length > 0 && (
              <span className="ml-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {incomplete.length}
              </span>
            )}
            {tab.id === "stays" && stayExpenses.length > 0 && (
              <span className="ml-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                {stayExpenses.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Update Expenses ── */}
      {activeTab === "update" && (
        <section>
          {incomplete.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <p className="text-emerald-700 font-semibold text-sm">
                All expenses have location and category set!
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm min-w-[700px]">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3 border-b">Date</th>
                      <th className="p-3 border-b">Description</th>
                      <th className="p-3 border-b text-right">INR</th>
                      <th className="p-3 border-b">Location</th>
                      <th className="p-3 border-b">Category</th>
                      <th className="p-3 border-b text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomplete.map((exp) => {
                      const edits = getEdit(exp.id);
                      const loc = edits.location ?? exp.location ?? "";
                      const cat = edits.category ?? exp.category ?? "";
                      const isSaving = saving[exp.id];
                      const canSave = loc && cat;
                      return (
                        <tr key={exp.id} className="border-b border-gray-50 hover:bg-amber-50/40">
                          <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                            {exp.date || "—"}
                          </td>
                          <td className="p-3 font-semibold text-gray-800">
                            {exp.description}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                            {exp.amount_inr?.toFixed(2)}
                          </td>
                          <td className="p-3">
                            <select
                              value={loc}
                              onChange={(e) => setField(exp.id, "location", e.target.value)}
                              className={`w-full border rounded-lg px-2 py-1.5 text-xs bg-white outline-none ${
                                !loc ? "border-amber-300 bg-amber-50" : "border-gray-200"
                              }`}
                            >
                              <option value="">Select...</option>
                              {tripLocations.map((l) => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <select
                              value={cat}
                              onChange={(e) => setField(exp.id, "category", e.target.value)}
                              className={`w-full border rounded-lg px-2 py-1.5 text-xs bg-white outline-none ${
                                !cat ? "border-amber-300 bg-amber-50" : "border-gray-200"
                              }`}
                            >
                              <option value="">Select...</option>
                              {EXPENSE_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleSave(exp)}
                              disabled={!canSave || isSaving}
                              className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:bg-gray-300 transition"
                            >
                              {isSaving ? "..." : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Tab: Stays ── */}
      {activeTab === "stays" && (
        <section>
          {stayExpenses.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <p className="text-gray-500 text-sm">No stay expenses found. Categorise expenses as "Stays - Hotel" or "Stays - Hostel" first.</p>
            </div>
          ) : (
            <div>
              <div className="px-4 py-3 mb-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs text-gray-500">Set check-in and check-out dates for each stay. The cost will be spread across these dates in analytics.</p>
              </div>
              <div className="space-y-4">
                {stayExpenses.map((exp) => {
                  const edits = stayEditState[exp.id] || {};
                  const locVal = edits.location ?? exp.location ?? "";
                  const startVal = edits.start_date ?? exp.start_date ?? "";
                  const endVal = edits.end_date ?? exp.end_date ?? "";
                  const isSaving = saving[exp.id];
                  const hasEdits = edits.start_date !== undefined || edits.end_date !== undefined || edits.location !== undefined;
                  return (
                    <div key={exp.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{exp.description}</p>
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            {exp.category}
                          </span>
                        </div>
                        <p className="font-mono font-bold text-emerald-600 text-sm whitespace-nowrap">
                          INR {exp.amount_inr?.toFixed(2)}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Location</label>
                          <select
                            value={locVal}
                            onChange={(e) =>
                              setStayEditState((prev) => ({
                                ...prev,
                                [exp.id]: { ...prev[exp.id], location: e.target.value },
                              }))
                            }
                            className={`w-full border rounded-lg px-2.5 py-2 text-xs bg-white outline-none focus:border-blue-400 ${
                              !locVal ? "border-amber-300 bg-amber-50" : "border-gray-200"
                            }`}
                          >
                            <option value="">Select...</option>
                            {tripLocations.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Check-in</label>
                          <input
                            type="date"
                            value={startVal}
                            onChange={(e) =>
                              setStayEditState((prev) => ({
                                ...prev,
                                [exp.id]: { ...prev[exp.id], start_date: e.target.value },
                              }))
                            }
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white outline-none focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Check-out</label>
                          <input
                            type="date"
                            value={endVal}
                            onChange={(e) =>
                              setStayEditState((prev) => ({
                                ...prev,
                                [exp.id]: { ...prev[exp.id], end_date: e.target.value },
                              }))
                            }
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={async () => {
                            setSaving((prev) => ({ ...prev, [exp.id]: true }));
                            try {
                              await updateStayDates(exp.id, startVal, endVal, locVal);
                              await loadExpenses();
                              setStayEditState((prev) => {
                                const next = { ...prev };
                                delete next[exp.id];
                                return next;
                              });
                            } finally {
                              setSaving((prev) => ({ ...prev, [exp.id]: false }));
                            }
                          }}
                          disabled={!hasEdits || isSaving}
                          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-40 disabled:bg-gray-300 transition"
                        >
                          {isSaving ? "..." : "Save"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Tab: Expenses ── */}
      {activeTab === "expenses" && (
        <section>
          {/* Summary banner */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 md:p-8 text-white mb-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
                  Grand Total Spent
                </p>
                <p className="text-3xl md:text-4xl font-bold font-mono">
                  INR {grandTotal.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-4">
                <StatCard label="Expenses" value={allExpenses.length} />
                <StatCard
                  label="Avg / Expense"
                  value={allExpenses.length > 0 ? (grandTotal / allExpenses.length).toFixed(0) : "0"}
                />
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Costliest Expense"
                  value={stats.maxExpense.amount_inr?.toFixed(0)}
                  sub={stats.maxExpense.description}
                />
                <StatCard
                  label="Top Category"
                  value={stats.topCategory.value.toFixed(0)}
                  sub={stats.topCategory.label}
                />
                <StatCard
                  label="Top Location"
                  value={stats.topLocation.value.toFixed(0)}
                  sub={stats.topLocation.label}
                />
                <StatCard
                  label="Highest Day"
                  value={stats.topDate.value.toFixed(0)}
                  sub={stats.topDate.label}
                />
              </div>
            )}
          </div>

          {/* Expense list table */}
          {allExpenses.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3 border-b">Date</th>
                      <th className="p-3 border-b">Description</th>
                      <th className="p-3 border-b">Location</th>
                      <th className="p-3 border-b">Category</th>
                      <th className="p-3 border-b text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allExpenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50 text-[13px]">
                        <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                          {exp.date || "—"}
                        </td>
                        <td className="p-3 font-semibold text-gray-800">
                          {exp.description}
                        </td>
                        <td className="p-3 text-gray-600">
                          {exp.location || (
                            <span className="text-amber-500 italic text-xs">Not set</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">
                          {exp.category ? (
                            <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                              {exp.category}
                            </span>
                          ) : (
                            <span className="text-amber-500 italic text-xs">Not set</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          {exp.amount_inr?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {allExpenses.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <p className="text-gray-500 text-sm">No expenses recorded yet.</p>
            </div>
          )}
        </section>
      )}

      {/* ── Tab: Breakdown ── */}
      {activeTab === "breakdown" && (
        <section>
          {allExpenses.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <p className="text-gray-500 text-sm">No expenses to break down.</p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Stay cost per night */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
                  </svg>
                  Stay Cost Per Night
                </h4>
                <p className="text-xs text-gray-400 mb-4">
                  Avg: <span className="font-mono font-bold text-gray-700">INR {stayAvgPerNight.toFixed(0)}</span> / night
                </p>
                {stayPerNight.length > 0 ? (
                  <BarChart data={stayPerNight} color="#3b82f6" unit="" />
                ) : (
                  <p className="text-xs text-gray-400 italic">No stay dates set yet.</p>
                )}
              </div>

              {/* Food cost per day */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" />
                  </svg>
                  Food Cost Per Day
                </h4>
                <p className="text-xs text-gray-400 mb-4">
                  Avg: <span className="font-mono font-bold text-gray-700">INR {foodAvgPerDay.toFixed(0)}</span> / day
                </p>
                {foodPerDay.length > 0 ? (
                  <BarChart data={foodPerDay} color="#f97316" unit="" />
                ) : (
                  <p className="text-xs text-gray-400 italic">No food expenses found.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BreakdownPanel
                title="By Category"
                icon={
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                }
                data={byCategory}
              />
              <BreakdownPanel
                title="By Location"
                icon={
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                data={byLocation}
              />
              <BreakdownPanel
                title="By Date"
                icon={
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                data={byDate}
              />
            </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
