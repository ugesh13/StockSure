'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  History,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Filter,
  Calendar,
  X,
  Package,
  Sprout,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { StockLog } from '@/lib/db';
import { Product } from '@/data/products';

interface HistorySummary {
  totalMovements: number;
  totalAdded: number;
  totalReduced: number;
}

export default function AdminStockHistoryPage() {
  const { searchQuery, setSearchQuery } = useAdmin();

  const [history, setHistory] = useState<StockLog[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [summary, setSummary] = useState<HistorySummary>({
    totalMovements: 0,
    totalAdded: 0,
    totalReduced: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all'); // all, added, reduced
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  // Fetch History and Product lookup from DB
  const fetchStockHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const [histRes, prodRes] = await Promise.all([
        fetch('/api/admin/stock-history', { cache: 'no-store' }),
        fetch('/api/admin/inventory', { cache: 'no-store' }),
      ]);

      if (!histRes.ok) throw new Error(`HTTP ${histRes.status} on history`);
      const histData = await histRes.json();
      if (!histData.success) throw new Error(histData.message);

      setHistory(histData.history || []);
      setSummary(
        histData.summary || {
          totalMovements: 0,
          totalAdded: 0,
          totalReduced: 0,
        }
      );

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.success && Array.isArray(prodData.products)) {
          const map: Record<string, Product> = {};
          prodData.products.forEach((p: Product) => {
            map[p.id] = p;
          });
          setProductsMap(map);
        }
      }
    } catch (err: any) {
      console.error('Failed to load stock history:', err);
      setError(err.message || 'Could not connect to shared database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockHistory();
  }, []);

  // Filtered History
  const filteredHistory = useMemo(() => {
    let result = [...history];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (h) =>
          h.productName.toLowerCase().includes(q) ||
          h.productId.toLowerCase().includes(q) ||
          (h.reason && h.reason.toLowerCase().includes(q))
      );
    }

    if (typeFilter === 'added') {
      result = result.filter((h) => h.change > 0);
    } else if (typeFilter === 'reduced') {
      result = result.filter((h) => h.change < 0);
    }

    if (reasonFilter !== 'all') {
      result = result.filter((h) => h.type === reasonFilter);
    }

    return result;
  }, [history, searchQuery, typeFilter, reasonFilter]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#24543A] font-semibold">
            Audit Trail & Logs
          </span>
          <h1 className="text-3xl font-serif text-[#173D2B] font-bold">Stock History</h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Track every inventory movement in your nursery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStockHistory}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#DCE7D8] bg-white text-[#173D2B] hover:bg-[#F7F8F3] transition-all shadow-sm"
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 text-[#24543A] ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/admin/inventory"
            className="px-4 py-2.5 rounded-xl border border-[#DCE7D8] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F7F8F3] shadow-sm transition-all"
          >
            Back to Inventory
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Movements */}
        <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase tracking-wider">
            <span>Total Stock Movements</span>
            <History className="w-4 h-4 text-[#24543A]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#173D2B] mt-3">
            {summary.totalMovements}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Audit log records stored in DB</p>
        </div>

        {/* Stock Added */}
        <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase tracking-wider">
            <span>Stock Added</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold text-emerald-800 mt-3">
            +{summary.totalAdded}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">Units received or restocked</p>
        </div>

        {/* Stock Reduced */}
        <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase tracking-wider">
            <span>Stock Reduced</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold text-amber-800 mt-3">
            -{summary.totalReduced}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Orders, counter sales & damages</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#24543A]/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plant name, reason, or SKU..."
              className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] placeholder-[#24543A]/40 focus:outline-none focus:ring-2 focus:ring-[#24543A]/20 focus:border-[#24543A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Added / Reduced Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500 font-mono hidden sm:inline">Movement:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
              >
                <option value="all">All Movements</option>
                <option value="added">Added Only (+)</option>
                <option value="reduced">Reduced Only (-)</option>
              </select>
            </div>

            {/* Reason Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500 font-mono hidden sm:inline">Reason Type:</span>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
              >
                <option value="all">All Reason Types</option>
                <option value="addition">Addition / Restock</option>
                <option value="reduction">Reduction / Write-off</option>
                <option value="order_deduction">Customer Order</option>
                <option value="manual_adjustment">Manual Adjustment</option>
                <option value="initial_stock">Initial Stock</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl bg-white border border-[#DCE7D8] shadow-soft overflow-hidden">
        {loading && (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#24543A] mx-auto" />
            <p className="text-xs text-stone-500 font-mono">Loading stock audit logs...</p>
          </div>
        )}

        {!loading && filteredHistory.length === 0 && (
          <div className="p-16 text-center space-y-3">
            <History className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-base font-serif font-semibold text-[#173D2B]">
              No Stock Movement Records
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Any stock adjustment from the Inventory page, plant addition, or customer checkout will automatically appear here.
            </p>
          </div>
        )}

        {!loading && filteredHistory.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE7D8] bg-[#F7F8F3]/60 text-[11px] font-mono uppercase tracking-wider text-stone-500">
                  <th className="py-4 px-6">Plant</th>
                  <th className="py-4 px-4 text-center">Previous</th>
                  <th className="py-4 px-4 text-center">Change</th>
                  <th className="py-4 px-4 text-center">New Stock</th>
                  <th className="py-4 px-4">Reason</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-6 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE7D8]/60 text-xs">
                {filteredHistory.map((log) => {
                  const product = productsMap[log.productId];
                  const isPositive = log.change > 0;
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#F7F8F3]/50 transition-colors"
                    >
                      {/* Plant Image & Name */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#DCE7D8]">
                            {product?.imageUrl ? (
                              <Image
                                src={product.imageUrl}
                                alt={log.productName}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400">
                                <Sprout className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#173D2B]">{log.productName}</p>
                            <p className="text-[10px] font-mono text-stone-500">
                              SKU: {product?.sku || `VRD-${log.productId.slice(0, 6).toUpperCase()}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Previous Stock */}
                      <td className="py-3.5 px-4 text-center font-mono text-stone-600">
                        {log.previousStock}
                      </td>

                      {/* Quantity Change */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold text-xs ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-amber-600" />
                          )}
                          <span>
                            {isPositive ? `+${log.change}` : log.change}
                          </span>
                        </span>
                      </td>

                      {/* New Quantity */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#173D2B]">
                        {log.newStock}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 text-stone-700 font-medium">
                        {log.reason || 'Inventory Adjustment'}
                      </td>

                      {/* Movement Type Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            log.type === 'order_deduction'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {log.type.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-6 text-right font-mono text-[11px] text-stone-500 whitespace-nowrap">
                        <div>{formattedDate}</div>
                        <div className="text-[10px] text-stone-400">{formattedTime}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
