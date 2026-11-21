import React from 'react';

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 pointer-events-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-2.5 rounded-full bg-[#061a10]/85 backdrop-blur-xl border border-emerald-500/35 shadow-[0_4px_24px_rgba(0,0,0,0.45),0_0_20px_rgba(16,185,129,0.18)] pointer-events-auto transition-all duration-300">
        
        {/* Left: StockSure Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30">
            <svg
              className="w-3.5 h-3.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              <path
                d="M11 6c2-2 5-2 6.5.5-2 2-5 2-6.5-.5z"
                fill="#22c55e"
                stroke="#22c55e"
                strokeWidth="0.8"
              />
            </svg>
          </div>

          <span className="text-sm font-light tracking-wider text-white">
            Stock<span className="text-emerald-400 font-medium">Sure</span>
          </span>
        </div>

        {/* Right: Clean Navigation Links */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            className="text-xs font-light text-white/75 hover:text-white transition-colors duration-200 tracking-wide px-2 py-1"
          >
            Admin
          </button>

          <span className="text-xs font-normal text-emerald-300 px-3.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 tracking-wider">
            Drone Arrival
          </span>
        </div>

      </div>
    </header>
  );
}
