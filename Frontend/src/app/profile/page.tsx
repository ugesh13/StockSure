'use client';

import React, { useEffect, useState } from 'react';
import DynamicIslandNavbar from '@/components/DynamicIslandNavbar';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { backend, Order, DeliveryTracking } from '@/lib/backend';
import {
  User,
  Sprout,
  Package,
  ShieldCheck,
  LogOut,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, openAuthModal } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedTracking, setSelectedTracking] = useState<DeliveryTracking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchOrders() {
      if (!user) {
        setLoadingOrders(false);
        return;
      }
      setLoadingOrders(true);
      try {
        const res = await backend.getOrders(20);
        if (active && res && res.orders) {
          setOrders(res.orders);
        }
      } catch (err) {
        console.error('Failed to load real customer orders', err);
      } finally {
        if (active) setLoadingOrders(false);
      }
    }
    fetchOrders();
    return () => {
      active = false;
    };
  }, [user]);

  const handleTrackOrder = async (orderId: string) => {
    setTrackingLoading(true);
    setSelectedTracking(null);
    try {
      const track = await backend.getOrderTracking(orderId);
      setSelectedTracking(track);
    } catch (err: any) {
      alert(err.message || 'Tracking details not yet available for this order.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancelLoading(orderId);
    try {
      await backend.cancelOrder(orderId);
      const res = await backend.getOrders(20);
      if (res.orders) setOrders(res.orders);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setCancelLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-darktext selection:bg-moss selection:text-cream">
      <DynamicIslandNavbar />
      <AuthModal />

      <main className="pt-32 pb-24 px-4 sm:px-8 max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 max-w-xl mx-auto pt-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-forest/70 font-mono">
            StockSure Customer Portal
          </span>
          <h1 className="editorial-serif text-4xl sm:text-5xl font-light text-forest">
            My Botanical Profile
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
                  {user?.name || 'StockSure Guest Shopper'}
                </h3>
                <p className="text-xs text-darktext/70">{user?.email || 'Sign in to sync order history'}</p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-forest/5 text-[10px] font-semibold text-moss mt-1">
                  <Sprout className="w-3 h-3" />
                  <span>{user?.is_guest ? 'Guest Session' : 'StockSure Member'}</span>
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-6 py-2.5 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700 transition-colors shadow-sm"
                >
                  Sign In
                </button>
                <a
                  href="/backend/auth/google"
                  className="px-4 py-2.5 rounded-button bg-white text-darktext border border-forest/20 text-xs font-semibold hover:bg-neutral-50 shadow-xs"
                >
                  Google Sign-In
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Real Backend Orders Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-forest" />
              <h2 className="editorial-serif text-2xl font-light text-forest">
                Real Order History
              </h2>
            </div>
            <span className="text-xs font-mono text-darktext/60">
              {orders.length} orders on file
            </span>
          </div>

          {loadingOrders ? (
            <div className="p-12 text-center rounded-[24px] bg-white/60 border border-forest/10 space-y-2">
              <Loader2 className="w-6 h-6 text-forest animate-spin mx-auto" />
              <p className="text-xs text-darktext/70">Fetching live orders from backend...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center rounded-[24px] bg-white/60 border border-forest/10 space-y-4">
              <p className="text-sm text-darktext/70">
                You have not placed any orders yet. Visit the shop to reserve acclimated plants!
              </p>
              <a
                href="/shop"
                className="inline-block px-6 py-2.5 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700 shadow-sm"
              >
                Browse Botanical Catalogue
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-6 rounded-[22px] bg-white/80 border border-forest/10 shadow-soft hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-forest/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-forest">
                          Order #{ord.id}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            ord.status === 'CONFIRMED' || ord.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-darktext/60 font-mono">
                        {new Date(ord.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} • Fulfillment: {ord.fulfilment}
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="font-serif text-lg font-bold text-forest block">
                        ₹{Math.round(ord.total_paise / 100)}
                      </span>
                      <span className="text-[11px] text-darktext/60">
                        {ord.lines?.length || 1} line item(s)
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      onClick={() => handleTrackOrder(ord.id)}
                      disabled={trackingLoading}
                      className="px-4 py-2 rounded-xl bg-forest/10 hover:bg-forest/15 text-forest text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Live Delivery Tracking</span>
                    </button>

                    {ord.status !== 'CANCELLED' && ord.status !== 'DELIVERED' && (
                      <button
                        onClick={() => handleCancelOrder(ord.id)}
                        disabled={cancelLoading === ord.id}
                        className="px-3.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {cancelLoading === ord.id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Tracking Modal View */}
        {selectedTracking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-[24px] p-6 shadow-2xl space-y-4 border border-forest/15">
              <div className="flex items-center justify-between border-b border-forest/10 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-forest" />
                  <h3 className="font-serif text-xl font-bold text-forest">
                    Live Dispatch Tracking
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTracking(null)}
                  className="p-1.5 rounded-full hover:bg-forest/5 text-forest"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-forest/5 font-semibold text-forest">
                  <span>Current Stage:</span>
                  <span className="uppercase font-mono">{selectedTracking.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-cream border border-forest/10">
                    <span className="text-[10px] uppercase font-bold text-darktext/60 block">Origin Branch</span>
                    <span className="font-semibold text-forest">{selectedTracking.branch?.name}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-cream border border-forest/10">
                    <span className="text-[10px] uppercase font-bold text-darktext/60 block">Estimated Transit</span>
                    <span className="font-semibold text-forest">~{selectedTracking.eta_minutes || 25} minutes</span>
                  </div>
                </div>

                {selectedTracking.handover_code && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center">
                    <span className="text-[11px] block">Show this code to delivery rider upon handover:</span>
                    <span className="text-xl font-mono font-bold tracking-widest">{selectedTracking.handover_code}</span>
                  </div>
                )}

                <div className="space-y-1 pt-2">
                  <span className="text-[11px] font-bold text-darktext uppercase tracking-wider block">
                    Transit Milestones:
                  </span>
                  <div className="space-y-1.5 border-l-2 border-forest/30 pl-3 ml-2">
                    {selectedTracking.history && selectedTracking.history.map((h, i) => (
                      <div key={i} className="text-[11px] text-darktext/80">
                        <span className="font-semibold">{h.status}</span>
                        {h.note && <span> — {h.note}</span>}
                        <span className="block text-[10px] text-darktext/50 font-mono">
                          {new Date(h.at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setSelectedTracking(null)}
                  className="px-5 py-2 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700"
                >
                  Close Tracking
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
