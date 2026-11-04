'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  CalendarDays,
  UtensilsCrossed,
  Gamepad2,
  Coins,
  IndianRupee,
  Wallet,
  QrCode,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Lock,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowUpRight,
  BarChart3,
  Calendar
} from 'lucide-react';

interface PaymentSplit {
  total: number;
  cash: number;
  upi: number;
  card: number;
}

interface FoodSalesData extends PaymentSplit {
  orderCount: number;
}

interface GameSectionData extends PaymentSplit {
  sessionCount: number;
}

interface DailyRow {
  date: string;
  day: number;
  dayName: string;
  totalSales: number;
  totalCash: number;
  totalUpi: number;
  food: PaymentSplit & { count: number };
  trampoline: PaymentSplit & { count: number };
  coin: PaymentSplit & { count: number };
  otherGames: PaymentSplit & { count: number };
}

interface MonthlyReportResponse {
  month: string;
  currentMonth: string;
  monthLabel: string;
  isCurrentMonth: boolean;
  userRole: string;
  canSelectMonth: boolean;
  availableMonths: { value: string; label: string }[];
  summary: {
    totalSales: number;
    totalCash: number;
    totalUpi: number;
    totalCard: number;
    totalTransactions: number;
  };
  foodSales: FoodSalesData;
  gamesSales: {
    total: number;
    cash: number;
    upi: number;
    card: number;
    sessionCount: number;
    trampoline: GameSectionData;
    coin: GameSectionData;
    otherGames: GameSectionData;
    allGames: { name: string; total: number; cash: number; upi: number; card: number; count: number }[];
  };
  dailyBreakdown: DailyRow[];
}

export default function MonthlyReportPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isAuthorized = isAdmin || isManager;

  // Selected month string in YYYY-MM format
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const {
    data: report,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<MonthlyReportResponse>({
    queryKey: ['monthlyReport', selectedMonth],
    queryFn: async () => {
      const res = await api.get('/reports/monthly', {
        params: selectedMonth ? { month: selectedMonth } : {},
      });
      return res.data;
    },
    enabled: isAuthorized,
  });

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto mt-16 text-center">
        <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Access Restricted</h2>
        <p className="text-xs text-slate-500 leading-normal">
          This report is restricted to Admins and Managers. Please contact an administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  const formatCurrency = (val?: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handlePrevMonth = () => {
    if (!report?.availableMonths || !report.canSelectMonth) return;
    const currentIndex = report.availableMonths.findIndex((m) => m.value === (selectedMonth || report.month));
    if (currentIndex !== -1 && currentIndex < report.availableMonths.length - 1) {
      setSelectedMonth(report.availableMonths[currentIndex + 1].value);
    }
  };

  const handleNextMonth = () => {
    if (!report?.availableMonths || !report.canSelectMonth) return;
    const currentIndex = report.availableMonths.findIndex((m) => m.value === (selectedMonth || report.month));
    if (currentIndex > 0) {
      setSelectedMonth(report.availableMonths[currentIndex - 1].value);
    }
  };

  const handleExportCSV = () => {
    if (!report || !report.dailyBreakdown) {
      alert('No data available to export.');
      return;
    }

    let csv = `Monthly Sales Report - ${report.monthLabel}\n`;
    csv += `Total Sales: ${report.summary.totalSales}, Total Cash: ${report.summary.totalCash}, Total UPI: ${report.summary.totalUpi}\n\n`;

    csv += 'Summary Breakdown\n';
    csv += `Department,Total Sales,Cash Amount,UPI Amount,Orders/Sessions\n`;
    csv += `Food Sales,${report.foodSales.total},${report.foodSales.cash},${report.foodSales.upi},${report.foodSales.orderCount}\n`;
    csv += `Trampoline Games,${report.gamesSales.trampoline.total},${report.gamesSales.trampoline.cash},${report.gamesSales.trampoline.upi},${report.gamesSales.trampoline.sessionCount}\n`;
    csv += `Coin Games,${report.gamesSales.coin.total},${report.gamesSales.coin.cash},${report.gamesSales.coin.upi},${report.gamesSales.coin.sessionCount}\n`;
    if (report.gamesSales.otherGames.total > 0) {
      csv += `Other Games,${report.gamesSales.otherGames.total},${report.gamesSales.otherGames.cash},${report.gamesSales.otherGames.upi},${report.gamesSales.otherGames.sessionCount}\n`;
    }
    csv += `GRAND TOTAL,${report.summary.totalSales},${report.summary.totalCash},${report.summary.totalUpi},${report.summary.totalTransactions}\n\n`;

    csv += 'Date,Day,Food Total,Food Cash,Food UPI,Trampoline Total,Trampoline Cash,Trampoline UPI,Coin Total,Coin Cash,Coin UPI,Total Sales,Total Cash,Total UPI\n';
    report.dailyBreakdown.forEach((row) => {
      csv += `${row.date},${row.dayName},${row.food.total},${row.food.cash},${row.food.upi},${row.trampoline.total},${row.trampoline.cash},${row.trampoline.upi},${row.coin.total},${row.coin.cash},${row.coin.upi},${row.totalSales},${row.totalCash},${row.totalUpi}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Monthly_Report_${report.month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter daily breakdown if user searches for date/day
  const filteredDailyBreakdown = (report?.dailyBreakdown || []).filter((row) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return row.date.includes(term) || row.dayName.toLowerCase().includes(term);
  });

  const activeMonthValue = selectedMonth || report?.month || '';
  const currentMonthIndex = report?.availableMonths?.findIndex((m) => m.value === activeMonthValue) ?? -1;
  const isFirstMonth = currentMonthIndex === 0;
  const isLastMonth = currentMonthIndex === (report?.availableMonths?.length ?? 0) - 1;

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* Top Header & Month Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Monthly Report</h1>
                {report?.isCurrentMonth && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Current Month
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed split of Food, Trampoline, and Coin sales with Cash & UPI totals
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector or Manager Role Lock */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {isAdmin ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={isLastMonth || isLoading}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="relative">
                <select
                  value={activeMonthValue}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 py-1 px-2 cursor-pointer focus:outline-hidden appearance-none pr-6"
                >
                  {report?.availableMonths?.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                disabled={isFirstMonth || isLoading}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
              <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                {report?.monthLabel || 'Current Month'} <span className="text-amber-600 font-normal">(Manager Access: Current Month Only)</span>
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh Report"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-xs font-bold transition-colors shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading state skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl border border-slate-200"></div>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium flex items-center gap-2">
          <span>Failed to load monthly report. Please try again.</span>
        </div>
      )}

      {report && !isLoading && (
        <>
          {/* Print only header */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold">KYRA POS - Monthly Sales Report</h1>
            <p className="text-sm text-slate-600">Month: {report.monthLabel}</p>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Grand Total Sales */}
            <div className="bg-linear-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
                  Total Monthly Sales
                </span>
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold">
                  <IndianRupee className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="my-3">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
                  {formatCurrency(report.summary.totalSales)}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-100 pt-2 border-t border-white/20">
                <span>{report.summary.totalTransactions} Total Transactions</span>
                <span className="font-semibold">{report.monthLabel}</span>
              </div>
            </div>

            {/* 2. Total Cash Collected */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Cash Sales
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="my-3">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {formatCurrency(report.summary.totalCash)}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>All Departments</span>
                <span className="font-bold text-amber-700">
                  {report.summary.totalSales > 0
                    ? `${Math.round((report.summary.totalCash / report.summary.totalSales) * 100)}% of Total`
                    : '0%'}
                </span>
              </div>
            </div>

            {/* 3. Total UPI Collected */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total UPI Sales
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                  <QrCode className="h-4 w-4" />
                </div>
              </div>
              <div className="my-3">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {formatCurrency(report.summary.totalUpi)}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Direct Digital Pay</span>
                <span className="font-bold text-indigo-700">
                  {report.summary.totalSales > 0
                    ? `${Math.round((report.summary.totalUpi / report.summary.totalSales) * 100)}% of Total`
                    : '0%'}
                </span>
              </div>
            </div>

            {/* 4. Food vs Games Ratio */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Revenue Stream Split
                </span>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center font-bold">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </div>
              <div className="my-2 space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-700">Food: {formatCurrency(report.foodSales.total)}</span>
                  <span className="text-purple-700">Games: {formatCurrency(report.gamesSales.total)}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{
                      width: `${
                        report.summary.totalSales > 0
                          ? (report.foodSales.total / report.summary.totalSales) * 100
                          : 0
                      }%`,
                    }}
                    title="Food Sales Share"
                  ></div>
                  <div
                    className="bg-purple-500 h-full transition-all"
                    style={{
                      width: `${
                        report.summary.totalSales > 0
                          ? (report.gamesSales.total / report.summary.totalSales) * 100
                          : 0
                      }%`,
                    }}
                    title="Games Sales Share"
                  ></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Food {report.foodSales.orderCount} orders</span>
                <span>Games {report.gamesSales.sessionCount} sessions</span>
              </div>
            </div>
          </div>

          {/* Detailed Department Split Cards (Food Sales, Trampoline, Coin Games) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Food Sales */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 font-bold">
                      <UtensilsCrossed className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Food Sales</h3>
                      <p className="text-xxs text-slate-500">{report.foodSales.orderCount} Orders Completed</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                    Restaurant POS
                  </span>
                </div>

                <div className="mt-4 mb-5">
                  <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Total Food Revenue
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {formatCurrency(report.foodSales.total)}
                  </div>
                </div>

                {/* Cash & UPI Breakdown */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100/80">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-900">Food Cash</span>
                    </div>
                    <span className="text-xs font-black font-mono text-amber-900">
                      {formatCurrency(report.foodSales.cash)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-100/80">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-900">Food UPI</span>
                    </div>
                    <span className="text-xs font-black font-mono text-indigo-900">
                      {formatCurrency(report.foodSales.upi)}
                    </span>
                  </div>

                  {report.foodSales.card > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                      <span className="text-xxs font-medium">Food Card / Other</span>
                      <span className="text-xs font-bold font-mono">{formatCurrency(report.foodSales.card)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xxs font-medium text-slate-500">
                <span>Avg Order: {report.foodSales.orderCount > 0 ? formatCurrency(report.foodSales.total / report.foodSales.orderCount) : '₹0'}</span>
                <span>{report.summary.totalSales > 0 ? `${((report.foodSales.total / report.summary.totalSales) * 100).toFixed(1)}% of Sales` : '0%'}</span>
              </div>
            </div>

            {/* Card 2: Trampoline Park */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 font-bold">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Trampoline Park</h3>
                      <p className="text-xxs text-slate-500">{report.gamesSales.trampoline.sessionCount} Sessions Booked</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">
                    Adventure
                  </span>
                </div>

                <div className="mt-4 mb-5">
                  <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Total Trampoline Sales
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {formatCurrency(report.gamesSales.trampoline.total)}
                  </div>
                </div>

                {/* Cash & UPI Breakdown */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100/80">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-900">Trampoline Cash</span>
                    </div>
                    <span className="text-xs font-black font-mono text-amber-900">
                      {formatCurrency(report.gamesSales.trampoline.cash)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-100/80">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-900">Trampoline UPI</span>
                    </div>
                    <span className="text-xs font-black font-mono text-indigo-900">
                      {formatCurrency(report.gamesSales.trampoline.upi)}
                    </span>
                  </div>

                  {report.gamesSales.trampoline.card > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                      <span className="text-xxs font-medium">Trampoline Card / Other</span>
                      <span className="text-xs font-bold font-mono">{formatCurrency(report.gamesSales.trampoline.card)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xxs font-medium text-slate-500">
                <span>Avg Session: {report.gamesSales.trampoline.sessionCount > 0 ? formatCurrency(report.gamesSales.trampoline.total / report.gamesSales.trampoline.sessionCount) : '₹0'}</span>
                <span>{report.summary.totalSales > 0 ? `${((report.gamesSales.trampoline.total / report.summary.totalSales) * 100).toFixed(1)}% of Sales` : '0%'}</span>
              </div>
            </div>

            {/* Card 3: Coin Games */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 font-bold">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">Coin Games</h3>
                      <p className="text-xxs text-slate-500">{report.gamesSales.coin.sessionCount} Packages & Plays</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                    Arcade Zone
                  </span>
                </div>

                <div className="mt-4 mb-5">
                  <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Total Coin Games Sales
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {formatCurrency(report.gamesSales.coin.total)}
                  </div>
                </div>

                {/* Cash & UPI Breakdown */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100/80">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-900">Coin Cash</span>
                    </div>
                    <span className="text-xs font-black font-mono text-amber-900">
                      {formatCurrency(report.gamesSales.coin.cash)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-100/80">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-900">Coin UPI</span>
                    </div>
                    <span className="text-xs font-black font-mono text-indigo-900">
                      {formatCurrency(report.gamesSales.coin.upi)}
                    </span>
                  </div>

                  {report.gamesSales.coin.card > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                      <span className="text-xxs font-medium">Coin Card / Other</span>
                      <span className="text-xs font-bold font-mono">{formatCurrency(report.gamesSales.coin.card)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xxs font-medium text-slate-500">
                <span>Avg Package: {report.gamesSales.coin.sessionCount > 0 ? formatCurrency(report.gamesSales.coin.total / report.gamesSales.coin.sessionCount) : '₹0'}</span>
                <span>{report.summary.totalSales > 0 ? `${((report.gamesSales.coin.total / report.summary.totalSales) * 100).toFixed(1)}% of Sales` : '0%'}</span>
              </div>
            </div>
          </div>

          {/* If there are other games like VR or Soft Play, show summary row */}
          {report.gamesSales.otherGames.total > 0 && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Gamepad2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Other Game Attractions (VR, Soft Play)</h4>
                  <p className="text-xxs text-slate-500">{report.gamesSales.otherGames.sessionCount} sessions</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-xxs text-slate-400 block font-bold">Cash</span>
                  <span className="font-bold text-slate-800 font-mono">{formatCurrency(report.gamesSales.otherGames.cash)}</span>
                </div>
                <div>
                  <span className="text-xxs text-slate-400 block font-bold">UPI</span>
                  <span className="font-bold text-slate-800 font-mono">{formatCurrency(report.gamesSales.otherGames.upi)}</span>
                </div>
                <div>
                  <span className="text-xxs text-slate-400 block font-bold">Total</span>
                  <span className="font-black text-slate-900 font-mono">{formatCurrency(report.gamesSales.otherGames.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Daily Ledger Table for the Selected Month */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm tracking-tight">
                  Daily Sales Breakdown ({report.monthLabel})
                </h3>
                <p className="text-xxs text-slate-500 mt-0.5">
                  Day-by-day split of Food, Trampoline, and Coin collections
                </p>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filter by date (e.g. 2026-11-04)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-400 bg-slate-50"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3 text-right">Food Total</th>
                    <th className="py-3 px-3 text-right text-amber-700">Food Cash</th>
                    <th className="py-3 px-3 text-right text-indigo-700">Food UPI</th>
                    <th className="py-3 px-3 text-right border-l border-slate-200">Tramp Total</th>
                    <th className="py-3 px-3 text-right text-amber-700">Tramp Cash</th>
                    <th className="py-3 px-3 text-right text-indigo-700">Tramp UPI</th>
                    <th className="py-3 px-3 text-right border-l border-slate-200">Coin Total</th>
                    <th className="py-3 px-3 text-right text-amber-700">Coin Cash</th>
                    <th className="py-3 px-3 text-right text-indigo-700">Coin UPI</th>
                    <th className="py-3 px-4 text-right bg-slate-100/60 font-black border-l border-slate-200 text-slate-900">
                      Day Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredDailyBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 font-sans text-xs">
                        No sales recorded for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyBreakdown.map((row) => {
                      const hasSales = row.totalSales > 0;
                      return (
                        <tr
                          key={row.date}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            !hasSales ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-900 whitespace-nowrap">
                            <span className="text-slate-900">{row.date}</span>
                            <span className="text-xxs font-normal text-slate-400 ml-1.5">({row.dayName})</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {formatCurrency(row.food.total)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-700">
                            {formatCurrency(row.food.cash)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-indigo-700">
                            {formatCurrency(row.food.upi)}
                          </td>

                          {/* Trampoline */}
                          <td className="py-2.5 px-3 text-right font-medium border-l border-slate-100">
                            {formatCurrency(row.trampoline.total)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-700">
                            {formatCurrency(row.trampoline.cash)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-indigo-700">
                            {formatCurrency(row.trampoline.upi)}
                          </td>

                          {/* Coin */}
                          <td className="py-2.5 px-3 text-right font-medium border-l border-slate-100">
                            {formatCurrency(row.coin.total)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-700">
                            {formatCurrency(row.coin.cash)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-indigo-700">
                            {formatCurrency(row.coin.upi)}
                          </td>

                          {/* Day Grand Total */}
                          <td className="py-2.5 px-4 text-right bg-slate-50/50 font-black text-slate-900 border-l border-slate-200">
                            {formatCurrency(row.totalSales)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 font-mono font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                    <td className="py-3.5 px-4 font-sans">MONTH TOTAL</td>
                    <td className="py-3.5 px-3 text-right">{formatCurrency(report.foodSales.total)}</td>
                    <td className="py-3.5 px-3 text-right text-amber-800">{formatCurrency(report.foodSales.cash)}</td>
                    <td className="py-3.5 px-3 text-right text-indigo-800">{formatCurrency(report.foodSales.upi)}</td>

                    <td className="py-3.5 px-3 text-right border-l border-slate-200">{formatCurrency(report.gamesSales.trampoline.total)}</td>
                    <td className="py-3.5 px-3 text-right text-amber-800">{formatCurrency(report.gamesSales.trampoline.cash)}</td>
                    <td className="py-3.5 px-3 text-right text-indigo-800">{formatCurrency(report.gamesSales.trampoline.upi)}</td>

                    <td className="py-3.5 px-3 text-right border-l border-slate-200">{formatCurrency(report.gamesSales.coin.total)}</td>
                    <td className="py-3.5 px-3 text-right text-amber-800">{formatCurrency(report.gamesSales.coin.cash)}</td>
                    <td className="py-3.5 px-3 text-right text-indigo-800">{formatCurrency(report.gamesSales.coin.upi)}</td>

                    <td className="py-3.5 px-4 text-right bg-slate-200/80 font-black text-slate-950 border-l border-slate-300 text-sm">
                      {formatCurrency(report.summary.totalSales)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

