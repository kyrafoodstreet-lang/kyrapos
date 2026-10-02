'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Wallet,
  Coins,
  CreditCard,
  Layers,
  Utensils,
  GlassWater,
  Cake,
  Gamepad,
  Sparkles,
  Award,
  ChevronRight,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface CategorySale {
  category: string;
  revenue: number;
}

interface TopCategory {
  name: string;
  revenue: number;
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface ExecutiveSummaryData {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
  };
  categoryWiseSales: {
    foodSales: number;
    beverageSales: number;
    dessertSales: number;
    gamesRevenue: number;
    otherCategories: CategorySale[];
  };
  topSellingCategories: TopCategory[];
  topSellingItems: TopItem[];
  paymentBreakdown: {
    cash: number;
    upi: number;
    card: number;
  };
  orderTypeBreakdown: {
    dineIn: number;
    takeaway: number;
    delivery: number;
  };
  todaySalesTrend: { time: string; revenue: number }[];
}

export default function ExecutiveSummaryPage() {
  const user = useAuthStore((state) => state.user);
  const isAuthorized = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data, isLoading, error } = useQuery<ExecutiveSummaryData>({
    queryKey: ['executiveSummary'],
    queryFn: async () => {
      const res = await api.get('/reports/executive-summary');
      return res.data;
    },
    enabled: isAuthorized,
    refetchInterval: 15000, // Refetch every 15s for live dashboard
  });

  // Frontend Role Guard
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto mt-12 text-center">
        <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100 animate-bounce">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Access Denied</h2>
        <p className="text-xs text-slate-500 leading-normal">
          You do not have the required permissions to view the Executive Summary dashboard. This page is restricted to Admin and Manager roles.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-20 bg-white rounded-xl border border-slate-200 p-6">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-slate-100 rounded w-1/3"></div>
        </div>

        {/* KPIs Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 p-6">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-slate-300 rounded w-3/4"></div>
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="h-80 bg-white rounded-xl border border-slate-200"></div>

        {/* Bottom Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-white rounded-xl border border-slate-200 lg:col-span-2"></div>
          <div className="h-96 bg-white rounded-xl border border-slate-200"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load Executive Summary analytics. Please ensure the backend is running.</span>
      </div>
    );
  }

  const {
    kpis,
    categoryWiseSales,
    topSellingCategories,
    topSellingItems,
    paymentBreakdown,
    orderTypeBreakdown,
    todaySalesTrend,
  } = data;

  const kpiCards = [
    {
      name: 'Total Revenue',
      value: `₹${Number(kpis.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      bgColor: 'bg-emerald-50 text-emerald-600',
    },
    {
      name: 'Total Orders',
      value: kpis.totalOrders.toLocaleString(),
      icon: ShoppingBag,
      bgColor: 'bg-indigo-50 text-indigo-600',
    },
    {
      name: 'Total Customers',
      value: kpis.totalCustomers.toLocaleString(),
      icon: Users,
      bgColor: 'bg-blue-50 text-blue-600',
    },
    {
      name: 'Avg Order Value',
      value: `₹${Number(kpis.averageOrderValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Wallet,
      bgColor: 'bg-purple-50 text-purple-600',
    },
  ];

  // Category breakdown for representation
  const categorySalesList = [
    { name: 'Food Sales', value: categoryWiseSales.foodSales, icon: Utensils, color: 'text-orange-500 bg-orange-50' },
    { name: 'Beverage Sales', value: categoryWiseSales.beverageSales, icon: GlassWater, color: 'text-cyan-500 bg-cyan-50' },
    { name: 'Dessert Sales', value: categoryWiseSales.dessertSales, icon: Cake, color: 'text-pink-500 bg-pink-50' },
    { name: 'Games Revenue', value: categoryWiseSales.gamesRevenue, icon: Gamepad, color: 'text-purple-500 bg-purple-50' },
    ...categoryWiseSales.otherCategories.map((oc) => ({
      name: `${oc.category} Sales`,
      value: oc.revenue,
      icon: Layers,
      color: 'text-slate-500 bg-slate-50',
    })),
  ];

  // Recharts Payment Breakdown data
  const paymentChartData = [
    { name: 'Cash', value: paymentBreakdown.cash, color: '#10b981' },
    { name: 'UPI', value: paymentBreakdown.upi, color: '#3b82f6' },
    { name: 'Card', value: paymentBreakdown.card, color: '#f59e0b' },
  ].filter((p) => p.value > 0);

  // Recharts Order Types breakdown
  const orderTypeChartData = [
    { name: 'Dine-In', value: orderTypeBreakdown.dineIn, color: '#6366f1' },
    { name: 'Takeaway', value: orderTypeBreakdown.takeaway, color: '#14b8a6' },
    { name: 'Delivery', value: orderTypeBreakdown.delivery, color: '#f43f5e' },
  ].filter((o) => o.value > 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span>Executive Business Summary</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of today's consolidated operations including food POS and arcade gaming collections.
          </p>
        </div>
        <div className="bg-slate-100 text-slate-805 text-xxs font-bold px-3 py-1.5 rounded-lg border border-slate-200">
          Live Tracker Active
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">{card.name}</span>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">{card.value}</h3>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center border border-slate-100 ${card.bgColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Hourly Sales Area Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-4">Today's Sales Trend (Hourly)</h3>
        <div className="h-80 w-full">
          {todaySalesTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-405 text-xs">No transactions recorded today yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={todaySalesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <RechartsTooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} labelClassName="font-semibold text-slate-800 text-xs" />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Breakdowns & Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Category Sales List */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm tracking-tight">Category-wise Sales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categorySalesList.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div key={idx} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cat.color} shrink-0`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{cat.name}</span>
                    <span className="text-sm font-black text-slate-850 truncate block mt-0.5">
                      ₹{Number(cat.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Top Category Rankings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
            <Award className="h-4.5 w-4.5 text-amber-500" />
            <span>Top Selling Categories</span>
          </h3>
          <div className="space-y-3">
            {topSellingCategories.length === 0 ? (
              <div className="text-slate-400 text-xs py-4 text-center">No categories ranked yet.</div>
            ) : (
              topSellingCategories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      idx === 0 ? 'bg-amber-100 text-amber-800' :
                      idx === 1 ? 'bg-slate-200 text-slate-800' :
                      idx === 2 ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{idx + 1}</span>
                    <span className="font-bold text-slate-700 truncate">{cat.name}</span>
                  </div>
                  <span className="font-black text-slate-850 ml-2 shrink-0">
                    ₹{Number(cat.revenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Item Tables & Payment Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Top Items Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Top Selling Items Today</h3>
          </div>
          <div className="overflow-x-auto">
            {topSellingItems.length === 0 ? (
              <div className="p-8 text-center text-slate-405 text-xs">No items sold today yet.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                    <th className="px-6 py-3">Item Name</th>
                    <th className="px-6 py-3">Qty Sold</th>
                    <th className="px-6 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {topSellingItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4">{item.quantity} units</td>
                      <td className="px-6 py-4 text-right font-black text-slate-800">₹{Number(item.revenue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Payment Splits & Order Types */}
        <div className="space-y-6">
          {/* Payment Method Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Payment Collections Split</h3>
            <div className="flex items-center justify-around gap-4">
              {paymentChartData.length === 0 ? (
                <div className="text-slate-400 text-xs py-4 text-center">No payment splits today.</div>
              ) : (
                <>
                  <div className="h-28 w-28 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={45}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {paymentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xxs w-full">
                    {paymentChartData.map((entry, index) => {
                      const total = paymentChartData.reduce((s, p) => s + p.value, 0);
                      const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                      return (
                        <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            {entry.name}
                          </span>
                          <span className="font-bold text-slate-800">{percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Order Type Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">POS Billing Order Types</h3>
            <div className="flex items-center justify-around gap-4">
              {orderTypeChartData.length === 0 ? (
                <div className="text-slate-405 text-xs py-4 text-center">No billing types completed.</div>
              ) : (
                <>
                  <div className="h-28 w-28 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderTypeChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={45}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {orderTypeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xxs w-full">
                    {orderTypeChartData.map((entry, index) => {
                      const total = orderTypeChartData.reduce((s, o) => s + o.value, 0);
                      const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                      return (
                        <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            {entry.name}
                          </span>
                          <span className="font-bold text-slate-800">{percent}% ({entry.value})</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
