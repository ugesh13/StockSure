import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

const ShopContext = createContext(null);

export const CITIES = [
  { city: 'Bengaluru', branchId: 1, name: 'Koramangala Flagship' },
  { city: 'Mumbai', branchId: 4, name: 'Andheri West' },
  { city: 'Delhi', branchId: 6, name: 'Connaught Place' },
  { city: 'Ahmedabad', branchId: 12, name: 'Satellite Hub' },
  { city: 'Kolkata', branchId: 11, name: 'Salt Lake' },
  { city: 'Pune', branchId: 10, name: 'Kothrud Central' },
];

export function ShopProvider({ children }) {
  const [session, setSession] = useState(null);
  const [cart, setCart] = useState({ lines: [], total_paise: 0, item_count: 0 });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [selectedCity, setSelectedCity] = useState(CITIES[0].city);
  const [selectedBranchId, setSelectedBranchId] = useState(CITIES[0].branchId);
  const [toastMessage, setToastMessage] = useState(null);
  const [loadingCart, setLoadingCart] = useState(false);

  // Initialize session and cart
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const sess = await api.getSession();
        if (!active) return;
        setSession(sess);

        const cartData = await api.getCart();
        if (active && cartData) {
          setCart(cartData);
        }
      } catch (err) {
        console.warn('Cart initialization notice:', err.message);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const updated = await api.getCart();
      setCart(updated);
    } catch (err) {
      console.warn('Could not refresh cart:', err.message);
    }
  }, []);

  const addItemToCart = useCallback(
    async (product, qty = 1) => {
      setLoadingCart(true);
      try {
        const res = await api.addToCart({
          productId: product.id || product.product_id,
          branchId: selectedBranchId,
          qty,
        });
        if (res && res.lines) {
          setCart(res);
        } else {
          await refreshCart();
        }
        showToast(`Added "${product.name.slice(0, 28)}..." to cart`);
      } catch (err) {
        showToast(err.message || 'Could not add item');
      } finally {
        setLoadingCart(false);
      }
    },
    [selectedBranchId, refreshCart, showToast]
  );

  const updateItemQty = useCallback(
    async (productId, branchId, qty) => {
      setLoadingCart(true);
      try {
        if (qty <= 0) {
          await api.removeCartItem({ productId, branchId });
        } else {
          await api.updateCartQty({ productId, branchId, qty });
        }
        await refreshCart();
      } catch (err) {
        showToast(err.message || 'Could not update quantity');
      } finally {
        setLoadingCart(false);
      }
    },
    [refreshCart, showToast]
  );

  const removeItem = useCallback(
    async (productId, branchId) => {
      setLoadingCart(true);
      try {
        await api.removeCartItem({ productId, branchId });
        await refreshCart();
        showToast('Item removed from cart');
      } catch (err) {
        showToast(err.message || 'Could not remove item');
      } finally {
        setLoadingCart(false);
      }
    },
    [refreshCart, showToast]
  );

  const clearAllCart = useCallback(async () => {
    try {
      await api.clearCart();
      setCart({ lines: [], total_paise: 0, item_count: 0 });
      showToast('Cart cleared');
    } catch (err) {
      showToast(err.message || 'Could not clear cart');
    }
  }, [showToast]);

  const handleCityChange = useCallback((cityName) => {
    setSelectedCity(cityName);
    const found = CITIES.find((c) => c.city === cityName);
    if (found) setSelectedBranchId(found.branchId);
  }, []);

  const getItemQtyInCart = useCallback(
    (productId) => {
      const match = cart.lines?.find(
        (l) => Number(l.product_id) === Number(productId)
      );
      return match ? match.qty : 0;
    },
    [cart.lines]
  );

  return (
    <ShopContext.Provider
      value={{
        session,
        cart,
        loadingCart,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        orderSuccess,
        setOrderSuccess,
        selectedCity,
        selectedBranchId,
        handleCityChange,
        addItemToCart,
        updateItemQty,
        removeItem,
        clearAllCart,
        getItemQtyInCart,
        refreshCart,
        showToast,
      }}
    >
      {children}

      {/* Subtle Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#183D2B] text-[#FFFDF8] px-4 py-3 rounded-xl shadow-2xl border border-[#A5C7AA]/40 text-xs sm:text-sm font-medium flex items-center gap-3 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-[#A5C7AA] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}
