'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  PieChart,
  Percent,
  Download,
  AlertCircle
} from 'lucide-react';

interface ReportResponse {
  summary: {
    totalRevenue: number;
    bookingsCount: number;
    cancelledCount: number;
  };
  revenueReport: Array<{
    date: string;
    total: number;
  }>;
  hallUtilization: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  eventTypes: Array<{
    type: string;
    count: number;
  }>;
  bookingsList: Array<{
    id: string;
    bookingNumber: number;
    customerName: string;
    hallName: string;
    bookingDate: string;
    eventType: string;
    grandTotal: number;
    paid: number;
    balance: number;
    status: string;
  }>;
}

export default function ReportsAnalytics() {
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const getFirstOfMonthISO = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  const [start, setStart] = useState(getFirstOfMonthISO());
  const [end, setEnd] = useState(getTodayISO());

  // 1. Fetch Reports data
  const { data: report, isLoading, refetch } = useQuery<ReportResponse>({
    queryKey: ['partyHallReports', start, end],
    queryFn: async () => (await api.get(`/party-hall/reports?start=${start}&end=${end}`)).data,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const pendingPayments = report?.bookingsList.filter((b) => b.balance > 0.05 && b.status !== 'CANCELLED') || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* CSS Styles for Print mode formatting */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <span>Reports & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyze revenue trends, monitor banquet hall occupancy metrics, and follow up on outstanding balances.
          </p>
        </div>

        {/* Date Selector form */}
        <div className="flex flex-wrap items-center gap-3.5 bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-450 font-bold uppercase tracking-wider text-xxs">From:</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-transparent border border-slate-200 rounded px-2.5 py-1 text-slate-800 font-semibold"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-450 font-bold uppercase tracking-wider text-xxs">To:</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-transparent border border-slate-200 rounded px-2.5 py-1 text-slate-800 font-semibold"
            />
          </div>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Print Container Section */}
      <div className="space-y-6" id="print-section">
        {/* Print Header only displayed when printing */}
        <div className="hidden print:block border-b border-slate-350 pb-4 mb-6">
          <h1 className="text-lg font-bold text-slate-800">Kyra Banquet Halls - Performance Report</h1>
          <p className="text-xxs text-slate-400">Date Range: {new Date(start).toLocaleDateString()} to {new Date(end).toLocaleDateString()}</p>
        </div>

        {/* KPI Summaries Row */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
                <h3 className="text-xl font-bold text-emerald-600 mt-1">₹{report.summary.totalRevenue.toLocaleString()}</h3>
              </div>
              <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Booked Events</span>
                <h3 className="text-xl font-bold text-purple-600 mt-1">{report.summary.bookingsCount} events</h3>
              </div>
              <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Cancelled Bookings</span>
                <h3 className="text-xl font-bold text-rose-600 mt-1">{report.summary.cancelledCount} bookings</h3>
              </div>
              <div className="h-10 w-10 bg-rose-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </div>
        )}

        {/* Charts and Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Hall Utilization list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <PieChart className="h-4.5 w-4.5 text-purple-650" />
              <span>Hall Utilization Rates</span>
            </h3>
            <div className="space-y-4 pt-1">
              {report?.hallUtilization.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6">No utilization logs.</p>
              ) : (
                report?.hallUtilization.map((hall) => (
                  <div key={hall.name} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-semibold">{hall.name}</span>
                      <span className="text-slate-450">{hall.count} events booked (₹{hall.revenue.toLocaleString()})</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-600 h-full rounded-full" 
                        style={{ width: `${Math.min(100, (hall.count / (report.summary.bookingsCount || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Event Types Popularity */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <FileText className="h-4.5 w-4.5 text-purple-650" />
              <span>Popular Events by Classification</span>
            </h3>
            <div className="space-y-3.5 pt-1">
              {report?.eventTypes.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6">No event classification logs.</p>
              ) : (
                report?.eventTypes.map((type) => (
                  <div key={type.type} className="flex justify-between items-center text-xs text-slate-750">
                    <span className="font-medium">{type.type}</span>
                    <span className="font-bold bg-purple-50 text-purple-650 px-2 py-0.5 rounded-full">
                      {type.count} bookings
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Outstanding Receivables (Pending Balances) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 lg:col-span-2 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3 justify-between">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-4.5 w-4.5 text-purple-650" />
                <span>Outstanding Receivables (Pending Balances)</span>
              </span>
              <span className="text-xxs bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full font-bold">
                {pendingPayments.length} Pending Collections
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider text-xxs">
                    <th className="py-2.5">Booking #</th>
                    <th className="py-2.5">Customer Name</th>
                    <th className="py-2.5">Hall Name</th>
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Grand Total</th>
                    <th className="py-2.5">Paid</th>
                    <th className="py-2.5 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {pendingPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Awesome! No outstanding balances pending collection in this range.
                      </td>
                    </tr>
                  ) : (
                    pendingPayments.map((b) => (
                      <tr key={b.id}>
                        <td className="py-3 font-bold text-slate-800">#{b.bookingNumber}</td>
                        <td className="py-3 font-semibold text-slate-800">{b.customerName}</td>
                        <td className="py-3">{b.hallName}</td>
                        <td className="py-3">{new Date(b.bookingDate).toLocaleDateString()}</td>
                        <td className="py-3">₹{b.grandTotal.toLocaleString()}</td>
                        <td className="py-3 text-emerald-600 font-medium">₹{b.paid.toLocaleString()}</td>
                        <td className="py-3 text-right font-bold text-amber-600 text-sm">₹{b.balance.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
