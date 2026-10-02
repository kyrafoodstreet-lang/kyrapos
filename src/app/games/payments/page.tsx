'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  CreditCard,
  Search,
  DollarSign,
  Calendar,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';

interface PaymentLog {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  date: string;
  createdAt: string;
  session: {
    sessionId: number;
    customer: {
      name: string;
      mobile: string;
    };
    game: {
      name: string;
    };
  };
}

export default function PaymentsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRange, setFilterRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Fetch Payments log
  const { data: payments, isLoading } = useQuery<PaymentLog[]>({
    queryKey: ['gamesPaymentsList'],
    queryFn: async () => (await api.get('/games/payments')).data,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] space-y-3">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#D94949] border-t-transparent"></div>
        <p className="text-xs font-semibold text-slate-400">Loading Payments Ledger...</p>
      </div>
    );
  }

  // Range filtration math
  const getIsWithinRange = (dateStr: string) => {
    if (filterRange === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    
    if (filterRange === 'today') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }
    if (filterRange === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return date >= oneWeekAgo;
    }
    if (filterRange === 'month') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    }
    return true;
  };

  const filteredPayments = payments?.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      p.session.sessionId.toString().includes(term) ||
      p.session.customer.name.toLowerCase().includes(term) ||
      p.session.customer.mobile.includes(term) ||
      p.method.toLowerCase().includes(term)
    );
    return matchesSearch && getIsWithinRange(p.date);
  });

  const totalPaymentsCollected = filteredPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100/80 text-[#D94949] flex items-center justify-center font-bold shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
              Games Payments Ledger
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Browse check-in settlements, token sales records, and financial receipts.
            </p>
          </div>
        </div>
        <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-2xs self-start md:self-auto font-mono tabular-nums">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <span>Total: ₹{totalPaymentsCollected.toLocaleString()}</span>
        </div>
      </div>

      {/* Filters and search panel */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs justify-between items-center">
        <div className="flex items-center gap-2.5 flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#D94949] focus-within:ring-2 focus-within:ring-[#D94949]/15 transition-all">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Session #, Customer name, mobile, settlement mode..."
            className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex gap-1.5 text-xxs font-bold uppercase shrink-0">
          {(['all', 'today', 'week', 'month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRange(r)}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-bold ${
                filterRange === r
                  ? 'bg-[#D94949] text-white border-[#D94949] shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xxs">
                <th className="px-5 py-3.5">Payment Date</th>
                <th className="px-5 py-3.5">Session ID</th>
                <th className="px-5 py-3.5">Customer Details</th>
                <th className="px-5 py-3.5">Game Zone</th>
                <th className="px-5 py-3.5">Settlement Mode</th>
                <th className="px-5 py-3.5">Notes</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredPayments?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No payment logs match the search range filters.
                  </td>
                </tr>
              ) : (
                filteredPayments?.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">
                        {new Date(p.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </div>
                      <div className="text-xxs text-slate-400">
                        {new Date(p.date).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 font-bold text-[#D94949] bg-[#D94949]/10 px-2 py-0.5 rounded text-xxs border border-[#D94949]/20">
                        <LinkIcon className="h-3 w-3" />
                        <span>Session #{p.session.sessionId}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{p.session.customer.name}</div>
                      <div className="text-xxs text-slate-400">{p.session.customer.mobile}</div>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700">{p.session.game.name}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-xxs font-bold uppercase ${
                        p.method === 'CASH'
                          ? 'bg-[#009966]/10 text-[#009966] border border-[#009966]/20'
                          : p.method === 'UPI'
                          ? 'bg-blue-50 text-blue-700 border border-blue-150'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                      }`}>
                        {p.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 italic text-slate-500 max-w-xs truncate" title={p.notes || ''}>
                      {p.notes || '-'}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-800 text-sm">
                      ₹{Number(p.amount).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

