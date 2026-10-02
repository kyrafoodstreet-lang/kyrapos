'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Gamepad2,
  Users,
  DollarSign,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
  CalendarCheck
} from 'lucide-react';

interface RecentSession {
  id: string;
  sessionId: number;
  customerName: string;
  gameName: string;
  packageName: string;
  entryTime: string;
  status: string;
  grandTotal: number;
}

interface DashboardStats {
  todayVisitors: number;
  todayRevenue: number;
  activeSessions: number;
  completedSessions: number;
  pendingPayments: number;
  averageSessionTime: number;
  recentSessions: RecentSession[];
}

export default function GamesDashboard() {
  const router = useRouter();

  // Fetch Dashboard Stats
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['gamesDashboardStats'],
    queryFn: async () => (await api.get('/games/dashboard/stats')).data,
    refetchInterval: 10000, // auto refetch every 10s
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const cardData = [
    {
      title: "Today's Visitors",
      value: `${stats?.todayVisitors || 0} guests`,
      icon: Users,
      color: "text-[#D94949] bg-[#D94949]/10 border-[#D94949]/20",
    },
    {
      title: "Today's Revenue",
      value: `₹${(stats?.todayRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-[#009966] bg-[#009966]/10 border-[#009966]/20",
    },
    {
      title: "Active Sessions",
      value: `${stats?.activeSessions || 0} active`,
      icon: Play,
      color: "text-[#D94949] bg-[#D94949]/10 border-[#D94949]/20",
    },
    {
      title: "Completed Today",
      value: `${stats?.completedSessions || 0} completed`,
      icon: CheckCircle,
      color: "text-[#009966] bg-[#009966]/10 border-[#009966]/20",
    },
    {
      title: "Pending Payments",
      value: `${stats?.pendingPayments || 0} alerts`,
      icon: AlertCircle,
      color: stats?.pendingPayments && stats.pendingPayments > 0 
        ? "text-amber-600 bg-amber-50 border-amber-200 animate-pulse" 
        : "text-slate-500 bg-slate-50 border-slate-200",
    },
    {
      title: "Avg Session Time",
      value: `${stats?.averageSessionTime || 0} mins`,
      icon: Clock,
      color: "text-[#D94949] bg-[#D94949]/10 border-[#D94949]/20",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Gamepad2 className="h-5.5 w-5.5 text-[#D94949]" />
            <span>Games Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time occupancy status, revenue totals, and checking lists for active and completed guest sessions.
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => router.push('/games/closing-report')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            <span>Day Close</span>
          </button>
          <button
            onClick={() => router.push('/games/sessions/new')}
            className="px-5 py-2.5 bg-[#D94949] hover:bg-[#C53B3B] text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>New Game Session</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {cardData.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:shadow-sm transition-shadow">
              <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 tracking-tight">{card.value}</span>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center border ${card.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Sessions */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-[#D94949]" />
              <span>Recent Game Sessions</span>
            </h3>
            <button
              onClick={() => router.push('/games/sessions')}
              className="text-xs font-semibold text-[#D94949] hover:text-[#C53B3B] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-455 font-bold uppercase tracking-wider text-xxs">
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Game / Duration</th>
                  <th className="px-5 py-3">Started</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650">
                {stats?.recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-450">
                      No game sessions logged today yet.
                    </td>
                  </tr>
                ) : (
                  stats?.recentSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-800">#{session.sessionId}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{session.customerName}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-700">{session.gameName}</div>
                        <div className="text-xxs text-slate-400">{session.packageName}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(session.entryTime).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xxs font-bold uppercase ${
                          session.status === 'ACTIVE'
                            ? 'bg-[#D94949]/10 text-[#D94949] border border-[#D94949]/20'
                            : 'bg-[#009966]/10 text-[#009966] border border-[#009966]/20'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                        ₹{session.grandTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Highlights Summary Info */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Sparkles className="h-4.5 w-4.5 text-[#D94949]" />
            <span>Operational Highlights</span>
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <h4 className="font-bold text-slate-700">Quick Check-in Tip</h4>
              <p className="text-slate-500 leading-relaxed text-xxs">
                Ensure customers register with active mobile numbers to accumulate history records, allowing the system to recommend their favorite games upon subsequent check-ins.
              </p>
            </div>

            <div className="p-4 bg-[#D94949]/5 border border-[#D94949]/15 rounded-xl space-y-2 text-xs">
              <h4 className="font-bold text-[#D94949] flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Duration Auto-tracking</span>
              </h4>
              <p className="text-slate-700 leading-relaxed text-xxs">
                The POS monitors playtime durations in the background. When closing a session, the system automatically checks for overtime and suggests proportional surcharge balances.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
