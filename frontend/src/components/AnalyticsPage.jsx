import React from "react";

export default function AnalyticsPage({ tripDetails, onBack }) {
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

      <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Analytics</h2>
        <p className="text-gray-500 text-sm mb-2">
          <span className="font-semibold text-gray-700">{tripDetails?.name}</span>
        </p>
        <p className="text-gray-400 text-sm">
          Trip analytics and spending insights are coming soon.
        </p>
      </div>
    </div>
  );
}
