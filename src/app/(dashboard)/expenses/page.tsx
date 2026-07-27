'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useShiftStore } from '@/store/shiftStore';
import {
  Plus,
  Loader,
  X,
  Wallet,
  AlertCircle,
  TrendingDown,
  Info,
  Calendar,
  Filter,
  Search,
  Download,
  Printer,
  ShieldAlert,
  UserCheck,
  User,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';

const expenseSchema = z.object({
  category: z.enum(['VEGETABLES', 'MILK', 'GAS', 'CLEANING', 'PETROL', 'MISCELLANEOUS']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  notes: z.string().optional(),
  date: z.string().optional(), // ISO date string
});

type ExpenseSchema = z.infer<typeof expenseSchema>;

interface Expense {
  id: string;
  category: 'VEGETABLES' | 'MILK' | 'GAS' | 'CLEANING' | 'PETROL' | 'MISCELLANEOUS';
  amount: string;
  notes: string | null;
  date: string;
  user: { id: string; name: string; role: string };
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const activeShift = useShiftStore((state) => state.activeShift);

  const [showDialog, setShowDialog] = useState(false);

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

  // Date & Filter States
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Expenses Query
  const { data: expenses = [], isLoading, error, refetch, isRefetching } = useQuery<Expense[]>({
    queryKey: ['expenses', dateFilter, startDate, endDate],
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

      const res = await api.get('/expenses', {
        params: { startDate: sDate, endDate: eDate },
      });
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(expenseSchema),
  });

  // Create Expense Mutation
  const expenseMutation = useMutation({
    mutationFn: async (data: ExpenseSchema) => {
      return (await api.post('/expenses', {
        ...data,
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['activeShift'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowDialog(false);
      reset();
      alert('Expense logged successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to record expense.');
    }
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

  const isCashier = user?.role === 'CASHIER';
  const isShiftClosedForCashier = isCashier && !activeShift;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'VEGETABLES':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'MILK':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'GAS':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'CLEANING':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'PETROL':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSourceBadge = (role: string) => {
    switch (role) {
      case 'CASHIER':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold">Cashier Shift</span>;
      case 'MANAGER':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[10px] font-bold">Manager General</span>;
      case 'ADMIN':
        return <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-[10px] font-bold">Admin Store</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold">{role}</span>;
    }
  };

  // Filtering Logic
  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    const matchesSource = sourceFilter === 'ALL' || e.user.role === sourceFilter;
    const matchesSearch =
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.user.name && e.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSource && matchesSearch;
  });

  // KPI Calculations
  const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  const cashierExpenses = filteredExpenses
    .filter((e) => e.user.role === 'CASHIER')
    .reduce((acc, exp) => acc + Number(exp.amount), 0);
  const managerExpenses = filteredExpenses
    .filter((e) => e.user.role === 'MANAGER')
    .reduce((acc, exp) => acc + Number(exp.amount), 0);
  const adminExpenses = filteredExpenses
    .filter((e) => e.user.role === 'ADMIN')
    .reduce((acc, exp) => acc + Number(exp.amount), 0);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('No expense records available to export.');
      return;
    }
    const headers = ['ID', 'Category', 'Logged By', 'Role', 'Amount (INR)', 'Notes', 'Date & Time'];
    const rows = filteredExpenses.map((e) => [
      e.id.substring(0, 8),
      e.category,
      `"${e.user.name}"`,
      e.user.role,
      Number(e.amount).toFixed(2),
      `"${e.notes || ''}"`,
      new Date(e.date).toLocaleString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kyra-pos-expenses-${dateFilter}-${startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-slate-700 font-sans pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-850 tracking-tight">Operational Expense Tracker</h2>
            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-xxs font-bold rounded-full">
              {filteredExpenses.length} Logs
            </span>
          </div>
          <p className="text-xxs text-slate-400 mt-0.5 font-medium">
            Monitor restaurant payouts, separate cashier petty cash from manager/admin general expenses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export & Print */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xxs rounded-xl border border-slate-250 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xxs rounded-xl border border-slate-250 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>

          {/* Log Expense Button */}
          <button
            onClick={() => {
              if (isShiftClosedForCashier) {
                alert('Shift Control Locked: Cashiers must have an OPEN shift before logging operational expenses.');
                return;
              }
              reset({ category: 'VEGETABLES', amount: 0, notes: '', date: getTodayString() });
              setShowDialog(true);
            }}
            disabled={isShiftClosedForCashier}
            className={`flex items-center gap-1.5 px-4 py-2 text-white font-bold text-xxs rounded-xl shadow-sm active-press transition-colors cursor-pointer ${
              isShiftClosedForCashier
                ? 'bg-slate-400 opacity-60 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Cashier Shift Control Warning Alert */}
      {isShiftClosedForCashier && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold block">Cashier Shift Control Locked</span>
              <span className="text-xxs text-amber-800 font-medium">
                Your cashier shift is currently closed. You must open a shift on the <strong>Shifts</strong> page before logging till expenses.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Total Logged</span>
            <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-200">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">₹{totalExpenses.toFixed(2)}</h3>
          <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> Combined operational payouts
          </p>
        </div>

        {/* Cashier Shift Expenses */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Cashier Till Payouts</span>
            <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-200">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">₹{cashierExpenses.toFixed(2)}</h3>
          <p className="text-[10px] text-amber-700 font-medium">Deducted from cashier till</p>
        </div>

        {/* Manager General Expenses */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Manager Expenses</span>
            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-200">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">₹{managerExpenses.toFixed(2)}</h3>
          <p className="text-[10px] text-blue-600 font-medium">Manager store payouts</p>
        </div>

        {/* Admin Store Expenses */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Admin Expenses</span>
            <div className="h-8 w-8 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-200">
              <User className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">₹{adminExpenses.toFixed(2)}</h3>
          <p className="text-[10px] text-purple-600 font-medium">Store owner direct expenses</p>
        </div>
      </div>

      {/* Date & Multi-Filter Control Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center border rounded-xl overflow-hidden bg-slate-50 border-slate-250 p-0.5 shadow-xxs">
              {(['today', 'yesterday', 'week', 'month', 'custom'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => handleQuickFilter(filter)}
                  className={`px-3 py-1.5 text-xxs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                    dateFilter === filter
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {filter === 'week' ? 'This Week' : filter === 'month' ? 'This Month' : filter}
                </button>
              ))}
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 text-xxs font-semibold bg-slate-50 p-1 rounded-xl border border-slate-200">
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

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-250 rounded-xl transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by notes description, payee, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:bg-white focus:border-primary text-slate-850 transition-all"
            />
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400 text-xxs uppercase">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-800 text-xs font-bold cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="VEGETABLES">Vegetables</option>
              <option value="MILK">Milk</option>
              <option value="GAS">Gas</option>
              <option value="CLEANING">Cleaning</option>
              <option value="PETROL">Petrol</option>
              <option value="MISCELLANEOUS">Miscellaneous</option>
            </select>
          </div>

          {/* Source / Role Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold">
            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400 text-xxs uppercase">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-800 text-xs font-bold cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="CASHIER">Cashier Shift Payouts</option>
              <option value="MANAGER">Manager Expenses</option>
              <option value="ADMIN">Admin Store Expenses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-medium space-y-2">
            <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
            <p>No operational expenses match your filter criteria.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xxs uppercase tracking-wider">
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Source / Role</th>
                <th className="px-6 py-3.5">Logged By</th>
                <th className="px-6 py-3.5">Description Notes</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-xl text-xxs font-bold border uppercase tracking-wider ${getCategoryColor(e.category)}`}>
                      {e.category.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {getSourceBadge(e.user.role)}
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{e.user.name}</div>
                  </td>

                  <td className="px-6 py-4 text-slate-600 max-w-sm truncate">
                    {e.notes || '-'}
                  </td>

                  <td className="px-6 py-4 font-extrabold text-slate-900 text-sm">
                    ₹{Number(e.amount).toFixed(2)}
                  </td>

                  <td className="px-6 py-4 text-slate-400 text-right text-xxs font-medium">
                    {new Date(e.date).toLocaleDateString()}{' '}
                    <span className="text-slate-300">
                      {new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE EXPENSE DIALOG (Drawer) */}
      {showDialog && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs"
            onClick={() => setShowDialog(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col space-y-6 animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-850 text-sm">Log Operational Expense</h3>
                <p className="text-xxs text-slate-400 font-medium mt-0.5">
                  {isCashier ? 'Deducted from open cashier till balance' : 'General store operational payout'}
                </p>
              </div>
              <button
                onClick={() => setShowDialog(false)}
                className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((data) => expenseMutation.mutate(data))} className="space-y-4 text-slate-705 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">
                      Category
                    </label>
                    <select
                      {...register('category')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white text-slate-855 cursor-pointer"
                    >
                      <option value="VEGETABLES">Vegetables</option>
                      <option value="MILK">Milk</option>
                      <option value="GAS">Gas</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="PETROL">Petrol</option>
                      <option value="MISCELLANEOUS">Miscellaneous</option>
                    </select>
                    {errors.category ? <p className="mt-1 text-xs text-rose-600">{errors.category.message?.toString()}</p> : null}
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      {...register('date')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white text-slate-855"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('amount')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:bg-white text-slate-900"
                    placeholder="0.00"
                  />
                  {errors.amount ? <p className="mt-1 text-xs text-rose-600">{errors.amount.message?.toString()}</p> : null}
                </div>

                <div>
                  <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">
                    Description Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:bg-white h-24 text-slate-855"
                    placeholder="e.g. Purchased fresh vegetables, LPG cylinder refill, petrol for delivery..."
                  />
                </div>

                {isCashier && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xxs font-medium space-y-1">
                    <span className="font-bold block flex items-center gap-1.5 text-amber-950">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                      Shift Petty Cash Payout Notice
                    </span>
                    <p className="text-amber-800 leading-relaxed">
                      This expense will be deducted from your active shift till balance when closing the shift.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={expenseMutation.isPending}
                  className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl active-press transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {expenseMutation.isPending ? 'Logging Expense...' : 'Confirm Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* PRINT-ONLY EXPENSES REPORT */}
      <div id="print-expenses-report-section" className="hidden print:block p-6 text-slate-900 font-sans text-xs">
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-lg font-bold">Kyra Cafe - Operational Expenses Audit Report</h1>
          <p className="text-xs text-slate-500">Date Range: {dateFilter} ({startDate} to {endDate})</p>
          <p className="text-xxs text-slate-400">Generated on: {new Date().toLocaleString()}</p>
        </div>

        <table className="w-full text-left text-xs border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 font-bold border-b border-slate-300">
              <th className="p-2 border">Category</th>
              <th className="p-2 border">Logged By</th>
              <th className="p-2 border">Source Role</th>
              <th className="p-2 border">Notes</th>
              <th className="p-2 border text-right">Amount (₹)</th>
              <th className="p-2 border text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((e) => (
              <tr key={e.id} className="border-b border-slate-200">
                <td className="p-2 border font-bold">{e.category}</td>
                <td className="p-2 border">{e.user.name}</td>
                <td className="p-2 border">{e.user.role}</td>
                <td className="p-2 border">{e.notes || '-'}</td>
                <td className="p-2 border text-right font-bold">₹{Number(e.amount).toFixed(2)}</td>
                <td className="p-2 border text-right">{new Date(e.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 text-right text-sm font-bold">
          Total Operational Expenses: ₹{totalExpenses.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
