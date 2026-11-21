'use client';

import React from 'react';
import Link from 'next/link';
import {
  Menu,
  Search,
  RefreshCw,
  ExternalLink,
  Database,
  Calendar,
  X,
} from 'lucide-react';

interface AdminTopbarProps {
  onToggleSidebar?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  lastUpdated?: string;
  pageTitle?: string;
}

export default function AdminTopbar({
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  isRefreshing = false,
  onRefresh,
  lastUpdated,
  pageTitle = 'Dashboard',
}: AdminTopbarProps) {
  // Format current readable date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-[#DCE7D8] bg-white/85 backdrop-blur-md transition-all">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-[#173D2B] hover:bg-[#DCE7D8]/50 lg:hidden transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#24543A]/80">
              Verdant Nursery
            </span>
            <span className="text-[#A8BFA0]">•</span>
            <span className="text-[11px] font-mono text-stone-500">Live Inventory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif text-[#173D2B] font-semibold leading-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: Search, DB Pill, Refresh, Storefront Link */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Bar with clear button */}
        <div className="relative hidden md:block w-56 lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#24543A]/50 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search plant name, SKU..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] placeholder-[#24543A]/40 focus:outline-none focus:ring-2 focus:ring-[#24543A]/20 focus:border-[#24543A] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Database Status Indicator Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#DCE7D8]/60 border border-[#A8BFA0]/40 text-[#173D2B] text-xs font-mono">
          <Database className="w-3.5 h-3.5 text-[#24543A]" />
          <span className="text-[11px]">Shared DB: store.json</span>
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-[#DCE7D8] bg-white text-[#173D2B] hover:bg-[#F7F8F3] hover:border-[#A8BFA0] active:scale-95 transition-all shadow-sm"
            title="Reload live stock data from shared database"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#24543A] ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}

        {/* Date Display */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] text-xs font-mono">
          <Calendar className="w-3.5 h-3.5 text-[#24543A]" />
          <span>{todayFormatted}</span>
        </div>

        {/* View Customer Store Button */}
        <Link
          href="/shop"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-white shadow-sm hover:shadow transition-all"
          style={{ backgroundColor: '#173D2B' }}
        >
          <span className="hidden sm:inline">Customer Store</span>
          <span className="sm:hidden">Store</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#A8BFA0]" />
        </Link>
      </div>
    </header>
  );
}
