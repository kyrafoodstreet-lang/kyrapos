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
  CircleDollarSign
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

  // Close Shift Mutation
  const closeShiftMutation = useMutation({
    mutationFn: async () => {
      return (await api.post('/shifts/close', {
        closingCashSales: Number(closingCashSales),
        closingCardSales: Number(closingCardSales),
        closingUpiSales: Number(closingUpiSales),
        closingExpenses: Number(closingExpenses),
        actualCash: Number(actualCash),
        actualUpi: Number(actualUpi),
        closingNotes,
      })).data;
    },
    onSuccess: (data) => {
      setPrintReportData(data);
      setActiveShift(null);
      // Reset close forms
      setClosingCashSales('');
      setClosingCardSales('');
      setClosingUpiSales('');
      setClosingExpenses('');
      setActualCash('');
      setActualUpi('');
      setClosingNotes('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      alert('Shift closed successfully! The category-wise report print dialogue will open automatically.');
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
    if (!closingCashSales || !closingCardSales || !closingUpiSales || !closingExpenses || !actualCash || !actualUpi) {
      setFormError('Please fill out all cash sales breakdown fields and actual counts.');
      return;
    }
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
                  <label className="block text-xxs font-semibold text-slate-450 uppercase mb-1">Opening Cash (₹)</label>
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
            /* Close Shift Panel */
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <StopCircle className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Close Active Cashier Shift</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
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
                  <span className="text-xxs font-semibold text-slate-400 uppercase">Opening cash</span>
                  <p className="text-xs font-semibold text-slate-900 mt-1">₹{Number(activeShift.openingCash).toFixed(2)}</p>
                </div>
              </div>

              <form onSubmit={handleCloseShift} className="space-y-4">
                <h4 className="text-xxs font-semibold text-slate-400 uppercase tracking-wider">Shift Sales Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xxs font-semibold text-slate-455 mb-1">Cash Sales (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={closingCashSales}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xxs text-slate-500 cursor-not-allowed focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-semibold text-slate-455 mb-1">Card Sales (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={closingCardSales}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xxs text-slate-500 cursor-not-allowed focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-semibold text-slate-455 mb-1">UPI Sales (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={closingUpiSales}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xxs text-slate-500 cursor-not-allowed focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-semibold text-slate-455 mb-1">Logged Expenses (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={closingExpenses}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xxs text-slate-500 cursor-not-allowed focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="sm:col-span-1">
                    <label className="block text-xxs font-semibold text-slate-455 mb-1">Actual Cash in Drawer (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none"
                      placeholder="Enter cash count"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xxs font-semibold text-slate-455 mb-1">Actual UPI Recieved (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={actualUpi}
                      onChange={(e) => setActualUpi(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none"
                      placeholder="Enter UPI total"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xxs font-semibold text-slate-455 mb-1">Closing Shift Notes</label>
                    <input
                      type="text"
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      className="w-full bg-slate-55 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-855 focus:outline-none"
                      placeholder="Difference reasons..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={closeShiftMutation.isPending}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-lg active-press transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {closeShiftMutation.isPending ? 'Closing shift...' : 'Close Active Shift & Verify Till'}
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
                    <th className="px-4 py-3">Expected vs Actual</th>
                    <th className="px-4 py-3">Difference</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-705">
                  {shifts.map((s) => {
                    const diff = Number(s.cashDifference || 0);
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
                              <div>Cash Sales: ₹{Number(s.closingCashSales).toFixed(2)}</div>
                              <div>Card Sales: ₹{Number(s.closingCardSales).toFixed(2)}</div>
                              <div>UPI Sales: ₹{Number(s.closingUpiSales).toFixed(2)}</div>
                              <div>Expenses: ₹{Number(s.closingExpenses).toFixed(2)}</div>
                            </>
                          ) : (
                            <span className="text-emerald-805 bg-emerald-50 border border-emerald-150 rounded px-1.5 py-0.5 text-xxs font-semibold">Shift Live (Open)</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xxs font-medium text-slate-500">
                          {s.status === 'CLOSED' ? (
                            <>
                              <div>Expected: ₹{Number(s.expectedCash).toFixed(2)}</div>
                              <div>Actual counted: ₹{Number(s.actualCash).toFixed(2)}</div>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {s.status === 'CLOSED' ? (
                            <span className={diff === 0 ? 'text-success' : diff > 0 ? 'text-blue-600' : 'text-rose-600'}>
                              {diff > 0 ? '+' : ''}₹{diff.toFixed(2)}
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
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xxs font-semibold flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                              <span>CLOSED</span>
                            </span>
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
