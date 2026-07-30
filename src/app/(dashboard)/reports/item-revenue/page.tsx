'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Calendar,
  FileSpreadsheet,
  Printer,
  ShoppingBag,
  Loader,
  AlertCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ItemRow {
  name: string;
  quantity: number;
  revenue: number;
}

export default function ItemRevenuePage() {
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
  const itemsPerPage = 8;

  // Fetch Item Report Data
  const { data = [], isLoading, error } = useQuery<ItemRow[]>({
    queryKey: ['itemRevenueReport', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/reports/items', {
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
          You do not have permission to view the Item Revenue report dashboard. This report is restricted to Admin and Manager roles.
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

    let csvContent = 'Item Name,Total Quantity Sold,Total Revenue\n';
    data.forEach((row) => {
      csvContent += `"${row.name}",${row.quantity},₹${row.revenue.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `item_revenue_report_${startDate}_to_${endDate}.csv`);
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

  const grandTotalItemsSold = data.reduce((acc, row) => acc + (row.quantity || 0), 0);
  const grandTotalRevenue = data.reduce((acc, row) => acc + (row.revenue || 0), 0);

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
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Item Revenue Report</h2>
              <p className="text-xxs text-slate-450 font-medium">
                Analysis of individual dish sales volumes, quantity counts, and revenue returns.
              </p>
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-pulse">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl p-6">
                  <div className="h-3.5 bg-slate-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-slate-300 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="h-72 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
            <div className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load item summary metrics. Ensure backend is running.</span>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs font-semibold">
            No sales logs found for the selected dates.
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Quantity Sold (POS)</span>
                  <h3 className="text-lg font-black text-slate-805">{grandTotalItemsSold.toLocaleString()} units</h3>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100/30">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Total POS Revenue</span>
                  <h3 className="text-lg font-black text-slate-805">
                    ₹{grandTotalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100/30">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm print:hidden">
              <h3 className="font-semibold text-slate-805 text-sm mb-4 font-bold">Top 10 Selling Items</h3>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" />
                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} stroke="#E2E8F0" tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                    <Bar dataKey="revenue" fill="#D84A4A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed table view */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center print:hidden select-none">
                <h3 className="font-semibold text-slate-800 text-sm">Dishes Sales Breakdown</h3>
                <span className="text-xxs text-slate-450 font-bold">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                      <th className="px-6 py-3">Item Name</th>
                      <th className="px-6 py-3">Quantity Sold</th>
                      <th className="px-6 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {currentData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-900">{row.name}</td>
                        <td className="px-6 py-4 font-semibold text-slate-600">{row.quantity} units</td>
                        <td className="px-6 py-4 text-right font-black text-slate-900">
                          ₹{Number(row.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
