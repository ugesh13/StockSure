import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, X, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function CartModal({
  isOpen,
  onClose,
  items = [],
  onUpdateQuantity,
  onRemoveItem,
}) {
  const [checkoutReview, setCheckoutReview] = useState(false);

  if (!isOpen) return null;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handleClose = () => {
    setCheckoutReview(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      {/* Smoked glass backdrop */}
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Main Cart Container */}
      <div className="relative w-full max-w-xl max-h-[90vh] rounded-[26px] bg-neutral-950/90 backdrop-blur-2xl border border-[#D6BC83]/30 shadow-[0_8px_40px_rgba(201,169,106,0.15),0_24px_70px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-[#F8F7F3] transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-[#D6BC83]/15 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#D6BC83]/12 border border-[#D6BC83]/30 text-[#D6BC83]">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-light tracking-wide text-[#F8F7F3]">
                StockSure Trolley
              </h2>
              <p className="text-xs font-extralight text-stone-300">
                {items.length === 0
                  ? 'No items selected'
                  : `${items.length} ${items.length === 1 ? 'item' : 'items'} • ${totalQuantity} units`}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] hover:border-[#D6BC83]/40 text-stone-300 hover:text-white transition-colors"
            aria-label="Close cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        {checkoutReview ? (
          /* Checkout Review State */
          <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#D6BC83]/15 border border-[#D6BC83]/40 text-[#D6BC83]">
              <CheckCircle2 className="w-7 h-7 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-lg font-light text-[#F8F7F3] tracking-wide">
                Order Review Ready
              </h3>
              <p className="text-xs sm:text-sm font-extralight text-stone-300 max-w-sm mx-auto mt-1 leading-relaxed">
                Your {totalQuantity} items totaling ₹{grandTotal} are queued for self-checkout at Aisle 1 express kiosk or scheduled home delivery.
              </p>
            </div>

            <div className="w-full bg-black/45 rounded-2xl p-4 border border-[#D6BC83]/20 flex flex-col gap-2.5 text-xs text-left my-2">
              <div className="flex justify-between text-stone-300 font-extralight">
                <span>Unique Products:</span>
                <span className="text-[#F8F7F3]">{items.length}</span>
              </div>
              <div className="flex justify-between text-stone-300 font-extralight">
                <span>Total Quantity:</span>
                <span className="text-[#F8F7F3]">{totalQuantity}</span>
              </div>
              <div className="flex justify-between text-stone-300 border-t border-white/[0.08] pt-2 text-sm font-normal">
                <span>Grand Total:</span>
                <span className="text-[#D6BC83]">₹{grandTotal}</span>
              </div>
            </div>

            <button
              onClick={handleClose}
              type="button"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#B89B5E] via-[#C8A96A] to-[#D6BC83] hover:brightness-110 active:scale-[0.99] text-black font-normal text-xs sm:text-sm tracking-[0.18em] uppercase shadow-[0_8px_25px_rgba(200,169,106,0.3)] transition-all duration-300"
            >
              Continue Shopping
            </button>
          </div>
        ) : items.length === 0 ? (
          /* Empty Cart State */
          <div className="p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-stone-400">
              <ShoppingCart className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-light text-[#F8F7F3] tracking-wide">
                Your Trolley is Empty
              </h3>
              <p className="text-xs font-extralight text-stone-400 max-w-xs mx-auto mt-1 leading-relaxed">
                Explore supermarket aisles, select fresh produce and grocery staples, and add them to your trolley.
              </p>
            </div>
            <button
              onClick={handleClose}
              type="button"
              className="mt-2 px-6 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-[#D6BC83]/30 hover:border-[#D6BC83]/60 text-xs font-light tracking-[0.16em] uppercase text-[#D6BC83] transition-all duration-200"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          /* Active Cart Items List */
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar max-h-[50vh]">
              {items.map((item) => {
                const subtotal = item.product.price * item.quantity;
                return (
                  <div
                    key={item.product.id}
                    className="p-3.5 rounded-2xl bg-black/45 border border-white/[0.06] hover:border-[#D6BC83]/30 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Product visual badge & info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-11 sm:w-11 sm:h-12 rounded-xl flex flex-col items-center justify-center p-1 border border-white/10 shrink-0"
                        style={{ backgroundColor: item.product.color }}
                      >
                        <span className="text-[9px] font-bold text-white tracking-wider">
                          {item.product.brand.slice(0, 3).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-light tracking-widest text-[#D6BC83]/80">
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

                    {/* Quantity controls, subtotal & remove */}
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

                      {/* Subtotal */}
                      <div className="text-right min-w-[55px]">
                        <span className="text-xs sm:text-sm font-normal text-[#D6BC83]">
                          ₹{subtotal}
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

            {/* Cart Footer */}
            <div className="p-4 sm:p-6 border-t border-[#D6BC83]/15 bg-white/[0.015] flex flex-col gap-3.5 sm:gap-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-extralight tracking-wider text-stone-300 uppercase">
                  Grand Total
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-extralight text-stone-400">
                    ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
                  </span>
                  <span className="text-xl sm:text-2xl font-light text-[#D6BC83] tracking-wide">
                    ₹{grandTotal}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  onClick={handleClose}
                  type="button"
                  className="w-full py-3 rounded-xl bg-transparent hover:bg-white/[0.06] border border-white/[0.12] hover:border-[#D6BC83]/40 text-xs font-light tracking-[0.16em] uppercase text-stone-200 hover:text-white transition-all duration-200"
                >
                  Continue Shopping
                </button>

                <button
                  onClick={() => setCheckoutReview(true)}
                  type="button"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B89B5E] via-[#C8A96A] to-[#D6BC83] hover:brightness-110 active:scale-[0.99] text-black font-normal text-xs tracking-[0.18em] uppercase shadow-[0_6px_20px_rgba(200,169,106,0.3)] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>Proceed to Checkout</span>
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
