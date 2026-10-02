'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useShiftStore } from '@/store/shiftStore';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Wallet,
  CreditCard,
  CircleDollarSign,
  Clock,
  FileText,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  UtensilsCrossed,
  Gamepad2,
  Receipt,
  PlusCircle,
  ArrowRight,
  Sparkles,
  History,
  RotateCw,
  UserCheck
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';

interface KPIKeys {
  totalSales: number;
  cashCollection: number;
  upiCollection: number;
  cardCollection: number;
  totalBillsGenerated: number;
  customersServed: number;
  averageBillValue: number;
}

interface Transaction {
  id: string;
  orderNumber: number;
  type: string;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  createdAt: string;
}

interface ShiftInfo {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openingCash: number;
  expectedCash: number;
  physicalCash: number | null;
  cashDifference: number | null;
  totalExpensesLogged: number;
}

interface EmployeeSummaryData {
  kpis: KPIKeys;
  paymentBreakdown: {
    cash: number;
    upi: number;
    card: number;
  };
  billingActivityTimeline: Transaction[];
  recentTransactions: Transaction[];
  shiftInfo: ShiftInfo | null;
}

export default function CashierDashboard() {
  const user = useAuthStore((state) => state.user);
  const activeShift = useShiftStore((state) => state.activeShift);

  const { data, isLoading, error, refetch, isFetching } = useQuery<EmployeeSummaryData>({
    queryKey: ['cashierEmployeeSummary', user?.id],
    queryFn: async () => {
      const res = await api.get('/reports/employee-summary');
      return res.data;
    },
    refetchInterval: 10000,
  });

  const todayDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#D94949] border-t-transparent"></div>
        <p className="text-xs font-semibold text-slate-400">Loading Cashier Dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-800 rounded-2xl border border-red-200 flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-3">
        <AlertCircle className="h-7 w-7 text-[#D94949]" />
        <h3 className="font-bold text-sm">Failed to load Cashier Dashboard</h3>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#D94949] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#C53B3B] transition-all flex items-center gap-1.5"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const { kpis, paymentBreakdown, billingActivityTimeline, recentTransactions, shiftInfo } = data;

  const paymentChartData = [
    { name: 'Cash', value: paymentBreakdown.cash, color: '#10B981' },
    { name: 'UPI', value: paymentBreakdown.upi, color: '#3B82F6' },
    { name: 'Card', value: paymentBreakdown.card, color: '#F59E0B' },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-16 animate-in fade-in-50 duration-200">
      {/* 1. CASHIER HEADER BANNER */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 text-[#D94949] flex items-center justify-center font-bold shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                Cashier Dashboard
              </h1>
              <span className="bg-rose-50 text-[#D94949] border border-rose-200/70 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Cashier View
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Logged in as <span className="font-bold text-slate-700">{user?.name}</span> • Showing your personal shift and sales activity
            </p>
          </div>
        </div>

        {/* Date & Shift Status Quick Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{todayDateStr}</span>
          </div>

          <button
            onClick={() => refetch()}
            title="Refresh"
            disabled={isFetching}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200/80 bg-white"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-[#D94949]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. QUICK ACTIONS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <Link
          href="/pos"
          className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-rose-50 to-rose-100/50 border border-rose-200/70 rounded-2xl hover:border-rose-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#D94949] text-white flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black text-slate-900 block truncate">POS Billing</span>
            <span className="text-[10px] font-semibold text-rose-700">New Food Order</span>
          </div>
        </Link>

        <Link
          href="/games/sessions/new"
          className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-sky-50 to-sky-100/50 border border-sky-200/70 rounded-2xl hover:border-sky-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Gamepad2 className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black text-slate-900 block truncate">New Session</span>
            <span className="text-[10px] font-semibold text-sky-700">Games & Trampoline</span>
          </div>
        </Link>

        <Link
          href="/expenses"
          className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/70 rounded-2xl hover:border-amber-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <CircleDollarSign className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black text-slate-900 block truncate">Log Expense</span>
            <span className="text-[10px] font-semibold text-amber-700">Drawer Petty Cash</span>
          </div>
        </Link>

        <Link
          href="/shifts"
          className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/70 rounded-2xl hover:border-emerald-300 hover:shadow-sm transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <History className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black text-slate-900 block truncate">Shift Control</span>
            <span className="text-[10px] font-semibold text-emerald-700">Open / Close Shift</span>
          </div>
        </Link>
      </div>

      {/* 3. CASHIER KEY PERFORMANCE METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Personal Sales */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-[#D94949] border border-rose-100/80 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-xs font-bold text-slate-500">My Total Sales</span>
          </div>
          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              ₹{Number(kpis.totalSales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>{kpis.totalBillsGenerated} Bills Generated</span>
            <span className="text-slate-500 font-bold">Today</span>
          </div>
        </div>

        {/* Cash in Drawer / Cash Collection */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 flex items-center justify-center font-bold shrink-0">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-xs font-bold text-slate-500">Cash Collection</span>
          </div>
          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-700 tracking-tight">
              ₹{Number(kpis.cashCollection).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Drawer Physical Cash</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-xxs">Cash</span>
          </div>
        </div>

        {/* UPI Collection */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100/80 flex items-center justify-center font-bold shrink-0">
              <CircleDollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-xs font-bold text-slate-500">UPI Payments</span>
          </div>
          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-sky-700 tracking-tight">
              ₹{Number(kpis.upiCollection).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Direct Bank Transfers</span>
            <span className="text-sky-700 font-bold bg-sky-50 px-1.5 py-0.5 rounded text-xxs">UPI QR</span>
          </div>
        </div>

        {/* Card Collection */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/80 flex items-center justify-center font-bold shrink-0">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-xs font-bold text-slate-500">Card Swipes</span>
          </div>
          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-700 tracking-tight">
              ₹{Number(kpis.cardCollection).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>POS Card Swipes</span>
            <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-xxs">Card</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* LEFT COLUMN: RECENT ORDERS & ACTIVITY (8/12) */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-5">
          {/* Recent Orders by this Cashier */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#D94949]" />
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  My Recent Orders Today
                </h2>
              </div>
              <Link
                href="/sales-history"
                className="text-xs font-bold text-[#D94949] hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No orders completed by you today yet. Use POS Billing to start taking orders.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-150">
                      <th className="px-4 sm:px-6 py-3">Order #</th>
                      <th className="px-4 sm:px-6 py-3">Type</th>
                      <th className="px-4 sm:px-6 py-3">Customer</th>
                      <th className="px-4 sm:px-6 py-3">Grand Total</th>
                      <th className="px-4 sm:px-6 py-3">Payment</th>
                      <th className="px-4 sm:px-6 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentTransactions.slice(0, 8).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 font-medium">
                        <td className="px-4 sm:px-6 py-3.5 font-bold text-slate-900">
                          #{tx.orderNumber}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {tx.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 truncate max-w-[140px]">
                          <span className="font-semibold text-slate-800 block truncate">
                            {tx.customerName || 'Walk-in'}
                          </span>
                          {tx.customerPhone && (
                            <span className="text-[10px] text-slate-400 block">{tx.customerPhone}</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 font-bold text-slate-900">
                          ₹{Number(tx.grandTotal).toFixed(2)}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xxs font-bold ${
                              tx.paymentMethod === 'CASH'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : tx.paymentMethod === 'UPI'
                                ? 'bg-sky-50 text-sky-700 border border-sky-100'
                                : tx.paymentMethod === 'CARD'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right text-slate-400 text-[11px]">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Billing Activity Timeline */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>Personal Billing Timeline</span>
            </h2>

            {billingActivityTimeline.length === 0 ? (
              <div className="text-slate-400 text-xs py-4 text-center">No recent billing logs.</div>
            ) : (
              <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-4">
                {billingActivityTimeline.slice(0, 6).map((log) => (
                  <div key={log.id} className="relative">
                    <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#D94949] shadow-xs"></span>
                    <div className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Bill #{log.orderNumber} Generated</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5 text-[11px]">
                        Settled <span className="font-bold text-slate-700">₹{Number(log.grandTotal).toFixed(2)}</span> ({log.type.replace('_', ' ')}) for <span className="font-semibold">{log.customerName}</span> via <span className="font-bold text-slate-700">{log.paymentMethod}</span>.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SHIFT DETAILS & PAYMENT BREAKDOWN (4/12) */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-5">
          {/* Shift Reconciliation Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Shift Status & Drawer</span>
              </h2>
              <Link
                href="/shifts"
                className="text-xxs font-bold text-[#D94949] hover:underline"
              >
                Shift Control
              </Link>
            </div>

            {shiftInfo ? (
              <div className="space-y-4">
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    shiftInfo.status === 'OPEN'
                      ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {shiftInfo.status === 'OPEN' ? (
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-ping"></div>
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-slate-400" />
                  )}
                  <div>
                    <div className="font-extrabold text-xs">
                      Shift Status: <span className="uppercase">{shiftInfo.status}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {shiftInfo.status === 'OPEN' ? 'Recording live drawer transactions' : 'Shift closed and balanced'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold text-[11px]">Opening Cash Drawer</span>
                    <span className="font-bold text-slate-800">
                      ₹{Number(shiftInfo.openingCash).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold text-[11px]">Shift Cash Sales</span>
                    <span className="font-bold text-emerald-600">
                      +₹{Number(kpis.cashCollection).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold text-[11px]">Shift Petty Expenses</span>
                    <span className="font-bold text-rose-600">
                      -₹{Number(shiftInfo.totalExpensesLogged).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-900 font-black text-xs">Expected Drawer Cash</span>
                    <span className="font-black text-slate-900 text-sm">
                      ₹{Number(shiftInfo.expectedCash).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/70 text-center space-y-2">
                <AlertCircle className="h-6 w-6 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-amber-900">No Active Shift Found</p>
                <p className="text-[11px] text-amber-700">Please start a shift to begin cashier billing.</p>
                <Link
                  href="/shifts"
                  className="inline-block px-3 py-1.5 bg-[#D94949] text-white text-xs font-bold rounded-lg hover:bg-[#C53B3B] transition-colors mt-1"
                >
                  Open Cashier Shift
                </Link>
              </div>
            )}
          </div>

          {/* Payment Method Breakdown Chart */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              My Payment Mix
            </h2>

            {paymentChartData.length === 0 ? (
              <div className="text-slate-400 text-xs py-6 text-center">
                No payment data recorded yet today.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-40 w-full max-w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full space-y-2">
                  {paymentChartData.map((entry, index) => {
                    const total = paymentChartData.reduce((s, p) => s + p.value, 0);
                    const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                    return (
                      <div key={index} className="flex items-center justify-between text-xs border-b border-slate-50 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                          <span className="font-semibold text-slate-700">{entry.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">₹{Number(entry.value).toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
