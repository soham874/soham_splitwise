import React from "react";

const FEATURES = [
  {
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    title: "Your Personal Spend Tracker",
    desc: "Splitwise tracks who owes whom — but not how much you personally spent. This tool fills that gap with per-person expense tracking.",
    color: "rose",
  },
  {
    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
    title: "Multi-Location Trips",
    desc: "Tag expenses by city or destination. See how much you spent in each place across the trip.",
    color: "emerald",
  },
  {
    icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z",
    title: "Visual Analytics",
    desc: "Interactive pie charts and breakdowns by category, location, and date — know exactly where your money went.",
    color: "blue",
  },
  {
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
    title: "Multi-Currency + Live Converter",
    desc: "Add expenses in any currency. Everything is auto-converted to INR, with a built-in live currency converter.",
    color: "amber",
  },
  {
    icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    title: "Smart Splitting",
    desc: "Split expenses equally or customise shares. Auto-balance ensures paid and owed amounts always match.",
    color: "violet",
  },
  {
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    title: "Synced with Splitwise",
    desc: "Expenses are created directly in your Splitwise groups. No duplicate entry — everything stays in sync.",
    color: "teal",
  },
];

const COLOR_MAP = {
  rose: { bg: "bg-rose-100", text: "text-rose-600" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  violet: { bg: "bg-violet-100", text: "text-violet-600" },
  teal: { bg: "bg-teal-100", text: "text-teal-600" },
};

const STEPS = [
  { num: "1", title: "Sign in", desc: "Connect your Splitwise account in one click." },
  { num: "2", title: "Create a Trip", desc: "Pick a Splitwise group, set currencies and locations." },
  { num: "3", title: "Add Expenses", desc: "Log expenses — they sync to Splitwise and track your personal spend." },
  { num: "4", title: "See Insights", desc: "View analytics, breakdowns, and convert currencies on the fly." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      {/* Nav */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-extrabold text-emerald-700 tracking-tight">
          Splitwise Manager
        </h1>
        <a
          href="/api/login"
          className="bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm text-center hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
        >
          Sign in with Splitwise
        </a>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-12 pb-16 md:pt-24 md:pb-24 max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Powered by Splitwise
        </div>

        <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Splitwise tracks balances.
          <br />
          <span className="text-emerald-600">This tracks your spend.</span>
        </h2>

        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-4 leading-relaxed">
          Splitwise is great for splitting bills — but it never tells you how much
          <span className="font-semibold text-gray-700"> you </span>
          actually spent on a trip.
        </p>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          This tool gives you <span className="font-semibold text-gray-700">personal expense tracking</span>,
          category-wise analytics, multi-currency support, and visual breakdowns
          — all synced with your Splitwise groups.
        </p>

        <a
          href="/api/login"
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold px-8 py-4 rounded-2xl text-lg text-center hover:bg-emerald-700 transition shadow-xl shadow-emerald-200 hover:shadow-emerald-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Get Started — It's Free
        </a>
      </section>

      {/* The Problem */}
      <section className="container mx-auto px-6 pb-16 md:pb-24 max-w-3xl">
        <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 rounded-3xl p-8 md:p-10 text-center">
          <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M12 21a9 9 0 100-18 9 9 0 000 18z" />
            </svg>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">
            Ever wondered how much <span className="text-rose-600">you</span> actually spent on a trip?
          </h3>
          <p className="text-gray-500 leading-relaxed max-w-xl mx-auto">
            Splitwise tells you who owes whom — that's it. It doesn't categorise
            your expenses, track spending by location, or show you a personal
            total. After a trip, you're left guessing. <span className="font-semibold text-gray-700">This tool fixes that.</span>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 pb-16 md:pb-24 max-w-5xl">
        <h3 className="text-2xl md:text-3xl font-extrabold text-gray-800 text-center mb-3">
          Everything Splitwise doesn't do
        </h3>
        <p className="text-gray-500 text-center mb-10 max-w-lg mx-auto">
          Built on top of Splitwise to give you the full picture of your travel spending.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const c = COLOR_MAP[f.color] || COLOR_MAP.emerald;
            return (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <svg className={`w-5 h-5 ${c.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-800 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-6 pb-16 md:pb-24 max-w-4xl">
        <h3 className="text-2xl md:text-3xl font-extrabold text-gray-800 text-center mb-10">
          How it works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 text-lg font-extrabold shadow-lg shadow-emerald-200">
                {s.num}
              </div>
              <h4 className="font-bold text-gray-800 mb-1">{s.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 pb-20 md:pb-32 max-w-3xl text-center">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-10 md:p-14 text-white shadow-2xl shadow-emerald-200">
          <h3 className="text-2xl md:text-3xl font-extrabold mb-3">
            Ready to see where your money really goes?
          </h3>
          <p className="text-emerald-200 mb-8 max-w-md mx-auto">
            Connect your Splitwise account and start tracking your personal trip expenses in minutes.
          </p>
          <a
            href="/api/login"
            className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 font-bold px-8 py-4 rounded-2xl text-lg text-center hover:bg-emerald-50 transition shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign in with Splitwise
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        Splitwise Manager &middot; Built for travellers who split bills.
      </footer>
    </div>
  );
}
