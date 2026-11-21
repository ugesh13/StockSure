import React, { useState, useEffect } from 'react';
import ShopperCanvas from './ShopperCanvas';
import { ArrowRight, RotateCcw } from 'lucide-react';

export default function SupermarketInterior({ isInside, isEntering, onReset }) {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (isInside) {
      // Reveal welcome UI only after camera settles inside
      const timer = setTimeout(() => {
        setShowWelcome(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setShowWelcome(false);
    }
  }, [isInside]);

  return (
    <div
      className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-out"
      style={{
        opacity: isInside ? 1 : isEntering ? 0.95 : 0.35,
        filter: isInside ? 'none' : 'brightness(1.1) contrast(1.05)',
      }}
    >
      {/* High-Resolution Supermarket Produce Aisle Interior */}
      <img
        src="/stocksure_interior.jpg"
        alt="StockSure Supermarket Living Interior"
        className="w-full h-full object-cover"
        style={{ imageRendering: '-webkit-optimize-contrast' }}
      />

      {/* Living Human Shoppers in the Supermarket */}
      <ShopperCanvas isActive={isInside || isEntering} />

      {/* Subtle warm retail ambient lighting gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25 pointer-events-none" />

      {/* Minimal Shopping Welcome UI (Revealed only after camera settles inside) */}
      {showWelcome && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 transition-all duration-1000 ease-out animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-center gap-4 px-6 py-3 rounded-full bg-black/45 backdrop-blur-md border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            
            {/* Store Status Indicator */}
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>

              <div className="flex items-baseline gap-2">
                <span className="text-xs font-light tracking-wide text-white">
                  Welcome to <span className="text-emerald-400 font-normal">StockSure</span>
                </span>
                <span className="hidden sm:inline-block text-[11px] font-extralight tracking-wider text-white/50 border-l border-white/10 pl-2">
                  Good Food. Better Choices.
                </span>
              </div>
            </div>

            {/* Next Shopping Interactions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 text-[11px] font-light text-emerald-300 transition-all duration-200"
              >
                <span>Browse Departments</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              <button
                onClick={onReset}
                type="button"
                title="Re-experience Drone Arrival"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-[11px] font-light text-white/70 hover:text-white transition-all duration-200"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Arrival</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
