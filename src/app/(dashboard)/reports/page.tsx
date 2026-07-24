'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Calendar,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  ShoppingBag,
  Layers,
  Users,
  Wallet,
  Loader,
  AlertCircle,
  History,
  Download
} from 'lucide-react';

type ReportType = 'sales' | 'items' | 'categories' | 'cashiers' | 'expenses' | 'shifts';

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const isCashier = user?.role === 'CASHIER';

  const [reportType, setReportType] = useState<ReportType>('sales');

  useEffect(() => {
    if (isCashier) {
      setReportType('categories');
    }
  }, [isCashier]);
  
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
  const [printReportData, setPrintReportData] = useState<any | null>(null);

  // Auto-Print Shift Report Handler with DOM validation
  useEffect(() => {
    if (printReportData) {
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
    } else if (filterType === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    }
  };

  // Fetch Report Data
  const { data = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['report', reportType, startDate, endDate],
    queryFn: async () => {
      if (reportType === 'shifts') {
        const res = await api.get('/shifts');
        return res.data;
      }
      const res = await api.get(`/reports/${reportType}`, {
        params: { startDate, endDate },
      });
      return res.data;
    },
  });

  const handleExportCSV = () => {
    if (data.length === 0) {
      alert('No data available to export.');
      return;
    }

    let csvContent = '';
    const headers = Object.keys(data[0]);
    csvContent += headers.join(',') + '\n';

    data.forEach((row) => {
      const values = headers.map((header) => {
        const val = row[header];
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`;
        }
        return val;
      });
      csvContent += values.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kyra_pos_${reportType}_report_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const menuItems = [
    { type: 'sales' as const, label: 'Sales Trends', icon: TrendingUp, show: !isCashier },
    { type: 'items' as const, label: 'Item Revenue', icon: ShoppingBag, show: !isCashier },
    { type: 'categories' as const, label: 'Category Shares', icon: Layers, show: true },
    { type: 'cashiers' as const, label: 'Cashier Performance', icon: Users, show: !isCashier },
    { type: 'expenses' as const, label: 'Expenses Audit', icon: Wallet, show: !isCashier },
    { type: 'shifts' as const, label: 'Shift Closing Reports', icon: History, show: true },
  ].filter(item => item.show);

  return (
    <div className="space-y-6 text-slate-700 font-sans">
      {/* Date Pickers and Exports Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-4 text-xxs font-semibold text-slate-500">
          <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 border-slate-250">
            {(['today', 'yesterday', 'custom'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => handleQuickFilter(filter)}
                className={`px-3 py-1.5 text-xxs font-bold border-r last:border-r-0 border-slate-200 transition-colors capitalize cursor-pointer ${
                  dateFilter === filter 
                    ? 'bg-primary text-white border-primary shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none font-medium text-slate-805"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none font-medium text-slate-805"
                />
              </div>
            </div>
          )}
        </div>

        {reportType !== 'shifts' && (
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-250 rounded-lg hover:bg-slate-50 text-slate-705 font-semibold text-xxs transition-all active-press cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-250 rounded-lg hover:bg-slate-50 text-slate-750 font-semibold text-xxs transition-all active-press cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Print Report</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Reports Navigation (Left sidebar) */}
        <aside className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
          <span className="block text-xxs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">Select Report Category</span>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = reportType === item.type;
            return (
              <button
                key={item.type}
                onClick={() => setReportType(item.type)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xxs font-semibold text-left transition-all cursor-pointer ${
                  active 
                    ? 'bg-primary-light text-slate-900 border border-primary/10 shadow-xxs' 
                    : 'text-slate-500 hover:bg-primary-light hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${active ? 'text-primary' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Report Content Panel (Right Columns) */}
        <div id="print-receipt-section" className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 text-sm mb-4 capitalize">{reportType} Report Summary</h3>

            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-150 flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to pull report records from database.</span>
              </div>
            ) : data.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-slate-400 text-xs font-medium">
                No billing transactions found for selected dates.
              </div>
            ) : (
              <div className="space-y-8">
                {reportType !== 'shifts' ? (
                  <>
                    {/* Visual Chart */}
                    <div className="h-80 w-full text-xs">
                      {reportType === 'sales' ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" />
                            <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" />
                            <Tooltip />
                            <Line type="monotone" dataKey="total" stroke="#D84A4A" strokeWidth={2.5} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : reportType === 'items' || reportType === 'categories' ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" />
                            <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" />
                            <Tooltip />
                            <Bar dataKey="revenue" fill="#D84A4A" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : reportType === 'cashiers' ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" />
                            <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" />
                            <Tooltip />
                            <Bar dataKey="sales" fill="#D84A4A" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                            <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" />
                            <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" />
                            <Tooltip />
                            <Bar dataKey="amount" fill="#D84A4A" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Audit Grid Table */}
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                            {Object.keys(data[0]).map((key) => {
                              const getHeaderLabel = (k: string) => {
                                switch (k) {
                                  case 'name': return 'Category Name';
                                  case 'itemsCount': return 'Number of Items Sold';
                                  case 'quantity': return 'Total Quantity';
                                  case 'revenue': return 'Total Sales Amount';
                                  case 'total': return 'Total Sales';
                                  case 'amount': return 'Total Amount';
                                  case 'ordersCount': return 'Total Orders';
                                  case 'email': return 'Email Address';
                                  case 'category': return 'Expense Category';
                                  default: return k.replace(/([A-Z])/g, ' $1');
                                }
                              };
                              return (
                                <th key={key} className="px-4 py-3 capitalize">{getHeaderLabel(key)}</th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-650">
                          {data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 font-medium">
                              {Object.keys(row).map((key) => {
                                const val = row[key];
                                const formattedVal = (typeof val === 'number' && key !== 'quantity' && key !== 'ordersCount' && key !== 'itemsCount')
                                  ? `₹${val.toFixed(2)}`
                                  : val;
                                return (
                                  <td key={key} className="px-4 py-3.5 text-slate-700">
                                    {formattedVal}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  /* Custom Shift Closing Reports List with print/download actions */
                  <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-xxs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                          <th className="px-4 py-3">Cashier</th>
                          <th className="px-4 py-3">Open / Close Date</th>
                          <th className="px-4 py-3">Opening Cash</th>
                          <th className="px-4 py-3">Sales Breakdown</th>
                          <th className="px-4 py-3">Expected vs Actual</th>
                          <th className="px-4 py-3">Difference</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.map((s: any) => {
                          const cashDiff = Number(s.cashDifference || 0);
                          const upiDiff = Number(s.upiDifference || 0);
                          return (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3.5 font-bold text-slate-808">
                                {s.cashier?.name}
                                <span className="block text-xxs font-normal text-slate-400">{s.cashier?.email}</span>
                              </td>
                              <td className="px-4 py-3.5 leading-relaxed">
                                <span className="block font-semibold">O: {new Date(s.openingTime).toLocaleString()}</span>
                                <span className="block text-slate-500">C: {s.closingTime ? new Date(s.closingTime).toLocaleString() : 'Active Open'}</span>
                              </td>
                              <td className="px-4 py-3.5 font-bold">₹{Number(s.openingCash).toFixed(2)}</td>
                              <td className="px-4 py-3.5 text-xxs leading-relaxed">
                                <span className="block text-emerald-600">Cash: +₹{Number(s.closingCashSales || 0).toFixed(2)}</span>
                                <span className="block text-blue-600">UPI: +₹{Number(s.closingUpiSales || 0).toFixed(2)}</span>
                                <span className="block text-rose-600">Expenses: -₹{Number(s.closingExpenses || 0).toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3.5 text-xxs leading-relaxed font-semibold">
                                <span className="block text-slate-600">Expected: ₹{Number(s.expectedCash || 0).toFixed(2)} Cash | ₹{Number(s.closingUpiSales || 0).toFixed(2)} UPI</span>
                                <span className="block text-slate-808">Actual: ₹{Number(s.actualCash || 0).toFixed(2)} Cash | ₹{Number(s.actualUpi || 0).toFixed(2)} UPI</span>
                              </td>
                              <td className="px-4 py-3.5 font-bold">
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
                              <td className="px-4 py-3.5">
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
                                    <span className="text-xxs text-emerald-600 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
