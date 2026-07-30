'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Calendar,
  FileSpreadsheet,
  Printer,
  Wallet,
  Loader,
  AlertCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ExpenseRow {
  category: string;
  amount: number;
}

export default function ExpensesAuditPage() {
  const user = useAuthStore((state) => state.user);
  const isAuthorized = user?.role === 'ADMIN' || user?.role === 'MANAGER';

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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch Expense Report Data
  const { data = [], isLoading, error } = useQuery<ExpenseRow[]>({
    queryKey: ['expensesAuditReport', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/reports/expenses', {
        params: { startDate, endDate },
      });
      return res.data;
    },
    enabled: isAuthorized,
  });

  // Frontend Role Guard
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto mt-12 text-center">
        <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100 animate-bounce">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Access Denied</h2>
        <p className="text-xs text-slate-500 leading-normal">
          You do not have permission to view the Expenses Audit report dashboard. This report is restricted to Admin and Manager roles.
        </p>
      </div>
    );
  }

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

  const handleExportCSV = () => {
    if (data.length === 0) {
      alert('No data available to export.');
      return;
    }

    let csvContent = 'Category,Total Logged Amount\n';
    data.forEach((row) => {
      csvContent += `"${row.category}",₹${row.amount.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_audit_report_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Pagination Math
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = data.slice(indexOfFirstItem, indexOfLastItem);

  const grandTotalExpenses = data.reduce((acc, row) => acc + (row.amount || 0), 0);

  return (
    <div className="space-y-6 text-slate-700 font-sans">
      {/* Date Pickers and Exports Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0 print:hidden">
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

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-semibold text-xxs transition-all active-press cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-semibold text-xxs transition-all active-press cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard layout */}
      <div id="print-report-area" className="space-y-6">
        {/* Page Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary-light text-primary rounded-lg flex items-center justify-center border border-primary/10 shadow-xxs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Expenses Audit</h2>
              <p className="text-xxs text-slate-450 font-medium">
                Analysis of business expenses, categorizations, and overall outgoing flows over the selected period.
              </p>
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="h-24 bg-white border border-slate-200 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
              <div className="h-8 bg-slate-300 rounded w-1/3"></div>
            </div>
            <div className="h-72 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
            <div className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load expenses data. Ensure NestJS backend is running.</span>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs font-semibold">
            No expenses records logged for the selected dates.
          </div>
        ) : (
          <>
            {/* Expense KPI card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between max-w-sm">
              <div className="space-y-1">
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Consolidated Outgoing Expenses</span>
                <h3 className="text-lg font-black text-rose-600">
                  ₹{grandTotalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-100/30">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm print:hidden">
              <h3 className="font-semibold text-slate-850 text-sm mb-4 font-bold">Category-wise Outgoings</h3>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" />
                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                    <Bar dataKey="amount" fill="#E11D48" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expenses Summary table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center print:hidden select-none">
                <h3 className="font-semibold text-slate-800 text-sm">Expenses Category Totals</h3>
                <span className="text-xxs text-slate-450 font-bold">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                      <th className="px-6 py-3">Expense Category</th>
                      <th className="px-6 py-3 text-right">Total Outgoing Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {currentData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-900 capitalize">{row.category.toLowerCase().replace('_', ' ')}</td>
                        <td className="px-6 py-4 text-right font-black text-rose-600">
                          ₹{Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
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
          </>
        )}
      </div>
    </div>
  );
}
