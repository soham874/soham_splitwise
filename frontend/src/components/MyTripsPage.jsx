import React from "react";

export default function MyTripsPage({ allTrips, allGroups, onSelectTrip, onCreateTrip }) {
  if (!allTrips || allTrips.length === 0) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-lg text-center">
        <div className="bg-white p-10 rounded-3xl border border-gray-200 shadow-sm">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No trips yet</h2>
          <p className="text-gray-500 text-sm mb-8">
            Create your first trip to start tracking expenses with your group.
          </p>
          <button
            onClick={onCreateTrip}
            className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-700 transition"
          >
            Create a Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Trips</h2>
        <button
          onClick={onCreateTrip}
          className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Trip
        </button>
      </div>

      <div className="space-y-4">
        {allTrips.map((trip) => {
          const group = allGroups.find(
            (g) => g.id.toString() === trip.groupId?.toString()
          );
          const memberCount = group?.members?.length || 0;
          const currencyList = trip.currencies || [];

          return (
            <div
              key={trip.id}
              onClick={() => onSelectTrip(trip)}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition cursor-pointer overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
                <h3 className="text-xl font-bold mb-1">{trip.name || "Untitled Trip"}</h3>
                <p className="text-emerald-200 text-sm font-medium">
                  {trip.start && trip.end
                    ? `${trip.start} — ${trip.end}`
                    : "Dates not set"}
                </p>
              </div>

              <div className="p-5 flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Members</p>
                    <p className="text-sm font-semibold text-gray-800">{memberCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Currencies</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {currencyList.length > 0 ? currencyList.join(", ") : "None"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Group</p>
                    <p className="text-sm font-semibold text-gray-800">{group?.name || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-4 flex justify-end">
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  Open trip
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
