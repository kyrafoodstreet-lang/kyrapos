'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Calendar,
  DollarSign,
  Clock,
  Percent,
  TrendingUp,
  FileText,
  User,
  MapPin,
  Sparkles
} from 'lucide-react';

interface StatsResponse {
  todayBookingsCount: number;
  upcomingEventsCount: number;
  pendingPaymentsCount: number;
  todayRevenue: number;
  monthlyRevenue: number;
  hallOccupancy: number;
  upcomingEvents: Array<{
    id: string;
    bookingNumber: number;
    customerName: string;
    customerMobile: string;
    hallName: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    eventType: string;
    status: string;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    method: string;
    date: string;
    customerName: string;
    hallName: string;
    bookingNumber: number;
  }>;
  recentBookings: Array<{
    id: string;
    bookingNumber: number;
    customerName: string;
    hallName: string;
    bookingDate: string;
    grandTotal: number;
    status: string;
  }>;
}

export default function PartyHallDashboard() {
  const { data: stats, isLoading, error } = useQuery<StatsResponse>({
    queryKey: ['partyHallDashboardStats'],
    queryFn: async () => (await api.get('/party-hall/dashboard/stats')).data,
    refetchInterval: 15000, // refresh every 15s for real-time feel
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-650"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
        Failed to load dashboard metrics. Please check connection to the NestJS API.
      </div>
    );
  }

  const kpis = [
    {
      name: "Today's Bookings",
      value: stats.todayBookingsCount,
      icon: Calendar,
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
      borderColor: "border-purple-100"
    },
    {
      name: "Upcoming Events",
      value: stats.upcomingEventsCount,
      icon: Clock,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-100"
    },
    {
      name: "Pending Payments",
      value: stats.pendingPaymentsCount,
      icon: DollarSign,
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
      borderColor: "border-amber-100"
    },
    {
      name: "Today's Revenue",
      value: `₹${stats.todayRevenue.toLocaleString()}`,
      icon: TrendingUp,
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-100"
    },
    {
      name: "Monthly Revenue",
      value: `₹${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
      borderColor: "border-indigo-100"
    },
    {
      name: "Hall Occupancy",
      value: `${stats.hallOccupancy}%`,
      icon: Percent,
      bgColor: "bg-pink-50",
      textColor: "text-pink-600",
      borderColor: "border-pink-100"
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
            <span>Banquet & Party Hall Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor and coordinate event bookings, payments, and hall capacities.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/party-hall/bookings/new"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition-all text-center flex items-center gap-1.5"
          >
            <span>+ New Booking</span>
          </a>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={kpi.name} 
              className={`bg-white p-5 rounded-2xl border ${kpi.borderColor} shadow-xs flex flex-col justify-between h-28`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider">{kpi.name}</span>
                <div className={`h-8 w-8 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${kpi.textColor}`} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800">{kpi.value}</h3>
            </div>
          );
        })}
      </div>

      {/* Bottom Main Content Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upcoming Events */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 text-sm">Upcoming Events</h2>
              <span className="text-xxs font-bold bg-purple-50 text-purple-650 px-2 py-0.5 rounded-full">
                Active Queue
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-xxs">
                    <th className="px-6 py-3.5">Booking #</th>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Hall</th>
                    <th className="px-6 py-3.5">Date & Time</th>
                    <th className="px-6 py-3.5">Event</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {stats.upcomingEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No upcoming bookings found.
                      </td>
                    </tr>
                  ) : (
                    stats.upcomingEvents.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-800">#{b.bookingNumber}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{b.customerName}</div>
                          <div className="text-xxs text-slate-400">{b.customerMobile}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>{b.hallName}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>{new Date(b.bookingDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                          <div className="text-xxs text-slate-400">{b.startTime} - {b.endTime}</div>
                        </td>
                        <td className="px-6 py-4 font-medium">{b.eventType}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xxs font-bold border ${
                            b.status === 'BOOKED'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-amber-50 text-amber-700 border-amber-250'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Payments & Recent Bookings */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recent Payments */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 text-sm">Recent Payments</h2>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            <div className="divide-y divide-slate-100 p-4 space-y-3.5">
              {stats.recentPayments.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">No payment logs.</div>
              ) : (
                stats.recentPayments.map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-800">₹{p.amount.toLocaleString()}</div>
                      <div className="text-xxs text-slate-400">
                        {p.customerName} • {p.method}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xxs text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                        Booking #{p.bookingNumber}
                      </div>
                      <div className="text-xxs text-slate-400 mt-1">
                        {new Date(p.date).toLocaleDateString(undefined, { dateStyle: 'short' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 text-sm">Recent Activity</h2>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="divide-y divide-slate-100 p-4 space-y-3.5">
              {stats.recentBookings.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">No recent bookings.</div>
              ) : (
                stats.recentBookings.map((b) => (
                  <div key={b.id} className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{b.customerName}</div>
                      <div className="text-xxs text-slate-400">{b.hallName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">₹{b.grandTotal.toLocaleString()}</div>
                      <div className="flex gap-1.5 justify-end mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-xxs font-bold uppercase ${
                          b.status === 'BOOKED'
                            ? 'bg-purple-50 text-purple-700'
                            : b.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
