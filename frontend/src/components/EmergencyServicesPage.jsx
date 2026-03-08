import React, { useState, useEffect, useCallback } from "react";
import { fetchEmergencyServices } from "../api";
import { detectPosition, haversineKm } from "../geo";

const CATEGORIES = [
  { value: "all", label: "All Services" },
  { value: "hospital", label: "Hospitals" },
  { value: "police", label: "Police Stations" },
  { value: "pharmacy", label: "Pharmacies" },
];

const CATEGORY_META = {
  hospital: {
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    color: "rose",
    label: "Hospitals",
  },
  police: {
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    color: "blue",
    label: "Police Stations",
  },
  pharmacy: {
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    color: "emerald",
    label: "Pharmacies",
  },
};

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_INDEX = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };

function isCurrentlyOpen(openingHours) {
  if (!openingHours) return null; // unknown
  const oh = openingHours.trim();
  if (/^24\/7$/i.test(oh)) return true;
  if (/^off$/i.test(oh)) return false;

  const now = new Date();
  const todayIdx = now.getDay(); // 0=Sun
  const todayAbbr = DAY_NAMES[todayIdx];
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Parse semicolon-separated rules: "Mo-Fr 09:00-17:00; Sa 10:00-14:00"
  const rules = oh.split(";").map((r) => r.trim()).filter(Boolean);
  for (const rule of rules) {
    // Match patterns like "Mo-Fr 09:00-17:00" or "Sa 10:00-14:00" or "09:00-17:00"
    const match = rule.match(
      /^(?:([A-Za-z]{2})(?:\s*-\s*([A-Za-z]{2}))?(?:\s*,\s*([A-Za-z]{2})(?:\s*-\s*([A-Za-z]{2}))?)*\s+)?(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/
    );
    if (!match) continue;

    const [, dayStart, dayEnd, , , timeStart, timeEnd] = match;
    const startMins = parseTime(timeStart);
    const endMins = parseTime(timeEnd);
    if (startMins == null || endMins == null) continue;

    // Check if today is within the day range
    let dayMatch = false;
    if (!dayStart) {
      dayMatch = true; // no day specified = every day
    } else {
      const daysInRule = expandDayRange(rule.split(/\d/)[0].trim());
      dayMatch = daysInRule.includes(todayAbbr);
    }

    if (dayMatch) {
      if (endMins > startMins) {
        if (nowMins >= startMins && nowMins < endMins) return true;
      } else {
        // Overnight: e.g. 22:00-06:00
        if (nowMins >= startMins || nowMins < endMins) return true;
      }
    }
  }
  return false;
}

function parseTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return isNaN(h) || isNaN(m) ? null : h * 60 + m;
}

function expandDayRange(dayStr) {
  // "Mo-Fr" -> ["Mo","Tu","We","Th","Fr"]  or "Sa,Su" -> ["Sa","Su"]
  const result = [];
  const parts = dayStr.split(",").map((s) => s.trim());
  for (const part of parts) {
    const rangeParts = part.split("-").map((s) => s.trim());
    if (rangeParts.length === 2) {
      const startIdx = DAY_INDEX[rangeParts[0]];
      const endIdx = DAY_INDEX[rangeParts[1]];
      if (startIdx != null && endIdx != null) {
        let i = startIdx;
        while (true) {
          result.push(DAY_NAMES[i]);
          if (i === endIdx) break;
          i = (i + 1) % 7;
        }
      }
    } else if (rangeParts.length === 1 && DAY_INDEX[rangeParts[0]] != null) {
      result.push(rangeParts[0]);
    }
  }
  return result;
}

const COLOR_MAP = {
  rose: { bg: "bg-rose-100", text: "text-rose-600", border: "border-rose-200", ring: "ring-rose-200" },
  blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200", ring: "ring-blue-200" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200", ring: "ring-emerald-200" },
  amber: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200", ring: "ring-amber-200" },
};

function sortByDistance(services, userLat, userLon) {
  if (userLat == null || userLon == null) return services;
  return [...services].sort((a, b) => {
    const dA = a.lat != null ? haversineKm(userLat, userLon, a.lat, a.lon) : Infinity;
    const dB = b.lat != null ? haversineKm(userLat, userLon, b.lat, b.lon) : Infinity;
    return dA - dB;
  });
}

function formatDistance(lat, lon, userLat, userLon) {
  if (lat == null || userLat == null) return null;
  const km = haversineKm(userLat, userLon, lat, lon);
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function ServiceCard({ service, userLat, userLon }) {
  const meta = CATEGORY_META[service.category] || CATEGORY_META.hospital;
  const c = COLOR_MAP[meta.color];
  const dist = formatDistance(service.lat, service.lon, userLat, userLon);
  const openStatus = isCurrentlyOpen(service.opening_hours);
  const mapsUrl =
    service.lat != null
      ? `https://www.google.com/maps/search/?api=1&query=${service.lat},${service.lon}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.name)}`;

  return (
    <div className={`bg-white border ${c.border} rounded-xl p-4 hover:shadow-md transition`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 ${c.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <svg className={`w-4.5 h-4.5 ${c.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={meta.icon} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold text-gray-800 leading-tight">{service.name}</h4>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {openStatus === true && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Open
                </span>
              )}
              {openStatus === false && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Closed
                </span>
              )}
              {dist && (
                <span className={`text-xs font-semibold ${c.text} ${c.bg} px-2 py-0.5 rounded-full whitespace-nowrap`}>
                  {dist}
                </span>
              )}
            </div>
          </div>
          {service.address && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{service.address}</p>
          )}
          {service.opening_hours && (
            <p className="text-xs text-gray-400 mt-0.5">{service.opening_hours}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {service.phone && (
              <a
                href={`tel:${service.phone}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {service.phone}
              </a>
            )}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmergencyServicesPage({ tripDetails, onBack }) {
  const locations = tripDetails?.locations || [];
  const [selectedLocation, setSelectedLocation] = useState(locations[0] || "");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLat, setUserLat] = useState(null);
  const [userLon, setUserLon] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("pending"); // pending | granted | denied

  // Detect GPS on mount
  useEffect(() => {
    detectPosition()
      .then(({ latitude, longitude }) => {
        setUserLat(latitude);
        setUserLon(longitude);
        setGpsStatus("granted");
      })
      .catch(() => {
        setGpsStatus("denied");
      });
  }, []);

  const loadServices = useCallback(async () => {
    if (!selectedLocation) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmergencyServices(selectedLocation, selectedCategory);
      setServices(data.services || {});
    } catch {
      setError("Failed to load emergency services. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, selectedCategory]);

  // Load when location or category changes
  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Flatten and optionally sort by distance
  const allServices = Object.entries(services).flatMap(([cat, items]) =>
    items.map((s) => ({ ...s, category: s.category || cat }))
  );
  const sorted = sortByDistance(allServices, userLat, userLon);

  const totalCount = sorted.length;

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <button
        onClick={onBack}
        className="flex items-center text-emerald-600 font-semibold mb-6 hover:translate-x-[-4px] transition-transform"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Trip
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Emergency Services</h2>
        <p className="text-sm text-gray-500">
          Find hospitals, police stations, and pharmacies near your trip locations.
        </p>
      </div>

      {/* GPS status banner */}
      {gpsStatus === "granted" && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-2.5 rounded-xl mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          Location access enabled — results sorted by distance from you
        </div>
      )}

      {/* Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Location</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition"
          >
            {locations.length === 0 && <option value="">No locations configured</option>}
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Facility Type</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-gray-500">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium">Searching for emergency services...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          {totalCount > 0 && (
            <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
              {totalCount} {totalCount === 1 ? "result" : "results"} in {selectedLocation}
            </p>
          )}

          {selectedCategory === "all" ? (
            // Grouped by category
            Object.entries(CATEGORY_META).map(([cat, meta]) => {
              const items = sortByDistance(
                (services[cat] || []).map((s) => ({ ...s, category: cat })),
                userLat,
                userLon
              );
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${COLOR_MAP[meta.color].bg.replace("100", "500")}`} />
                    {meta.label}
                    <span className="text-gray-400 font-normal">({items.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {items.map((s, i) => (
                      <ServiceCard key={`${cat}-${s.osm_id || i}`} service={s} userLat={userLat} userLon={userLon} />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Single category — flat list
            <div className="grid grid-cols-1 gap-2">
              {sorted.map((s, i) => (
                <ServiceCard key={`${s.category}-${s.osm_id || i}`} service={s} userLat={userLat} userLon={userLon} />
              ))}
            </div>
          )}

          {totalCount === 0 && selectedLocation && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-600 mb-1">No services found</p>
              <p className="text-xs text-gray-400">
                No {selectedCategory === "all" ? "emergency services" : CATEGORY_META[selectedCategory]?.label?.toLowerCase()} found for {selectedLocation}.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
