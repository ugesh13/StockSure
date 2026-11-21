'use client';

import React from 'react';
import DynamicIslandNavbar from '@/components/DynamicIslandNavbar';
import { useAuth } from '@/context/AuthContext';
import { User, Sprout, Package, ShieldCheck, Heart, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, openAuthModal } = useAuth();

  return (
    <div className="min-h-screen bg-cream text-darktext selection:bg-moss selection:text-cream">
      <DynamicIslandNavbar />

      <main className="pt-32 pb-24 px-4 sm:px-8 max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 max-w-xl mx-auto pt-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-forest/70 font-mono">
            Botanical Sanctuary Membership
          </span>
          <h1 className="editorial-serif text-5xl font-light text-forest">
            My Plant Sanctuary
          </h1>
        </div>

        {/* User Card */}
        <div className="p-8 rounded-[28px] bg-white/80 backdrop-blur-md border border-forest/10 shadow-soft">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-full bg-forest text-cream flex items-center justify-center font-serif text-2xl font-bold shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-7 h-7 text-sage-light" />}
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-forest">
                  {user?.name || 'Sanctuary Connoisseur'}
                </h3>
                <p className="text-xs text-darktext/70">{user?.email || 'guest@verdant-sanctuary.com'}</p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-forest/5 text-[10px] font-semibold text-moss mt-1">
                  <Sprout className="w-3 h-3" />
                  <span>Member Since 2026</span>
                </div>
              </div>
            </div>

            {user ? (
              <button
                onClick={logout}
                className="px-5 py-2.5 rounded-button border border-forest/20 text-xs font-semibold text-forest hover:bg-forest/5 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="px-6 py-2.5 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700 transition-colors shadow-sm"
              >
                Sign In to Sanctuary
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Tabs / Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-[24px] bg-white/70 backdrop-blur-sm border border-forest/10 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-50 flex items-center justify-center text-forest">
              <Sprout className="w-5 h-5 text-moss" />
            </div>
            <h4 className="font-serif text-lg font-bold text-forest">My Living Plants</h4>
            <p className="text-xs text-darktext/70">
              Track watering schedules and acclimation status for your specimens.
            </p>
          </div>

          <div className="p-6 rounded-[24px] bg-white/70 backdrop-blur-sm border border-forest/10 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-50 flex items-center justify-center text-forest">
              <Package className="w-5 h-5 text-moss" />
            </div>
            <h4 className="font-serif text-lg font-bold text-forest">Order Shipments</h4>
            <p className="text-xs text-darktext/70">
              Real-time climate-controlled tracking for all outbound botanicals.
            </p>
          </div>

          <div className="p-6 rounded-[24px] bg-white/70 backdrop-blur-sm border border-forest/10 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-50 flex items-center justify-center text-forest">
              <ShieldCheck className="w-5 h-5 text-moss" />
            </div>
            <h4 className="font-serif text-lg font-bold text-forest">Horticultural Warranty</h4>
            <p className="text-xs text-darktext/70">
              30-day health guarantee verified on all delivered plants.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
