'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import GateEntry from './GateEntry';

export default function AuthModal() {
  const { isAuthModalOpen, authMode, closeAuthModal } = useAuth();

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#6c5d3b]">
      <GateEntry initialMode={authMode} onClose={closeAuthModal} />
    </div>
  );
}
