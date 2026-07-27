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
  CircleDollarSign,
  Eye,
  FileText,
  ShieldAlert,
  Printer,
  X,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
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

  // Form Inputs
  const [openingCash, setOpeningCash] = useState('');
  
  const [closingCashSales, setClosingCashSales] = useState('');
  const [closingCardSales, setClosingCardSales] = useState('');
  const [closingUpiSales, setClosingUpiSales] = useState('');
  const [closingExpenses, setClosingExpenses] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [actualUpi, setActualUpi] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [printReportData, setPrintReportData] = useState<any | null>(null);

  // Auto-Print Shift Report Handler with Local Print Agent integration
  useEffect(() => {
    if (printReportData) {
      const runPrint = async () => {
        try {
          const reportPayload = {
            restaurantName: 'Kyra Cafe',
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
            categorySales: printReportData.categorySales || []
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

  useEffect(() => {
    if (activeShift) {
      setClosingCashSales(activeShift.computedCashSales?.toString() || '0');
      setClosingCardSales(activeShift.computedCardSales?.toString() || '0');
      setClosingUpiSales(activeShift.computedUpiSales?.toString() || '0');
      setClosingExpenses(activeShift.computedExpenses?.toString() || '0');
    }
  }, [activeShift]);

  // Fetch all shifts (Admins/Managers)
  const { data: shifts = [], isLoading: loadingShifts } = useQuery<Shift[]>({
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
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to open shift.');
    }
  });

  // Modal state for post-close shift summary & variance report
  const [viewShiftReportModalData, setViewShiftReportModalData] = useState<any | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to close shift.');
    }
  });

  // Approve Shift Mutation
  const approveShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/shifts/approve/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingCash || isNaN(Number(openingCash))) {
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

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div className="space-y-6 text-slate-700">
      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-150 text-rose-700 rounded-xl font-semibold flex items-center gap-3 animate-fade-in shrink-0">
          <AlertTriangle className="h-5 w-5" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SHIFT CONTROL SECTION (Left columns) */}
        <div className="lg:col-span-2 space-y-6">
          {!activeShift ? (
            /* Open Shift Panel */
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-slate-805">
                <Play className="h-5 w-5 text-primary animate-pulse" />
                <h3 className="text-sm font-semibold tracking-tight">Open Cashier Shift</h3>
              </div>
              <p className="text-xxs text-slate-450 leading-relaxed font-medium">
                Before recording bills, you must declare the opening cash inside the physical till. This ensures audit trails are clean.
              </p>
              <form onSubmit={handleOpenShift} className="flex gap-4 items-end">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xxs font-semibold text-slate-455 uppercase mb-1">Opening Cash (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1000.00"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={openShiftMutation.isPending}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-lg active-press transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Start Shift
                </button>
              </form>
            </div>
          ) : (
            /* Close Shift Panel - Blind Close Mode */
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <StopCircle className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Close Active Cashier Shift</h3>
                    <p className="text-xxs text-slate-400 font-medium">Blind close mode: Sales totals & variance calculated upon submission</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 text-xxs font-bold rounded-lg flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  <span>Blind Close Active</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-center">
                  <span className="text-xxs font-semibold text-slate-400 uppercase">Cashier</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">{user?.name}</p>
                </div>
                <div className="text-center">
                  <span className="text-xxs font-semibold text-slate-400 uppercase">Start Time</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    {new Date(activeShift.openingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-center col-span-2 sm:col-span-1">
                  <span className="text-xxs font-semibold text-slate-400 uppercase">Opening Cash</span>
                  <p className="text-xs font-semibold text-slate-900 mt-1">₹{Number(activeShift.openingCash).toFixed(2)}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl text-blue-900 text-xs font-medium space-y-1">
                <div className="flex items-center gap-2 font-bold text-blue-950">
                  <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Blind Shift Close Instructions</span>
                </div>
                <p className="text-xxs text-blue-800 leading-relaxed">
                  Count your physical cash in the till and total digital UPI receipts before submitting. System expected sales numbers, totals, and variances will be revealed in the closing report after completion.
                </p>
              </div>

              <form onSubmit={handleCloseShift} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">
                      Actual Cash in Till (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-primary transition-all"
                        placeholder="Enter physical cash count"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">
                      Actual UPI Total Received (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <CircleDollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={actualUpi}
                        onChange={(e) => setActualUpi(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-primary transition-all"
                        placeholder="Enter actual UPI total"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">
                    Closing Shift Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-primary"
                    placeholder="Optional notes or remarks regarding physical till balance..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={closeShiftMutation.isPending}
                  className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl active-press transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {closeShiftMutation.isPending ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin text-white" />
                      <span>Calculating & Finalizing Shift Close...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-white" />
                      <span>Complete Shift Close & Generate Variance Report</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Shift Audit Stats (Right panel) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800 border-b pb-2">
            <History className="h-4.5 w-4.5 text-slate-400" />
            <h3 className="font-semibold text-xs tracking-tight">Your Active Stats</h3>
          </div>
          {activeShift ? (
            <div className="space-y-4">
              <p className="text-xxs text-slate-500 font-medium leading-relaxed">
                Summary of the open shift. These values will be compared against physical counting upon closing.
              </p>
              <div className="space-y-3 font-semibold text-xxs text-slate-600">
                <div className="flex justify-between">
                  <span>Opening Cash</span>
                  <span className="text-slate-850">₹{Number(activeShift.openingCash).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Start Timestamp</span>
                  <span className="text-slate-850">{new Date(activeShift.openingTime).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs font-medium">
              No shift is currently active for you.
            </div>
          )}
        </div>
      </div>

      {/* HISTORICAL AUDIT LOG (Only managers/admins) */}
      {isAdminOrManager && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800 border-b pb-2">
            <FileCheck className="h-4.5 w-4.5 text-slate-400" />
            <h3 className="font-semibold text-xs tracking-tight">Cashier Shifts Audit Log</h3>
          </div>

          <div className="overflow-x-auto">
            {shifts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">
                No shift logs recorded in database.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Open / Close Date</th>
                    <th className="px-4 py-3">Opening Cash</th>
                    <th className="px-4 py-3">Sales Breakdown</th>
                    <th className="px-4 py-3">Cash Variance</th>
                    <th className="px-4 py-3">UPI Variance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-705">
                  {shifts.map((s) => {
                    const cashDiff = Number(s.cashDifference || 0);
                    const upiDiff = Number(s.upiDifference || 0);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 font-medium">
                        <td className="px-4 py-4 font-semibold text-slate-900">{s.cashier.name}</td>
                        <td className="px-4 py-4 text-xxs font-medium text-slate-550 leading-normal">
                          <div>Open: {new Date(s.openingTime).toLocaleString()}</div>
                          {s.closingTime && <div>Close: {new Date(s.closingTime).toLocaleString()}</div>}
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-800">₹{Number(s.openingCash).toFixed(2)}</td>
                        <td className="px-4 py-4 text-xxs font-medium space-y-0.5 text-slate-500">
                          {s.status === 'CLOSED' ? (
                            <>
                              <div>Cash: ₹{Number(s.closingCashSales || 0).toFixed(2)}</div>
                              <div>UPI: ₹{Number(s.closingUpiSales || 0).toFixed(2)}</div>
                              <div>Card: ₹{Number(s.closingCardSales || 0).toFixed(2)}</div>
                              <div>Expenses: -₹{Number(s.closingExpenses || 0).toFixed(2)}</div>
                            </>
                          ) : (
                            <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 text-xxs font-semibold">Shift Live (Open)</span>
                          )}
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {s.status === 'CLOSED' ? (
                            <span className={`px-2 py-0.5 rounded text-xxs font-bold inline-block ${
                              cashDiff === 0 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : cashDiff > 0 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {cashDiff > 0 ? '+' : ''}₹{cashDiff.toFixed(2)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {s.status === 'CLOSED' ? (
                            <span className={`px-2 py-0.5 rounded text-xxs font-bold inline-block ${
                              upiDiff === 0 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : upiDiff > 0 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {upiDiff > 0 ? '+' : ''}₹{upiDiff.toFixed(2)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {s.status === 'OPEN' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-250 text-xxs font-semibold">
                              OPEN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xxs font-semibold flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                              <span>CLOSED</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {s.status === 'CLOSED' && (
                            <button
                              onClick={() => setViewShiftReportModalData(s)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 text-xxs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              <span>View Report</span>
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

      {/* POST-CLOSE / HISTORICAL SHIFT REPORT MODAL */}
      {viewShiftReportModalData && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setViewShiftReportModalData(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-850">Shift Closing & Variance Report</h3>
                  <p className="text-xxs text-slate-400">
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

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Timestamps & Status */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xxs font-medium">
                <div>
                  <span className="text-slate-400 uppercase font-bold block">Opened At</span>
                  <span className="text-slate-800 font-semibold">{new Date(viewShiftReportModalData.openingTime).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold block">Closed At</span>
                  <span className="text-slate-800 font-semibold">
                    {viewShiftReportModalData.closingTime ? new Date(viewShiftReportModalData.closingTime).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold block">Status</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {viewShiftReportModalData.status}
                  </span>
                </div>
              </div>

              {/* Cash Reconciliation Card */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Cash Reconciliation
                  </span>
                  {(() => {
                    const cashDiff = Number(viewShiftReportModalData.cashDifference || 0);
                    if (cashDiff === 0) {
                      return (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xxs font-bold rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Cash Exact Match
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xxs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    <span className="text-slate-400 font-medium block">Opening Cash</span>
                    <span className="font-bold text-slate-850 text-xs">₹{Number(viewShiftReportModalData.openingCash || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    <span className="text-slate-400 font-medium block">Net Cash Sales</span>
                    <span className="font-bold text-slate-850 text-xs">+₹{Number(viewShiftReportModalData.closingCashSales || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    <span className="text-slate-400 font-medium block">Logged Expenses</span>
                    <span className="font-bold text-rose-600 text-xs">-₹{Number(viewShiftReportModalData.closingExpenses || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-emerald-800 font-medium block">Expected Till Total</span>
                    <span className="font-extrabold text-emerald-950 text-xs">₹{Number(viewShiftReportModalData.expectedCash || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                  <span className="font-semibold text-slate-700">Actual Counted Physical Cash:</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                    ₹{Number(viewShiftReportModalData.actualCash || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* UPI Reconciliation Card */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <CircleDollarSign className="h-4 w-4 text-blue-600" />
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
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-xxs font-bold rounded-lg flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3 text-blue-600" /> UPI Surplus (+₹{upiDiff.toFixed(2)})
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
                    <span className="font-bold text-slate-850 text-xs">₹{Number(viewShiftReportModalData.closingUpiSales || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-200">
                    <span className="text-blue-800 font-medium block">Actual Entered UPI Received</span>
                    <span className="font-extrabold text-blue-950 text-xs">₹{Number(viewShiftReportModalData.actualUpi || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Total Revenue & Card Sales Summary */}
              <div className="grid grid-cols-2 gap-3 text-xxs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 font-semibold uppercase block">Card Sales Total</span>
                  <span className="text-sm font-bold text-slate-800">₹{Number(viewShiftReportModalData.closingCardSales || 0).toFixed(2)}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 font-semibold uppercase block">Total Net Revenue</span>
                  <span className="text-sm font-bold text-slate-900">
                    ₹{(
                      Number(viewShiftReportModalData.closingCashSales || 0) +
                      Number(viewShiftReportModalData.closingUpiSales || 0) +
                      Number(viewShiftReportModalData.closingCardSales || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Category Sales Table */}
              {viewShiftReportModalData.categorySales && viewShiftReportModalData.categorySales.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <h4 className="font-bold text-xs text-slate-800">Category-wise Sales Volume</h4>
                  <table className="w-full text-left text-xxs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2 text-center">Items Sold</th>
                        <th className="px-3 py-2 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewShiftReportModalData.categorySales.map((cat: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 font-semibold text-slate-800">{cat.name}</td>
                          <td className="px-3 py-1.5 text-center font-bold text-slate-700">{cat.quantity}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-slate-900">₹{Number(cat.revenue).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Notes */}
              {viewShiftReportModalData.closingNotes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xxs text-slate-600">
                  <span className="font-bold uppercase text-slate-400 block mb-1">Closing Notes / Remarks</span>
                  <p className="italic font-medium">{viewShiftReportModalData.closingNotes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button
                type="button"
                onClick={() => setViewShiftReportModalData(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-650 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer bg-white"
              >
                Close Report
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrintReportData(viewShiftReportModalData);
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4 text-white" />
                <span>Print Receipt Report</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* PRINT-ONLY SHIFT CLOSING REPORT */}
      {printReportData && (
        <div id="print-shift-report-section" className="hidden print:block text-slate-900 bg-white p-4 font-mono text-xs max-w-xs mx-auto">
          <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
            <h2 className="text-sm font-black tracking-wider uppercase">Kyra POS</h2>
            <p className="text-xxs text-slate-600">Shift Closing Summary Report</p>
            <p className="text-xxs text-slate-500 mt-1 font-bold">Status: {printReportData.status}</p>
          </div>

          <div className="space-y-1 text-xxs border-b border-dashed border-slate-400 pb-3 mb-3">
            <div className="flex justify-between">
              <span>Shift ID:</span>
              <span className="font-bold">#{printReportData.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span className="font-bold">{printReportData.cashier?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Opened:</span>
              <span>{new Date(printReportData.openingTime).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Closed:</span>
              <span>{printReportData.closingTime ? new Date(printReportData.closingTime).toLocaleString() : 'N/A'}</span>
            </div>
          </div>

          {/* Reconcile Summary Table */}
          <div className="space-y-1.5 text-xxs border-b border-dashed border-slate-400 pb-3 mb-3">
            <h3 className="font-bold uppercase tracking-wider text-xxxs text-slate-500">Till Reconciliation</h3>
            
            <div className="flex justify-between">
              <span>Opening Cash:</span>
              <span>₹{Number(printReportData.openingCash).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span>Cash Sales (Expected):</span>
              <span>₹{Number(printReportData.closingCashSales || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash in Drawer (Actual):</span>
              <span className="font-bold">₹{Number(printReportData.actualCash || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-805 font-bold">
              <span>Cash Difference:</span>
              <span>₹{Number(printReportData.cashDifference || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span>UPI Sales (Expected):</span>
              <span>₹{Number(printReportData.closingUpiSales || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>UPI Payments (Actual):</span>
              <span className="font-bold">₹{Number(printReportData.actualUpi || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-805 font-bold">
              <span>UPI Difference:</span>
              <span>₹{Number(printReportData.upiDifference || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span>Logged Expenses:</span>
              <span className="text-rose-600 font-semibold">-₹{Number(printReportData.closingExpenses || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Category-wise Sales Volume */}
          <div className="space-y-1.5 text-xxs">
            <h3 className="font-bold uppercase tracking-wider text-xxxs text-slate-500">Category-wise Sales</h3>
            {printReportData.categorySales && printReportData.categorySales.length > 0 ? (
              <table className="w-full text-left mt-1.5 border-collapse">
                <thead>
                  <tr className="border-b border-dashed border-slate-300 font-bold">
                    <th className="pb-1 text-left">Category</th>
                    <th className="pb-1 text-center">Qty</th>
                    <th className="pb-1 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printReportData.categorySales.map((cat: any, idx: number) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1">{cat.name}</td>
                      <td className="py-1 text-center font-bold">{cat.quantity}</td>
                      <td className="py-1 text-right font-bold">₹{Number(cat.revenue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xxs text-slate-455 italic py-1">No sales recorded.</p>
            )}
          </div>

          {printReportData.closingNotes && (
            <div className="mt-4 pt-2 border-t border-dashed border-slate-400 text-xxxs text-slate-500">
              <span className="font-bold block uppercase mb-0.5">Closing Notes:</span>
              <p className="italic">{printReportData.closingNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
