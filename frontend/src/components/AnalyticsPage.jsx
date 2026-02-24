import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchMyExpenses, updateExpenseDetails } from "../api";

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

const PIE_COLORS = [
  "#059669", "#0284c7", "#d97706", "#dc2626", "#7c3aed",
  "#db2777", "#0d9488", "#ca8a04", "#4f46e5", "#ea580c",
  "#16a34a", "#2563eb",
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

export default function AnalyticsPage({ tripDetails, currentUser, onBack }) {
  const [expenses, setExpenses] = useState([]);
  const [editState, setEditState] = useState({});
  const [saving, setSaving] = useState({});

  const tripLocations = tripDetails?.locations || [];
  const groupId = tripDetails?.groupId;

  const loadExpenses = useCallback(async () => {
    if (!groupId) return;
    try {
      const data = await fetchMyExpenses(groupId);
      setExpenses(data.expenses || []);
    } catch {
      /* ignore */
    }
  }, [groupId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const incomplete = expenses.filter(
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
  const byLocation = useMemo(
    () => groupBy(allExpenses, (e) => e.location),
    [allExpenses, groupBy]
  );
  const byDate = useMemo(
    () => groupBy(allExpenses, (e) => e.date),
    [allExpenses, groupBy]
  );

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
        className="flex items-center text-emerald-600 font-semibold mb-6 hover:translate-x-[-4px] transition-transform"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Trip
      </button>

      <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">
        Analytics
      </h2>
      <p className="text-sm text-gray-500 mb-8">
        <span className="font-semibold text-gray-700">{tripDetails?.name}</span>
        {tripDetails?.start && tripDetails?.end && (
          <span className="ml-2 text-gray-400">
            {tripDetails.start} — {tripDetails.end}
          </span>
        )}
      </p>

      {/* ── Section 1: Update Expenses ── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            Update Expenses
            {incomplete.length > 0 && (
              <span className="ml-2 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {incomplete.length} pending
              </span>
            )}
          </h3>
        </div>

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

      {/* ── Section 2: Expenses Summary ── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">Expenses</h3>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
                Grand Total Spent
              </p>
              <p className="text-3xl md:text-4xl font-bold font-mono">
                INR {grandTotal.toFixed(2)}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider">Expenses</p>
                <p className="text-xl font-bold">{allExpenses.length}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider">Avg / Expense</p>
                <p className="text-xl font-bold font-mono">
                  {allExpenses.length > 0 ? (grandTotal / allExpenses.length).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Expense list table */}
        {allExpenses.length > 0 && (
          <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
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
      </section>

      {/* ── Section 3: Expense Breakdown ── */}
      {allExpenses.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Expense Breakdown</h3>
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
        </section>
      )}
    </div>
  );
}
