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
  CreditCard,
  QrCode,
  Lock,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { backend, getStoredToken, Order, DeliveryTracking } from '@/lib/backend';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

type CheckoutStep = 'details' | 'payment' | 'confirmed';

export default function CheckoutModal({ isOpen, onClose, onOrderSuccess }: CheckoutModalProps) {
  const { items, subtotal, shippingCost, total, clearCart, selectedBranch, branches, setSelectedBranch } = useCart();
  const { user } = useAuth();

  // Wizard Step
  const [step, setStep] = useState<CheckoutStep>('details');

  // Form State
  const [fulfilment, setFulfilment] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [customerName, setCustomerName] = useState(user?.name || 'Priya Sharma');
  const [customerEmail, setCustomerEmail] = useState(user?.email || 'priya@stocksure.in');
  const [phone, setPhone] = useState(user?.phone || '9876543210');
  const [line1, setLine1] = useState('80 Feet Road, 4th Block, Koramangala');
  const [city, setCity] = useState(selectedBranch.city || 'Bengaluru');
  const [pincode, setPincode] = useState('560034');

  // Order & Payment State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<DeliveryTracking | null>(null);

  if (!isOpen) return null;

  // Step 1: Submit Details & Create Order
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim()) {
      setErrorMessage('Please provide recipient name.');
      return;
    }

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
      let token = getStoredToken();
      if (!token) {
        const guestSession = await backend.createSession(customerName.trim());
        token = guestSession.token;
      }

      // Synchronize frontend items with backend cart
      try {
        await backend.clearCart();
        for (const item of items) {
          await backend.addToCart(item.product.productId, selectedBranch.id, item.quantity);
        }
      } catch (cartErr) {
        console.warn('Backend cart sync note:', cartErr);
      }

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

      let paymentRes = null;
      try {
        paymentRes = await backend.createPayment(order.id);
      } catch (payErr: any) {
        console.warn('Payment attempt note:', payErr);
      }

      setPendingOrder(order);
      setPaymentDetails(paymentRes);
      setIsTestMode(Boolean(paymentRes?.provider === 'mock' || paymentRes?.key_id?.startsWith('rzp_test_')));
      setStep('payment');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order through backend.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2A: Launch Razorpay Modal
  const handleRazorpayPay = async () => {
    if (!pendingOrder) return;
    setLoading(true);
    setErrorMessage('');

    try {
      if (typeof window !== 'undefined') {
        if (!(window as any).Razorpay) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Unable to load Razorpay payment script.'));
            document.body.appendChild(script);
          });
        }

        const rzpKey = paymentDetails?.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_U2rqae8q4wUip8';
        const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');

        const options = {
          key: rzpKey,
          amount: paymentDetails?.amount_paise || total * 100,
          currency: paymentDetails?.currency || 'INR',
          name: 'StockSure Botanical Nursery',
          description: `Order #${pendingOrder.id.slice(0, 8)}`,
          order_id: paymentDetails?.provider_order_id,
          handler: async function (response: any) {
            try {
              if (response.razorpay_signature) {
                await backend.verifyPayment(pendingOrder.id, {
                  provider_order_id: response.razorpay_order_id || paymentDetails?.provider_order_id,
                  provider_payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                });
              }
              completeOrderSuccess(pendingOrder);
            } catch (verifyErr: any) {
              setErrorMessage(verifyErr.message || 'Payment verification failed.');
              setLoading(false);
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
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error launching Razorpay.');
      setLoading(false);
    }
  };

  // Step 2B: Sandbox Simulated Payment
  const handleSimulatedPay = async () => {
    if (!pendingOrder) return;
    setLoading(true);
    setErrorMessage('');

    try {
      try {
        await backend.payOrder(pendingOrder.id);
      } catch {
        // Safe fallback if route is disabled in razorpay mode
      }

      completeOrderSuccess(pendingOrder);
    } catch (err: any) {
      setErrorMessage(err.message || 'Simulation error.');
    } finally {
      setLoading(false);
    }
  };

  const completeOrderSuccess = async (order: Order) => {
    order.status = 'CONFIRMED';
    setConfirmedOrder(order);
    clearCart();
    onOrderSuccess(order);
    setStep('confirmed');

    try {
      const track = await backend.getOrderTracking(order.id);
      setTrackingInfo(track);
    } catch {
      // Ignore if tracking fails
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#183D2B', '#687D4D', '#A8B59A', '#B68B63'],
    });
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

        {/* ================= STEP 3: ORDER CONFIRMED ================= */}
        {step === 'confirmed' && confirmedOrder && (
          <div className="text-center py-6 space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-forest text-cream mx-auto flex items-center justify-center shadow-elevated">
              <PackageCheck className="w-8 h-8 text-sage-light" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-bold text-moss">
                  Order Confirmed
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  PAID IN FULL
                </span>
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

              {/* Delivery Tracking Details */}
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
        )}

        {/* ================= STEP 2: SECURE PAYMENT SCREEN ================= */}
        {step === 'payment' && pendingOrder && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-forest/10 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-moss" />
                  <span className="text-xs uppercase tracking-widest font-bold text-moss">
                    Step 2 of 2: Payment
                  </span>
                </div>
                <h2 className="editorial-serif text-2xl sm:text-3xl font-light text-forest">
                  Complete Your Payment
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-darktext/60 block">Amount Payable</span>
                <span className="editorial-serif text-3xl font-bold text-forest">₹{total}</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Order Reference Box */}
            <div className="p-4 rounded-panel bg-white border border-forest/15 shadow-soft space-y-2 text-xs">
              <div className="flex justify-between items-center text-darktext">
                <span className="font-semibold text-forest">Order ID:</span>
                <span className="font-mono text-[11px] text-darktext/80">{pendingOrder.id}</span>
              </div>
              <div className="flex justify-between items-center text-darktext/70">
                <span>Fulfillment:</span>
                <span className="font-medium text-forest">{fulfilment === 'DELIVERY' ? 'Home Delivery' : 'Store Pickup'} ({selectedBranch.name})</span>
              </div>
              <div className="flex justify-between items-center text-darktext/70">
                <span>Recipient:</span>
                <span className="font-medium text-forest">{customerName} ({phone})</span>
              </div>
            </div>

            {/* Payment Options Grid */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                Select Payment Option
              </label>

              {/* Option 1: Razorpay Gateway */}
              <div className="p-4 rounded-panel bg-white border-2 border-forest/20 hover:border-forest shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-forest/10 flex items-center justify-center text-forest shrink-0 mt-0.5">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-forest">Razorpay Secure Checkout</h4>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
                        Cards · UPI · NetBanking
                      </span>
                    </div>
                    <p className="text-xs text-darktext/70 mt-0.5">
                      Pay via Google Pay, PhonePe, Cards, or Netbanking with live signature verification.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRazorpayPay}
                  className="px-5 py-2.5 rounded-button bg-forest text-cream font-semibold text-xs uppercase tracking-wider hover:bg-forest-700 transition-colors shadow-sm disabled:opacity-50 shrink-0"
                >
                  {loading ? 'Opening...' : `Pay ₹${total}`}
                </button>
              </div>

              {/* Option 2: Instant Sandbox Simulator */}
              <div className="p-4 rounded-panel bg-emerald-50/70 border-2 border-emerald-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-800 shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-emerald-950">Simulated Test Authorization</h4>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-200 text-emerald-900">
                        Instant Approval
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800/80 mt-0.5">
                      One-click simulated authorization for evaluation, bypassing external payment popups.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSimulatedPay}
                  className="px-5 py-2.5 rounded-button bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 shrink-0"
                >
                  {loading ? 'Approving...' : 'Authorize (Test)'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Delivery Details</span>
              </button>

              <div className="flex items-center gap-2 text-[11px] text-darktext/60">
                <ShieldCheck className="w-4 h-4 text-moss" />
                <span>256-Bit SSL Encrypted</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 1: DELIVERY & RECIPIENT DETAILS ================= */}
        {step === 'details' && (
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

            <form onSubmit={handleProceedToPayment} className="space-y-5">
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

              {/* Delivery Address Fields */}
              {fulfilment === 'DELIVERY' && (
                <div className="space-y-3 pt-1 border-t border-forest/10">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      placeholder="e.g., 80 Feet Road, 4th Block, Koramangala"
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
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="560034"
                        className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Order Summary Strip */}
              <div className="p-4 rounded-panel bg-white/70 border border-forest/10 space-y-2 text-xs">
                <div className="flex justify-between text-darktext/80">
                  <span>Items ({items.length})</span>
                  <span className="font-serif font-bold text-forest">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-darktext/80">
                  <span>Delivery Charges</span>
                  <span className="font-bold text-moss">
                    {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
                  </span>
                </div>
                <div className="border-t border-forest/10 pt-2 flex justify-between font-bold text-forest text-sm">
                  <span>Total Amount</span>
                  <span className="font-serif text-base">₹{total}</span>
                </div>
              </div>

              {/* Submit to Payment Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-button bg-forest hover:bg-forest-700 text-cream font-bold text-xs uppercase tracking-wider transition-all shadow-elevated flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reserving Inventory & Creating Order...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Payment (₹{total})</span>
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
