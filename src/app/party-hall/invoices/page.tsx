'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import axios from 'axios';
import {
  FileText,
  Search,
  Printer,
  Sparkles,
  DollarSign,
  User,
  Calendar,
  MapPin,
  Clock,
  Download,
  Eye
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: number;
  bookingId: string;
  createdAt: string;
  booking: {
    id: string;
    bookingNumber: number;
    eventType: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    guestCount: number;
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
    payments: Array<{
      id: string;
      amount: number;
      method: string;
      date: string;
    }>;
  };
}

export default function InvoicesList() {
  const searchParams = useSearchParams();
  const highlightBookingId = searchParams.get('booking');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 1. Fetch Invoices
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['partyHallInvoices'],
    queryFn: async () => (await api.get('/party-hall/invoices')).data,
  });

  // Auto open invoice if booking ID query param is present
  useEffect(() => {
    if (invoices && highlightBookingId) {
      const targetInvoice = invoices.find((inv) => inv.bookingId === highlightBookingId);
      if (targetInvoice) {
        setSelectedInvoice(targetInvoice);
        setIsPreviewOpen(true);
      }
    }
  }, [invoices, highlightBookingId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const filteredInvoices = invoices?.filter((inv) => {
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toString().includes(term) ||
      inv.booking.bookingNumber.toString().includes(term) ||
      inv.booking.customer.name.toLowerCase().includes(term) ||
      inv.booking.customer.mobile.includes(term)
    );
  });

  const getPaidAmount = (inv: Invoice) => {
    return inv.booking.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  };


  const handlePrint = async () => {
    if (!selectedInvoice) return;
    try {
      const booking = selectedInvoice.booking;
      const formattedDate = new Date(selectedInvoice.createdAt).toLocaleDateString();
      const formattedTime = new Date(selectedInvoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Map booking charges to receipt items list
      const receiptItems = [
        {
          name: `${booking.hall.name} Rent`,
          quantity: 1,
          price: Number(booking.hallRent),
          amount: Number(booking.hallRent)
        }
      ];

      if (Number(booking.decorCharges) > 0) {
        receiptItems.push({ name: 'Decor Charges', quantity: 1, price: Number(booking.decorCharges), amount: Number(booking.decorCharges) });
      }
      if (Number(booking.foodCharges) > 0) {
        receiptItems.push({ name: 'Food/Catering', quantity: 1, price: Number(booking.foodCharges), amount: Number(booking.foodCharges) });
      }
      if (Number(booking.soundCharges) > 0) {
        receiptItems.push({ name: 'Sound Setup', quantity: 1, price: Number(booking.soundCharges), amount: Number(booking.soundCharges) });
      }
      if (Number(booking.generatorCharges) > 0) {
        receiptItems.push({ name: 'Generator Charges', quantity: 1, price: Number(booking.generatorCharges), amount: Number(booking.generatorCharges) });
      }
      if (Number(booking.cleaningCharges) > 0) {
        receiptItems.push({ name: 'Cleaning Charges', quantity: 1, price: Number(booking.cleaningCharges), amount: Number(booking.cleaningCharges) });
      }
      if (Number(booking.extraCharges) > 0) {
        receiptItems.push({ name: 'Extra Charges', quantity: 1, price: Number(booking.extraCharges), amount: Number(booking.extraCharges) });
      }

      const receiptPayload = {
        restaurantName: 'Kyra Banquet Hall',
        restaurantAddress: '1st Cross Road, Bangalore',
        restaurantPhone: '9876543210',
        gstNumber: '29AAAAA1111A1Z1',
        billNumber: `INV-${selectedInvoice.invoiceNumber.toString().padStart(5, '0')}`,
        date: formattedDate,
        time: formattedTime,
        tableNumber: undefined,
        captainName: 'Manager',
        cashierName: 'Manager',
        orderType: 'DINE_IN' as const,
        items: receiptItems,
        subtotal: Number(booking.hallRent) + 
                  Number(booking.decorCharges) + 
                  Number(booking.foodCharges) + 
                  Number(booking.soundCharges) + 
                  Number(booking.generatorCharges) + 
                  Number(booking.cleaningCharges) + 
                  Number(booking.extraCharges),
        discount: Number(booking.discount),
        taxSummary: [
          {
            name: 'GST',
            rate: 18,
            amount: Number(booking.gst)
          }
        ],
        grandTotal: Number(booking.grandTotal),
        paymentMethod: booking.payments[0]?.method || 'CASH',
        customerName: booking.customer.name,
        customerPhone: booking.customer.mobile,
        footerMessage: 'Thank you for booking with us!',
        qrCodeUrl: `https://kyrapos.com/invoice/verify/${selectedInvoice.id}`
      };

      await axios.post('http://localhost:4000/print/customer', receiptPayload, { timeout: 2000 });
    } catch (err) {
      console.warn('Local print agent offline. Falling back to browser printing.', err);
      window.print();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Print stylesheet to isolate print area */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
            padding: 0;
            margin: 0;
            background: white;
            color: black;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <span>Banquet Invoices</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse event invoices, view receipts, and print invoices or export them to PDF.
          </p>
        </div>
      </div>

      {/* Search Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 no-print">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by Invoice #, Booking #, Customer Name or Mobile..."
          className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder-slate-400"
        />
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-455 font-bold uppercase tracking-wider text-xxs">
                <th className="px-5 py-3.5">Invoice #</th>
                <th className="px-5 py-3.5">Booking Details</th>
                <th className="px-5 py-3.5">Customer Name</th>
                <th className="px-5 py-3.5">Invoice Date</th>
                <th className="px-5 py-3.5">Total Amount</th>
                <th className="px-5 py-3.5">Paid Amount</th>
                <th className="px-5 py-3.5">Balance</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredInvoices?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-medium">
                    No invoice records found.
                  </td>
                </tr>
              ) : (
                filteredInvoices?.map((inv) => {
                  const paid = getPaidAmount(inv);
                  const total = Number(inv.booking.grandTotal);
                  const balance = total - paid;
                  
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4 font-bold text-slate-800">INV-{inv.invoiceNumber.toString().padStart(5, '0')}</td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-800">Booking #{inv.booking.bookingNumber}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{inv.booking.customer.name}</div>
                        <div className="text-xxs text-slate-400">{inv.booking.customer.mobile}</div>
                      </td>
                      <td className="px-5 py-4">
                        {new Date(inv.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800">₹{total.toLocaleString()}</td>
                      <td className="px-5 py-4 text-emerald-600 font-semibold">₹{paid.toLocaleString()}</td>
                      <td className={`px-5 py-4 font-semibold ${balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                        ₹{balance.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsPreviewOpen(true);
                          }}
                          className="px-2.5 py-1 hover:bg-purple-50 text-purple-650 hover:text-purple-700 rounded border border-purple-100 font-bold text-xxs transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {isPreviewOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h2 className="font-bold text-slate-800 text-sm">
                Invoice Preview
              </h2>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-650 font-bold text-lg">×</button>
            </div>

            {/* Scrollable Printable Invoice Content */}
            <div className="flex-1 overflow-y-auto p-8" id="print-area">
              <div className="space-y-8 bg-white border border-slate-200 p-8 rounded-xl max-w-2xl mx-auto shadow-xs text-xs text-slate-800 font-sans">
                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                  <div>
                    <div className="flex items-center gap-1.5 text-purple-600 font-bold text-lg">
                      <Sparkles className="h-5.5 w-5.5 text-purple-600" />
                      <span>Kyra Banquet & Party Halls</span>
                    </div>
                    <div className="text-xxs text-slate-450 mt-1 max-w-xs">
                      123 Palace Road, Vasanth Nagar, Bengaluru, KA - 560001
                      <br />
                      Phone: +91 80 4910 1122 | contact@kyra.com
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-slate-850 tracking-tight uppercase">Invoice</h2>
                    <div className="mt-1 font-semibold text-slate-800">
                      Invoice No: INV-{selectedInvoice.invoiceNumber.toString().padStart(5, '0')}
                    </div>
                    <div className="text-xxs text-slate-450 mt-0.5">
                      Date: {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xxs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded inline-block mt-2">
                      Booking Ref: #{selectedInvoice.booking.bookingNumber}
                    </div>
                  </div>
                </div>

                {/* Billing Addresses Info */}
                <div className="grid grid-cols-2 gap-8 text-xxs">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider">Client Information</h4>
                    <div className="font-bold text-xs text-slate-800">{selectedInvoice.booking.customer.name}</div>
                    <div className="space-y-0.5 text-slate-650">
                      <div>Phone: {selectedInvoice.booking.customer.mobile}</div>
                      {selectedInvoice.booking.customer.email && <div>Email: {selectedInvoice.booking.customer.email}</div>}
                      {selectedInvoice.booking.customer.address && <div>Address: {selectedInvoice.booking.customer.address}</div>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider">Event Specifications</h4>
                    <div className="font-bold text-xs text-slate-800">{selectedInvoice.booking.eventType}</div>
                    <div className="space-y-0.5 text-slate-650">
                      <div className="font-medium">Banquet Hall: {selectedInvoice.booking.hall.name}</div>
                      <div>Date: {new Date(selectedInvoice.booking.bookingDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                      <div>Timings: {selectedInvoice.booking.startTime} - {selectedInvoice.booking.endTime}</div>
                      <div>Guests: {selectedInvoice.booking.guestCount} heads</div>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown Tables */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-slate-400 uppercase tracking-wider text-xxs">Charges Summary</h4>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-450 font-bold uppercase text-xxs">
                        <th className="py-2">Description</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-2.5 font-medium">Banquet Hall Base Rent</td>
                        <td className="py-2.5 text-right font-semibold">₹{selectedInvoice.booking.hallRent.toLocaleString()}</td>
                      </tr>
                      {selectedInvoice.booking.decorCharges > 0 && (
                        <tr>
                          <td className="py-2.5 font-medium">Decoration & Lighting Services</td>
                          <td className="py-2.5 text-right font-semibold">₹{selectedInvoice.booking.decorCharges.toLocaleString()}</td>
                        </tr>
                      )}
                      {selectedInvoice.booking.foodCharges > 0 && (
                        <tr>
                          <td className="py-2.5 font-medium">Buffet Catering Services</td>
                          <td className="py-2.5 text-right font-semibold">₹{selectedInvoice.booking.foodCharges.toLocaleString()}</td>
                        </tr>
                      )}
                      {selectedInvoice.booking.soundCharges > 0 && (
                        <tr>
                          <td className="py-2.5 font-medium">Stage Sound & DJ Console System</td>
                          <td className="py-2.5 text-right font-semibold">₹{selectedInvoice.booking.soundCharges.toLocaleString()}</td>
                        </tr>
                      )}
                      {selectedInvoice.booking.generatorCharges > 0 && (
                        <tr>
                          <td className="py-2.5 font-medium">Power Generator Backup Service</td>
                          <td className="py-2.5 text-right font-semibold">₹{selectedInvoice.booking.generatorCharges.toLocaleString()}</td>
                        </tr>
                      )}
                      {selectedInvoice.booking.cleaningCharges > 0 && (
                        <tr>
                          <td className="py-2.5 font-medium">Housekeeping & Cleaning Charge</td>
                          <td className="py-2.5 text-right font-semibold">₹{selectedInvoice.booking.cleaningCharges.toLocaleString()}</td>
                        </tr>
                      )}
                      {selectedInvoice.booking.extraCharges > 0 && (
                        <tr>
                          <td className="py-2.5 font-medium">Supplementary Charges</td>
                          <td className="py-2.5 text-right font-semibold">₹{selectedInvoice.booking.extraCharges.toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <div className="w-64 space-y-2 text-xxs text-slate-500 font-medium">
                    {selectedInvoice.booking.discount > 0 && (
                      <div className="flex justify-between items-center text-rose-600">
                        <span>Discount Applied:</span>
                        <span>-₹{selectedInvoice.booking.discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span>GST Tax (18%):</span>
                      <span className="font-semibold text-slate-800">₹{selectedInvoice.booking.gst.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-slate-800 border-t border-slate-100 pt-2">
                      <span>Grand Total:</span>
                      <span className="text-purple-700">₹{selectedInvoice.booking.grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 pt-1">
                      <span>Total Paid:</span>
                      <span className="font-bold">₹{getPaidAmount(selectedInvoice).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-slate-100/50">
                      <span>Balance Pending:</span>
                      <span className="font-bold text-amber-600">
                        ₹{(Number(selectedInvoice.booking.grandTotal) - getPaidAmount(selectedInvoice)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="grid grid-cols-2 gap-12 pt-16 text-center text-xxs font-medium text-slate-450 border-t border-slate-100 mt-12">
                  <div className="space-y-12">
                    <div className="h-6" /> {/* Placeholder for customer sign */}
                    <div className="border-t border-slate-300 pt-2">Client Signature</div>
                  </div>
                  <div className="space-y-12 border-slate-300">
                    <div className="h-6" /> {/* Placeholder for manager sign */}
                    <div className="border-t border-slate-300 pt-2">Authorised Manager Sign</div>
                  </div>
                </div>

                {/* Thank You Note */}
                <div className="text-center text-xxs text-slate-400 italic pt-4">
                  Thank you for booking with Kyra POS. We hope you have a spectacular event!
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0 no-print">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="h-4 w-4" />
                <span>Print Invoice</span>
              </button>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 border border-slate-250 text-slate-650 hover:bg-slate-100 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
