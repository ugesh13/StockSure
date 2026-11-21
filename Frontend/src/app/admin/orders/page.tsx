'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
  X,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  User,
  ArrowRight,
} from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { Order } from '@/lib/db';

interface OrdersSummary {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export default function AdminOrdersPage() {
  const { searchQuery, setSearchQuery } = useAdmin();

  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrdersSummary>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Modals & Actions
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch orders from DB
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setOrders(data.orders || []);
      setSummary(
        data.summary || {
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
        }
      );
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      setError(err.message || 'Could not load orders from shared database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update Order Status in Database
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setIsUpdatingStatus(orderId);
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update order status');
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? data.order : o))
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(data.order);
      }

      showToast(`Order #${orderId} marked as "${newStatus}"`);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Error updating order status');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          (o.customerPhone && o.customerPhone.includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      result = result.filter((o) => (o.paymentStatus || 'paid') === paymentFilter);
    }

    return result;
  }, [orders, searchQuery, statusFilter, paymentFilter]);

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        );
      case 'in_transit':
      case 'processing':
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-blue-100 text-blue-800">
            <Truck className="w-3 h-3 text-blue-600" />
            {status === 'in_transit' ? 'In Transit' : 'Processing'}
          </span>
        );
      case 'confirmed':
      case 'preparing':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending / Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 text-rose-600" />
            Cancelled (Restocked)
          </span>
        );
      default:
        return (
          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-mono bg-stone-100 text-stone-700">
            {status}
          </span>
        );
    }
  };

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
            Order Fulfillment
          </span>
          <h1 className="text-3xl font-serif text-[#173D2B] font-bold">Orders</h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            View customer orders and manage their fulfillment status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#DCE7D8] bg-white text-[#173D2B] hover:bg-[#F7F8F3] transition-all shadow-sm"
            title="Refresh orders"
          >
            <RefreshCw className={`w-4 h-4 text-[#24543A] ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/shop"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl border border-[#DCE7D8] bg-white text-xs font-semibold text-[#173D2B] hover:bg-[#F7F8F3] shadow-sm transition-all"
          >
            Test Customer Store ↗
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase tracking-wider">
            <span>Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-[#24543A]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#173D2B] mt-3">
            {summary.totalOrders}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Total customer purchases recorded</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase tracking-wider">
            <span>Pending Orders</span>
            <div className="p-1 rounded bg-amber-100 text-amber-800">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold text-amber-800 mt-3">
            {summary.pendingOrders}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Awaiting packing or courier dispatch</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase tracking-wider">
            <span>Completed Orders</span>
            <div className="p-1 rounded bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-serif font-bold text-emerald-800 mt-3">
            {summary.completedOrders}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">Delivered to customers</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#24543A]/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, order ID (VRD-...), email..."
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500 font-mono hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered / Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500 font-mono hidden sm:inline">Payment:</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-white border border-[#DCE7D8] shadow-soft overflow-hidden">
        {loading && (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#24543A] mx-auto" />
            <p className="text-xs text-stone-500 font-mono">Loading real customer orders...</p>
          </div>
        )}

        {!loading && filteredOrders.length === 0 && (
          <div className="p-16 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-base font-serif font-semibold text-[#173D2B]">
              No Orders Found
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Customer orders placed on the public storefront will automatically be logged here with live items, amounts, and address details.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#173D2B] text-white hover:bg-[#24543A]"
              >
                <span>Place Test Order on Shop</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {!loading && filteredOrders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE7D8] bg-[#F7F8F3]/60 text-[11px] font-mono uppercase tracking-wider text-stone-500">
                  <th className="py-4 px-6">Order ID</th>
                  <th className="py-4 px-4">Customer</th>
                  <th className="py-4 px-4">Products</th>
                  <th className="py-4 px-4 text-center">Items</th>
                  <th className="py-4 px-4 text-right">Total</th>
                  <th className="py-4 px-4 text-center">Payment</th>
                  <th className="py-4 px-4">Date</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE7D8]/60 text-xs">
                {filteredOrders.map((order) => {
                  const dateObj = new Date(order.createdAt);
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                  const totalUnits = order.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#F7F8F3]/50 transition-colors"
                    >
                      {/* Order ID */}
                      <td className="py-3.5 px-6 font-mono font-bold text-[#173D2B] whitespace-nowrap">
                        {order.id}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#173D2B] truncate">{order.customerName}</p>
                        <p className="text-[11px] text-stone-500 truncate">{order.customerEmail}</p>
                      </td>

                      {/* Products Thumbnail Strip */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center -space-x-2">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <div
                              key={idx}
                              className="relative w-8 h-8 rounded-lg overflow-hidden border-2 border-white shadow-sm bg-stone-100"
                              title={`${item.name} (${item.quantity}x)`}
                            >
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="w-8 h-8 rounded-lg bg-[#DCE7D8] text-[#173D2B] font-mono text-[10px] font-bold flex items-center justify-center border-2 border-white">
                              +{order.items.length - 3}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Items */}
                      <td className="py-3.5 px-4 text-center font-mono text-stone-700">
                        {totalUnits}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#173D2B] whitespace-nowrap">
                        ${order.total.toFixed(2)}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {order.paymentStatus || 'Paid'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          value={order.status}
                          disabled={isUpdatingStatus === order.id}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] font-medium focus:outline-none focus:border-[#24543A]"
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="in_transit">In Transit</option>
                          <option value="delivered">Completed / Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* View Details Button */}
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 rounded-xl border border-[#DCE7D8] bg-white text-stone-700 hover:text-[#173D2B] hover:bg-[#F7F8F3] text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#24543A]" />
                          <span>View Details</span>
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

      {/* ========================================================================= */}
      {/* ORDER DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-elevated border border-[#DCE7D8] overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#DCE7D8] flex items-center justify-between bg-[#F7F8F3]/60 shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-[#24543A]" />
                <div>
                  <h3 className="text-base font-serif font-bold text-[#173D2B]">
                    Order Details: {selectedOrder.id}
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
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

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Customer & Delivery Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F7F8F3] border border-[#DCE7D8]">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 flex items-center gap-1">
                    <User className="w-3 h-3 text-[#24543A]" />
                    Customer Details
                  </span>
                  <p className="text-xs font-bold text-[#173D2B]">{selectedOrder.customerName}</p>
                  <p className="text-xs text-stone-600 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-stone-400" />
                    {selectedOrder.customerEmail}
                  </p>
                  {selectedOrder.customerPhone && (
                    <p className="text-xs text-stone-600 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-stone-400" />
                      {selectedOrder.customerPhone}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#24543A]" />
                    Shipping Address
                  </span>
                  <p className="text-xs text-stone-700 leading-snug">
                    {selectedOrder.shippingAddress.address}<br />
                    {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.postalCode}<br />
                    {selectedOrder.shippingAddress.country}
                  </p>
                  {selectedOrder.shippingAddress.notes && (
                    <p className="text-[11px] text-stone-500 italic mt-1">
                      Note: &ldquo;{selectedOrder.shippingAddress.notes}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-stone-500">
                  Purchased Botanical Items
                </h4>

                <div className="divide-y divide-[#DCE7D8]/60 border border-[#DCE7D8] rounded-xl overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 flex items-center justify-between gap-4 bg-white hover:bg-[#F7F8F3]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 border border-[#DCE7D8] shrink-0">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#173D2B] truncate">{item.name}</p>
                          <p className="text-[11px] text-stone-500 font-mono">
                            ${item.price.toFixed(2)} × {item.quantity} units
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono font-bold text-xs text-[#173D2B]">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Totals & Payment */}
              <div className="p-4 rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] space-y-2 text-xs">
                <div className="flex items-center justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Greenhouse Shipping:</span>
                  <span className="font-mono">${selectedOrder.shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-sm text-[#173D2B] pt-2 border-t border-[#DCE7D8]">
                  <span>Total Amount Paid:</span>
                  <span className="font-mono">${selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                  <span>Payment Method:</span>
                  <span className="font-mono uppercase">{selectedOrder.paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#F7F8F3]/60 border-t border-[#DCE7D8] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">Update Status:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-white border border-[#DCE7D8] text-[#173D2B] font-semibold"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Completed / Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#173D2B] text-white hover:bg-[#24543A]"
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
