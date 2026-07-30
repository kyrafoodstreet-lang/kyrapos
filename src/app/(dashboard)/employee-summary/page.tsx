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
  CreditCard,
  CircleDollarSign,
  Clock,
  ArrowUpRight,
  FileText,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  User as UserIcon
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

export default function EmployeeSummaryPage() {
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, error } = useQuery<EmployeeSummaryData>({
    queryKey: ['employeeSummary'],
    queryFn: async () => {
      const res = await api.get('/reports/employee-summary');
      return res.data;
    },
    refetchInterval: 10000, // Autorefresh every 10s for real-time reporting
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse p-6">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-slate-100 rounded w-1/3"></div>
        </div>

        {/* KPIs Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse p-6">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-slate-300 rounded w-3/4"></div>
            </div>
          ))}
        </div>

        {/* Details Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
          <div className="h-96 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load your performance metrics. Ensure the backend server is running.</span>
      </div>
    );
  }

  const { kpis, paymentBreakdown, billingActivityTimeline, recentTransactions, shiftInfo } = data;

  // Recharts Payment Data
  const paymentChartData = [
    { name: 'Cash', value: paymentBreakdown.cash, color: '#10b981' },
    { name: 'UPI', value: paymentBreakdown.upi, color: '#3b82f6' },
    { name: 'Card', value: paymentBreakdown.card, color: '#f59e0b' },
  ].filter((p) => p.value > 0);

  const kpiCards = [
    {
      name: 'Total Sales',
      value: `₹${Number(kpis.totalSales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      bgColor: 'bg-emerald-50 text-emerald-600',
    },
    {
      name: 'Cash Collection',
      value: `₹${Number(kpis.cashCollection).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Wallet,
      bgColor: 'bg-teal-50 text-teal-600',
    },
    {
      name: 'UPI Collection',
      value: `₹${Number(kpis.upiCollection).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: CircleDollarSign,
      bgColor: 'bg-blue-50 text-blue-600',
    },
    {
      name: 'Card Collection',
      value: `₹${Number(kpis.cardCollection).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: CreditCard,
      bgColor: 'bg-amber-50 text-amber-600',
    },
    {
      name: 'Total Bills',
      value: kpis.totalBillsGenerated.toString(),
      icon: FileText,
      bgColor: 'bg-slate-50 text-slate-600',
    },
    {
      name: 'Customers Served',
      value: kpis.customersServed.toString(),
      icon: Users,
      bgColor: 'bg-indigo-50 text-indigo-600',
    },
    {
      name: 'Avg Bill Value',
      value: `₹${Number(kpis.averageBillValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ShoppingBag,
      bgColor: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-primary-light text-primary rounded-xl flex items-center justify-center border border-primary/10 shadow-xxs">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Personal Performance Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as <span className="font-semibold text-slate-700">{user?.name} ({user?.role})</span>. Viewing today's personal billing summary.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Details Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns - Payment breakdown & activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment breakdown chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-4">Payment Method Breakdown</h3>
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
              {paymentChartData.length === 0 ? (
                <div className="text-slate-400 text-xs py-8 text-center w-full">
                  No sales recorded today to generate payment breakdown.
                </div>
              ) : (
                <>
                  <div className="h-48 w-full max-w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
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
                  <div className="space-y-3 w-full max-w-[240px]">
                    {paymentChartData.map((entry, index) => {
                      const total = paymentChartData.reduce((s, p) => s + p.value, 0);
                      const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                      return (
                        <div key={index} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span className="font-medium text-slate-650">{entry.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800">₹{Number(entry.value).toFixed(2)}</span>
                            <span className="text-xxs text-slate-400 block">{percent}% share</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Recent Personal Transactions</h3>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Today</span>
            </div>
            <div className="overflow-x-auto">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  You haven't logged any orders today yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                      <th className="px-6 py-3">Bill No</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Grand Total</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 font-medium">
                        <td className="px-6 py-4 font-semibold text-slate-900">#{tx.orderNumber}</td>
                        <td className="px-6 py-4 truncate max-w-[150px]">
                          {tx.customerName}
                          {tx.customerPhone && <span className="text-[10px] text-slate-400 block mt-0.5">{tx.customerPhone}</span>}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">₹{Number(tx.grandTotal).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xxs font-bold ${
                            tx.paymentMethod === 'CASH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            tx.paymentMethod === 'UPI' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            tx.paymentMethod === 'CARD' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-400">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Timeline of Activity list view */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-4">Billing Activity Timeline</h3>
            {billingActivityTimeline.length === 0 ? (
              <div className="text-slate-400 text-xs py-4 text-center">No recent logs.</div>
            ) : (
              <div className="relative border-l border-slate-150 pl-4 ml-2 space-y-5">
                {billingActivityTimeline.slice(0, 5).map((log, idx) => (
                  <div key={log.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary shadow-xs"></span>
                    <div className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Bill #{log.orderNumber} Generated</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1 font-medium">
                        Completed a ₹{Number(log.grandTotal).toFixed(2)} {log.type.replace('_', ' ')} billing for <span className="font-semibold text-slate-700">{log.customerName}</span> settled via {log.paymentMethod}.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Shift status */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-4 flex items-center gap-1.5">
              <span>Current Shift Status</span>
            </h3>

            {shiftInfo ? (
              <div className="space-y-6">
                {/* Active shift badge */}
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                  shiftInfo.status === 'OPEN'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-850'
                }`}>
                  {shiftInfo.status === 'OPEN' ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-600 animate-pulse" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-slate-500" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">
                      Shift status: <span className="uppercase">{shiftInfo.status}</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {shiftInfo.status === 'OPEN' ? 'Shift is live and recording drawer sales.' : 'Shift is closed and reconciled.'}
                    </p>
                  </div>
                </div>

                {/* Ledger metrics list */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-450 uppercase tracking-wider text-[10px]">Opening Cash Drawer</span>
                    <span className="font-bold text-slate-800">₹{Number(shiftInfo.openingCash).toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-455 uppercase tracking-wider text-[10px]">Total Shift Expenses</span>
                    <span className="font-bold text-red-600">₹{Number(shiftInfo.totalExpensesLogged).toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-460 uppercase tracking-wider text-[10px]">Expected Cash in Drawer</span>
                    <span className="font-bold text-slate-800">₹{Number(shiftInfo.expectedCash).toFixed(2)}</span>
                  </div>

                  {shiftInfo.status === 'CLOSED' && (
                    <>
                      <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-100">
                        <span className="font-semibold text-slate-450 uppercase tracking-wider text-[10px]">Physical Cash Counted</span>
                        <span className="font-bold text-slate-800">₹{Number(shiftInfo.physicalCash || 0).toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs pb-1">
                        <span className="font-semibold text-slate-450 uppercase tracking-wider text-[10px]">Discrepancy / Difference</span>
                        <span className={`font-bold ${
                          Number(shiftInfo.cashDifference || 0) < 0 ? 'text-rose-605' :
                          Number(shiftInfo.cashDifference || 0) > 0 ? 'text-emerald-605' :
                          'text-slate-850'
                        }`}>
                          ₹{Number(shiftInfo.cashDifference || 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {shiftInfo.status === 'OPEN' && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex items-start gap-2">
                    <AlertCircle className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Drawer counts and discrepancies will populate here once the shift is closed via Shift Control.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2 animate-bounce" />
                <p className="text-slate-500 text-xs font-semibold">No shift history found.</p>
                <p className="text-slate-400 text-xxs mt-1 leading-normal">You must initialize a cashier shift first.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
