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
      <div className="flex flex-col items-center justify-center min-h-[380px] space-y-3">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#D94949] border-t-transparent"></div>
        <p className="text-xs font-semibold text-slate-400">Loading Customer Profiles...</p>
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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100/80 text-[#D94949] flex items-center justify-center font-bold shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
              Games Customers
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Browse registered customer profiles, visit history metrics, and favorite play zones.
            </p>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Customers table list */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <Search className="h-4.5 w-4.5 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, mobile or favorite play zone..."
              className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
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
                            className="px-3 py-1 bg-[#D94949]/10 hover:bg-[#D94949]/20 text-[#D94949] rounded-lg border border-[#D94949]/20 font-bold text-xxs transition-colors cursor-pointer"
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
            <Sparkles className="h-4.5 w-4.5 text-[#D94949]" />
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
                    <Gamepad2 className="h-4 w-4 text-[#D94949]" />
                    <span>{selectedCustomer.favoriteGame}</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Total Visited Sessions:</span>
                  <span className="font-bold text-slate-850">{selectedCustomer.totalVisits} sessions</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Total Spend Contributions:</span>
                  <span className="font-bold text-[#009966]">₹{selectedCustomer.totalRevenue.toLocaleString()}</span>
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
                  <div className="p-3 bg-[#D94949]/10 border border-[#D94949]/20 rounded-xl flex items-center justify-between text-[#D94949]">
                    <span className="font-bold">Currently Playing!</span>
                    <button
                      onClick={() => router.push('/games/sessions?tab=active')}
                      className="px-2.5 py-1 bg-[#D94949] hover:bg-[#C53B3B] text-white rounded-lg font-bold text-xxs cursor-pointer"
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
