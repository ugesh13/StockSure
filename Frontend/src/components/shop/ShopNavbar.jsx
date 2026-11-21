import React, { useState } from 'react';
import { ShoppingCart, ArrowLeft, MapPin, Search, X, User, LogOut } from 'lucide-react';
import { useShop, CITIES } from '../../context/ShopContext';

export default function ShopNavbar({
  searchQuery,
  setSearchQuery,
  onBackToHome,
}) {
  const {
    cart,
    setIsCartOpen,
    selectedCity,
    handleCityChange,
    isAuthenticated,
    currentUser,
    logout,
    setIsLoginModalOpen,
  } = useShop();

  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#F5F1E8]/95 backdrop-blur-md border-b border-[#E2D7C6] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Left: Home Navigation & Logo */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E2D7C6]/50 hover:bg-[#E2D7C6] text-[#183D2B] text-xs font-medium transition-colors cursor-pointer"
            title="Return to cinematic homepage"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Storefront</span>
          </button>

          {/* StockSure Brand Logo */}
          <div
            onClick={onBackToHome}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-full bg-[#183D2B] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <svg
                className="w-4 h-4 text-[#A5C7AA]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-[#183D2B]">
              Stock<span className="text-[#245C3A]">Sure</span>
            </span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xl relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#756B5E] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 235+ fresh groceries, dairy, snacks..."
              className="w-full bg-[#FFFDF8] border border-[#E2D7C6] rounded-full pl-10 pr-9 py-2 text-xs sm:text-sm text-[#292722] placeholder-[#756B5E]/70 focus:outline-none focus:border-[#183D2B] focus:ring-1 focus:ring-[#183D2B] shadow-inner transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-[#756B5E] hover:text-[#292722]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Branch Selector, Auth & Cart */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          
          {/* City Branch Selector */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF8] border border-[#E2D7C6] text-xs text-[#292722]">
            <MapPin className="w-3.5 h-3.5 text-[#245C3A]" />
            <select
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-[#183D2B] focus:outline-none cursor-pointer"
            >
              {CITIES.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}
                </option>
              ))}
            </select>
          </div>

          {/* User Account / Profile Menu */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF8] border border-[#E2D7C6] text-xs text-[#183D2B] font-medium hover:bg-[#E2D7C6]/30 transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#245C3A]" />
                <span className="hidden sm:inline max-w-[80px] truncate">
                  {currentUser?.name?.split(' ')[0] || 'User'}
                </span>
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 top-11 w-48 rounded-2xl bg-[#FFFDF8] border border-[#E2D7C6] shadow-xl p-2 z-50 text-xs animate-fade-in-up">
                  <div className="px-3 py-2 border-b border-[#E2D7C6]/60">
                    <p className="font-semibold text-[#183D2B] truncate">{currentUser?.name}</p>
                    <p className="text-[11px] text-[#756B5E] truncate">{currentUser?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF8] border border-[#E2D7C6] text-xs text-[#183D2B] font-medium hover:bg-[#E2D7C6]/30 transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-[#245C3A]" />
              <span>Sign In</span>
            </button>
          )}

          {/* Cart Icon & Live Badge */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-[#183D2B] hover:bg-[#245C3A] text-white text-xs sm:text-sm font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
            aria-label="Open Cart"
          >
            <ShoppingCart className="w-4 h-4 text-[#A5C7AA]" />
            <span className="hidden sm:inline">Cart</span>
            {cart.item_count > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#A5C7AA] text-[#183D2B] text-xs font-bold leading-none shadow-sm">
                {cart.item_count}
              </span>
            )}
          </button>

        </div>

      </div>
    </header>
  );
}
