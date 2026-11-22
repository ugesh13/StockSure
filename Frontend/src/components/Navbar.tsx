'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  User as UserIcon,
  Menu,
  X,
  Sprout,
  ChevronDown,
  LogOut,
  Package,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { getStoredToken } from '@/lib/backend';

export default function Navbar() {
  const pathname = usePathname() || '/';
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { cartCount, setIsCartOpen } = useCart();
  const { user, loading, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [hasStoredToken, setHasStoredToken] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(getStoredToken());
    }
    return false;
  });

  useEffect(() => {
    setMounted(true);
    setHasStoredToken(Boolean(getStoredToken()));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isUserLoggedIn = Boolean(user && !user.is_guest);
  const isEffectivelySignedIn = isUserLoggedIn || (mounted && hasStoredToken);

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    setHasStoredToken(false);
    await logout();
  };

  const isHomeActive = pathname === '/';
  const isShopActive = pathname === '/shop';
  const isOrdersActive = pathname === '/profile';
  const isCareActive = pathname === '/plant-care';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-4 sm:px-8 py-3 sm:py-4 ${
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
        {/* Brand Logo -> Link to / */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-forest group"
          onClick={() => {
            if (pathname === '/') {
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
              Botanical Sanctuary
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-darktext/90">
          {isEffectivelySignedIn ? (
            /* ================= SIGNED IN: EXACTLY Home, Shop, My Orders, Plant Care ================= */
            <>
              <Link
                href="/"
                className={`py-1 relative transition-colors ${
                  isHomeActive
                    ? 'text-forest font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-moss'
                    : 'hover:text-forest'
                }`}
              >
                Home
              </Link>
              <Link
                href="/shop"
                className={`py-1 relative transition-colors ${
                  isShopActive
                    ? 'text-forest font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-moss'
                    : 'hover:text-forest'
                }`}
              >
                Shop
              </Link>
              <Link
                href="/profile?tab=orders"
                className={`py-1 relative transition-colors ${
                  isOrdersActive
                    ? 'text-forest font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-moss'
                    : 'hover:text-forest'
                }`}
              >
                My Orders
              </Link>
              <Link
                href="/plant-care"
                className={`py-1 relative transition-colors ${
                  isCareActive
                    ? 'text-forest font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-moss'
                    : 'hover:text-forest'
                }`}
              >
                Plant Care
              </Link>
            </>
          ) : (
            /* ================= SIGNED OUT: About Us, Branches, Contact Us ================= */
            <>
              <a
                href={pathname === '/' ? '#about' : '/#about'}
                className="hover:text-forest transition-colors py-1"
              >
                About Us
              </a>
              <a
                href={pathname === '/' ? '#branches' : '/#branches'}
                className="hover:text-forest transition-colors py-1"
              >
                Branches
              </a>
              <a
                href={pathname === '/' ? '#contact' : '/#contact'}
                className="hover:text-forest transition-colors py-1"
              >
                Contact Us
              </a>
            </>
          )}
        </nav>

        {/* Right Section: Shop Now Button, Cart & Account */}
        <div className="flex items-center gap-3 sm:gap-4">
          {!isEffectivelySignedIn && pathname === '/' && (
            <Link
              href="/shop"
              className="hidden sm:inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-forest text-cream font-bold text-xs uppercase tracking-wider hover:bg-forest-700 transition-colors shadow-soft"
            >
              <span>Shop Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Cart Icon (Only if signed in) */}
          {isEffectivelySignedIn && (
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
          )}

          {/* Account / User Menu */}
          {isEffectivelySignedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-forest/5 hover:bg-forest/10 border border-forest/15 text-forest text-xs font-medium transition-colors"
                aria-expanded={userDropdownOpen}
              >
                <div className="w-6 h-6 rounded-full bg-forest text-cream text-[11px] font-bold flex items-center justify-center">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden md:inline font-medium max-w-[100px] truncate">
                  {user?.name ? user.name.split(' ')[0] : 'Profile'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 hidden md:inline text-forest/70" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 glass-panel rounded-panel shadow-elevated border border-forest/10 p-2 z-50 bg-cream/95 backdrop-blur-xl animate-fade-in text-xs">
                  <div className="px-3 py-2 border-b border-forest/10 mb-1">
                    <p className="font-bold text-forest truncate">{user?.name || 'StockSure Shopper'}</p>
                    <p className="text-[10px] text-darktext/60 truncate">{user?.email || 'shopper@stocksure.in'}</p>
                  </div>

                  <Link
                    href="/profile?tab=profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-button hover:bg-forest/5 text-darktext hover:text-forest transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-moss" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    href="/profile?tab=orders"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-button hover:bg-forest/5 text-darktext hover:text-forest transition-colors"
                  >
                    <Package className="w-3.5 h-3.5 text-moss" />
                    <span>My Orders</span>
                  </Link>

                  <div className="h-[1px] bg-forest/10 my-1" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-button hover:bg-red-50 text-red-700 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-1.5 rounded-full bg-forest text-cream hover:bg-forest-700 text-xs font-semibold transition-colors shadow-xs"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In / Register</span>
            </Link>
          )}

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

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden bg-forest/40 backdrop-blur-sm animate-fade-in">
          <div className="fixed top-24 left-4 right-4 bg-cream rounded-panel border border-forest/15 shadow-elevated p-6 max-h-[85vh] overflow-y-auto">
            <nav className="flex flex-col gap-3 text-darktext font-medium text-sm">
              {isEffectivelySignedIn ? (
                <>
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 border-b border-forest/10 hover:text-forest"
                  >
                    Home
                  </Link>
                  <Link
                    href="/shop"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 border-b border-forest/10 hover:text-forest"
                  >
                    Shop
                  </Link>
                  <Link
                    href="/profile?tab=orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 border-b border-forest/10 hover:text-forest"
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/plant-care"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 border-b border-forest/10 hover:text-forest"
                  >
                    Plant Care
                  </Link>
                  <Link
                    href="/profile?tab=profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 border-b border-forest/10 text-moss"
                  >
                    Profile ({user?.name})
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left py-2 text-red-700 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <a
                    href={pathname === '/' ? '#about' : '/#about'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 border-b border-forest/10 hover:text-forest"
                  >
                    About Us
                  </a>
                  <a
                    href={pathname === '/' ? '#branches' : '/#branches'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 border-b border-forest/10 hover:text-forest"
                  >
                    Branches
                  </a>
                  <a
                    href={pathname === '/' ? '#contact' : '/#contact'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 border-b border-forest/10 hover:text-forest"
                  >
                    Contact Us
                  </a>

                  {pathname === '/' && (
                    <Link
                      href="/shop"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2.5 px-4 bg-forest text-cream rounded-button font-semibold text-center flex items-center justify-center gap-2"
                    >
                      <span>Shop Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}

                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 text-center border border-forest/20 text-forest rounded-button font-semibold text-xs mt-1"
                  >
                    Sign In / Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
