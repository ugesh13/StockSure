'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CartDrawer from '@/components/CartDrawer';
import CheckoutModal from '@/components/CheckoutModal';
import AuthModal from '@/components/AuthModal';
import { useCart } from '@/context/CartContext';

export default function GlobalCartAndModals() {
  const router = useRouter();
  const { isCheckoutOpen, setIsCheckoutOpen } = useCart();

  return (
    <>
      <CartDrawer
        onStartCheckout={() => setIsCheckoutOpen(true)}
        onExplore={() => router.push('/shop')}
      />
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={(order) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('stocksure:orders-changed', { detail: { id: order.id } }));
          }
        }}
      />
      <AuthModal />
    </>
  );
}
