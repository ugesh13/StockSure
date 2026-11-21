'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Product, Branch, backend } from '@/lib/backend';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  subtotal: number;
  shippingCost: number;
  total: number;
  freeShippingThreshold: number;
  freeShippingRemaining: number;
  appliedCoupon: string | null;
  discount: number;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  selectedBranch: Branch;
  selectedBranchId: number;
  branches: Branch[];
  setSelectedBranch: (branch: Branch) => void;
  setSelectedBranchId: (id: number) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string | number) => void;
  updateQuantity: (productId: string | number, quantity: number) => void;
  clearCart: () => void;
  getProductStockAtBranch: (product: Product, branchId?: number) => { available: number; status: string; isLowStock: boolean };
}

const DEFAULT_BRANCH: Branch = {
  id: 1,
  name: 'StockSure Koramangala',
  city: 'Bengaluru',
  lat: 12.9352,
  lng: 77.6245,
  address: '80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
  hours: 'Mon – Sat: 8:00 AM – 9:00 PM | Sun: 9:00 AM – 8:00 PM IST',
  phone: '+91 80 4567 8901',
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([DEFAULT_BRANCH]);
  const [selectedBranch, setSelectedBranchState] = useState<Branch>(DEFAULT_BRANCH);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState<number>(0);

  // Fetch real branches from backend on mount
  useEffect(() => {
    let active = true;
    async function loadBranches() {
      try {
        const res = await backend.getBranches();
        if (active && res.branches && res.branches.length > 0) {
          // Format addresses & hours for the Indian branches
          const formatted = res.branches.map((b) => ({
            ...b,
            address: b.address || `${b.name}, ${b.city}`,
            hours: b.hours || 'Mon – Sat: 8:00 AM – 9:00 PM | Sun: 9:00 AM – 8:00 PM IST',
            phone: b.phone || '+91 80 4567 8900',
          }));
          setBranches(formatted);
          // If stored branch exists, match it
          const savedBranchId = localStorage.getItem('stocksure_branch_id');
          if (savedBranchId) {
            const found = formatted.find((br) => br.id === Number(savedBranchId));
            if (found) setSelectedBranchState(found);
            else setSelectedBranchState(formatted[0]);
          } else {
            setSelectedBranchState(formatted[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch real branches from backend', err);
      }
    }
    loadBranches();
    return () => {
      active = false;
    };
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stocksure_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setHasMounted(true);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (hasMounted) {
      try {
        localStorage.setItem('stocksure_cart', JSON.stringify(items));
      } catch {
        // ignore
      }
    }
  }, [items, hasMounted]);

  const setSelectedBranch = useCallback((branch: Branch) => {
    setSelectedBranchState(branch);
    try {
      localStorage.setItem('stocksure_branch_id', String(branch.id));
    } catch {
      // ignore
    }
  }, []);

  const setSelectedBranchId = useCallback((id: number) => {
    const found = branches.find((b) => b.id === id);
    if (found) {
      setSelectedBranch(found);
    }
  }, [branches, setSelectedBranch]);

  const getProductStockAtBranch = useCallback((product: Product, branchId?: number) => {
    const targetBranchId = branchId || selectedBranch.id;
    if (product.branches && Array.isArray(product.branches)) {
      const bInfo = product.branches.find((b) => b.branch_id === targetBranchId);
      if (bInfo) {
        const available = Math.max(0, bInfo.available);
        return {
          available,
          status: bInfo.status || (available > 5 ? 'IN_STOCK' : available > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK'),
          isLowStock: available > 0 && available <= 5,
        };
      }
    }
    const avail = product.stock ?? 10;
    return {
      available: avail,
      status: avail > 5 ? 'IN_STOCK' : avail > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
      isLowStock: avail > 0 && avail <= 5,
    };
  }, [selectedBranch.id]);

  const addToCart = (product: Product, quantity = 1) => {
    const stockInfo = getProductStockAtBranch(product);
    const maxAllowed = Math.max(1, stockInfo.available || product.stock || 10);

    setItems((prev) => {
      const existing = prev.find((i) => String(i.product.id) === String(product.id));
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, maxAllowed);
        return prev.map((i) =>
          String(i.product.id) === String(product.id) ? { ...i, quantity: newQty } : i
        );
      }
      return [...prev, { product, quantity: Math.min(quantity, maxAllowed) }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string | number) => {
    setItems((prev) => prev.filter((i) => String(i.product.id) !== String(productId)));
  };

  const updateQuantity = (productId: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (String(i.product.id) === String(productId)) {
          const stockInfo = getProductStockAtBranch(i.product);
          const maxAllowed = Math.max(1, stockInfo.available || i.product.stock || 10);
          return { ...i, quantity: Math.min(quantity, maxAllowed) };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  // In Rupees: Free delivery on ₹999+, otherwise ₹49 flat
  const freeShippingThreshold = 999;
  const rawShippingCost = subtotal >= freeShippingThreshold || items.length === 0 ? 0 : 49;
  const isFreeShipCoupon = appliedCoupon === 'FREESHIP';
  const shippingCost = isFreeShipCoupon ? 0 : rawShippingCost;

  // Coupon application logic
  const applyCoupon = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean === 'STOCKSURE10') {
      const disc = Math.round(subtotal * 0.1);
      setDiscount(disc);
      setAppliedCoupon('STOCKSURE10');
      return { success: true, message: `STOCKSURE10 applied: ₹${disc} discount (10% off)` };
    }
    if (clean === 'BANGALORE20') {
      const disc = Math.round(subtotal * 0.2);
      setDiscount(disc);
      setAppliedCoupon('BANGALORE20');
      return { success: true, message: `BANGALORE20 applied: ₹${disc} discount (20% off)` };
    }
    if (clean === 'FREESHIP') {
      setDiscount(0);
      setAppliedCoupon('FREESHIP');
      return { success: true, message: 'FREESHIP applied: Free Delivery Unlocked!' };
    }
    if (clean === 'FIRSTPLANT') {
      if (subtotal < 300) {
        return { success: false, message: 'FIRSTPLANT requires a minimum subtotal of ₹300' };
      }
      const disc = Math.min(100, subtotal);
      setDiscount(disc);
      setAppliedCoupon('FIRSTPLANT');
      return { success: true, message: `FIRSTPLANT applied: ₹${disc} flat off!` };
    }
    return { success: false, message: 'Invalid coupon code. Try STOCKSURE10 or BANGALORE20.' };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
  };

  const total = Math.max(0, subtotal - discount + shippingCost);
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        subtotal,
        shippingCost,
        total,
        freeShippingThreshold,
        freeShippingRemaining,
        appliedCoupon,
        discount,
        applyCoupon,
        removeCoupon,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        selectedBranch,
        selectedBranchId: selectedBranch.id,
        branches,
        setSelectedBranch,
        setSelectedBranchId,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getProductStockAtBranch,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
