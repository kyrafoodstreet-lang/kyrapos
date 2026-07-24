'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Search,
  Calendar,
  FileText,
  DollarSign,
  Ban,
  TrendingUp,
  Tag,
  Loader,
  AlertCircle,
  X,
  Printer
} from 'lucide-react';

interface Bill {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: string;
  grandTotal: number;
  cashierName: string;
  cancellationReason: string | null;
  cancelledAt: string | null;
  cancelledByName: string | null;
}

interface HistoryResponse {
  orders: Bill[];
  summary: {
    totalBills: number;
    totalSales: number;
    totalCancelledBills: number;
    categorySalesCount: Record<string, number>;
  };
}

export default function SalesHistoryPage() {
  const queryClient = useQueryClient();

  // Date Filters
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Cancellation Modal State
  const [cancellingBill, setCancellingBill] = useState<Bill | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Fetch Sales History Query
  const { data, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: ['salesHistory', dateFilter, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/orders/history', {
        params: {
          startDate: dateFilter === 'today' ? getTodayString() : dateFilter === 'yesterday' ? getYesterdayString() : startDate,
          endDate: dateFilter === 'today' ? getTodayString() : dateFilter === 'yesterday' ? getYesterdayString() : endDate,
        },
      });
      return res.data;
    },
  });

  // Cancel Order Mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return (await api.post(`/orders/${id}/cancel`, { reason })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesHistory'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['activeCategories'] });
      setCancellingBill(null);
      setCancelReason('');
      setCancelError(null);
      alert('Bill cancelled successfully!');
    },
    onError: (err: any) => {
      setCancelError(err.response?.data?.message || 'Failed to cancel bill.');
    },
  });

  const handleQuickFilter = (type: 'today' | 'yesterday' | 'custom') => {
    setDateFilter(type);
    if (type === 'today') {
      setStartDate(getTodayString());
      setEndDate(getTodayString());
    } else if (type === 'yesterday') {
      setStartDate(getYesterdayString());
      setEndDate(getYesterdayString());
    }
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Please enter a cancellation reason.');
      return;
    }
    if (cancellingBill) {
      cancelMutation.mutate({ id: cancellingBill.id, reason: cancelReason });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load sales history from server.</span>
      </div>
    );
  }

  // Filter orders locally by search query (order number or phone)
  const filteredOrders = data.orders.filter((o) => {
    const matchesSearch = o.orderNumber.toString().includes(searchQuery) ||
      o.customerPhone.includes(searchQuery) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 text-slate-700 font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-800 tracking-tight">Sales & Billing History</h2>
          <p className="text-xxs text-slate-450 mt-0.5 font-medium">Review drawer orders, manage unpaid active bills, and track cancellations.</p>
        </div>

        {/* Date Filter & Quick selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 border-slate-250">
            {(['today', 'yesterday', 'custom'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => handleQuickFilter(filter)}
                className={`px-3 py-1.5 text-xxs font-bold border-r last:border-r-0 border-slate-200 transition-colors capitalize cursor-pointer ${
                  dateFilter === filter 
                    ? 'bg-primary text-white border-primary shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 animate-fade-in text-xxs font-semibold">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border rounded-lg px-2 py-1 focus:outline-none font-medium text-slate-850"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border rounded-lg px-2 py-1 focus:outline-none font-medium text-slate-850"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Summary Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bills</span>
            <h3 className="text-xl font-semibold text-slate-900">{data.summary.totalBills}</h3>
          </div>
          <div className="h-11 w-11 bg-primary-light rounded-lg flex items-center justify-center border border-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales Revenue</span>
            <h3 className="text-xl font-semibold text-slate-900">₹{data.summary.totalSales.toFixed(2)}</h3>
          </div>
          <div className="h-11 w-11 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-150">
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cancelled Bills</span>
            <h3 className="text-xl font-semibold text-slate-900">{data.summary.totalCancelledBills}</h3>
          </div>
          <div className="h-11 w-11 bg-rose-50 rounded-lg flex items-center justify-center border border-rose-150">
            <Ban className="h-5 w-5 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Category breakdown & Bills list panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Category-wise Sales Count Sidebar */}
        <aside className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <span className="block text-xxs font-bold text-slate-400 uppercase tracking-wider px-2 border-b pb-1.5">Category-wise Sales Volume</span>
          <div className="space-y-2 p-1">
            {Object.keys(data.summary.categorySalesCount).length === 0 ? (
              <p className="text-xxs text-slate-450 text-center py-4">No categories sold in range.</p>
            ) : (
              Object.entries(data.summary.categorySalesCount).map(([name, qty]) => (
                <div key={name} className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary/70" />
                    <span>{name}</span>
                  </span>
                  <span className="bg-slate-100 text-slate-805 px-2 py-0.5 rounded text-xxs border border-slate-200">{qty} sold</span>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Sales Bills History Table */}
        <main className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search bill no, phone, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:bg-white text-slate-805"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-450 text-xs font-medium">
                No orders match your filter criteria.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                    <th className="px-4 py-3">Bill Number</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-655">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 font-medium">
                      <td className="px-4 py-4 font-bold text-slate-900">#{o.orderNumber}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{o.customerName}</div>
                        {o.customerPhone && <div className="text-xxs text-slate-450">{o.customerPhone}</div>}
                      </td>
                      <td className="px-4 py-4 text-xxs text-slate-500">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 uppercase">
                        <span className="px-2 py-0.5 rounded text-xxs font-bold border border-slate-200/80 bg-slate-50 text-slate-700">
                          {o.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-900">₹{o.grandTotal.toFixed(2)}</td>
                      <td className="px-4 py-4 text-slate-500">{o.cashierName}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xxs font-bold border ${
                          o.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : o.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-805 border-amber-250 animate-pulse'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {o.status !== 'CANCELLED' ? (
                          <button
                            onClick={() => {
                              setCancelError(null);
                              setCancellingBill(o);
                            }}
                            className="px-2.5 py-1 text-xxs font-bold text-rose-600 hover:bg-rose-50 border border-rose-100 rounded transition-colors cursor-pointer"
                          >
                            {o.status === 'COMPLETED' ? 'Return / Cancel' : 'Cancel Bill'}
                          </button>
                        ) : (
                          <span 
                            className="text-xxs text-slate-400 italic cursor-help"
                            title={`Reason: ${o.cancellationReason} (by ${o.cancelledByName})`}
                          >
                            Cancelled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* CANCEL BILL MODAL DIALOG */}
      {cancellingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Ban className="h-4.5 w-4.5 text-rose-600" />
                <span>Cancel Order Bill #{cancellingBill.orderNumber}</span>
              </h3>
              <button 
                onClick={() => setCancellingBill(null)} 
                className="text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-100 font-semibold">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xxs space-y-1 font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="text-slate-800">{cancellingBill.customerName || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grand Total:</span>
                  <span className="text-slate-900">₹{cancellingBill.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Cancellation Reason (Required)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white h-20 text-slate-855"
                  placeholder="e.g. Wrong items entered, customer walked away, etc."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingBill(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-55 text-slate-700 font-bold text-xxs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-505 text-white font-bold text-xxs rounded-lg active-press transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
