import React, { useState } from 'react';
import { ShoppingCart, User, LogOut } from 'lucide-react';
import { useShop } from '../context/ShopContext';

/**
 * DynamicIslandNavbar
 * 
 * Floating navbar inspired by Apple's Dynamic Island interaction feel:
 * - Begins as a compact floating glass pill with glowing brand emblem as the hero image starts revealing.
 * - Fluidly expands horizontally into the full navigation bar as scroll reveal progresses.
 * - Content reveals in an elegant sequence:
 *     1. StockSure Logo & Brand typography
 *     2. Staggered navigation links (About -> Branches -> Our Vision -> Contact)
 *     3. "Start Shopping" button with subtle light-green accent, cart badge, and auth awareness
 * - Settles into a stable, rock-solid glassmorphism navbar once fully expanded.
 */
export default function DynamicIslandNavbar({
  revealProgress = 0,
  isSettled = false,
  onStartShopping,
}) {
  const {
    isAuthenticated,
    currentUser,
    logout,
    setIsLoginModalOpen,
    cart,
    setIsCartOpen,
  } = useShop();

  const [activeLink, setActiveLink] = useState('About');
  const [showUserMenu, setShowUserMenu] = useState(false);

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
    { label: 'About', href: '#about-us' },
    { label: 'Branches', href: '#branches' },
    { label: 'Our Vision', href: '#vision' },
    { label: 'Contact', href: '#contact' },
  ];

  const handleNavClick = (e, label) => {
    e.preventDefault();
    setActiveLink(label);
    if (label === 'About') {
      const el = document.getElementById('about-us');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else window.scrollTo({ top: 3800, behavior: 'smooth' });
    } else if (label === 'Branches' || label === 'Our Vision') {
      const el = document.getElementById('about-us');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (label === 'Contact') {
      const el = document.getElementById('experience-details');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartShopping = () => {
    if (isAuthenticated) {
      if (onStartShopping) {
        onStartShopping();
      } else {
        window.location.hash = '#shop';
      }
    } else {
      setIsLoginModalOpen(true);
    }
  };

  return (
    <header className="fixed top-5 left-0 right-0 z-40 flex items-center justify-center px-4 pointer-events-none">
      
      {/* Dynamic Island Floating Glass Pill / Navbar */}
      <div
        className="pointer-events-auto relative flex items-center justify-between overflow-visible rounded-full transition-all duration-300 ease-out will-change-[width,opacity,box-shadow]"
        style={{
          // Fluid width expansion: starts at 120px capsule -> expands to 860px full navbar
          width: expansion < 0.15 ? '120px' : `calc(120px + ${expansion * 740}px)`,
          maxWidth: '94vw',
          height: '52px',
          opacity: Math.min(revealProgress * 2.5, 1),
          // Smoky neutral glassmorphism
          background: 'rgba(20, 20, 22, 0.58)',
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
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 pl-3.5 sm:pl-4 shrink-0 cursor-pointer select-none group"
          title="Scroll to top"
        >
          {/* StockSure Emblem / Leaf Icon */}
          <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/20 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105">
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
                  {isItemActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#C8E8D0] shadow-[0_0_8px_#C8E8D0]" />
                  )}
                </a>
              );
            })}
          </nav>
        )}

        {/* Right Section: Auth State, Cart Badge & Start Shopping */}
        <div className="pr-1.5 sm:pr-2.5 shrink-0 flex items-center gap-1.5 sm:gap-2">
          {buttonVisible ? (
            <>
              {/* Authenticated User Pill or Sign In Button */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-stone-200 text-xs transition-all"
                    title={currentUser?.email}
                  >
                    <User className="w-3.5 h-3.5 text-[#C8E8D0]" />
                    <span className="max-w-[70px] truncate hidden sm:inline font-medium">
                      {currentUser?.name?.split(' ')[0] || 'Account'}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 top-10 mt-1 w-44 rounded-2xl bg-[#0f1d16] border border-emerald-500/30 shadow-2xl p-2 z-50 text-xs animate-fade-in-up">
                      <div className="px-2.5 py-1.5 border-b border-white/10 text-stone-300">
                        <p className="font-semibold text-white truncate">{currentUser?.name}</p>
                        <p className="text-[10px] text-stone-400 truncate">{currentUser?.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full mt-1 flex items-center gap-2 px-2.5 py-2 text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer text-left"
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
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-stone-300 hover:text-white text-xs font-light transition-all"
                >
                  Sign In
                </button>
              )}

              {/* Cart Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-stone-200 transition-all cursor-pointer"
                aria-label="View Shopping Cart"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#C8E8D0]" />
                {cart.item_count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#A5C7AA] text-[#183D2B] text-[10px] font-bold flex items-center justify-center leading-none shadow-md">
                    {cart.item_count}
                  </span>
                )}
              </button>

              {/* Start Shopping Button */}
              <button
                type="button"
                onClick={handleStartShopping}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-[#C8E8D0]/40 hover:border-[#C8E8D0]/70 text-[#DDF3E4] hover:text-white text-xs font-medium tracking-wide shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
                style={{
                  opacity: buttonOpacity,
                  transform: `translateX(${buttonSlide}px)`,
                }}
              >
                <span className="hidden sm:inline">Start Shopping</span>
                <span className="sm:hidden">Shop</span>
                <span className="text-[#C8E8D0] font-bold text-xs">→</span>
              </button>
            </>
          ) : (
            // Small subtle pulse indicator when island is in compact pill mode
            <div className="w-2 h-2 mr-3 rounded-full bg-[#C8E8D0]/60 animate-pulse" />
          )}
        </div>

      </div>

    </header>
  );
}
