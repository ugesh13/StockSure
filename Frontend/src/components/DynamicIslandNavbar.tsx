'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import {
  Sprout,
  User,
  Menu,
  X,
  ShoppingBag,
  LogOut,
  Package,
  UserCheck,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { getStoredToken } from '@/lib/backend';

export default function DynamicIslandNavbar() {
  const pathname = usePathname() || '/';
  const { user, loading, logout } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<'home' | 'about' | 'branches' | 'contact'>('home');

  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Synchronous check on client to prevent flash of signed-out navbar during refresh
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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine signed in state
  const isUserLoggedIn = Boolean(user && !user.is_guest);
  const isEffectivelySignedIn = isUserLoggedIn || (mounted && hasStoredToken);

  // Scroll Progress Tracking via Framer Motion
  const { scrollY } = useScroll();

  const maxWidthRaw = useTransform(scrollY, [0, 420], [720, 1180]);
  const scaleRaw = useTransform(scrollY, [0, 420], [1, 1.025]);
  const linkGapRaw = useTransform(scrollY, [0, 420], [8, 36]);
  const linkPaddingXRaw = useTransform(scrollY, [0, 420], [12, 20]);

  const smoothMaxWidth = useSpring(maxWidthRaw, { stiffness: 110, damping: 22, mass: 0.7 });
  const smoothScale = useSpring(scaleRaw, { stiffness: 110, damping: 22, mass: 0.7 });
  const smoothLinkGap = useSpring(linkGapRaw, { stiffness: 110, damping: 22, mass: 0.7 });
  const smoothLinkPaddingX = useSpring(linkPaddingXRaw, { stiffness: 110, damping: 22, mass: 0.7 });

  // Scrollspy for single page home sections
  useEffect(() => {
    if (pathname !== '/') return;

    const handleScroll = () => {
      const scrollPos = window.scrollY + 250;
      const contactEl = document.getElementById('contact');
      const branchesEl = document.getElementById('branches');
      const aboutEl = document.getElementById('about');

      if (contactEl && scrollPos >= contactEl.offsetTop) {
        setActiveSection('contact');
      } else if (branchesEl && scrollPos >= branchesEl.offsetTop) {
        setActiveSection('branches');
      } else if (aboutEl && scrollPos >= aboutEl.offsetTop) {
        setActiveSection('about');
      } else {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    if (pathname === '/') {
      e.preventDefault();
      setMobileMenuOpen(false);
      if (sectionId === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    setHasStoredToken(false);
    await logout();
  };

  const isHomeActive = pathname === '/' && (!activeSection || activeSection === 'home');
  const isShopActive = pathname === '/shop';
  const isOrdersActive = pathname === '/profile';
  const isCareActive = pathname === '/plant-care' || (pathname === '/' && activeSection === ('care' as any));

  return (
    <header className="fixed top-5 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
      <motion.div
        style={{
          maxWidth: smoothMaxWidth,
          scale: smoothScale,
          transformOrigin: 'center center',
        }}
        className={`pointer-events-auto relative w-full ${mobileMenuOpen ? 'max-w-sm rounded-[32px]' : 'rounded-full'
          } bg-[#121E17]/75 hover:bg-[#121E17]/85 backdrop-blur-2xl border border-white/20 hover:border-white/30 shadow-[0_16px_40px_rgba(0,0,0,0.35),0_4px_16px_rgba(0,0,0,0.2)] ring-1 ring-white/10 transition-colors duration-300 flex flex-col justify-center`}
      >
        {/* Main Navigation Bar */}
        <div className="flex items-center justify-between py-2.5 px-4 sm:px-6">
          {/* Logo -> Links to / */}
          <div className="flex items-center flex-shrink-0">
            <Link
              href="/"
              onClick={(e) => {
                if (pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="group flex items-center gap-2.5 py-1.5 px-3 rounded-full text-white hover:bg-white/10 transition-all duration-300 flex-shrink-0"
            >
              <div className="w-6 h-6 rounded-full bg-moss/90 text-cream flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xs">
                <Sprout className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="editorial-serif text-lg font-bold tracking-widest leading-none text-white">
                StockSure
              </span>
            </Link>

            <span className="hidden md:block h-5 w-[1.5px] bg-white/35 ml-2 sm:ml-3 rounded-full" aria-hidden="true" />
          </div>

          {/* Desktop Navigation Links */}
          <motion.nav
            style={{ gap: smoothLinkGap }}
            className="hidden md:flex items-center justify-center flex-1 mx-2 sm:mx-4 text-xs lg:text-sm font-medium whitespace-nowrap"
          >
            {isEffectivelySignedIn ? (
              /* ================= SIGNED IN: EXACTLY Home, Shop, My Orders, Plant Care ================= */
              <>
                {/* 1. Home */}
                <Link
                  href="/"
                  onClick={(e) => {
                    if (pathname === '/') {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`py-1.5 px-3.5 rounded-full whitespace-nowrap transition-all duration-200 ${isHomeActive
                    ? 'bg-white/20 text-white border border-white/30 font-semibold shadow-xs'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Home
                </Link>

                {/* 2. Shop */}
                <Link
                  href="/shop"
                  className={`py-1.5 px-3.5 rounded-full whitespace-nowrap transition-all duration-200 ${isShopActive
                    ? 'bg-white/20 text-white border border-white/30 font-semibold shadow-xs'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Shop
                </Link>

                {/* 3. My Orders */}
                <Link
                  href="/profile?tab=orders"
                  className={`py-1.5 px-3.5 rounded-full whitespace-nowrap transition-all duration-200 ${isOrdersActive
                    ? 'bg-white/20 text-white border border-white/30 font-semibold shadow-xs'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                >
                  My Orders
                </Link>

                {/* 4. Plant Care */}
                <Link
                  href="/plant-care"
                  className={`py-1.5 px-3.5 rounded-full whitespace-nowrap transition-all duration-200 ${isCareActive
                    ? 'bg-white/20 text-white border border-white/30 font-semibold shadow-xs'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Plant Care
                </Link>
              </>
            ) : (
              /* ================= SIGNED OUT: About Us, Branches, Contact Us ================= */
              <>
                <motion.a
                  style={{ paddingLeft: smoothLinkPaddingX, paddingRight: smoothLinkPaddingX }}
                  href={pathname === '/' ? '#about' : '/#about'}
                  onClick={(e) => handleScrollTo(e, 'about')}
                  className={`py-1.5 rounded-full whitespace-nowrap transition-colors duration-300 ${pathname === '/' && activeSection === 'about'
                    ? 'bg-white/15 text-white border border-white/25 font-semibold shadow-xs'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                >
                  About Us
                </motion.a>

                <motion.a
                  style={{ paddingLeft: smoothLinkPaddingX, paddingRight: smoothLinkPaddingX }}
                  href={pathname === '/' ? '#branches' : '/#branches'}
                  onClick={(e) => handleScrollTo(e, 'branches')}
                  className={`py-1.5 rounded-full whitespace-nowrap transition-colors duration-300 ${pathname === '/' && activeSection === 'branches'
                    ? 'bg-white/15 text-white border border-white/25 font-semibold shadow-xs'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Branches
                </motion.a>

                <motion.a
                  style={{ paddingLeft: smoothLinkPaddingX, paddingRight: smoothLinkPaddingX }}
                  href={pathname === '/' ? '#contact' : '/#contact'}
                  onClick={(e) => handleScrollTo(e, 'contact')}
                  className={`py-1.5 rounded-full whitespace-nowrap transition-colors duration-300 ${pathname === '/' && activeSection === 'contact'
                    ? 'bg-white/15 text-white border border-white/25 font-semibold shadow-xs'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Contact Us
                </motion.a>
              </>
            )}
          </motion.nav>

          {/* Right Controls: Cart, Primary Button & User Menu */}
          <div className="hidden md:flex items-center gap-2.5 flex-shrink-0">
            {/* Signed-Out Home Page: Shop Now Primary Button */}
            {!isEffectivelySignedIn && pathname === '/' && (
              <Link
                href="/shop"
                className="flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-moss hover:bg-moss-700 text-cream font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow-elevated border border-white/15"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <span className="h-5 w-[1.5px] bg-white/35 rounded-full" aria-hidden="true" />

            {/* Shopping Cart Button (Always visible when signed in) */}
            {isEffectivelySignedIn && (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                aria-label={`Cart with ${cartCount} items`}
                className="relative p-2 rounded-full transition-all duration-300 text-white/90 hover:text-white hover:bg-white/10 flex items-center justify-center"
                title="Shopping Basket"
              >
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-moss text-cream text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-[#121E17] shadow-xs">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Auth / Profile State */}
            {isEffectivelySignedIn ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 py-1 px-3 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20 transition-all duration-200 shadow-xs"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-5 h-5 rounded-full bg-moss text-white flex items-center justify-center text-[10px] font-bold">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span>{user?.name ? user.name.split(' ')[0] : 'Profile'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown Menu: Profile, My Orders, Logout */}
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#121E17]/95 backdrop-blur-2xl border border-white/20 shadow-elevated p-1.5 z-50 text-xs text-white"
                    >
                      <div className="px-3 py-2 border-b border-white/10 mb-1">
                        <p className="font-semibold text-white truncate">{user?.name || 'StockSure Shopper'}</p>
                        <p className="text-[10px] text-white/60 truncate">{user?.email || 'shopper@stocksure.in'}</p>
                      </div>

                      <Link
                        href="/profile?tab=profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-moss" />
                        <span>Profile</span>
                      </Link>

                      <Link
                        href="/profile?tab=orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Package className="w-3.5 h-3.5 text-moss" />
                        <span>My Orders</span>
                      </Link>

                      <div className="h-[1px] bg-white/10 my-1" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-moss hover:bg-moss-700 text-white text-xs font-bold transition-all duration-300 shadow-xs border border-white/10"
              >
                <User className="w-3.5 h-3.5 text-white" />
                <span>Sign In / Register</span>
              </Link>
            )}
          </div>

          {/* Mobile Right Controls: Cart & Menu Toggle */}
          <div className="flex items-center gap-1.5 md:hidden">
            {isEffectivelySignedIn && (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                aria-label="Shopping Cart"
                className="relative p-2 rounded-full text-white/90 hover:text-white"
              >
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-moss text-cream text-[9px] font-bold px-1 rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Expanded Menu */}
        {mobileMenuOpen && (
          <div className="px-4 pb-4 pt-2 border-t border-white/15 md:hidden animate-fade-in space-y-2">
            <nav className="flex flex-col gap-1 text-sm font-medium">
              {isEffectivelySignedIn ? (
                /* Mobile Signed-In Links */
                <>
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-2 px-3 rounded-[14px] transition-colors ${isHomeActive ? 'bg-white/20 text-white font-semibold' : 'text-white/85 hover:bg-white/10'
                      }`}
                  >
                    Home
                  </Link>
                  <Link
                    href="/shop"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-2 px-3 rounded-[14px] transition-colors ${isShopActive ? 'bg-white/20 text-white font-semibold' : 'text-white/85 hover:bg-white/10'
                      }`}
                  >
                    Shop
                  </Link>
                  <Link
                    href="/profile?tab=orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-2 px-3 rounded-[14px] transition-colors ${isOrdersActive ? 'bg-white/20 text-white font-semibold' : 'text-white/85 hover:bg-white/10'
                      }`}
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/plant-care"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-2 px-3 rounded-[14px] transition-colors ${isCareActive ? 'bg-white/20 text-white font-semibold' : 'text-white/85 hover:bg-white/10'
                      }`}
                  >
                    Plant Care
                  </Link>

                  <div className="h-[1px] bg-white/10 my-1" />

                  <Link
                    href="/profile?tab=profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-3 rounded-[14px] transition-colors text-white/90 hover:bg-white/10 flex items-center justify-between"
                  >
                    <span>Profile</span>
                    <span className="text-xs text-moss">{user?.name}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left py-2 px-3 rounded-[14px] transition-colors text-red-300 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                /* Mobile Signed-Out Links */
                <>
                  <a
                    href={pathname === '/' ? '#about' : '/#about'}
                    onClick={(e) => handleScrollTo(e, 'about')}
                    className="py-2 px-3 rounded-[14px] transition-colors text-white/85 hover:bg-white/10"
                  >
                    About Us
                  </a>
                  <a
                    href={pathname === '/' ? '#branches' : '/#branches'}
                    onClick={(e) => handleScrollTo(e, 'branches')}
                    className="py-2 px-3 rounded-[14px] transition-colors text-white/85 hover:bg-white/10"
                  >
                    Branches
                  </a>
                  <a
                    href={pathname === '/' ? '#contact' : '/#contact'}
                    onClick={(e) => handleScrollTo(e, 'contact')}
                    className="py-2 px-3 rounded-[14px] transition-colors text-white/85 hover:bg-white/10"
                  >
                    Contact Us
                  </a>

                  {pathname === '/' && (
                    <Link
                      href="/shop"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2 px-3 rounded-[14px] bg-moss text-cream font-bold flex items-center justify-between"
                    >
                      <span>Shop Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}

                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-left py-2 px-3 rounded-[14px] transition-colors bg-white/10 text-white font-bold flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Sign In / Register</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </motion.div>
    </header>
  );
}
