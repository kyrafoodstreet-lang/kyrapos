'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  User
} from 'lucide-react';

interface PartyHall {
  id: string;
  name: string;
}

interface Booking {
  id: string;
  bookingNumber: number;
  eventType: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  guestCount: number;
  customer: {
    name: string;
    mobile: string;
  };
  hall: {
    id: string;
    name: string;
  };
}

export default function BookingCalendar() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // 1. Fetch Halls
  const { data: halls } = useQuery<PartyHall[]>({
    queryKey: ['partyHalls'],
    queryFn: async () => (await api.get('/party-hall/halls')).data,
  });

  // 2. Fetch Bookings
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['partyHallBookings'],
    queryFn: async () => (await api.get('/party-hall/bookings')).data,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const lastDate = new Date(year, month + 1, 0).getDate();

  const prevMonthLastDate = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = [];

  // Previous month filler days
  for (let i = firstDayIndex; i > 0; i--) {
    days.push({
      dayNumber: prevMonthLastDate - i + 1,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthLastDate - i + 1)
    });
  }

  // Current month days
  for (let i = 1; i <= lastDate; i++) {
    days.push({
      dayNumber: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Next month filler days to complete grid (multiples of 7)
  const totalSlots = 42; // standard 6 rows
  const remaining = totalSlots - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      dayNumber: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Find bookings on a specific date
  const getBookingsOnDate = (date: Date) => {
    return bookings?.filter((b) => {
      const bDate = new Date(b.bookingDate);
      return (
        bDate.getFullYear() === date.getFullYear() &&
        bDate.getMonth() === date.getMonth() &&
        bDate.getDate() === date.getDate()
      );
    }) || [];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-600" />
            <span>Banquet Booking Calendar</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Check availability by month. Status legends: 🟢 Available, 🟡 Reserved, 🔴 Fully Booked.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 self-start md:self-auto shadow-xs">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-200 rounded text-slate-650 transition-colors">
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <span className="font-bold text-slate-800 text-xs tracking-tight min-w-[120px] text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-slate-200 rounded text-slate-650 transition-colors">
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid Section */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 border-b border-slate-200 text-center bg-slate-50/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-3 text-xxs font-bold text-slate-450 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-150 border-b border-r border-slate-150">
            {days.map((slot, idx) => {
              const dayBookings = getBookingsOnDate(slot.date);
              
              return (
                <div
                  key={idx}
                  className={`min-h-[96px] p-2 flex flex-col justify-between transition-colors ${
                    slot.isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-350'
                  }`}
                >
                  <span className={`text-xxs font-bold px-1 py-0.5 rounded self-start ${
                    slot.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                  }`}>
                    {slot.dayNumber}
                  </span>

                  {/* Booking Slots list */}
                  <div className="space-y-1 mt-1 flex-1 flex flex-col justify-end">
                    {halls?.map((hall) => {
                      const hallBooking = dayBookings.find((b) => b.hall.id === hall.id);
                      
                      let dotColor = 'bg-emerald-500';
                      let textColor = 'text-emerald-700 hover:bg-emerald-50/70';
                      let statusText = 'Available';

                      if (hallBooking) {
                        if (hallBooking.status === 'BOOKED') {
                          dotColor = 'bg-rose-500';
                          textColor = 'text-rose-700 bg-rose-50/75 hover:bg-rose-100/80 font-bold';
                          statusText = 'Booked';
                        } else if (hallBooking.status === 'RESERVED') {
                          dotColor = 'bg-amber-500';
                          textColor = 'text-amber-700 bg-amber-50/75 hover:bg-amber-100/80 font-bold';
                          statusText = 'Reserved';
                        }
                      }

                      return (
                        <button
                          key={hall.id}
                          disabled={!hallBooking}
                          onClick={() => hallBooking && setSelectedBooking(hallBooking)}
                          className={`w-full text-left p-1 rounded text-xxs transition-all flex items-center gap-1 border border-transparent ${
                            hallBooking ? textColor : 'text-slate-400 opacity-60'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${dotColor} shrink-0`}></span>
                          <span className="truncate">{hall.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Slot Information Side Panel */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <Info className="h-4.5 w-4.5 text-purple-600" />
            <span>Booking Inspector</span>
          </h2>

          {selectedBooking ? (
            <div className="space-y-4 text-xs animate-in fade-in-50 duration-100">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xxs font-bold bg-purple-50 text-purple-650 px-2 py-0.5 rounded border border-purple-100">
                    Booking #{selectedBooking.bookingNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xxs font-bold border ${
                    selectedBooking.status === 'BOOKED'
                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {selectedBooking.status}
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-800">{selectedBooking.eventType}</div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-slate-650">
                  <User className="h-4 w-4 text-slate-400" />
                  <div>
                    <div className="font-semibold text-slate-800">{selectedBooking.customer.name}</div>
                    <div className="text-xxs text-slate-450">{selectedBooking.customer.mobile}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-650">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <div>
                    <span className="font-medium">Hall: {selectedBooking.hall.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-650">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <div>Date: {new Date(selectedBooking.bookingDate).toLocaleDateString()}</div>
                    <div className="text-xxs text-slate-450">{selectedBooking.startTime} - {selectedBooking.endTime}</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  onClick={() => router.push(`/party-hall/bookings?booking=${selectedBooking.id}`)}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow text-center transition-all"
                >
                  View Full Booking
                </button>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold text-xs rounded-xl transition-all"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
              <CalendarIcon className="h-8 w-8 text-slate-300" />
              <p className="text-xs font-medium">Click on any Booked/Reserved slot in the calendar to view booking highlights here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
