'use client';

import React from 'react';
import { ShoppingCart, X, Check } from 'lucide-react';
import { formatPaiseToInr } from './actions';

interface ConfirmAddCardProps {
  item?: {
    product_id: number | string;
    name: string;
    price_paise?: number;
    price_rupees?: number;
    qty?: number;
  };
  onConfirm: (item: any) => void;
  onCancel: () => void;
}

export default function ConfirmAddCard({ item, onConfirm, onCancel }: ConfirmAddCardProps) {
  if (!item) return null;

  const qty = item.qty || 1;
  const name = item.name || 'Plant';
  const priceFormatted = item.price_paise
    ? formatPaiseToInr(item.price_paise * qty)
    : item.price_rupees
    ? `₹${item.price_rupees * qty}`
    : '';

  return (
    <div className="my-2 p-3.5 rounded-2xl bg-white border-2 border-[var(--planty-card-border,#CFE0B5)] shadow-sm planty-msg-enter">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-[#2F6B1F]/15 flex items-center justify-center text-[#2F6B1F]">
          <ShoppingCart className="w-3.5 h-3.5" />
        </div>
        <div className="text-xs font-bold text-[var(--planty-body-text,#24391A)]">
          Add to Cart Confirmation
        </div>
      </div>

      <p className="text-xs text-[var(--planty-body-text,#24391A)] mb-3 leading-relaxed">
        Add <strong>{qty} × {name}</strong> to your shopping cart?
        {priceFormatted && (
          <span className="block text-[11px] text-[var(--planty-muted-text,#5E7650)] mt-0.5 font-medium">
            Total: {priceFormatted}
          </span>
        )}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onConfirm(item)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--planty-send-btn,#4C9A3A)] hover:bg-[var(--planty-send-btn-hover,#3E842E)] text-white text-xs font-semibold shadow-xs transition-transform active:scale-95"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-[#E2D7C6]/50 hover:bg-[#E2D7C6] text-[var(--planty-body-text,#24391A)] text-xs font-medium transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
}
