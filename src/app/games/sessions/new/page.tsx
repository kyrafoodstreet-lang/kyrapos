'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import {
  Gamepad2,
  Search,
  UserPlus,
  UserCheck,
  DollarSign,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  Printer,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface Game {
  id: string;
  name: string;
}

interface Pricing {
  id: string;
  gameId: string;
  name: string;
  duration: number;
  price: string;
}

interface CustomerSearch {
  id: string;
  name: string;
  mobile: string;
  age: number;
  gender: string;
  previousVisits: number;
  totalSpent: number;
}

export default function NewGameSession() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // Steps: 1 = Customer, 2 = Package, 3 = Payment
  const [step, setStep] = useState(1);

  // Step 1: Customer States
  const [mobile, setMobile] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [customer, setCustomer] = useState<CustomerSearch | null>(null);

  // New Customer Registration States
  const [regForm, setRegForm] = useState({ name: '', age: 8, gender: 'MALE' });

  // Step 2 & 3: Selection States
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedPricingId, setSelectedPricingId] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState('');

  // Discount & GST States
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Manager Override Challenge States
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ username: '', password: '', reason: '' });
  const [overrideAuthPayload, setOverrideAuthPayload] = useState<any>(null);

  // Queries
  const { data: games } = useQuery<Game[]>({
    queryKey: ['gamesCatalog'],
    queryFn: async () => (await api.get('/games/catalog')).data,
  });

  const { data: pricings } = useQuery<Pricing[]>({
    queryKey: ['gamesPricing'],
    queryFn: async () => (await api.get('/games/pricing')).data,
  });

  // Search Customer Mutation
  const searchCustomerMutation = useMutation({
    mutationFn: async (phone: string) => (await api.get(`/games/customers/search/${phone}`)).data,
    onSuccess: (data) => {
      setCustomer(data);
      setHasSearched(true);
      if (!data) {
        // initialize name
        setRegForm((prev) => ({ ...prev, name: '' }));
      }
    },
  });

  // Register Customer Mutation
  const registerCustomerMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/games/customers', payload)).data,
    onSuccess: (data) => {
      setCustomer({
        id: data.id,
        name: data.name,
        mobile: data.mobile,
        age: data.age,
        gender: data.gender,
        previousVisits: 0,
        totalSpent: 0,
      });
      setStep(2);
    },
  });

  // Create Session Mutation
  const createSessionMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/games/sessions', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamesDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['gamesActiveSessions'] });
      router.push('/games/sessions?tab=active');
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length < 10) return;
    searchCustomerMutation.mutate(mobile);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name.trim() || regForm.age <= 0) return;
    registerCustomerMutation.mutate({
      ...regForm,
      mobile,
    });
  };

  // Pricing math helper
  const currentPricing = pricings?.find((p) => p.id === selectedPricingId);
  const basePrice = currentPricing ? Number(currentPricing.price) : 0;
  const originalPrice = basePrice * guestCount;
  const subtotal = Math.max(0, originalPrice - discount);
  const gst = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + gst;

  const handleDiscountChange = (val: number) => {
    if (val <= 0) {
      setDiscount(0);
      setOverrideAuthPayload(null);
      return;
    }

    if (user?.role === 'CASHIER') {
      // Cashier is attempting a discount override
      setDiscount(val);
      setShowOverrideModal(true);
    } else {
      // Manager/Admin can override discount immediately
      setDiscount(val);
    }
  };

  const handleAuthorizeOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.username || !overrideForm.password || !overrideForm.reason) return;
    // Store override credentials to attach during session check-in
    setOverrideAuthPayload({
      username: overrideForm.username,
      password: overrideForm.password,
      reason: overrideForm.reason,
    });
    setShowOverrideModal(false);
  };

  const handleStartSession = () => {
    if (!customer || !selectedGameId || !selectedPricingId) return;

    createSessionMutation.mutate({
      customerId: customer.id,
      gameId: selectedGameId,
      pricingId: selectedPricingId,
      guestCount,
      notes,
      discount,
      gst,
      amountPaid: grandTotal, // immediate checkout payment collected
      paymentMethod,
      overrideAuth: overrideAuthPayload || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <h1 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Gamepad2 className="h-4.5 w-4.5 text-blue-650" />
          <span>New Game Check-in</span>
        </h1>
        <div className="text-xxs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
          Step {step} of 3
        </div>
      </div>

      {/* Step 1: Customer Lookup / Registration */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-in fade-in-50 duration-100">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Step 1: Customer Profile Search</h3>
          
          <form onSubmit={handleSearch} className="flex gap-2.5">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                placeholder="Enter 10-digit mobile number..."
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  setHasSearched(false);
                }}
                className="bg-transparent text-xs text-slate-800 outline-none placeholder-slate-450 w-full"
              />
            </div>
            <button
              type="submit"
              disabled={searchCustomerMutation.isPending}
              className="px-5 py-3 bg-blue-650 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all"
            >
              Search
            </button>
          </form>

          {hasSearched && (
            <div className="pt-2">
              {customer ? (
                /* Customer Exists */
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <UserCheck className="h-4.5 w-4.5" />
                    <span>Customer Found</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xxs text-slate-650">
                    <div>Name: <span className="font-bold text-slate-800">{customer.name}</span></div>
                    <div>Mobile: <span className="font-bold text-slate-800">{customer.mobile}</span></div>
                    <div>Previous Visits: <span className="font-semibold text-slate-700">{customer.previousVisits} times</span></div>
                    <div>Total Lifetime Spend: <span className="font-bold text-emerald-600">₹{customer.totalSpent.toLocaleString()}</span></div>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span>Continue to Selection</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                /* Customer Not Found - Register Form */
                <form onSubmit={handleRegister} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-slate-750 font-bold text-xs">
                    <UserPlus className="h-4.5 w-4.5 text-blue-600" />
                    <span>New Customer Registration</span>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Customer Name</label>
                      <input
                        type="text"
                        required
                        value={regForm.name}
                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                        placeholder="Full Name"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-medium outline-none focus:border-blue-500 text-slate-850"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Age (Years)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="100"
                          value={regForm.age}
                          onChange={(e) => setRegForm({ ...regForm, age: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-medium outline-none focus:border-blue-500 text-slate-850"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Gender</label>
                        <select
                          required
                          value={regForm.gender}
                          onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold outline-none focus:border-blue-500 text-slate-850"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-650 hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                  >
                    <span>Save Customer & Continue</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Game & Package Selection */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-in fade-in-50 duration-100">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 justify-between">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Step 2: Choose Game & Rate</h3>
            <button onClick={() => setStep(1)} className="text-xxs font-semibold text-slate-450 hover:text-slate-700 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Back</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Select Game */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Select Game Zone</label>
              <select
                required
                value={selectedGameId}
                onChange={(e) => {
                  setSelectedGameId(e.target.value);
                  setSelectedPricingId('');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold outline-none focus:border-blue-500 text-slate-850"
              >
                <option value="">-- Select Game --</option>
                {games?.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Select Pricing Package */}
            {selectedGameId && (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Select Rate Package</label>
                <select
                  required
                  value={selectedPricingId}
                  onChange={(e) => setSelectedPricingId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold outline-none focus:border-blue-500 text-slate-850"
                >
                  <option value="">-- Choose Rate package --</option>
                  {pricings?.filter((p) => p.gameId === selectedGameId).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₹{Number(p.price).toLocaleString()} {p.duration > 0 ? `(${p.duration}m)` : '(Flat)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Guest Count */}
            {selectedPricingId && (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Number of Persons</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold outline-none focus:border-blue-500 text-slate-850"
                />
              </div>
            )}
          </div>

          {selectedPricingId && (
            <button
              onClick={() => setStep(3)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-xs"
            >
              <span>Proceed to Payment</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Step 3: Checkout and Payments Calculator */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-in fade-in-50 duration-100">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 justify-between">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Step 3: Fees Calculator</h3>
            <button onClick={() => setStep(2)} className="text-xxs font-semibold text-slate-450 hover:text-slate-700 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Back</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Locked base price summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-slate-550 font-medium">
                <span>Base Rate ({guestCount} heads):</span>
                <span className="font-bold text-slate-800">₹{originalPrice.toLocaleString()}</span>
              </div>

              {/* Discount inputs */}
              <div className="flex items-center justify-between">
                <span className="text-slate-550 font-medium flex items-center gap-1">
                  <span>Manager Override Discount:</span>
                  {overrideAuthPayload ? (
                    <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </span>
                <input
                  type="number"
                  min="0"
                  max={originalPrice}
                  value={discount}
                  onChange={(e) => handleDiscountChange(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 w-24 text-right font-bold text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>

              {/* GST rate displaying */}
              <div className="flex justify-between items-center text-slate-550 font-medium border-t border-slate-200/50 pt-2">
                <span>GST Tax (18% standard):</span>
                <span>₹{gst.toLocaleString()}</span>
              </div>

              {/* Net Grand Total */}
              <div className="flex justify-between items-center text-sm font-bold text-slate-800 border-t border-slate-200 pt-2">
                <span>Net Grand Total:</span>
                <span className="text-blue-650">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method Option */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Settlement Method</label>
              <select
                required
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold outline-none focus:border-blue-500 text-slate-850"
              >
                <option value="CASH">Cash Payment</option>
                <option value="UPI">UPI Digital Payment</option>
                <option value="BANK_TRANSFER">Bank NetBanking</option>
              </select>
            </div>

            {/* Session Notes */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Check-in Notes</label>
              <input
                type="text"
                placeholder="Wristband serial, specific requirements..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:border-blue-500 text-slate-850"
              />
            </div>
          </div>

          <button
            onClick={handleStartSession}
            disabled={createSessionMutation.isPending}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>{createSessionMutation.isPending ? 'Processing...' : 'Confirm & Start Session'}</span>
          </button>
        </div>
      )}

      {/* Manager Override Credentials Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-bold text-slate-850 text-xxs uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="h-4 w-4 text-blue-600" />
                <span>Manager Authorization Challenge</span>
              </h4>
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setDiscount(0);
                }}
                className="text-slate-400 hover:text-slate-650 font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAuthorizeOverride} className="p-6 space-y-4 text-xs">
              <p className="text-xxs text-slate-500 leading-relaxed bg-amber-50 border border-amber-100 p-3 rounded-lg">
                Authorized role (Admin or Manager) credentials are required to apply a discount override.
              </p>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Manager Email</label>
                <input
                  type="email"
                  required
                  placeholder="manager@kyra.com"
                  value={overrideForm.username}
                  onChange={(e) => setOverrideForm({ ...overrideForm, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium outline-none focus:border-blue-500 text-slate-855"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={overrideForm.password}
                  onChange={(e) => setOverrideForm({ ...overrideForm, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium outline-none focus:border-blue-500 text-slate-855"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Override Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Promotional offer, special guest discount"
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium outline-none focus:border-blue-500 text-slate-855"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition-all"
                >
                  Authorize Override
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOverrideModal(false);
                    setDiscount(0);
                  }}
                  className="px-4 py-2.5 border border-slate-250 hover:bg-slate-50 text-slate-650 font-semibold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
