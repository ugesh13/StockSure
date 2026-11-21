'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  ShieldCheck,
  Truck,
  PackageCheck,
  ArrowRight,
  Sprout,
  Store,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { backend, getStoredToken, Order, DeliveryTracking } from '@/lib/backend';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export default function CheckoutModal({ isOpen, onClose, onOrderSuccess }: CheckoutModalProps) {
  const { items, subtotal, shippingCost, total, clearCart, selectedBranch, branches, setSelectedBranch } = useCart();
  const { user } = useAuth();

  // Form State
  const [fulfilment, setFulfilment] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [customerName, setCustomerName] = useState(user?.name || 'Priya Sharma');
  const [customerEmail, setCustomerEmail] = useState(user?.email || 'priya@stocksure.in');
  const [phone, setPhone] = useState(user?.phone || '9876543210');
  const [line1, setLine1] = useState('80 Feet Road, 4th Block, Koramangala');
  const [city, setCity] = useState(selectedBranch.city || 'Bengaluru');
  const [pincode, setPincode] = useState('560034');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<DeliveryTracking | null>(null);

  if (!isOpen) return null;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim()) {
      setErrorMessage('Please provide recipient name.');
      return;
    }

    // Clean phone number (must be 10-digit Indian number)
    const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please provide a valid 10-digit Indian mobile number (e.g., 9876543210).');
      return;
    }

    if (fulfilment === 'DELIVERY') {
      if (!line1.trim()) {
        setErrorMessage('Street address is required for Home Delivery.');
        return;
      }
      if (!city.trim()) {
        setErrorMessage('City is required for Home Delivery.');
        return;
      }
      const cleanPin = pincode.trim();
      if (!/^\d{6}$/.test(cleanPin)) {
        setErrorMessage('Please provide a valid 6-digit Indian PIN code (e.g., 560034).');
        return;
      }
    }

    if (items.length === 0) {
      setErrorMessage('Your shopping cart is empty.');
      return;
    }

    setLoading(true);

    try {
      // 1. Ensure user has a valid session token (creates guest session if not logged in)
      let token = getStoredToken();
      if (!token) {
        const guestSession = await backend.createSession(customerName.trim());
        token = guestSession.token;
      }

      // 2. Synchronize frontend items with backend cart
      try {
        await backend.clearCart();
        for (const item of items) {
          await backend.addToCart(item.product.productId, selectedBranch.id, item.quantity);
        }
      } catch (cartErr) {
        console.warn('Backend cart sync note:', cartErr);
      }

      // 3. Dispatch real backend checkout
      const addressPayload = fulfilment === 'DELIVERY'
        ? {
            name: customerName.trim(),
            phone: cleanPhone,
            line1: line1.trim(),
            city: city.trim(),
            pincode: pincode.trim(),
            lat: selectedBranch.lat || 12.9352,
            lng: selectedBranch.lng || 77.6245,
          }
        : undefined;

      const checkoutRes = await backend.checkout({
        fulfilment,
        branch_id: selectedBranch.id,
        address: addressPayload,
      });

      const order = checkoutRes.order;
      if (!order || !order.id) {
        throw new Error('Order creation failed on backend.');
      }

      // 4. Initiate payment flow
      let paymentRes;
      try {
        paymentRes = await backend.createPayment(order.id);
      } catch (payErr: any) {
        // If razorpay mode but payment creation failed, inspect
        throw payErr;
      }

      const isMock = paymentRes.provider === 'mock' || (paymentRes.provider_order_id && paymentRes.provider_order_id.startsWith('mock_'));
      setIsTestMode(Boolean(isMock));

      if (isMock) {
        // Simulated / Test mode: complete payment directly
        try {
          await backend.payOrder(order.id);
        } catch {
          // If payOrder route was disabled or replayed, it's safe
        }
        order.status = 'CONFIRMED';
        setConfirmedOrder(order);
        clearCart();
        onOrderSuccess(order);

        // Fetch live delivery tracking
        try {
          const track = await backend.getOrderTracking(order.id);
          setTrackingInfo(track);
        } catch {
          // Ignore if pickup
        }

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#183D2B', '#687D4D', '#A8B59A', '#B68B63'],
        });
      } else {
        // Real Razorpay Checkout integration
        if (typeof window !== 'undefined') {
          // Load Razorpay script if not already loaded
          if (!(window as any).Razorpay) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://checkout.razorpay.com/v1/checkout.js';
              script.onload = resolve;
              script.onerror = reject;
              document.body.appendChild(script);
            });
          }

          const rzpKey = paymentRes.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
          const options = {
            key: rzpKey,
            amount: paymentRes.amount_paise,
            currency: paymentRes.currency || 'INR',
            name: 'StockSure Botanical Nursery',
            description: `Order #${order.id.slice(0, 8)}`,
            order_id: paymentRes.provider_order_id,
            handler: async function (response: any) {
              try {
                await backend.verifyPayment(order.id, {
                  provider_order_id: response.razorpay_order_id || paymentRes.provider_order_id,
                  provider_payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                });
                order.status = 'CONFIRMED';
                setConfirmedOrder(order);
                clearCart();
                onOrderSuccess(order);

                try {
                  const track = await backend.getOrderTracking(order.id);
                  setTrackingInfo(track);
                } catch {
                  // ignore
                }

                confetti({
                  particleCount: 80,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#183D2B', '#687D4D', '#A8B59A', '#B68B63'],
                });
              } catch (verifyErr: any) {
                setErrorMessage(verifyErr.message || 'Payment verification failed.');
              }
            },
            prefill: {
              name: customerName,
              email: customerEmail,
              contact: cleanPhone,
            },
            theme: {
              color: '#183D2B',
            },
            modal: {
              ondismiss: function () {
                setLoading(false);
                setErrorMessage('Payment window was dismissed. You can complete payment anytime.');
              },
            },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order through backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/60 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-modal bg-cream border border-forest/15 shadow-elevated p-6 sm:p-8"
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
              <div className="inline-flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-bold text-moss">
                  Order Confirmed
                </span>
                {isTestMode && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    TEST MODE
                  </span>
                )}
              </div>
              <h2 className="editorial-serif text-3xl sm:text-4xl font-light text-forest">
                Thank you, {customerName}!
              </h2>
              <p className="text-xs sm:text-sm text-darktext/70 max-w-md mx-auto">
                Your order <strong className="text-forest font-mono">#{confirmedOrder.id}</strong> has been confirmed and scheduled with StockSure {selectedBranch.name}.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="text-left p-6 rounded-panel bg-white/80 border border-forest/10 shadow-soft space-y-4 max-w-lg mx-auto text-xs">
              <div className="flex justify-between border-b border-forest/10 pb-3 font-semibold text-forest">
                <span>Branch Fulfillment</span>
                <span>{selectedBranch.name} ({fulfilment})</span>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-darktext/70 uppercase text-[10px] tracking-wider block">
                  Items Reserved:
                </span>
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center text-darktext">
                    <span className="truncate max-w-[240px]">
                      {item.quantity}x {item.product.name}
                    </span>
                    <span className="font-serif font-bold text-forest">
                      ₹{item.product.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-forest/10 pt-3 space-y-1">
                <div className="flex justify-between text-darktext/70">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-darktext/70">
                  <span>Delivery Charges</span>
                  <span className="text-moss font-semibold">
                    {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-forest pt-1">
                  <span>Total Amount Paid</span>
                  <span className="font-serif text-base">₹{total}</span>
                </div>
              </div>

              {/* Delivery Tracking Details if available */}
              {trackingInfo && (
                <div className="p-3.5 rounded-[14px] bg-forest/5 text-darktext space-y-1 border border-forest/10">
                  <div className="flex items-center justify-between font-semibold text-forest">
                    <span>Delivery Status:</span>
                    <span className="uppercase text-[10px] px-2 py-0.5 rounded-full bg-forest text-cream font-mono">
                      {trackingInfo.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-darktext/70">
                    Estimated Transit: {trackingInfo.eta_minutes || 25} mins
                  </p>
                  {trackingInfo.handover_code && (
                    <p className="text-[11px] font-mono font-bold text-forest">
                      Handover Code: {trackingInfo.handover_code}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              <a
                href="/profile"
                className="px-6 py-3 rounded-button bg-forest text-cream font-semibold text-xs uppercase tracking-wider hover:bg-forest-700 transition-colors shadow-soft"
              >
                View in Profile
              </a>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-button bg-white text-forest border border-forest/20 font-semibold text-xs uppercase tracking-wider hover:bg-forest/5 transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        ) : (
          /* Checkout Form */
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sprout className="w-5 h-5 text-moss" />
                <span className="text-xs uppercase tracking-widest font-bold text-moss">
                  StockSure Greenhouse Checkout
                </span>
              </div>
              <h2 className="editorial-serif text-2xl sm:text-3xl font-light text-forest">
                Complete Your Order
              </h2>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-5">
              {/* Fulfilment Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block mb-2">
                  Fulfillment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFulfilment('DELIVERY')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      fulfilment === 'DELIVERY'
                        ? 'bg-forest text-cream border-forest shadow-sm'
                        : 'bg-white text-forest border-forest/20 hover:bg-forest/5'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Home Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfilment('PICKUP')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      fulfilment === 'PICKUP'
                        ? 'bg-forest text-cream border-forest shadow-sm'
                        : 'bg-white text-forest border-forest/20 hover:bg-forest/5'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>Store Pickup</span>
                  </button>
                </div>
              </div>

              {/* Branch Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block mb-1">
                  Serving Branch
                </label>
                <select
                  value={selectedBranch.id}
                  onChange={(e) => {
                    const found = branches.find((b) => b.id === Number(e.target.value));
                    if (found) setSelectedBranch(found);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Priya Sharma"
                    className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                    Phone Number (10 digits) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* Delivery Address Details */}
              {fulfilment === 'DELIVERY' && (
                <div className="space-y-3 pt-2 border-t border-forest/10">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      placeholder="Flat/House, Street, Area"
                      className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Bengaluru"
                        className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                        PIN Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="560034"
                        className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Summary Snippet */}
              <div className="p-4 rounded-xl bg-forest/5 border border-forest/10 text-xs space-y-1">
                <div className="flex justify-between text-darktext/80">
                  <span>Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-darktext/80">
                  <span>Delivery Charges</span>
                  <span className="text-moss font-semibold">
                    {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm text-forest pt-1 border-t border-forest/10">
                  <span>Final Total</span>
                  <span className="font-serif">₹{total}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-button bg-forest text-cream font-semibold text-xs uppercase tracking-wider hover:bg-forest-700 transition-all shadow-soft flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reserving Inventory & Contacting Backend...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Place Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
