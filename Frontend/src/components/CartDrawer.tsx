'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Tag,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatImageUrl } from '@/lib/backend';

interface CartDrawerProps {
  onStartCheckout: () => void;
  onExplore?: () => void;
}

export default function CartDrawer({ onStartCheckout, onExplore }: CartDrawerProps) {
  const {
    items,
    cartCount,
    subtotal,
    shippingCost,
    total,
    freeShippingThreshold,
    freeShippingRemaining,
    appliedCoupon,
    discount,
    applyCoupon,
    removeCoupon,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const { user, openAuthModal } = useAuth();
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    if (res.success) {
      setCouponFeedback({ type: 'success', message: res.message });
      setCouponInput('');
    } else {
      setCouponFeedback({ type: 'error', message: res.message });
    }
  };

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    onStartCheckout();
  };

  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-forest/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-cream border-l border-forest/15 rounded-l-[32px] shadow-elevated flex flex-col justify-between overflow-hidden">
          {/* Drawer Header */}
          <div className="p-6 border-b border-forest/10 flex items-center justify-between bg-cream-light/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-forest text-cream flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-cream" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-forest">Botanical Cart</h3>
                <span className="text-[11px] text-darktext/60">
                  {cartCount} {cartCount === 1 ? 'specimen' : 'specimens'} reserved
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-full hover:bg-forest/10 text-forest transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Complimentary Shipping Progress Banner */}
          <div className="px-6 py-3.5 bg-forest/5 border-b border-forest/10 text-xs">
            {freeShippingRemaining > 0 ? (
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold text-darktext">
                  <span>
                    Add <strong className="text-forest">₹{freeShippingRemaining}</strong> for Free Delivery
                  </span>
                  <span className="text-moss">{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-forest/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-moss rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-moss font-semibold">
                <Sparkles className="w-4 h-4 text-earth" />
                <span>You unlocked Complimentary Insulated Greenhouse Delivery!</span>
              </div>
            )}
          </div>

          {/* Cart Item List / Empty State */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3.5 planty-scroll">
            {items.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 rounded-full bg-forest/5 mx-auto flex items-center justify-center text-forest">
                  <ShoppingBag className="w-8 h-8 text-forest/40" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-medium text-forest">Your basket is empty</h4>
                  <p className="text-xs text-darktext/60 max-w-xs mx-auto">
                    Bring nature into your home with certified, peat-free nursery plants.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    if (onExplore) onExplore();
                    else window.location.href = '/shop';
                  }}
                  className="px-6 py-3 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700 transition-colors shadow-soft"
                >
                  Explore Plant Collection
                </button>
              </div>
            ) : (
              items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-white border border-forest/10 shadow-xs"
                >
                  {/* Thumbnail */}
                  <div className="relative w-18 h-18 w-20 h-20 rounded-[14px] overflow-hidden bg-cream-dark/30 flex-shrink-0 border border-forest/10">
                    <img
                      src={formatImageUrl(product.imageUrl, product.name)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-serif text-sm font-bold text-forest truncate">
                      {product.name}
                    </h5>
                    <p className="text-[10px] italic text-darktext/60 truncate">
                      {product.scientificName}
                    </p>
                    <div className="font-serif text-xs font-bold text-forest mt-0.5">
                      ₹{product.price} <span className="text-[10px] font-sans font-normal text-darktext/60">each</span>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-forest/20 rounded-full bg-cream px-1.5 py-0.5">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="p-1 text-forest hover:bg-forest/10 rounded-full transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-forest">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          disabled={quantity >= product.stock}
                          className="p-1 text-forest hover:bg-forest/10 rounded-full disabled:opacity-30 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-serif font-bold text-xs text-forest">
                          ₹{product.price * quantity}
                        </span>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="p-1.5 text-darktext/40 hover:text-red-700 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Coupon & Checkout */}
          {items.length > 0 && (
            <div className="p-6 border-t border-forest/10 bg-cream-light/90 space-y-4 shadow-elevated">
              {/* Coupon Code Section */}
              <div className="space-y-2">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-forest/50 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Coupon: STOCKSURE10"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-forest/20 text-xs font-mono uppercase text-forest placeholder:text-darktext/40 focus:outline-none focus:border-forest"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-forest/10 hover:bg-forest/20 text-forest font-semibold text-xs transition-colors"
                  >
                    Apply
                  </button>
                </form>

                {couponFeedback && (
                  <div
                    className={`text-[11px] flex items-center gap-1.5 ${
                      couponFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {couponFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{couponFeedback.message}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                    <span className="font-mono font-bold text-emerald-800">
                      Applied: {appliedCoupon} (-₹{discount})
                    </span>
                    <button
                      onClick={removeCoupon}
                      className="text-[10px] text-red-600 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-darktext/80 pt-2 border-t border-forest/10">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-serif font-bold text-forest text-sm">₹{subtotal}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-moss">
                    {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
                  </span>
                </div>

                <div className="flex justify-between text-base font-bold text-forest border-t border-forest/10 pt-2">
                  <span>Total Payable</span>
                  <span className="font-serif text-xl font-bold">₹{total}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckoutClick}
                className="w-full py-3.5 rounded-button bg-forest text-cream font-semibold text-xs uppercase tracking-wider hover:bg-forest-700 transition-all duration-300 shadow-soft hover:shadow-elevated flex items-center justify-center gap-2 group active:scale-98"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-darktext/60">
                <ShieldCheck className="w-3.5 h-3.5 text-moss" />
                <span>Verified Fresh Live Stock · 30-Day Plant Guarantee</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
