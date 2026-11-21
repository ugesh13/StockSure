'use client';

import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { AdminProvider, useAdmin } from '@/context/AdminContext';

function AdminShell({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { searchQuery, setSearchQuery, isRefreshing, triggerRefresh, lastUpdated } =
    useAdmin();

  return (
    <div className="min-h-screen flex text-[#173D2B]" style={{ backgroundColor: '#F7F8F3' }}>
      {/* Sidebar (Desktop fixed w-72, Mobile drawer) */}
      <AdminSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all">
        {/* Topbar */}
        <AdminTopbar
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isRefreshing={isRefreshing}
          onRefresh={triggerRefresh}
          lastUpdated={lastUpdated || undefined}
          pageTitle="Stockkeeper Dashboard"
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Simple Footer */}
        <footer className="px-6 py-4 border-t border-[#DCE7D8] text-center text-xs text-stone-500 font-mono bg-white/40">
          Verdant Botanical Stock Management System • Shared Database Engine (`store.json`)
        </footer>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
