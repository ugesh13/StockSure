'use client';

import React from 'react';
import { User } from 'lucide-react';
import PlantyAvatar from './PlantyAvatar';
import ProductCards from './ProductCards';
import QuoteCard from './QuoteCard';
import OrderCard from './OrderCard';
import ConfirmAddCard from './ConfirmAddCard';

interface MessageBubbleProps {
  message: {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    products?: any[];
    quote?: any;
    orderId?: string;
    confirmAdd?: any;
    navigatingTo?: string;
  };
  onSelectProduct?: (product: any) => void;
  onPromptAddToCart?: (product: any) => void;
  onConfirmAddToCart?: (item: any) => void;
  onCancelAddToCart?: () => void;
  onViewOrder?: (orderId: string) => void;
}

export default function MessageBubble({
  message,
  onSelectProduct,
  onPromptAddToCart,
  onConfirmAddToCart,
  onCancelAddToCart,
  onViewOrder,
}: MessageBubbleProps) {
  const isBot = message.sender === 'bot';

  if (!isBot) {
    return (
      <div className="flex justify-end items-end gap-2.5 my-2 planty-msg-enter">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[var(--planty-user-bubble,#D6E8BC)] px-4 py-2.5 text-[15px] leading-[1.45] text-[var(--planty-body-text,#24391A)] font-normal shadow-xs break-words">
          {message.text}
        </div>

        <div className="shrink-0 w-7 h-7 rounded-full bg-[#2F6B1F] text-white flex items-center justify-center mb-0.5 shadow-xs">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start my-2 planty-msg-enter">
      <div className="flex items-start gap-2.5 w-full">
        <div className="shrink-0 mt-0.5">
          <PlantyAvatar size={28} variant="head" />
        </div>

        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[var(--planty-bot-bubble,#E3EDD0)] px-4 py-2.5 text-[15px] leading-[1.45] text-[var(--planty-body-text,#24391A)] font-normal shadow-xs break-words whitespace-pre-line">
          {message.text}
        </div>
      </div>

      <div className="w-full pl-9 pr-2">
        {message.products && message.products.length > 0 && (
          <ProductCards
            products={message.products}
            onSelectProduct={onSelectProduct}
            onPromptAddToCart={onPromptAddToCart}
          />
        )}

        {message.quote && <QuoteCard quote={message.quote} />}

        {message.orderId && (
          <OrderCard orderId={message.orderId} onViewOrder={onViewOrder} />
        )}

        {message.confirmAdd && (
          <ConfirmAddCard
            item={message.confirmAdd}
            onConfirm={onConfirmAddToCart || (() => {})}
            onCancel={onCancelAddToCart || (() => {})}
          />
        )}

        {message.navigatingTo && (
          <div className="my-1 text-xs italic text-[var(--planty-muted-text,#5E7650)] flex items-center gap-1.5 animate-pulse">
            <span>🌿</span>
            <span>{message.navigatingTo}</span>
          </div>
        )}
      </div>
    </div>
  );
}
