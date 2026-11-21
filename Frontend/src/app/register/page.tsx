'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DynamicIslandNavbar from '@/components/DynamicIslandNavbar';
import AuthModal from '@/components/AuthModal';

export default function RegisterPage() {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/profile');
    } else {
      openAuthModal('register');
    }
  }, [user, router, openAuthModal]);

  return (
    <div className="min-h-screen bg-cream text-darktext flex flex-col justify-center items-center p-4">
      <DynamicIslandNavbar />
      <AuthModal />
      <div className="text-center space-y-3 pt-24">
        <h1 className="editorial-serif text-3xl font-light text-forest">
          Join StockSure
        </h1>
        <p className="text-xs text-darktext/70">
          Create an account to start ordering plants and tracking deliveries.
        </p>
      </div>
    </div>
  );
}
