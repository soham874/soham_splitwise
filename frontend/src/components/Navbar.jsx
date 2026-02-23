import React from "react";

export default function Navbar({ onHome }) {
  return (
    <nav className="bg-emerald-600 p-4 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <h1
          className="text-xl font-bold cursor-pointer"
          onClick={onHome}
        >
          Splitwise Manager
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={onHome}
            className="hidden md:block text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 px-3 py-2 rounded transition"
          >
            My Trips
          </button>
          <a
            href="/logout"
            className="bg-emerald-700 hover:bg-emerald-800 px-3 py-2 rounded text-xs md:text-sm font-semibold transition"
          >
            Logout
          </a>
        </div>
      </div>
    </nav>
  );
}
