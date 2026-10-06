'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { PrintAgentClient } from '@/lib/printAgentClient';
import {
  Search,
  Calendar,
  IndianRupee,
  Trash2,
  AlertTriangle,
  Receipt,
  Printer,
  Eye,
  Filter,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  X,
  User,
  Phone,
  Clock,
  ChevronRight,
  Sparkles,
  Gamepad2,
  UtensilsCrossed,
  Coins,
  Ban,
  Download,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { MdSportsGymnastics } from 'react-icons/md';
import {
  PageHeader,
  MetricCard,
  StatusBadge,
  EmptyState,
  LoadingSkeleton,
  Button,
} from '@/components/ui';

interface UnifiedBill {
  id: string;
  rawId: string;
  billType: 'RESTAURANT' | 'TRAMPOLINE' | 'COIN_GAMES';
  billNumber: string;
  displayNumber: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: string;
  paymentBreakdown?: any[];
  status: string;
  itemsCount: number;
  itemsSummary: string;
  tableOrZone: string;
  cashierOrOperator: string;
  createdAt: string;
  isCancelled: boolean;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledByName?: string | null;
  details: any;
}

interface BillsResponse {
  bills: UnifiedBill[];
  summary: {
    totalRevenue: number;
    totalBillsCount: number;
    restaurantSales: number;
    restaurantCount: number;
    trampolineSales: number;
    trampolineCount: number;
    coinGamesSales: number;
    coinCount: number;
    cancelledCount: number;
    cancelledAmount: number;
    paymentBreakdown: {
      CASH: number;
      UPI: number;
      CARD: number;
      MIXED: number;
    };
  };
  timeRange: {
    start: string;
    end: string;
  };
}

export default function AdminBillManagementPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  // Helper date functions
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };
  const getWeekStartString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  };
  const getMonthStartString = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };

  // State Filters
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RESTAURANT' | 'TRAMPOLINE' | 'COIN_GAMES'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Actions
  const [viewingBill, setViewingBill] = useState<UnifiedBill | null>(null);
  const [deletingBill, setDeletingBill] = useState<UnifiedBill | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [hardDelete, setHardDelete] = useState<boolean>(true);
  const [reprinting, setReprinting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Handle Preset Changes
  const handlePresetChange = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    if (preset === 'today') {
      setStartDate(getTodayString());
      setEndDate(getTodayString());
    } else if (preset === 'yesterday') {
      setStartDate(getYesterdayString());
      setEndDate(getYesterdayString());
    } else if (preset === 'week') {
      setStartDate(getWeekStartString());
      setEndDate(getTodayString());
    } else if (preset === 'month') {
      setStartDate(getMonthStartString());
      setEndDate(getTodayString());
    }
  };

  // Query Unified Bills
  const { data, isLoading, isFetching, refetch } = useQuery<BillsResponse>({
    queryKey: ['admin-unified-bills', startDate, endDate, typeFilter, statusFilter, paymentFilter, searchQuery],
    queryFn: async () => {
      const params: any = {
        startDate,
        endDate,
        type: typeFilter,
      };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (paymentFilter !== 'ALL') params.paymentMethod = paymentFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/admin/bills', { params });
      return res.data;
    },
    enabled: !!isAdmin,
    staleTime: 10000,
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async ({
      billType,
      rawId,
      reason,
      isHard,
    }: {
      billType: string;
      rawId: string;
      reason: string;
      isHard: boolean;
    }) => {
      const res = await api.delete(`/admin/bills/${billType}/${rawId}`, {
        data: { reason, hardDelete: isHard },
      });
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccess(data.message || 'Bill deleted successfully');
      setDeletingBill(null);
      setDeleteReason('');
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-unified-bills'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete bill';
      setDeleteError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingBill) return;
    if (!deleteReason.trim()) {
      setDeleteError('Please specify a valid audit reason for deleting this bill');
      return;
    }
    deleteMutation.mutate({
      billType: deletingBill.billType,
      rawId: deletingBill.rawId,
      reason: deleteReason.trim(),
      isHard: hardDelete,
    });
  };

  // Print Receipt Handler
  const handlePrintReceipt = async (bill: UnifiedBill) => {
    setReprinting(true);
    try {
      if (bill.billType === 'RESTAURANT') {
        const orderData = bill.details;
        await PrintAgentClient.printCustomerReceipt({
          orderNumber: orderData.orderNumber || bill.displayNumber,
          type: orderData.type || 'DINE_IN',
          tableNumber: orderData.table?.number,
          customerName: bill.customerName,
          customerPhone: bill.customerPhone,
          items: (orderData.items || []).map((it: any) => ({
            name: it.name,
            quantity: it.quantity,
            price: it.price,
            notes: it.notes,
          })),
          subtotal: bill.subtotal,
          taxTotal: bill.taxTotal,
          discountTotal: bill.discountTotal,
          grandTotal: bill.grandTotal,
          paymentMethod: bill.paymentMethod,
          cashierName: bill.cashierOrOperator,
          createdAt: bill.createdAt,
        });
      } else {
        // Gaming / Coin Receipt
        window.print();
      }
      setActionSuccess(`Printed receipt for ${bill.billNumber}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Print error:', err);
      window.print();
    } finally {
      setReprinting(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!data?.bills || data.bills.length === 0) return;
    const headers = ['Bill Number', 'Type', 'Date', 'Customer Name', 'Phone', 'Zone / Table', 'Items / Package', 'Payment Method', 'Total (INR)', 'Status', 'Operator'];
    const rows = data.bills.map((b) => [
      `"${b.billNumber}"`,
      `"${b.billType}"`,
      `"${new Date(b.createdAt).toLocaleString()}"`,
      `"${b.customerName}"`,
      `"${b.customerPhone}"`,
      `"${b.tableOrZone}"`,
      `"${b.itemsSummary.replace(/"/g, '""')}"`,
      `"${b.paymentMethod}"`,
      b.grandTotal,
      `"${b.status}"`,
      `"${b.cashierOrOperator}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kyrapos_bills_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = data?.summary || {
    totalRevenue: 0,
    totalBillsCount: 0,
    restaurantSales: 0,
    restaurantCount: 0,
    trampolineSales: 0,
    trampolineCount: 0,
    coinGamesSales: 0,
    coinCount: 0,
    cancelledCount: 0,
    cancelledAmount: 0,
    paymentBreakdown: { CASH: 0, UPI: 0, CARD: 0, MIXED: 0 },
  };

  // Role Access Control Guard
  if (user && !isAdmin) {
    return (
      <div className="flex-1 p-8 bg-slate-50 flex items-center justify-center min-h-[80vh]">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-lg text-center flex flex-col items-center gap-4">
          <div className="p-4 bg-rose-100 text-rose-600 rounded-2xl">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
            <p className="text-xs text-slate-500 mt-1">
              Bill Management and ledger operations are reserved exclusively for the <span className="font-bold text-slate-700">Admin</span> role.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 w-full text-xxs font-mono text-slate-600">
            Current Role: <span className="font-bold text-rose-600">{user?.role || 'UNKNOWN'}</span> (Access Denied)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 min-h-screen pb-16">
      {/* Top Banner / Notification */}
      {actionSuccess && (
        <div className="sticky top-0 z-50 bg-emerald-600 text-white px-6 py-3 flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold text-sm">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-100 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Admin Bill Management
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold uppercase tracking-wider">
                    Full Ledger & Void
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Universal bills ledger across Restaurant POS, Trampoline Arena, and Coin Games
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!data?.bills || data.bills.length === 0}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Date Filter Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
            {(['today', 'yesterday', 'week', 'month', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  datePreset === p
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {p === 'week' ? 'Last 7 Days' : p === 'month' ? 'This Month' : p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="text-xs font-medium text-slate-700 bg-transparent border-0 focus:ring-0 p-0 outline-none"
              />
              <span className="text-xs text-slate-400 mx-2">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="text-xs font-medium text-slate-700 bg-transparent border-0 focus:ring-0 p-0 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Total Revenue */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Sales</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">₹{summary.totalRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{summary.totalBillsCount} total bills</p>
            </div>
          </div>

          {/* Restaurant Sales */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Restaurant</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">₹{summary.restaurantSales.toLocaleString()}</p>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">{summary.restaurantCount} orders</p>
            </div>
          </div>

          {/* Trampoline Sales */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Trampoline</span>
              <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <MdSportsGymnastics className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">₹{summary.trampolineSales.toLocaleString()}</p>
              <p className="text-[11px] text-cyan-600 font-medium mt-0.5">{summary.trampolineCount} sessions</p>
            </div>
          </div>

          {/* Coin / Arcade Sales */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Coin Games</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">₹{summary.coinGamesSales.toLocaleString()}</p>
              <p className="text-[11px] text-indigo-600 font-medium mt-0.5">{summary.coinCount} sales</p>
            </div>
          </div>

          {/* Payment Split */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Payments</span>
              <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5 text-[11px] font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Cash:</span>
                <span className="font-semibold text-slate-800">₹{summary.paymentBreakdown?.CASH?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>UPI:</span>
                <span className="font-semibold text-slate-800">₹{summary.paymentBreakdown?.UPI?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>

          {/* Voided / Cancelled */}
          <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Void / Cancelled</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-rose-600">{summary.cancelledCount}</p>
              <p className="text-[11px] text-rose-500 font-medium mt-0.5">₹{summary.cancelledAmount.toLocaleString()} voided</p>
            </div>
          </div>
        </div>

        {/* Secondary Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  typeFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                All Bills ({summary.totalBillsCount})
              </button>
              <button
                onClick={() => setTypeFilter('RESTAURANT')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  typeFilter === 'RESTAURANT'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                🍽️ Restaurant POS ({summary.restaurantCount})
              </button>
              <button
                onClick={() => setTypeFilter('TRAMPOLINE')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  typeFilter === 'TRAMPOLINE'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200/60'
                }`}
              >
                <MdSportsGymnastics className="w-3.5 h-3.5" />
                🤸 Trampoline Arena ({summary.trampolineCount})
              </button>
              <button
                onClick={() => setTypeFilter('COIN_GAMES')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  typeFilter === 'COIN_GAMES'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/60'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                🪙 Coin Games ({summary.coinCount})
              </button>
            </div>

            {/* Status and Payment Dropdowns */}
            <div className="flex items-center flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="ACTIVE">Active (In-Session)</option>
                <option value="CANCELLED">Cancelled / Voided</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Bill / Token Number, Customer Name, Mobile Number, Items, or Cashier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bills Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <LoadingSkeleton className="h-10 w-full" />
              <LoadingSkeleton className="h-14 w-full" />
              <LoadingSkeleton className="h-14 w-full" />
              <LoadingSkeleton className="h-14 w-full" />
            </div>
          ) : !data?.bills || data.bills.length === 0 ? (
            <div className="py-16 text-center">
              <EmptyState
                icon={<Receipt className="w-6 h-6 text-slate-400" />}
                title="No bills found"
                description="No transactions match your current filters or date range."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Bill / Ticket #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Zone / Table</th>
                    <th className="py-3 px-4">Items / Package</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.bills.map((bill) => {
                    const isRest = bill.billType === 'RESTAURANT';
                    const isTramp = bill.billType === 'TRAMPOLINE';
                    const isCoin = bill.billType === 'COIN_GAMES';

                    return (
                      <tr
                        key={bill.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          bill.isCancelled ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        {/* Bill Number + Type Badge */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isRest
                                  ? 'bg-amber-100 text-amber-700'
                                  : isTramp
                                  ? 'bg-cyan-100 text-cyan-700'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}
                            >
                              {isRest ? (
                                <UtensilsCrossed className="w-3.5 h-3.5" />
                              ) : isTramp ? (
                                <MdSportsGymnastics className="w-3.5 h-3.5" />
                              ) : (
                                <Coins className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{bill.billNumber}</p>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                  isRest
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : isTramp
                                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {isRest ? 'Food' : isTramp ? 'Trampoline' : 'Coins'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          <p className="font-medium text-slate-900">
                            {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(bill.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{bill.customerName}</p>
                          <p className="text-[11px] text-slate-500">{bill.customerPhone}</p>
                        </td>

                        {/* Zone / Table */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {bill.tableOrZone}
                          </span>
                        </td>

                        {/* Items Summary */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="truncate font-medium text-slate-700" title={bill.itemsSummary}>
                            {bill.itemsSummary}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">By: {bill.cashierOrOperator}</p>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              bill.paymentMethod === 'CASH'
                                ? 'bg-emerald-100 text-emerald-800'
                                : bill.paymentMethod === 'UPI'
                                ? 'bg-blue-100 text-blue-800'
                                : bill.paymentMethod === 'CARD'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {bill.paymentMethod}
                          </span>
                        </td>

                        {/* Grand Total */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <p
                            className={`text-sm font-bold ${
                              bill.isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            ₹{bill.grandTotal.toLocaleString()}
                          </p>
                          {bill.taxTotal > 0 && (
                            <p className="text-[10px] text-slate-400">Tax: ₹{bill.taxTotal.toLocaleString()}</p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              bill.isCancelled
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : bill.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-cyan-100 text-cyan-800'
                            }`}
                          >
                            {bill.isCancelled ? 'Voided' : bill.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* View & Print Modal */}
                            <button
                              onClick={() => setViewingBill(bill)}
                              title="View & Print Bill Details"
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Direct Reprint */}
                            <button
                              onClick={() => handlePrintReceipt(bill)}
                              title="Reprint Thermal Receipt"
                              disabled={reprinting}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Admin Delete / Void Button */}
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setDeletingBill(bill);
                                  setDeleteReason('');
                                  setDeleteError(null);
                                }}
                                title="Delete / Void Bill (Admin Authorization)"
                                className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition border border-rose-200 hover:border-rose-600 shadow-2xs"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: VIEW & PRINT RECEIPT DETAILS */}
      {/* ------------------------------------------------------------- */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{viewingBill.billNumber}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {viewingBill.billType} • {new Date(viewingBill.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingBill(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal Receipt Preview Paper */}
            <div className="p-6">
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 font-mono text-xs text-slate-800 shadow-inner space-y-4">
                <div className="text-center border-b border-dashed border-slate-300 pb-3">
                  <h2 className="text-sm font-bold tracking-widest uppercase">KYRA POS</h2>
                  <p className="text-[11px] text-slate-500">Food Street & Gaming Zone</p>
                  <p className="text-[11px] text-slate-500 mt-1">Bill: {viewingBill.billNumber}</p>
                  <p className="text-[10px] text-slate-400">Date: {new Date(viewingBill.createdAt).toLocaleString()}</p>
                </div>

                <div className="border-b border-dashed border-slate-300 pb-3 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold">{viewingBill.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mobile:</span>
                    <span>{viewingBill.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Zone/Table:</span>
                    <span className="font-bold">{viewingBill.tableOrZone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operator:</span>
                    <span>{viewingBill.cashierOrOperator}</span>
                  </div>
                </div>

                {/* Items breakdown */}
                <div className="border-b border-dashed border-slate-300 pb-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 flex justify-between">
                    <span>ITEM / SERVICE</span>
                    <span>AMOUNT</span>
                  </div>
                  {viewingBill.billType === 'RESTAURANT' ? (
                    (viewingBill.details?.items || []).map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span>
                          {it.name} x {it.quantity}
                        </span>
                        <span className="font-semibold">₹{(it.price * it.quantity).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span>{viewingBill.itemsSummary}</span>
                        <span className="font-semibold">₹{viewingBill.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span>₹{viewingBill.subtotal.toFixed(2)}</span>
                  </div>
                  {viewingBill.taxTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">GST / Tax:</span>
                      <span>₹{viewingBill.taxTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {viewingBill.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount:</span>
                      <span>-₹{viewingBill.discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-dashed border-slate-300 pt-2 text-slate-900">
                    <span>GRAND TOTAL:</span>
                    <span>₹{viewingBill.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                    <span>Payment Mode:</span>
                    <span className="font-bold uppercase text-slate-700">{viewingBill.paymentMethod}</span>
                  </div>
                </div>

                {/* Void status banner */}
                {viewingBill.isCancelled && (
                  <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-lg text-rose-800 text-[10px] text-center font-bold">
                    *** THIS BILL IS VOIDED / CANCELLED ***
                    {viewingBill.cancellationReason && (
                      <p className="font-normal mt-0.5">Reason: {viewingBill.cancellationReason}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex items-center justify-between">
              <button
                onClick={() => setViewingBill(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
              >
                Close
              </button>
              <button
                onClick={() => handlePrintReceipt(viewingBill)}
                disabled={reprinting}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                {reprinting ? 'Printing...' : 'Print Thermal Slip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ADMIN DELETE / VOID CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      {deletingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Warning Header */}
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900 text-base">Delete / Void Bill Authorization</h3>
                <p className="text-xs text-rose-600 font-medium">Administrator Privilege Required</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleDeleteSubmit} className="p-6 space-y-4">
              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* Target Bill Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Bill Number:</span>
                  <span className="font-bold text-slate-900">{deletingBill.billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Type:</span>
                  <span className="font-semibold text-slate-800">{deletingBill.billType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-semibold text-slate-800">{deletingBill.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Amount:</span>
                  <span className="font-bold text-slate-900">₹{deletingBill.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Delete Mode Option */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Deletion Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHardDelete(true)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                      hardDelete
                        ? 'border-rose-500 bg-rose-50 text-rose-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block font-bold">Hard Delete</span>
                    <span className="text-[10px] text-slate-500 font-normal">Purge from database</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHardDelete(false)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                      !hardDelete
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block font-bold">Mark Void</span>
                    <span className="text-[10px] text-slate-500 font-normal">Retain as cancelled</span>
                  </button>
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Audit Reason for Deletion <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Wrong table entered by cashier, customer requested cancellation, duplicate bill punch..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingBill(null)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition w-1/2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md w-1/2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {deleteMutation.isPending ? 'Processing...' : hardDelete ? 'Hard Delete' : 'Void Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
