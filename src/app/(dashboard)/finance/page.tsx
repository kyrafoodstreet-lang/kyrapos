'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Search,
  Loader,
  AlertCircle,
  RefreshCw,
  Download,
  Banknote,
  Smartphone,
  CreditCard,
  Wallet,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  Filter,
  IndianRupee,
  Landmark,
  Gamepad2,
  Sparkles,
  Printer as PrinterIcon,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface Transaction {
  id: string;
  source: 'POS' | 'GAMES';
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  method: string;
  details: any;
  orderType: string;
  cashierName: string;
  date: string;
}

interface FinanceData {
  kpis: {
    totalRevenue: number;
    totalTransactions: number;
    totalCash: number;
    totalUpi: number;
    totalCard: number;
    totalMixed: number;
    averageTransactionValue: number;
  };
  sourceBreakdown: {
    pos: number;
    games: number;
  };
  dailyBreakdown: Array<{ date: string; cash: number; upi: number; card: number; total: number }>;
  transactions: Transaction[];
}

export default function FinancePage() {
  // Date helpers
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

  // Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  const handleQuickFilter = (type: typeof dateFilter) => {
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

  // Fetch finance data
  const { data, isLoading, error, refetch, isRefetching } = useQuery<FinanceData>({
    queryKey: ['financeReport', dateFilter, startDate, endDate],
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
      const res = await api.get('/reports/finance', { params: { startDate: sDate, endDate: eDate } });
      return res.data;
    },
  });

  // CSV Download — Clean Day-wise Report for Excel
  const handleDownloadCSV = () => {
    if (!data) return;
    const filtered = getFilteredTransactions();
    const rows: string[] = [];

    // Helper: safely escape a CSV cell value
    const esc = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    // Helper: format date for display
    const fmtDate = (dateStr: string) => {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const fmtDay = (dateStr: string) => {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' });
    };

    // ────────────────────────────────────────
    // SECTION 1: REPORT HEADER
    // ────────────────────────────────────────
    rows.push('KYRA POS - FINANCE REPORT');
    rows.push(`Report Period,${startDate} to ${endDate}`);
    rows.push(`Generated On,${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })},${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    rows.push('');
    rows.push('');

    // ────────────────────────────────────────
    // SECTION 2: OVERALL SUMMARY (clean table)
    // ────────────────────────────────────────
    rows.push('OVERALL COLLECTION SUMMARY');
    rows.push('Description,Amount,Percentage');
    rows.push(`Total Revenue,${data.kpis.totalRevenue.toFixed(2)},100%`);
    rows.push(`Total Transactions,${data.kpis.totalTransactions},`);
    rows.push(`Average Transaction Value,${data.kpis.averageTransactionValue.toFixed(2)},`);
    rows.push('');
    rows.push('PAYMENT METHOD BREAKDOWN');
    rows.push('Method,Amount,Share');
    const rev = data.kpis.totalRevenue || 1;
    rows.push(`Cash,${data.kpis.totalCash.toFixed(2)},${((data.kpis.totalCash / rev) * 100).toFixed(1)}%`);
    rows.push(`UPI,${data.kpis.totalUpi.toFixed(2)},${((data.kpis.totalUpi / rev) * 100).toFixed(1)}%`);
    rows.push(`Card,${data.kpis.totalCard.toFixed(2)},${((data.kpis.totalCard / rev) * 100).toFixed(1)}%`);
    rows.push(`Mixed,${data.kpis.totalMixed.toFixed(2)},${((data.kpis.totalMixed / rev) * 100).toFixed(1)}%`);
    rows.push('');
    rows.push('SOURCE BREAKDOWN');
    rows.push('Source,Amount');
    rows.push(`POS Orders,${data.sourceBreakdown.pos.toFixed(2)}`);
    rows.push(`Games,${data.sourceBreakdown.games.toFixed(2)}`);
    rows.push('');
    rows.push('');

    // ────────────────────────────────────────
    // SECTION 3: DAY-WISE COLLECTION
    // ────────────────────────────────────────
    // Build day-wise data from filtered transactions
    const dayWise: Record<string, {
      date: string;
      cash: number; upi: number; card: number; mixed: number; total: number; txnCount: number;
      posCash: number; posUpi: number; posCard: number; posTotal: number;
      gameCash: number; gameUpi: number; gameCard: number; gameTotal: number;
    }> = {};

    filtered.forEach((t) => {
      const dateStr = new Date(t.date).toISOString().split('T')[0];
      if (!dayWise[dateStr]) {
        dayWise[dateStr] = {
          date: dateStr,
          cash: 0, upi: 0, card: 0, mixed: 0, total: 0, txnCount: 0,
          posCash: 0, posUpi: 0, posCard: 0, posTotal: 0,
          gameCash: 0, gameUpi: 0, gameCard: 0, gameTotal: 0,
        };
      }
      const d = dayWise[dateStr];
      d.txnCount++;
      d.total += t.amount;

      const method = t.method.toUpperCase();
      if (method === 'CASH') d.cash += t.amount;
      else if (method === 'UPI' || method === 'BANK_TRANSFER') d.upi += t.amount;
      else if (method === 'CARD') d.card += t.amount;
      else if (method === 'MIXED') {
        d.mixed += t.amount;
        if (t.details) {
          d.cash += Number(t.details.cashAmount || 0);
          d.upi += Number(t.details.upiAmount || 0);
          d.card += Number(t.details.cardAmount || 0);
        }
      }

      if (t.source === 'POS') {
        d.posTotal += t.amount;
        if (method === 'CASH') d.posCash += t.amount;
        else if (method === 'UPI' || method === 'BANK_TRANSFER') d.posUpi += t.amount;
        else if (method === 'CARD') d.posCard += t.amount;
        else if (method === 'MIXED' && t.details) {
          d.posCash += Number(t.details.cashAmount || 0);
          d.posUpi += Number(t.details.upiAmount || 0);
          d.posCard += Number(t.details.cardAmount || 0);
        }
      } else if (t.source === 'GAMES') {
        d.gameTotal += t.amount;
        if (method.includes('CASH')) d.gameCash += t.amount;
        else if (method.includes('UPI')) d.gameUpi += t.amount;
        else if (method.includes('CARD')) d.gameCard += t.amount;
      }
    });

    const sortedDays = Object.values(dayWise).sort((a, b) => a.date.localeCompare(b.date));

    rows.push('DAY-WISE COLLECTION REPORT');
    rows.push('Date,Day,Cash,UPI,Card,Mixed,Total,Transactions');

    let gCash = 0, gUpi = 0, gCard = 0, gMixed = 0, gTotal = 0, gTxn = 0;
    sortedDays.forEach((d) => {
      rows.push(`${fmtDate(d.date)},${fmtDay(d.date)},${d.cash.toFixed(2)},${d.upi.toFixed(2)},${d.card.toFixed(2)},${d.mixed.toFixed(2)},${d.total.toFixed(2)},${d.txnCount}`);
      gCash += d.cash; gUpi += d.upi; gCard += d.card; gMixed += d.mixed; gTotal += d.total; gTxn += d.txnCount;
    });
    rows.push(`TOTAL,,${gCash.toFixed(2)},${gUpi.toFixed(2)},${gCard.toFixed(2)},${gMixed.toFixed(2)},${gTotal.toFixed(2)},${gTxn}`);
    rows.push('');
    rows.push('');

    // ────────────────────────────────────────
    // SECTION 4: SOURCE-WISE DAILY BREAKDOWN
    // ────────────────────────────────────────
    rows.push('SOURCE-WISE DAILY COLLECTION');
    rows.push('Date,Day,POS Cash,POS UPI,POS Card,POS Total,Games Cash,Games UPI,Games Card,Games Total,Day Total');

    sortedDays.forEach((d) => {
      const dayShort = new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
      rows.push([
        fmtDate(d.date), dayShort,
        d.posCash.toFixed(2), d.posUpi.toFixed(2), d.posCard.toFixed(2), d.posTotal.toFixed(2),
        d.gameCash.toFixed(2), d.gameUpi.toFixed(2), d.gameCard.toFixed(2), d.gameTotal.toFixed(2),
        d.total.toFixed(2),
      ].join(','));
    });

    rows.push([
      'TOTAL', '',
      sortedDays.reduce((s, d) => s + d.posCash, 0).toFixed(2),
      sortedDays.reduce((s, d) => s + d.posUpi, 0).toFixed(2),
      sortedDays.reduce((s, d) => s + d.posCard, 0).toFixed(2),
      sortedDays.reduce((s, d) => s + d.posTotal, 0).toFixed(2),
      sortedDays.reduce((s, d) => s + d.gameCash, 0).toFixed(2),
      sortedDays.reduce((s, d) => s + d.gameUpi, 0).toFixed(2),
      sortedDays.reduce((s, d) => s + d.gameCard, 0).toFixed(2),
      sortedDays.reduce((s, d) => s + d.gameTotal, 0).toFixed(2),
      gTotal.toFixed(2),
    ].join(','));
    rows.push('');
    rows.push('');

    // ────────────────────────────────────────
    // SECTION 5: ALL TRANSACTIONS
    // ────────────────────────────────────────
    rows.push('ALL TRANSACTIONS');
    rows.push('Date,Time,Day,Source,Reference,Customer,Phone,Method,Amount,Order Type,Cashier');

    filtered.forEach((t) => {
      const dt = new Date(t.date);
      rows.push([
        dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dt.toLocaleDateString('en-IN', { weekday: 'short' }),
        t.source,
        t.referenceNumber,
        esc(t.customerName),
        t.customerPhone,
        t.method,
        t.amount.toFixed(2),
        t.orderType,
        t.cashierName,
      ].join(','));
    });

    rows.push('');
    rows.push(`Total Transactions,,,,,,,,${filtered.reduce((s, t) => s + t.amount, 0).toFixed(2)}`);

    // Build CSV with UTF-8 BOM for proper Excel encoding
    const BOM = '\uFEFF';
    const csv = BOM + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };



  const getFilteredTransactions = () => {
    if (!data) return [];
    return data.transactions.filter((t) => {
      const matchesSearch =
        t.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerPhone.includes(searchQuery);
      const matchesMethod = methodFilter === 'ALL' || t.method === methodFilter;
      const matchesSource = sourceFilter === 'ALL' || t.source === sourceFilter;
      return matchesSearch && matchesMethod && matchesSource;
    });
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
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>Failed to load finance data. Make sure you are logged in as ADMIN.</span>
      </div>
    );
  }

  const filteredTransactions = getFilteredTransactions();
  const { kpis, sourceBreakdown } = data;

  // Compute method percentage bars
  const methodTotal = kpis.totalCash + kpis.totalUpi + kpis.totalCard;
  const cashPct = methodTotal > 0 ? (kpis.totalCash / methodTotal) * 100 : 0;
  const upiPct = methodTotal > 0 ? (kpis.totalUpi / methodTotal) * 100 : 0;
  const cardPct = methodTotal > 0 ? (kpis.totalCard / methodTotal) * 100 : 0;

  const sourceTotal = sourceBreakdown.pos + sourceBreakdown.games;
  const posPct = sourceTotal > 0 ? (sourceBreakdown.pos / sourceTotal) * 100 : 0;
  const gamesPct = sourceTotal > 0 ? (sourceBreakdown.games / sourceTotal) * 100 : 0;

  const getMethodBadge = (method: string) => {
    const m = method.toUpperCase();
    if (m === 'CASH') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (m === 'UPI') return 'bg-blue-50 text-blue-800 border-blue-200';
    if (m === 'CARD') return 'bg-purple-50 text-purple-800 border-purple-200';
    if (m.includes('BANK')) return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    return 'bg-amber-50 text-amber-800 border-amber-200';
  };

  const getSourceBadge = (source: string) => {
    if (source === 'POS') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (source === 'GAMES') return 'bg-violet-50 text-violet-700 border-violet-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getSourceIcon = (source: string) => {
    if (source === 'POS') return <PrinterIcon className="h-3 w-3" />;
    if (source === 'GAMES') return <Gamepad2 className="h-3 w-3" />;
    return null;
  };

  return (
    <div className="space-y-6 text-slate-700 font-sans pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-850 tracking-tight">Finance & Payments</h2>
            <span className="px-2 py-0.5 bg-primary-light text-primary border border-primary/20 text-xxs font-bold rounded-full">
              {filteredTransactions.length} Transactions
            </span>
          </div>
          <p className="text-xxs text-slate-400 mt-0.5 font-medium">
            Unified payment ledger across POS & Games. Track collections, download reports.
          </p>
        </div>

        {/* Date Filter Controls */}
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
            <div className="flex items-center gap-2 text-xxs font-semibold bg-white p-1 rounded-xl border border-slate-200 shadow-xxs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-medium text-slate-850"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-medium text-slate-850"
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Total Revenue */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
            <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-200">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">₹{kpis.totalRevenue.toFixed(2)}</h3>
          <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> All sources combined
          </p>
        </div>

        {/* Total Transactions */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transactions</span>
            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-200">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">{kpis.totalTransactions}</h3>
          <p className="text-[10px] text-slate-400 font-medium">Payment entries</p>
        </div>

        {/* Cash */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash</span>
            <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-200">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900">₹{kpis.totalCash.toFixed(2)}</h3>
          <p className="text-[10px] text-emerald-600 font-semibold">{cashPct.toFixed(1)}% of total</p>
        </div>

        {/* UPI */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UPI</span>
            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-200">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900">₹{kpis.totalUpi.toFixed(2)}</h3>
          <p className="text-[10px] text-blue-600 font-semibold">{upiPct.toFixed(1)}% of total</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card</span>
            <div className="h-8 w-8 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-200">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900">₹{kpis.totalCard.toFixed(2)}</h3>
          <p className="text-[10px] text-purple-600 font-semibold">{cardPct.toFixed(1)}% of total</p>
        </div>

        {/* Mixed */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mixed</span>
            <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-200">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900">₹{kpis.totalMixed.toFixed(2)}</h3>
          <p className="text-[10px] text-amber-600 font-semibold">Split payments</p>
        </div>

        {/* Avg Transaction */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Value</span>
            <div className="h-8 w-8 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center border border-teal-200">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900">₹{kpis.averageTransactionValue.toFixed(2)}</h3>
          <p className="text-[10px] text-slate-400 font-medium">Per transaction</p>
        </div>
      </div>

      {/* Payment Method Distribution Bar & Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Method Distribution */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Payment Method Distribution
            </h3>
          </div>

          {/* Stacked Bar */}
          <div className="h-5 rounded-full overflow-hidden flex bg-slate-100">
            {cashPct > 0 && (
              <div
                className="bg-emerald-500 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${cashPct}%` }}
                title={`Cash: ${cashPct.toFixed(1)}%`}
              >
                {cashPct > 10 && <span className="text-[9px] font-bold text-white">{cashPct.toFixed(0)}%</span>}
              </div>
            )}
            {upiPct > 0 && (
              <div
                className="bg-blue-500 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${upiPct}%` }}
                title={`UPI: ${upiPct.toFixed(1)}%`}
              >
                {upiPct > 10 && <span className="text-[9px] font-bold text-white">{upiPct.toFixed(0)}%</span>}
              </div>
            )}
            {cardPct > 0 && (
              <div
                className="bg-purple-500 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${cardPct}%` }}
                title={`Card: ${cardPct.toFixed(1)}%`}
              >
                {cardPct > 10 && <span className="text-[9px] font-bold text-white">{cardPct.toFixed(0)}%</span>}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xxs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">Cash ₹{kpis.totalCash.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-600">UPI ₹{kpis.totalUpi.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500"></span>
              <span className="text-slate-600">Card ₹{kpis.totalCard.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Source Revenue Breakdown */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              Revenue by Source
            </h3>
          </div>

          <div className="space-y-3">
            {/* POS */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xxs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <PrinterIcon className="h-3.5 w-3.5 text-blue-500" /> POS Orders
                </span>
                <span className="text-slate-900">₹{sourceBreakdown.pos.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${posPct}%` }}
                />
              </div>
            </div>

            {/* Games */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xxs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Gamepad2 className="h-3.5 w-3.5 text-violet-500" /> Games
                </span>
                <span className="text-slate-900">₹{sourceBreakdown.games.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${gamesPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Mini Chart */}
      {data.dailyBreakdown.length > 1 && (
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Daily Revenue Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1.5 min-w-fit" style={{ height: '120px' }}>
              {data.dailyBreakdown.map((day) => {
                const maxDayTotal = Math.max(...data.dailyBreakdown.map((d) => d.total), 1);
                const barHeight = (day.total / maxDayTotal) * 100;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1 min-w-[40px]">
                    <span className="text-[9px] font-bold text-slate-600">₹{day.total.toFixed(0)}</span>
                    <div
                      className="w-8 bg-gradient-to-t from-primary/80 to-primary/40 rounded-t-lg transition-all duration-300 hover:from-primary hover:to-primary/60"
                      style={{ height: `${Math.max(barHeight, 4)}%` }}
                      title={`${day.date}: ₹${day.total.toFixed(2)} | Cash: ₹${day.cash.toFixed(0)} | UPI: ₹${day.upi.toFixed(0)} | Card: ₹${day.card.toFixed(0)}`}
                    />
                    <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                      {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-6 space-y-5">
        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by reference, customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:bg-white focus:border-primary text-slate-850 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Method Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-700 text-xs cursor-pointer font-bold"
              >
                <option value="ALL">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="MIXED">Mixed</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold">
              <Landmark className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-transparent focus:outline-none text-slate-700 text-xs cursor-pointer font-bold"
              >
                <option value="ALL">All Sources</option>
                <option value="POS">POS</option>
                <option value="GAMES">Games</option>
              </select>
            </div>

            {/* Download CSV */}
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xxs font-bold rounded-xl hover:bg-primary-hover shadow-xs transition-all cursor-pointer active-press"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Report</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium space-y-2">
              <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
              <p>No payment transactions found for the selected filters.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 text-xxs uppercase tracking-wider">
                  <th className="px-4 py-3 rounded-l-xl">Date & Time</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 rounded-r-xl">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 text-xxs text-slate-500 font-medium whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString()}{' '}
                      <span className="text-slate-400 font-normal">
                        {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xxs font-extrabold uppercase border ${getSourceBadge(t.source)}`}>
                        {getSourceIcon(t.source)}
                        {t.source}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-extrabold text-slate-900 text-xs">{t.referenceNumber}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{t.customerName}</div>
                      {t.customerPhone && <div className="text-xxs text-slate-400 font-mono">{t.customerPhone}</div>}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-lg text-xxs font-extrabold uppercase border ${getMethodBadge(t.method)}`}>
                        {t.method}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-slate-900 text-sm">
                      ₹{t.amount.toFixed(2)}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">
                        {t.orderType}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600 font-semibold">
                      {t.cashierName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer summary row */}
        {filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xxs text-slate-400 font-semibold">
              Showing {filteredTransactions.length} of {data.transactions.length} transactions
            </span>
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
              Total: ₹{filteredTransactions.reduce((s, t) => s + t.amount, 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
