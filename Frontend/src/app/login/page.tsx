'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DynamicIslandNavbar from '@/components/DynamicIslandNavbar';
import AuthModal from '@/components/AuthModal';

export default function LoginPage() {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/profile');
    } else {
      openAuthModal('login');
    }
  }, [user, router, openAuthModal]);

  return (
    <div className="min-h-screen bg-cream text-darktext flex flex-col justify-center items-center p-4">
      <DynamicIslandNavbar />
      <AuthModal />
      <div className="text-center space-y-3 pt-24">
        <h1 className="editorial-serif text-3xl font-light text-forest">
          StockSure Botanical Portal
        </h1>
        <p className="text-xs text-darktext/70">
          Sign in or create an account to manage your plant orders.
        </p>
      </div>
    </div>
  );
}
