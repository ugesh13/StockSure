'use client';

import React from 'react';
import { X } from 'lucide-react';
import PlantyAvatar from './PlantyAvatar';

interface TeaserBubbleProps {
  onOpenChat: () => void;
  onDismiss: () => void;
}

export default function TeaserBubble({ onOpenChat, onDismiss }: TeaserBubbleProps) {
  return (
    <aside
      aria-label="Planty chat teaser"
      onClick={onOpenChat}
      className="cursor-pointer group select-none relative mb-3 mr-1"
    >
      <div className="relative flex items-center gap-3 p-3.5 pr-8 rounded-3xl bg-[var(--planty-panel-bg,#F5F9EA)] border-2 border-[var(--planty-card-border,#CFE0B5)] shadow-[0_12px_32px_rgba(47,107,31,0.18)] max-w-[270px] sm:max-w-[300px] transition-transform duration-200 hover:-translate-y-1">
        <div className="shrink-0">
          <PlantyAvatar size={42} variant="head" />
        </div>

        <div className="text-left">
          <div className="flex items-center gap-1 text-xs font-black text-[#2F6B1F]">
            <span>Hi! 👏 I&apos;m Planty!</span>
          </div>
          <p className="text-xs text-[var(--planty-body-text,#24391A)] font-medium leading-snug mt-0.5">
            How can I help you today?
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-[var(--planty-muted-text,#5E7650)] hover:text-[var(--planty-body-text,#24391A)] hover:bg-black/5 transition-colors"
          title="Dismiss greeting"
          aria-label="Dismiss greeting"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[var(--planty-panel-bg,#F5F9EA)] border-r-2 border-b-2 border-[var(--planty-card-border,#CFE0B5)] rotate-45" />
      </div>
    </aside>
  );
}
