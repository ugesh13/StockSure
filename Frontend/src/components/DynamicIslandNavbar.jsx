import React, { useState } from 'react';
import { ShoppingCart } from 'lucide-react';

/**
 * DynamicIslandNavbar
 * 
 * Floating navbar inspired by Apple's Dynamic Island interaction feel:
 * - Begins as a compact floating glass pill with glowing brand emblem as the hero image starts revealing.
 * - Fluidly expands horizontally into the full navigation bar as scroll reveal progresses.
 * - Content reveals in an elegant sequence:
 *     1. StockSure Logo & Brand typography
 *     2. Staggered navigation links (About -> Branches -> Our Vision -> Contact)
 *     3. "Start Shopping" button with subtle light-green accent and cart icon
 * - Settles into a stable, rock-solid glassmorphism navbar once fully expanded.
 * 
 * Props:
 * - revealProgress: number [0.0 - 1.0] (progress of the hero image reveal)
 * - isSettled: boolean (locks navbar in full state once user reaches bottom)
 */
export default function DynamicIslandNavbar({
  revealProgress = 0,
  isSettled = false,
  onStartShopping,
}) {
  const [activeLink, setActiveLink] = useState('About');

  // If before reveal threshold, stay completely hidden
  if (revealProgress < 0.05 && !isSettled) {
    return null;
  }

  // Expansion progression [0.0 - 1.0] calculated between revealProgress 0.15 and 0.80
  // Once settled, locks at 1.0
  const rawExpansion = isSettled
    ? 1.0
    : Math.min(Math.max((revealProgress - 0.15) / 0.65, 0), 1.0);

  // Smooth cubic-bezier easeOut curve
  const expansion = isSettled ? 1.0 : 1 - Math.pow(1 - rawExpansion, 3);

  // Staggered component visibilities
  const logoVisible = expansion >= 0.15;
  const logoOpacity = Math.min(Math.max((expansion - 0.15) / 0.25, 0), 1);

  const linksVisible = expansion >= 0.45;
  const linksOpacity = Math.min(Math.max((expansion - 0.45) / 0.35, 0), 1);

  const buttonVisible = expansion >= 0.70;
  const buttonOpacity = Math.min(Math.max((expansion - 0.70) / 0.30, 0), 1);
  const buttonSlide = (1 - buttonOpacity) * 8; // subtle slide of 8px to 0px

  const navItems = [
    { label: 'About', href: '#about' },
    { label: 'Branches', href: '#branches' },
    { label: 'Our Vision', href: '#vision' },
    { label: 'Contact', href: '#contact' },
  ];

  const handleNavClick = (e, label) => {
    e.preventDefault();
    setActiveLink(label);
  };

  return (
    <header className="fixed top-5 left-0 right-0 z-40 flex items-center justify-center px-4 pointer-events-none">
      
      {/* Dynamic Island Floating Glass Pill / Navbar */}
      <div
        className="pointer-events-auto relative flex items-center justify-between overflow-hidden rounded-full transition-all duration-300 ease-out will-change-[width,opacity,box-shadow]"
        style={{
          // Fluid width expansion: starts at 120px capsule -> expands to 840px full navbar
          width: expansion < 0.15 ? '120px' : `calc(120px + ${expansion * 720}px)`,
          maxWidth: '92vw',
          height: '52px',
          opacity: Math.min(revealProgress * 2.5, 1),
          // Smoky neutral glassmorphism
          background: 'rgba(20, 20, 22, 0.48)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: `
            0 8px 32px 0 rgba(0, 0, 0, 0.42),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3)
          `,
        }}
      >
        {/* Left: Brand Logo & Typography */}
        <div className="flex items-center gap-2.5 pl-3.5 sm:pl-4 shrink-0">
          
          {/* StockSure Emblem / Leaf Icon */}
          <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/20 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 hover:scale-105">
            <svg
              className="w-3.5 h-3.5 text-[#C8E8D0]"
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

          {/* Brand Text: reveals as island widens */}
          <span
            className="text-sm font-semibold tracking-tight text-white whitespace-nowrap transition-all duration-300"
            style={{
              opacity: logoOpacity,
              transform: `translateX(${(1 - logoOpacity) * -6}px)`,
              display: logoVisible ? 'inline-block' : 'none',
            }}
          >
            Stock<span className="text-[#C8E8D0]">Sure</span>
          </span>
        </div>

        {/* Center: Navigation Links with Progressive Stagger Reveal */}
        {linksVisible && (
          <nav
            className="hidden md:flex items-center gap-1 sm:gap-2 px-2 transition-all duration-300"
            style={{
              opacity: linksOpacity,
              transform: `scale(${0.96 + linksOpacity * 0.04})`,
            }}
          >
            {navItems.map((item, idx) => {
              const isItemActive = activeLink === item.label;
              // Micro stagger calculation per link
              const linkStagger = Math.min(
                Math.max((expansion - 0.45 - idx * 0.06) / 0.18, 0),
                1
              );

              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.label)}
                  className={`relative px-3 py-1.5 rounded-full text-xs font-light tracking-wide transition-all duration-200 select-none ${
                    isItemActive
                      ? 'text-[#DDF3E4] font-medium'
                      : 'text-stone-300 hover:text-white hover:bg-white/[0.08]'
                  }`}
                  style={{
                    opacity: linkStagger,
                    transform: `translateY(${(1 - linkStagger) * 4}px)`,
                  }}
                >
                  {item.label}
                  {/* Subtle active pill indicator */}
                  {isItemActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#C8E8D0] shadow-[0_0_8px_#C8E8D0]" />
                  )}
                </a>
              );
            })}
          </nav>
        )}

        {/* Right: Start Shopping Button with Gentle Slide & Cart Icon */}
        <div className="pr-1.5 sm:pr-2 shrink-0">
          {buttonVisible ? (
            <button
              type="button"
              onClick={() => {
                setActiveLink('Shopping');
                if (onStartShopping) {
                  onStartShopping();
                } else {
                  window.location.hash = '#shop';
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-[#C8E8D0]/30 hover:border-[#C8E8D0]/60 text-[#DDF3E4] hover:text-white text-xs font-medium tracking-wide shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
              style={{
                opacity: buttonOpacity,
                transform: `translateX(${buttonSlide}px)`,
              }}
            >
              <span className="hidden sm:inline">Start Shopping</span>
              <span className="sm:hidden">Shop</span>
              <ShoppingCart className="w-3.5 h-3.5 text-[#C8E8D0]" />
            </button>
          ) : (
            // Small subtle pulse indicator when island is in compact pill mode
            <div className="w-2 h-2 mr-3 rounded-full bg-[#C8E8D0]/60 animate-pulse" />
          )}
        </div>

      </div>

    </header>
  );
}
