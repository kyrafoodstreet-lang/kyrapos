'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  DollarSign,
  Calendar,
  Gamepad2,
  Sparkles,
  Phone
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  age: number;
  gender: string;
  totalVisits: number;
  totalRevenue: number;
  favoriteGame: string;
  lastVisit: string | null;
  activeSession: string | null;
}

export default function CustomersList() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // 1. Fetch Customers
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['gamesCustomers'],
    queryFn: async () => (await api.get('/games/customers')).data,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredCustomers = customers?.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.mobile.includes(term) ||
      c.favoriteGame.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-5.5 w-5.5 text-blue-600" />
            <span>Games Customers</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse registered customer details, visit history metrics, and favorite play zones.
          </p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customers table list */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, mobile or favorite play zone..."
              className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder-slate-450"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-455 font-bold uppercase tracking-wider text-xxs">
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Contact Details</th>
                    <th className="px-5 py-3.5">Age / Gender</th>
                    <th className="px-5 py-3.5">Favorite Game</th>
                    <th className="px-5 py-3.5">Visits Count</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-655">
                  {filteredCustomers?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        No customer history profiles found.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers?.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-bold text-slate-800">{c.name}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{c.mobile}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 uppercase text-xxs font-semibold">
                          {c.age} yrs | {c.gender}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700">{c.favoriteGame}</td>
                        <td className="px-5 py-4">{c.totalVisits} sessions</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedCustomer(c)}
                            className="px-2.5 py-1 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded border border-blue-100 font-bold text-xxs transition-colors"
                          >
                            Inspect
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

        {/* Right Column: Customer Details Side Panel */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-blue-600" />
            <span>Customer Details</span>
          </h2>

          {selectedCustomer ? (
            <div className="space-y-6 text-xs animate-in fade-in-50 duration-100">
              <div className="space-y-2">
                <div className="font-bold text-base text-slate-800">{selectedCustomer.name}</div>
                <div className="text-slate-500 font-semibold">{selectedCustomer.mobile}</div>
                <div className="text-xxs uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded inline-block">
                  {selectedCustomer.gender} | {selectedCustomer.age} years old
                </div>
              </div>

              <div className="space-y-3.5 border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Favorite Play Zone:</span>
                  <span className="font-bold text-slate-850 flex items-center gap-1">
                    <Gamepad2 className="h-4 w-4 text-blue-600" />
                    <span>{selectedCustomer.favoriteGame}</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Total Visited Sessions:</span>
                  <span className="font-bold text-slate-850">{selectedCustomer.totalVisits} sessions</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Total Spend Contributions:</span>
                  <span className="font-bold text-emerald-600">₹{selectedCustomer.totalRevenue.toLocaleString()}</span>
                </div>

                {selectedCustomer.lastVisit && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Last Visit Date:</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(selectedCustomer.lastVisit).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {selectedCustomer.activeSession && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between text-blue-800">
                    <span className="font-bold">Currently Playing!</span>
                    <button
                      onClick={() => router.push('/games/sessions?tab=active')}
                      className="px-2.5 py-0.5 bg-blue-600 text-white rounded font-bold text-xxs"
                    >
                      Track
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
              <Users className="h-8 w-8 text-slate-350" />
              <p className="text-xs font-medium">Select a customer directory entry to view profile highlights and spend summaries.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
