'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Sparkles,
  ArrowLeft,
  User,
  Calendar,
  Gift,
  AlertCircle,
  Check
} from 'lucide-react';

interface PartyHall {
  id: string;
  name: string;
  capacity: number;
  baseRent: string | number;
  description: string | null;
}

export default function NewBooking() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  // 1. Fetch active party halls
  const { data: halls } = useQuery<PartyHall[]>({
    queryKey: ['partyHalls'],
    queryFn: async () => (await api.get('/party-hall/halls')).data,
  });

  // 2. Fetch booking for edit mode
  const { data: booking, isLoading: isEditLoading } = useQuery({
    queryKey: ['partyHallBooking', editId],
    queryFn: async () => (await api.get(`/party-hall/bookings/${editId}`)).data,
    enabled: isEditMode,
  });

  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAltMobile, setCustomerAltMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [eventType, setEventType] = useState('Birthday');
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('06:00 PM');
  const [hallId, setHallId] = useState('');
  const [guestCount, setGuestCount] = useState(100);
  const [notes, setNotes] = useState('');

  // Service options toggles & custom charges
  const [hasDecor, setHasDecor] = useState(false);
  const [decorCharges, setDecorCharges] = useState(5000);

  const [hasCatering, setHasCatering] = useState(false);
  const [cateringPerGuest, setCateringPerGuest] = useState(false);
  const [foodCharges, setFoodCharges] = useState(15000); // flat or per-guest rate
  const [foodRatePerGuest, setFoodRatePerGuest] = useState(250);

  const [hasSound, setHasSound] = useState(false);
  const [soundCharges, setSoundCharges] = useState(3000);

  const [hasGenerator, setHasGenerator] = useState(false);
  const [generatorCharges, setGeneratorCharges] = useState(4000);

  const [hasCleaning, setHasCleaning] = useState(false);
  const [cleaningCharges, setCleaningCharges] = useState(1500);

  const [extraCharges, setExtraCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  
  // Advance Payment
  const [advancePaid, setAdvancePaid] = useState(10000);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto populate edit details
  useEffect(() => {
    if (isEditMode && booking) {
      setCustomerName(booking.customer.name);
      setCustomerMobile(booking.customer.mobile);
      setCustomerAltMobile(booking.customer.altMobile || '');
      setCustomerEmail(booking.customer.email || '');
      setCustomerAddress(booking.customer.address || '');

      setEventType(booking.eventType);
      setBookingDate(booking.bookingDate.split('T')[0]);
      setStartTime(booking.startTime);
      setEndTime(booking.endTime);
      setHallId(booking.hallId);
      setGuestCount(booking.guestCount);
      setNotes(booking.notes || '');

      setHasDecor(booking.decorCharges > 0);
      setDecorCharges(booking.decorCharges || 5000);
      
      setHasCatering(booking.foodCharges > 0);
      setFoodCharges(booking.foodCharges || 15000);
      
      setHasSound(booking.soundCharges > 0);
      setSoundCharges(booking.soundCharges || 3000);
      
      setHasGenerator(booking.generatorCharges > 0);
      setGeneratorCharges(booking.generatorCharges || 4000);
      
      setHasCleaning(booking.cleaningCharges > 0);
      setCleaningCharges(booking.cleaningCharges || 1500);

      setExtraCharges(booking.extraCharges || 0);
      setDiscount(booking.discount || 0);
      setAdvancePaid(booking.advancePaid || 0);
    }
  }, [isEditMode, booking]);

  // Set default hall ID when halls list loads
  useEffect(() => {
    if (halls && halls.length > 0 && !hallId) {
      setHallId(halls[0].id);
    }
  }, [halls, hallId]);

  // Financial Calculations
  const selectedHall = halls?.find((h) => h.id === hallId);
  const hallRent = selectedHall ? Number(selectedHall.baseRent) : 0;

  const actualDecor = hasDecor ? Number(decorCharges) : 0;
  const actualFood = hasCatering 
    ? (cateringPerGuest ? Number(foodRatePerGuest) * Number(guestCount) : Number(foodCharges)) 
    : 0;
  const actualSound = hasSound ? Number(soundCharges) : 0;
  const actualGen = hasGenerator ? Number(generatorCharges) : 0;
  const actualCleaning = hasCleaning ? Number(cleaningCharges) : 0;
  
  const subtotal = hallRent + actualDecor + actualFood + actualSound + actualGen + actualCleaning + Number(extraCharges);
  
  // 18% GST calculation
  const gst = Math.round(subtotal * 0.18);
  const grandTotal = Math.max(0, subtotal + gst - Number(discount));
  const balance = Math.max(0, grandTotal - Number(advancePaid));

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/party-hall/bookings', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partyHallBookings'] });
      queryClient.invalidateQueries({ queryKey: ['partyHallDashboardStats'] });
      router.push('/party-hall/bookings');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create booking');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => (await api.put(`/party-hall/bookings/${editId}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partyHallBookings'] });
      queryClient.invalidateQueries({ queryKey: ['partyHallDashboardStats'] });
      router.push('/party-hall/bookings');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to update booking');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName || !customerMobile) {
      setErrorMessage('Customer Name and Mobile Number are required');
      return;
    }

    if (!bookingDate) {
      setErrorMessage('Please select an event booking date');
      return;
    }

    const payload = {
      customerName,
      customerMobile,
      customerAltMobile: customerAltMobile || null,
      customerEmail: customerEmail || null,
      customerAddress: customerAddress || null,
      eventType,
      bookingDate,
      startTime,
      endTime,
      hallId,
      guestCount: Number(guestCount),
      decorCharges: actualDecor,
      foodCharges: actualFood,
      soundCharges: actualSound,
      generatorCharges: actualGen,
      cleaningCharges: actualCleaning,
      extraCharges: Number(extraCharges),
      discount: Number(discount),
      gst,
      advancePaid: isEditMode ? undefined : Number(advancePaid), // don't create advance payments on edit
      notes: notes || null,
    };

    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isEditMode && isEditLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>{isEditMode ? `Edit Booking #${booking?.bookingNumber}` : 'New Banquet Booking'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fill customer details, reserve slot timings, select halls, and add supplementary services.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-8 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Customer Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <User className="h-4 w-4 text-purple-650" />
              <span>Customer Information</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Customer Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Mobile Number *</label>
                <input
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Alternate Mobile</label>
                <input
                  type="tel"
                  value={customerAltMobile}
                  onChange={(e) => setCustomerAltMobile(e.target.value)}
                  placeholder="e.g. 9876543211"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. rajesh@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                />
              </div>
              <div className="col-span-full space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Communication Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. Flat 102, Green Meadows, Bengaluru"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. Event Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Calendar className="h-4 w-4 text-purple-650" />
              <span>Event details</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                >
                  <option value="Wedding">Wedding Reception</option>
                  <option value="Birthday">Birthday Party</option>
                  <option value="Seminar">Seminar / Conference</option>
                  <option value="Engagement">Engagement Ceremony</option>
                  <option value="Get-together">Family Get-together</option>
                  <option value="Corporate">Corporate Event</option>
                  <option value="Other">Other Event</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Booking Date *</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Start Time</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="e.g. 09:00 AM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">End Time</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="e.g. 06:00 PM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Banquet Hall Selection</label>
                <select
                  value={hallId}
                  onChange={(e) => setHallId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                >
                  {halls?.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (Max: {h.capacity}) - Base: ₹{Number(h.baseRent).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Guest Count</label>
                <input
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* 3. Auxiliary Services */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Gift className="h-4 w-4 text-purple-650" />
              <span>Supplementary Services</span>
            </h2>
            <div className="space-y-4">
              {/* Decoration */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDecor}
                    onChange={(e) => setHasDecor(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Decoration Service</div>
                    <div className="text-xxs text-slate-400">Floral, balloon, stage lighting, and backdrop configurations</div>
                  </div>
                </label>
                {hasDecor && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-450">₹</span>
                    <input
                      type="number"
                      value={decorCharges}
                      onChange={(e) => setDecorCharges(Number(e.target.value))}
                      className="w-28 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650"
                    />
                  </div>
                )}
              </div>

              {/* Catering */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCatering}
                      onChange={(e) => setHasCatering(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Catering / Food Service</div>
                      <div className="text-xxs text-slate-400">Premium menu course lunch/dinner buffet options</div>
                    </div>
                  </label>
                  {hasCatering && (
                    <div className="flex items-center gap-4 pl-6 text-xxs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 font-medium">
                        <input
                          type="radio"
                          checked={!cateringPerGuest}
                          onChange={() => setCateringPerGuest(false)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span>Flat Budget</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 font-medium">
                        <input
                          type="radio"
                          checked={cateringPerGuest}
                          onChange={() => setCateringPerGuest(true)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span>Per Plate Rate (₹{foodRatePerGuest} × {guestCount} guests)</span>
                      </label>
                    </div>
                  )}
                </div>
                {hasCatering && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-450">₹</span>
                    {cateringPerGuest ? (
                      <input
                        type="number"
                        value={foodRatePerGuest}
                        onChange={(e) => setFoodRatePerGuest(Number(e.target.value))}
                        className="w-28 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650"
                        title="Cost per guest plate"
                      />
                    ) : (
                      <input
                        type="number"
                        value={foodCharges}
                        onChange={(e) => setFoodCharges(Number(e.target.value))}
                        className="w-28 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Sound System */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSound}
                    onChange={(e) => setHasSound(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Sound System & DJ</div>
                    <div className="text-xxs text-slate-400">Microphones, stage speakers, and operator support</div>
                  </div>
                </label>
                {hasSound && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-450">₹</span>
                    <input
                      type="number"
                      value={soundCharges}
                      onChange={(e) => setSoundCharges(Number(e.target.value))}
                      className="w-28 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650"
                    />
                  </div>
                )}
              </div>

              {/* Power Generator Backup */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasGenerator}
                    onChange={(e) => setHasGenerator(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Generator Backup</div>
                    <div className="text-xxs text-slate-400">High-capacity load shedding diesel generator</div>
                  </div>
                </label>
                {hasGenerator && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-450">₹</span>
                    <input
                      type="number"
                      value={generatorCharges}
                      onChange={(e) => setGeneratorCharges(Number(e.target.value))}
                      className="w-28 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650"
                    />
                  </div>
                )}
              </div>

              {/* Cleaning Services */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCleaning}
                    onChange={(e) => setHasCleaning(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Cleaning & Housekeeping</div>
                    <div className="text-xxs text-slate-400">Garbage clearing, floor sweeping, and restroom maintenance</div>
                  </div>
                </label>
                {hasCleaning && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-450">₹</span>
                    <input
                      type="number"
                      value={cleaningCharges}
                      onChange={(e) => setCleaningCharges(Number(e.target.value))}
                      className="w-28 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Special Notes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Special Instructions / Decor requests</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details about stage dimensions, specific seating configurations, flower choices..."
                rows={4}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-650 focus:bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Invoice / Calculations summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 sticky top-6">
            <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Financial Ledger</span>
              <span className="text-xxs bg-purple-50 text-purple-650 px-2 py-0.5 rounded-full font-bold">
                Tax (18% GST)
              </span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Hall Base Rent:</span>
                <span className="font-semibold text-slate-800">₹{hallRent.toLocaleString()}</span>
              </div>
              
              {actualDecor > 0 && (
                <div className="flex justify-between items-center text-slate-500 animate-in slide-in-from-top-1 duration-100">
                  <span>Decorations:</span>
                  <span className="font-semibold text-slate-800">₹{actualDecor.toLocaleString()}</span>
                </div>
              )}

              {actualFood > 0 && (
                <div className="flex justify-between items-center text-slate-500 animate-in slide-in-from-top-1 duration-100">
                  <span>Catering & Food:</span>
                  <span className="font-semibold text-slate-800">
                    ₹{actualFood.toLocaleString()}
                  </span>
                </div>
              )}

              {actualSound > 0 && (
                <div className="flex justify-between items-center text-slate-500 animate-in slide-in-from-top-1 duration-100">
                  <span>Sound System:</span>
                  <span className="font-semibold text-slate-800">₹{actualSound.toLocaleString()}</span>
                </div>
              )}

              {actualGen > 0 && (
                <div className="flex justify-between items-center text-slate-500 animate-in slide-in-from-top-1 duration-100">
                  <span>Power Backup:</span>
                  <span className="font-semibold text-slate-800">₹{actualGen.toLocaleString()}</span>
                </div>
              )}

              {actualCleaning > 0 && (
                <div className="flex justify-between items-center text-slate-500 animate-in slide-in-from-top-1 duration-100">
                  <span>Cleaning Services:</span>
                  <span className="font-semibold text-slate-800">₹{actualCleaning.toLocaleString()}</span>
                </div>
              )}

              {/* Extra Charges Input */}
              <div className="flex justify-between items-center gap-4 text-slate-550 border-t border-slate-100 pt-3">
                <span className="shrink-0">Extra Charges:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xxs">₹</span>
                  <input
                    type="number"
                    value={extraCharges}
                    onChange={(e) => setExtraCharges(Number(e.target.value))}
                    min={0}
                    className="w-24 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-right font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Discount Input */}
              <div className="flex justify-between items-center gap-4 text-slate-550">
                <span className="shrink-0">Discount Applied:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xxs text-rose-600">-₹</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    min={0}
                    className="w-24 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-right font-semibold text-rose-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* GST display */}
              <div className="flex justify-between items-center text-slate-500 pt-1">
                <span>GST Tax (18%):</span>
                <span className="font-semibold text-slate-800">₹{gst.toLocaleString()}</span>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center border-y border-slate-100 py-3 text-sm font-bold text-slate-800">
                <span>Grand Total:</span>
                <span className="text-purple-700 text-lg">₹{grandTotal.toLocaleString()}</span>
              </div>

              {/* Advance Paid input (Create mode only) */}
              {!isEditMode && (
                <div className="flex justify-between items-center gap-4 text-slate-550 pt-1">
                  <span className="shrink-0 font-medium">Advance Paid (CASH):</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xxs text-emerald-600">₹</span>
                    <input
                      type="number"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(Number(e.target.value))}
                      min={0}
                      max={grandTotal}
                      className="w-24 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-right font-semibold text-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Balance display */}
              <div className="flex justify-between items-center text-slate-800 font-bold text-xs bg-slate-55 border border-slate-200 p-2.5 rounded-xl">
                <span>Remaining Balance:</span>
                <span className={balance > 0 ? 'text-amber-600' : 'text-slate-500'}>
                  ₹{balance.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-400 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>
                  {createMutation.isPending || updateMutation.isPending 
                    ? 'Processing...' 
                    : isEditMode 
                    ? 'Update Booking Record' 
                    : 'Confirm Booking & Reserve'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
