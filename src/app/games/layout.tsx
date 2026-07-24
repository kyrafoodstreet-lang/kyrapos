'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  Gamepad2,
  LayoutDashboard,
  PlusCircle,
  Play,
  CheckCircle,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ArrowLeft,
  Menu,
  X,
  User,
  LogOut
} from 'lucide-react';

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Auth & Role Guard Redirection
  useEffect(() => {
    if (mounted) {
      if (!token) {
        router.replace('/login');
      }
    }
  }, [token, router, mounted]);

  if (!mounted || !token || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-650"></div>
      </div>
    );
  }

  const isAdminOrManager = user.role === 'ADMIN' || user.role === 'MANAGER';

  const menuItems = [
    { name: 'Dashboard', href: '/games', icon: LayoutDashboard, show: true },
    { name: 'New Session', href: '/games/sessions/new', icon: PlusCircle, show: true },
    { name: 'Active Sessions', href: '/games/sessions?tab=active', icon: Play, show: true },
    { name: 'Completed Sessions', href: '/games/sessions?tab=completed', icon: CheckCircle, show: true },
    { name: 'Customers', href: '/games/customers', icon: Users, show: true },
    { name: 'Payments', href: '/games/payments', icon: CreditCard, show: true },
    { name: 'Reports', href: '/games/reports', icon: BarChart3, show: true },
    { name: 'Game Settings', href: '/games/settings', icon: Settings, show: isAdminOrManager },
  ];

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800 font-sans">
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Workspace Panel */}
      <aside className={`fixed inset-y-0 left-0 z-45 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-0 lg:translate-x-0'
      }`}>
        {/* App Logo section */}
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6 shrink-0 bg-slate-50/50">
          <Gamepad2 className="h-6 w-6 text-blue-600" />
          <span className="font-bold tracking-tight text-slate-800">Games POS</span>
          <span className="text-xxs px-1.5 py-0.5 bg-blue-50 text-blue-655 font-bold rounded">Active</span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {menuItems.map((item) => {
            if (!item.show) return null;
            const isActive = pathname === item.href || (item.href !== '/games' && pathname.startsWith(item.href.split('?')[0]));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer options */}
        <div className="border-t border-slate-200 p-4 shrink-0 space-y-1.5 bg-slate-50/50">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition-all"
          >
            <ArrowLeft className="h-4.5 w-4.5 text-slate-400" />
            <span>Back to POS</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header toolbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 hover:bg-slate-100 rounded lg:hidden text-slate-600"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block text-slate-450 text-xxs font-bold uppercase tracking-wider">
              Kyra POS Entertainment Center
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Session card */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="h-7 w-7 rounded-full bg-blue-105 flex items-center justify-center text-blue-650 text-xs font-bold border border-blue-200">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left leading-tight hidden xs:block">
                <div className="text-xs font-bold text-slate-800">{user.name}</div>
                <div className="text-xxs text-slate-400 uppercase font-semibold">{user.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Contents viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
