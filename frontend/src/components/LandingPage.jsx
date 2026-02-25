import React from "react";

const FEATURES = [
  {
    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
    title: "Multi-Location Trips",
    desc: "Track expenses across multiple destinations in a single trip.",
  },
  {
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
    title: "Smart Splitting",
    desc: "Split expenses equally or customize shares. Auto-balance keeps totals in check.",
  },
  {
    icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z",
    title: "Visual Analytics",
    desc: "See spending breakdowns by category, location, and date with charts and stats.",
  },
  {
    icon: "M3 10h11M9 21V3m0 0L4 8m5-5l5 5",
    title: "Multi-Currency",
    desc: "Add expenses in any currency — everything is automatically converted to INR.",
  },
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
          className="bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
        >
          Sign in with Splitwise
        </a>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-12 pb-20 md:pt-24 md:pb-32 max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Powered by Splitwise
        </div>

        <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Trip expenses,
          <br />
          <span className="text-emerald-600">beautifully managed.</span>
        </h2>

        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Create trips, split expenses with your group, track spending across
          locations and currencies — all synced with your Splitwise account.
        </p>

        <a
          href="/api/login"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-emerald-700 transition shadow-xl shadow-emerald-200 hover:shadow-emerald-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Get Started — It's Free
        </a>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 pb-20 md:pb-32 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={f.icon} />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        Splitwise Manager &middot; Built for travellers who split bills.
      </footer>
    </div>
  );
}
