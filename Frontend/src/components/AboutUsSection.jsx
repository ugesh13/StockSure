import React, { forwardRef } from 'react';
import { Leaf, Award, Clock } from 'lucide-react';

/**
 * AboutUsSection
 * 
 * An editorial, asymmetric retail experience contrasting the dark hero with
 * a warm parchment architectural backdrop (#E9DFCF) and deep forest green typography.
 * 
 * Exact Color Palette:
 * - Background: #E9DFCF (Warm parchment)
 * - Alternate: #D8C5AA (Soft sand brown)
 * - Heading: #183D2B (Deep forest green)
 * - Body: #292722 (Charcoal / soft black)
 * - Secondary: #756B5E (Muted brown-grey)
 * - Accent: #A5C7AA (Fresh sage green)
 */

const AboutUsSection = forwardRef(function AboutUsSection(
  {
    targetLandingRef,
    eyebrowRef,
    headingRef,
    bodyRef,
    photoRef,
    badgeRef,
  },
  ref
) {
  return (
    <section
      ref={ref}
      id="about-us"
      className="relative w-full min-h-screen bg-[#E9DFCF] text-[#292722] flex items-center justify-center pt-28 sm:pt-32 pb-16 sm:pb-20 px-6 sm:px-12 md:px-16 lg:px-24 overflow-hidden select-none"
      style={{
        willChange: 'transform, opacity',
      }}
    >
      <div className="w-full max-w-7xl mx-auto">
        {/* Editorial Asymmetric Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* ===================================================================
              LEFT COLUMN (Cols 1-7): Editorial Story & Typography
              =================================================================== */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            
            {/* Eyebrow Label */}
            <div
              ref={eyebrowRef}
              className="flex items-center gap-3.5 mb-6 will-change-[transform,opacity]"
            >
              <div className="w-2 h-2 rounded-full bg-[#183D2B]" />
              <span className="text-xs sm:text-[13px] font-semibold tracking-[0.25em] text-[#756B5E] uppercase">
                OUR STORY / 01
              </span>
              <div className="h-[1px] w-16 bg-[#756B5E]/30" />
            </div>

            {/* Large Deep Forest Green Headline */}
            <h2
              ref={headingRef}
              className="text-3xl sm:text-5xl lg:text-[58px] font-serif font-normal text-[#183D2B] leading-[1.08] tracking-[-0.02em] max-w-2xl will-change-[transform,opacity]"
            >
              More than groceries.
              <span className="block font-sans font-medium italic text-[#103B26] mt-1.5 sm:mt-2 text-2xl sm:text-4xl lg:text-[44px]">
                A better way to live.
              </span>
            </h2>

            {/* Charcoal Body Copy */}
            <p
              ref={bodyRef}
              className="mt-7 sm:mt-9 text-base sm:text-lg lg:text-[19px] text-[#292722] leading-relaxed font-light max-w-xl will-change-[transform,opacity]"
            >
              StockSure brings freshness, quality and everyday convenience together.
              We believe shopping for daily essentials should feel simple, reliable and
              better every day — from the products you choose to the experience you take home.
            </p>

            {/* Editorial Brand Pillars (Asymmetric Sand Brown Bar) */}
            <div
              ref={badgeRef}
              className="mt-8 sm:mt-11 pt-6 border-t border-[#756B5E]/20 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-xl will-change-[transform,opacity]"
            >
              {/* Pillar 1 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#D8C5AA]/60 flex items-center justify-center shrink-0 text-[#183D2B]">
                  <Leaf className="w-4 h-4 text-[#183D2B]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#183D2B] uppercase tracking-wider">
                    Curated Daily
                  </h4>
                  <p className="text-[11px] text-[#756B5E] mt-0.5 leading-snug">
                    Direct farm harvest
                  </p>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="flex items-start gap-3 border-t sm:border-t-0 sm:border-l border-[#756B5E]/20 pt-3 sm:pt-0 sm:pl-4">
                <div className="w-7 h-7 rounded-lg bg-[#D8C5AA]/60 flex items-center justify-center shrink-0 text-[#183D2B]">
                  <Award className="w-4 h-4 text-[#183D2B]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#183D2B] uppercase tracking-wider">
                    Grade A Stock
                  </h4>
                  <p className="text-[11px] text-[#756B5E] mt-0.5 leading-snug">
                    Triple-check verified
                  </p>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="flex items-start gap-3 border-t sm:border-t-0 sm:border-l border-[#756B5E]/20 pt-3 sm:pt-0 sm:pl-4">
                <div className="w-7 h-7 rounded-lg bg-[#D8C5AA]/60 flex items-center justify-center shrink-0 text-[#183D2B]">
                  <Clock className="w-4 h-4 text-[#183D2B]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#183D2B] uppercase tracking-wider">
                    Zero Delay
                  </h4>
                  <p className="text-[11px] text-[#756B5E] mt-0.5 leading-snug">
                    Swift aisle flow
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* ===================================================================
              RIGHT COLUMN (Cols 8-12): Realistic Supermarket Photo & Cube Pedestal
              =================================================================== */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center relative">
            
            {/* Architectural Supermarket Photograph Frame */}
            <div
              ref={photoRef}
              className="relative w-full max-w-md rounded-2xl overflow-hidden bg-[#D8C5AA] border border-[#D8C5AA] shadow-[0_24px_50px_-12px_rgba(24,61,43,0.18)] will-change-[transform,opacity]"
            >
              <img
                src="/stocksure_interior.jpg"
                alt="StockSure Supermarket Daily Fresh Aisles"
                className="w-full h-64 sm:h-80 md:h-96 object-cover object-center transform hover:scale-102 transition-transform duration-700 ease-out"
              />
              
              {/* Subtle Editorial Caption Strip */}
              <div className="px-4 py-3 bg-[#E9DFCF] border-t border-[#D8C5AA] flex items-center justify-between text-[11px] text-[#756B5E]">
                <span className="tracking-wide">AISLE 04 / HARVEST & PANTRY</span>
                <span className="font-semibold text-[#183D2B] tracking-wider uppercase">
                  Flagship Store
                </span>
              </div>
            </div>

            {/* =================================================================
                CUBE LANDING ZONE & ARCHITECTURAL PEDESTAL
                ================================================================= */}
            <div className="w-full max-w-md mt-6 pt-5 border-t border-[#756B5E]/20 flex items-center justify-between">
              
              {/* Dedicated Architectural Display Plinth */}
              <div className="flex items-center gap-5">
                <div
                  ref={targetLandingRef}
                  id="cube-target-landing"
                  className="w-28 sm:w-32 h-28 sm:h-32 rounded-2xl border border-[#183D2B]/20 bg-[#D8C5AA]/45 flex items-center justify-center relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
                  aria-hidden="true"
                >
                  {/* Alignment marker */}
                  <div className="w-2.5 h-2.5 rounded-full bg-[#183D2B]/25" />
                </div>

                <div className="flex flex-col text-left pl-1">
                  <span className="text-[11px] font-semibold tracking-[0.22em] text-[#756B5E] uppercase">
                    ARCHITECTURAL EMBLEM
                  </span>
                  <span className="text-sm font-serif text-[#183D2B] italic mt-0.5">
                    Solid Emerald Anchor
                  </span>
                  <span className="text-[11px] text-[#756B5E] font-light mt-0.5">
                    Origin: Hero Typographic Full Stop
                  </span>
                </div>
              </div>

              {/* Quality Seal Stamp in Soft Sand Brown */}
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[10px] font-mono tracking-widest text-[#756B5E]">
                  EST. 2026
                </span>
                <span className="text-xs font-medium text-[#183D2B] tracking-wide mt-0.5">
                  StockSure Retail
                </span>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
});

export default AboutUsSection;
