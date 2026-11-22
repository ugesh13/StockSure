'use client';

import React from 'react';
import { Truck, Clock, MapPin, AlertCircle } from 'lucide-react';
import { formatPaiseToInr } from './actions';

interface QuoteCardProps {
  quote?: {
    fee_paise?: number;
    distance_km?: number;
    eta_minutes?: number;
    branch_name?: string;
    reason?: string;
    serviceable?: boolean;
  };
}

export default function QuoteCard({ quote }: QuoteCardProps) {
  if (!quote) return null;

  const isFree = quote.fee_paise === 0;
  const feeDisplay = isFree ? 'FREE Delivery' : formatPaiseToInr(quote.fee_paise);
  const distanceKm = quote.distance_km ? `${quote.distance_km} km` : 'Local branch';
  const etaMins = quote.eta_minutes ? `~${quote.eta_minutes} mins` : 'Within 45 mins';

  return (
    <div className="my-2 p-3.5 rounded-2xl bg-white border border-[var(--planty-card-border,#CFE0B5)] shadow-xs planty-msg-enter">
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-black/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#2F6B1F]/15 text-[#2F6B1F] flex items-center justify-center">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--planty-body-text,#24391A)]">
              Delivery Estimate
            </div>
            {quote.branch_name && (
              <div className="text-[10px] text-[var(--planty-muted-text,#5E7650)]">
                from {quote.branch_name}
              </div>
            )}
          </div>
        </div>

        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            isFree ? 'bg-[#2F6B1F]/15 text-[#2F6B1F]' : 'bg-black/5 text-[var(--planty-body-text,#24391A)]'
          }`}
        >
          {feeDisplay}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--planty-body-text,#24391A)]">
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[var(--planty-card-bg,#E6F0D4)]/60">
          <MapPin className="w-3.5 h-3.5 text-[#2F6B1F]" />
          <div>
            <div className="text-[10px] text-[var(--planty-muted-text,#5E7650)]">Distance</div>
            <div className="font-semibold text-xs">{distanceKm}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[var(--planty-card-bg,#E6F0D4)]/60">
          <Clock className="w-3.5 h-3.5 text-[#2F6B1F]" />
          <div>
            <div className="text-[10px] text-[var(--planty-muted-text,#5E7650)]">Arrival Time</div>
            <div className="font-semibold text-xs">{etaMins}</div>
          </div>
        </div>
      </div>

      {quote.reason && !quote.serviceable && (
        <div className="mt-2 text-[11px] text-amber-800 flex items-center gap-1 bg-amber-50 p-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>{quote.reason}</span>
        </div>
      )}
    </div>
  );
}
