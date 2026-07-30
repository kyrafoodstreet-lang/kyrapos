'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import {
  Calendar,
  FileSpreadsheet,
  Printer,
  History,
  Loader,
  AlertCircle,
  Download,
  Search,
  ChevronLeft,
  ChevronRight
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
  categorySales?: { name: string; quantity: number; revenue: number }[];
}

export default function ShiftClosingReportsPage() {
  const user = useAuthStore((state) => state.user);

  // Date range defaults: Start of current month to today
  const defaultStart = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };
  const defaultEnd = () => new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart());
  const [endDate, setEndDate] = useState(defaultEnd());
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'custom'>('custom');
  const [searchQuery, setSearchQuery] = useState('');

  // Print shift report states
  const [printReportData, setPrintReportData] = useState<any | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch shifts
  const { data: shifts = [], isLoading, error } = useQuery<Shift[]>({
    queryKey: ['shiftReportsList'],
    queryFn: async () => {
      const res = await api.get('/shifts');
      return res.data;
    },
  });

  // axios integration for printing
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

  const handleDownloadShiftReport = (s: any) => {
    let csvContent = `Shift Reconcile Report\n`;
    csvContent += `Shift ID,#${s.id.slice(0, 8)}\n`;
    csvContent += `Cashier,${s.cashier?.name}\n`;
    csvContent += `Open Time,${new Date(s.openingTime).toLocaleString()}\n`;
    csvContent += `Close Time,${s.closingTime ? new Date(s.closingTime).toLocaleString() : 'N/A'}\n\n`;
    csvContent += `Metric,Expected,Actual,Difference\n`;
    csvContent += `Cash,₹${(Number(s.openingCash || 0) + Number(s.closingCashSales || 0) - Number(s.closingExpenses || 0)).toFixed(2)},₹${Number(s.actualCash || 0).toFixed(2)},₹${Number(s.cashDifference || 0).toFixed(2)}\n`;
    csvContent += `UPI,₹${Number(s.closingUpiSales || 0).toFixed(2)},₹${Number(s.actualUpi || 0).toFixed(2)},₹${Number(s.upiDifference || 0).toFixed(2)}\n`;
    csvContent += `Expenses,-,-,₹${Number(s.closingExpenses || 0).toFixed(2)}\n\n`;
    
    if (s.categorySales && s.categorySales.length > 0) {
      csvContent += `Category Sales Breakdown\n`;
      csvContent += `Category,Quantity,Revenue\n`;
      s.categorySales.forEach((cat: any) => {
        csvContent += `"${cat.name}",${cat.quantity},₹${Number(cat.revenue).toFixed(2)}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shift_report_${s.id.slice(0, 8)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickFilter = (filterType: 'today' | 'yesterday' | 'custom') => {
    setDateFilter(filterType);
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (filterType === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setCurrentPage(1);
    } else if (filterType === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
      setCurrentPage(1);
    }
  };

  // Client side filtering for date ranges & search query
  const filteredShifts = shifts.filter((s) => {
    const openingDate = new Date(s.openingTime);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const matchesDate = openingDate >= start && openingDate <= end;
    
    const matchesSearch = !searchQuery || 
      s.cashier?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cashier?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesDate && matchesSearch;
  });

  // Pagination Math
  const totalItems = filteredShifts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = filteredShifts.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6 text-slate-700 font-sans">
      {/* Date Pickers, Search and Exports Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0 print:hidden">
        <div className="flex flex-wrap items-center gap-4 text-xxs font-semibold text-slate-500">
          <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 border-slate-255">
            {(['today', 'yesterday', 'custom'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => handleQuickFilter(filter)}
                className={`px-3 py-1.5 text-xxs font-bold border-r last:border-r-0 border-slate-200 transition-colors capitalize cursor-pointer ${
                  dateFilter === filter 
                    ? 'bg-primary text-white border-primary shadow-sm' 
                    : 'text-slate-655 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none font-medium text-slate-800"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none font-medium text-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search cashier or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 focus:outline-none text-xxs font-medium w-full lg:w-48 placeholder-slate-400 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Main Dashboard layout */}
      <div id="print-report-area" className="space-y-6">
        {/* Page Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary-light text-primary rounded-lg flex items-center justify-center border border-primary/10 shadow-xxs">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Shift Closing Reports</h2>
              <p className="text-xxs text-slate-450 font-medium">
                Review drawer reconciliations, opening/closing cash splits, expected cash calculations, and physical discrepancy logs.
              </p>
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse flex items-center justify-center">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load shift records. Ensure backend server is running.</span>
          </div>
        ) : filteredShifts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs font-semibold">
            No shift closing logs found for the selected parameters.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center print:hidden select-none">
              <h3 className="font-semibold text-slate-800 text-sm">Shift Reconciliation Audit Ledger</h3>
              <span className="text-xxs text-slate-450 font-bold">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Open / Close Date</th>
                    <th className="px-4 py-3">Opening Cash</th>
                    <th className="px-4 py-3">Sales Breakdown</th>
                    <th className="px-4 py-3">Expected vs Actual</th>
                    <th className="px-4 py-3">Difference</th>
                    <th className="px-4 py-3 text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {currentData.map((s: any) => {
                    const cashDiff = Number(s.cashDifference || 0);
                    const upiDiff = Number(s.upiDifference || 0);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{s.cashier?.name}</div>
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">{s.cashier?.email}</div>
                        </td>
                        <td className="px-4 py-3.5 leading-relaxed">
                          <span className="block font-semibold">O: {new Date(s.openingTime).toLocaleString()}</span>
                          <span className="block text-slate-500 text-xxs">C: {s.closingTime ? new Date(s.closingTime).toLocaleString() : 'Active Open'}</span>
                        </td>
                        <td className="px-4 py-3.5 font-bold">₹{Number(s.openingCash).toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-xxs leading-relaxed">
                          <span className="block text-emerald-600">Cash: +₹{Number(s.closingCashSales || 0).toFixed(2)}</span>
                          <span className="block text-blue-600">UPI: +₹{Number(s.closingUpiSales || 0).toFixed(2)}</span>
                          <span className="block text-rose-600">Expenses: -₹{Number(s.closingExpenses || 0).toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xxs leading-relaxed font-semibold">
                          <span className="block text-slate-600">Expected: ₹{Number(s.expectedCash || 0).toFixed(2)} Cash | ₹{Number(s.closingUpiSales || 0).toFixed(2)} UPI</span>
                          <span className="block text-slate-800 font-bold">Actual: ₹{Number(s.actualCash || 0).toFixed(2)} Cash | ₹{Number(s.actualUpi || 0).toFixed(2)} UPI</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {s.status === 'CLOSED' ? (
                            <div className="flex flex-col gap-0.5 text-xxs">
                              <span className={cashDiff === 0 ? 'text-emerald-600' : cashDiff > 0 ? 'text-blue-600' : 'text-rose-600'}>
                                Cash: {cashDiff > 0 ? '+' : ''}₹{cashDiff.toFixed(2)}
                              </span>
                              <span className={upiDiff === 0 ? 'text-emerald-600' : upiDiff > 0 ? 'text-blue-600' : 'text-rose-600'}>
                                UPI: {upiDiff > 0 ? '+' : ''}₹{upiDiff.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3.5 print:hidden">
                          <div className="flex items-center justify-center gap-2">
                            {s.status === 'CLOSED' ? (
                              <>
                                <button
                                  onClick={() => setPrintReportData(s)}
                                  title="Print Shift Closing Report"
                                  className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <Printer className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDownloadShiftReport(s)}
                                  title="Download Report CSV"
                                  className="p-1.5 hover:bg-slate-100 rounded text-primary hover:text-primary-hover border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xxs text-emerald-650 font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-250 select-none">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/20 print:hidden select-none">
                <span className="text-slate-450 font-semibold">Page {currentPage} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PRINT-ONLY SHIFT CLOSING SUMMARY (For Receipt Printers) */}
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
            <div className="flex justify-between text-slate-800 font-bold">
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
            <div className="flex justify-between text-slate-800 font-bold">
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
              <p className="text-xxs text-slate-450 italic py-1">No sales recorded.</p>
            )}
          </div>

          {printReportData.closingNotes && (
            <div className="mt-4 pt-2 border-t border-dashed border-slate-400 text-xxxs text-slate-550">
              <span className="font-bold block uppercase mb-0.5">Closing Notes:</span>
              <p className="italic">{printReportData.closingNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
