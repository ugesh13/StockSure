import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Truck, Store, ArrowRight, Loader2, Lock } from 'lucide-react';
import { useShop, CITIES } from '../../context/ShopContext';
import * as api from '../../services/api';

export default function CheckoutModal() {
  const {
    cart,
    isCheckoutOpen,
    setIsCheckoutOpen,
    selectedCity,
    selectedBranchId,
    setOrderSuccess,
    refreshCart,
    isAuthenticated,
    currentUser,
    setIsLoginModalOpen,
  } = useShop();

  const [fulfilment, setFulfilment] = useState('DELIVERY');
  const [formData, setFormData] = useState({
    name: currentUser?.name || 'Priya Sharma',
    phone: currentUser?.phone || '+91 98765 43210',
    address: '402, Highline Residency, 12th Main Road',
    city: selectedCity,
    pincode: '560034',
    instructions: 'Please leave at door if unreachable',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Update name if user logs in
  useEffect(() => {
    if (currentUser?.name) {
      setFormData((prev) => ({
        ...prev,
        name: currentUser.name,
        phone: currentUser.phone || prev.phone,
      }));
    }
  }, [currentUser]);

  if (!isCheckoutOpen) return null;

  // Unauthenticated protection modal view
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto select-none flex items-center justify-center p-4">
        <div
          onClick={() => setIsCheckoutOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />
        <div className="relative w-full max-w-md bg-[#FFFDF8] border border-[#E2D7C6] rounded-3xl shadow-2xl p-6 sm:p-8 z-10 text-center animate-fade-in-up">
          <div className="w-14 h-14 rounded-2xl bg-[#183D2B] text-white flex items-center justify-center mx-auto mb-4 shadow-md">
            <Lock className="w-7 h-7 text-[#A5C7AA]" />
          </div>
          <h2 className="text-lg font-bold text-[#183D2B]">
            Sign in to Complete Checkout
          </h2>
          <p className="text-xs text-[#756B5E] mt-2 leading-relaxed">
            StockSure maintains guaranteed live stock reservations during checkout. Please sign in or register to secure your items and place your order.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsCheckoutOpen(false);
                setIsLoginModalOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-[#183D2B] hover:bg-[#245C3A] text-white text-xs sm:text-sm font-semibold shadow-md transition-colors cursor-pointer"
            >
              Sign In or Register
            </button>
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="w-full py-2 text-xs text-[#756B5E] hover:text-[#292722] cursor-pointer"
            >
              Return to Cart
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalRupees = Math.round(cart.total_paise / 100);
  const deliveryFee = fulfilment === 'PICKUP' || totalRupees >= 500 ? 0 : 40;
  const grandTotal = totalRupees + deliveryFee;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setIsCheckoutOpen(false);
      setIsLoginModalOpen(true);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Checkout via Fastify backend (reserves stock with idempotency guarantee)
      const checkoutRes = await api.checkoutCart({
        fulfilment,
        branchId: selectedBranchId,
        city: formData.city,
      });

      const order = checkoutRes.order;
      if (!order || !order.id) {
        throw new Error('Order creation was not acknowledged by backend');
      }

      // 2. Complete payment in backend order lifecycle
      const payRes = await api.payOrder(order.id);
      const paidOrder = payRes.order || order;

      // 3. Clear cart and show order confirmation
      await api.clearCart();
      await refreshCart();

      setIsCheckoutOpen(false);
      setOrderSuccess({
        ...paidOrder,
        customerDetails: formData,
        deliveryFee,
        grandTotal,
      });
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMsg(err.message || 'Checkout failed. Please verify stock availability.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto select-none flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => !loading && setIsCheckoutOpen(false)}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#FFFDF8] border border-[#E2D7C6] rounded-3xl shadow-2xl overflow-hidden z-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2D7C6] flex items-center justify-between bg-[#F5F1E8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#183D2B] flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4 text-[#A5C7AA]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#183D2B]">
                Complete Your Order
              </h2>
              <p className="text-xs text-[#756B5E]">
                Guaranteed inventory reservation • Safe simulated checkout
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !loading && setIsCheckoutOpen(false)}
            className="p-1 rounded-full text-[#756B5E] hover:text-[#292722] hover:bg-black/5"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handlePlaceOrder} className="p-6 space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Fulfilment Toggle */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#756B5E] block mb-2">
              Fulfilment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfilment('DELIVERY')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium border transition-all ${
                  fulfilment === 'DELIVERY'
                    ? 'bg-[#183D2B] text-white border-[#183D2B] shadow-sm'
                    : 'bg-[#F5F1E8] text-[#292722] border-[#E2D7C6] hover:bg-[#E2D7C6]/40'
                }`}
              >
                <Truck className="w-4 h-4 text-[#A5C7AA]" />
                <span>Doorstep Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfilment('PICKUP')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium border transition-all ${
                  fulfilment === 'PICKUP'
                    ? 'bg-[#183D2B] text-white border-[#183D2B] shadow-sm'
                    : 'bg-[#F5F1E8] text-[#292722] border-[#E2D7C6] hover:bg-[#E2D7C6]/40'
                }`}
              >
                <Store className="w-4 h-4 text-[#A5C7AA]" />
                <span>Express Store Pickup</span>
              </button>
            </div>
          </div>

          {/* Customer & Address Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#756B5E] block mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-[#F5F1E8] border border-[#E2D7C6] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#183D2B]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#756B5E] block mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-[#F5F1E8] border border-[#E2D7C6] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#183D2B]"
                />
              </div>
            </div>

            {fulfilment === 'DELIVERY' && (
              <>
                <div>
                  <label className="text-xs font-medium text-[#756B5E] block mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full bg-[#F5F1E8] border border-[#E2D7C6] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#183D2B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[#756B5E] block mb-1">
                      City
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full bg-[#F5F1E8] border border-[#E2D7C6] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#183D2B]"
                    >
                      {CITIES.map((c) => (
                        <option key={c.city} value={c.city}>
                          {c.city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#756B5E] block mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      required
                      value={formData.pincode}
                      onChange={handleChange}
                      className="w-full bg-[#F5F1E8] border border-[#E2D7C6] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#183D2B]"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Order Summary Box */}
          <div className="p-4 rounded-2xl bg-[#F5F1E8] border border-[#E2D7C6] space-y-2 text-xs text-[#756B5E]">
            <div className="flex justify-between font-medium">
              <span>Items ({cart.item_count})</span>
              <span className="text-[#292722]">₹{totalRupees.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Charges</span>
              <span>{deliveryFee === 0 ? <strong className="text-[#245C3A]">FREE</strong> : `₹${deliveryFee}`}</span>
            </div>
            <div className="border-t border-[#E2D7C6] pt-2 flex justify-between text-sm sm:text-base font-bold text-[#183D2B]">
              <span>Final Total</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Place Order CTA */}
          <button
            type="submit"
            disabled={loading || cart.lines.length === 0}
            className="w-full py-3.5 rounded-full bg-[#183D2B] hover:bg-[#245C3A] text-white text-xs sm:text-sm font-semibold tracking-wide shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-stone-300 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#A5C7AA]" />
                <span>Processing Order & Reserving Stock...</span>
              </>
            ) : (
              <>
                <span>Confirm & Place Order</span>
                <ArrowRight className="w-4 h-4 text-[#A5C7AA]" />
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
}
