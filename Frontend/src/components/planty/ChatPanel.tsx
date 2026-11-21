'use client';

import React, { useRef, useEffect } from 'react';
import { Minus, X, Send } from 'lucide-react';
import MessageBubble from './MessageBubble';
import QuickChips from './QuickChips';
import TypingDots from './TypingDots';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  messages: any[];
  inputValue: string;
  setInputValue: (val: string) => void;
  isTyping: boolean;
  suggestions: string[];
  onSendMessage: (msg: string) => void;
  onSelectProduct: (prod: any) => void;
  onPromptAddToCart: (prod: any) => void;
  onConfirmAddToCart: (item: any) => void;
  onCancelAddToCart: () => void;
  onViewOrder: (orderId: string) => void;
}

export default function ChatPanel({
  isOpen,
  onClose,
  onMinimize,
  messages,
  inputValue,
  setInputValue,
  isTyping,
  suggestions,
  onSendMessage,
  onSelectProduct,
  onPromptAddToCart,
  onConfirmAddToCart,
  onCancelAddToCart,
  onViewOrder,
}: ChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    onSendMessage(inputValue);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Planty Botanical Assistant Chat"
      className="planty-panel-enter w-[92vw] sm:w-[410px] md:w-[430px] h-[580px] max-h-[82vh] rounded-[28px] bg-[var(--planty-panel-bg,#F5F9EA)] border-2 border-[var(--planty-panel-border,rgba(47,107,31,0.15))] shadow-[0_20px_50px_rgba(47,107,31,0.22)] flex flex-col overflow-hidden mb-3 select-none"
    >
      {/* Header */}
      <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-[var(--planty-header-start,#2F6B1F)] to-[var(--planty-header-end,#4C8B2B)] text-white flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center p-1 border border-white/25">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
              <path d="M12 21C12 15 15 12 20 10C20 16 17 20 12 21Z" fill="currentColor" />
              <path d="M12 21C12 16 8 13 4 15C4 20 7 21 12 21Z" fill="currentColor" opacity="0.85" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight tracking-wide">Planty</h3>
            <p className="text-[11px] text-[var(--planty-header-subtext,rgba(255,255,255,0.88))] leading-none">
              Your Plant Guide
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMinimize}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Minimize"
            aria-label="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-3 planty-scroll space-y-1">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onSelectProduct={onSelectProduct}
            onPromptAddToCart={onPromptAddToCart}
            onConfirmAddToCart={onConfirmAddToCart}
            onCancelAddToCart={onCancelAddToCart}
            onViewOrder={onViewOrder}
          />
        ))}

        {isTyping && <TypingDots />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="shrink-0 border-t border-[var(--planty-card-border,#CFE0B5)]/40 bg-[var(--planty-panel-bg,#F5F9EA)]">
        <QuickChips
          suggestions={suggestions}
          onSelectChip={(chip) => onSendMessage(chip)}
          disabled={isTyping}
        />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 p-3 bg-white/70 backdrop-blur-md border-t border-[var(--planty-card-border,#CFE0B5)]/60 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          maxLength={500}
          placeholder="Type your message..."
          className="flex-1 py-2.5 px-4 rounded-full bg-white border border-[var(--planty-card-border,#CFE0B5)] text-xs text-[var(--planty-body-text,#24391A)] placeholder:text-[var(--planty-muted-text,#5E7650)] focus:outline-none focus:border-[var(--planty-send-btn,#4C9A3A)] shadow-inner"
        />

        <button
          type="submit"
          disabled={!inputValue.trim() || isTyping}
          aria-label="Send message"
          className="w-9 h-9 rounded-full bg-[var(--planty-send-btn,#4C9A3A)] hover:bg-[var(--planty-send-btn-hover,#3E842E)] text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 shadow-xs"
        >
          <Send className="w-4 h-4 -translate-x-0.5" />
        </button>
      </form>
    </div>
  );
}
