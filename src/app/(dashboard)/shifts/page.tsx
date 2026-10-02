'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { useShiftStore } from '@/store/shiftStore';
import {
  History,
  Play,
  StopCircle,
  FileCheck,
  CheckCircle,
  Loader,
  AlertTriangle,
  HelpCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  CircleDollarSign,
  Eye,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Printer,
  X,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Clock,
  Wallet,
  Receipt,
  RotateCw,
  Coins
} from 'lucide-react';

interface Shift {
  id: string;
  cashierId: string;
  openingCash: string;
  closingCashSales: string | null;
  closingCardSales: string | null;
  closingUpiSales: string | null;
  closingExpenses: string | null;
  expectedCash: string | null;
  actualCash: string | null;
  cashDifference: string | null;
  actualUpi: string | null;
  upiDifference: string | null;
  openingTime: string;
  closingTime: string | null;
  status: 'OPEN' | 'CLOSED';
  approvedById: string | null;
  closingNotes: string | null;
  cashier: { name: string; email: string };
  approvedBy: { name: string } | null;
  computedCashSales?: number;
  computedCardSales?: number;
  computedUpiSales?: number;
  computedExpenses?: number;
  categorySales?: { name: string; quantity: number; revenue: number }[];
}

export default function ShiftsPage() {
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const activeShift = useShiftStore((state) => state.activeShift);
  const setActiveShift = useShiftStore((state) => state.setActiveShift);

  // Live Active Shift Query to ensure live Cash & UPI sales totals auto-refresh
  const { data: liveActiveShift, isFetching } = useQuery<Shift | null>({
    queryKey: ['activeShift'],
    queryFn: async () => {
      const res = await api.get('/shifts/active');
      if (res.data) {
        setActiveShift(res.data);
      }
      return res.data;
    },
    refetchInterval: 5000,
  });

  const currentActive = liveActiveShift || activeShift;

  // Form Inputs
  const [openingCash, setOpeningCash] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [actualUpi, setActualUpi] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [printReportData, setPrintReportData] = useState<any | null>(null);
  const [viewShiftReportModalData, setViewShiftReportModalData] = useState<any | null>(null);

  // Auto-Print Shift Report Handler with Local Print Agent integration
  useEffect(() => {
    if (printReportData) {
      const runPrint = async () => {
        try {
          const reportPayload = {
            restaurantName: 'Kyra POS',
            reportType: 'SHIFT' as const,
            cashierName: printReportData.cashier?.name || 'Cashier',
            generatedAt: new Date(printReportData.closingTime || Date.now()).toLocaleString(),
            shiftCode: printReportData.id?.substring(0, 8),
            openingCash: Number(printReportData.openingCash),
            cashSales: Number(printReportData.closingCashSales || 0),
            cardSales: Number(printReportData.closingCardSales || 0),
            upiSales: Number(printReportData.closingUpiSales || 0),
            expenses: Number(printReportData.closingExpenses || 0),
            expectedCash: Number(printReportData.expectedCash || 0),
            actualCash: Number(printReportData.actualCash || 0),
            difference: Number(printReportData.cashDifference || 0),
            categorySales: printReportData.categorySales || [],
          };

          await axios.post('http://localhost:4000/print/report', reportPayload, { timeout: 2000 });
          setPrintReportData(null);
        } catch (err) {
          console.warn('Local print agent offline. Falling back to browser printing.', err);
          const checkAndPrint = () => {
            const element = document.getElementById('print-shift-report-section');
            if (element) {
              window.print();
              setPrintReportData(null);
            } else {
              setTimeout(checkAndPrint, 100);
            }
          };
          checkAndPrint();
        }
      };

      runPrint();
    }
  }, [printReportData]);

  // Fetch all shifts (Admins/Managers)
  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => (await api.get('/shifts')).data,
    enabled: user?.role === 'ADMIN' || user?.role === 'MANAGER',
  });

  // Open Shift Mutation
  const openShiftMutation = useMutation({
    mutationFn: async (cash: number) => {
      return (await api.post('/shifts/open', { openingCash: cash })).data;
    },
    onSuccess: (newShift) => {
      setActiveShift(newShift);
      setOpeningCash('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['activeShift'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to open shift.');
    },
  });

  // Close Shift Mutation
  const closeShiftMutation = useMutation({
    mutationFn: async () => {
      return (await api.post('/shifts/close', {
        actualCash: Number(actualCash),
        actualUpi: Number(actualUpi),
        closingNotes,
      })).data;
    },
    onSuccess: (data) => {
      setPrintReportData(data);
      setViewShiftReportModalData(data);
      setActiveShift(null);
      setActualCash('');
      setActualUpi('');
      setClosingNotes('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['activeShift'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to close shift.');
    },
  });

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingCash || isNaN(Number(openingCash)) || Number(openingCash) < 0) {
      setFormError('Please enter a valid opening cash amount.');
      return;
    }
    openShiftMutation.mutate(Number(openingCash));
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (actualCash === '' || isNaN(Number(actualCash)) || Number(actualCash) < 0) {
      setFormError('Please enter a valid physical cash count.');
      return;
    }
    if (actualUpi === '' || isNaN(Number(actualUpi)) || Number(actualUpi) < 0) {
      setFormError('Please enter a valid actual UPI total received.');
      return;
    }
    setFormError(null);
    closeShiftMutation.mutate();
  };

  const setPresetCash = (amount: number) => {
    setOpeningCash(amount.toString());
  };

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const expectedCashInTill = currentActive
    ? Number(currentActive.openingCash) +
      Number(currentActive.computedCashSales || 0) -
      Number(currentActive.computedExpenses || 0)
    : 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 animate-in fade-in-50 duration-200">
      {/* 1. HEADER HERO BAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 text-[#D94949] flex items-center justify-center font-bold shrink-0">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                Shift Control & Till Audit
              </h1>
              {currentActive ? (
                <span className="inline-flex items-center gap-1.5 text-xxs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>Shift Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xxs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                  <span>Shift Closed</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Logged in as <span className="font-bold text-slate-700">{user?.name}</span> ({user?.role}) • Manage physical drawer balance and blind reconciliations
            </p>
          </div>
        </div>

        {/* Live Clock & Refresh Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['activeShift'] })}
            title="Refresh shift data"
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200/80 bg-white"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-[#D94949]' : ''}`} />
          </button>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl font-semibold text-xs flex items-center gap-3 animate-in fade-in-50 duration-150">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 2. LIVE METRICS STRIP (WHEN SHIFT IS OPEN) */}
      {currentActive && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Cash Sales */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Live Cash Sales
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="my-2 sm:my-2.5">
              <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                ₹{Number(currentActive.computedCashSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-emerald-700 font-bold bg-emerald-50/70 px-2 py-1 rounded-lg">
              <span>Drawer Cash Received</span>
              <span>💵 Cash</span>
            </div>
          </div>

          {/* Total UPI Sales */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Live UPI Sales
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold shrink-0">
                <CircleDollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="my-2 sm:my-2.5">
              <div className="text-xl sm:text-2xl font-black text-sky-700 tracking-tight">
                ₹{Number(currentActive.computedUpiSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-sky-700 font-bold bg-sky-50/70 px-2 py-1 rounded-lg">
              <span>Digital QR Receipts</span>
              <span>📱 UPI</span>
            </div>
          </div>

          {/* Total Card Sales */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Live Card Sales
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold shrink-0">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="my-2 sm:my-2.5">
              <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
                ₹{Number(currentActive.computedCardSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-amber-700 font-bold bg-amber-50/70 px-2 py-1 rounded-lg">
              <span>POS Terminal Swipes</span>
              <span>💳 Card</span>
            </div>
          </div>

          {/* Logged Shift Expenses */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Shift Expenses
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold shrink-0">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="my-2 sm:my-2.5">
              <div className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
                -₹{Number(currentActive.computedExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-rose-700 font-bold bg-rose-50/70 px-2 py-1 rounded-lg">
              <span>Petty Cash Payouts</span>
              <span>🔻 Cash Out</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN SHIFT CONTROL PANEL & AUDIT BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* LEFT COLUMN: ACTIVE CONTROL FORM (8/12) */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-5">
          {!currentActive ? (
            /* OPEN SHIFT CARD */
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                  <Play className="h-5 w-5 fill-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Start Cashier Shift</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Count and declare the physical opening float inside the cash drawer.
                  </p>
                </div>
              </div>

              <form onSubmit={handleOpenShift} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Opening Float Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative max-w-md">
                    <span className="absolute left-3.5 top-3 text-sm font-black text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 1000.00"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#D94949] transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-1.5">Quick Float Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    {[500, 1000, 2000, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPresetCash(amt)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        ₹{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={openShiftMutation.isPending}
                    className="px-6 py-2.5 bg-[#D94949] hover:bg-[#C53B3B] text-white font-bold text-xs rounded-xl active:scale-98 transition-all shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {openShiftMutation.isPending ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin text-white" />
                        <span>Initializing Shift...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-white" />
                        <span>Open Till & Begin Shift</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* CLOSE SHIFT BLIND RECONCILIATION CARD */
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#D94949] border border-rose-100 flex items-center justify-center font-bold">
                    <StopCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Close Cashier Shift & Reconcile</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Blind Close Mode: Input your physical drawer counts to balance the register.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xxs font-bold rounded-lg flex items-center gap-1.5 shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>Blind Close</span>
                </span>
              </div>

              {/* Shift Metadata Pills */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Cashier</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{user?.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Started At</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {new Date(currentActive.openingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Opening Float</span>
                  <p className="text-xs font-black text-slate-900 mt-0.5">
                    ₹{Number(currentActive.openingCash).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Guide Note */}
              <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-xl text-sky-900 text-xs flex items-start gap-2.5">
                <HelpCircle className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-sky-800 leading-relaxed font-medium">
                  Count physical cash in the till and total received UPI payments. System sales totals and variance calculations will be finalized in the closing audit report upon submission.
                </p>
              </div>

              {/* Close Shift Form */}
              <form onSubmit={handleCloseShift} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Counted Physical Cash in Drawer (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#D94949] transition-all"
                        placeholder="Enter physical cash count"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Actual UPI Total Received (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <CircleDollarSign className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={actualUpi}
                        onChange={(e) => setActualUpi(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#D94949] transition-all"
                        placeholder="Enter actual UPI total"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Closing Remarks / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-[#D94949]"
                    placeholder="e.g. ₹50 discrepancy due to petty cash refund..."
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={closeShiftMutation.isPending}
                    className="w-full py-3 bg-[#D94949] hover:bg-[#C53B3B] text-white font-bold text-xs rounded-xl active:scale-98 transition-all shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {closeShiftMutation.isPending ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin text-white" />
                        <span>Calculating & Finalizing Shift Close...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-white" />
                        <span>Close Shift & Generate Audit Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE RECONCILIATION SUMMARY (4/12) */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Wallet className="h-4 w-4 text-[#D94949]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Live Drawer Calculation
              </h3>
            </div>

            {currentActive ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Opening Float</span>
                  <span className="font-bold text-slate-800">
                    ₹{Number(currentActive.openingCash).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span>+</span> Live Cash Sales
                  </span>
                  <span className="font-bold text-emerald-700">
                    ₹{Number(currentActive.computedCashSales || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                  <span className="text-sky-700 font-semibold flex items-center gap-1">
                    <span>•</span> Live UPI Sales
                  </span>
                  <span className="font-bold text-sky-700">
                    ₹{Number(currentActive.computedUpiSales || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                  <span className="text-amber-700 font-semibold flex items-center gap-1">
                    <span>•</span> Live Card Sales
                  </span>
                  <span className="font-bold text-amber-700">
                    ₹{Number(currentActive.computedCardSales || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <span>-</span> Shift Expenses Paid
                  </span>
                  <span className="font-bold text-rose-600">
                    ₹{Number(currentActive.computedExpenses || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center mt-2">
                  <span className="text-xs font-bold text-slate-300">Expected Till Cash:</span>
                  <span className="text-sm font-black text-white">
                    ₹{expectedCashInTill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                No active shift running for your register.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. HISTORICAL SHIFTS AUDIT LOG (ADMIN / MANAGER VIEW) */}
      {isAdminOrManager && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <FileCheck className="h-4.5 w-4.5 text-[#D94949]" />
              <h2 className="font-bold text-sm sm:text-base text-slate-900">
                Cashier Shifts Audit History
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {shifts.length} Recorded Shifts
            </span>
          </div>

          <div className="overflow-x-auto">
            {shifts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                No previous shift records found.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Time Range</th>
                    <th className="px-4 py-3">Opening Float</th>
                    <th className="px-4 py-3">Sales Breakdown</th>
                    <th className="px-4 py-3">Cash Variance</th>
                    <th className="px-4 py-3">UPI Variance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {shifts.map((s) => {
                    const cashDiff = Number(s.cashDifference || 0);
                    const upiDiff = Number(s.upiDifference || 0);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 font-medium">
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {s.cashier.name}
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-slate-500 space-y-0.5">
                          <div>Open: {new Date(s.openingTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                          {s.closingTime && <div>Close: {new Date(s.closingTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">
                          ₹{Number(s.openingCash).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-slate-500 space-y-0.5">
                          {s.status === 'CLOSED' ? (
                            <>
                              <div>Cash: ₹{Number(s.closingCashSales || 0).toFixed(2)}</div>
                              <div>UPI: ₹{Number(s.closingUpiSales || 0).toFixed(2)}</div>
                              <div>Card: ₹{Number(s.closingCardSales || 0).toFixed(2)}</div>
                            </>
                          ) : (
                            <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 text-xxs font-bold">
                              Shift Live (Open)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold">
                          {s.status === 'CLOSED' ? (
                            <span
                              className={`px-2 py-0.5 rounded text-xxs font-bold inline-block ${
                                cashDiff === 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : cashDiff > 0
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {cashDiff > 0 ? '+' : ''}₹{cashDiff.toFixed(2)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold">
                          {s.status === 'CLOSED' ? (
                            <span
                              className={`px-2 py-0.5 rounded text-xxs font-bold inline-block ${
                                upiDiff === 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : upiDiff > 0
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {upiDiff > 0 ? '+' : ''}₹{upiDiff.toFixed(2)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {s.status === 'OPEN' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xxs font-extrabold">
                              OPEN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xxs font-bold flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                              <span>CLOSED</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {s.status === 'CLOSED' && (
                            <button
                              onClick={() => setViewShiftReportModalData(s)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xxs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <Eye className="h-3 w-3 text-slate-500" />
                              <span>Audit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 5. POST-CLOSE & HISTORICAL AUDIT MODAL */}
      {viewShiftReportModalData && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setViewShiftReportModalData(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 text-[#D94949] rounded-xl border border-rose-100">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Shift Closing & Variance Audit</h3>
                  <p className="text-xxs text-slate-400 font-medium">
                    Shift #{viewShiftReportModalData.id?.substring(0, 8)} • Cashier: {viewShiftReportModalData.cashier?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewShiftReportModalData(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xxs font-medium text-center">
                <div>
                  <span className="text-slate-400 uppercase font-bold block">Opened At</span>
                  <span className="text-slate-800 font-bold">
                    {new Date(viewShiftReportModalData.openingTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold block">Closed At</span>
                  <span className="text-slate-800 font-bold">
                    {viewShiftReportModalData.closingTime
                      ? new Date(viewShiftReportModalData.closingTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold block">Status</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {viewShiftReportModalData.status}
                  </span>
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Physical Cash Reconciliation
                  </span>
                  {(() => {
                    const cashDiff = Number(viewShiftReportModalData.cashDifference || 0);
                    if (cashDiff === 0) {
                      return (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xxs font-bold rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Exact Match
                        </span>
                      );
                    } else if (cashDiff > 0) {
                      return (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-xxs font-bold rounded-lg flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3 text-blue-600" /> Cash Surplus (+₹{cashDiff.toFixed(2)})
                        </span>
                      );
                    } else {
                      return (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-xxs font-bold rounded-lg flex items-center gap-1">
                          <ArrowDownRight className="h-3 w-3 text-rose-600" /> Cash Shortage (-₹{Math.abs(cashDiff).toFixed(2)})
                        </span>
                      );
                    }
                  })()}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xxs">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-150">
                    <span className="text-slate-400 block font-medium">Opening Cash</span>
                    <span className="font-bold text-slate-850 text-xs">
                      ₹{Number(viewShiftReportModalData.openingCash || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-150">
                    <span className="text-slate-400 block font-medium">Cash Sales</span>
                    <span className="font-bold text-slate-850 text-xs">
                      +₹{Number(viewShiftReportModalData.closingCashSales || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-150">
                    <span className="text-slate-400 block font-medium">Shift Expenses</span>
                    <span className="font-bold text-rose-600 text-xs">
                      -₹{Number(viewShiftReportModalData.closingExpenses || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                    <span className="text-emerald-800 block font-medium">Expected Till</span>
                    <span className="font-black text-emerald-950 text-xs">
                      ₹{Number(viewShiftReportModalData.expectedCash || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                  <span className="font-semibold text-slate-700">Actual Counted Cash:</span>
                  <span className="font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                    ₹{Number(viewShiftReportModalData.actualCash || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* UPI Reconciliation */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <CircleDollarSign className="h-4 w-4 text-sky-600" />
                    Digital UPI Reconciliation
                  </span>
                  {(() => {
                    const upiDiff = Number(viewShiftReportModalData.upiDifference || 0);
                    if (upiDiff === 0) {
                      return (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xxs font-bold rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> UPI Exact Match
                        </span>
                      );
                    } else if (upiDiff > 0) {
                      return (
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-xxs font-bold rounded-lg flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3 text-sky-600" /> UPI Surplus (+₹{upiDiff.toFixed(2)})
                        </span>
                      );
                    } else {
                      return (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-xxs font-bold rounded-lg flex items-center gap-1">
                          <ArrowDownRight className="h-3 w-3 text-rose-600" /> UPI Shortage (-₹{Math.abs(upiDiff).toFixed(2)})
                        </span>
                      );
                    }
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xxs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    <span className="text-slate-400 font-medium block">Expected System UPI Sales</span>
                    <span className="font-bold text-slate-850 text-xs">
                      ₹{Number(viewShiftReportModalData.closingUpiSales || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-sky-50/50 p-2.5 rounded-lg border border-sky-200">
                    <span className="text-sky-800 font-medium block">Actual Entered UPI Received</span>
                    <span className="font-black text-sky-950 text-xs">
                      ₹{Number(viewShiftReportModalData.actualUpi || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewShiftReportModalData(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Audit Window
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
