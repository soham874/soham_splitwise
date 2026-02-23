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
  const [locations, setLocations] = useState(
    tripDetails?.locations?.length ? tripDetails.locations : ["Bengaluru"]
  );
  const [cityInput, setCityInput] = useState("");

  const toggleCurrency = (code) => {
    setSelectedCurrencies((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const addCity = () => {
    const city = cityInput.trim();
    if (city && !locations.includes(city)) {
      setLocations((prev) => [...prev, city]);
    }
    setCityInput("");
  };

  const removeCity = (city) => {
    setLocations((prev) => prev.filter((c) => c !== city));
  };

  const handleCityKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCity();
    }
  };

  const handleSave = () => {
    onSave({ name, start, end, groupId, currencies: selectedCurrencies, locations });
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-xl">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {tripDetails ? "Edit Trip Details" : "Setup Your Trip"}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {tripDetails
            ? "Update your trip settings below."
            : "Link your Splitwise group and set trip dates."}
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
              Locations
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={handleCityKeyDown}
                className="flex-1 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Type a city name and press Enter"
              />
              <button
                type="button"
                onClick={addCity}
                className="bg-emerald-600 text-white px-4 rounded-lg font-bold hover:bg-emerald-700 transition text-sm"
              >
                Add
              </button>
            </div>
            {locations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {locations.map((city) => (
                  <span
                    key={city}
                    className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200"
                  >
                    {city}
                    <button
                      type="button"
                      onClick={() => removeCity(city)}
                      className="text-emerald-400 hover:text-red-500 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
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
