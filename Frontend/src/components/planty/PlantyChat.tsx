'use client';

import React from 'react';
import './planty.css';
import Launcher from './Launcher';
import TeaserBubble from './TeaserBubble';
import ChatPanel from './ChatPanel';
import { usePlantyChat } from './usePlantyChat';
import QuickViewModal from '@/components/QuickViewModal';

export default function PlantyChat() {
  const {
    isOpen,
    isTeaserVisible,
    messages,
    inputValue,
    setInputValue,
    isTyping,
    hasUnread,
    suggestions,
    viewingProduct,
    setViewingProduct,
    openChat,
    closeChat,
    toggleChat,
    dismissTeaser,
    sendMessage,
    confirmAddToCart,
    cancelAddToCart,
    promptAddToCart,
  } = usePlantyChat();

  return (
    <div className="planty-root fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* 1. Teaser Speech Bubble (auto-pops after 4s) */}
      {isTeaserVisible && !isOpen && (
        <div className="pointer-events-auto">
          <TeaserBubble onOpenChat={openChat} onDismiss={dismissTeaser} />
        </div>
      )}

      {/* 2. Chat Panel (opened dialog) */}
      <div className="pointer-events-auto">
        <ChatPanel
          isOpen={isOpen}
          onClose={closeChat}
          onMinimize={closeChat}
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          isTyping={isTyping}
          suggestions={suggestions}
          onSendMessage={sendMessage}
          onSelectProduct={(prod) => setViewingProduct(prod)}
          onPromptAddToCart={promptAddToCart}
          onConfirmAddToCart={confirmAddToCart}
          onCancelAddToCart={cancelAddToCart}
          onViewOrder={() => {
            window.location.hash = '#shop';
          }}
        />
      </div>

      {/* 3. Floating Mascot Launcher */}
      <div className="pointer-events-auto mt-2">
        <Launcher isOpen={isOpen} hasUnread={hasUnread} onToggle={toggleChat} />
      </div>

      {/* 4. Quick View Modal for Selected Product */}
      {viewingProduct && (
        <div className="pointer-events-auto">
          <QuickViewModal
            product={viewingProduct}
            onClose={() => setViewingProduct(null)}
          />
        </div>
      )}
    </div>
  );
}
