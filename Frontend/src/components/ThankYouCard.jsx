import React from 'react';
import { ShoppingBag, Store, HeartHandshake, ArrowRight } from 'lucide-react';

export default function ThankYouCard({ onContinueShopping, onKnowUsMore }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 animate-fadeIn pointer-events-auto">
      {/* Subtle backdrop blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-none" />

      {/* Main Thank You Card */}
      <div className="relative w-full max-w-lg rounded-[28px] bg-neutral-950/85 backdrop-blur-2xl border border-[#C8E8D0]/30 shadow-[0_24px_70px_rgba(0,0,0,0.8),0_0_45px_rgba(200,232,208,0.1)] p-7 sm:p-9 flex flex-col items-center text-center gap-5 text-[#F8F7F3] transition-all duration-300">
        
        {/* Welcome Icon badge */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#C8E8D0]/15 border border-[#C8E8D0]/35 text-[#C8E8D0] shadow-[0_0_24px_rgba(200,232,208,0.2)]">
          <HeartHandshake className="w-8 h-8 stroke-[1.7]" />
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8E8D0]/10 border border-[#C8E8D0]/20 text-[11px] font-light text-[#DDF3E4] tracking-wider mb-1">
            <Store className="w-3.5 h-3.5 text-[#C8E8D0]" />
            <span>StockSure Supermarket</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-light tracking-wide text-[#F8F7F3]">
            Thank you for visiting us!
          </h2>

          <p className="text-xs sm:text-sm font-extralight text-stone-300 max-w-sm mx-auto leading-relaxed pt-1">
            We hope you had a wonderful shopping experience. We look forward to welcoming you again.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-3 pt-3">
          {/* Continue Shopping Button */}
          <button
            onClick={onContinueShopping}
            type="button"
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 active:scale-[0.99] text-[#061a10] font-normal text-xs sm:text-sm tracking-[0.16em] uppercase shadow-[0_6px_22px_rgba(200,232,208,0.25)] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>

          {/* Know Us More Button */}
          <button
            onClick={onKnowUsMore}
            type="button"
            className="flex-1 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-[0.99] border border-[#C8E8D0]/30 hover:border-[#C8E8D0]/60 text-xs sm:text-sm font-light tracking-[0.15em] uppercase text-[#DDF3E4] hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            <span>Know Us More</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
