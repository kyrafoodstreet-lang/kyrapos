'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  CalendarCheck,
  Calendar,
  IndianRupee,
  Banknote,
  Smartphone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  History,
  RefreshCw,
  Lock,
  Unlock,
  Users,
  Gamepad2,
  TrendingUp,
  Receipt,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Info,
  Coins,
  Activity,
  Layers
} from 'lucide-react';

interface GameBreakdown {
  name: string;
  sessions: number;
  visitors: number;
  revenue: number;
  cash?: number;
  upi?: number;
  card?: number;
}

interface TransactionItem {
  id: string;
  sessionId: number;
  gameName: string;
  customerName: string;
  customerMobile: string;
  amount: number;
  method: string;
  notes?: string | null;
  time: string;
}

interface ClosingRecord {
  id: string;
  dateStr: string;
  closedAt: string;
  closedByName: string;
  totalRevenue: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  trampCash?: number;
  trampUpi?: number;
  coinCash?: number;
  coinUpi?: number;
  otherCash?: number;
  otherUpi?: number;
  actualCash: number;
  actualUpi: number;
  actualTrampCash?: number;
  actualTrampUpi?: number;
  actualCoinCash?: number;
  actualCoinUpi?: number;
  cashDifference: number;
  upiDifference: number;
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  totalVisitors: number;
  notes?: string | null;
}

interface DayCloseStatusResponse {
  date: string;
  displayDate: string;
  isClosed: boolean;
  closingRecord: ClosingRecord | null;
  summary: {
    totalRevenue: number;
    cashSales: number;
    upiSales: number;
    cardSales: number;
    mixedSales: number;
    trampCash: number;
    trampUpi: number;
    trampTotal: number;
    coinCash: number;
    coinUpi: number;
    coinTotal: number;
    otherCash: number;
    otherUpi: number;
    otherTotal: number;
    totalSessions: number;
    completedSessions: number;
    activeSessions: number;
    totalVisitors: number;
    byGame: GameBreakdown[];
  };
  transactions: TransactionItem[];
}

export default function GamesDayClosePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Form State for Simple Closing Modal
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [actualUpiInput, setActualUpiInput] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Day Close Status for Selected Date
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<DayCloseStatusResponse>({
    queryKey: ['gameDayCloseStatus', selectedDate],
    queryFn: async () => {
      const res = await api.get('/games/day-close/status', {
        params: { date: selectedDate },
      });
      return res.data;
    },
    refetchInterval: 15000,
  });

  // 2. Fetch History of Day Closings
  const { data: historyList, isLoading: isHistoryLoading, refetch: refetchHistory } = useQuery<ClosingRecord[]>({
    queryKey: ['gameDayCloseHistory'],
    queryFn: async () => {
      const res = await api.get('/games/day-close/history');
      return res.data;
    },
    enabled: activeTab === 'history',
  });

  // 3. Mutation to Close Day
  const closeDayMutation = useMutation({
    mutationFn: async (payload: {
      date: string;
      actualCash: number;
      actualUpi: number;
      notes?: string;
    }) => {
      const res = await api.post('/games/day-close', payload);
      return res.data;
    },
    onSuccess: () => {
      setIsCloseModalOpen(false);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['gameDayCloseStatus'] });
      queryClient.invalidateQueries({ queryKey: ['gameDayCloseHistory'] });
      queryClient.invalidateQueries({ queryKey: ['gamesDashboardStats'] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to close games day. Please try again.');
    },
  });

  const handleOpenCloseModal = () => {
    if (!data) return;
    setActualCashInput(data.closingRecord ? String(data.closingRecord.actualCash) : String(data.summary.cashSales));
    setActualUpiInput(data.closingRecord ? String(data.closingRecord.actualUpi) : String(data.summary.upiSales));
    setClosingNotes(data.closingRecord?.notes || '');
    setActionError(null);
    setIsCloseModalOpen(true);
  };

  // Live Calculations for Modal
  const expectedCash = data?.summary.cashSales || 0;
  const expectedUpi = data?.summary.upiSales || 0;
  const inputCashNum = parseFloat(actualCashInput) || 0;
  const inputUpiNum = parseFloat(actualUpiInput) || 0;

  const cashDiff = Math.round((inputCashNum - expectedCash) * 100) / 100;
  const upiDiff = Math.round((inputUpiNum - expectedUpi) * 100) / 100;

  const handleConfirmCloseDay = (e: React.FormEvent) => {
    e.preventDefault();

    closeDayMutation.mutate({
      date: selectedDate,
      actualCash: inputCashNum,
      actualUpi: inputUpiNum,
      notes: closingNotes,
    });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-700">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. Header Banner & Controls */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-850 tracking-tight flex items-center gap-2">
                <span>Games Day Close & Reconciliation</span>
                {data && (
                  <span
                    className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      data.isClosed
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    }`}
                  >
                    {data.isClosed ? '● Day Closed' : '● Open (Pending Close)'}
                  </span>
                )}
              </h1>
              <p className="text-xxs text-slate-400 mt-0.5 font-medium">
                Verify Trampoline & Coin Cash/UPI collections, record physical counts, and finalize day audit.
              </p>
            </div>
          </div>
        </div>

        {/* Action Tabs & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Day Closing
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Closing History</span>
            </button>
          </div>

          <button
            onClick={() => {
              refetch();
              if (activeTab === 'history') refetchHistory();
            }}
            disabled={isRefetching}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. Current Date Closing View */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'current' && (
        <div className="space-y-6">
          {/* Date Selector Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Target Date:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayStr())}
                  className={`px-2.5 py-1 text-xxs font-bold rounded-lg border transition-all cursor-pointer ${
                    selectedDate === getTodayStr()
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(getYesterdayStr())}
                  className={`px-2.5 py-1 text-xxs font-bold rounded-lg border transition-all cursor-pointer ${
                    selectedDate === getYesterdayStr()
                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs px-3 py-1.5 rounded-xl focus:outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
              />
              {data && (
                <span className="text-xxs font-bold text-slate-400 hidden md:inline">
                  {data.displayDate}
                </span>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
            </div>
          )}

          {/* Error Message */}
          {isError && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>Failed to fetch game day close statistics. Please try again.</span>
            </div>
          )}

          {data && !isLoading && (
            <>
              {/* Day Status Banner */}
              <div
                className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
                  data.isClosed
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-start md:items-center gap-3.5">
                  <div
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                      data.isClosed
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'bg-amber-100 border-amber-300 text-amber-700'
                    }`}
                  >
                    {data.isClosed ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">
                      {data.isClosed
                        ? `Games Day was CLOSED for ${data.date}`
                        : `Games Day is currently OPEN for ${data.date}`}
                    </h3>
                    <p className="text-xs opacity-85 mt-0.5">
                      {data.isClosed
                        ? `Closed on ${new Date(data.closingRecord!.closedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} by ${data.closingRecord!.closedByName}. Physical counts reconciled.`
                        : `Total of ${data.summary.totalSessions} sessions recorded today. Close the day to reconcile physical cash & UPI.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                  <button
                    onClick={handlePrintReceipt}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xxs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-slate-500" />
                    <span>Print Report</span>
                  </button>

                  <button
                    onClick={handleOpenCloseModal}
                    className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      data.isClosed
                        ? 'bg-slate-800 hover:bg-slate-900 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white active-press'
                    }`}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>{data.isClosed ? 'Update Day Close' : 'Close Games Day'}</span>
                  </button>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* PRIMARY KPI CARDS: Tramp Cash, Tramp UPI, Coin Cash, Coin UPI */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-rose-500" />
                    <span>Attraction Payment Collections (TRAMPOLINE & COIN BREAKDOWN)</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Trampoline Cash Card */}
                  <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white p-4.5 rounded-2xl border border-emerald-200 shadow-xs relative overflow-hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-emerald-600" />
                        <span>Tramp Cash</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        Trampoline
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-emerald-950">₹{data.summary.trampCash.toFixed(2)}</h3>
                    <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold pt-1 border-t border-emerald-100">
                      <span>Physical Cash</span>
                      <span>Total Tramp: ₹{data.summary.trampTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Trampoline UPI Card */}
                  <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white p-4.5 rounded-2xl border border-blue-200 shadow-xs relative overflow-hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        <span>Tramp UPI</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        Trampoline
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-blue-950">₹{data.summary.trampUpi.toFixed(2)}</h3>
                    <div className="flex items-center justify-between text-[11px] text-blue-700 font-semibold pt-1 border-t border-blue-100">
                      <span>Online QR / UPI</span>
                      <span>Total Tramp: ₹{data.summary.trampTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Coin Games Cash Card */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-4.5 rounded-2xl border border-amber-200 shadow-xs relative overflow-hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-amber-600" />
                        <span>Coin Cash</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                        Coin / Arcade
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-amber-950">₹{data.summary.coinCash.toFixed(2)}</h3>
                    <div className="flex items-center justify-between text-[11px] text-amber-700 font-semibold pt-1 border-t border-amber-100">
                      <span>Physical Cash</span>
                      <span>Total Coin: ₹{data.summary.coinTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Coin Games UPI Card */}
                  <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white p-4.5 rounded-2xl border border-purple-200 shadow-xs relative overflow-hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-purple-600" />
                        <span>Coin UPI</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                        Coin / Arcade
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-purple-950">₹{data.summary.coinUpi.toFixed(2)}</h3>
                    <div className="flex items-center justify-between text-[11px] text-purple-700 font-semibold pt-1 border-t border-purple-100">
                      <span>Online QR / UPI</span>
                      <span>Total Coin: ₹{data.summary.coinTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* Secondary Overall Summary Cards */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {/* Total Games Revenue */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Games Revenue</span>
                  <h4 className="text-lg font-black text-slate-900">₹{data.summary.totalRevenue.toFixed(2)}</h4>
                  <p className="text-[10px] text-slate-400">All attractions combined</p>
                </div>

                {/* Total Cash Collected */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Cash Collected</span>
                  <h4 className="text-lg font-black text-slate-900">₹{data.summary.cashSales.toFixed(2)}</h4>
                  <p className="text-[10px] text-slate-400">Tramp + Coin + Other Cash</p>
                </div>

                {/* Total UPI Collected */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total UPI Collected</span>
                  <h4 className="text-lg font-black text-slate-900">₹{data.summary.upiSales.toFixed(2)}</h4>
                  <p className="text-[10px] text-slate-400">Tramp + Coin + Other UPI</p>
                </div>

                {/* Sessions */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sessions</span>
                  <h4 className="text-lg font-black text-slate-900">{data.summary.totalSessions}</h4>
                  <p className="text-[10px] text-slate-400">{data.summary.completedSessions} done, {data.summary.activeSessions} active</p>
                </div>

                {/* Total Visitors */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Guests / Players</span>
                  <h4 className="text-lg font-black text-slate-900">{data.summary.totalVisitors}</h4>
                  <p className="text-[10px] text-slate-400">Headcount entries</p>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* Closed Reconciliation Summary (If already closed) */}
              {/* ───────────────────────────────────────────────────────────── */}
              {data.isClosed && data.closingRecord && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Reconciled Closing Audit Report</span>
                    </h3>
                    <span className="text-xxs font-medium text-slate-400">
                      Closed by: <strong className="text-slate-700">{data.closingRecord.closedByName}</strong> at{' '}
                      {new Date(data.closingRecord.closedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Trampoline Reconciled */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <span className="text-xxs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" /> Trampoline Reconciled
                      </span>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tramp Cash:</span>
                          <span className="font-bold text-slate-800">
                            Act: ₹{(data.closingRecord.actualTrampCash ?? data.closingRecord.trampCash ?? 0).toFixed(2)} / Exp: ₹{(data.closingRecord.trampCash || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tramp UPI:</span>
                          <span className="font-bold text-slate-800">
                            Act: ₹{(data.closingRecord.actualTrampUpi ?? data.closingRecord.trampUpi ?? 0).toFixed(2)} / Exp: ₹{(data.closingRecord.trampUpi || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Coin Reconciled */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <span className="text-xxs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5" /> Coin Games Reconciled
                      </span>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Coin Cash:</span>
                          <span className="font-bold text-slate-800">
                            Act: ₹{(data.closingRecord.actualCoinCash ?? data.closingRecord.coinCash ?? 0).toFixed(2)} / Exp: ₹{(data.closingRecord.coinCash || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Coin UPI:</span>
                          <span className="font-bold text-slate-800">
                            Act: ₹{(data.closingRecord.actualCoinUpi ?? data.closingRecord.coinUpi ?? 0).toFixed(2)} / Exp: ₹{(data.closingRecord.coinUpi || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Overall Cash Diff */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">
                          Total Cash Diff
                        </span>
                        <span
                          className={`text-xxs font-extrabold px-1.5 py-0.5 rounded ${
                            data.closingRecord.cashDifference === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : data.closingRecord.cashDifference > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {data.closingRecord.cashDifference === 0
                            ? 'Exact Match'
                            : data.closingRecord.cashDifference > 0
                            ? `+₹${data.closingRecord.cashDifference} Surplus`
                            : `-₹${Math.abs(data.closingRecord.cashDifference)} Short`}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-xxs text-slate-500">Exp: ₹{data.closingRecord.cashSales.toFixed(2)}</span>
                        <span className="text-sm font-black text-slate-900">Act: ₹{data.closingRecord.actualCash.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Overall UPI Diff */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">
                          Total UPI Diff
                        </span>
                        <span
                          className={`text-xxs font-extrabold px-1.5 py-0.5 rounded ${
                            data.closingRecord.upiDifference === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : data.closingRecord.upiDifference > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {data.closingRecord.upiDifference === 0
                            ? 'Exact Match'
                            : data.closingRecord.upiDifference > 0
                            ? `+₹${data.closingRecord.upiDifference} Surplus`
                            : `-₹${Math.abs(data.closingRecord.upiDifference)} Short`}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-xxs text-slate-500">Exp: ₹{data.closingRecord.upiSales.toFixed(2)}</span>
                        <span className="text-sm font-black text-slate-900">Act: ₹{data.closingRecord.actualUpi.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {data.closingRecord.notes && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 italic">
                      <strong>Remarks:</strong> {data.closingRecord.notes}
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* Attraction Breakdown & Recent Transactions Table */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Detailed Breakdown by Game */}
                <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-rose-500" />
                    <span>Attraction Revenue & Mode Breakdown</span>
                  </h3>

                  {data.summary.byGame.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center font-medium">No game sessions on this date.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.summary.byGame.map((g) => {
                        const pct = data.summary.totalRevenue > 0 ? (g.revenue / data.summary.totalRevenue) * 100 : 0;
                        return (
                          <div key={g.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-850">{g.name}</span>
                              <span className="text-slate-900 font-extrabold">₹{g.revenue.toFixed(2)}</span>
                            </div>

                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-center text-xxs">
                              <div>
                                <span className="text-slate-400 block font-medium">Cash</span>
                                <span className="font-bold text-emerald-700">₹{(g.cash || 0).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-medium">UPI</span>
                                <span className="font-bold text-blue-700">₹{(g.upi || 0).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-medium">Card</span>
                                <span className="font-bold text-purple-700">₹{(g.card || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Transactions Detail Table */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-slate-600" />
                      <span>Games Payment Entries ({data.transactions.length})</span>
                    </h3>
                  </div>

                  <div className="overflow-x-auto max-h-[420px]">
                    {data.transactions.length === 0 ? (
                      <p className="text-xs text-slate-400 py-12 text-center font-medium">
                        No transactions found for this date.
                      </p>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xxs uppercase tracking-wider">
                            <th className="px-3.5 py-2.5">Time</th>
                            <th className="px-3.5 py-2.5">Session</th>
                            <th className="px-3.5 py-2.5">Attraction</th>
                            <th className="px-3.5 py-2.5">Customer</th>
                            <th className="px-3.5 py-2.5">Method</th>
                            <th className="px-3.5 py-2.5 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {data.transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-3.5 py-2.5 text-xxs text-slate-500 whitespace-nowrap">
                                {new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-3.5 py-2.5 font-bold text-slate-850">#{t.sessionId}</td>
                              <td className="px-3.5 py-2.5">{t.gameName}</td>
                              <td className="px-3.5 py-2.5">
                                <span className="font-semibold">{t.customerName}</span>
                                {t.customerMobile && (
                                  <span className="text-xxs text-slate-400 block font-mono">{t.customerMobile}</span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                    t.method === 'CASH'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : t.method === 'UPI' || t.method === 'BANK_TRANSFER'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-purple-50 text-purple-700 border-purple-200'
                                  }`}
                                >
                                  {t.method}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                                ₹{t.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. Historical Day Closings View */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <History className="h-4.5 w-4.5 text-rose-500" />
                <span>Historical Games Day Closings</span>
              </h3>
              <p className="text-xxs text-slate-400 mt-0.5">
                Past audit records, Tramp & Coin declarations, and variance reports.
              </p>
            </div>
          </div>

          {isHistoryLoading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
            </div>
          ) : !historyList || historyList.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold">No historical day closings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xxs uppercase tracking-wider">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Total Revenue</th>
                    <th className="px-4 py-3">Tramp Cash/UPI</th>
                    <th className="px-4 py-3">Coin Cash/UPI</th>
                    <th className="px-4 py-3">Total Cash (Exp / Act)</th>
                    <th className="px-4 py-3">Total UPI (Exp / Act)</th>
                    <th className="px-4 py-3">Closed By</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{item.dateStr}</span>
                        <span className="text-xxs text-slate-400 font-medium">
                          {new Date(item.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        ₹{item.totalRevenue.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-xxs">
                        <span className="text-emerald-700 font-bold block">Cash: ₹{(item.trampCash || 0).toFixed(2)}</span>
                        <span className="text-blue-700 font-bold block">UPI: ₹{(item.trampUpi || 0).toFixed(2)}</span>
                      </td>

                      <td className="px-4 py-3.5 text-xxs">
                        <span className="text-amber-700 font-bold block">Cash: ₹{(item.coinCash || 0).toFixed(2)}</span>
                        <span className="text-purple-700 font-bold block">UPI: ₹{(item.coinUpi || 0).toFixed(2)}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-xxs">
                          <span className="text-slate-500">₹{item.cashSales.toFixed(2)} / </span>
                          <span className="font-bold text-slate-900">₹{item.actualCash.toFixed(2)}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold block ${
                            item.cashDifference === 0
                              ? 'text-emerald-600'
                              : item.cashDifference > 0
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {item.cashDifference === 0
                            ? '✓ Match'
                            : item.cashDifference > 0
                            ? `+₹${item.cashDifference}`
                            : `-₹${Math.abs(item.cashDifference)}`}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-xxs">
                          <span className="text-slate-500">₹{item.upiSales.toFixed(2)} / </span>
                          <span className="font-bold text-slate-900">₹{item.actualUpi.toFixed(2)}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold block ${
                            item.upiDifference === 0
                              ? 'text-emerald-600'
                              : item.upiDifference > 0
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {item.upiDifference === 0
                            ? '✓ Match'
                            : item.upiDifference > 0
                            ? `+₹${item.upiDifference}`
                            : `-₹${Math.abs(item.upiDifference)}`}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-700 font-semibold">
                        {item.closedByName}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedDate(item.dateStr);
                            setActiveTab('current');
                          }}
                          className="px-2.5 py-1 text-xxs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. Day Close Modal Form with Tramp & Coin Breakdown */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isCloseModalOpen && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col space-y-4 p-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-850 tracking-tight">Close Games Day & Generate Report</h3>
                  <p className="text-xxs text-slate-400 font-medium">Enter physical cash & UPI collections for {selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error banner */}
            {actionError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmCloseDay} className="space-y-4">
              {/* Expected System Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
                  <p className="text-sm font-black text-slate-900 mt-0.5">₹{data.summary.totalRevenue.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Expected Cash</span>
                  <p className="text-sm font-black text-emerald-700 mt-0.5">₹{data.summary.cashSales.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Expected UPI</span>
                  <p className="text-sm font-black text-blue-700 mt-0.5">₹{data.summary.upiSales.toFixed(2)}</p>
                </div>
              </div>

              {/* 1. Total Physical Cash Counted Input */}
              <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Banknote className="h-4 w-4 text-emerald-600" />
                    <span>Total Cash in Drawer (₹)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-xxs font-extrabold px-2 py-0.5 rounded-full ${
                      cashDiff === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : cashDiff > 0
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {cashDiff === 0 ? '✓ Match' : cashDiff > 0 ? `+₹${cashDiff} Surplus` : `-₹${Math.abs(cashDiff)} Short`}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  placeholder="Enter counted physical cash..."
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
                <div className="flex justify-between text-xxs text-slate-500 font-medium">
                  <span>System Expected: ₹{expectedCash.toFixed(2)}</span>
                  <span>Difference: {cashDiff >= 0 ? `+₹${cashDiff}` : `-₹${Math.abs(cashDiff)}`}</span>
                </div>
              </div>

              {/* 2. Total UPI Received Input */}
              <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-blue-600" />
                    <span>Total UPI / QR Settled (₹)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-xxs font-extrabold px-2 py-0.5 rounded-full ${
                      upiDiff === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : upiDiff > 0
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {upiDiff === 0 ? '✓ Match' : upiDiff > 0 ? `+₹${upiDiff} Surplus` : `-₹${Math.abs(upiDiff)} Short`}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={actualUpiInput}
                  onChange={(e) => setActualUpiInput(e.target.value)}
                  placeholder="Enter total UPI settled amount..."
                  className="w-full bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
                <div className="flex justify-between text-xxs text-slate-500 font-medium">
                  <span>System Expected: ₹{expectedUpi.toFixed(2)}</span>
                  <span>Difference: {upiDiff >= 0 ? `+₹${upiDiff}` : `-₹${Math.abs(upiDiff)}`}</span>
                </div>
              </div>

              {/* Remarks / Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Closing Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Any comments, shift variance explanations, notes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500"
                ></textarea>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closeDayMutation.isPending}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  <span>{closeDayMutation.isPending ? 'Closing Books...' : 'Confirm & Close Games Day'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
