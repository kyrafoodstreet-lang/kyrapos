'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  Gamepad2,
  User,
  TrendingUp,
  ChevronDown,
  Layers,
  Users,
  Wallet,
  ShoppingBag,
  IndianRupee,
  ArrowRight
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

  // Role Permissions
  const userRole = user?.role || 'CASHIER';
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';
  const isAdmin = userRole === 'ADMIN';

  const roleDashboardHref = userRole === 'CASHIER' ? '/cashier/dashboard' : userRole === 'ADMIN' ? '/admin/dashboard' : userRole === 'MANAGER' ? '/manager/dashboard' : '/dashboard';
  const roleDashboardName = userRole === 'CASHIER' ? 'Cashier Dashboard' : 'Dashboard';

  // Sectioned Navigation Structure according to Master Specification
  const navSections = useMemo(() => {
    if (userRole === 'CASHIER') {
      return [
        {
          title: 'OVERVIEW',
          items: [
            { name: 'Dashboard', href: '/cashier/dashboard', icon: LayoutDashboard, show: true },
          ],
        },
        {
          title: 'OPERATIONS',
          items: [
            { name: 'POS Billing', href: '/pos', icon: UtensilsCrossed, show: true },
            { name: 'Sales History', href: '/sales-history', icon: ClipboardList, show: true },
          ],
        },
        {
          title: 'MANAGEMENT',
          items: [
            { name: 'Shift Control', href: '/shifts', icon: History, show: true },
            { name: 'Expenses', href: '/expenses', icon: CircleDollarSign, show: true },
          ],
        },
        {
          title: 'REPORTS',
          items: [
            { name: 'Employee Summary', href: '/employee-summary', icon: User, show: true },
            { name: 'Category Summary', href: '/reports/category-summary', icon: Layers, show: true },
            { name: 'Shift Closing Reports', href: '/reports/shift-closing', icon: History, show: true },
          ],
        },
      ];
    }

    return [
      {
        title: 'OVERVIEW',
        items: [
          { name: roleDashboardName, href: roleDashboardHref, icon: LayoutDashboard, show: true },
        ],
      },
      {
        title: 'OPERATIONS & ORDERS',
        items: [
          { name: 'POS Details', href: '/pos', icon: UtensilsCrossed, show: true },
          { name: 'Orders History', href: '/sales-history', icon: ClipboardList, show: true },
          { name: 'Customers', href: '/games/customers', icon: Users, show: true },
        ],
      },
      {
        title: 'MANAGEMENT',
        items: [
          { name: 'Menu Editor', href: '/menu', icon: ShoppingBag, show: isAdminOrManager },
          { name: 'Finance & Ledger', href: '/finance', icon: IndianRupee, show: isAdmin },
          { name: 'Expenses', href: '/expenses', icon: CircleDollarSign, show: true },
          { name: 'Shift Control', href: '/shifts', icon: History, show: true },
        ],
      },
      {
        title: 'REPORTS',
        items: [
          { name: 'Sales Trends', href: '/reports/sales-trends', icon: TrendingUp, show: isAdminOrManager },
          { name: 'Category Summary', href: '/reports/category-summary', icon: Layers, show: true },
          { name: 'Financial Reports', href: '/reports', icon: IndianRupee, show: isAdminOrManager },
          { name: 'Employee Summary', href: '/employee-summary', icon: User, show: true },
          { name: 'Shift Closings', href: '/reports/shift-closing', icon: History, show: true },
        ],
      },
      {
        title: 'SYSTEM',
        items: [
          { name: 'User Management', href: '/users', icon: UserCheck, show: isAdmin },
          { name: 'Print Settings', href: '/settings/printer', icon: Printer, show: isAdminOrManager },
        ],
      },
    ];
  }, [isAdmin, isAdminOrManager, roleDashboardHref, roleDashboardName, userRole]);

  // Dynamic bottom navigation items based on role
  const bottomNavItems = useMemo(() => {
    if (isAdmin) {
      return [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Reports', href: '/reports', icon: TrendingUp },
        { name: 'Finance', href: '/finance', icon: IndianRupee },
        { name: 'Users', href: '/users', icon: UserCheck },
      ];
    }
    if (userRole === 'MANAGER') {
      return [
        { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
        { name: 'Reports', href: '/reports', icon: TrendingUp },
        { name: 'Expenses', href: '/expenses', icon: CircleDollarSign },
        { name: 'Shifts', href: '/shifts', icon: History },
      ];
    }
    // Cashier & Staff
    return [
      { name: 'Dashboard', href: '/cashier/dashboard', icon: LayoutDashboard },
      { name: 'POS Billing', href: '/pos', icon: UtensilsCrossed },
      { name: 'Sales History', href: '/sales-history', icon: ClipboardList },
      { name: 'Games', href: '/games', icon: Gamepad2 },
      { name: 'My Shift', href: '/shifts', icon: History },
    ];
  }, [isAdmin, userRole]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted || !token || !user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200/90 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200/80 bg-white shrink-0">
          <Link href={roleDashboardHref} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#D94949] border border-rose-100 flex items-center justify-center font-black text-sm">
              K
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tight text-slate-900 leading-tight">
                KYRA POS
              </span>
              <span className="text-[10px] font-semibold text-slate-400 leading-tight">
                Entertainment Center
              </span>
            </div>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sectioned Nav Scroll Area */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto no-scrollbar">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {section.title}
                </span>

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isDash = (href: string) => href.endsWith('/dashboard');
                    const active = pathname === item.href || (isDash(item.href) && isDash(pathname));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href || '#'}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          active 
                            ? 'bg-rose-50 text-[#D94949] border border-rose-100/90 shadow-2xs font-extrabold' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#D94949]' : 'text-slate-400'}`} />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Switch to Game Dedicated Action Button (Cashier only) */}
        {userRole === 'CASHIER' && (
          <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 shrink-0">
            <Link
              href="/games"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-between p-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl shadow-xs transition-all group active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Gamepad2 className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 text-left">
                  <span className="text-xs font-black tracking-tight block truncate text-white">
                    Switch to Game
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate font-medium">
                    Trampoline & Coins
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>
        )}

        {/* Sidebar Footer User Profile */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/60 shrink-0">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-700 font-black flex items-center justify-center text-xs border border-sky-200 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 capitalize block leading-tight">
                  {user.role?.toLowerCase() || 'Staff'}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-6 z-30 shrink-0 sticky top-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl shrink-0 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                KYRA POS
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 leading-tight">
                Entertainment Center
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            {/* Shift Tracker Pill */}
            {!loadingShift && (
              <>
                {activeShift ? (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xxs font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>Shift Active</span>
                  </div>
                ) : (
                  <Link 
                    href="/shifts" 
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xxs font-bold hover:bg-amber-100/60 transition-colors animate-pulse"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    <span>Shift Closed • Open Shift</span>
                  </Link>
                )}
              </>
            )}

            {/* Profile Avatar info */}
            <div className="flex items-center gap-2 border-l border-slate-200/80 pl-2.5 sm:pl-5">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-sky-50 text-sky-700 font-black flex items-center justify-center text-xs border border-sky-200 shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center gap-1 cursor-pointer">
                <span className="text-xs font-bold text-slate-800 hidden sm:inline">{user.name}</span>
                <span className="text-xs font-bold text-slate-800 sm:hidden capitalize">{user.role?.toLowerCase() || 'Admin'}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Panel Workspace */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-3.5 sm:p-6 pb-24 lg:pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* ALL ROLES MOBILE BOTTOM NAVIGATION BAR */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around lg:hidden shadow-lg safe-area-pb">
          {bottomNavItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  active
                    ? 'text-[#D94949] font-bold bg-rose-50/90 scale-102'
                    : 'text-slate-400 hover:text-slate-700 font-medium'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${active ? 'text-[#D94949]' : 'text-slate-400'}`} />
                <span className={`text-[10px] mt-0.5 tracking-tight ${active ? 'text-[#D94949] font-bold' : 'text-slate-500'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
