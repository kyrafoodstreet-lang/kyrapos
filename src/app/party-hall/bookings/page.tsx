'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Search,
  Eye,
  Edit2,
  XCircle,
  CreditCard,
  Printer,
  Sparkles,
  FileText,
  DollarSign,
  AlertCircle,
  Calendar,
  User,
  MapPin,
  Clock
} from 'lucide-react';

interface Booking {
  id: string;
  bookingNumber: number;
  customerId: string;
  hallId: string;
  eventType: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: string;
  hallRent: number;
  decorCharges: number;
  foodCharges: number;
  soundCharges: number;
  generatorCharges: number;
  cleaningCharges: number;
  extraCharges: number;
  discount: number;
  gst: number;
  grandTotal: number;
  notes: string | null;
  advancePaid: number;
  balanceAmount: number;
  customer: {
    name: string;
    mobile: string;
    altMobile: string | null;
    email: string | null;
    address: string | null;
  };
  hall: {
    name: string;
  };
  payments?: Array<{
    id: string;
    amount: number;
    method: string;
    date: string;
    notes?: string | null;
  }>;
  invoices?: Array<{
    id: string;
    invoiceNumber: number;
  }>;
  services?: Array<{
    id: string;
    name: string;
    cost: number;
  }>;
}

export default function BookingsList() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // 1. Fetch Bookings
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['partyHallBookings'],
    queryFn: async () => (await api.get('/party-hall/bookings')).data,
  });

  // 2. Mutations
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => 
      (await api.put(`/party-hall/bookings/${id}/status`, { status: 'CANCELLED' })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partyHallBookings'] });
      queryClient.invalidateQueries({ queryKey: ['partyHallDashboardStats'] });
      if (selectedBooking) {
        // Refresh details modal
        refetchSelectedBooking(selectedBooking.id);
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    }
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => 
      (await api.post(`/party-hall/bookings/${id}/payments`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partyHallBookings'] });
      queryClient.invalidateQueries({ queryKey: ['partyHallDashboardStats'] });
      setIsPaymentModalOpen(false);
      if (selectedBooking) {
        refetchSelectedBooking(selectedBooking.id);
      }
    },
    onError: (err: any) => {
      setPaymentError(err.response?.data?.message || 'Failed to record payment');
    }
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (bookingId: string) => 
      (await api.post(`/party-hall/bookings/${bookingId}/invoices`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partyHallBookings'] });
      if (selectedBooking) {
        refetchSelectedBooking(selectedBooking.id);
      }
      alert('Invoice generated successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to generate invoice');
    }
  });

  const refetchSelectedBooking = async (id: string) => {
    try {
      const res = await api.get(`/party-hall/bookings/${id}`);
      setSelectedBooking(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenViewModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsViewModalOpen(true);
  };

  const handleOpenPaymentModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setPaymentAmount(booking.balanceAmount);
    setPaymentMethod('CASH');
    setPaymentNotes('');
    setPaymentError('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    if (!selectedBooking) return;
    if (paymentAmount <= 0) {
      setPaymentError('Amount must be greater than 0');
      return;
    }

    recordPaymentMutation.mutate({
      id: selectedBooking.id,
      payload: {
        amount: Number(paymentAmount),
        method: paymentMethod,
        notes: paymentNotes || null,
      }
    });
  };

  const handleCancelBooking = (id: string, bookingNumber: number) => {
    if (confirm(`Are you sure you want to CANCEL Booking #${bookingNumber}?`)) {
      cancelMutation.mutate(id);
    }
  };

  const filteredBookings = bookings?.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.bookingNumber.toString().includes(term) ||
      b.customer.name.toLowerCase().includes(term) ||
      b.customer.mobile.includes(term) ||
      b.eventType.toLowerCase().includes(term) ||
      b.hall.name.toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>Banquet Bookings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse event booking logs, collect final balances, generate invoices, or record cancellations.
          </p>
        </div>
        <button
          onClick={() => router.push('/party-hall/bookings/new')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition-all text-center"
        >
          + New Booking
        </button>
      </div>

      {/* Search Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Booking #, Customer Name, Mobile, Hall or Event type..."
          className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder-slate-400"
        />
      </div>

      {/* Bookings List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider text-xxs">
                <th className="px-5 py-3.5">Booking #</th>
                <th className="px-5 py-3.5">Customer Details</th>
                <th className="px-5 py-3.5">Hall & Event</th>
                <th className="px-5 py-3.5">Event Date</th>
                <th className="px-5 py-3.5">Guests</th>
                <th className="px-5 py-3.5">Advance</th>
                <th className="px-5 py-3.5">Balance</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredBookings?.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-slate-400 font-medium">
                    No booking records match the filter query.
                  </td>
                </tr>
              ) : (
                filteredBookings?.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-bold text-slate-800">#{b.bookingNumber}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{b.customer.name}</div>
                      <div className="text-xxs text-slate-400">{b.customer.mobile}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{b.hall.name}</div>
                      <div className="text-xxs text-slate-400 uppercase">{b.eventType}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {new Date(b.bookingDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </div>
                      <div className="text-xxs text-slate-400">{b.startTime} - {b.endTime}</div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{b.guestCount}</td>
                    <td className="px-5 py-4 text-emerald-600 font-semibold">₹{b.advancePaid.toLocaleString()}</td>
                    <td className={`px-5 py-4 font-semibold ${b.balanceAmount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                      ₹{b.balanceAmount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">₹{b.grandTotal.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xxs font-bold border ${
                        b.status === 'BOOKED'
                          ? 'bg-purple-50 text-purple-750 border-purple-200'
                          : b.status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-700 border-rose-250'
                          : 'bg-amber-50 text-amber-700 border-amber-250'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenViewModal(b)}
                        title="View details"
                        className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded border border-slate-200 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {b.status !== 'CANCELLED' && (
                        <>
                          <button
                            onClick={() => router.push(`/party-hall/bookings/new?edit=${b.id}`)}
                            title="Edit booking"
                            className="p-1 hover:bg-purple-50 text-purple-600 hover:text-purple-700 rounded border border-purple-100 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {b.balanceAmount > 0 && (
                            <button
                              onClick={() => handleOpenPaymentModal(b)}
                              title="Record payment"
                              className="p-1 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded border border-emerald-100 transition-colors"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelBooking(b.id, b.bookingNumber)}
                            title="Cancel booking"
                            className="p-1 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded border border-rose-100 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. View Details Slide-Over/Modal */}
      {isViewModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-purple-600" />
                <span>Booking Details #{selectedBooking.bookingNumber}</span>
              </h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-650 font-bold text-lg">×</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              {/* Customer and Event summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Details */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-xxs">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>Customer Details</span>
                  </h4>
                  <div className="font-bold text-sm text-slate-800">{selectedBooking.customer.name}</div>
                  <div>Mobile: {selectedBooking.customer.mobile}</div>
                  {selectedBooking.customer.altMobile && <div>Alt Mobile: {selectedBooking.customer.altMobile}</div>}
                  {selectedBooking.customer.email && <div>Email: {selectedBooking.customer.email}</div>}
                  {selectedBooking.customer.address && <div>Address: {selectedBooking.customer.address}</div>}
                </div>

                {/* Event Details */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-xxs">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>Event Details</span>
                  </h4>
                  <div className="font-bold text-sm text-slate-800">{selectedBooking.eventType}</div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>Hall: {selectedBooking.hall.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Date: {new Date(selectedBooking.bookingDate).toLocaleDateString()}</span>
                  </div>
                  <div>Time Slot: {selectedBooking.startTime} - {selectedBooking.endTime}</div>
                  <div>Guest Count: {selectedBooking.guestCount} guests</div>
                </div>
              </div>

              {/* Charge Breakdown */}
              <div className="space-y-3.5 border-t border-slate-100 pt-4">
                <h3 className="font-bold text-slate-800 text-xs">Cost Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-2 border border-slate-150 rounded bg-white">
                    <div className="text-xxs text-slate-400 font-medium">Hall Rent</div>
                    <div className="font-semibold text-slate-800">₹{selectedBooking.hallRent.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border border-slate-150 rounded bg-white">
                    <div className="text-xxs text-slate-400 font-medium">Decoration</div>
                    <div className="font-semibold text-slate-800">₹{selectedBooking.decorCharges.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border border-slate-150 rounded bg-white">
                    <div className="text-xxs text-slate-400 font-medium">Catering/Food</div>
                    <div className="font-semibold text-slate-800">₹{selectedBooking.foodCharges.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border border-slate-150 rounded bg-white">
                    <div className="text-xxs text-slate-400 font-medium">Generator</div>
                    <div className="font-semibold text-slate-800">₹{selectedBooking.generatorCharges.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border border-slate-150 rounded bg-white">
                    <div className="text-xxs text-slate-400 font-medium">Cleaning</div>
                    <div className="font-semibold text-slate-800">₹{selectedBooking.cleaningCharges.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border border-slate-150 rounded bg-white">
                    <div className="text-xxs text-slate-400 font-medium">Extra Charges</div>
                    <div className="font-semibold text-slate-800">₹{selectedBooking.extraCharges.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border border-slate-150 rounded bg-white">
                    <div className="text-xxs text-slate-400 font-medium">Discount</div>
                    <div className="font-semibold text-rose-600">-₹{selectedBooking.discount.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border border-slate-150 rounded bg-white">
                    <div className="text-xxs text-slate-400 font-medium">GST Tax</div>
                    <div className="font-semibold text-slate-800">₹{selectedBooking.gst.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border border-purple-150 rounded bg-purple-50/50">
                    <div className="text-xxs text-purple-500 font-bold">Grand Total</div>
                    <div className="font-bold text-purple-700">₹{selectedBooking.grandTotal.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Payments ledger summary */}
              <div className="space-y-3.5 border-t border-slate-100 pt-4 text-xs">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-xs">Payment Receipts</h3>
                  <div className="font-semibold text-slate-700">
                    Total Paid: <span className="text-emerald-600">₹{selectedBooking.advancePaid.toLocaleString()}</span> | Balance: <span className="text-amber-600">₹{selectedBooking.balanceAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-450 font-bold text-xxs uppercase">
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Amount</th>
                        <th className="px-4 py-2">Method</th>
                        <th className="px-4 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-650">
                      {!selectedBooking.payments || selectedBooking.payments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-slate-450">No payments registered yet.</td>
                        </tr>
                      ) : (
                        selectedBooking.payments?.map((p: any) => (
                          <tr key={p.id}>
                            <td className="px-4 py-2.5">{new Date(p.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-800">₹{Number(p.amount).toLocaleString()}</td>
                            <td className="px-4 py-2.5 uppercase font-medium">{p.method}</td>
                            <td className="px-4 py-2.5 text-slate-500">{p.notes || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div className="border-t border-slate-100 pt-4 text-xs space-y-1 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <div className="font-bold text-slate-700">Special Requests / Notes:</div>
                  <p className="text-slate-600 italic">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <div>
                {selectedBooking.invoices && selectedBooking.invoices.length > 0 ? (
                  <button
                    onClick={() => router.push(`/party-hall/invoices?booking=${selectedBooking.id}`)}
                    className="px-3.5 py-2 hover:bg-slate-150 border border-slate-350 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Invoice</span>
                  </button>
                ) : (
                  selectedBooking.status !== 'CANCELLED' && (
                    <button
                      onClick={() => generateInvoiceMutation.mutate(selectedBooking.id)}
                      className="px-3.5 py-2 hover:bg-purple-50 border border-purple-300 text-purple-650 font-bold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Generate Invoice</span>
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 border border-slate-250 text-slate-650 hover:bg-slate-100 font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Record Payment Modal */}
      {isPaymentModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm">
                Record Payment (Booking #{selectedBooking.bookingNumber})
              </h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-650 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4">
              {paymentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs space-y-1">
                <div className="text-purple-600 font-medium">Grand Total: ₹{selectedBooking.grandTotal.toLocaleString()}</div>
                <div className="text-slate-500">Already Paid: ₹{selectedBooking.advancePaid.toLocaleString()}</div>
                <div className="text-purple-800 font-bold">Remaining Balance: ₹{selectedBooking.balanceAmount.toLocaleString()}</div>
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Payment Amount (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  min={1}
                  max={selectedBooking.balanceAmount}
                  step="any"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / QR Scan</option>
                  <option value="BANK_TRANSFER">Bank Direct Transfer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Payment Remarks / Reference</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cheque details, txn ID..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3.5 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-400 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow transition-all"
                >
                  {recordPaymentMutation.isPending ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
