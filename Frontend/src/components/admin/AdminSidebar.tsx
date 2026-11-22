'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  History,
  ShoppingBag,
  Sprout,
  Store,
  ExternalLink,
  CircleDot,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Inventory',
    href: '/admin/inventory',
    icon: Package,
  },
  {
    name: 'Add Plant',
    href: '/admin/add-plant',
    icon: PlusCircle,
  },
  {
    name: 'Stock History',
    href: '/admin/stock-history',
    icon: History,
  },
  {
    name: 'Orders',
    href: '/admin/orders',
    icon: ShoppingBag,
  },
];

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin' || pathname === '/admin/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#173D2B' }}
      >
        {/* Top Header & Logo */}
        <div>
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-white/10">
            <Link
              href="/admin"
              className="flex items-center gap-3 group focus:outline-none"
              onClick={onClose}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundColor: '#24543A' }}
              >
                <Sprout className="w-5 h-5 text-[#A8BFA0]" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl tracking-wider text-[#FFFFFF] font-medium leading-none">
                  VERDANT
                </span>
                <span className="text-[10px] tracking-widest text-[#A8BFA0] uppercase font-mono mt-1">
                  Shopkeeper Portal
                </span>
              </div>
            </Link>

            {/* Close button for mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 lg:hidden transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Quick System Badge */}
          <div className="px-6 py-3 bg-[#0F281C]/40 border-b border-white/5 flex items-center justify-between text-xs">
            <span className="text-[#A8BFA0] font-mono text-[11px] flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Shared DB Active
            </span>
            <span className="text-[10px] text-white/40 font-mono">store.json</span>
          </div>

          {/* Navigation Items (STRICTLY 4 ITEMS) */}
          <nav className="px-4 py-5 space-y-1.5" aria-label="Shopkeeper Navigation">
            <div className="px-3 pb-2 text-[10px] font-semibold text-[#A8BFA0]/70 uppercase tracking-wider font-mono">
              Stock Management
            </div>

            {ADMIN_NAV_ITEMS.map((item) => {
              const active = isItemActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    active
                      ? 'bg-[#24543A] text-[#FFFFFF] shadow-sm font-semibold'
                      : 'text-[#DCE7D8]/80 hover:text-[#FFFFFF] hover:bg-[#24543A]/40'
                  }`}
                  style={{
                    borderLeft: active ? '3px solid #A8BFA0' : '3px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        active
                          ? 'text-[#A8BFA0]'
                          : 'text-[#A8BFA0]/70 group-hover:text-[#A8BFA0]'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && !active && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-[#A8BFA0]/90">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <CircleDot className="w-3.5 h-3.5 text-[#A8BFA0] animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Shop Profile & Customer Link */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#0F281C]/30">
          {/* Shop Profile Card */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-serif text-sm font-semibold text-[#FFFFFF] shadow-inner"
              style={{ backgroundColor: '#24543A' }}
            >
              VN
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Verdant Nursery</p>
              <p className="text-[11px] text-[#A8BFA0] truncate">Head Botanist / Shopkeeper</p>
            </div>
            <Store className="w-4 h-4 text-[#A8BFA0]/60" />
          </div>

          {/* Quick link to View Customer Store */}
          <Link
            href="/shop"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-xl text-[#DCE7D8] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <span>View Customer Store</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#A8BFA0]" />
          </Link>
        </div>
      </aside>
    </>
  );
}
