'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sprout,
  Package,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Search,
  ExternalLink,
  ShoppingBag,
  Eye,
  User,
  Phone,
  Mail,
  MapPin,
  X,
  CreditCard,
} from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { Product } from '@/data/products';
import { Order } from '@/lib/db';
import { formatINR } from '@/lib/formatCurrency';

interface DashboardStats {
  totalVarieties: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockThreshold: number;
  lowStockPlants: Product[];
  outOfStockPlants: Product[];
  recentlyUpdated: Product[];
  recentlyAdded: Product[];
  timestamp?: string;
}

export default function AdminDashboardPage() {
  const { searchQuery, setSearchQuery, isRefreshing, setIsRefreshing, refreshSignal, setLastUpdated } =
    useAdmin();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch live dashboard statistics & real orders from the shared database
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const [dashRes, ordersRes] = await Promise.all([
        fetch('/api/admin/dashboard', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }),
        fetch('/api/admin/orders', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }),
      ]);

      if (!dashRes.ok) throw new Error(`Dashboard API responded with ${dashRes.status}`);
      const dashData = await dashRes.json();
      if (!dashData.success) throw new Error(dashData.message || 'Failed to load live stock data');

      setStats(dashData);

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.success && Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders);
        }
      }

      const nowStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastUpdated(nowStr);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message || 'Could not connect to shared database');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshSignal]);

  // Filter helper based on search query
  const matchesSearch = (p: Product) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.scientificName && p.scientificName.toLowerCase().includes(q)) ||
      (p.categoryLabel && p.categoryLabel.toLowerCase().includes(q)) ||
      p.id.toLowerCase().includes(q)
    );
  };

  // Filtered views
  const filteredLowStock = useMemo(() => {
    if (!stats) return [];
    return (stats.lowStockPlants || []).filter(matchesSearch);
  }, [stats, searchQuery]);

  const filteredRecentlyUpdated = useMemo(() => {
    if (!stats) return [];
    return (stats.recentlyUpdated || []).filter(matchesSearch);
  }, [stats, searchQuery]);

  const filteredRecentlyAdded = useMemo(() => {
    if (!stats) return [];
    return (stats.recentlyAdded || []).filter(matchesSearch);
  }, [stats, searchQuery]);

  const filteredRecentOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchQuery.trim()) return orders.slice(0, 5);
    const q = searchQuery.toLowerCase().trim();
    return orders
      .filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          (o.customerPhone && o.customerPhone.includes(q))
      )
      .slice(0, 5);
  }, [orders, searchQuery]);

  // Loading Skeleton State
  if (loading && !stats) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-28 rounded-2xl bg-white/70 border border-[#DCE7D8]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-white border border-[#DCE7D8] p-6 space-y-4 shadow-sm"
            >
              <div className="h-4 w-24 bg-[#DCE7D8]/60 rounded" />
              <div className="h-8 w-16 bg-[#173D2B]/10 rounded" />
              <div className="h-3 w-32 bg-[#DCE7D8]/40 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-2xl bg-white border border-[#DCE7D8] p-6 shadow-sm" />
          <div className="h-80 rounded-2xl bg-white border border-[#DCE7D8] p-6 shadow-sm" />
        </div>
      </div>
    );
  }

  // Error State
  if (error && !stats) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center rounded-2xl bg-white border border-red-200 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-serif text-[#173D2B] font-semibold">
          Database Connection Error
        </h2>
        <p className="text-sm text-stone-600">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchDashboardData();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-[#173D2B] hover:bg-[#24543A] transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Welcoming Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#173D2B] via-[#24543A] to-[#173D2B] text-white shadow-elevated">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-[#A8BFA0] font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Official CSV Catalog: plants.csv
              </span>
              <span className="text-xs text-white/60 hidden sm:inline">•</span>
              <span className="text-xs text-white/70 hidden sm:inline">
                Currency: Indian Rupees (₹)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-light text-white leading-tight">
              Verdant Nursery Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#DCE7D8]/80 font-light leading-relaxed">
              Real-time monitoring of all 53 plant varieties from project CSV, live inventory stock updates,
              and customer orders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/inventory"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#173D2B] hover:bg-[#DCE7D8] text-xs font-semibold shadow-sm transition-all"
            >
              <Package className="w-4 h-4 text-[#24543A]" />
              <span>Manage Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/admin/add-plant"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all"
            >
              <Sprout className="w-4 h-4 text-[#A8BFA0]" />
              <span>Add Plant</span>
            </Link>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      </div>

      {/* 2. Search Active Notice */}
      {searchQuery && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#DCE7D8]/40 border border-[#A8BFA0]/40 text-xs text-[#173D2B]">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#24543A]" />
            <span>
              Filtering dashboard by: <strong>&ldquo;{searchQuery}&rdquo;</strong>
            </span>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-medium text-[#24543A] hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* 3. Four Live Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Plant Varieties */}
        <Link
          href="/admin/inventory"
          className="relative p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft hover:shadow-elevated transition-all duration-300 group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider font-mono">
              Total Varieties
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#DCE7D8]/50 flex items-center justify-center text-[#24543A] group-hover:scale-105 transition-transform">
              <Sprout className="w-5 h-5 text-[#24543A]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-[#173D2B]">
              {stats?.totalVarieties ?? 0}
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8BFA0]"></span>
              <span>Loaded from plants.csv</span>
            </p>
          </div>
        </Link>

        {/* Card 2: Total Plants in Stock */}
        <Link
          href="/admin/inventory"
          className="relative p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft hover:shadow-elevated transition-all duration-300 group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider font-mono">
              Total Stock Units
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#24543A]/10 flex items-center justify-center text-[#24543A] group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5 text-[#24543A]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-[#173D2B]">
              {stats?.totalStock ?? 0}
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Live nursery units in DB</span>
            </p>
          </div>
        </Link>

        {/* Card 3: Low Stock Plants */}
        <Link
          href="/admin/inventory?status=low_stock"
          className={`relative p-6 rounded-2xl border shadow-soft hover:shadow-elevated transition-all duration-300 group block ${
            (stats?.lowStockCount ?? 0) > 0
              ? 'bg-amber-50/40 border-amber-200'
              : 'bg-white border-[#DCE7D8]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider font-mono">
              Low Stock Alert
            </span>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                (stats?.lowStockCount ?? 0) > 0
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#DCE7D8]/50 text-[#24543A]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div
              className={`text-3xl font-serif font-bold ${
                (stats?.lowStockCount ?? 0) > 0 ? 'text-amber-800' : 'text-[#173D2B]'
              }`}
            >
              {stats?.lowStockCount ?? 0}
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  (stats?.lowStockCount ?? 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              ></span>
              <span>≤ 10 units threshold</span>
            </p>
          </div>
        </Link>

        {/* Card 4: Out of Stock */}
        <Link
          href="/admin/inventory?status=out_of_stock"
          className={`relative p-6 rounded-2xl border shadow-soft hover:shadow-elevated transition-all duration-300 group block ${
            (stats?.outOfStockCount ?? 0) > 0
              ? 'bg-rose-50/40 border-rose-200'
              : 'bg-white border-[#DCE7D8]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider font-mono">
              Out of Stock
            </span>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                (stats?.outOfStockCount ?? 0) > 0
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {(stats?.outOfStockCount ?? 0) > 0 ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <div
              className={`text-3xl font-serif font-bold ${
                (stats?.outOfStockCount ?? 0) > 0 ? 'text-rose-800' : 'text-emerald-800'
              }`}
            >
              {stats?.outOfStockCount ?? 0}
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  (stats?.outOfStockCount ?? 0) > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              ></span>
              <span>
                {(stats?.outOfStockCount ?? 0) === 0
                  ? 'Zero stockouts currently'
                  : 'Requires restock'}
              </span>
            </p>
          </div>
        </Link>
      </div>

      {/* 4. RECENT ORDERS SECTION (Requirement 1) */}
      <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft space-y-5">
        <div className="flex items-center justify-between border-b border-[#DCE7D8] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#24543A]/10 text-[#24543A]">
              <ShoppingBag className="w-4 h-4 text-[#24543A]" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-semibold text-[#173D2B]">
                Recent Customer Orders
              </h2>
              <p className="text-xs text-stone-500">
                Live customer purchases from the shared database
              </p>
            </div>
          </div>

          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#DCE7D8] bg-[#F7F8F3] hover:bg-white text-xs font-semibold text-[#173D2B] transition-colors"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#24543A]" />
          </Link>
        </div>

        {/* Real Orders Table or Clean Empty State */}
        {filteredRecentOrders.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-semibold text-[#173D2B]">No orders available yet.</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Customer orders placed on the storefront checkout will automatically appear here with verified customer details, items, and totals.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#DCE7D8]/60 text-[11px] font-mono uppercase tracking-wider text-stone-500">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plants Ordered</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE7D8]/60">
                {filteredRecentOrders.map((order) => {
                  const dateObj = new Date(order.createdAt);
                  const formattedDateTime = `${dateObj.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}, ${dateObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`;
                  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr key={order.id} className="hover:bg-[#F7F8F3]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#173D2B]">
                        {order.id}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#173D2B]">{order.customerName}</p>
                        {order.customerPhone ? (
                          <p className="text-[11px] text-stone-500 font-mono">{order.customerPhone}</p>
                        ) : (
                          <p className="text-[11px] text-stone-400 font-mono">Phone: N/A</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="truncate max-w-xs text-stone-700">
                          {order.items.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-stone-600">
                        {totalQty}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#173D2B]">
                        {formatINR(order.total)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-500">
                        {formattedDateTime}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-2.5 py-1 rounded-lg border border-[#DCE7D8] bg-white hover:bg-[#F7F8F3] text-stone-700 text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-[#24543A]" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Detailed Sections: Low Stock Alerts + Recently Updated */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section A: Low Stock Alerts */}
        <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft space-y-5">
          <div className="flex items-center justify-between border-b border-[#DCE7D8] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100/70 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-semibold text-[#173D2B]">
                  Low Stock Alerts
                </h2>
                <p className="text-xs text-stone-500">
                  Varieties at or below 10 units threshold
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-100 text-amber-800">
              {filteredLowStock.length} items
            </span>
          </div>

          {filteredLowStock.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-sm font-medium text-[#173D2B]">All Stock Levels Healthy</p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                No plant varieties are currently below the 10-unit threshold.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#DCE7D8]/60 max-h-[420px] overflow-y-auto pr-1">
              {filteredLowStock.map((plant) => {
                const stockRatio = Math.min(100, Math.round((plant.stock / 10) * 100));
                return (
                  <div
                    key={plant.id}
                    className="py-3.5 flex items-center justify-between gap-4 group hover:bg-[#F7F8F3] px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#DCE7D8]">
                        <Image
                          src={plant.imageUrl}
                          alt={plant.name}
                          fill
                          sizes="48px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#173D2B] truncate">
                          {plant.name}
                        </p>
                        <p className="text-[11px] text-stone-500 italic truncate font-serif">
                          {plant.scientificName}
                        </p>
                        <span className="inline-block mt-0.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#DCE7D8]/60 text-[#24543A]">
                          {plant.categoryLabel}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs font-bold font-mono text-amber-800">
                          {plant.stock} left
                        </span>
                      </div>
                      <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${stockRatio}%` }}
                        />
                      </div>
                      <p className="text-[11px] font-semibold text-[#24543A]">
                        {formatINR(plant.price)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section B: Recently Updated Plants */}
        <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft space-y-5">
          <div className="flex items-center justify-between border-b border-[#DCE7D8] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#24543A]/10 text-[#24543A]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-semibold text-[#173D2B]">
                  Recently Updated Plants
                </h2>
                <p className="text-xs text-stone-500">
                  Inventory activity and stock adjustments
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-[#DCE7D8]/60 text-[#24543A]">
              {filteredRecentlyUpdated.length} entries
            </span>
          </div>

          {filteredRecentlyUpdated.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500">
              No updated plants matching criteria.
            </div>
          ) : (
            <div className="divide-y divide-[#DCE7D8]/60 max-h-[420px] overflow-y-auto pr-1">
              {filteredRecentlyUpdated.map((plant) => (
                <div
                  key={plant.id}
                  className="py-3.5 flex items-center justify-between gap-4 group hover:bg-[#F7F8F3] px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#DCE7D8]">
                      <Image
                        src={plant.imageUrl}
                        alt={plant.name}
                        fill
                        sizes="48px"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#173D2B] truncate">
                        {plant.name}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate font-mono">
                        {plant.categoryLabel}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        plant.stock <= 10
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#DCE7D8]/70 text-[#173D2B]'
                      }`}
                    >
                      {plant.stock} units
                    </span>
                    <p className="text-xs font-bold text-[#173D2B] mt-1">
                      {formatINR(plant.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. Section C: Recently Added Plants & Catalog Info */}
      <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft space-y-5">
        <div className="flex items-center justify-between border-b border-[#DCE7D8] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#24543A]/10 text-[#24543A]">
              <Sprout className="w-4 h-4 text-[#24543A]" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-semibold text-[#173D2B]">
                Catalog Specimens
              </h2>
              <p className="text-xs text-stone-500">
                Official nursery plants cataloged from plants.csv
              </p>
            </div>
          </div>
          <Link
            href="/admin/inventory"
            className="text-xs text-[#24543A] hover:underline font-semibold flex items-center gap-1"
          >
            <span>View all inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredRecentlyAdded.slice(0, 6).map((plant) => (
            <div
              key={plant.id}
              className="p-3.5 rounded-xl border border-[#DCE7D8] bg-[#F7F8F3]/60 flex items-center gap-3 group hover:border-[#A8BFA0] hover:bg-white transition-all"
            >
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#DCE7D8]">
                <Image
                  src={plant.imageUrl}
                  alt={plant.name}
                  fill
                  sizes="56px"
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#173D2B] truncate">{plant.name}</p>
                <p className="text-[11px] text-stone-500 italic truncate font-serif">
                  {plant.scientificName}
                </p>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-stone-200/60">
                  <span className="text-[11px] font-mono text-[#24543A] font-semibold">
                    {formatINR(plant.price)}
                  </span>
                  <span className="text-[10px] font-mono font-medium text-stone-600 bg-white px-1.5 py-0.5 rounded border border-[#DCE7D8]">
                    {plant.stock} units
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ORDER DETAILS MODAL (from Recent Orders) */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-elevated border border-[#DCE7D8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#DCE7D8] flex items-center justify-between bg-[#F7F8F3]/60">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#24543A]" />
                <div>
                  <h3 className="text-base font-serif font-bold text-[#173D2B]">
                    Order #{selectedOrder.id}
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Customer info */}
              <div className="p-3.5 rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] space-y-1">
                <p className="font-bold text-[#173D2B]">{selectedOrder.customerName}</p>
                <p className="text-stone-600">{selectedOrder.customerEmail}</p>
                {selectedOrder.customerPhone ? (
                  <p className="text-stone-600">Phone: {selectedOrder.customerPhone}</p>
                ) : (
                  <p className="text-stone-400 italic">Phone: N/A</p>
                )}
                <p className="text-stone-500 pt-1 text-[11px]">
                  Shipping to: {selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.city}
                </p>
              </div>

              {/* Items */}
              <div className="divide-y divide-[#DCE7D8]/60 border border-[#DCE7D8] rounded-xl overflow-hidden">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-100 border shrink-0">
                        <Image src={item.imageUrl} alt={item.name} fill sizes="40px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#173D2B] truncate">{item.name}</p>
                        <p className="text-[11px] text-stone-500">{formatINR(item.price)} × {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[#173D2B]">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between font-bold text-sm text-[#173D2B] pt-2 border-t border-[#DCE7D8]">
                <span>Total Amount Paid:</span>
                <span className="font-mono">{formatINR(selectedOrder.total)}</span>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-[#F7F8F3]/60 border-t border-[#DCE7D8] flex items-center justify-between">
              <Link
                href="/admin/orders"
                className="text-xs font-semibold text-[#24543A] hover:underline"
              >
                Go to Orders Management →
              </Link>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#173D2B] text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
