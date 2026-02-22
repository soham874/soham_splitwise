import React from "react";

export default function TripSummaryPage({
  tripDetails,
  allGroups,
  onManageExpenses,
  onEditTrip,
}) {
  const group = allGroups.find(
    (g) => g.id.toString() === tripDetails?.groupId?.toString()
  );

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-1">{tripDetails?.name}</h2>
          <p className="text-emerald-200 text-sm font-medium mb-6">
            {tripDetails?.start} to {tripDetails?.end}
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={onManageExpenses}
              className="bg-white text-emerald-900 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-emerald-50 transition"
            >
              Manage Expenses
            </button>
            <button
              onClick={onEditTrip}
              className="bg-emerald-800 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-emerald-700 transition"
            >
              Edit Trip Info
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-800 rounded-full opacity-50"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-400 text-[10px] uppercase tracking-widest mb-4">
            Linked Splitwise Group
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
              {group?.name?.[0] || "G"}
            </div>
            <div>
              <p className="font-bold text-gray-800">
                {group?.name || "Group Name"}
              </p>
              <p className="text-xs text-gray-500">
                {group?.members?.length || 0} Members
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
