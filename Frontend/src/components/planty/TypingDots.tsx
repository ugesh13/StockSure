'use client';

import React from 'react';
import PlantyAvatar from './PlantyAvatar';

export default function TypingDots() {
  return (
    <div className="flex items-end gap-2.5 my-2 planty-msg-enter">
      <div className="shrink-0 mb-1">
        <PlantyAvatar size={28} variant="head" />
      </div>

      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--planty-bot-bubble,#E3EDD0)] border border-[var(--planty-card-border,#CFE0B5)]/60 shadow-xs flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#2F6B1F] planty-dot" />
        <span className="w-2 h-2 rounded-full bg-[#2F6B1F] planty-dot" />
        <span className="w-2 h-2 rounded-full bg-[#2F6B1F] planty-dot" />
      </div>
    </div>
  );
}
