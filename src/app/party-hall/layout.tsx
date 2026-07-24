'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  CalendarDays,
  Users,
  CircleDollarSign,
  FileText,
  BarChart3,
  Settings,
  ArrowLeft,
  Sparkles,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function PartyHallLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Auth & Role Guard Redirection
  useEffect(() => {
    if (mounted) {
      if (!token) {
        router.replace('/login');
      } else if (user && user.role === 'CASHIER') {
        router.replace('/dashboard');
      }
    }
  }, [token, user, router, mounted]);

  if (!mounted || !token || !user || user.role === 'CASHIER') {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', href: '/party-hall', icon: LayoutDashboard },
    { name: 'Bookings', href: '/party-hall/bookings', icon: ClipboardList },
    { name: 'New Booking', href: '/party-hall/bookings/new', icon: PlusCircle },
    { name: 'Calendar', href: '/party-hall/calendar', icon: CalendarDays },
    { name: 'Customers', href: '/party-hall/customers', icon: Users },
    { name: 'Payments', href: '/party-hall/payments', icon: CircleDollarSign },
    { name: 'Invoices', href: '/party-hall/invoices', icon: FileText },
    { name: 'Reports', href: '/party-hall/reports', icon: BarChart3 },
    { name: 'Settings', href: '/party-hall/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
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
          <Link href="/party-hall" className="flex items-center gap-2 font-bold text-lg text-purple-600">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span className="font-semibold tracking-tight text-slate-800">Party Hall</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active 
                    ? 'bg-purple-50 text-purple-900 border border-purple-100 shadow-sm font-semibold' 
                    : 'text-slate-500 hover:bg-purple-50/50 hover:text-purple-700'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-purple-600' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-450" />
            <span>Restaurant POS</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-slate-650 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <span className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-slate-400" />
              <span>Log out</span>
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between lg:hidden shrink-0">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>Party Hall Management</span>
          </span>
          <div className="w-9" /> {/* Spacer */}
        </header>

        {/* Content body */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
