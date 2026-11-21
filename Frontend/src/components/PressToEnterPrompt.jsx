import React from 'react';

export default function PressToEnterPrompt({ onClick, isVisible }) {
  if (!isVisible) return null;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 cursor-pointer group outline-none transition-all duration-700 ease-out animate-fadeIn"
    >
      <div className="flex items-center gap-3.5 px-6 py-2.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/[0.12] hover:border-emerald-400/35 shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300">
        
        {/* Concentric Target Circle Indicator */}
        <div className="relative flex items-center justify-center w-5 h-5">
          <div className="absolute inset-0 rounded-full border border-white/40 group-hover:border-emerald-400/60 transition-colors duration-300" />
          <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping opacity-75" />
          <div className="w-1.5 h-1.5 rounded-full bg-white group-hover:bg-emerald-400 transition-colors duration-300" />
        </div>

        {/* Text */}
        <span className="text-xs font-light tracking-[0.25em] uppercase text-white/95 group-hover:text-white transition-colors duration-300">
          Press To Enter
        </span>

      </div>
    </div>
  );
}
