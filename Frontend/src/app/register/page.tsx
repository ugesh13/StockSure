'use client';

import React, { Suspense } from 'react';
import GateEntry from '@/components/GateEntry';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#6c5d3b] flex items-center justify-center text-cream">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs uppercase tracking-widest font-semibold">Opening StockSure Sanctuary...</span>
          </div>
        </div>
      }
    >
      <GateEntry initialMode="register" />
    </Suspense>
  );
}
