'use client';

import React from 'react';
import { Leaf, ShoppingCart, HelpCircle, Sparkles } from 'lucide-react';

interface QuickChipsProps {
  suggestions?: string[];
  onSelectChip?: (text: string) => void;
  disabled?: boolean;
}

export default function QuickChips({ suggestions = [], onSelectChip, disabled = false }: QuickChipsProps) {
  const defaultChips = [
    { label: 'Plant Care Tips', icon: Leaf },
    { label: 'Track My Order', icon: ShoppingCart },
    { label: 'More Help', icon: HelpCircle },
  ];

  const chipsToRender = [...defaultChips];
  if (Array.isArray(suggestions)) {
    suggestions.forEach((text) => {
      if (text && !chipsToRender.some((c) => c.label.toLowerCase() === text.toLowerCase())) {
        chipsToRender.push({ label: text, icon: Sparkles });
      }
    });
  }

  return (
    <div className="w-full px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar planty-scroll select-none">
      {chipsToRender.map((chip, idx) => {
        const IconComponent = chip.icon || Sparkles;
        return (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectChip && onSelectChip(chip.label)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--planty-chip-bg,#F1F6E6)] border border-[var(--planty-chip-border,#CFE0B5)] text-[var(--planty-chip-text,#2F4A22)] hover:bg-[var(--planty-chip-hover,#E3ECD0)] transition-all shadow-xs active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <IconComponent className="w-3.5 h-3.5 text-[#2F6B1F] shrink-0" />
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
