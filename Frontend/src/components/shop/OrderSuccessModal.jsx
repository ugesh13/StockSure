import React from 'react';
import { CheckCircle2, PackageCheck, Copy, ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export default function OrderSuccessModal() {
  const { orderSuccess, setOrderSuccess, showToast } = useShop();

  if (!orderSuccess) return null;

  const copyOrderId = () => {
    if (orderSuccess.id) {
      navigator.clipboard?.writeText(orderSuccess.id);
      showToast('Order ID copied to clipboard');
    }
  };

  const totalRupees = orderSuccess.grandTotal
    ? orderSuccess.grandTotal
    : orderSuccess.total_paise
    ? Math.round(orderSuccess.total_paise / 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto select-none flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => setOrderSuccess(null)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Success Dialog */}
      <div className="relative w-full max-w-lg bg-[#FFFDF8] border border-[#E2D7C6] rounded-3xl shadow-2xl overflow-hidden z-10 animate-fade-in-up">
        
        {/* Banner */}
        <div className="bg-[#183D2B] text-white p-6 sm:p-8 text-center flex flex-col items-center justify-center relative">
          <div className="w-16 h-16 rounded-full bg-[#A5C7AA]/20 border border-[#A5C7AA]/40 flex items-center justify-center mb-4 text-[#A5C7AA] shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-[#A5C7AA]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Order Confirmed!
          </h2>
          <p className="text-xs sm:text-sm text-[#A5C7AA] mt-1 font-light">
            Thank you for shopping with StockSure. Your items are secured.
          </p>
        </div>

        {/* Order Details Body */}
        <div className="p-6 space-y-5">
          
          {/* Order Reference Box */}
          <div className="p-4 rounded-2xl bg-[#F5F1E8] border border-[#E2D7C6] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-[#756B5E] uppercase tracking-wider block">
                Order Reference (Backend UUID)
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#183D2B] break-all">
                {orderSuccess.id}
              </span>
            </div>
            <button
              type="button"
              onClick={copyOrderId}
              className="p-2 rounded-lg bg-white border border-[#E2D7C6] text-[#183D2B] hover:bg-[#E2D7C6]/30 transition-colors shrink-0 ml-2"
              title="Copy Order ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* Delivery & Status Summary */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#F5F1E8] border border-[#E2D7C6]">
              <span className="text-[10px] text-[#756B5E] uppercase tracking-wider block mb-0.5">
                Status
              </span>
              <span className="font-bold text-[#245C3A] inline-flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5" />
                <span>{orderSuccess.status || 'PLACED'}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F1E8] border border-[#E2D7C6]">
              <span className="text-[10px] text-[#756B5E] uppercase tracking-wider block mb-0.5">
                Total Paid
              </span>
              <span className="font-bold text-[#183D2B]">
                ₹{totalRupees.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Customer / Address Summary if available */}
          {orderSuccess.customerDetails && (
            <div className="text-xs text-[#756B5E] border-t border-[#E2D7C6] pt-3">
              <span className="font-semibold text-[#292722] block mb-1">
                Delivering to: {orderSuccess.customerDetails.name}
              </span>
              <p className="leading-relaxed">
                {orderSuccess.customerDetails.address}, {orderSuccess.customerDetails.city} - {orderSuccess.customerDetails.pincode}
              </p>
            </div>
          )}

          {/* Lines summary */}
          {orderSuccess.lines && orderSuccess.lines.length > 0 && (
            <div className="border-t border-[#E2D7C6] pt-3">
              <span className="text-[11px] font-semibold text-[#756B5E] uppercase tracking-wider block mb-2">
                Items ({orderSuccess.lines.length})
              </span>
              <div className="max-h-36 overflow-y-auto divide-y divide-[#E2D7C6]/50 text-xs">
                {orderSuccess.lines.map((l, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between items-center text-[#292722]">
                    <span className="truncate pr-2">{l.name} × {l.qty}</span>
                    <span className="font-semibold text-[#183D2B] shrink-0">
                      ₹{((l.unit_price_paise * l.qty) / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          <button
            type="button"
            onClick={() => setOrderSuccess(null)}
            className="w-full py-3.5 rounded-full bg-[#183D2B] hover:bg-[#245C3A] text-white text-xs sm:text-sm font-semibold tracking-wide shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer mt-4"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4 text-[#A5C7AA]" />
          </button>

        </div>

      </div>
    </div>
  );
}
