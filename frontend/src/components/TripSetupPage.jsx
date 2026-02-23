import React, { useState } from "react";

export default function TripSetupPage({
  allGroups,
  availableCurrencies,
  tripDetails,
  onSave,
  onCancel,
}) {
  const [name, setName] = useState(tripDetails?.name || "");
  const [start, setStart] = useState(tripDetails?.start || "");
  const [end, setEnd] = useState(tripDetails?.end || "");
  const [groupId, setGroupId] = useState(
    tripDetails?.groupId || (allGroups[0]?.id?.toString() ?? "")
  );
  const [selectedCurrencies, setSelectedCurrencies] = useState(
    tripDetails?.currencies || []
  );

  const toggleCurrency = (code) => {
    setSelectedCurrencies((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = () => {
    onSave({ name, start, end, groupId, currencies: selectedCurrencies });
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-xl">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Setup Your Trip
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Link your Splitwise group and set trip dates.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
            Trip Currencies
          </label>
          <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
            {availableCurrencies.map((c) => (
              <label
                key={c.currency_code}
                className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 cursor-pointer hover:bg-emerald-50"
              >
                <input
                  type="checkbox"
                  checked={selectedCurrencies.includes(c.currency_code)}
                  onChange={() => toggleCurrency(c.currency_code)}
                  className="rounded text-emerald-600"
                />
                <span className="text-xs font-medium">{c.currency_code}</span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Select the currencies you will use on this trip.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
              Trip Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Euro Summer 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                End Date
              </label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
              Select Splitwise Group
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl mt-4 hover:bg-emerald-700 transition"
          >
            {tripDetails ? "Save Changes" : "Start Trip"}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full text-gray-500 font-semibold py-2 mt-2 hover:text-gray-700 transition text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
