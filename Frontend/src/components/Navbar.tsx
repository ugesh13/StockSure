'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  User as UserIcon,
  Menu,
  X,
  Sprout,
  ChevronDown,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { CATEGORIES } from '@/data/products';

interface NavbarProps {
  onSelectCategory: (categoryId: string) => void;
  onOpenSearch: () => void;
  onOpenQuiz: () => void;
}

export default function Navbar({ onSelectCategory, onOpenSearch, onOpenQuiz }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { cartCount, setIsCartOpen } = useCart();
  const { user, openAuthModal, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCategoryClick = (catId: string) => {
    onSelectCategory(catId);
    setCategoriesDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 px-4 sm:px-8 py-3 sm:py-4 ${
          scrolled ? 'pt-3' : 'pt-5'
        }`}
      >
        <div
          className={`max-w-7xl mx-auto rounded-navbar transition-all duration-300 px-5 sm:px-8 py-3.5 flex items-center justify-between ${
            scrolled
              ? 'glass-panel shadow-glass border border-forest/10 bg-cream/90'
              : 'bg-cream/60 backdrop-blur-md border border-forest/5 shadow-soft'
          }`}
        >
          {/* Brand Logo */}
          <a
            href="#"
            className="flex items-center gap-2.5 text-forest group"
            onClick={(e) => {
              if (window.location.hash) {
                // Return to top cleanly
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <div className="w-9 h-9 rounded-full bg-forest text-cream flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-sm">
              <Sprout className="w-5 h-5 text-sage-light" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold tracking-widest text-forest leading-none">
                StockSure
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-moss font-semibold mt-0.5">
                Botanical Nursery
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-darktext/90">
            <a
              href="#"
              className="hover:text-forest transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-moss hover:after:w-full after:transition-all"
            >
              Home
            </a>
            <a
              href="#shop"
              className="hover:text-forest transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-moss hover:after:w-full after:transition-all"
            >
              Shop
            </a>

            {/* Categories Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setCategoriesDropdownOpen(true)}
              onMouseLeave={() => setCategoriesDropdownOpen(false)}
            >
              <button
                className="flex items-center gap-1.5 hover:text-forest transition-colors py-1"
                onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
              >
                <span>Categories</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    categoriesDropdownOpen ? 'rotate-180 text-forest' : 'text-darktext/60'
                  }`}
                />
              </button>

              {categoriesDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 glass-panel rounded-panel shadow-elevated border border-forest/10 p-2 z-50 animate-fade-in bg-cream/95 backdrop-blur-xl">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className="w-full text-left px-3.5 py-2.5 rounded-button hover:bg-forest/5 flex items-center justify-between text-xs text-darktext font-medium transition-colors group"
                    >
                      <span className="group-hover:text-forest group-hover:translate-x-1 transition-transform">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-moss bg-moss/10 px-2 py-0.5 rounded-full font-semibold">
                        {cat.count} plants
                      </span>
                    </button>
                  ))}
                  <div className="pt-2 mt-1 border-t border-forest/10">
                    <button
                      onClick={() => handleCategoryClick('all')}
                      className="w-full text-center text-xs font-semibold text-forest hover:text-moss py-1"
                    >
                      View All Botanical Specimens →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <a
              href="#about"
              className="hover:text-forest transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-moss hover:after:w-full after:transition-all"
            >
              About
            </a>

            <a
              href="#plant-care"
              className="hover:text-forest transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-moss hover:after:w-full after:transition-all"
            >
              Plant Care
            </a>

            <button
              onClick={onOpenQuiz}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest bg-forest/5 hover:bg-forest/10 px-3.5 py-1.5 rounded-full transition-colors border border-forest/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-earth" />
              <span>Plant Match Quiz</span>
            </button>
          </nav>

          {/* Action Icons: Search, Account, Cart */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Trigger */}
            <button
              onClick={onOpenSearch}
              aria-label="Search collection"
              className="p-2 sm:p-2.5 rounded-full hover:bg-forest/5 text-forest transition-colors relative"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Account / User Menu */}
            <div className="relative">
              {user ? (
                <div
                  className="relative"
                  onMouseEnter={() => setUserDropdownOpen(true)}
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-forest/5 hover:bg-forest/10 border border-forest/15 text-forest text-xs font-medium transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-forest text-cream text-[11px] font-bold flex items-center justify-center">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline font-medium max-w-[100px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 hidden md:inline text-forest/70" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-panel shadow-elevated border border-forest/10 p-2 z-50 bg-cream/95 backdrop-blur-xl animate-fade-in">
                      <div className="px-3 py-2 border-b border-forest/10">
                        <p className="text-xs font-bold text-forest truncate">{user.name}</p>
                        <p className="text-[11px] text-darktext/60 truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[10px] bg-moss/10 text-moss px-2 py-0.5 rounded-full font-semibold">
                          Botanical Club Member
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 mt-1 rounded-button hover:bg-red-50 text-xs text-red-700 font-medium flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-1.5 rounded-full hover:bg-forest/5 text-forest text-xs font-semibold transition-colors"
                  aria-label="Account sign in"
                >
                  <UserIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>

            {/* Shopping Cart Button with count badge */}
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Shopping Cart"
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-forest text-cream hover:bg-forest-700 transition-colors flex items-center gap-2 shadow-sm relative group"
            >
              <ShoppingBag className="w-4 h-4 text-cream group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-earth text-cream text-[10px] font-bold flex items-center justify-center -ml-1 animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              className="p-2 rounded-full hover:bg-forest/5 text-forest lg:hidden"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden bg-forest/40 backdrop-blur-sm animate-fade-in">
          <div className="fixed top-24 left-4 right-4 bg-cream rounded-panel border border-forest/15 shadow-elevated p-6 max-h-[85vh] overflow-y-auto">
            <nav className="flex flex-col gap-4 text-darktext font-medium text-base">
              <a
                href="#"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-forest/10 hover:text-forest"
              >
                Home
              </a>
              <a
                href="#shop"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-forest/10 hover:text-forest"
              >
                Shop All Plants
              </a>

              <div className="py-2 border-b border-forest/10">
                <span className="text-xs uppercase tracking-wider text-moss font-bold block mb-2">
                  Plant Categories
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className="text-left text-xs text-darktext/80 hover:text-forest p-2 rounded-button bg-cream-dark/40"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-forest/10 hover:text-forest"
              >
                About Our Sanctuary
              </a>
              <a
                href="#plant-care"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-forest/10 hover:text-forest"
              >
                Plant Care & Wisdom
              </a>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuiz();
                }}
                className="w-full text-center py-2.5 bg-forest/10 text-forest rounded-button font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-earth" />
                Find Your Perfect Plant (Quiz)
              </button>

              {!user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('login');
                  }}
                  className="w-full py-3 bg-forest text-cream rounded-button font-semibold text-sm mt-2 shadow-sm"
                >
                  Sign In / Create Account
                </button>
              ) : (
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 border border-red-300 text-red-700 rounded-button font-medium text-sm mt-2"
                >
                  Sign Out ({user.name})
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
