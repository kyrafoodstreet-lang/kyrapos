'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  CircleDollarSign,
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
  booking: {
    bookingNumber: number;
    customer: {
      name: string;
      mobile: string;
    };
    hall: {
      name: string;
    };
  };
}

export default function PaymentsList() {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Payments log
  const { data: payments, isLoading } = useQuery<PaymentLog[]>({
    queryKey: ['partyHallPayments'],
    queryFn: async () => (await api.get('/party-hall/payments')).data,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const filteredPayments = payments?.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.booking.bookingNumber.toString().includes(term) ||
      p.booking.customer.name.toLowerCase().includes(term) ||
      p.booking.customer.mobile.includes(term) ||
      p.method.toLowerCase().includes(term) ||
      (p.notes && p.notes.toLowerCase().includes(term))
    );
  });

  const totalPaymentsCollected = filteredPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-purple-600" />
            <span>Payments Ledger</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit logs of advance deposits, installment, and final payments collected for bookings.
          </p>
        </div>
        <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs self-start md:self-auto">
          <DollarSign className="h-4 w-4" />
          <span>Total Collected: ₹{totalPaymentsCollected.toLocaleString()}</span>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter payments by Booking #, Customer name, payment method or remarks..."
          className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder-slate-400"
        />
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider text-xxs">
                <th className="px-5 py-3.5">Payment Date</th>
                <th className="px-5 py-3.5">Booking Details</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Banquet Hall</th>
                <th className="px-5 py-3.5">Settlement Mode</th>
                <th className="px-5 py-3.5">Payment Remarks</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650">
              {filteredPayments?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-medium">
                    No payment receipts match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments?.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">
                        {new Date(p.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </div>
                      <div className="text-xxs text-slate-400">
                        {new Date(p.date).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-purple-50 text-purple-650 px-2 py-0.5 rounded text-xxs">
                        <LinkIcon className="h-3 w-3" />
                        <span>Booking #{p.booking.bookingNumber}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{p.booking.customer.name}</div>
                      <div className="text-xxs text-slate-400">{p.booking.customer.mobile}</div>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700">{p.booking.hall.name}</td>
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
                    <td className="px-5 py-4 text-slate-500 italic max-w-xs truncate" title={p.notes || ''}>
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
