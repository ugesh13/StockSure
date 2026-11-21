import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { getProductImage } from '../../data/productImages';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateItemQty,
    removeItem,
    clearAllCart,
    setIsCheckoutOpen,
  } = useShop();

  if (!isCartOpen) return null;

  const totalRupees = Math.round(cart.total_paise / 100);
  const deliveryFee = totalRupees >= 500 || totalRupees === 0 ? 0 : 40;
  const grandTotal = totalRupees + deliveryFee;

  const handleProceedCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FFFDF8] border-l border-[#E2D7C6] flex flex-col justify-between shadow-2xl">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#E2D7C6] flex items-center justify-between bg-[#F5F1E8]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#183D2B]" />
              <h2 className="text-base font-bold text-[#183D2B]">Your Cart</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#183D2B]/10 text-[#183D2B]">
                {cart.item_count} items
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="p-1 rounded-full text-[#756B5E] hover:text-[#292722] hover:bg-black/5"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-[#E2D7C6]/60">
            {cart.lines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-[#E2D7C6]/40 flex items-center justify-center text-[#756B5E] mb-4">
                  <ShoppingBag className="w-8 h-8 text-[#183D2B]/60" />
                </div>
                <h3 className="text-base font-semibold text-[#183D2B]">Your cart is empty</h3>
                <p className="text-xs text-[#756B5E] mt-1 max-w-xs leading-relaxed">
                  Explore our fresh produce, everyday groceries, and electronics catalogue to add items.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 px-5 py-2 rounded-full bg-[#183D2B] text-white text-xs font-medium tracking-wide shadow-sm hover:bg-[#245C3A] transition-colors"
                >
                  Start Exploring
                </button>
              </div>
            ) : (
              cart.lines.map((item) => {
                const itemPrice = Math.round(item.price_paise / 100);
                const itemSubtotal = itemPrice * item.qty;
                const imgSrc = item.image_url || getProductImage(item.product_id);

                return (
                  <div key={`${item.product_id}-${item.branch_id}`} className="py-4 flex gap-3.5 items-start">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-[#F5F1E8] border border-[#E2D7C6] p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src={imgSrc}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-[#756B5E] uppercase tracking-wider block">
                            {item.brand}
                          </span>
                          <h4 className="text-xs sm:text-sm font-medium text-[#292722] line-clamp-1">
                            {item.name}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product_id, item.branch_id)}
                          className="text-[#756B5E] hover:text-rose-600 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        {/* Quantity Counter */}
                        <div className="inline-flex items-center rounded-lg border border-[#E2D7C6] bg-[#F5F1E8] px-2 py-0.5 gap-2">
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.product_id, item.branch_id, item.qty - 1)}
                            className="text-[#183D2B] hover:text-[#245C3A]"
                            aria-label="Decrease"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-[#183D2B] min-w-[14px] text-center">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.product_id, item.branch_id, item.qty + 1)}
                            className="text-[#183D2B] hover:text-[#245C3A]"
                            aria-label="Increase"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <span className="text-xs sm:text-sm font-bold text-[#183D2B]">
                          ₹{itemSubtotal.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Stock availability indicator */}
                      {!item.ok && (
                        <span className="text-[10px] text-rose-600 font-medium block mt-1">
                          ⚠️ Requested quantity exceeds branch stock
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.lines.length > 0 && (
            <div className="p-5 border-t border-[#E2D7C6] bg-[#F5F1E8] flex flex-col gap-3">
              
              {/* Summary Rows */}
              <div className="space-y-1.5 text-xs text-[#756B5E]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#292722]">
                    ₹{totalRupees.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-[#245C3A] font-semibold">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                {totalRupees < 500 && (
                  <p className="text-[10px] text-[#756B5E] italic">
                    Add ₹{(500 - totalRupees).toLocaleString('en-IN')} more for free delivery
                  </p>
                )}
                <div className="border-t border-[#E2D7C6] pt-2 flex justify-between text-sm sm:text-base font-bold text-[#183D2B]">
                  <span>Total</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleProceedCheckout}
                className="w-full py-3 rounded-full bg-[#183D2B] hover:bg-[#245C3A] text-white text-xs sm:text-sm font-semibold tracking-wide shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 text-[#A5C7AA]" />
              </button>

              <button
                type="button"
                onClick={clearAllCart}
                className="text-[11px] text-[#756B5E] hover:text-[#292722] text-center underline cursor-pointer"
              >
                Clear Cart
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
