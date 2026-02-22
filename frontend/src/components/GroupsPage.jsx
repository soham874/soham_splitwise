import React from "react";

export default function GroupsPage({ allGroups, onSelectGroup, onRefresh }) {
  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          Your Groups
        </h2>
        <button
          onClick={onRefresh}
          className="text-emerald-600 text-sm font-semibold hover:underline"
        >
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {allGroups.map((g) => (
          <div
            key={g.id}
            onClick={() => onSelectGroup(g.id)}
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center cursor-pointer hover:border-emerald-500 hover:shadow-md transition"
          >
            <div>
              <h3 className="font-bold text-gray-800">{g.name}</h3>
              <p className="text-xs text-gray-500 font-medium">
                {g.members.length} members
              </p>
            </div>
            <svg
              className="w-5 h-5 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
