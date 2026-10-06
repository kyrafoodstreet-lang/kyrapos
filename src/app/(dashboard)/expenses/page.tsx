'use client';

import React, { useState, useMemo } from 'react';
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
  Calendar,
  Filter,
  Search,
  Printer,
  ShieldAlert,
  UserCheck,
  User,
  ShoppingBag,
  RefreshCw,
  CheckCircle2,
  Flame,
  Fuel,
  Sparkles,
  Tag,
  FileSpreadsheet,
  Layers,
  Clock,
} from 'lucide-react';

const expenseSchema = z.object({
  category: z.enum(['VEGETABLES', 'MILK', 'GAS', 'CLEANING', 'PETROL', 'MISCELLANEOUS']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  notes: z.string().optional(),
  date: z.string().optional(),
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

const CATEGORY_META: Record<
  string,
  { label: string; icon: any; bg: string; text: string; border: string; accent: string }
> = {
  VEGETABLES: {
    label: 'Vegetables',
    icon: ShoppingBag,
    bg: 'bg-emerald-50/80',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    accent: '#009966',
  },
  MILK: {
    label: 'Milk & Dairy',
    icon: Sparkles,
    bg: 'bg-sky-50/80',
    text: 'text-sky-700',
    border: 'border-sky-200/80',
    accent: '#0284c7',
  },
  GAS: {
    label: 'Gas & LPG',
    icon: Flame,
    bg: 'bg-amber-50/80',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
    accent: '#d97706',
  },
  CLEANING: {
    label: 'Cleaning',
    icon: Sparkles,
    bg: 'bg-purple-50/80',
    text: 'text-purple-700',
    border: 'border-purple-200/80',
    accent: '#7c3aed',
  },
  PETROL: {
    label: 'Petrol & Fuel',
    icon: Fuel,
    bg: 'bg-rose-50/80',
    text: 'text-rose-700',
    border: 'border-rose-200/80',
    accent: '#D94949',
  },
  MISCELLANEOUS: {
    label: 'Miscellaneous',
    icon: Tag,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    accent: '#64748b',
  },
};

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const activeShift = useShiftStore((state) => state.activeShift);

  const [showDialog, setShowDialog] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  const { data: expenses = [], isLoading, refetch, isRefetching } = useQuery<Expense[]>({
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: 'VEGETABLES',
      amount: '',
      notes: '',
      date: getTodayString(),
    },
  });

  const selectedCategory = watch('category');
  const currentAmountValue = watch('amount');

  // Create Expense Mutation
  const expenseMutation = useMutation({
    mutationFn: async (data: ExpenseSchema) => {
      return (
        await api.post('/expenses', {
          ...data,
          date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['activeShift'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowDialog(false);
      reset({ category: 'VEGETABLES', amount: '', notes: '', date: getTodayString() });
      setToastMessage({ type: 'success', text: 'Expense successfully recorded into ledger.' });
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to record expense. Please verify your inputs.',
      });
      setTimeout(() => setToastMessage(null), 5000);
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

  const isCashier = user?.role === 'CASHIER';
  const isShiftClosedForCashier = isCashier && !activeShift;

  const getSourceBadge = (role: string) => {
    switch (role) {
      case 'CASHIER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/90 rounded-full text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Cashier Till
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200/90 rounded-full text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Manager Payout
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200/90 rounded-full text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Admin Store
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold">
            {role}
          </span>
        );
    }
  };

  // Filtering Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
      const matchesSource = sourceFilter === 'ALL' || e.user.role === sourceFilter;
      const matchesSearch =
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.user.name && e.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        e.category.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSource && matchesSearch;
    });
  }, [expenses, categoryFilter, sourceFilter, searchQuery]);

  // KPI Calculations
  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((acc, exp) => acc + Number(exp.amount), 0),
    [filteredExpenses]
  );
  const cashierExpenses = useMemo(
    () =>
      filteredExpenses
        .filter((e) => e.user.role === 'CASHIER')
        .reduce((acc, exp) => acc + Number(exp.amount), 0),
    [filteredExpenses]
  );
  const managerExpenses = useMemo(
    () =>
      filteredExpenses
        .filter((e) => e.user.role === 'MANAGER')
        .reduce((acc, exp) => acc + Number(exp.amount), 0),
    [filteredExpenses]
  );
  const adminExpenses = useMemo(
    () =>
      filteredExpenses
        .filter((e) => e.user.role === 'ADMIN')
        .reduce((acc, exp) => acc + Number(exp.amount), 0),
    [filteredExpenses]
  );

  // Category Breakdown Totals
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of filteredExpenses) {
      map[exp.category] = (map[exp.category] || 0) + Number(exp.amount);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      setToastMessage({ type: 'error', text: 'No expense records available to export.' });
      setTimeout(() => setToastMessage(null), 3000);
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

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kyra-pos-expenses-${dateFilter}-${startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage({ type: 'success', text: `Exported ${filteredExpenses.length} expense rows to CSV.` });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading Expense Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-700 pb-16">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold transition-all animate-in slide-in-from-top duration-200 border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
              : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-200" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-80 transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-50/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-[#D94949] shadow-xs shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Expense Management
                </h1>
                <span className="px-2.5 py-0.5 bg-rose-50 text-[#D94949] border border-rose-200 text-[11px] font-black rounded-full">
                  {filteredExpenses.length} Records
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Real-time operational cash-outs, cashier till deductions & store payouts ledger
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/90 transition-all cursor-pointer shadow-2xs hover:border-slate-300"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/90 transition-all cursor-pointer shadow-2xs hover:border-slate-300"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span>Print Audit</span>
            </button>

            <button
              onClick={() => {
                if (isShiftClosedForCashier) {
                  setToastMessage({
                    type: 'error',
                    text: 'Shift Locked: Cashiers must have an OPEN shift before logging till expenses.',
                  });
                  setTimeout(() => setToastMessage(null), 4000);
                  return;
                }
                reset({ category: 'VEGETABLES', amount: '', notes: '', date: getTodayString() });
                setShowDialog(true);
              }}
              disabled={isShiftClosedForCashier}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer ${
                isShiftClosedForCashier
                  ? 'bg-slate-300 opacity-60 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 active:scale-[0.98]'
              }`}
            >
              <Plus className="h-4 w-4 text-rose-400" />
              <span>Log Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cashier Shift Warning Notice */}
      {isShiftClosedForCashier && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold block text-slate-900">Cashier Till Locked</span>
              <span className="text-[11px] text-amber-800 font-medium">
                Your cashier shift is closed. Open a active shift on the <strong>Shifts</strong> page before logging till cash-outs.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Expenses Card */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/60 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="h-9 w-9 bg-rose-50 text-[#D94949] rounded-2xl flex items-center justify-center border border-rose-200/70 shadow-2xs">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 relative z-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-[#D94949] font-bold flex items-center gap-1 mt-1">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Combined operational cash-outs</span>
            </p>
          </div>
        </div>

        {/* Cashier Till Payouts */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/60 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Cashier Till Cash
            </span>
            <div className="h-9 w-9 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200/70 shadow-2xs">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 relative z-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{cashierExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">
              Deducted from cashier register shifts
            </p>
          </div>
        </div>

        {/* Manager General Expenses */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50/60 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Manager Payouts
            </span>
            <div className="h-9 w-9 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center border border-sky-200/70 shadow-2xs">
              <UserCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 relative z-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{managerExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-sky-700 font-semibold mt-1">
              Manager store operational purchases
            </p>
          </div>
        </div>

        {/* Admin Direct Expenses */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/60 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Admin Direct
            </span>
            <div className="h-9 w-9 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-200/70 shadow-2xs">
              <User className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 relative z-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{adminExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-purple-700 font-semibold mt-1">
              Owner direct supplier invoices
            </p>
          </div>
        </div>
      </div>

      {/* 3. Category Distribution Bar */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Category Spending Distribution
              </span>
            </div>
            <span className="text-xxs font-bold text-slate-400">
              {categoryBreakdown.length} active spending groups
            </span>
          </div>

          {/* Visual Percentage Bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {categoryBreakdown.map(([cat, amount]) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              const meta = CATEGORY_META[cat] || CATEGORY_META.MISCELLANEOUS;
              return (
                <div
                  key={cat}
                  style={{ width: `${pct}%`, backgroundColor: meta.accent }}
                  className="h-full transition-all hover:opacity-90 relative group"
                  title={`${meta.label}: ₹${amount.toFixed(2)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Mini Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {categoryBreakdown.map(([cat, amount]) => {
              const meta = CATEGORY_META[cat] || CATEGORY_META.MISCELLANEOUS;
              const pct = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(0) : 0;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? 'ALL' : cat)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xxs font-bold transition-all cursor-pointer border ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : `${meta.bg} ${meta.text} ${meta.border} hover:opacity-80`
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
                  <span>{meta.label}</span>
                  <span className="opacity-70 font-semibold">₹{amount.toFixed(0)}</span>
                  <span className="opacity-60 text-[9px]">({pct}%)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Date & Filter Controls */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
              {(['today', 'yesterday', 'week', 'month', 'custom'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => handleQuickFilter(filter)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all capitalize cursor-pointer ${
                    dateFilter === filter
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {filter === 'week' ? 'This Week' : filter === 'month' ? 'This Month' : filter}
                </button>
              ))}
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 text-xs font-semibold bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 focus:outline-none font-bold text-slate-900 text-xs"
                />
                <span className="text-slate-400 text-xxs uppercase font-bold">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 focus:outline-none font-bold text-slate-900 text-xs"
                />
              </div>
            )}

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Refresh Records"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin text-rose-500' : ''}`} />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, payee, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-9 py-2 text-xs font-medium focus:outline-none focus:bg-white focus:border-slate-800 transition-all text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters Strip */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-semibold">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-900 text-xs font-bold cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="VEGETABLES">Vegetables</option>
              <option value="MILK">Milk & Dairy</option>
              <option value="GAS">Gas & LPG</option>
              <option value="CLEANING">Cleaning Supplies</option>
              <option value="PETROL">Petrol & Fuel</option>
              <option value="MISCELLANEOUS">Miscellaneous</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-semibold">
            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider">Source Role:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-900 text-xs font-bold cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="CASHIER">Cashier Shift Payouts</option>
              <option value="MANAGER">Manager Expenses</option>
              <option value="ADMIN">Admin Store Expenses</option>
            </select>
          </div>

          {(categoryFilter !== 'ALL' || sourceFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setCategoryFilter('ALL');
                setSourceFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xxs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 5. Expenses Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-16 px-6 text-slate-400 space-y-3">
            <div className="w-14 h-14 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mx-auto border border-slate-200">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Expense Records Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no operational expenses matching the selected date range and filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 font-extrabold border-b border-slate-200/80 text-xxs uppercase tracking-wider">
                  <th className="px-6 py-4">Expense Category</th>
                  <th className="px-6 py-4">Source Channel</th>
                  <th className="px-6 py-4">Recorded By</th>
                  <th className="px-6 py-4">Description Notes</th>
                  <th className="px-6 py-4">Amount Paid</th>
                  <th className="px-6 py-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredExpenses.map((e) => {
                  const meta = CATEGORY_META[e.category] || CATEGORY_META.MISCELLANEOUS;
                  const CategoryIcon = meta.icon;
                  return (
                    <tr
                      key={e.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Category */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs">
                          <span
                            className={`p-1 rounded-lg ${meta.bg} ${meta.text} border ${meta.border}`}
                          >
                            <CategoryIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-slate-900 font-extrabold">{meta.label}</span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-6 py-4">{getSourceBadge(e.user.role)}</td>

                      {/* Logged By */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-[11px] text-slate-700">
                            {e.user.name ? e.user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="font-bold text-slate-900 text-xs">{e.user.name}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 text-slate-600 max-w-sm">
                        <span className="line-clamp-2 text-xs font-medium">
                          {e.notes || <span className="text-slate-300 italic">No notes attached</span>}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-950 text-sm tracking-tight">
                          ₹{Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4 text-right text-xxs font-medium text-slate-400">
                        <div className="font-bold text-slate-700 text-xs">
                          {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
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

      {/* 6. CREATE EXPENSE SLIDE-OVER DRAWER */}
      {showDialog && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setShowDialog(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl p-6 sm:p-8 flex flex-col justify-between animate-slide-in overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-[#D94949]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Log Operational Expense</h3>
                    <p className="text-xxs text-slate-400 font-semibold mt-0.5">
                      {isCashier
                        ? 'Deducted directly from your active shift till balance'
                        : 'Recorded in universal restaurant operational ledger'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDialog(false)}
                  className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form
                id="expense-form"
                onSubmit={handleSubmit((data) => expenseMutation.mutate(data))}
                className="space-y-5"
              >
                {/* 1. Category Selection Grid */}
                <div>
                  <label className="block text-xxs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                    Select Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((catKey) => {
                      const meta = CATEGORY_META[catKey];
                      const Icon = meta.icon;
                      const isSelected = selectedCategory === catKey;
                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => setValue('category', catKey)}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10'
                              : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-white/10 text-white' : `${meta.bg} ${meta.text}`
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold leading-tight">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.category && (
                    <p className="mt-1 text-xs text-rose-600 font-bold">{errors.category.message?.toString()}</p>
                  )}
                </div>

                {/* 2. Amount Input & Quick Chips */}
                <div>
                  <label className="block text-xxs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                    Expense Amount (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      {...register('amount')}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-3.5 text-xl font-black text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all placeholder:text-slate-300"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-xs text-rose-600 font-bold">{errors.amount.message?.toString()}</p>
                  )}

                  {/* Quick Amount Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setValue('amount', amt)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          Number(currentAmountValue) === amt
                            ? 'bg-rose-50 border-rose-300 text-[#D94949] font-black'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        +₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Date Selection */}
                <div>
                  <label className="block text-xxs font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    Expense Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      {...register('date')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                    />
                  </div>
                </div>

                {/* 4. Description Notes */}
                <div>
                  <label className="block text-xxs font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    Description / Supplier Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="e.g. Purchased fresh tomatoes, LPG cylinder refill receipt #402..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium focus:outline-none focus:bg-white focus:border-slate-900 transition-all text-slate-900 placeholder:text-slate-400 resize-none"
                  />
                </div>

                {/* Shift Notice */}
                {isCashier && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-medium space-y-1">
                    <span className="font-black block flex items-center gap-1.5 text-amber-950">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      Cashier Till Balance Impact
                    </span>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      This payout will be deducted automatically from your cash-in-drawer upon closing shift.
                    </p>
                  </div>
                )}
              </form>
            </div>

            {/* Footer Buttons */}
            <div className="border-t border-slate-100 pt-5 mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="expense-form"
                disabled={expenseMutation.isPending}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl transition shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {expenseMutation.isPending ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin text-slate-300" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <span>Confirm Expense Log</span>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 7. PRINT-ONLY EXPENSES AUDIT REPORT */}
      <div id="print-expenses-report-section" className="hidden print:block p-6 text-slate-900 text-xs">
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-black">KYRA POS — Operational Expenses Audit Report</h1>
          <p className="text-xs text-slate-600 mt-1">
            Date Range: {dateFilter.toUpperCase()} ({startDate} to {endDate})
          </p>
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

        <div className="mt-4 text-right text-sm font-black">
          Total Operational Expenses: ₹{totalExpenses.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
