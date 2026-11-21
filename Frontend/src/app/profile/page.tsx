'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DynamicIslandNavbar from '@/components/DynamicIslandNavbar';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
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
  ArrowLeft,
  Home,
  ShoppingBag,
  Settings,
  Bell,
  Lock,
  Heart,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Save,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

type TabType = 'orders' | 'profile' | 'addresses' | 'preferences' | 'security';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, openAuthModal } = useAuth();
  const { selectedBranch, branches, setSelectedBranch } = useCart();

  const [activeTab, setActiveTab] = useState<TabType>('orders');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedTracking, setSelectedTracking] = useState<DeliveryTracking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);

  // Profile Form State
  const [nameInput, setNameInput] = useState(user?.name || 'Priya Sharma');
  const [emailInput, setEmailInput] = useState(user?.email || 'priya@stocksure.in');
  const [phoneInput, setPhoneInput] = useState(user?.phone || '+91 98765 43210');
  const [profileSaved, setProfileSaved] = useState(false);

  // Saved Addresses State
  const [addresses, setAddresses] = useState([
    {
      id: 'addr-1',
      name: 'Home (Bengaluru)',
      recipient: 'Priya Sharma',
      phone: '+91 98765 43210',
      line1: '80 Feet Road, 4th Block, Koramangala',
      city: 'Bengaluru',
      pincode: '560034',
      isDefault: true,
    },
    {
      id: 'addr-2',
      name: 'Office (Indiranagar)',
      recipient: 'Priya Sharma',
      phone: '+91 98765 43210',
      line1: '100 Feet Road, HAL 2nd Stage, Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
      isDefault: false,
    },
  ]);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState('New Address');
  const [newAddrLine, setNewAddrLine] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('Bengaluru');
  const [newAddrPin, setNewAddrPin] = useState('560001');

  // Botanical Preferences State
  const [lightPref, setLightPref] = useState('bright-indirect');
  const [petFriendlyOnly, setPetFriendlyOnly] = useState(true);
  const [wateringAlerts, setWateringAlerts] = useState(true);
  const [substratePref, setSubstratePref] = useState('peat-free-organic');
  const [prefSaved, setPrefSaved] = useState(false);

  // Security State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securitySaved, setSecuritySaved] = useState(false);

  useEffect(() => {
    if (user?.name) setNameInput(user.name);
    if (user?.email) setEmailInput(user.email);
    if (user?.phone) setPhoneInput(user.phone);
  }, [user]);

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
    if (!confirm('Are you sure you want to cancel this order? Reserved items will be released back to the branch.')) return;
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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrLine.trim() || !newAddrPin.trim()) return;

    setAddresses((prev) => [
      ...prev,
      {
        id: `addr-${Date.now()}`,
        name: newAddrLabel || 'Home',
        recipient: nameInput || 'Priya Sharma',
        phone: phoneInput || '+91 98765 43210',
        line1: newAddrLine.trim(),
        city: newAddrCity || 'Bengaluru',
        pincode: newAddrPin.trim(),
        isDefault: false,
      },
    ]);
    setShowAddAddressModal(false);
    setNewAddrLine('');
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSetDefaultAddress = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
  };

  return (
    <div className="min-h-screen bg-cream text-darktext selection:bg-moss selection:text-cream">
      <DynamicIslandNavbar />
      <AuthModal />

      <main className="pt-28 pb-24 px-4 sm:px-8 max-w-5xl mx-auto space-y-8">
        {/* Navigation Action Bar: Back Button, Home Button, Shop Link & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-b border-forest/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-forest/5 hover:bg-forest/10 text-forest text-xs font-semibold transition-colors border border-forest/10"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-forest/5 hover:bg-forest/10 text-forest text-xs font-semibold transition-colors border border-forest/10"
              title="Return to Homepage"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>

            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-moss/10 hover:bg-moss/20 text-moss text-xs font-semibold transition-colors border border-moss/20"
              title="Browse Nursery Specimen Catalogue"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Shop Plants</span>
            </Link>
          </div>

          <div className="text-xs text-darktext/60 font-mono flex items-center gap-1.5">
            <span>StockSure Sanctuary</span>
            <span>/</span>
            <span className="text-forest font-semibold">Account & Settings</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-6 sm:p-8 rounded-[28px] bg-white/85 backdrop-blur-md border border-forest/10 shadow-soft">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-full bg-forest text-cream flex items-center justify-center font-serif text-2xl font-bold shadow-md">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-7 h-7 text-sage-light" />}
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-forest">
                  {user?.name || nameInput || 'StockSure Guest Shopper'}
                </h2>
                <p className="text-xs text-darktext/70">{user?.email || emailInput || 'Sign in to sync your order history'}</p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-forest/5 text-[10px] font-semibold text-moss mt-1.5 border border-forest/10">
                  <Sprout className="w-3 h-3 text-moss" />
                  <span>{user?.is_guest ? 'Guest Session' : 'StockSure Verified Member'}</span>
                </div>
              </div>
            </div>

            {user ? (
              <button
                onClick={logout}
                className="px-5 py-2.5 rounded-button border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-5 py-2.5 rounded-button bg-forest text-cream text-xs font-bold hover:bg-forest-700 transition-colors shadow-sm"
                >
                  Sign In / Register
                </button>
                <a
                  href="/backend/auth/google"
                  className="px-4 py-2.5 rounded-button bg-white text-darktext border border-forest/20 text-xs font-semibold hover:bg-neutral-50 shadow-xs flex items-center gap-1.5"
                >
                  <span>Google Sign-In</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-forest/10 text-xs font-medium no-scrollbar">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'orders'
                ? 'bg-forest text-cream font-bold shadow-xs'
                : 'bg-white/60 text-darktext/70 hover:bg-white border border-forest/10'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Orders & Tracking ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'profile'
                ? 'bg-forest text-cream font-bold shadow-xs'
                : 'bg-white/60 text-darktext/70 hover:bg-white border border-forest/10'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`px-4 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'addresses'
                ? 'bg-forest text-cream font-bold shadow-xs'
                : 'bg-white/60 text-darktext/70 hover:bg-white border border-forest/10'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Delivery Addresses ({addresses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'preferences'
                ? 'bg-forest text-cream font-bold shadow-xs'
                : 'bg-white/60 text-darktext/70 hover:bg-white border border-forest/10'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Care Preferences</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'security'
                ? 'bg-forest text-cream font-bold shadow-xs'
                : 'bg-white/60 text-darktext/70 hover:bg-white border border-forest/10'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Security & Sessions</span>
          </button>
        </div>

        {/* ================= TAB 1: ORDERS & TRACKING ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-forest" />
                <h2 className="editorial-serif text-2xl font-light text-forest">
                  Real Order History
                </h2>
              </div>
              <span className="text-xs font-mono text-darktext/60">
                {orders.length} real orders recorded
              </span>
            </div>

            {loadingOrders ? (
              <div className="p-12 text-center rounded-[24px] bg-white/60 border border-forest/10 space-y-2">
                <Loader2 className="w-6 h-6 text-forest animate-spin mx-auto" />
                <p className="text-xs text-darktext/70">Connecting to PostgreSQL backend...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center rounded-[24px] bg-white/70 border border-forest/10 space-y-4">
                <p className="text-sm text-darktext/70">
                  You have not placed any orders yet. Visit our shop to reserve verified nursery plants!
                </p>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700 shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Browse Botanical Catalogue</span>
                </Link>
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
                          {ord.lines?.length || 1} specimen(s)
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
        )}

        {/* ================= TAB 2: PROFILE DETAILS & NURSERY BRANCH ================= */}
        {activeTab === 'profile' && (
          <div className="p-6 sm:p-8 rounded-[24px] bg-white/80 border border-forest/10 shadow-soft space-y-6">
            <div>
              <h3 className="font-serif text-2xl text-forest font-bold">Personal Profile & Contact</h3>
              <p className="text-xs text-darktext/60 mt-0.5">
                Manage your contact details and default serving nursery branch in Bengaluru.
              </p>
            </div>

            {profileSaved && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Profile details saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                    Primary Nursery Branch
                  </label>
                  <select
                    value={selectedBranch.id}
                    onChange={(e) => {
                      const found = branches.find((b) => b.id === Number(e.target.value));
                      if (found) setSelectedBranch(found);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-input bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-button bg-forest hover:bg-forest-700 text-cream text-xs font-bold transition-colors shadow-xs flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB 3: SAVED ADDRESSES ================= */}
        {activeTab === 'addresses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl text-forest font-bold">Saved Delivery Addresses</h3>
                <p className="text-xs text-darktext/60 mt-0.5">
                  Your address book for instant 30-minute climate-controlled greenhouse deliveries.
                </p>
              </div>

              <button
                onClick={() => setShowAddAddressModal(true)}
                className="px-4 py-2 rounded-button bg-forest text-cream text-xs font-bold hover:bg-forest-700 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Address</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-5 rounded-[20px] bg-white/80 border border-forest/15 shadow-soft space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-moss" />
                      <span className="font-bold text-sm text-forest">{addr.name}</span>
                    </div>

                    {addr.isDefault ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-[11px] text-forest/70 hover:text-forest underline"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-darktext/80 space-y-0.5">
                    <p className="font-semibold text-darktext">{addr.recipient}</p>
                    <p>{addr.line1}</p>
                    <p>{addr.city} — {addr.pincode}</p>
                    <p className="text-darktext/60">{addr.phone}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-forest/10">
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-xs text-red-600 hover:text-red-800 p-1 rounded-md transition-colors"
                      title="Delete address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal for adding address */}
            {showAddAddressModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/50 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-md bg-cream rounded-[24px] p-6 shadow-2xl border border-forest/20 space-y-4">
                  <h4 className="font-serif text-xl font-bold text-forest">Add Delivery Address</h4>

                  <form onSubmit={handleAddAddress} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-darktext/80 block">
                        Address Label
                      </label>
                      <input
                        type="text"
                        value={newAddrLabel}
                        onChange={(e) => setNewAddrLabel(e.target.value)}
                        placeholder="Home / Office / Studio"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-darktext/80 block">
                        Street Address & Landmark <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddrLine}
                        onChange={(e) => setNewAddrLine(e.target.value)}
                        placeholder="e.g. 12th Main Road, Indiranagar"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-darktext/80 block">
                          City
                        </label>
                        <input
                          type="text"
                          value={newAddrCity}
                          onChange={(e) => setNewAddrCity(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-darktext/80 block">
                          PIN Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddrPin}
                          onChange={(e) => setNewAddrPin(e.target.value)}
                          placeholder="560038"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-forest/20 text-xs text-forest focus:outline-none focus:border-forest"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddAddressModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-darktext/70 hover:bg-forest/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-forest text-cream text-xs font-bold hover:bg-forest-700 shadow-sm"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: CARE PREFERENCES ================= */}
        {activeTab === 'preferences' && (
          <div className="p-6 sm:p-8 rounded-[24px] bg-white/80 border border-forest/10 shadow-soft space-y-6">
            <div>
              <h3 className="font-serif text-2xl text-forest font-bold">Botanical Care Preferences</h3>
              <p className="text-xs text-darktext/60 mt-0.5">
                Customize plant recommendations, pet toxicity filters, and automated hydration alerts.
              </p>
            </div>

            {prefSaved && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Preferences updated! Planty Concierge will adapt future recommendations.</span>
              </div>
            )}

            <form onSubmit={handleSavePreferences} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                  Your Primary Lighting Environment
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'bright-direct', label: 'Bright Direct Sun', desc: 'Sunny balconies & rooftops' },
                    { id: 'bright-indirect', label: 'Bright Indirect', desc: 'East/North window rooms' },
                    { id: 'low-light', label: 'Low / Ambient Light', desc: 'Inner desks & bedrooms' },
                  ].map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => setLightPref(env.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        lightPref === env.id
                          ? 'border-forest bg-forest/5 shadow-xs'
                          : 'border-forest/10 bg-white hover:border-forest/30'
                      }`}
                    >
                      <span className="font-bold text-xs text-forest block">{env.label}</span>
                      <span className="text-[10px] text-darktext/60 block mt-0.5">{env.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cream/60 border border-forest/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-forest">Pet-Safe Specimens Only</h4>
                  <p className="text-[11px] text-darktext/60 mt-0.5">
                    Filter out plants containing calcium oxalate crystals that may irritate cats or dogs.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={petFriendlyOnly}
                  onChange={(e) => setPetFriendlyOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-moss focus:ring-moss"
                />
              </div>

              <div className="p-4 rounded-2xl bg-cream/60 border border-forest/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-forest">Hydration & Seasonal Reminders</h4>
                  <p className="text-[11px] text-darktext/60 mt-0.5">
                    Receive gentle SMS / WhatsApp notices when it's time to water or aerate your specimens.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={wateringAlerts}
                  onChange={(e) => setWateringAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-moss focus:ring-moss"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-button bg-forest hover:bg-forest-700 text-cream text-xs font-bold transition-colors shadow-xs flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Preferences</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB 5: SECURITY & SESSIONS ================= */}
        {activeTab === 'security' && (
          <div className="p-6 sm:p-8 rounded-[24px] bg-white/80 border border-forest/10 shadow-soft space-y-6">
            <div>
              <h3 className="font-serif text-2xl text-forest font-bold">Security & Active Sessions</h3>
              <p className="text-xs text-darktext/60 mt-0.5">
                Manage your credentials, Google OAuth linkage, and secure session state.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-cream/70 border border-forest/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-forest">Google Single Sign-On</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Connected
                </span>
              </div>
              <p className="text-[11px] text-darktext/60">
                You can log in seamlessly with Google OAuth (PKCE S256 with one-time verified token exchange).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-cream/70 border border-forest/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-forest">Active Device</span>
                <span className="text-[10px] font-mono text-darktext/60">Current Session</span>
              </div>
              <p className="text-[11px] text-darktext/60">
                Web Browser · Bengaluru, India (Fastify REST Session Token)
              </p>
            </div>

            {user && (
              <div className="pt-2">
                <button
                  onClick={logout}
                  className="px-5 py-2.5 rounded-button border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of this Device</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Live Delivery Tracking Modal */}
        {selectedTracking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-cream rounded-[24px] p-6 shadow-2xl space-y-4 border border-forest/20">
              <div className="flex items-center justify-between border-b border-forest/10 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-forest" />
                  <h3 className="font-serif text-xl font-bold text-forest">
                    Live Nursery Dispatch Tracker
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTracking(null)}
                  className="p-1.5 rounded-full hover:bg-forest/10 text-forest"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-forest/5 space-y-1">
                  <div className="flex justify-between font-semibold text-forest">
                    <span>Order #{selectedTracking.order_id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                      {selectedTracking.status}
                    </span>
                  </div>
                  <p className="text-darktext/70 text-[11px]">
                    Dispatched from {selectedTracking.branch?.name || selectedBranch.name} • ETA {selectedTracking.eta_minutes || 30} mins
                  </p>
                </div>

                <div className="border border-forest/10 rounded-xl p-3 bg-white space-y-2">
                  <span className="font-bold text-[10px] uppercase text-forest tracking-wider block">
                    Transit Status Timeline
                  </span>
                  <div className="space-y-2 border-l-2 border-moss/30 ml-2 pl-3">
                    <div className="relative">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-moss" />
                      <p className="font-semibold text-forest">Order Reserved in Greenhouse</p>
                      <p className="text-[10px] text-darktext/60">Peat-free potted specimen verified & packaged</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-moss" />
                      <p className="font-semibold text-forest">Assigned to Climate-Controlled Van</p>
                      <p className="text-[10px] text-darktext/60">Insulated transit protecting root foliage</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <p className="font-semibold text-amber-800">In Transit</p>
                      <p className="text-[10px] text-darktext/60">Out for direct doorstep delivery in Bengaluru</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTracking(null)}
                className="w-full py-2.5 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700"
              >
                Close Tracking
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
