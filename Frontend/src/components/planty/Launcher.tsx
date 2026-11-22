'use client';

import React from 'react';

interface LauncherProps {
  isOpen: boolean;
  hasUnread: boolean;
  onToggle: () => void;
}

export default function Launcher({ isOpen, hasUnread, onToggle }: LauncherProps) {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Pill Label: "Chat with Planty!" (Desktop only, hidden <640px) */}
      {!isOpen && (
        <div
          className="hidden sm:flex items-center relative py-2 px-4 rounded-full bg-white text-[#2F6B1F] text-xs font-bold shadow-[0_6px_20px_rgba(47,107,31,0.18)] border border-[var(--planty-card-border,#CFE0B5)]/70 transition-transform duration-200 hover:-translate-x-1 cursor-pointer"
          onClick={onToggle}
        >
          <span>Chat with Planty!</span>
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-t border-r border-[var(--planty-card-border,#CFE0B5)]/70 rotate-45" />
        </div>
      )}

      {/* Circle Launcher Button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? 'Close Planty chat' : 'Open Planty chat'}
        aria-expanded={isOpen}
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--planty-launcher,#2F6B1F)] ring-4 ring-[var(--planty-launcher-ring,#DCEBC5)] shadow-[0_10px_28px_rgba(47,107,31,0.35)] flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4BAA34] planty-float"
      >
        <svg
          className="w-7 h-7 sm:w-8 sm:h-8 text-[#FAFDF6] transition-transform duration-200"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 21C12 15 15 12 20 10C20 16 17 20 12 21Z" fill="currentColor" />
          <path d="M12 21C12 16 8 13 4 15C4 20 7 21 12 21Z" fill="currentColor" opacity="0.85" />
          <path d="M12 22V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {hasUnread && !isOpen && (
          <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
        )}
      </button>
    </div>
  );
}
