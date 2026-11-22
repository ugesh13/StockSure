'use client';

import React from 'react';
import { PackageCheck, ArrowRight } from 'lucide-react';

interface OrderCardProps {
  orderId?: string;
  onViewOrder?: (orderId: string) => void;
}

export default function OrderCard({ orderId, onViewOrder }: OrderCardProps) {
  if (!orderId) return null;

  return (
    <div className="my-2 p-3.5 rounded-2xl bg-white border border-[var(--planty-card-border,#CFE0B5)] shadow-xs planty-msg-enter">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-[#2F6B1F]/15 text-[#2F6B1F] flex items-center justify-center">
          <PackageCheck className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-xs font-bold text-[var(--planty-body-text,#24391A)]">
            Order Tracking
          </div>
          <div className="text-[10px] text-[var(--planty-muted-text,#5E7650)] font-mono">
            {orderId.slice(0, 18)}...
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onViewOrder && onViewOrder(orderId)}
        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--planty-send-btn,#4C9A3A)] hover:bg-[var(--planty-send-btn-hover,#3E842E)] text-white text-xs font-semibold shadow-xs transition-transform active:scale-95"
      >
        <span>View Order</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
