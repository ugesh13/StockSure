'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import {
  Sprout,
  User,
  Menu,
  X,
} from 'lucide-react';

export default function DynamicIslandNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'home' | 'about' | 'branches' | 'contact'>('home');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll Progress Tracking via Framer Motion
  const { scrollY } = useScroll();

  // 1. Horizontal Expansion: Grows smoothly from compact (~700px) to full spread (~1180px)
  const maxWidthRaw = useTransform(scrollY, [0, 420], [700, 1180]);
  // 2. Proportionate Elevation & Scale: 1.0 -> 1.025
  const scaleRaw = useTransform(scrollY, [0, 420], [1, 1.025]);
  // 3. Dynamic Link Spacing: Spreads About Us, Branches, and Contact Us in sync with navbar width expansion
  const linkGapRaw = useTransform(scrollY, [0, 420], [10, 48]);
  // 4. Subtle padding expansion for balanced click targets and optical distribution
  const linkPaddingXRaw = useTransform(scrollY, [0, 420], [14, 22]);

  // Spring physics for natural, fluid motion without abrupt jumps
  const smoothMaxWidth = useSpring(maxWidthRaw, { stiffness: 110, damping: 22, mass: 0.7 });
  const smoothScale = useSpring(scaleRaw, { stiffness: 110, damping: 22, mass: 0.7 });
  const smoothLinkGap = useSpring(linkGapRaw, { stiffness: 110, damping: 22, mass: 0.7 });
  const smoothLinkPaddingX = useSpring(linkPaddingXRaw, { stiffness: 110, damping: 22, mass: 0.7 });

  // Track active section as user scrolls through the single-page application
  useEffect(() => {
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
  }, []);

  // Smooth scroll handler without full page reload
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
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
  };

  return (
    <header className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      {/* Scroll-Driven Horizontal Expansion Dynamic Island Capsule */}
      <motion.div
        ref={dropdownRef}
        style={{
          maxWidth: smoothMaxWidth,
          scale: smoothScale,
          transformOrigin: 'center center',
        }}
        className={`pointer-events-auto relative w-full ${
          mobileMenuOpen ? 'max-w-sm rounded-[32px]' : 'rounded-full'
        } bg-[#121E17]/65 hover:bg-[#121E17]/75 backdrop-blur-2xl border border-white/20 hover:border-white/30 shadow-[0_16px_40px_rgba(0,0,0,0.35),0_4px_16px_rgba(0,0,0,0.2)] ring-1 ring-white/10 transition-colors duration-300 overflow-hidden flex flex-col justify-center`}
      >
        {/* Main Navigation Bar */}
        <div className="flex items-center justify-between py-2.5 px-4 sm:px-6">
          {/* Item 1: StockSure Logo -> Smooth scroll to Home */}
          <div className="flex items-center flex-shrink-0">
            <a
              href="#home"
              onClick={(e) => handleScrollTo(e, 'home')}
              className={`group flex items-center gap-2.5 py-1.5 px-3.5 rounded-full transition-all duration-300 flex-shrink-0 ${
                activeSection === 'home'
                  ? 'bg-white/15 text-white border border-white/25 shadow-xs font-semibold'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-moss/80 text-cream flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xs">
                <Sprout className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="editorial-serif text-lg font-bold tracking-widest leading-none text-white">
                  StockSure
                </span>
              </div>
            </a>

            {/* Spacing Divider between StockSure logo and Navigation */}
            <span className="hidden md:block h-4 w-[1px] bg-white/20 ml-3 sm:ml-4" aria-hidden="true" />
          </div>

          {/* Desktop Section Anchors — Smooth scroll-based spread in sync with navbar expansion */}
          <motion.nav
            style={{ gap: smoothLinkGap }}
            className="hidden md:flex items-center justify-center flex-1 mx-2 sm:mx-6 text-xs lg:text-sm font-medium whitespace-nowrap"
          >
            {/* Item 2: About Us -> Anchor navigation to #about */}
            <motion.a
              style={{ paddingLeft: smoothLinkPaddingX, paddingRight: smoothLinkPaddingX }}
              href="#about"
              onClick={(e) => handleScrollTo(e, 'about')}
              className={`py-1.5 rounded-full whitespace-nowrap transition-colors duration-300 ${
                activeSection === 'about'
                  ? 'bg-white/15 text-white border border-white/25 font-semibold shadow-xs'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              About Us
            </motion.a>

            {/* Item 3: Branches -> Anchor navigation to #branches */}
            <motion.a
              style={{ paddingLeft: smoothLinkPaddingX, paddingRight: smoothLinkPaddingX }}
              href="#branches"
              onClick={(e) => handleScrollTo(e, 'branches')}
              className={`py-1.5 rounded-full whitespace-nowrap transition-colors duration-300 ${
                activeSection === 'branches'
                  ? 'bg-white/15 text-white border border-white/25 font-semibold shadow-xs'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              Branches
            </motion.a>

            {/* Item 4: Contact Us -> Anchor navigation to #contact */}
            <motion.a
              style={{ paddingLeft: smoothLinkPaddingX, paddingRight: smoothLinkPaddingX }}
              href="#contact"
              onClick={(e) => handleScrollTo(e, 'contact')}
              className={`py-1.5 rounded-full whitespace-nowrap transition-colors duration-300 ${
                activeSection === 'contact'
                  ? 'bg-white/15 text-white border border-white/25 font-semibold shadow-xs'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              Contact Us
            </motion.a>
          </motion.nav>

          {/* Right: Spacing Divider & Profile/Login Icon */}
          <div className="hidden md:flex items-center flex-shrink-0">
            <span className="h-4 w-[1px] bg-white/20 mr-3" aria-hidden="true" />
            <Link
              href="/login"
              aria-label="Login / Profile"
              className="p-2 rounded-full transition-all duration-300 text-white/85 hover:text-white hover:bg-white/10"
              title="Login / Account"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Right Controls: Profile & Toggle Button */}
          <div className="flex items-center gap-1.5 md:hidden">
            <Link
              href="/login"
              aria-label="Login / Profile"
              className="p-2 rounded-full transition-colors text-white/85 hover:text-white"
            >
              <User className="w-4 h-4" />
            </Link>

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
              <a
                href="#about"
                onClick={(e) => handleScrollTo(e, 'about')}
                className={`py-2 px-3 rounded-[14px] transition-colors ${
                  activeSection === 'about' ? 'bg-white/15 text-white font-semibold' : 'text-white/85 hover:bg-white/10'
                }`}
              >
                About Us
              </a>

              <a
                href="#branches"
                onClick={(e) => handleScrollTo(e, 'branches')}
                className={`py-2 px-3 rounded-[14px] transition-colors ${
                  activeSection === 'branches' ? 'bg-white/15 text-white font-semibold' : 'text-white/85 hover:bg-white/10'
                }`}
              >
                Branches
              </a>

              <a
                href="#contact"
                onClick={(e) => handleScrollTo(e, 'contact')}
                className={`py-2 px-3 rounded-[14px] transition-colors ${
                  activeSection === 'contact' ? 'bg-white/15 text-white font-semibold' : 'text-white/85 hover:bg-white/10'
                }`}
              >
                Contact Us
              </a>

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-[14px] transition-colors text-white/85 hover:bg-white/10"
              >
                Login / Account
              </Link>
            </nav>
          </div>
        )}
      </motion.div>
    </header>
  );
}
