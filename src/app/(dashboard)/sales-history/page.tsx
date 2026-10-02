'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PrintAgentClient } from '@/lib/printAgentClient';
import {
  Search,
  Calendar,
  DollarSign,
  Ban,
  TrendingUp,
  Tag,
  Loader,
  AlertCircle,
  X,
  Printer,
  Eye,
  Filter,
  Receipt,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Layers,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import {
  PageHeader,
  MetricCard,
  StatusBadge,
  EmptyState,
  LoadingSkeleton,
  Button,
} from '@/components/ui';

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
  type?: string;
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

  // Date Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());

  // Search & Secondary Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Modal States
  const [viewingOrderDetails, setViewingOrderDetails] = useState<any | null>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [reprintingOrderId, setReprintingOrderId] = useState<string | null>(null);
  const [cancellingBill, setCancellingBill] = useState<Bill | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [browserPrintOrder, setBrowserPrintOrder] = useState<any | null>(null);

  // Fetch Sales History Query
  const { data, isLoading, error, refetch, isRefetching } = useQuery<HistoryResponse>({
    queryKey: ['salesHistory', dateFilter, startDate, endDate],
    queryFn: async () => {
      let sDate = startDate;
      let eDate = endDate;
      if (dateFilter === 'today') {
        sDate = getTodayString();
        eDate = getTodayString();
      } else if (dateFilter === 'yesterday') {
        sDate = getYesterdayString();
        eDate = getYesterdayString();
      } else if (dateFilter === 'week') {
        sDate = getWeekStartString();
        eDate = getTodayString();
      } else if (dateFilter === 'month') {
        sDate = getMonthStartString();
        eDate = getTodayString();
      }

      const res = await api.get('/orders/history', {
        params: { startDate: sDate, endDate: eDate },
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
      alert('Order cancelled successfully!');
    },
    onError: (err: any) => {
      setCancelError(err.response?.data?.message || 'Failed to cancel order.');
    },
  });

  const handleQuickFilter = (type: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setDateFilter(type);
    if (type === 'today') {
      setStartDate(getTodayString());
      setEndDate(getTodayString());
    } else if (type === 'yesterday') {
      setStartDate(getYesterdayString());
      setEndDate(getYesterdayString());
    } else if (type === 'week') {
      setStartDate(getWeekStartString());
      setEndDate(getTodayString());
    } else if (type === 'month') {
      setStartDate(getMonthStartString());
      setEndDate(getTodayString());
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

  // View itemized order details
  const handleViewOrderDetails = async (orderId: string) => {
    setLoadingOrderDetail(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      setViewingOrderDetails(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  // Reprint Receipt Function
  const handleReprintBill = async (billId: string) => {
    setReprintingOrderId(billId);
    try {
      const res = await api.get(`/orders/${billId}`);
      const order = res.data;

      const receiptItems = (order.items || []).map((i: any) => ({
        name: i.dish?.name || i.name || 'Item',
        quantity: i.quantity,
        price: Number(i.price),
        totalPrice: Number(i.price) * i.quantity,
        notes: i.notes || undefined,
      }));

      const receiptPayload = {
        restaurantName: 'Kyra Cafe',
        restaurantAddress: '123 Main Street, Food District',
        restaurantPhone: '9876543210',
        billNumber: order.orderNumber,
        date: new Date(order.createdAt).toLocaleDateString(),
        time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tableNumber: order.table?.number || undefined,
        captainName: order.cashier?.name || 'Cashier',
        cashierName: order.cashier?.name || 'Cashier',
        orderType: order.type || 'DINE_IN',
        items: receiptItems,
        subtotal: Number(order.subtotal || order.grandTotal),
        discount: Number(order.discountTotal || 0),
        taxSummary: [],
        grandTotal: Number(order.grandTotal),
        paymentMethod: order.payments?.[0]?.method || order.paymentMethod || 'CASH',
        customerName: order.customerName && order.customerName !== 'Walk-in Customer' ? order.customerName : undefined,
        customerPhone: order.customerPhone || undefined,
        isReprint: true,
      };

      const printRes = await PrintAgentClient.printCustomerReceipt(receiptPayload);
      if (printRes.success) {
        alert(`Receipt for Order #${order.orderNumber} sent to printer successfully!`);
      } else {
        console.warn('Local print agent unreachable, opening browser print dialog.', printRes.error);
        setBrowserPrintOrder(order);
        setTimeout(() => {
          window.print();
        }, 300);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch order details for reprinting.');
    } finally {
      setReprintingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <LoadingSkeleton className="h-28 w-full" />
          <LoadingSkeleton className="h-28 w-full" />
          <LoadingSkeleton className="h-28 w-full" />
          <LoadingSkeleton className="h-28 w-full" />
        </div>
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-150 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
        <div>
          <h4 className="font-bold text-sm">Failed to load sales history</h4>
          <p className="text-xs text-rose-600/80">Please check server connectivity and try again.</p>
        </div>
      </div>
    );
  }

  // Filter orders by search, status, and payment method
  const filteredOrders = data.orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toString().includes(searchQuery) ||
      (o.customerPhone && o.customerPhone.includes(searchQuery)) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesPayment = paymentFilter === 'ALL' || o.paymentMethod === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const avgOrderValue = data.summary.totalBills > 0 ? data.summary.totalSales / data.summary.totalBills : 0;

  return (
    <div className="space-y-6 text-slate-700 font-sans pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Sales & Billing History"
        description="Track drawer transactions, reprint receipts, inspect bill breakdowns, and process returns."
        icon={<Receipt className="h-5 w-5" />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Presets */}
            <div className="flex items-center border rounded-xl overflow-hidden bg-slate-50 border-slate-200/80 p-0.5 shadow-xxs">
              {(['today', 'yesterday', 'week', 'month', 'custom'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => handleQuickFilter(filter)}
                  className={`px-3 py-1.5 text-xxs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                    dateFilter === filter
                      ? 'bg-[#D94949] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {filter === 'week' ? 'This Week' : filter === 'month' ? 'This Month' : filter}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker */}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 text-xxs font-semibold bg-white p-1 rounded-xl border border-slate-200 shadow-xxs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-medium text-slate-800"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-medium text-slate-800"
                />
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-xxs"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin text-[#D94949]' : ''}`} />
            </button>
          </div>
        }
      />

      {/* 2. KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales Revenue"
          value={`₹${data.summary.totalSales.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-[#009966]"
          subtext="Net completed transactions"
        />

        <MetricCard
          title="Total Bills"
          value={data.summary.totalBills}
          icon={<Receipt className="h-5 w-5" />}
          iconBgColor="bg-blue-50"
          iconTextColor="text-[#0284C7]"
          subtext="Orders placed in timeframe"
        />

        <MetricCard
          title="Average Order Value"
          value={`₹${avgOrderValue.toFixed(2)}`}
          icon={<ShoppingBag className="h-5 w-5" />}
          iconBgColor="bg-purple-50"
          iconTextColor="text-purple-600"
          subtext="Average revenue per ticket"
        />

        <MetricCard
          title="Cancelled Bills"
          value={data.summary.totalCancelledBills}
          icon={<Ban className="h-5 w-5" />}
          iconBgColor="bg-rose-50"
          iconTextColor="text-[#D94949]"
          subtext="Returned / Cancelled orders"
        />
      </div>

      {/* 3. Main Content Grid: Left Category Volume & Right Transactions Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Category Sales Volume Panel */}
        <aside className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#D94949]" />
              Category Sales Volume
            </span>
          </div>

          <div className="space-y-2">
            {Object.keys(data.summary.categorySalesCount).length === 0 ? (
              <p className="text-xxs text-slate-400 text-center py-6">No category sales recorded in range.</p>
            ) : (
              Object.entries(data.summary.categorySalesCount).map(([name, qty]) => (
                <div
                  key={name}
                  className="flex justify-between items-center text-xs font-semibold p-2.5 bg-slate-50/80 hover:bg-slate-100/70 rounded-xl border border-slate-150 transition-colors"
                >
                  <span className="text-slate-700 truncate max-w-[130px]">{name}</span>
                  <span className="bg-white text-slate-900 px-2 py-0.5 rounded-lg text-xxs font-bold border border-slate-200 shadow-xxs font-mono tabular-nums">
                    {qty} sold
                  </span>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Sales Bills History Panel */}
        <main className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col p-6 space-y-5">
          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Bill #, Customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:bg-white focus:border-[#D94949] text-slate-850 transition-all"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent focus:outline-none text-slate-700 text-xs cursor-pointer font-bold"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="PENDING">Pending</option>
                  <option value="READY">Ready</option>
                  <option value="SERVED">Served</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold">
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="bg-transparent focus:outline-none text-slate-700 text-xs cursor-pointer font-bold"
                >
                  <option value="ALL">All Payments</option>
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                  <option value="MIXED">MIXED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <EmptyState
                title="No sales recorded"
                description="There are no completed sales matching your filter criteria for the selected period."
                icon={<Receipt className="h-6 w-6 text-slate-400" />}
              />
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80 text-xxs uppercase tracking-wider">
                    <th className="px-4 py-3 rounded-l-xl">Order #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3 text-right">Grand Total</th>
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-xs font-mono">#{o.orderNumber}</span>
                          {o.type && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">
                              {o.type}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{o.customerName || 'Walk-in'}</div>
                        {o.customerPhone && <div className="text-xxs text-slate-400 font-mono">{o.customerPhone}</div>}
                      </td>

                      <td className="px-4 py-3.5 text-xxs text-slate-500 font-medium">
                        {new Date(o.createdAt).toLocaleDateString()}{' '}
                        <span className="text-slate-400 font-normal">
                          {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge
                          status={o.paymentMethod}
                          size="sm"
                        />
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-900 text-sm text-right font-mono tabular-nums">
                        ₹{Number(o.grandTotal).toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-semibold text-xs">
                        {o.cashierName}
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge
                          status={o.status}
                          size="sm"
                          showDot={o.status === 'CANCELLED' || o.status === 'COMPLETED'}
                        />
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details Button */}
                          <button
                            onClick={() => handleViewOrderDetails(o.id)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="View Itemized Order Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Reprint Button */}
                          <button
                            onClick={() => handleReprintBill(o.id)}
                            disabled={reprintingOrderId === o.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xxs font-bold rounded-lg active-press transition-colors cursor-pointer disabled:opacity-50"
                            title="Reprint Bill Receipt"
                          >
                            {reprintingOrderId === o.id ? (
                              <Loader className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                            ) : (
                              <Printer className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                            <span>Reprint</span>
                          </button>

                          {/* Cancel / Return Button */}
                          {o.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                setCancelError(null);
                                setCancellingBill(o);
                              }}
                              className="px-2 py-1 text-xxs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="Cancel or Process Return"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* DIALOG 1: ITEMIZED ORDER DETAILS MODAL */}
      {viewingOrderDetails && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setViewingOrderDetails(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-850">
                    Order Details #{viewingOrderDetails.orderNumber}
                  </h3>
                  <p className="text-xxs text-slate-400 font-medium">
                    Cashier: {viewingOrderDetails.cashier?.name || viewingOrderDetails.cashierName} •{' '}
                    {new Date(viewingOrderDetails.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingOrderDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Customer & Order Metadata */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xxs font-medium">
                <div>
                  <span className="text-slate-400 uppercase font-bold block">Customer</span>
                  <span className="text-slate-800 font-bold">
                    {viewingOrderDetails.customerName || 'Walk-in Customer'}
                  </span>
                  {viewingOrderDetails.customerPhone && (
                    <span className="text-slate-400 block font-mono">{viewingOrderDetails.customerPhone}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold block">Order Type</span>
                  <span className="text-slate-800 font-bold">
                    {viewingOrderDetails.type}
                  </span>
                </div>
              </div>

              {/* Itemized Dish List */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider text-xxs">Itemized Dish Breakdown</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xxs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <th className="px-3 py-2">Item Name</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(viewingOrderDetails.items || []).map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {item.dish?.name || item.name}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-700">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-slate-600 font-mono">₹{Number(item.price).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono">
                            ₹{(Number(item.price) * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between text-slate-600 text-xxs">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{Number(viewingOrderDetails.subtotal || viewingOrderDetails.grandTotal).toFixed(2)}</span>
                </div>
                {Number(viewingOrderDetails.discountTotal || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 text-xxs">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{Number(viewingOrderDetails.discountTotal).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 text-sm font-bold pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="font-mono text-base font-black">₹{Number(viewingOrderDetails.grandTotal).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button
                type="button"
                onClick={() => setViewingOrderDetails(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer bg-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = viewingOrderDetails.id;
                  setViewingOrderDetails(null);
                  handleReprintBill(id);
                }}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-[#D94949] hover:bg-[#C53B3B] rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4 text-white" />
                <span>Reprint Receipt</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* DIALOG 2: CANCEL BILL MODAL */}
      {cancellingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Ban className="h-4.5 w-4.5 text-rose-600" />
                <span>Cancel Order Bill #{cancellingBill.orderNumber}</span>
              </h3>
              <button
                onClick={() => setCancellingBill(null)}
                className="text-slate-400 hover:text-slate-650 cursor-pointer p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-100 font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xxs space-y-1.5 font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="text-slate-800">{cancellingBill.customerName || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grand Total:</span>
                  <span className="text-slate-900 font-bold font-mono">₹{Number(cancellingBill.grandTotal).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cancellation Reason (Required)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D94949] h-20 text-slate-850"
                  placeholder="e.g. Customer changed mind, incorrect billing entries..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingBill(null)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-700 font-bold text-xxs transition-colors cursor-pointer bg-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xxs rounded-xl active-press transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT-ONLY REPRINT RECEIPT */}
      {browserPrintOrder && (
        <div id="print-reprint-receipt-section" className="hidden print:block text-slate-900 bg-white p-4 font-mono text-xs max-w-xs mx-auto">
          <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
            <h2 className="text-sm font-black tracking-wider uppercase">Kyra Cafe</h2>
            <p className="text-xxs text-slate-600">*** REPRINT RECEIPT ***</p>
            <p className="text-xxs text-slate-500 mt-1 font-bold">Bill #{browserPrintOrder.orderNumber}</p>
          </div>

          <div className="space-y-1 text-xxs border-b border-dashed border-slate-400 pb-3 mb-3">
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(browserPrintOrder.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{new Date(browserPrintOrder.createdAt).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{browserPrintOrder.cashier?.name || browserPrintOrder.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{browserPrintOrder.customerName || 'Walk-in'}</span>
            </div>
          </div>

          <table className="w-full text-left text-xxs border-b border-dashed border-slate-400 pb-3 mb-3">
            <thead>
              <tr className="border-b border-slate-300 font-bold">
                <th className="pb-1">Item</th>
                <th className="pb-1 text-center">Qty</th>
                <th className="pb-1 text-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              {(browserPrintOrder.items || []).map((i: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-1">{i.dish?.name || i.name}</td>
                  <td className="py-1 text-center font-bold">{i.quantity}</td>
                  <td className="py-1 text-right font-bold font-mono">₹{(Number(i.price) * i.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-xxs font-bold text-right">
            <div>Grand Total: ₹{Number(browserPrintOrder.grandTotal).toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
