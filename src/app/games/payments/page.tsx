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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="h-5.5 w-5.5 text-blue-600" />
            <span>Games Payments Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse and audit check-in payments, extra time balances, and flat package collections.
          </p>
        </div>
        <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs self-start md:self-auto">
          <DollarSign className="h-4 w-4" />
          <span>Total Collected: ₹{totalPaymentsCollected.toLocaleString()}</span>
        </div>
      </div>

      {/* Filters and search panel */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Session #, Customer name, mobile, settlement mode..."
            className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder-slate-450"
          />
        </div>

        <div className="flex gap-2 text-xxs font-bold uppercase shrink-0">
          {(['all', 'today', 'week', 'month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRange(r)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                filterRange === r
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-250 hover:bg-slate-50'
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
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-455 font-bold uppercase tracking-wider text-xxs">
                <th className="px-5 py-3.5">Payment Date</th>
                <th className="px-5 py-3.5">Session ID</th>
                <th className="px-5 py-3.5">Customer Details</th>
                <th className="px-5 py-3.5">Game Zone</th>
                <th className="px-5 py-3.5">Settlement Mode</th>
                <th className="px-5 py-3.5">Notes</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-655">
              {filteredPayments?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No payment logs match the search range filters.
                  </td>
                </tr>
              ) : (
                filteredPayments?.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-850">
                        {new Date(p.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </div>
                      <div className="text-xxs text-slate-400">
                        {new Date(p.date).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-blue-50 text-blue-655 px-2 py-0.5 rounded text-xxs border border-blue-100">
                        <LinkIcon className="h-3 w-3" />
                        <span>Session #{p.session.sessionId}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-850">{p.session.customer.name}</div>
                      <div className="text-xxs text-slate-400">{p.session.customer.mobile}</div>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700">{p.session.game.name}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-xxs font-bold uppercase ${
                        p.method === 'CASH'
                          ? 'bg-emerald-50 text-emerald-700'
                          : p.method === 'UPI'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {p.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 italic text-slate-500 max-w-xs truncate" title={p.notes || ''}>
                      {p.notes || '-'}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-850 text-sm">
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
