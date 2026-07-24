'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Wallet,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';

interface RecentOrder {
  id: string;
  orderNumber: number;
  type: string;
  status: string;
  grandTotal: number;
  tableNumber: string | null;
  createdAt: string;
}

interface TopItem {
  name: string;
  qty: number;
  total: number;
}

interface DashboardStats {
  salesToday: number;
  totalOrdersCount: number;
  activeTables: number;
  expensesToday: number;
  topSelling: TopItem[];
  recentOrders: RecentOrder[];
  shiftActive: boolean;
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard');
      return res.data;
    },
    refetchInterval: 10000, // Autorefresh every 10 seconds for real-time sales reporting
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load dashboard metrics. Ensure backend server is running.</span>
      </div>
    );
  }

  const kpis = [
    {
      name: "Today's Sales",
      value: `₹${Number(stats.salesToday).toFixed(2)}`,
      icon: TrendingUp,
      color: "bg-primary",
      textColor: "text-primary",
      bgColor: "bg-primary-light",
    },
    {
      name: "Total Orders",
      value: stats.totalOrdersCount.toString(),
      icon: ShoppingBag,
      color: "bg-slate-500",
      textColor: "text-slate-500",
      bgColor: "bg-slate-50",
    },
    {
      name: "Expenses Today",
      value: `₹${Number(stats.expensesToday).toFixed(2)}`,
      icon: Wallet,
      color: "bg-slate-500",
      textColor: "text-slate-500",
      bgColor: "bg-slate-50",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'PREPARING':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'READY':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SERVED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Shift status banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${
        stats.shiftActive 
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
          : 'bg-amber-50 text-amber-800 border-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          {stats.shiftActive ? (
            <ShieldCheck className="h-5 w-5 text-emerald-600 animate-pulse" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-600 animate-bounce" />
          )}
          <div>
            <h4 className="font-semibold text-xs text-slate-800">
              {stats.shiftActive ? 'Cashier Shift Active' : 'No Cashier Shift is Currently Open'}
            </h4>
            <p className="text-xxs opacity-90 font-medium">
              {stats.shiftActive 
                ? 'Billing synchronization is live.' 
                : 'Cashiers must open a shift before billing orders.'}
            </p>
          </div>
        </div>
        <Link 
          href="/shifts" 
          className={`px-4 py-2 text-xxs font-semibold rounded-lg shadow-sm active-press transition-colors ${
            stats.shiftActive 
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white' 
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {stats.shiftActive ? 'Manage Shift' : 'Open Shift Now'}
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.name} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.name}</span>
                <h3 className="text-xl font-semibold text-slate-800">{kpi.value}</h3>
              </div>
              <div className={`h-11 w-11 rounded-lg ${kpi.bgColor} flex items-center justify-center border border-slate-200/50`}>
                <Icon className={`h-5 w-5 ${kpi.textColor}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm tracking-tight">Recent Order Tickets</h3>
            <Link href="/pos" className="text-xxs text-primary hover:text-primary-hover font-semibold flex items-center gap-1">
              <span>Go to POS</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            {stats.recentOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No orders logged today yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                    <th className="px-6 py-3">Order No</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Grand Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 font-medium">
                      <td className="px-6 py-4 font-semibold text-slate-900">#{order.orderNumber}</td>
                      <td className="px-6 py-4 capitalize">
                        {order.type.toLowerCase().replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">₹{Number(order.grandTotal).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xxs font-semibold border ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-right">
                        <span className="flex items-center justify-end gap-1 text-xxs font-semibold">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top items selling */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col p-6 space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm tracking-tight">Top Selling Items Today</h3>
          <div className="flex-1 space-y-4">
            {stats.topSelling.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No selling data logged today.
              </div>
            ) : (
              stats.topSelling.map((item, idx) => {
                // Find highest sales qty for scale
                const maxQty = Math.max(...stats.topSelling.map(i => i.qty));
                const percent = maxQty > 0 ? (item.qty / maxQty) * 100 : 0;
                
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xxs font-semibold text-slate-500">
                      <span className="text-slate-800">{idx + 1}. {item.name}</span>
                      <span className="text-slate-400">{item.qty} sold (₹{Number(item.total).toFixed(0)})</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
