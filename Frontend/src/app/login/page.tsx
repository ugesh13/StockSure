'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

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
    <div className="min-h-screen bg-[#4f6b5a] text-darktext flex flex-col justify-center items-center p-4">
      <div className="text-center space-y-3 pt-24">
        <h1 className="editorial-serif text-3xl font-light text-cream">
          StockSure Botanical Portal
        </h1>
        <p className="text-xs text-cream/70">
          Sign in or create an account to manage your plant orders.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="px-4 py-2 rounded-full bg-cream text-forest text-xs font-semibold"
          >
            Open sign in
          </button>
          <Link href="/" className="px-4 py-2 rounded-full border border-cream/40 text-cream text-xs font-semibold">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
