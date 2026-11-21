'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import {
  X,
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building,
  PackageCheck,
  ArrowRight,
  Sprout,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Order } from '@/lib/db';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export default function CheckoutModal({ isOpen, onClose, onOrderSuccess }: CheckoutModalProps) {
  const { items, subtotal, shippingCost, total, clearCart } = useCart();
  const { user } = useAuth();

  // Form State
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('42 Botanical Gardens Mews');
  const [city, setCity] = useState('Bath');
  const [postalCode, setPostalCode] = useState('BA1 2XW');
  const [country, setCountry] = useState('United Kingdom');
  const [notes, setNotes] = useState('Please leave in the porch sanctuary if unavailable');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card / Apple Pay');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim() || !customerEmail.trim()) {
      setErrorMessage('Please provide your name and email address.');
      return;
    }

    if (!address.trim() || !city.trim() || !postalCode.trim()) {
      setErrorMessage('Please provide your complete delivery address.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your shopping cart is empty.');
      return;
    }

    setLoading(true);

    try {
      const orderPayload = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        shippingAddress: {
          address: address.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
          notes: notes.trim(),
        },
        paymentMethod,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Failed to place order. Please try again.');
        setLoading(false);
        return;
      }

      // Order successfully verified and placed in real backend!
      setConfirmedOrder(data.order);
      clearCart();
      onOrderSuccess(data.order);

      // Trigger botanical celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#183D2B', '#687D4D', '#A8B59A', '#B68B63'],
        });
      } catch {
        // ignore
      }
    } catch {
      setErrorMessage('A network error occurred while submitting your order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/60 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto glass-panel rounded-modal bg-cream border border-forest/15 shadow-elevated p-6 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-forest/10 text-forest transition-colors"
          aria-label="Close checkout"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Confirmation Screen */}
        {confirmedOrder ? (
          <div className="text-center py-6 space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-forest text-cream mx-auto flex items-center justify-center shadow-elevated">
              <PackageCheck className="w-8 h-8 text-sage-light" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest font-bold text-moss">
                Order Confirmed
              </span>
              <h2 className="editorial-serif text-3xl sm:text-4xl font-light text-forest">
                Thank you, {confirmedOrder.customerName}
              </h2>
              <p className="text-xs sm:text-sm text-darktext/70 max-w-md mx-auto">
                We have registered order <strong className="text-forest">#{confirmedOrder.id}</strong> in our
                greenhouse system. Our master growers are carefully inspecting and preparing your
                specimens for acclimated transit.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="text-left p-6 rounded-panel bg-cream-light/80 border border-forest/10 shadow-soft space-y-4 max-w-lg mx-auto text-xs">
              <div className="flex justify-between border-b border-forest/10 pb-3 font-semibold text-forest">
                <span>Order Reference</span>
                <span className="font-mono">{confirmedOrder.id}</span>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-darktext/70 uppercase text-[10px] tracking-wider block">
                  Botanical Specimens:
                </span>
                {confirmedOrder.items.map((item) => (
                  <div key={item.productId} className="flex justify-between items-center text-darktext">
                    <span className="truncate max-w-[240px]">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-serif font-bold text-forest">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-forest/10 pt-3 space-y-1">
                <div className="flex justify-between text-darktext/70">
                  <span>Subtotal</span>
                  <span>${confirmedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-darktext/70">
                  <span>Insulated Delivery</span>
                  <span className="text-moss font-semibold">
                    {confirmedOrder.shippingCost === 0
                      ? 'Complimentary'
                      : `$${confirmedOrder.shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-forest pt-1">
                  <span>Total Paid</span>
                  <span className="font-serif text-base">${confirmedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 rounded-[14px] bg-forest/5 text-darktext/70 space-y-0.5">
                <p>
                  <strong>Destination:</strong> {confirmedOrder.shippingAddress.address},{' '}
                  {confirmedOrder.shippingAddress.city} {confirmedOrder.shippingAddress.postalCode}
                </p>
                <p>
                  <strong>Dispatched:</strong> 2-3 Business Days in Climate Pouch
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-8 py-3.5 rounded-button bg-forest text-cream font-semibold text-xs uppercase tracking-wider hover:bg-forest-700 transition-colors shadow-soft"
            >
              Return to Sanctuary
            </button>
          </div>
        ) : (
          /* Checkout Form */
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sprout className="w-5 h-5 text-moss" />
                <span className="text-xs uppercase tracking-widest font-bold text-moss">
                  White-Glove Greenhouse Checkout
                </span>
              </div>
              <h2 className="editorial-serif text-3xl sm:text-4xl font-light text-forest">
                Complete Your Botanical Order
              </h2>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Customer & Delivery details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-forest border-b border-forest/10 pb-2">
                    1. Recipient Details
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-darktext/80 block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Elena Vance"
                      className="w-full px-3.5 py-2.5 rounded-input bg-cream-light/80 border border-forest/15 text-forest text-xs focus:outline-none focus:border-forest"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-darktext/80 block">
                      Email for Order Updates & Care Guide
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="elena@example.com"
                      className="w-full px-3.5 py-2.5 rounded-input bg-cream-light/80 border border-forest/15 text-forest text-xs focus:outline-none focus:border-forest"
                      required
                    />
                  </div>

                  <h3 className="text-xs font-bold uppercase tracking-wider text-forest border-b border-forest/10 pb-2 pt-2">
                    2. Sanctuary Delivery Address
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-darktext/80 block">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="42 Botanical Gardens Mews"
                      className="w-full px-3.5 py-2.5 rounded-input bg-cream-light/80 border border-forest/15 text-forest text-xs focus:outline-none focus:border-forest"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-darktext/80 block">
                        City / Town
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Bath"
                        className="w-full px-3.5 py-2.5 rounded-input bg-cream-light/80 border border-forest/15 text-forest text-xs focus:outline-none focus:border-forest"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-darktext/80 block">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="BA1 2XW"
                        className="w-full px-3.5 py-2.5 rounded-input bg-cream-light/80 border border-forest/15 text-forest text-xs focus:outline-none focus:border-forest"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-darktext/80 block">
                      Courier Delivery Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Leave in porch / Ring front bell"
                      className="w-full px-3.5 py-2.5 rounded-input bg-cream-light/80 border border-forest/15 text-forest text-xs focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>

                {/* Right Column: Order Summary & Payment method */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-forest border-b border-forest/10 pb-2">
                      3. Order Summary ({items.length} items)
                    </h3>

                    <div className="max-h-48 overflow-y-auto space-y-2 py-3 pr-1">
                      {items.map(({ product, quantity }) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between text-xs py-1 border-b border-forest/5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-forest/10 font-bold text-[10px] flex items-center justify-center text-forest">
                              {quantity}
                            </span>
                            <span className="font-serif font-medium text-forest truncate max-w-[160px]">
                              {product.name}
                            </span>
                          </div>
                          <span className="font-serif font-bold text-forest">
                            ${(product.price * quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 text-xs text-darktext/80 pt-3 border-t border-forest/10">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-serif font-bold">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Insulated Packaging</span>
                        <span className="text-moss font-semibold">
                          {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-forest pt-2 border-t border-forest/10">
                        <span>Total Due</span>
                        <span className="font-serif text-xl font-bold">${total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Payment Simulation selector */}
                    <div className="mt-4 space-y-2">
                      <label className="text-[11px] font-bold uppercase text-darktext/80 block">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {['Credit Card / Apple Pay', 'Direct Bank Wire'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m)}
                            className={`p-2.5 rounded-[14px] border text-left font-medium transition-all ${
                              paymentMethod === m
                                ? 'bg-forest text-cream border-forest'
                                : 'bg-cream-light/60 border-forest/15 text-forest hover:bg-forest/5'
                            }`}
                          >
                            <span className="block text-[11px]">{m}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Submission Button */}
                  <div className="space-y-2 pt-4">
                    <button
                      type="submit"
                      disabled={loading || items.length === 0}
                      className="w-full py-4 rounded-button bg-forest text-cream font-semibold text-xs uppercase tracking-wider hover:bg-forest-700 transition-all duration-300 shadow-soft hover:shadow-elevated flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                    >
                      <span>{loading ? 'Verifying Greenhouse Stock...' : `Place Order · $${total.toFixed(2)}`}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-darktext/60">
                      <ShieldCheck className="w-3.5 h-3.5 text-moss" />
                      <span>Stock verified in real-time · SSL encrypted checkout</span>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
