'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  Minus,
  Plus,
  Tag,
  Banknote,
  Smartphone,
  CreditCard,
  Play,
  Coins,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import {
  PageHeader,
  StatusBadge,
  Button,
} from '@/components/ui';

interface Game {
  id: string;
  name: string;
  description?: string | null;
}

interface CustomerSearchResult {
  id: string;
  customerCode?: string;
  name: string;
  mobile: string;
  email?: string | null;
  parentName?: string | null;
  childName?: string | null;
  age?: number;
  gender?: string;
  previousVisits: number;
  totalSpent: number;
  lastVisit?: string | null;
  currentActiveSession?: string | null;
}

interface AppliedOffer {
  code: string;
  discount: number;
  description: string;
}

type ZoneType = 'TRAMPOLINE' | 'COIN_GAMES';

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  description?: string;
}

const COIN_PACKAGES: CoinPackage[] = [
  { id: 'coin-1', name: '1 Coin', coins: 1, price: 40, description: 'Single game token' },
  { id: 'coin-4', name: '4 Coins', coins: 4, price: 150, description: 'Popular mini pack' },
  { id: 'coin-10', name: '10 Coins', coins: 10, price: 350, description: 'Value family pack' },
];

export default function NewGameSessionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Real-time POS Clock
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // 1. CUSTOMER STATE
  // =========================================================
  const [mobileNumber, setMobileNumber] = useState('');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(null);
  const [customerCode, setCustomerCode] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Customer Form Fields
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');

  // =========================================================
  // 2. ZONE SELECTION & DETAILS (TRAMPOLINE / COIN GAMES ONLY)
  // =========================================================
  const [selectedZone, setSelectedZone] = useState<ZoneType>('TRAMPOLINE');
  const [notes, setNotes] = useState('');

  // Trampoline Specific State
  const [adultCount, setAdultCount] = useState<number>(1);
  const [childCount, setChildCount] = useState<number>(0);
  const [selectedDuration, setSelectedDuration] = useState<number>(30); // 30, 60, 90, 120

  // Coin Game Multi-Quantity State
  const [coinQuantities, setCoinQuantities] = useState<Record<string, number>>({
    'coin-1': 0,
    'coin-4': 1,
    'coin-10': 0,
  });

  // Optional Grip Socks (₹70 / pair)
  const [socksCount, setSocksCount] = useState<number>(0);
  const socksRate = 70;
  const socksAmount = useMemo(() => socksCount * socksRate, [socksCount, socksRate]);

  // =========================================================
  // 3. OFFER STATE
  // =========================================================
  const [offerInput, setOfferInput] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<AppliedOffer | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  // =========================================================
  // 4. PAYMENT STATE
  // =========================================================
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CASH_AND_UPI'>('CASH');
  const [cashSplitAmount, setCashSplitAmount] = useState<number>(0);
  const [upiSplitAmount, setUpiSplitAmount] = useState<number>(0);

  // Status & Feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [checkoutSuccessMsg, setCheckoutSuccessMsg] = useState<string | null>(null);

  // =========================================================
  // QUERIES: Fetch Game Catalog for ID matching & Active Sessions Feed
  // =========================================================
  const { data: games } = useQuery<Game[]>({
    queryKey: ['gamesCatalog'],
    queryFn: async () => (await api.get('/games/catalog')).data,
  });

  const { data: activeSessions } = useQuery<any[]>({
    queryKey: ['gamesActiveSessions'],
    queryFn: async () => (await api.get('/games/sessions/active')).data,
    refetchInterval: 8000,
  });

  // Resolve matching backend Game record ID
  const resolvedGame = useMemo(() => {
    if (!games || games.length === 0) return null;
    if (selectedZone === 'TRAMPOLINE') {
      return games.find((g) => g.name.toLowerCase().includes('trampoline')) || games[0];
    }
    return games.find((g) => g.name.toLowerCase().includes('coin')) || games[0];
  }, [games, selectedZone]);

  // Coin Game Helpers (Multi-click increase & steppers)
  const handleIncrementCoin = (pkgId: string) => {
    setCoinQuantities((prev) => ({
      ...prev,
      [pkgId]: (prev[pkgId] || 0) + 1,
    }));
  };

  const handleDecrementCoin = (pkgId: string) => {
    setCoinQuantities((prev) => ({
      ...prev,
      [pkgId]: Math.max(0, (prev[pkgId] || 0) - 1),
    }));
  };

  const totalSelectedCoins = useMemo(() => {
    return Object.entries(coinQuantities).reduce((sum, [id, qty]) => {
      const pkg = COIN_PACKAGES.find((p) => p.id === id);
      return sum + (pkg ? pkg.coins * qty : 0);
    }, 0);
  }, [coinQuantities]);

  const totalCoinPackageCount = useMemo(() => {
    return Object.values(coinQuantities).reduce((sum, qty) => sum + qty, 0);
  }, [coinQuantities]);

  // Handle Zone Switching with Complete State Reset
  const handleSelectZone = (zone: ZoneType) => {
    if (selectedZone === zone) return;
    setSelectedZone(zone);
    setFormError(null);
    setAppliedOffer(null);
    setOfferInput('');

    if (zone === 'TRAMPOLINE') {
      setAdultCount(1);
      setChildCount(0);
      setSelectedDuration(30);
      setCoinQuantities({ 'coin-1': 0, 'coin-4': 0, 'coin-10': 0 });
    } else {
      setAdultCount(0);
      setChildCount(0);
      setSelectedDuration(0);
      setCoinQuantities({ 'coin-1': 0, 'coin-4': 1, 'coin-10': 0 });
    }
  };

  // 1-Click Load Online Advance Booking
  const handleLoadAdvanceBooking = (booking: any) => {
    if (!booking) return;
    const gName = (booking.game?.name || '').toLowerCase();
    if (gName.includes('coin') || gName.includes('arcade')) {
      setSelectedZone('COIN_GAMES');
    } else {
      setSelectedZone('TRAMPOLINE');
    }

    if (booking.adultCount !== undefined) setAdultCount(booking.adultCount);
    if (booking.childCount !== undefined) setChildCount(booking.childCount);
    if (booking.duration) setSelectedDuration(booking.duration);
    if (booking.bookingCode) {
      setNotes(`Online Booking Ref: #${booking.bookingCode}`);
    }
  };

  // =========================================================
  // MUTATIONS
  // =========================================================

  // Search Customer Mutation
  const searchCustomerMutation = useMutation({
    mutationFn: async (phone: string) => {
      setFormError(null);
      const res = await api.get(`/games/customers/search/${phone}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      setHasSearched(true);
      if (data) {
        setIsExistingCustomer(true);
        setExistingCustomerId(data.id);
        setCustomerCode(data.customerCode || `CUST-${data.id.slice(0, 6).toUpperCase()}`);
        setCustomerName(data.name || '');
        setEmail(data.email || '');
        setParentName(data.parentName || '');
        setChildName(data.childName || '');
      } else {
        setIsExistingCustomer(false);
        setExistingCustomerId(null);
        setCustomerCode(null);
        setCustomerName('');
        setEmail('');
        setParentName('');
        setChildName('');
      }
    },
    onError: (err: any) => {
      setHasSearched(true);
      setIsExistingCustomer(false);
      setExistingCustomerId(null);
      setCustomerCode(null);
      setFormError(err?.response?.data?.message || 'Error searching customer');
    },
  });

  // Validate Offer Mutation
  const validateOfferMutation = useMutation({
    mutationFn: async ({ code, amount }: { code: string; amount: number }) => {
      setOfferError(null);
      return (await api.post('/games/offers/validate', { code, amount })).data;
    },
    onSuccess: (data) => {
      setAppliedOffer({
        code: data.code,
        discount: data.discount,
        description: data.description || 'Offer Applied',
      });
      setOfferError(null);
    },
    onError: (err: any) => {
      setAppliedOffer(null);
      setOfferError(err?.response?.data?.message || 'Invalid or expired offer code');
    },
  });

  // Start Session Mutation
  const startSessionMutation = useMutation({
    mutationFn: async (payload: any) => {
      setFormError(null);
      return (await api.post('/games/sessions', payload)).data;
    },
    onSuccess: (data) => {
      setSuccessData(data);
      queryClient.invalidateQueries({ queryKey: ['gamesActiveSessions'] });
      queryClient.invalidateQueries({ queryKey: ['gamesDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['gamesCustomers'] });

      // Automatically reset form after 3.5 seconds
      setTimeout(() => {
        handleResetCustomer();
        setSuccessData(null);
      }, 3500);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Failed to start session. Please verify details.');
    },
  });

  // Checkout / Close Active Session Mutation
  const checkoutSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return (await api.put(`/games/sessions/${sessionId}/close`, {})).data;
    },
    onMutate: async (sessionId: string) => {
      setCheckingOutId(sessionId);
    },
    onSuccess: (closedSession, sessionId) => {
      setCheckingOutId(null);
      setCheckoutSuccessMsg(
        `Session for ${closedSession.customer?.name || 'Customer'} successfully checked out and closed.`
      );
      // Immediately remove closed session card from active list
      queryClient.setQueryData(['gamesActiveSessions'], (old: any[]) =>
        old ? old.filter((s) => s.id !== sessionId) : []
      );
      queryClient.invalidateQueries({ queryKey: ['gamesActiveSessions'] });
      queryClient.invalidateQueries({ queryKey: ['gamesCompletedSessions'] });
      queryClient.invalidateQueries({ queryKey: ['gamesDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });

      setTimeout(() => {
        setCheckoutSuccessMsg(null);
      }, 4000);
    },
    onError: (err: any) => {
      setCheckingOutId(null);
      setFormError(err?.response?.data?.message || 'Failed to checkout session.');
    },
  });

  // Financial Calculations
  const adultRatePer30 = 200;
  const childRatePer30 = 100;
  const durationMultiplier = useMemo(() => selectedDuration / 30, [selectedDuration]);

  const adultAmount = useMemo(() => {
    if (selectedZone !== 'TRAMPOLINE') return 0;
    return Math.round(adultCount * adultRatePer30 * durationMultiplier);
  }, [selectedZone, adultCount, durationMultiplier]);

  const childAmount = useMemo(() => {
    if (selectedZone !== 'TRAMPOLINE') return 0;
    return Math.round(childCount * childRatePer30 * durationMultiplier);
  }, [selectedZone, childCount, durationMultiplier]);

  // Subtotal (ZERO GST)
  const subtotal = useMemo(() => {
    let base = 0;
    if (selectedZone === 'TRAMPOLINE') {
      base = adultAmount + childAmount;
    } else {
      base = Object.entries(coinQuantities).reduce((sum, [id, qty]) => {
        const pkg = COIN_PACKAGES.find((p) => p.id === id);
        return sum + (pkg ? pkg.price * qty : 0);
      }, 0);
    }
    return base + socksAmount;
  }, [selectedZone, adultAmount, childAmount, coinQuantities, socksAmount]);

  const discountAmount = useMemo(() => {
    if (selectedZone !== 'TRAMPOLINE' || !appliedOffer) return 0;
    return appliedOffer.discount;
  }, [selectedZone, appliedOffer]);

  const finalAmount = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

  // Keep split defaults synced when final amount or payment method changes
  useEffect(() => {
    if (paymentMethod === 'CASH_AND_UPI') {
      if (cashSplitAmount + upiSplitAmount !== finalAmount) {
        setCashSplitAmount(finalAmount);
        setUpiSplitAmount(0);
      }
    }
  }, [finalAmount, paymentMethod]);

  // =========================================================
  // HANDLERS
  // =========================================================

  const handleCheckCustomer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = mobileNumber.trim();
    if (!/^\d{10}$/.test(clean)) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setFormError(null);
    searchCustomerMutation.mutate(clean);
  };

  const handleResetCustomer = () => {
    setIsExistingCustomer(false);
    setExistingCustomerId(null);
    setCustomerCode(null);
    setHasSearched(false);
    setMobileNumber('');
    setCustomerName('');
    setEmail('');
    setParentName('');
    setChildName('');
    setFormError(null);
    setNotes('');
    setAppliedOffer(null);
    setOfferInput('');
    setOfferError(null);
    setSocksCount(0);
    if (selectedZone === 'TRAMPOLINE') {
      setAdultCount(1);
      setChildCount(0);
      setSelectedDuration(30);
      setCoinQuantities({ 'coin-1': 0, 'coin-4': 0, 'coin-10': 0 });
    } else {
      setCoinQuantities({ 'coin-1': 0, 'coin-4': 1, 'coin-10': 0 });
    }
  };

  const handleApplyOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerInput.trim()) return;
    if (subtotal <= 0) {
      setOfferError('Add session items before applying an offer.');
      return;
    }
    validateOfferMutation.mutate({
      code: offerInput.trim(),
      amount: subtotal,
    });
  };

  const handleRemoveOffer = () => {
    setAppliedOffer(null);
    setOfferInput('');
    setOfferError(null);
  };

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanMobile = mobileNumber.trim();
    if (!cleanMobile || cleanMobile.length !== 10) {
      setFormError('Please enter a valid 10-digit Customer Mobile Number.');
      return;
    }

    if (!customerName.trim()) {
      setFormError('Customer Name is required.');
      return;
    }

    if (selectedZone === 'TRAMPOLINE' && adultCount === 0 && childCount === 0) {
      setFormError('At least 1 adult or 1 child player is required for Trampoline.');
      return;
    }

    if (selectedZone === 'COIN_GAMES' && totalCoinPackageCount === 0) {
      setFormError('Please select at least 1 coin package.');
      return;
    }

    // Split Payment Validation
    if (paymentMethod === 'CASH_AND_UPI') {
      const splitSum = Math.round((cashSplitAmount + upiSplitAmount) * 100) / 100;
      if (Math.abs(splitSum - finalAmount) > 0.01) {
        setFormError(`Cash (₹${cashSplitAmount}) + UPI (₹${upiSplitAmount}) must equal Total ₹${finalAmount}`);
        return;
      }
    }

    const payload: any = {
      customerId: existingCustomerId || undefined,
      customerMobile: cleanMobile,
      customerName: customerName.trim(),
      customerEmail: email.trim() || undefined,
      customerParentName: parentName.trim() || undefined,
      customerChildName: childName.trim() || undefined,
      gameId: resolvedGame?.id || undefined,
      zone: selectedZone,
      offerCode: selectedZone === 'TRAMPOLINE' && appliedOffer ? appliedOffer.code : undefined,
      paymentMethod,
      cashAmount: paymentMethod === 'CASH_AND_UPI' ? cashSplitAmount : paymentMethod === 'CASH' ? finalAmount : 0,
      upiAmount: paymentMethod === 'CASH_AND_UPI' ? upiSplitAmount : paymentMethod === 'UPI' ? finalAmount : 0,
      amountPaid: finalAmount,
      notes: notes.trim() || undefined,
      socksCount,
      socksPrice: socksRate,
    };

    if (selectedZone === 'TRAMPOLINE') {
      payload.adultCount = adultCount;
      payload.childCount = childCount;
      payload.guestCount = adultCount + childCount;
      payload.duration = selectedDuration;
    } else {
      payload.coinQuantities = coinQuantities;
      const activeEntry = Object.entries(coinQuantities).find(([_, q]) => q > 0);
      payload.coinPackageId = activeEntry ? activeEntry[0] : 'coin-4';
      payload.duration = 0;
      payload.adultCount = 0;
      payload.childCount = 0;
      payload.guestCount = totalCoinPackageCount || 1;
    }

    startSessionMutation.mutate(payload);
  };

  const splitMismatch = useMemo(() => {
    if (paymentMethod !== 'CASH_AND_UPI') return false;
    const splitSum = Math.round((cashSplitAmount + upiSplitAmount) * 100) / 100;
    return Math.abs(splitSum - finalAmount) > 0.01;
  }, [paymentMethod, cashSplitAmount, upiSplitAmount, finalAmount]);

  const formattedDate = currentTime
    ? currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : '02 OCT 2026';

  const formattedTime = currentTime
    ? currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '11:03 AM';

  return (
    <div className="space-y-6 text-slate-700 font-sans pb-12">
      {/* 1. Page Header with Live POS Clock */}
      <PageHeader
        title="Game Session POS"
        description="Fast single-page check-in, customer auto-fill, and live session dispatch."
        icon={<Play className="h-5 w-5" />}
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/games/sessions')}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-bold transition-all shadow-xxs cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Directory</span>
            </button>

            <div className="text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-xxs">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{formattedDate}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">{formattedTime}</span>
            </div>
          </div>
        }
      />

      {/* Success Notification Banner */}
      {successData && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-emerald-900 block">Session Started Successfully!</span>
              <p className="text-xs text-emerald-700 font-medium">
                Session #{successData.sessionId || successData.id?.slice(0, 6)} active for {successData.customer?.name} • Paid ₹{Number(successData.grandTotal || finalAmount).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSuccessData(null);
              handleResetCustomer();
            }}
            className="px-4 py-2 bg-[#009966] hover:bg-[#008055] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-all active-press"
          >
            New Session
          </button>
        </div>
      )}

      {/* Form Error Banner */}
      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="font-semibold text-xs leading-relaxed">{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-rose-400 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Workflow Form */}
      <form onSubmit={handleStartSession} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Main Form Steps */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* SECTION 1: CUSTOMER DISCOVERY */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-50 text-[#D94949] font-black text-xxs flex items-center justify-center border border-rose-100">
                  01
                </span>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Customer Discovery
                </span>
              </div>
              {hasSearched && (
                <button
                  type="button"
                  onClick={handleResetCustomer}
                  className="text-xxs font-bold text-[#D94949] hover:text-[#C53B3B] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Change Customer</span>
                </button>
              )}
            </div>

            {/* Mobile Lookup Search Bar */}
            <div className="space-y-1.5">
              <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider block">
                Customer Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 focus-within:bg-white focus-within:border-[#D94949] focus-within:ring-2 focus-within:ring-[#D94949]/15 transition-all">
                  <Search className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={mobileNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setMobileNumber(val);
                      if (val.length === 10) {
                        searchCustomerMutation.mutate(val);
                      } else {
                        setHasSearched(false);
                      }
                    }}
                    className="bg-transparent text-xs text-slate-900 outline-none w-full font-semibold placeholder-slate-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleCheckCustomer()}
                  disabled={searchCustomerMutation.isPending || mobileNumber.length !== 10}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 min-w-[140px] shadow-xs cursor-pointer active-press"
                >
                  {searchCustomerMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5" />
                      <span>Search</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Existing Customer Profile Card */}
            {hasSearched && isExistingCustomer && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs text-slate-800 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xxs font-bold text-[#009966]">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-[#009966]" />
                    <span>Verified Customer Found</span>
                  </span>
                  <span className="font-mono bg-white text-[#009966] border border-emerald-200 px-2.5 py-0.5 rounded-lg shadow-xxs">
                    {customerCode || 'ID: CUST-ACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xxs border-t border-emerald-100">
                  <div>
                    <span className="text-slate-400 block font-medium">Customer Name</span>
                    <span className="font-bold text-slate-900 text-xs">{customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Mobile Number</span>
                    <span className="font-semibold text-slate-800 font-mono">{mobileNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Email</span>
                    <span className="font-semibold text-slate-800 truncate block">{email || '—'}</span>
                  </div>
                  {parentName && (
                    <div>
                      <span className="text-slate-400 block font-medium">Parent Name</span>
                      <span className="font-semibold text-slate-800">{parentName}</span>
                    </div>
                  )}
                  {childName && (
                    <div>
                      <span className="text-slate-400 block font-medium">Child Name</span>
                      <span className="font-semibold text-slate-800">{childName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* New Customer Inline Fields */}
            {hasSearched && !isExistingCustomer && (
              <div className="space-y-3 pt-1 animate-fade-in">
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xxs text-amber-900 flex items-center gap-2 font-medium">
                  <UserPlus className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Customer not found. Please fill in registration details below to auto-create profile.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xxs font-bold text-slate-600 uppercase block mb-1">
                      Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#D94949] transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xxs font-bold text-slate-600 uppercase block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com (optional)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#D94949] transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xxs font-bold text-slate-600 uppercase block mb-1">Parent Name</label>
                    <input
                      type="text"
                      placeholder="Parent Name (optional)"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#D94949] transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xxs font-bold text-slate-600 uppercase block mb-1">Child Name</label>
                    <input
                      type="text"
                      placeholder="Child Name (optional)"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#D94949] transition-all"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: GAME ZONE & ADMISSION CONFIG */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-50 text-[#D94949] font-black text-xxs flex items-center justify-center border border-rose-100">
                  02
                </span>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Game Zone & Admission
                </span>
              </div>
            </div>

            {/* Segmented Zone Selector (TRAMPOLINE vs COIN GAMES) */}
            <div className="space-y-2">
              <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider block">
                Select Game Zone
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectZone('TRAMPOLINE')}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    selectedZone === 'TRAMPOLINE'
                      ? 'bg-[#D94949] text-white border-[#D94949] shadow-xs ring-2 ring-[#D94949]/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>TRAMPOLINE (DEFAULT)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectZone('COIN_GAMES')}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    selectedZone === 'COIN_GAMES'
                      ? 'bg-[#D94949] text-white border-[#D94949] shadow-xs ring-2 ring-[#D94949]/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Coins className="h-4 w-4" />
                  <span>COIN GAMES</span>
                </button>
              </div>
            </div>

            {/* TRAMPOLINE CONTROLS */}
            {selectedZone === 'TRAMPOLINE' && (
              <div className="space-y-4 pt-2 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Adults Stepper */}
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Adults</span>
                      <span className="text-xxs text-slate-500 font-medium font-mono">₹200 per 30 min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease adults"
                        onClick={() => setAdultCount((prev) => Math.max(0, prev - 1))}
                        className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-all shadow-xxs cursor-pointer active-press"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center font-black text-sm text-slate-900 font-mono tabular-nums">{adultCount}</span>
                      <button
                        type="button"
                        aria-label="Increase adults"
                        onClick={() => setAdultCount((prev) => prev + 1)}
                        className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-all shadow-xxs cursor-pointer active-press"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Children Stepper */}
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Children</span>
                      <span className="text-xxs text-slate-500 font-medium font-mono">₹100 per 30 min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease children"
                        onClick={() => setChildCount((prev) => Math.max(0, prev - 1))}
                        className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-all shadow-xxs cursor-pointer active-press"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center font-black text-sm text-slate-900 font-mono tabular-nums">{childCount}</span>
                      <button
                        type="button"
                        aria-label="Increase children"
                        onClick={() => setChildCount((prev) => prev + 1)}
                        className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-all shadow-xxs cursor-pointer active-press"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Duration Pills */}
                <div className="space-y-1.5">
                  <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider block">
                    Session Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 60, 90, 120].map((dur) => {
                      const isSelected = selectedDuration === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setSelectedDuration(dur)}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
                          }`}
                        >
                          {dur} MIN
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* COIN GAMES CONTROLS */}
            {selectedZone === 'COIN_GAMES' && (
              <div className="space-y-3 pt-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider block">
                    Coin Packages (Click card to add)
                  </label>
                  {totalSelectedCoins > 0 && (
                    <span className="text-xxs font-bold text-[#009966] bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      <span>{totalSelectedCoins} Tokens Selected</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {COIN_PACKAGES.map((pkg) => {
                    const qty = coinQuantities[pkg.id] || 0;
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={pkg.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-rose-50/40 border-[#D94949] shadow-xs ring-2 ring-[#D94949]/15'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          onClick={() => handleIncrementCoin(pkg.id)}
                          className="cursor-pointer space-y-1 select-none"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-black uppercase tracking-wide ${isSelected ? 'text-[#D94949]' : 'text-slate-800'}`}>
                              {pkg.name}
                            </span>
                            {isSelected && (
                              <span className="text-xxs font-black bg-[#D94949] text-white px-2 py-0.5 rounded-md shadow-xxs">
                                ×{qty}
                              </span>
                            )}
                          </div>
                          <span className="text-xxs text-slate-400 font-medium block">
                            {pkg.description}
                          </span>
                          <div className={`text-base font-black font-mono pt-1 ${isSelected ? 'text-[#D94949]' : 'text-slate-900'}`}>
                            ₹{pkg.price}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            aria-label={`Decrease ${pkg.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDecrementCoin(pkg.id);
                            }}
                            disabled={qty === 0}
                            className="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold transition-all cursor-pointer shadow-xxs active-press"
                          >
                            <Minus className="h-3 w-3" />
                          </button>

                          <span className="font-bold text-xs text-slate-900 w-8 text-center font-mono tabular-nums">
                            {qty}
                          </span>

                          <button
                            type="button"
                            aria-label={`Increase ${pkg.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIncrementCoin(pkg.id);
                            }}
                            className="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-[#D94949]/30 hover:text-[#D94949] flex items-center justify-center text-slate-700 font-bold transition-all cursor-pointer shadow-xxs active-press"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OPTIONAL GRIP SOCKS (₹70 / PAIR) */}
            <div className="pt-2 border-t border-slate-100">
              <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                socksCount > 0
                  ? 'bg-rose-50/40 border-[#D94949] shadow-xs ring-2 ring-[#D94949]/15'
                  : 'bg-slate-50/80 hover:bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 transition-colors ${
                    socksCount > 0
                      ? 'bg-rose-50 text-[#D94949] border border-rose-200'
                      : 'bg-white text-slate-400 border border-slate-200'
                  }`}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Grip Socks (Optional)
                      </span>
                      <span className="text-xxs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                        ₹70 / pair
                      </span>
                      {socksCount > 0 && (
                        <span className="text-[10px] font-bold bg-[#D94949] text-white px-2 py-0.5 rounded-md shadow-xxs font-mono">
                          {socksCount} pair{socksCount > 1 ? 's' : ''} added
                        </span>
                      )}
                    </div>
                    <p className="text-xxs text-slate-400 font-medium mt-0.5">
                      Anti-slip safety socks for trampoline jumpers and guests
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {socksCount > 0 && (
                    <span className="text-xs font-black text-[#D94949] font-mono tabular-nums">
                      +₹{socksAmount}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Decrease socks"
                      onClick={() => setSocksCount((prev) => Math.max(0, prev - 1))}
                      disabled={socksCount === 0}
                      className="h-8 w-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold transition-all shadow-xxs cursor-pointer active-press"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center font-black text-sm text-slate-900 font-mono tabular-nums">
                      {socksCount}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase socks"
                      onClick={() => setSocksCount((prev) => prev + 1)}
                      className="h-8 w-8 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-[#D94949]/30 hover:text-[#D94949] flex items-center justify-center text-slate-700 font-bold transition-all shadow-xxs cursor-pointer active-press"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: PROMO OFFER (Trampoline Only) */}
          {selectedZone === 'TRAMPOLINE' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="w-6 h-6 rounded-lg bg-rose-50 text-[#D94949] font-black text-xxs flex items-center justify-center border border-rose-100">
                  03
                </span>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Promo Offer Code (Optional)
                </span>
              </div>

              {appliedOffer ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-[#009966]">
                    <Tag className="h-4 w-4 text-[#009966]" />
                    <span>{appliedOffer.code} APPLIED</span>
                    <span className="font-semibold text-emerald-700 text-xxs">(-₹{appliedOffer.discount} OFF)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveOffer}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    title="Remove Offer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter promo coupon code..."
                    value={offerInput}
                    onChange={(e) => {
                      setOfferInput(e.target.value.toUpperCase());
                      setOfferError(null);
                    }}
                    className="flex-1 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold uppercase text-slate-900 outline-none focus:bg-white focus:border-[#D94949] transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleApplyOffer}
                    disabled={validateOfferMutation.isPending || !offerInput.trim()}
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xxs"
                  >
                    {validateOfferMutation.isPending ? 'Validating...' : 'Apply Offer'}
                  </button>
                </div>
              )}

              {offerError && <p className="text-xxs text-rose-600 font-semibold">{offerError}</p>}
            </div>
          )}

          {/* SECTION 4: PAYMENT COLLECTION */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-lg bg-rose-50 text-[#D94949] font-black text-xxs flex items-center justify-center border border-rose-100">
                {selectedZone === 'TRAMPOLINE' ? '04' : '03'}
              </span>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Payment Collection (Zero GST)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>CASH</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  paymentMethod === 'UPI'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="h-4 w-4" />
                <span>UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH_AND_UPI')}
                className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  paymentMethod === 'CASH_AND_UPI'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>CASH + UPI</span>
              </button>
            </div>

            {/* Split Breakdown Input */}
            {paymentMethod === 'CASH_AND_UPI' && (
              <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xxs font-bold">
                  <span className="text-slate-600 uppercase tracking-wider">Split Payment Breakdown</span>
                  <span className={splitMismatch ? 'text-rose-600 flex items-center gap-1 font-semibold' : 'text-[#009966] flex items-center gap-1 font-semibold'}>
                    {splitMismatch ? (
                      <>
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Mismatch: ₹{cashSplitAmount + upiSplitAmount} / ₹{finalAmount}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Exact Match ₹{finalAmount}</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xxs font-bold text-slate-500 uppercase block mb-1">Cash Portion (₹)</label>
                    <input
                      type="number"
                      min="0"
                      max={finalAmount}
                      value={cashSplitAmount}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setCashSplitAmount(val);
                        setUpiSplitAmount(Math.max(0, finalAmount - val));
                      }}
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#D94949] font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xxs font-bold text-slate-500 uppercase block mb-1">UPI Portion (₹)</label>
                    <input
                      type="number"
                      min="0"
                      max={finalAmount}
                      value={upiSplitAmount}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setUpiSplitAmount(val);
                        setCashSplitAmount(Math.max(0, finalAmount - val));
                      }}
                      className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#D94949] font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SESSION SUMMARY & LIVE ACTIVE SESSIONS */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5 sticky top-6">
          {/* 1. ORDER SUMMARY CARD */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Session Summary
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                NO GST
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Zone Selected</span>
                <span className="font-bold text-slate-900">
                  {selectedZone === 'TRAMPOLINE' ? 'Trampoline Zone' : 'Coin Games Zone'}
                </span>
              </div>

              {selectedZone === 'TRAMPOLINE' && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Adults ({adultCount} × ₹{adultRatePer30 * durationMultiplier})</span>
                    <span className="font-bold text-slate-900 font-mono">₹{adultAmount}</span>
                  </div>
                  {childCount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Children ({childCount} × ₹{childRatePer30 * durationMultiplier})</span>
                      <span className="font-bold text-slate-900 font-mono">₹{childAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Duration</span>
                    <span className="font-bold text-slate-900">{selectedDuration} min</span>
                  </div>
                </>
              )}

              {selectedZone === 'COIN_GAMES' && (
                <>
                  {Object.entries(coinQuantities)
                    .filter(([_, qty]) => qty > 0)
                    .map(([id, qty]) => {
                      const pkg = COIN_PACKAGES.find((p) => p.id === id);
                      if (!pkg) return null;
                      return (
                        <div key={id} className="flex justify-between text-slate-600">
                          <span>{pkg.name} ({qty} × ₹{pkg.price})</span>
                          <span className="font-bold text-slate-900 font-mono">₹{pkg.price * qty}</span>
                        </div>
                      );
                    })}
                  {totalCoinPackageCount === 0 && (
                    <div className="text-xxs text-amber-600 italic">
                      No coin packages selected
                    </div>
                  )}
                  {totalSelectedCoins > 0 && (
                    <div className="flex justify-between text-xxs font-medium text-slate-500 pt-1 border-t border-slate-100">
                      <span>Total Game Tokens</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1 font-mono">
                        <Coins className="h-3 w-3 text-amber-600" />
                        <span>{totalSelectedCoins} Coins</span>
                      </span>
                    </div>
                  )}
                </>
              )}

              {socksCount > 0 && (
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                  <span>Grip Socks ({socksCount} × ₹70)</span>
                  <span className="font-bold text-slate-900 font-mono">₹{socksAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900 font-mono">₹{subtotal}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-[#009966] font-bold">
                  <span>Offer Discount</span>
                  <span className="font-mono">-₹{discountAmount}</span>
                </div>
              )}
            </div>

            {/* Total Grand Price */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Total Payable</span>
                <span className="text-3xl font-black text-[#D94949] tracking-tight font-mono tabular-nums">
                  ₹{finalAmount}
                </span>
              </div>

              <div className="flex justify-between text-xxs text-slate-500 font-medium">
                <span>Payment Method</span>
                <span className="font-bold text-slate-800 uppercase">
                  {paymentMethod === 'CASH_AND_UPI' ? 'Cash + UPI Split' : paymentMethod}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={
                startSessionMutation.isPending ||
                splitMismatch ||
                !mobileNumber ||
                (selectedZone === 'TRAMPOLINE' && adultCount === 0 && childCount === 0) ||
                (selectedZone === 'COIN_GAMES' && totalCoinPackageCount === 0)
              }
              className="w-full py-3.5 bg-[#D94949] hover:bg-[#C53B3B] disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active-press"
            >
              {startSessionMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>STARTING SESSION...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>START SESSION</span>
                </>
              )}
            </button>
          </div>

          {/* 2. LIVE ACTIVE SESSIONS FEED */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#009966] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#009966]"></span>
                </span>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Active Sessions ({activeSessions?.length || 0})
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/games/sessions')}
                className="text-xxs font-bold text-[#D94949] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Checkout Notification Toast Banner */}
            {checkoutSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between animate-fade-in shadow-xxs">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-[#009966] shrink-0" />
                  <span>{checkoutSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutSuccessMsg(null)}
                  className="text-emerald-500 hover:text-emerald-800 p-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Active Sessions List */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {!activeSessions || activeSessions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                  <span>No active sessions running</span>
                </div>
              ) : (
                activeSessions.map((session: any) => {
                  const entryDate = new Date(session.entryTime);
                  const elapsedMins = currentTime
                    ? Math.max(1, Math.round((currentTime.getTime() - entryDate.getTime()) / 60000))
                    : 1;
                  const totalDuration = session.duration || session.pricing?.duration || 30;
                  const isOvertime = totalDuration > 0 && elapsedMins > totalDuration;
                  const isTrampoline = session.game?.name?.toLowerCase()?.includes('trampoline');
                  const isCheckingOut = checkingOutId === session.id;

                  return (
                    <div
                      key={session.id}
                      className="p-3.5 bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 rounded-2xl space-y-2.5 transition-all shadow-xxs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {session.customer?.name || 'Walk-in Guest'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {session.customer?.mobile}
                          </span>
                        </div>
                        <StatusBadge
                          status={isOvertime ? 'OVERTIME' : 'PLAYING'}
                          showDot
                          size="sm"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xxs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700 flex items-center gap-1">
                            {isTrampoline ? (
                              <Activity className="h-3 w-3 text-[#D94949]" />
                            ) : (
                              <Coins className="h-3 w-3 text-amber-600" />
                            )}
                            <span>{session.game?.name || (isTrampoline ? 'Trampoline' : 'Coin Game')}</span>
                          </span>
                          <span>• {session.guestCount || 1} guest{(session.guestCount || 1) > 1 ? 's' : ''}</span>
                        </div>
                        <span className="font-bold text-slate-900 text-xs font-mono tabular-nums">
                          ₹{Number(session.grandTotal || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>Started {new Date(session.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <span className={`font-black font-mono ${isOvertime ? 'text-rose-600' : 'text-[#009966]'}`}>
                          {elapsedMins}m {totalDuration > 0 ? `/ ${totalDuration}m` : ''}
                        </span>
                      </div>

                      {/* Checkout Action Button */}
                      <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Live Active
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            checkoutSessionMutation.mutate(session.id);
                          }}
                          disabled={isCheckingOut}
                          className="px-3.5 py-1.5 bg-[#009966] hover:bg-[#008055] disabled:opacity-50 text-white font-bold text-xxs rounded-xl transition-all flex items-center gap-1.5 shadow-xxs cursor-pointer active-press"
                        >
                          {isCheckingOut ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>Closing...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Checkout & Close</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
