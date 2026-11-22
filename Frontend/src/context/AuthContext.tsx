'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { backend, getStoredToken, setStoredSession, clearStoredSession } from '@/lib/backend';

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  phone?: string | null;
  is_guest?: boolean;
  role?: 'admin' | 'customer';
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register', redirectUrl?: string) => void;
  closeAuthModal: () => void;
  setAuthMode: (mode: 'login' | 'register') => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  setSessionUser: (token: string, user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);

  // Check current session from backend on mount
  useEffect(() => {
    let active = true;
    async function checkAuth() {
      const token = getStoredToken();
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      try {
        const me = await backend.getMe();
        if (active && me) {
          setUser({
            id: me.customer_id,
            name: me.name,
            email: me.email || '',
            phone: me.phone,
            is_guest: me.is_guest,
          });
        }
      } catch (err) {
        // Token invalid or expired
        clearStoredSession();
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    checkAuth();
    return () => {
      active = false;
    };
  }, []);

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login', redirectUrl?: string) => {
    setAuthMode(mode);
    if (redirectUrl) {
      setRedirectAfterAuth(redirectUrl);
    }
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const setSessionUser = useCallback((token: string, userObj: AuthUser) => {
    setStoredSession(token, userObj.id);
    setUser(userObj);
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    // 1. If designated shopkeeper admin, authenticate via local Next.js API
    if (cleanEmail === 'admin@verdantnursery.com') {
      try {
        const localRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
        });
        const localData = await localRes.json();
        if (localRes.ok && localData.success && localData.user) {
          const adminUser: AuthUser = {
            id: localData.user.id,
            name: localData.user.name,
            email: localData.user.email,
            role: 'admin',
          };
          setUser(adminUser);
          closeAuthModal();
          if (typeof window !== 'undefined') {
            window.location.href = '/admin';
          }
          return { success: true, message: 'Welcome back, Administrator!' };
        } else {
          return { success: false, message: localData.message || 'Invalid email or password' };
        }
      } catch (err: any) {
        return { success: false, message: err.message || 'Unable to authenticate admin' };
      }
    }

    // 2. Otherwise authenticate customer via backend API
    try {
      const res = await backend.login({ email, password });
      if (res && res.token) {
        const userRole = (res as any).role || 'customer';
        setUser({
          id: res.customer_id,
          name: res.name,
          email: res.email || email,
          role: userRole,
        });
        closeAuthModal();

        if (userRole === 'admin' || (res as any).redirectTo === '/admin') {
          if (typeof window !== 'undefined') {
            window.location.href = '/admin';
          }
        } else if (redirectAfterAuth) {
          const target = redirectAfterAuth;
          setRedirectAfterAuth(null);
          if (typeof window !== 'undefined') {
            window.location.href = target;
          }
        }

        return { success: true, message: 'Welcome back!' };
      }
      return { success: false, message: 'Login failed' };
    } catch (err: any) {
      // Fallback to local auth if backend call fails
      try {
        const fallbackRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok && fallbackData.success && fallbackData.user) {
          setUser(fallbackData.user);
          closeAuthModal();
          if (fallbackData.user.role === 'admin' || fallbackData.redirectTo === '/admin') {
            if (typeof window !== 'undefined') {
              window.location.href = '/admin';
            }
          }
          return { success: true, message: fallbackData.message || 'Welcome back!' };
        }
      } catch {
        // ignore
      }
      return { success: false, message: err.message || 'Invalid email or password' };
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    try {
      const res = await backend.register({ name, email, password, phone });
      if (res && res.token) {
        const userRole = (res as any).role;
        setUser({
          id: res.customer_id,
          name: res.name,
          email: res.email || email,
          phone,
          role: userRole,
        });
        closeAuthModal();

        if (userRole === 'admin' || (res as any).redirectTo === '/admin') {
          if (typeof window !== 'undefined') {
            window.location.href = '/admin';
          }
        } else if (redirectAfterAuth) {
          const target = redirectAfterAuth;
          setRedirectAfterAuth(null);
          if (typeof window !== 'undefined') {
            window.location.href = target;
          }
        }

        return { success: true, message: 'Account registered successfully!' };
      }
      return { success: false, message: 'Registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Unable to register account' };
    }
  };

  const logout = async () => {
    try {
      await backend.logout();
    } catch {
      // ignore
    } finally {
      clearStoredSession();
      setUser(null);
      // Clean chat storage when user logs out
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('planty_chat_history_v2');
        localStorage.removeItem('planty_chat_history_v2');
        // Automatically go to the homepage (the entire starting of the website)
        window.location.href = '/';
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        authMode,
        openAuthModal,
        closeAuthModal,
        setAuthMode,
        login,
        register,
        logout,
        setSessionUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
