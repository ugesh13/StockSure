import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Compass,
  ShieldCheck,
  Clock,
  Layers,
  MapPin,
  CheckCircle2,
  Package,
  Store,
  ChevronDown
} from 'lucide-react';

export default function AboutPage({
  onVisitStore,
  onBack,
  returnTarget = 'ENTERIOR',
  cartCount = 0
}) {
  const [scrollProgress, setScrollProgress] = useState(0);

  // Track scroll progress for subtle top progress indicator
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollProgress(progress);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const backLabel =
    returnTarget === 'THANK_YOU'
      ? 'Return to Thank You'
      : returnTarget === 'CINEMATIC'
      ? 'Back to Arrival'
      : 'Back to Entrance';

  return (
    <div
      onScroll={handleScroll}
      className="fixed inset-0 z-40 overflow-y-auto overflow-x-hidden bg-[#FAFCF9] text-[#14231A] select-none scroll-smooth antialiased"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* ---------------------------------------------------------------------
          Scroll Progress Indicator
          --------------------------------------------------------------------- */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-[#E5EFE7]">
        <div
          className="h-full bg-gradient-to-r from-[#86C197] via-[#2E7D4E] to-[#14532D] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* ---------------------------------------------------------------------
          Floating Quick-Action Header (Sits beneath top brand navbar)
          --------------------------------------------------------------------- */}
      <header className="sticky top-20 z-40 px-3 sm:px-8 py-2.5 max-w-6xl mx-auto flex items-center justify-between pointer-events-none">
        {/* Back navigation button */}
        <button
          onClick={onBack}
          type="button"
          className="group pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/90 hover:bg-white backdrop-blur-xl border border-[#C8E8D0]/70 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)] text-xs font-medium text-[#1E3A2B] hover:text-[#0B2014] transition-all duration-200 active:scale-[0.98]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#2E7D4E] group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span className="hidden sm:inline">{backLabel}</span>
          <span className="sm:hidden">Back</span>
        </button>

        {/* Top Direct CTA */}
        <button
          onClick={onVisitStore}
          type="button"
          className="group pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 rounded-full bg-gradient-to-r from-[#DDF3E4] via-[#C8E8D0] to-[#B9DCC2] hover:brightness-105 backdrop-blur-xl border border-[#A4D4AF]/80 shadow-[0_4px_20px_rgba(46,125,78,0.15)] text-xs font-semibold text-[#0B2014] tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-[#14532D]" />
          <span className="hidden sm:inline">Visit Our Store</span>
          <span className="sm:hidden">Visit Store</span>
          <ArrowRight className="w-3 h-3 text-[#14532D] group-hover:translate-x-0.5 transition-transform duration-200" />
        </button>
      </header>

      {/* ---------------------------------------------------------------------
          A. HERO SECTION
          --------------------------------------------------------------------- */}
      <section className="relative min-h-[85vh] flex flex-col justify-start items-center text-center px-6 sm:px-12 pt-28 sm:pt-36 pb-20 max-w-5xl mx-auto overflow-hidden">
        {/* Soft atmospheric ambient glow orbs */}
        <div className="absolute -top-16 -right-16 w-96 h-96 bg-[#DDF3E4]/80 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-[#C8E8D0]/50 rounded-full blur-3xl pointer-events-none" />

        {/* Small Tag Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#C8E8D0] text-[#1E3A2B] text-xs font-medium tracking-widest uppercase mb-6 shadow-sm">
          <Store className="w-3.5 h-3.5 text-[#2E7D4E]" />
          <span>StockSure • Next-Generation Retail</span>
        </div>

        {/* Hero Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-light tracking-tight text-[#0B2014] leading-[1.1] max-w-4xl">
          A smarter way to experience{' '}
          <span className="font-normal italic text-[#2E7D4E] underline decoration-[#C8E8D0] decoration-wavy decoration-2">
            grocery shopping.
          </span>
        </h1>

        {/* Hero Supporting Copy */}
        <p className="mt-6 text-base sm:text-xl font-light text-[#375242] max-w-2xl leading-relaxed">
          Discover a new way to explore products, understand what you buy, and experience your store with real-time stock transparency.
        </p>

        {/* Primary Hero Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onVisitStore}
            type="button"
            className="group flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 active:scale-[0.98] border border-[#A4D4AF] shadow-[0_12px_36px_rgba(46,125,78,0.22)] text-sm sm:text-base font-semibold text-[#0B2014] tracking-wide transition-all duration-300 hover:scale-[1.03]"
          >
            <ShoppingCart className="w-5 h-5 text-[#14532D]" />
            <span>Visit Our Store</span>
            <ArrowRight className="w-4 h-4 text-[#14532D] group-hover:translate-x-1 transition-transform duration-200" />
          </button>

          <button
            onClick={() => scrollToSection('about-us')}
            type="button"
            className="flex items-center gap-2 px-6 py-4 rounded-full bg-white/80 hover:bg-white active:scale-[0.98] border border-[#C8E8D0]/80 shadow-[0_4px_16px_rgba(0,0,0,0.04)] text-sm font-medium text-[#1E3A2B] hover:text-[#0B2014] transition-all duration-200"
          >
            <span>Learn More</span>
            <ChevronDown className="w-4 h-4 text-[#2E7D4E]" />
          </button>
        </div>

        {/* Floating Frosted Glass Highlights */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-[0_8px_24px_rgba(0,0,0,0.03)] flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-[#DDF3E4] border border-[#C8E8D0] flex items-center justify-center text-[#1E3A2B] shrink-0">
              <Compass className="w-4 h-4 text-[#2E7D4E]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0B2014]">Spatial Navigation</p>
              <p className="text-[11px] text-[#476E57]">Aisle & shelf positioning</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-[0_8px_24px_rgba(0,0,0,0.03)] flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-[#DDF3E4] border border-[#C8E8D0] flex items-center justify-center text-[#1E3A2B] shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#2E7D4E]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0B2014]">Live Stock Counts</p>
              <p className="text-[11px] text-[#476E57]">Real-time shelf availability</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-[0_8px_24px_rgba(0,0,0,0.03)] flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-[#DDF3E4] border border-[#C8E8D0] flex items-center justify-center text-[#1E3A2B] shrink-0">
              <Clock className="w-4 h-4 text-[#2E7D4E]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0B2014]">Batch Expiry Tracking</p>
              <p className="text-[11px] text-[#476E57]">Guaranteed Best Before data</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
          B. ABOUT US SECTION
          --------------------------------------------------------------------- */}
      <section id="about-us" className="py-20 px-6 sm:px-12 max-w-5xl mx-auto border-t border-[#E1EDE4]">
        <div className="space-y-4 text-left max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF3E4]/70 border border-[#C8E8D0] text-[11px] font-semibold text-[#1E3A2B] tracking-wider uppercase">
            <span>About Us</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-light text-[#0B2014] leading-snug">
            StockSure reimagines the supermarket experience by bringing product discovery, shopping, and inventory transparency into one immersive digital environment.
          </h2>

          <p className="text-sm sm:text-base font-light text-[#375242] leading-relaxed pt-2">
            Traditional grocery shopping often involves wandering aisles searching for items, second-guessing stock availability, and inspecting expiration labels one by one. StockSure replaces that friction with complete digital clarity—letting customers explore products with exact shelf locations, live quantities, and batch freshness.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-7 rounded-3xl bg-white/80 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-[0_8px_28px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] hover:border-[#A4D4AF]">
            <div className="w-12 h-12 rounded-2xl bg-[#DDF3E4] border border-[#C8E8D0] flex items-center justify-center text-[#14532D] mb-5">
              <Compass className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-lg font-medium text-[#0B2014]">Instant Product Discovery</h3>
            <p className="mt-2 text-sm font-light text-[#375242] leading-relaxed">
              Find groceries instantly by name or category. StockSure highlights the aisle number, shelf tier, and specific display section without unnecessary wandering.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white/80 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-[0_8px_28px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] hover:border-[#A4D4AF]">
            <div className="w-12 h-12 rounded-2xl bg-[#DDF3E4] border border-[#C8E8D0] flex items-center justify-center text-[#14532D] mb-5">
              <Package className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-lg font-medium text-[#0B2014]">Product & Brand Transparency</h3>
            <p className="mt-2 text-sm font-light text-[#375242] leading-relaxed">
              Every product card features verified net weights, dietary specifications, packaging details, and transparent pricing with no hidden surprises.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white/80 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-[0_8px_28px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] hover:border-[#A4D4AF]">
            <div className="w-12 h-12 rounded-2xl bg-[#DDF3E4] border border-[#C8E8D0] flex items-center justify-center text-[#14532D] mb-5">
              <ShieldCheck className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-lg font-medium text-[#0B2014]">Real-Time Inventory Visibility</h3>
            <p className="mt-2 text-sm font-light text-[#375242] leading-relaxed">
              Live shelf counts inform you whether an item is abundantly available or running low before you add it to your trolley, avoiding out-of-stock disappointment.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-white/80 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-[0_8px_28px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] hover:border-[#A4D4AF]">
            <div className="w-12 h-12 rounded-2xl bg-[#DDF3E4] border border-[#C8E8D0] flex items-center justify-center text-[#14532D] mb-5">
              <Clock className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-lg font-medium text-[#0B2014]">Expiry Awareness</h3>
            <p className="mt-2 text-sm font-light text-[#375242] leading-relaxed">
              Freshness guaranteed with verified Best Before dates and batch numbers displayed directly on product badges for staples, dairy, and pantry items.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
          C. OUR VISION SECTION
          --------------------------------------------------------------------- */}
      <section className="py-24 px-6 sm:px-12 bg-gradient-to-b from-[#F2F7F3] via-[#FAFCF9] to-[#FAFCF9] border-t border-[#E1EDE4]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#C8E8D0] text-[11px] font-semibold text-[#1E3A2B] tracking-wider uppercase shadow-sm">
            <span>Our Vision</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-light text-[#0B2014] leading-tight tracking-tight">
            Making grocery shopping more transparent, interactive, and informed through technology.
          </h2>

          <p className="text-base sm:text-lg font-light text-[#375242] leading-relaxed max-w-2xl mx-auto pt-2">
            We envision a retail ecosystem where shoppers never have to guess what is on the shelf, how fresh it is, or where to find it. By connecting spatial store environments with live inventory data, StockSure bridges physical retail familiarity with the convenience of modern software.
          </p>

          <div className="pt-6">
            <button
              onClick={onVisitStore}
              type="button"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#1E3A2B] hover:bg-[#0B2014] text-white text-xs sm:text-sm font-medium tracking-wide shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Experience It Now</span>
              <ArrowRight className="w-4 h-4 text-[#C8E8D0]" />
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
          D. THE STOCKSURE EXPERIENCE SECTION
          --------------------------------------------------------------------- */}
      <section className="py-20 px-6 sm:px-12 max-w-5xl mx-auto border-t border-[#E1EDE4]">
        <div className="text-left max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF3E4]/70 border border-[#C8E8D0] text-[11px] font-semibold text-[#1E3A2B] tracking-wider uppercase">
            <span>The StockSure Experience</span>
          </div>
          <h2 className="mt-3 text-3xl font-light text-[#0B2014]">
            Features built into our interactive supermarket
          </h2>
          <p className="mt-2 text-sm text-[#375242] font-light">
            Every stage of our platform is designed to give you a complete, tactile, and transparent shopping journey.
          </p>
        </div>

        {/* Feature List Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-lg bg-[#DDF3E4] text-[#14532D] flex items-center justify-center font-semibold text-xs mb-4">
              01
            </div>
            <h4 className="text-base font-medium text-[#0B2014]">Cinematic Store Entry</h4>
            <p className="mt-2 text-xs font-light text-[#375242] leading-relaxed">
              Arrive via aerial approach and step through automatic glass sliding doors into a vibrant supermarket interior.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-lg bg-[#DDF3E4] text-[#14532D] flex items-center justify-center font-semibold text-xs mb-4">
              02
            </div>
            <h4 className="text-base font-medium text-[#0B2014]">Interactive Trolley Pickup</h4>
            <p className="mt-2 text-xs font-light text-[#375242] leading-relaxed">
              Pick up your shopping cart at the entrance bay and begin your shopping journey with full control.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-lg bg-[#DDF3E4] text-[#14532D] flex items-center justify-center font-semibold text-xs mb-4">
              03
            </div>
            <h4 className="text-base font-medium text-[#0B2014]">Aisle Trolley Navigation</h4>
            <p className="mt-2 text-xs font-light text-[#375242] leading-relaxed">
              Selecting a product triggers POV movement down the central aisle, halting directly in front of the grocery shelf.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-lg bg-[#DDF3E4] text-[#14532D] flex items-center justify-center font-semibold text-xs mb-4">
              04
            </div>
            <h4 className="text-base font-medium text-[#0B2014]">Shelf Product Details</h4>
            <p className="mt-2 text-xs font-light text-[#375242] leading-relaxed">
              Inspect on-shelf units, verified Best Before dates, transparent pricing, and adjust quantities seamlessly.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-lg bg-[#DDF3E4] text-[#14532D] flex items-center justify-center font-semibold text-xs mb-4">
              05
            </div>
            <h4 className="text-base font-medium text-[#0B2014]">Live Trolley Cart</h4>
            <p className="mt-2 text-xs font-light text-[#375242] leading-relaxed">
              Your cart tallies in real-time within the top navbar, preserving items across every interaction and page visit.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-[#C8E8D0]/60 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-lg bg-[#DDF3E4] text-[#14532D] flex items-center justify-center font-semibold text-xs mb-4">
              06
            </div>
            <h4 className="text-base font-medium text-[#0B2014]">Counter Checkout</h4>
            <p className="mt-2 text-xs font-light text-[#375242] leading-relaxed">
              Push your trolley to the billing counter, review itemized receipts, and complete your store visit smoothly.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
          E. OUR BRANCHES SECTION (Honest & Tasteful)
          --------------------------------------------------------------------- */}
      <section className="py-20 px-6 sm:px-12 max-w-5xl mx-auto border-t border-[#E1EDE4]">
        <div className="text-left max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF3E4]/70 border border-[#C8E8D0] text-[11px] font-semibold text-[#1E3A2B] tracking-wider uppercase">
            <span>Store Presence</span>
          </div>
          <h2 className="mt-3 text-3xl font-light text-[#0B2014]">
            Our Branches & Showcase
          </h2>
          <p className="mt-2 text-sm text-[#375242] font-light leading-relaxed">
            StockSure is building a new way to experience shopping. Our store experience is currently showcased through our immersive digital environment.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Digital Flagship Store */}
          <div className="p-7 rounded-3xl bg-white/85 backdrop-blur-xl border border-[#C8E8D0]/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF3E4] text-[#14532D] text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#2E7D4E] animate-pulse" />
                  Live Digital Flagship
                </span>
                <span className="text-xs font-light text-stone-500">24/7 Accessible</span>
              </div>

              <h3 className="text-xl font-medium text-[#0B2014]">StockSure Digital Store</h3>
              <p className="mt-2 text-xs sm:text-sm font-light text-[#375242] leading-relaxed">
                Experience full first-person trolley navigation, living supermarket aisles, interactive shelf discovery, and instant checkout.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E5EFE7] flex items-center justify-between">
              <span className="text-xs font-medium text-[#1E3A2B]">Status: Active & Shopping Ready</span>
              <button
                onClick={onVisitStore}
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E7D4E] hover:text-[#14532D] transition-colors"
              >
                <span>Step Inside</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Future Physical Pilots */}
          <div className="p-7 rounded-3xl bg-white/60 backdrop-blur-xl border border-[#C8E8D0]/50 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
                  Physical Pilot Initiative
                </span>
                <span className="text-xs font-light text-stone-500">In Development</span>
              </div>

              <h3 className="text-xl font-medium text-[#0B2014]">Next-Gen Physical Stores</h3>
              <p className="mt-2 text-xs sm:text-sm font-light text-[#375242] leading-relaxed">
                We are actively designing physical retail pilots equipped with smart shelf sync, live batch verification, and seamless trolley tallying for brick-and-mortar shoppers.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E5EFE7] flex items-center justify-between">
              <span className="text-xs font-light text-stone-500">Locations to be announced</span>
              <span className="text-xs font-medium text-[#476E57]">Concept Phase</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
          F. VISIT OUR STORE SECTION (Final Memorable CTA)
          --------------------------------------------------------------------- */}
      <section className="py-24 px-6 sm:px-12 max-w-5xl mx-auto border-t border-[#E1EDE4]">
        <div className="relative rounded-[32px] p-8 sm:p-14 bg-gradient-to-br from-[#EBF7EE] via-[#F4FAF5] to-white border border-[#C8E8D0] shadow-[0_20px_60px_rgba(46,125,78,0.08)] overflow-hidden text-center flex flex-col items-center">
          {/* Subtle soft backdrop blur details */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#DDF3E4]/70 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#C8E8D0]/40 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#C8E8D0] text-[11px] font-semibold text-[#1E3A2B] tracking-wider uppercase shadow-xs">
              <Store className="w-3.5 h-3.5 text-[#2E7D4E]" />
              <span>Step Inside StockSure</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-light text-[#0B2014] tracking-tight">
              Ready to explore?
            </h2>

            <p className="text-sm sm:text-base font-light text-[#375242] leading-relaxed">
              Step inside and experience shopping differently. Discover products, check live availability, and enjoy a cinematic grocery experience.
            </p>

            <div className="pt-6">
              <button
                onClick={onVisitStore}
                type="button"
                className="group inline-flex items-center gap-3 px-8 sm:px-10 py-4 rounded-full bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 active:scale-[0.98] border border-[#A4D4AF] shadow-[0_12px_36px_rgba(46,125,78,0.25)] text-sm sm:text-base font-semibold text-[#0B2014] tracking-wide transition-all duration-300 hover:scale-[1.03]"
              >
                <ShoppingCart className="w-5 h-5 text-[#14532D]" />
                <span>Visit Our Store</span>
                <ArrowRight className="w-4 h-4 text-[#14532D] group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
          FOOTER
          --------------------------------------------------------------------- */}
      <footer className="py-12 px-6 sm:px-12 border-t border-[#E1EDE4] bg-[#F7FAF8] text-center text-xs text-[#476E57] space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm font-light text-[#0B2014]">
          <span className="font-semibold text-emerald-800">StockSure</span>
          <span>•</span>
          <span className="text-[#375242]">Good Food. Better Choices.</span>
        </div>
        <p className="font-light">
          © {new Date().getFullYear()} StockSure. Immersive Supermarket Shopping & Inventory Intelligence.
        </p>
      </footer>
    </div>
  );
}
