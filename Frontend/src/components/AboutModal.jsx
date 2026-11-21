import React from 'react';
import { X, ArrowLeft, ShieldCheck, MapPin, Clock, ShoppingCart, Sparkles } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Frosted glass backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Main About Card */}
      <div className="relative w-full max-w-lg max-h-[88vh] rounded-[26px] bg-neutral-950/90 backdrop-blur-2xl border border-[#C8E8D0]/25 shadow-[0_24px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(200,232,208,0.08)] flex flex-col overflow-hidden text-[#F8F7F3] transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#C8E8D0]/15 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#C8E8D0]/15 border border-[#C8E8D0]/30 text-[#C8E8D0]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-light tracking-wide text-[#F8F7F3]">
                About StockSure
              </h2>
              <p className="text-xs font-extralight text-[#B9DCC2]/80">
                Smart Shopping. Better Living.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] hover:border-[#C8E8D0]/40 text-stone-300 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm font-light leading-relaxed text-stone-300 custom-scrollbar">
          
          <div className="p-4 rounded-2xl bg-black/45 border border-white/[0.06]">
            <h3 className="text-sm font-medium text-[#DDF3E4] mb-1">
              What is StockSure?
            </h3>
            <p className="text-stone-300 font-extralight leading-relaxed text-xs">
              StockSure is a modern supermarket experience that bridges physical grocery shopping with smart real-time transparency. Every aisle, product batch, and trolley is connected to give shoppers complete clarity before purchasing.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-7 h-7 rounded-lg bg-[#C8E8D0]/15 border border-[#C8E8D0]/25 flex items-center justify-center text-[#C8E8D0] shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-normal text-[#DDF3E4]">
                  Product & Aisle Discovery
                </h4>
                <p className="text-[11px] font-extralight text-stone-400 mt-0.5">
                  Locate any grocery item instantly with accurate aisle numbers, shelf tiers, and section indicators without wandering.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-7 h-7 rounded-lg bg-[#C8E8D0]/15 border border-[#C8E8D0]/25 flex items-center justify-center text-[#C8E8D0] shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-normal text-[#DDF3E4]">
                  Real-Time Stock Availability
                </h4>
                <p className="text-[11px] font-extralight text-stone-400 mt-0.5">
                  Know exact live inventory status before walking down an aisle, avoiding out-of-stock disappointments.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-7 h-7 rounded-lg bg-[#C8E8D0]/15 border border-[#C8E8D0]/25 flex items-center justify-center text-[#C8E8D0] shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-normal text-[#DDF3E4]">
                  Batch Expiry Awareness
                </h4>
                <p className="text-[11px] font-extralight text-stone-400 mt-0.5">
                  Freshness guaranteed with verified Best Before dates displayed directly on product badges for dairy, staples, and bakery goods.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-7 h-7 rounded-lg bg-[#C8E8D0]/15 border border-[#C8E8D0]/25 flex items-center justify-center text-[#C8E8D0] shrink-0 mt-0.5">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-normal text-[#DDF3E4]">
                  Seamless Trolley Tally
                </h4>
                <p className="text-[11px] font-extralight text-stone-400 mt-0.5">
                  Keep a running total of items, units, and expenditure in your hands, leading straight to a swift billing checkout.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#C8E8D0]/15 bg-white/[0.015]">
          <button
            onClick={onClose}
            type="button"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 active:scale-[0.99] text-[#061a10] font-normal text-xs tracking-[0.16em] uppercase shadow-[0_6px_20px_rgba(200,232,208,0.22)] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Thank You Screen</span>
          </button>
        </div>

      </div>
    </div>
  );
}
