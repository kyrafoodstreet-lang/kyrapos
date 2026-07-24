'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  PieChart,
  Download,
  Users
} from 'lucide-react';

interface ReportResponse {
  summary: {
    totalRevenue: number;
    activeCount: number;
    completedCount: number;
    averageSessionTime: number;
  };
  revenueReport: Array<{
    date: string;
    total: number;
  }>;
  gameUtilization: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: string;
    count: number;
  }>;
  sessionsList: Array<{
    id: string;
    sessionId: number;
    customerName: string;
    gameName: string;
    entryTime: string;
    exitTime: string | null;
    status: string;
    grandTotal: number;
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

  // Fetch Reports data
  const { data: report, isLoading } = useQuery<ReportResponse>({
    queryKey: ['gamesReports', start, end],
    queryFn: async () => (await api.get(`/games/reports?start=${start}&end=${end}`)).data,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const maxVisitsHour = report?.peakHours.reduce((max, h) => (h.count > max ? h.count : max), 0) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* CSS Styles for Print mode formatting */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-games-report, #print-games-report * {
            visibility: visible;
          }
          #print-games-report {
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
            <BarChart3 className="h-5.5 w-5.5 text-blue-650" />
            <span>Games Reports & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyze game performance metrics, revenue growth trends, and peak operational hour logs.
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
            className="px-3.5 py-2 bg-blue-650 hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Print Container Section */}
      <div className="space-y-6" id="print-games-report">
        {/* Print Header only displayed when printing */}
        <div className="hidden print:block border-b border-slate-350 pb-4 mb-6">
          <h1 className="text-lg font-bold text-slate-800">Kyra POS Games Zone - Performance Report</h1>
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
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Completed Sessions</span>
                <h3 className="text-xl font-bold text-blue-650 mt-1">{report.summary.completedCount} plays</h3>
              </div>
              <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-655" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Avg Playtime</span>
                <h3 className="text-xl font-bold text-sky-600 mt-1">{report.summary.averageSessionTime} mins</h3>
              </div>
              <div className="h-10 w-10 bg-sky-50 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </div>
        )}

        {/* Charts and Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Game Zone Utilization list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <PieChart className="h-4.5 w-4.5 text-blue-650" />
              <span>Game Zone Occupancy & Sales</span>
            </h3>
            <div className="space-y-4 pt-1">
              {report?.gameUtilization.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6">No utilization logs.</p>
              ) : (
                report?.gameUtilization.map((game) => (
                  <div key={game.name} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-semibold">{game.name}</span>
                      <span className="text-slate-450">{game.count} plays (₹{game.revenue.toLocaleString()})</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full" 
                        style={{ width: `${Math.min(100, (game.count / (report.summary.completedCount || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Peak Hours Analysis */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Users className="h-4.5 w-4.5 text-blue-650" />
              <span>Hourly Visitor Traffic (Peak Times)</span>
            </h3>
            <div className="space-y-3 pt-1">
              {report?.peakHours.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-6">No traffic log.</p>
              ) : (
                report?.peakHours.map((h) => (
                  <div key={h.hour} className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-655 font-medium">
                      <span>{h.hour}</span>
                      <span>{h.count} check-ins</span>
                    </div>
                    {/* Traffic Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, (h.count / maxVisitsHour) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Daily Transactions logs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 lg:col-span-2 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Calendar className="h-4.5 w-4.5 text-blue-650" />
              <span>Full Range Session Log Summary</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-455 font-bold uppercase tracking-wider text-xxs bg-slate-50/50">
                    <th className="px-4 py-2.5">Session ID</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Game Zone</th>
                    <th className="px-4 py-2.5">Entry Date</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Charged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {report?.sessionsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        No transactions registered in this date range.
                      </td>
                    </tr>
                  ) : (
                    report?.sessionsList.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 font-bold text-slate-800">#{s.sessionId}</td>
                        <td className="px-4 py-3 font-semibold text-slate-850">{s.customerName}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{s.gameName}</td>
                        <td className="px-4 py-3">{new Date(s.entryTime).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xxs font-bold uppercase ${
                            s.status === 'ACTIVE'
                              ? 'bg-blue-50 text-blue-755'
                              : 'bg-emerald-50 text-emerald-755'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">₹{s.grandTotal.toLocaleString()}</td>
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
