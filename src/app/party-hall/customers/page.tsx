'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Users,
  Search,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Sparkles
} from 'lucide-react';

interface CustomerEvent {
  id: string;
  bookingNumber: number;
  bookingDate: string;
  eventType: string;
  grandTotal: number;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  altMobile: string | null;
  email: string | null;
  address: string | null;
  totalBookings: number;
  totalRevenue: number;
  pendingBalance: number;
  bookings: CustomerEvent[];
}

export default function CustomersList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // 1. Fetch Customers
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['partyHallCustomers'],
    queryFn: async () => (await api.get('/party-hall/customers')).data,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const filteredCustomers = customers?.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.mobile.includes(term) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            <span>Customer History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View customer directories, total booking counts, total revenue collections, and outstanding pending balances.
          </p>
        </div>
      </div>

      {/* Filter and Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customers List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, mobile, email..."
              className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder-slate-400"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider text-xxs">
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Contact Details</th>
                    <th className="px-5 py-3.5">Total Bookings</th>
                    <th className="px-5 py-3.5">Total Paid</th>
                    <th className="px-5 py-3.5">Balance Pending</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {filteredCustomers?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-medium">
                        No customer history found.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers?.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-bold text-slate-800">{c.name}</td>
                        <td className="px-5 py-4 space-y-1">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{c.mobile}</span>
                          </div>
                          {c.email && (
                            <div className="flex items-center gap-1 text-xxs text-slate-400">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span>{c.email}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700">{c.totalBookings} events</td>
                        <td className="px-5 py-4 text-emerald-600 font-semibold">₹{c.totalRevenue.toLocaleString()}</td>
                        <td className={`px-5 py-4 font-semibold ${c.pendingBalance > 0 ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                          ₹{c.pendingBalance.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedCustomer(c)}
                            className="px-2.5 py-1 hover:bg-purple-50 text-purple-600 hover:text-purple-700 rounded border border-purple-100 font-semibold text-xxs transition-colors"
                          >
                            Inspect History
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Details Inspector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-purple-600" />
            <span>Customer Profile</span>
          </h2>

          {selectedCustomer ? (
            <div className="space-y-6 text-xs animate-in fade-in-50 duration-100">
              <div className="space-y-2">
                <div className="font-bold text-base text-slate-800">{selectedCustomer.name}</div>
                <div className="flex items-center gap-2 text-slate-650">
                  <Phone className="h-4 w-4 text-slate-450" />
                  <span>{selectedCustomer.mobile} {selectedCustomer.altMobile && `| ${selectedCustomer.altMobile}`}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2 text-slate-650">
                    <Mail className="h-4 w-4 text-slate-450" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                )}
                {selectedCustomer.address && (
                  <div className="flex items-center gap-2 text-slate-650">
                    <MapPin className="h-4 w-4 text-slate-450" />
                    <span>{selectedCustomer.address}</span>
                  </div>
                )}
              </div>

              {/* Booking History list */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Past & Active Bookings</span>
                  <span className="text-xxs font-semibold bg-purple-50 text-purple-650 px-2 py-0.5 rounded-full">
                    {selectedCustomer.totalBookings} Booked
                  </span>
                </h3>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {selectedCustomer.bookings.map((b) => (
                    <div key={b.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Booking #{b.bookingNumber}</span>
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
                      <div className="flex justify-between items-center text-xxs text-slate-550">
                        <span>Event: {b.eventType}</span>
                        <span>{new Date(b.bookingDate).toLocaleDateString()}</span>
                      </div>
                      <div className="text-right font-bold text-slate-800">₹{b.grandTotal.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2.5 text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Lifetime Spend:</span>
                  <span className="font-bold text-emerald-600">₹{selectedCustomer.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Remaining Pending Balance:</span>
                  <span className="font-bold text-slate-850">₹{selectedCustomer.pendingBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
              <Users className="h-8 w-8 text-slate-350" />
              <p className="text-xs font-medium">Select a customer from the left directory list to view profile details and events history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
