import React from "react";

export default function TripDetailPage({
  tripDetails,
  allGroups,
  onManageExpenses,
  onViewAnalytics,
  onCurrencyConverter,
  onEditTrip,
  onDeleteTrip,
  onBack,
  isOwner,
}) {
  const trip = tripDetails;
  const group = allGroups.find(
    (g) => g.id.toString() === trip?.groupId?.toString()
  );
  const memberCount = group?.members?.length || 0;
  const currencyList = trip?.currencies || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <button
        onClick={onBack}
        className="flex items-center text-emerald-600 font-semibold mb-6 hover:translate-x-[-4px] transition-transform"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to My Trips
      </button>

      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white p-8 rounded-3xl shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-1">{trip?.name || "Untitled Trip"}</h2>
          <p className="text-emerald-200 text-sm font-medium mb-1">
            {trip?.start && trip?.end
              ? `${trip.start} — ${trip.end}`
              : "Dates not set"}
          </p>
          {trip?.created_by_name && (
            <p className="text-emerald-300 text-xs font-medium mb-2">
              Created by {trip.created_by_name}
            </p>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="bg-emerald-800/60 text-emerald-100 text-xs font-semibold px-3 py-1.5 rounded-full">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </span>
            {currencyList.map((c) => (
              <span
                key={c}
                className="bg-emerald-800/60 text-emerald-100 text-xs font-semibold px-3 py-1.5 rounded-full"
              >
                {c}
              </span>
            ))}
            {group && (
              <span className="bg-emerald-800/60 text-emerald-100 text-xs font-semibold px-3 py-1.5 rounded-full">
                {group.name}
              </span>
            )}
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-800 rounded-full opacity-40"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={onManageExpenses}
          className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-emerald-400 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Manage Expenses</h3>
          <p className="text-sm text-gray-500">Add, edit, and track expenses for this trip.</p>
        </button>

        <button
          onClick={onViewAnalytics}
          className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-blue-400 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">View Analytics</h3>
          <p className="text-sm text-gray-500">See spending breakdowns and insights for this trip.</p>
        </button>

        <button
          onClick={onCurrencyConverter}
          className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-amber-400 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Currency Converter</h3>
          <p className="text-sm text-gray-500">Convert between trip currencies with live rates.</p>
        </button>
      </div>

      {isOwner && (
        <div className="flex gap-3">
          <button
            onClick={onEditTrip}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition"
          >
            Edit Trip Details
          </button>
          <button
            onClick={onDeleteTrip}
            className="bg-red-50 border border-red-200 rounded-xl px-6 p-4 text-center text-sm font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
