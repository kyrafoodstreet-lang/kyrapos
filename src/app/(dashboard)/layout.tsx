'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useShiftStore } from '@/store/shiftStore';
import api from '@/lib/api';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Printer,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  History,
  LogOut,
  Menu,
  X,
  UserCheck,
  AlertCircle,
  Plus,
  Sparkles,
  Gamepad2
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  
  const activeShift = useShiftStore((state) => state.activeShift);
  const setActiveShift = useShiftStore((state) => state.setActiveShift);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingShift, setLoadingShift] = useState(true);
  const [mounted, setMounted] = useState(false);

  // 0. Mount state indicator for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Auth Guard Redirection
  useEffect(() => {
    if (mounted && !token) {
      router.replace('/login');
    }
  }, [token, router, mounted]);

  // 2. Fetch Active Shift for the Session Cashier
  useEffect(() => {
    if (mounted && token) {
      api.get('/shifts/active')
        .then((res) => {
          setActiveShift(res.data || null);
        })
        .catch((err) => {
          console.error('Failed to load active shift', err);
        })
        .finally(() => {
          setLoadingShift(false);
        });
    } else if (mounted) {
      setLoadingShift(false);
    }
  }, [token, setActiveShift, mounted]);

  if (!mounted || !token || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Role Permissions
  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'MANAGER';

  const isAdmin = user.role === 'ADMIN';

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'POS Billing', href: '/pos', icon: Printer, show: true },
    { name: 'Sales History', href: '/sales-history', icon: ClipboardList, show: true },
    { name: 'Menu Editor', href: '/menu', icon: ClipboardList, show: isAdminOrManager },
    { name: 'Shift Control', href: '/shifts', icon: History, show: true },
    { name: 'Expenses', href: '/expenses', icon: CircleDollarSign, show: true },
    { name: 'Reports', href: '/reports', icon: ClipboardList, show: true },
    { name: 'Party Hall', href: '/party-hall', icon: Sparkles, show: isAdminOrManager },
    { name: 'Games', href: '/games', icon: Gamepad2, show: true },
    { name: 'Print Center', href: '/settings/printer', icon: Printer, show: isAdminOrManager },
    { name: 'User Management', href: '/users', icon: UserCheck, show: isAdmin },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 bg-white">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-primary">
            <UtensilsCrossed className="h-5 w-5" />
            <span className="font-semibold tracking-tight text-slate-800">Kyra POS</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-450 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.filter(item => item.show).map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active 
                    ? 'bg-primary-light text-slate-900 border border-primary/10 shadow-xxs' 
                    : 'text-slate-500 hover:bg-primary-light hover:text-slate-900'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-slate-400 group-hover:text-slate-650'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-slate-600 rounded-xl hover:bg-primary-light hover:text-primary transition-colors"
          >
            <span className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-slate-400" />
              <span>Log out</span>
            </span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-slate-800 capitalize tracking-tight">
              {pathname.substring(1).replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Shift Tracker Pill */}
            {!loadingShift && (
              <>
                {activeShift ? (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xxs font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>Shift Active</span>
                  </div>
                ) : (
                  <Link 
                    href="/shifts"
                    className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-805 border border-amber-250 rounded-full text-xxs font-semibold hover:bg-amber-100/60 transition-colors animate-pulse"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    <span>Shift Closed. Start Shift</span>
                  </Link>
                )}
              </>
            )}

            {/* Profile Avatar info */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-850 leading-tight">{user.name}</span>
                <span className="text-xxs font-semibold text-slate-400 tracking-wider uppercase">{user.role}</span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Panel Workspace */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
