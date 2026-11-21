import React from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, ShoppingBag, CheckCircle } from 'lucide-react';

export default function CheckoutCard({
  items = [],
  onUpdateQuantity,
  onRemoveItem,
  onContinueShopping,
  onCompleteShopping,
}) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const serviceFee = items.length > 0 ? 5 : 0; // Eco bag & service fee
  const grandTotal = subtotal + serviceFee;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 animate-fadeIn pointer-events-auto">
      {/* Subtle backdrop overlay */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm pointer-events-none" />

      {/* Main Glass Checkout Card */}
      <div className="relative w-full max-w-xl max-h-[90vh] rounded-[26px] bg-neutral-950/85 backdrop-blur-2xl border border-[#C8E8D0]/30 shadow-[0_24px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(200,232,208,0.08)] flex flex-col overflow-hidden text-[#F8F7F3] transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-[#C8E8D0]/15 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#C8E8D0]/15 border border-[#C8E8D0]/30 text-[#C8E8D0]">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-light tracking-wide text-[#F8F7F3]">
                Billing Counter • Checkout
              </h2>
              <p className="text-xs font-extralight text-[#B9DCC2]/80">
                {items.length === 0
                  ? 'Your trolley is empty'
                  : `${items.length} ${items.length === 1 ? 'product' : 'products'} • ${totalQuantity} units`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8E8D0]/10 border border-[#C8E8D0]/20 text-[11px] font-light text-[#DDF3E4]">
            <CheckCircle className="w-3 h-3 text-[#C8E8D0]" />
            <span>Counter Ready</span>
          </div>
        </div>

        {/* Cart Item List */}
        {items.length === 0 ? (
          <div className="p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-stone-400">
              <ShoppingCart className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-light text-[#F8F7F3] tracking-wide">
                Your Trolley is Empty
              </h3>
              <p className="text-xs font-extralight text-stone-400 max-w-xs mx-auto mt-1 leading-relaxed">
                Return to the supermarket aisles to discover and select products before checking out.
              </p>
            </div>
            <button
              onClick={onContinueShopping}
              type="button"
              className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] text-[#061a10] font-normal text-xs tracking-[0.16em] uppercase shadow-[0_4px_16px_rgba(200,232,208,0.2)] transition-all duration-200"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar max-h-[46vh]">
              {items.map((item) => {
                const lineTotal = item.product.price * item.quantity;
                return (
                  <div
                    key={item.product.id}
                    className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.06] hover:border-[#C8E8D0]/30 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Left: Product visual badge & details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-11 sm:w-11 sm:h-12 rounded-xl bg-white p-1 border border-white/20 shrink-0 flex items-center justify-center overflow-hidden">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[9px] font-bold text-stone-800 tracking-wider">
                            {item.product.brand.slice(0, 3).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-light tracking-widest text-[#B9DCC2]/80">
                          {item.product.brand}
                        </span>
                        <h4 className="text-xs sm:text-sm font-light text-[#F8F7F3] leading-snug">
                          {item.product.name}
                        </h4>
                        <span className="text-[11px] font-extralight text-stone-400">
                          ₹{item.product.price} / {item.product.unit}
                        </span>
                      </div>
                    </div>

                    {/* Right: Quantity Stepper, Line Total & Remove */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-2 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.08]">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          type="button"
                          className="w-5 h-5 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-normal text-[#F8F7F3]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          type="button"
                          className="w-5 h-5 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Subtotal */}
                      <div className="text-right min-w-[55px]">
                        <span className="text-xs sm:text-sm font-normal text-[#DDF3E4]">
                          ₹{lineTotal}
                        </span>
                      </div>

                      {/* Remove item */}
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        type="button"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary & Footer */}
            <div className="p-4 sm:p-6 border-t border-[#C8E8D0]/15 bg-white/[0.015] flex flex-col gap-3.5">
              {/* Calculations Breakdown */}
              <div className="flex flex-col gap-1.5 text-xs font-extralight text-stone-300">
                <div className="flex justify-between">
                  <span>Subtotal ({totalQuantity} units):</span>
                  <span className="text-[#F8F7F3]">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Eco Bag & Express Handling:</span>
                  <span className="text-[#DDF3E4]">₹{serviceFee}</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-white/[0.08] pt-2 text-sm font-normal">
                  <span className="text-stone-200">Grand Total:</span>
                  <span className="text-lg sm:text-xl text-[#DDF3E4] font-medium tracking-wide">
                    ₹{grandTotal}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Continue Shopping & Complete Shopping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                <button
                  onClick={onContinueShopping}
                  type="button"
                  className="w-full py-3 rounded-xl bg-transparent hover:bg-white/[0.06] border border-white/[0.12] hover:border-[#C8E8D0]/40 text-xs font-light tracking-[0.16em] uppercase text-stone-200 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Continue Shopping</span>
                </button>

                <button
                  onClick={onCompleteShopping}
                  type="button"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 active:scale-[0.99] text-[#061a10] font-normal text-xs tracking-[0.18em] uppercase shadow-[0_6px_22px_rgba(200,232,208,0.25)] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>Complete Shopping</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
