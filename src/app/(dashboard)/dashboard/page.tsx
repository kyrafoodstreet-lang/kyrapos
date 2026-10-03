'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import {
  BarChart3,
  UtensilsCrossed,
  Coins,
  Activity,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  ShoppingBag,
  Users,
  Calendar,
  AlertCircle,
  ArrowRight,
  Clock,
  Banknote,
  Smartphone,
  CreditCard,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { PageHeader, StatusBadge } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import CashierDashboard from '@/components/dashboard/CashierDashboard';

type PeriodType = 'today' | 'weekly' | 'monthly';
type CategoryFilter = 'TOTAL' | 'FOOD' | 'TRAMPOLINE' | 'COIN_GAMES';

interface AdminDashboardData {
  period: PeriodType;
  periodLabel: string;
  startDate: string;
  endDate: string;
  kpis: {
    totalRevenue: number;
    foodSales: number;
    trampolineSales: number;
    coinGamesSales: number;
    totalTransactions: number;
    foodOrdersCount: number;
    trampolineSessionsCount: number;
    coinGamesTransactionsCount: number;
    averageTransactionValue: number;
    growth: {
      total: number | null;
      food: number | null;
      trampoline: number | null;
      coinGames: number | null;
      previousTotalRevenue: number;
    };
    mix: {
      food: number;
      trampoline: number;
      coinGames: number;
    };
  };
  trendSeries: Array<{
    key: string;
    label: string;
    date: string;
    food: number;
    trampoline: number;
    coinGames: number;
    total: number;
    transactions: number;
  }>;
  trampolineAnalytics?: {
    revenue: number;
    sessions: number;
    adults: number;
    children: number;
    averageSessionValue: number;
  };
  coinGameAnalytics?: {
    revenue: number;
    transactions: number;
    coinsSold: number;
    packages: Array<{
      name: string;
      price: number;
      sales: number;
      revenue: number;
    }>;
  };
  foodAnalytics?: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    topItems: Array<{
      name: string;
      quantity: number;
      revenue: number;
    }>;
  };
  paymentMethods?: {
    cash: number;
    upi: number;
    mixed: number;
    card: number;
  };
  todaySummary: {
    totalRevenue: number;
    foodRevenue: number;
    trampolineRevenue: number;
    coinGamesRevenue: number;
    transactions: number;
    activeSessions: number;
    completedSessions: number;
  };
  recentTransactions?: Array<{
    id: string;
    time: string;
    customer: string;
    category: 'FOOD' | 'TRAMPOLINE' | 'COIN_GAMES';
    categoryLabel: string;
    details: string;
    amount: number;
    paymentMethod: string;
    status: string;
  }>;
}

export function AdminDashboardView() {
  // Period & Date Navigation State (Default to today)
  const [period, setPeriod] = useState<PeriodType>('today');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<CategoryFilter>('TOTAL');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  // Check if current reference date is in the present period
  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    if (period === 'today') {
      return now.toDateString() === referenceDate.toDateString();
    } else if (period === 'monthly') {
      return (
        now.getFullYear() === referenceDate.getFullYear() &&
        now.getMonth() === referenceDate.getMonth()
      );
    } else {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      startOfWeek.setDate(now.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const refStart = new Date(referenceDate);
      const refDay = referenceDate.getDay();
      const refDiff = refDay === 0 ? -6 : 1 - refDay;
      refStart.setDate(referenceDate.getDate() + refDiff);
      refStart.setHours(0, 0, 0, 0);

      return startOfWeek.getTime() === refStart.getTime();
    }
  }, [period, referenceDate]);

  // Navigate periods
  const handlePrevPeriod = () => {
    const next = new Date(referenceDate);
    if (period === 'today') {
      next.setDate(next.getDate() - 1);
    } else if (period === 'monthly') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setReferenceDate(next);
  };

  const handleNextPeriod = () => {
    const next = new Date(referenceDate);
    if (period === 'today') {
      next.setDate(next.getDate() + 1);
    } else if (period === 'monthly') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setReferenceDate(next);
  };

  // Format date query string for API
  const dateQueryStr = useMemo(() => {
    const yyyy = referenceDate.getFullYear();
    const mm = String(referenceDate.getMonth() + 1).padStart(2, '0');
    const dd = String(referenceDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [referenceDate]);

  // Query Dashboard Analytics
  const { data, isLoading, error, refetch } = useQuery<AdminDashboardData>({
    queryKey: ['adminDashboard', period, dateQueryStr],
    queryFn: async () => {
      const res = await api.get(`/reports/admin-dashboard?period=${period}&date=${dateQueryStr}`);
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Calculate Chart Points & SVG paths
  const chartConfig = useMemo(() => {
    if (!data || !data.trendSeries || data.trendSeries.length === 0) {
      return {
        points: [] as Array<{ x: number; y: number; val: number; item: any; idx: number }>,
        maxVal: 100,
        pathD: '',
        areaD: '',
        yTicks: [] as Array<{ val: number; y: number }>,
        xLabels: [] as Array<{ x: number; label: string }>,
        width: 800,
        height: 240,
      };
    }

    const series = data.trendSeries;
    const values = series.map((s) => {
      if (activeCategoryFilter === 'FOOD') return s.food;
      if (activeCategoryFilter === 'TRAMPOLINE') return s.trampoline;
      if (activeCategoryFilter === 'COIN_GAMES') return s.coinGames;
      return s.total;
    });

    const rawMax = Math.max(...values, 500);
    const maxVal = Math.ceil(rawMax / 500) * 500 || 2000;

    const width = 800;
    const height = 240;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const points = series.map((s, idx) => {
      const val = values[idx];
      const x =
        series.length === 1
          ? paddingLeft + chartW / 2
          : paddingLeft + (idx / (series.length - 1)) * chartW;
      const y = paddingTop + chartH - (val / maxVal) * chartH;
      return {
        x,
        y,
        val,
        item: s,
        idx,
      };
    });

    // Create smooth curved path (Bezier curve)
    let pathD = '';
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpX = (p0.x + p1.x) / 2;
        pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
      }
    }

    const areaD =
      points.length > 0
        ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${
            paddingTop + chartH
          } Z`
        : '';

    // Y-Axis Ticks
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const val = Math.round(maxVal * ratio);
      const y = paddingTop + chartH - ratio * chartH;
      return { val, y };
    });

    // Pick representative X-Axis labels
    let xLabels: Array<{ x: number; label: string }> = [];
    if (period === 'monthly') {
      const targetDays = [1, 5, 10, 15, 20, 25, series.length];
      xLabels = targetDays
        .filter((d) => d <= series.length)
        .map((d) => {
          const pt = points[d - 1];
          return pt ? { x: pt.x, label: `${d} ${referenceDate.toLocaleString('default', { month: 'short' })}` } : null;
        })
        .filter(Boolean) as Array<{ x: number; label: string }>;
    } else {
      xLabels = points.map((pt) => ({ x: pt.x, label: pt.item.label }));
    }

    return { points, maxVal, pathD, areaD, yTicks, xLabels, width, height, chartH, paddingTop };
  }, [data, activeCategoryFilter, period, referenceDate]);

  // Selected tooltip point
  const activeTooltipPoint = useMemo(() => {
    if (!chartConfig.points || chartConfig.points.length === 0) return null;
    if (selectedPointIndex !== null && chartConfig.points[selectedPointIndex]) {
      return chartConfig.points[selectedPointIndex];
    }
    const defaultIdx = Math.min(
      Math.floor(chartConfig.points.length * 0.65),
      chartConfig.points.length - 1
    );
    return chartConfig.points[defaultIdx];
  }, [chartConfig.points, selectedPointIndex]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#D94949] border-t-transparent"></div>
        <p className="text-xs font-semibold text-slate-400">Loading Business Analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-3">
        <AlertCircle className="h-7 w-7 text-[#D94949]" />
        <h3 className="font-bold text-xs">Failed to load Dashboard</h3>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#D94949] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#C53B3B] transition-all flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const { kpis, todaySummary, recentTransactions } = data;

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 animate-fade-in text-slate-700">
      {/* ========================================================= */}
      {/* 1. ADMIN DASHBOARD HEADER & PERIOD CONTROLS */}
      {/* ========================================================= */}
      <PageHeader
        title="Admin Dashboard"
        description="Business overview & revenue performance"
        icon={<BarChart3 className="h-5 w-5" />}
        action={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Today / Weekly / Monthly Pills */}
            <div className="bg-slate-100/90 p-1 rounded-xl flex items-center border border-slate-200/80 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setPeriod('today')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  period === 'today'
                    ? 'bg-[#D94949] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setPeriod('weekly')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  period === 'weekly'
                    ? 'bg-[#D94949] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  period === 'monthly'
                    ? 'bg-[#D94949] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Date Selector / Stepper */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 shadow-xxs">
              <button
                type="button"
                onClick={handlePrevPeriod}
                title="Previous"
                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-800 min-w-[120px] justify-center font-mono">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{data.periodLabel}</span>
              </div>

              <button
                type="button"
                onClick={handleNextPeriod}
                title="Next"
                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              {isCurrentPeriod && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#009966] bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#009966] animate-pulse"></span>
                  <span>Live</span>
                </span>
              )}
            </div>

            {/* Quick Access to Bill Management */}
            <Link
              href="/admin/bills"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all text-xs font-bold shadow-xs shrink-0"
            >
              <Receipt className="h-3.5 w-3.5 text-slate-300" />
              <span>Bill Management</span>
            </Link>
          </div>
        }
      />

      {/* ========================================================= */}
      {/* 2. TOP KPI CARDS (4 Columns) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CARD 1: TOTAL REVENUE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none transition-all group-hover:bg-rose-100/50" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-[#D94949] border border-rose-100/80 flex items-center justify-center font-bold shrink-0">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
              <span className="truncate max-w-[85px] sm:max-w-none">Total Revenue</span>
              <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            </div>
          </div>

          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              ₹{kpis.totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xxs">
            {kpis.growth.total !== null ? (
              <>
                <span
                  className={`flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[10px] sm:text-xxs font-mono ${
                    kpis.growth.total >= 0
                      ? 'bg-emerald-50 text-[#009966] border border-emerald-200/80'
                      : 'bg-rose-50 text-rose-600 border border-rose-200/80'
                  }`}
                >
                  {kpis.growth.total >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{kpis.growth.total >= 0 ? `+${kpis.growth.total}%` : `${kpis.growth.total}%`}</span>
                </span>
                <span className="text-slate-400 font-medium text-[10px] sm:text-xxs truncate">
                  vs last {period === 'today' ? 'day' : period === 'weekly' ? 'week' : 'month'}
                </span>
              </>
            ) : (
              <span className="text-slate-400 font-medium text-[10px] sm:text-xxs font-mono">
                {kpis.totalTransactions} transactions
              </span>
            )}
          </div>
        </div>

        {/* CARD 2: FOOD SALES */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50/50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none transition-all group-hover:bg-sky-100/50" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100/80 flex items-center justify-center font-bold shrink-0">
              <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
              <span className="truncate max-w-[85px] sm:max-w-none">Food Sales</span>
              <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            </div>
          </div>

          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              ₹{kpis.foodSales.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 text-xxs">
            <span className="inline-block font-bold text-sky-700 bg-sky-50 border border-sky-100/80 px-1.5 py-0.5 rounded text-[10px] sm:text-xxs font-mono">
              {kpis.mix.food}% of revenue
            </span>
            <span className="text-[10px] sm:text-xxs text-slate-400 font-medium truncate font-mono">
              {kpis.foodOrdersCount} orders
            </span>
          </div>
        </div>

        {/* CARD 3: TRAMPOLINE SALES */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none transition-all group-hover:bg-emerald-100/50" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-[#009966] border border-emerald-100/80 flex items-center justify-center font-bold shrink-0">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
              <span className="truncate max-w-[85px] sm:max-w-none">Trampoline Sales</span>
              <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            </div>
          </div>

          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              ₹{kpis.trampolineSales.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 text-xxs">
            <span className="inline-block font-bold text-[#009966] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] sm:text-xxs font-mono">
              {kpis.mix.trampoline}% of revenue
            </span>
            <span className="text-[10px] sm:text-xxs text-slate-400 font-medium truncate font-mono">
              {kpis.trampolineSessionsCount} sessions
            </span>
          </div>
        </div>

        {/* CARD 4: COIN GAMES */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none transition-all group-hover:bg-amber-100/50" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/80 flex items-center justify-center font-bold shrink-0">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
              <span className="truncate max-w-[85px] sm:max-w-none">Coin Games</span>
              <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            </div>
          </div>

          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              ₹{kpis.coinGamesSales.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 text-xxs">
            <span className="inline-block font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] sm:text-xxs font-mono">
              {kpis.mix.coinGames}% of revenue
            </span>
            <span className="text-[10px] sm:text-xxs text-slate-400 font-medium truncate font-mono">
              {kpis.coinGamesTransactionsCount} sales
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2.5 DESKTOP EXECUTIVE STATS STRIP */}
      {/* ========================================================= */}
      <div className="hidden md:grid md:grid-cols-4 gap-3 bg-slate-900 text-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3 border-r border-slate-800/80 pr-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-rose-400 font-bold shrink-0">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Total Transactions
            </span>
            <span className="text-base font-black text-white font-mono tabular-nums">
              {kpis.totalTransactions}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-r border-slate-800/80 pr-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 font-bold shrink-0">
            <Banknote className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Avg Transaction Value (ATV)
            </span>
            <span className="text-base font-black text-white font-mono tabular-nums">
              ₹{kpis.averageTransactionValue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-r border-slate-800/80 pr-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sky-400 font-bold shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Live Active Sessions
            </span>
            <span className="text-base font-black text-white flex items-center gap-1.5 font-mono tabular-nums">
              <span>{todaySummary.activeSessions}</span>
              {todaySummary.activeSessions > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pl-1">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Payment Mix (Cash/UPI)
            </span>
            <div className="flex items-center gap-2 mt-0.5 text-xs font-semibold font-mono">
              <span className="text-emerald-400">
                ₹{((data.paymentMethods?.upi || 0) / 1000).toFixed(1)}k UPI
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400">
                ₹{((data.paymentMethods?.cash || 0) / 1000).toFixed(1)}k Cash
              </span>
            </div>
          </div>
          <Link
            href="/reports/financial"
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xxs font-bold transition-all"
          >
            Audit
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT GRID (Desktop 2-Col Layout) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* LEFT COLUMN: REVENUE TREND, CATEGORY DEEP DIVES & TRANSACTIONS (Desktop 8/12) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4 sm:space-y-5">
          {/* REVENUE TREND CARD */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Revenue Trend
                </h2>
                <span className="text-[10px] text-slate-400 capitalize block mt-0.5">
                  {period === 'today' ? 'Hourly breakdown' : period === 'weekly' ? 'Daily breakdown' : 'Monthly timeline'}
                </span>
              </div>

              {/* Horizontally scrollable category filter pills */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/70 text-xxs overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter('TOTAL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategoryFilter === 'TOTAL'
                      ? 'bg-rose-50 text-[#D94949] border border-rose-200 shadow-xxs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Total
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter('FOOD')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategoryFilter === 'FOOD'
                      ? 'bg-rose-50 text-[#D94949] border border-rose-200 shadow-xxs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Food
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter('TRAMPOLINE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategoryFilter === 'TRAMPOLINE'
                      ? 'bg-rose-50 text-[#D94949] border border-rose-200 shadow-xxs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Trampoline
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryFilter('COIN_GAMES')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategoryFilter === 'COIN_GAMES'
                      ? 'bg-rose-50 text-[#D94949] border border-rose-200 shadow-xxs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Coin Games
                </button>
              </div>
            </div>

            {/* SVG Responsive Line Chart */}
            <div className="relative w-full overflow-hidden pt-1">
              <div className="w-full h-52 sm:h-64">
                <svg
                  viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="mobileTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D94949" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#D94949" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {chartConfig.yTicks.map((tick, i) => (
                    <g key={i}>
                      <line
                        x1="45"
                        y1={tick.y}
                        x2={chartConfig.width - 20}
                        y2={tick.y}
                        stroke="#F1F5F9"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x="40"
                        y={tick.y + 3}
                        textAnchor="end"
                        className="text-[9px] fill-slate-400 font-mono font-medium"
                      >
                        {tick.val.toLocaleString()}
                      </text>
                    </g>
                  ))}

                  {/* Area Gradient */}
                  {chartConfig.areaD && (
                    <path d={chartConfig.areaD} fill="url(#mobileTrendGrad)" />
                  )}

                  {/* Vertical Dashed Guideline to active point */}
                  {activeTooltipPoint && (
                    <line
                      x1={activeTooltipPoint.x}
                      y1={activeTooltipPoint.y}
                      x2={activeTooltipPoint.x}
                      y2={chartConfig.height - 30}
                      stroke="#94A3B8"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  )}

                  {/* Trend Curved Path */}
                  {chartConfig.pathD && (
                    <path
                      d={chartConfig.pathD}
                      fill="none"
                      stroke="#D94949"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data Points */}
                  {chartConfig.points.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={activeTooltipPoint?.idx === i ? 5.5 : 3.5}
                      fill="#D94949"
                      stroke="#FFFFFF"
                      strokeWidth={activeTooltipPoint?.idx === i ? 2.5 : 1.5}
                      className="transition-all cursor-pointer"
                      onClick={() => setSelectedPointIndex(i)}
                    />
                  ))}

                  {/* X-Axis Tick Labels */}
                  {chartConfig.xLabels.map((lbl, i) => (
                    <text
                      key={i}
                      x={lbl.x}
                      y={chartConfig.height - 10}
                      textAnchor="middle"
                      className="text-[10px] font-medium fill-slate-400 font-mono"
                    >
                      {lbl.label}
                    </text>
                  ))}
                </svg>
              </div>

              {/* Interactive Tooltip Card */}
              {activeTooltipPoint && (
                <div
                  className="absolute bg-white text-slate-800 rounded-xl px-3 py-1.5 shadow-md border border-slate-200 pointer-events-none text-center text-xs z-10 transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(activeTooltipPoint.x / chartConfig.width) * 100}%`,
                    top: `${Math.max(10, (activeTooltipPoint.y / chartConfig.height) * 100 - 8)}%`,
                  }}
                >
                  <span className="text-[10px] text-slate-400 font-semibold block leading-tight font-mono">
                    {activeTooltipPoint.item.date}
                  </span>
                  <span className="text-xs font-black text-slate-900 block leading-tight font-mono">
                    ₹{activeTooltipPoint.val.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium block font-mono">
                    {activeTooltipPoint.item.transactions || 0} orders
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DESKTOP EXCLUSIVE: CATEGORY DEEP DIVE SECTION */}
          <div className="hidden md:grid md:grid-cols-2 gap-4">
            {/* TRAMPOLINE DEEP-DIVE CARD */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#009966] flex items-center justify-center font-bold">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Trampoline Insights</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Jumping sessions & guest mix</p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#009966] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-mono">
                  ₹{kpis.trampolineSales.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Sessions</span>
                  <span className="text-sm font-black text-slate-800 font-mono">
                    {data.trampolineAnalytics?.sessions || kpis.trampolineSessionsCount}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Adults / Kids</span>
                  <span className="text-sm font-black text-slate-800 font-mono">
                    {data.trampolineAnalytics?.adults || 0} / {data.trampolineAnalytics?.children || 0}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Avg Session</span>
                  <span className="text-sm font-black text-slate-800 font-mono">
                    ₹{data.trampolineAnalytics?.averageSessionValue || (kpis.trampolineSessionsCount > 0 ? Math.round(kpis.trampolineSales / kpis.trampolineSessionsCount) : 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* COIN GAMES DEEP-DIVE CARD */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Coins className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Coin Tokens & Packs</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Token packages sold</p>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 font-mono">
                  ₹{kpis.coinGamesSales.toLocaleString()}
                </span>
              </div>

              <div className="space-y-1.5">
                {data.coinGameAnalytics?.packages && data.coinGameAnalytics.packages.length > 0 ? (
                  data.coinGameAnalytics.packages.map((pkg, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                      <span className="font-semibold text-slate-700 text-xxs">{pkg.name}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[10px] text-slate-400 font-medium">{pkg.sales} sales</span>
                        <span className="font-bold text-slate-900 text-xxs">₹{pkg.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-[11px] text-slate-400 font-mono">
                    {kpis.coinGamesTransactionsCount} coin sales recorded
                  </div>
                )}
              </div>
            </div>

            {/* FOOD & BEVERAGE TOP ITEMS */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                    <UtensilsCrossed className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Top Selling Food</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Best performing menu dishes</p>
                  </div>
                </div>
                <span className="text-xs font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100 font-mono">
                  {data.foodAnalytics?.orders || kpis.foodOrdersCount} Orders
                </span>
              </div>

              <div className="space-y-1.5">
                {data.foodAnalytics?.topItems && data.foodAnalytics.topItems.length > 0 ? (
                  data.foodAnalytics.topItems.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                      <span className="font-semibold text-slate-700 truncate max-w-[140px] text-xxs">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[10px] text-slate-400 font-medium">{item.quantity} qty</span>
                        <span className="font-bold text-slate-900 text-xxs">₹{item.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-[11px] text-slate-400 font-mono">
                    No food sales items in this period
                  </div>
                )}
              </div>
            </div>

            {/* PAYMENT METHODS BREAKDOWN */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Payment Channels</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Settlement mode split</p>
                  </div>
                </div>
                <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100 font-mono">
                  ₹{kpis.totalRevenue.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-0.5">
                    <span>UPI / QR</span>
                    <span className="text-[#009966]">
                      {kpis.totalRevenue > 0
                        ? `${Math.round(((data.paymentMethods?.upi || 0) / kpis.totalRevenue) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-800">
                    ₹{(data.paymentMethods?.upi || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-2 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-0.5">
                    <span>Cash</span>
                    <span className="text-amber-600">
                      {kpis.totalRevenue > 0
                        ? `${Math.round(((data.paymentMethods?.cash || 0) / kpis.totalRevenue) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-800">
                    ₹{(data.paymentMethods?.cash || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DESKTOP RECENT TRANSACTIONS TABLE */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Recent Transactions
                </h2>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Latest customer orders and game sessions
                </span>
              </div>

              <div className="flex gap-2">
                <Link
                  href="/games/sessions"
                  className="text-[11px] font-bold text-[#D94949] hover:underline flex items-center gap-1"
                >
                  <span>Games</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <span className="text-slate-300">•</span>
                <Link
                  href="/sales-history"
                  className="text-[11px] font-bold text-sky-600 hover:underline flex items-center gap-1"
                >
                  <span>Food</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                    <th className="px-3 py-2.5 rounded-l-lg">Time</th>
                    <th className="px-3 py-2.5">Customer</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Details</th>
                    <th className="px-3 py-2.5">Amount</th>
                    <th className="px-3 py-2.5">Payment</th>
                    <th className="px-3 py-2.5 text-right rounded-r-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {!recentTransactions || recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-400 text-xs font-mono">
                        No transactions recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.slice(0, 8).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 font-medium transition-colors">
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-xxs font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>
                              {new Date(tx.time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>
                        </td>

                        <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap text-xs">
                          {tx.customer}
                        </td>

                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {tx.category === 'TRAMPOLINE' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-[#D94949] border border-rose-200 inline-flex items-center gap-1 font-mono">
                              <Activity className="h-3 w-3" />
                              <span>Trampoline</span>
                            </span>
                          )}
                          {tx.category === 'COIN_GAMES' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1 font-mono">
                              <Coins className="h-3 w-3" />
                              <span>Coin Games</span>
                            </span>
                          )}
                          {tx.category === 'FOOD' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-1 font-mono">
                              <UtensilsCrossed className="h-3 w-3" />
                              <span>Food</span>
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-slate-600 max-w-[160px] truncate text-xxs">
                          {tx.details}
                        </td>

                        <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap text-xs font-mono tabular-nums">
                          ₹{tx.amount.toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                            {tx.paymentMethod}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <StatusBadge
                            status={tx.status}
                            size="sm"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SALES BREAKDOWN, TODAY'S SUMMARY & QUICK ACTIONS (Desktop 4/12) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4 sm:space-y-5">
          {/* SALES BREAKDOWN CARD */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Sales Breakdown
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                Contribution %
              </span>
            </div>

            <div className="space-y-3">
              {/* FOOD ROW */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 w-20 shrink-0">Food</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0284C7] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, kpis.mix.food)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-400 w-12 text-right shrink-0 font-mono">
                  {kpis.mix.food}%
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 w-16 text-right shrink-0 font-mono tabular-nums">
                  ₹{kpis.foodSales.toLocaleString()}
                </span>
              </div>

              {/* TRAMPOLINE ROW */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#009966] flex items-center justify-center font-bold shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 w-20 shrink-0">Trampoline</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#009966] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, kpis.mix.trampoline)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-400 w-12 text-right shrink-0 font-mono">
                  {kpis.mix.trampoline}%
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 w-16 text-right shrink-0 font-mono tabular-nums">
                  ₹{kpis.trampolineSales.toLocaleString()}
                </span>
              </div>

              {/* COIN GAMES ROW */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                  <Coins className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 w-20 shrink-0">Coin Games</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, kpis.mix.coinGames)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-400 w-12 text-right shrink-0 font-mono">
                  {kpis.mix.coinGames}%
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 w-16 text-right shrink-0 font-mono tabular-nums">
                  ₹{kpis.coinGamesSales.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* TODAY'S SUMMARY CARD */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Today&apos;s Summary
              </h2>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-[#D94949] border border-rose-100 rounded-lg text-xxs font-bold font-mono">
                <Calendar className="h-3 w-3" />
                <span>{todayFormatted}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Revenue */}
              <div className="p-3 bg-white border border-slate-200/70 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#D94949] flex items-center justify-center font-bold shrink-0">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">
                    Revenue
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 leading-tight font-mono tabular-nums">
                    ₹{todaySummary.totalRevenue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Transactions */}
              <div className="p-3 bg-white border border-slate-200/70 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">
                    Transactions
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 leading-tight font-mono tabular-nums">
                    {todaySummary.transactions}
                  </span>
                </div>
              </div>

              {/* Food Orders */}
              <div className="p-3 bg-white border border-slate-200/70 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">
                    Food Orders
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 leading-tight font-mono tabular-nums">
                    {data.foodAnalytics?.orders || kpis.foodOrdersCount || 0}
                  </span>
                </div>
              </div>

              {/* Sessions */}
              <div className="p-3 bg-white border border-slate-200/70 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#009966] flex items-center justify-center font-bold shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block leading-tight">
                    Sessions
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 leading-tight font-mono tabular-nums">
                    {todaySummary.activeSessions + todaySummary.completedSessions}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DESKTOP QUICK ACTIONS & OPERATIONS */}
          <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Quick POS Actions
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/games/sessions/new"
                className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/60 hover:bg-rose-100/80 text-[#D94949] transition-all flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <Activity className="h-5 w-5" />
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold leading-tight">New Game Session</span>
                <span className="text-[10px] text-rose-500/80 leading-tight">Trampoline & Coins</span>
              </Link>

              <Link
                href="/pos"
                className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/60 hover:bg-sky-100/80 text-sky-700 transition-all flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <UtensilsCrossed className="h-5 w-5" />
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold leading-tight">Food POS Billing</span>
                <span className="text-[10px] text-sky-500 leading-tight">Kitchen & Dine-in</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'CASHIER') {
    return <CashierDashboard />;
  }

  return <AdminDashboardView />;
}
