'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package,
  PlusCircle,
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Edit3,
  SlidersHorizontal,
  X,
  Plus,
  Minus,
  Check,
  Sprout,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Product, CATEGORIES } from '@/data/products';
import { useAdmin } from '@/context/AdminContext';

interface InventoryStats {
  totalVarieties: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function AdminInventoryPage() {
  const { searchQuery, setSearchQuery } = useAdmin();

  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Sorting
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // all, in_stock, low_stock, out_of_stock
  const [sortBy, setSortBy] = useState<string>('name-asc'); // name-asc, name-desc, price-asc, price-desc, stock-asc, stock-desc

  // Modal States
  const [updateStockProduct, setUpdateStockProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'reduce'>('add');
  const [adjustmentQty, setAdjustmentQty] = useState<number>(5);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('New nursery delivery / Restock');
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const [viewDetailsProduct, setViewDetailsProduct] = useState<Product | null>(null);

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editDimensions, setEditDimensions] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Inventory from DB
  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/inventory', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to load inventory');

      setProducts(data.products || []);
      setStats({
        totalVarieties: data.stats?.totalVarieties ?? data.products?.length ?? 0,
        totalStock: data.stats?.totalStock ?? 0,
        lowStockCount: data.stats?.lowStockCount ?? 0,
        outOfStockCount: data.stats?.outOfStockCount ?? 0,
      });
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
      setError(err.message || 'Could not connect to shared database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.scientificName?.toLowerCase().includes(q) ||
          p.categoryLabel?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Stock status filter
    if (selectedStatus === 'in_stock') {
      result = result.filter((p) => p.stock > 10);
    } else if (selectedStatus === 'low_stock') {
      result = result.filter((p) => p.stock > 0 && p.stock <= 10);
    } else if (selectedStatus === 'out_of_stock') {
      result = result.filter((p) => p.stock === 0);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'stock-asc') return a.stock - b.stock;
      if (sortBy === 'stock-desc') return b.stock - a.stock;
      return 0;
    });

    return result;
  }, [products, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Handle Save Stock Update
  const handleSaveStockUpdate = async () => {
    if (!updateStockProduct) return;
    if (adjustmentQty <= 0 || isNaN(adjustmentQty)) {
      alert('Please enter a positive quantity');
      return;
    }

    if (adjustmentType === 'reduce' && adjustmentQty > updateStockProduct.stock) {
      alert(`Cannot reduce by ${adjustmentQty}. Only ${updateStockProduct.stock} in stock.`);
      return;
    }

    try {
      setIsUpdatingStock(true);
      const res = await fetch('/api/admin/inventory/update-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: updateStockProduct.id,
          adjustmentType,
          quantity: adjustmentQty,
          reason: adjustmentReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update stock');
      }

      // Update local state immediately
      setProducts((prev) =>
        prev.map((p) => (p.id === data.product.id ? data.product : p))
      );

      if (data.stats) {
        setStats({
          totalVarieties: data.stats.totalVarieties,
          totalStock: data.stats.totalStock,
          lowStockCount: data.stats.lowStockCount,
          outOfStockCount: data.stats.outOfStockCount,
        });
      }

      showToast(`Stock updated! ${data.product.name} is now ${data.product.stock} units.`);
      setUpdateStockProduct(null);
    } catch (err: any) {
      alert(err.message || 'Error updating stock');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  // Handle Edit Plant Details
  const handleSaveEditDetails = async () => {
    if (!editProduct) return;
    try {
      setIsEditing(true);
      const res = await fetch('/api/admin/inventory/edit-plant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editProduct.id,
          updates: {
            price: Number(editPrice),
            description: editDescription,
            dimensions: editDimensions,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update plant details');
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === data.product.id ? data.product : p))
      );

      showToast(`Details updated for ${data.product.name}!`);
      setEditProduct(null);
    } catch (err: any) {
      alert(err.message || 'Error updating plant details');
    } finally {
      setIsEditing(false);
    }
  };

  // Calculate new preview stock
  const calculatedNewStock = updateStockProduct
    ? adjustmentType === 'add'
      ? updateStockProduct.stock + (Number(adjustmentQty) || 0)
      : updateStockProduct.stock - (Number(adjustmentQty) || 0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#173D2B] text-white shadow-elevated border border-[#A8BFA0]/30 animate-fade-in text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#24543A] font-semibold">
            Nursery Stock Management
          </span>
          <h1 className="text-3xl font-serif text-[#173D2B] font-bold">Inventory</h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Manage your plants and keep track of nursery stock.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#DCE7D8] bg-white text-[#173D2B] hover:bg-[#F7F8F3] transition-all shadow-sm"
            title="Refresh inventory"
          >
            <RefreshCw className={`w-4 h-4 text-[#24543A] ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/admin/add-plant"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm hover:shadow transition-all group"
            style={{ backgroundColor: '#173D2B' }}
          >
            <PlusCircle className="w-4 h-4 text-[#A8BFA0] group-hover:scale-110 transition-transform" />
            <span>Add Plant</span>
          </Link>
        </div>
      </div>

      {/* Live Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase tracking-wider">
            <span>Total Varieties</span>
            <Sprout className="w-4 h-4 text-[#24543A]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#173D2B] mt-3">
            {stats?.totalVarieties ?? 0}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Unique catalog specimens</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase tracking-wider">
            <span>Total Units</span>
            <Package className="w-4 h-4 text-[#24543A]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#173D2B] mt-3">
            {stats?.totalStock ?? 0}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Available for purchase</span>
          </p>
        </div>

        <div
          className={`p-6 rounded-2xl border shadow-soft ${
            (stats?.lowStockCount ?? 0) > 0
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-white border-[#DCE7D8]'
          }`}
        >
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase tracking-wider">
            <span>Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div
            className={`text-3xl font-serif font-bold mt-3 ${
              (stats?.lowStockCount ?? 0) > 0 ? 'text-amber-800' : 'text-[#173D2B]'
            }`}
          >
            {stats?.lowStockCount ?? 0}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">≤ 10 units remaining</p>
        </div>

        <div
          className={`p-6 rounded-2xl border shadow-soft ${
            (stats?.outOfStockCount ?? 0) > 0
              ? 'bg-rose-50/50 border-rose-200'
              : 'bg-white border-[#DCE7D8]'
          }`}
        >
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase tracking-wider">
            <span>Out of Stock</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div
            className={`text-3xl font-serif font-bold mt-3 ${
              (stats?.outOfStockCount ?? 0) > 0 ? 'text-rose-800' : 'text-[#173D2B]'
            }`}
          >
            {stats?.outOfStockCount ?? 0}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {(stats?.outOfStockCount ?? 0) === 0 ? 'Zero inventory shortages' : 'Requires restock'}
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#24543A]/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by plant name, scientific name, or SKU..."
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

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500 font-mono hidden sm:inline">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500 font-mono hidden sm:inline">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
              >
                <option value="all">All Statuses</option>
                <option value="in_stock">In Stock (&gt; 10)</option>
                <option value="low_stock">Low Stock (≤ 10)</option>
                <option value="out_of_stock">Out of Stock (0)</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500 font-mono hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="stock-desc">Stock (Highest)</option>
                <option value="stock-asc">Stock (Lowest)</option>
                <option value="price-desc">Price (Highest)</option>
                <option value="price-asc">Price (Lowest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(selectedCategory !== 'all' || selectedStatus !== 'all' || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#DCE7D8]/60 text-xs text-stone-600">
            <span>Showing {filteredProducts.length} of {products.length} plants</span>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-[#24543A] hover:underline ml-2"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Inventory Table (Desktop/Tablet) and Cards (Mobile) */}
      <div className="rounded-2xl bg-white border border-[#DCE7D8] shadow-soft overflow-hidden">
        {/* Loading state */}
        {loading && (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#24543A] mx-auto" />
            <p className="text-xs text-stone-500 font-mono">Loading live inventory records...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredProducts.length === 0 && (
          <div className="p-16 text-center space-y-3">
            <Package className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-base font-serif font-semibold text-[#173D2B]">
              No Plants Found
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No inventory records match your search or filter criteria. Try resetting filters.
            </p>
          </div>
        )}

        {/* Desktop / Tablet Table */}
        {!loading && filteredProducts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE7D8] bg-[#F7F8F3]/60 text-[11px] font-mono uppercase tracking-wider text-stone-500">
                  <th className="py-4 px-6">Plant</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">SKU</th>
                  <th className="py-4 px-4 text-right">Price</th>
                  <th className="py-4 px-4 text-center">Stock</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE7D8]/60 text-xs">
                {filteredProducts.map((plant) => {
                  const isOutOfStock = plant.stock === 0;
                  const isLowStock = plant.stock > 0 && plant.stock <= 10;
                  const sku = plant.sku || `VRD-${plant.id.slice(0, 6).toUpperCase()}`;

                  return (
                    <tr
                      key={plant.id}
                      className="hover:bg-[#F7F8F3]/50 transition-colors group"
                    >
                      {/* Plant Image & Name */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#DCE7D8]">
                            <Image
                              src={plant.imageUrl}
                              alt={plant.name}
                              fill
                              sizes="48px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <p className="font-semibold text-[#173D2B] truncate">{plant.name}</p>
                            <p className="text-[11px] text-stone-500 italic truncate font-serif">
                              {plant.scientificName}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#DCE7D8]/60 text-[#24543A] font-medium whitespace-nowrap">
                          {plant.categoryLabel}
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                        {sku}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-semibold font-mono text-[#173D2B] whitespace-nowrap">
                        ${plant.price.toFixed(2)}
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isOutOfStock
                              ? 'text-rose-700'
                              : isLowStock
                              ? 'text-amber-800'
                              : 'text-[#173D2B]'
                          }`}
                        >
                          {plant.stock} units
                        </span>
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-rose-100 text-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-amber-100 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Update Stock Button */}
                          <button
                            onClick={() => {
                              setUpdateStockProduct(plant);
                              setAdjustmentType('add');
                              setAdjustmentQty(5);
                              setAdjustmentReason('New nursery delivery / Restock');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#24543A] hover:bg-[#173D2B] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                            title="Update inventory quantity"
                          >
                            <ArrowUpDown className="w-3 h-3 text-[#A8BFA0]" />
                            <span>Update Stock</span>
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => setViewDetailsProduct(plant)}
                            className="p-1.5 rounded-lg border border-[#DCE7D8] text-stone-600 hover:text-[#173D2B] hover:bg-white transition-colors"
                            title="View plant specifications"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Plant */}
                          <button
                            onClick={() => {
                              setEditProduct(plant);
                              setEditPrice(plant.price);
                              setEditDescription(plant.description);
                              setEditDimensions(plant.dimensions);
                            }}
                            className="p-1.5 rounded-lg border border-[#DCE7D8] text-stone-600 hover:text-[#173D2B] hover:bg-white transition-colors"
                            title="Edit plant description & price"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. UPDATE STOCK MODAL */}
      {/* ========================================================================= */}
      {updateStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-elevated border border-[#DCE7D8] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#DCE7D8] flex items-center justify-between bg-[#F7F8F3]/60">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 border border-[#DCE7D8] shrink-0">
                  <Image
                    src={updateStockProduct.imageUrl}
                    alt={updateStockProduct.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#173D2B]">
                    Update Stock: {updateStockProduct.name}
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    Current Quantity: <strong>{updateStockProduct.stock} units</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setUpdateStockProduct(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Adjustment Type Tabs */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F7F8F3] border border-[#DCE7D8]">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                      adjustmentType === 'add'
                        ? 'bg-[#173D2B] text-white shadow-sm'
                        : 'text-stone-600 hover:text-[#173D2B]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Stock (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentType('reduce')}
                    className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                      adjustmentType === 'reduce'
                        ? 'bg-[#173D2B] text-white shadow-sm'
                        : 'text-stone-600 hover:text-[#173D2B]'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Reduce Stock (-)</span>
                  </button>
                </div>
              </div>

              {/* Quantity Input + Stepper */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentQty((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl border border-[#DCE7D8] bg-[#F7F8F3] hover:bg-white flex items-center justify-center text-stone-700 font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={adjustmentQty}
                    onChange={(e) => setAdjustmentQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center py-2 text-base font-bold font-mono rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustmentQty((prev) => prev + 1)}
                    className="w-10 h-10 rounded-xl border border-[#DCE7D8] bg-[#F7F8F3] hover:bg-white flex items-center justify-center text-stone-700 font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Quick chip buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-stone-500">Quick:</span>
                  {[1, 5, 10, 20].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAdjustmentQty(n)}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#DCE7D8]/50 hover:bg-[#DCE7D8] text-[#173D2B]"
                    >
                      {adjustmentType === 'add' ? `+${n}` : `-${n}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated New Quantity Preview Box */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                  calculatedNewStock < 0
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-[#DCE7D8]/40 border-[#A8BFA0]/40 text-[#173D2B]'
                }`}
              >
                <div>
                  <span className="font-mono text-[11px] text-stone-500">Calculated New Stock:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-semibold">{updateStockProduct.stock}</span>
                    <span>{adjustmentType === 'add' ? '+' : '-'}</span>
                    <span className="font-mono font-semibold">{adjustmentQty}</span>
                    <span>=</span>
                    <span className="font-mono font-bold text-sm">
                      {calculatedNewStock} units
                    </span>
                  </div>
                </div>

                {calculatedNewStock < 0 ? (
                  <span className="px-2 py-1 rounded bg-rose-200 text-rose-900 font-mono text-[10px] font-semibold">
                    Negative Stock Blocked
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Valid Quantity
                  </span>
                )}
              </div>

              {/* Reason Selector */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 mb-1.5">
                  Adjustment Reason
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
                >
                  <option value="New nursery delivery / Restock">New nursery delivery / Restock</option>
                  <option value="Damaged / Dead plant write-off">Damaged / Dead plant write-off</option>
                  <option value="Physical inventory count correction">Physical inventory count correction</option>
                  <option value="Offline counter sale deduction">Offline counter sale deduction</option>
                  <option value="Customer return / Re-potting">Customer return / Re-potting</option>
                  <option value="Internal greenhouse transfer">Internal greenhouse transfer</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#F7F8F3]/60 border-t border-[#DCE7D8] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUpdateStockProduct(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#DCE7D8] text-stone-600 hover:bg-white transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isUpdatingStock || calculatedNewStock < 0}
                onClick={handleSaveStockUpdate}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#173D2B] hover:bg-[#24543A] text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUpdatingStock && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Stock Update</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW DETAILS MODAL */}
      {/* ========================================================================= */}
      {viewDetailsProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-elevated border border-[#DCE7D8] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-[#DCE7D8] flex items-center justify-between bg-[#F7F8F3]/60 shrink-0">
              <div className="flex items-center gap-3">
                <Sprout className="w-5 h-5 text-[#24543A]" />
                <h3 className="text-base font-serif font-bold text-[#173D2B]">
                  Plant Details: {viewDetailsProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setViewDetailsProduct(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="relative w-full sm:w-48 h-56 rounded-2xl overflow-hidden bg-stone-100 border border-[#DCE7D8] shrink-0">
                  <Image
                    src={viewDetailsProduct.imageUrl}
                    alt={viewDetailsProduct.name}
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                </div>

                <div className="space-y-3 flex-1 min-w-0">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#24543A] px-2 py-0.5 rounded bg-[#DCE7D8]/60">
                      {viewDetailsProduct.categoryLabel}
                    </span>
                    <h2 className="text-2xl font-serif font-bold text-[#173D2B] mt-1.5">
                      {viewDetailsProduct.name}
                    </h2>
                    <p className="text-xs text-stone-500 italic font-serif">
                      {viewDetailsProduct.scientificName}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 py-2 border-y border-[#DCE7D8]/60">
                    <div>
                      <span className="text-[10px] font-mono text-stone-500 uppercase">Selling Price</span>
                      <p className="text-base font-bold font-mono text-[#173D2B]">
                        ${viewDetailsProduct.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="border-l border-[#DCE7D8]/60 pl-4">
                      <span className="text-[10px] font-mono text-stone-500 uppercase">Current Stock</span>
                      <p className="text-base font-bold font-mono text-emerald-800">
                        {viewDetailsProduct.stock} units
                      </p>
                    </div>
                    <div className="border-l border-[#DCE7D8]/60 pl-4">
                      <span className="text-[10px] font-mono text-stone-500 uppercase">SKU</span>
                      <p className="text-xs font-mono font-medium text-stone-600">
                        {viewDetailsProduct.sku || `VRD-${viewDetailsProduct.id.slice(0, 6).toUpperCase()}`}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed font-light">
                    {viewDetailsProduct.description}
                  </p>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[#F7F8F3] border border-[#DCE7D8]">
                  <span className="text-[10px] font-mono text-stone-500 uppercase">Light</span>
                  <p className="text-xs font-semibold text-[#173D2B] mt-0.5 truncate">{viewDetailsProduct.light}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F3] border border-[#DCE7D8]">
                  <span className="text-[10px] font-mono text-stone-500 uppercase">Water</span>
                  <p className="text-xs font-semibold text-[#173D2B] mt-0.5 truncate">{viewDetailsProduct.water}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F3] border border-[#DCE7D8]">
                  <span className="text-[10px] font-mono text-stone-500 uppercase">Difficulty</span>
                  <p className="text-xs font-semibold text-[#173D2B] mt-0.5 truncate">{viewDetailsProduct.difficulty}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F3] border border-[#DCE7D8]">
                  <span className="text-[10px] font-mono text-stone-500 uppercase">Pet Friendly</span>
                  <p className="text-xs font-semibold text-[#173D2B] mt-0.5">
                    {viewDetailsProduct.petFriendly ? 'Yes (Safe)' : 'No (Toxic)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F7F8F3]/60 border-t border-[#DCE7D8] flex items-center justify-end shrink-0">
              <button
                onClick={() => setViewDetailsProduct(null)}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#173D2B] text-white hover:bg-[#24543A]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EDIT PLANT DETAILS MODAL */}
      {/* ========================================================================= */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-elevated border border-[#DCE7D8] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#DCE7D8] flex items-center justify-between bg-[#F7F8F3]/60">
              <h3 className="text-base font-serif font-bold text-[#173D2B]">
                Edit Plant: {editProduct.name}
              </h3>
              <button
                onClick={() => setEditProduct(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Selling Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] font-mono focus:outline-none focus:border-[#24543A]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Dimensions / Pot Specification
                </label>
                <input
                  type="text"
                  value={editDimensions}
                  onChange={(e) => setEditDimensions(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                ℹ️ Stock quantity is protected and modified separately via the <strong>Update Stock</strong> action to ensure accurate audit tracking.
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F7F8F3]/60 border-t border-[#DCE7D8] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditProduct(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#DCE7D8] text-stone-600 hover:bg-white"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isEditing}
                onClick={handleSaveEditDetails}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#173D2B] hover:bg-[#24543A] text-white shadow-sm flex items-center gap-2"
              >
                {isEditing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
