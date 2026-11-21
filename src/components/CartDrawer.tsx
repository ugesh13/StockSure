'use client';

import React from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

interface CartDrawerProps {
  onStartCheckout: () => void;
  onExplore: () => void;
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
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const { user, openAuthModal } = useAuth();

  if (!isCartOpen) return null;

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    if (!user) {
      // Prompt glassmorphism login modal if logged out as requested in requirement 9
      openAuthModal('login');
    } else {
      onStartCheckout();
    }
  };

  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Darkened Backdrop */}
      <div
        className="absolute inset-0 bg-forest/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        {/* Drawer Panel with 28px radius on left corners: rounded-l-cart */}
        <div className="w-screen max-w-md bg-cream border-l border-forest/15 rounded-l-cart shadow-elevated flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-forest/10 flex items-center justify-between bg-cream-light/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-forest text-cream flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-cream" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-forest">Botanical Cart</h3>
                <span className="text-[11px] text-darktext/60">
                  {cartCount} {cartCount === 1 ? 'specimen' : 'specimens'}
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
                  <span>Add <strong className="text-forest">${freeShippingRemaining.toFixed(2)}</strong> for free delivery</span>
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
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 rounded-full bg-forest/5 mx-auto flex items-center justify-center text-forest">
                  <ShoppingBag className="w-8 h-8 text-forest/40" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-medium text-forest">Your basket is empty</h4>
                  <p className="text-xs text-darktext/60 max-w-xs mx-auto">
                    Bring life into your home with our carefully nurtured botanical specimens.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onExplore();
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
                  className="flex items-center gap-4 p-3 rounded-product bg-cream-light/60 border border-forest/10"
                >
                  {/* Thumbnail */}
                  <div className="relative w-18 h-18 w-20 h-20 rounded-[16px] overflow-hidden bg-cream-dark/40 flex-shrink-0 border border-forest/10">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-serif text-sm font-bold text-forest truncate">
                      {product.name}
                    </h5>
                    <p className="text-[10px] italic font-serif text-darktext/60 truncate">
                      {product.scientificName}
                    </p>
                    <div className="font-serif text-xs font-bold text-forest mt-1">
                      ${product.price} each
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-forest/20 rounded-button bg-cream px-1.5 py-0.5">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="p-1 text-forest hover:bg-forest/10 rounded-full"
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
                          className="p-1 text-forest hover:bg-forest/10 rounded-full disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

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
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-6 border-t border-forest/10 bg-cream-light/80 space-y-4">
              <div className="space-y-1.5 text-xs text-darktext/80">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-serif font-bold text-forest text-sm">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Botanical Insulated Packaging</span>
                  <span className="font-semibold text-moss">
                    {shippingCost === 0 ? 'Complimentary (Free)' : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-forest border-t border-forest/10 pt-2">
                  <span>Total</span>
                  <span className="font-serif text-xl font-bold">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckoutClick}
                className="w-full py-4 rounded-button bg-forest text-cream font-semibold text-sm hover:bg-forest-700 transition-all duration-300 shadow-soft hover:shadow-elevated flex items-center justify-center gap-2 group active:scale-98"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-darktext/60">
                <ShieldCheck className="w-3.5 h-3.5 text-moss" />
                <span>30-Day Healthy Plant Guarantee included</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
