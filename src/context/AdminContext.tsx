'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface AdminContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isRefreshing: boolean;
  setIsRefreshing: (val: boolean) => void;
  refreshSignal: number;
  triggerRefresh: () => void;
  lastUpdated: string | null;
  setLastUpdated: (time: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshSignal((prev) => prev + 1);
  }, []);

  return (
    <AdminContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        isRefreshing,
        setIsRefreshing,
        refreshSignal,
        triggerRefresh,
        lastUpdated,
        setLastUpdated,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
