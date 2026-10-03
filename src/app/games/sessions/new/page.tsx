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
  ArrowRight,
  Activity,
  ShoppingBag,
} from 'lucide-react';
import {
  PageHeader,
  StatusBadge,
} from '@/components/ui';

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
  description: string;
}

const COIN_PACKAGES: CoinPackage[] = [
  { id: 'coin-1', name: '1 Token', coins: 1, price: 40, description: 'Single game token' },
  { id: 'coin-4', name: '4 Tokens', coins: 4, price: 150, description: 'Popular mini pack' },
  { id: 'coin-10', name: '10 Tokens', coins: 10, price: 350, description: 'Value family pack' },
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

  // Mode Selection: TRAMPOLINE vs COIN GAMES
  const [selectedZone, setSelectedZone] = useState<ZoneType>('TRAMPOLINE');
  const [notes, setNotes] = useState('');

  // =========================================================
  // 1. SHARED CUSTOMER STATE
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
  // 2. TRAMPOLINE SESSION SPECIFIC STATE
  // =========================================================
  const [adultCount, setAdultCount] = useState<number>(1);
  const [childCount, setChildCount] = useState<number>(0);
  const [selectedDuration, setSelectedDuration] = useState<number>(30); // 30, 60, 90, 120
  const [socksCount, setSocksCount] = useState<number>(0);
  const socksRate = 70;
  const socksAmount = useMemo(() => socksCount * socksRate, [socksCount, socksRate]);

  // Trampoline Promo Offer State
  const [offerInput, setOfferInput] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<AppliedOffer | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  // =========================================================
  // 3. COIN GAME PRODUCT SALE SPECIFIC STATE
  // =========================================================
  const [coinQuantities, setCoinQuantities] = useState<Record<string, number>>({
    'coin-1': 0,
    'coin-4': 1,
    'coin-10': 0,
  });

  // =========================================================
  // 4. PAYMENT MODAL STATE
  // =========================================================
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CASH_AND_UPI'>('CASH');
  const [cashSplitAmount, setCashSplitAmount] = useState<number>(0);
  const [upiSplitAmount, setUpiSplitAmount] = useState<number>(0);

  // Status & Feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [coinSuccessData, setCoinSuccessData] = useState<any | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [checkoutSuccessMsg, setCheckoutSuccessMsg] = useState<string | null>(null);

  // =========================================================
  // QUERIES
  // =========================================================
  const { data: activeSessions } = useQuery<any[]>({
    queryKey: ['gamesActiveSessions'],
    queryFn: async () => (await api.get('/games/sessions/active')).data,
    refetchInterval: 5000,
  });

  // Sort Active Sessions: Oldest session first (entryTime ascending)
  const sortedActiveSessions = useMemo(() => {
    if (!activeSessions) return [];
    return [...activeSessions].sort(
      (a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime()
    );
  }, [activeSessions]);

  // Coin Game Helpers
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

  const coinTotalAmount = useMemo(() => {
    return Object.entries(coinQuantities).reduce((sum, [id, qty]) => {
      const pkg = COIN_PACKAGES.find((p) => p.id === id);
      return sum + (pkg ? pkg.price * qty : 0);
    }, 0);
  }, [coinQuantities]);

  // Handle Zone Switch
  const handleSelectZone = (zone: ZoneType) => {
    if (selectedZone === zone) return;
    setSelectedZone(zone);
    setFormError(null);
    setAppliedOffer(null);
    setOfferInput('');
    setOfferError(null);
    setIsPaymentModalOpen(false);

    if (zone === 'TRAMPOLINE') {
      setAdultCount(1);
      setChildCount(0);
      setSelectedDuration(30);
      setSocksCount(0);
    } else {
      setCoinQuantities({ 'coin-1': 0, 'coin-4': 1, 'coin-10': 0 });
    }
  };

  // =========================================================
  // FINANCIAL CALCULATIONS
  // =========================================================
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

  const trampolineSubtotal = useMemo(() => {
    return adultAmount + childAmount + socksAmount;
  }, [adultAmount, childAmount, socksAmount]);

  const discountAmount = useMemo(() => {
    if (selectedZone !== 'TRAMPOLINE' || !appliedOffer) return 0;
    return appliedOffer.discount;
  }, [selectedZone, appliedOffer]);

  const finalAmount = useMemo(() => {
    if (selectedZone === 'TRAMPOLINE') {
      return Math.max(0, trampolineSubtotal - discountAmount);
    }
    return coinTotalAmount;
  }, [selectedZone, trampolineSubtotal, discountAmount, coinTotalAmount]);

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
  // MUTATIONS
  // =========================================================

  // 1. Search Customer Mutation
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

  // 2. Validate Offer Mutation (Trampoline Only)
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

  // 3. Start Trampoline Session Mutation
  const startSessionMutation = useMutation({
    mutationFn: async (payload: any) => {
      setFormError(null);
      return (await api.post('/games/sessions', payload)).data;
    },
    onSuccess: (data) => {
      setIsPaymentModalOpen(false);
      setSuccessData(data);
      setCoinSuccessData(null);
      queryClient.invalidateQueries({ queryKey: ['gamesActiveSessions'] });
      queryClient.invalidateQueries({ queryKey: ['gamesDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['gamesCustomers'] });

      // Automatically reset form and close popup after 2.0 seconds
      setTimeout(() => {
        handleResetCustomer();
        setSuccessData(null);
      }, 2000);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Failed to start session. Please verify details.');
    },
  });

  // 4. Sell Coin Games Mutation (Dedicated Sale - NO SESSION CREATED)
  const sellCoinsMutation = useMutation({
    mutationFn: async (payload: any) => {
      setFormError(null);
      return (await api.post('/games/coin-sales', payload)).data;
    },
    onSuccess: (data) => {
      setIsPaymentModalOpen(false);
      setCoinSuccessData(data);
      setSuccessData(null);
      queryClient.invalidateQueries({ queryKey: ['gamesDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['gamesCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['gamesDayCloseStatus'] });

      // Automatically reset form and close popup after 2.0 seconds
      setTimeout(() => {
        handleResetCustomer();
        setCoinSuccessData(null);
      }, 2000);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Failed to complete coin sale. Please verify details.');
    },
  });

  // 5. Checkout / Close Active Trampoline Session Mutation
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

      setTimeout(() => {
        setCheckoutSuccessMsg(null);
      }, 4000);
    },
    onError: (err: any) => {
      setCheckingOutId(null);
      setFormError(err?.response?.data?.message || 'Failed to checkout session.');
    },
  });

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
    setIsPaymentModalOpen(false);
    if (selectedZone === 'TRAMPOLINE') {
      setAdultCount(1);
      setChildCount(0);
      setSelectedDuration(30);
    } else {
      setCoinQuantities({ 'coin-1': 0, 'coin-4': 1, 'coin-10': 0 });
    }
  };

  const handleApplyOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerInput.trim()) return;
    if (trampolineSubtotal <= 0) {
      setOfferError('Add session items before applying an offer.');
      return;
    }
    validateOfferMutation.mutate({
      code: offerInput.trim(),
      amount: trampolineSubtotal,
    });
  };

  const handleRemoveOffer = () => {
    setAppliedOffer(null);
    setOfferInput('');
    setOfferError(null);
  };

  // Open Payment Modal upon clicking Primary Action in Summary Card
  const handleOpenPaymentModal = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanMobile = mobileNumber.trim();

    if (selectedZone === 'TRAMPOLINE') {
      if (!cleanMobile || cleanMobile.length !== 10) {
        setFormError('Please enter a valid 10-digit Customer Mobile Number.');
        return;
      }

      if (!customerName.trim()) {
        setFormError('Customer Name is required for Trampoline session.');
        return;
      }

      if (adultCount === 0 && childCount === 0) {
        setFormError('At least 1 adult or 1 child player is required for Trampoline.');
        return;
      }
    } else {
      if (totalCoinPackageCount === 0 || coinTotalAmount <= 0) {
        setFormError('Please select at least 1 coin package.');
        return;
      }
    }

    // Set split default to current finalAmount
    setCashSplitAmount(finalAmount);
    setUpiSplitAmount(0);
    setIsPaymentModalOpen(true);
  };

  // Final Execution from within Payment Modal
  const handleConfirmPayment = () => {
    setFormError(null);
    const cleanMobile = mobileNumber.trim();

    // Split Payment Validation
    if (paymentMethod === 'CASH_AND_UPI') {
      const splitSum = Math.round((cashSplitAmount + upiSplitAmount) * 100) / 100;
      if (Math.abs(splitSum - finalAmount) > 0.01) {
        setFormError(`Cash (₹${cashSplitAmount}) + UPI (₹${upiSplitAmount}) must equal Total ₹${finalAmount}`);
        return;
      }
    }

    if (selectedZone === 'TRAMPOLINE') {
      const payload: any = {
        customerId: existingCustomerId || undefined,
        customerMobile: cleanMobile,
        customerName: customerName.trim(),
        customerEmail: email.trim() || undefined,
        customerParentName: parentName.trim() || undefined,
        customerChildName: childName.trim() || undefined,
        adultCount,
        childCount,
        guestCount: adultCount + childCount,
        duration: selectedDuration,
        offerCode: appliedOffer ? appliedOffer.code : undefined,
        paymentMethod,
        cashAmount: paymentMethod === 'CASH_AND_UPI' ? cashSplitAmount : paymentMethod === 'CASH' ? finalAmount : 0,
        upiAmount: paymentMethod === 'CASH_AND_UPI' ? upiSplitAmount : paymentMethod === 'UPI' ? finalAmount : 0,
        amountPaid: finalAmount,
        notes: notes.trim() || undefined,
        socksCount,
        socksPrice: socksRate,
      };

      startSessionMutation.mutate(payload);
    } else {
      const items = Object.entries(coinQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([pkgId, qty]) => ({ package: pkgId, quantity: qty }));

      const payload: any = {
        customerId: existingCustomerId || undefined,
        customerMobile: cleanMobile || undefined,
        customerName: customerName.trim() || undefined,
        customerEmail: email.trim() || undefined,
        items,
        paymentMethod,
        cashAmount: paymentMethod === 'CASH_AND_UPI' ? cashSplitAmount : paymentMethod === 'CASH' ? finalAmount : 0,
        upiAmount: paymentMethod === 'CASH_AND_UPI' ? upiSplitAmount : paymentMethod === 'UPI' ? finalAmount : 0,
        notes: notes.trim() || undefined,
      };

      sellCoinsMutation.mutate(payload);
    }
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

  const isPending = startSessionMutation.isPending || sellCoinsMutation.isPending;

  return (
    <div className="space-y-6 text-slate-700 font-sans pb-12">
      {/* 1. Page Header with Live POS Clock */}
      <PageHeader
        title="Gaming POS Terminal"
        description="Fast check-in for Trampoline Sessions and 1-Click Coin Game Sales."
        icon={<Activity className="h-5 w-5" />}
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

      {/* ========================================================= */}
      {/* CENTER POPUP MODAL WITH CHECK ANIMATION (AUTO-CLOSES IN 2s) */}
      {/* ========================================================= */}
      {(successData || coinSuccessData) && (
        <div 
          onClick={() => {
            setSuccessData(null);
            setCoinSuccessData(null);
            handleResetCustomer();
          }}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 space-y-4 animate-scale-up relative overflow-hidden"
          >
            {/* Top 2s Animated Countdown Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full"
                style={{
                  width: '100%',
                  animation: 'shrinkWidth 2s linear forwards',
                }}
              />
            </div>

            {/* Checkmark Animation with expanding ripples */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center mt-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
              <div className="relative w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
              </div>
            </div>

            {/* Text Details for Trampoline Session */}
            {successData && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#009966] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block">
                  TRAMPOLINE SESSION STARTED
                </span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Session #{successData.sessionId || successData.id?.slice(0, 6)}
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {successData.customer?.name} • {successData.guestCount || 1} Player{(successData.guestCount || 1) > 1 ? 's' : ''} • {successData.duration} Mins
                </p>
                <div className="pt-2">
                  <span className="text-2xl font-black font-mono text-[#D94949]">
                    ₹{Number(successData.grandTotal || finalAmount).toLocaleString()}
                  </span>
                  <span className="text-xxs text-slate-400 block font-medium mt-0.5">
                    Paid via {successData.paymentMethod || paymentMethod}
                  </span>
                </div>
              </div>
            )}

            {/* Text Details for Coin Sale */}
            {coinSuccessData && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#009966] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block">
                  COIN SALE COMPLETED
                </span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {coinSuccessData.totalTokens} Tokens Sold
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {coinSuccessData.customer?.name || 'Walk-in Guest'} • Sale #{coinSuccessData.saleId || coinSuccessData.id?.slice(0, 6)}
                </p>
                <div className="pt-2">
                  <span className="text-2xl font-black font-mono text-[#D94949]">
                    ₹{Number(coinSuccessData.totalAmount || finalAmount).toLocaleString()}
                  </span>
                  <span className="text-xxs text-slate-400 block font-medium mt-0.5">
                    Paid via {coinSuccessData.paymentMethod || paymentMethod}
                  </span>
                </div>
              </div>
            )}

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => {
                setSuccessData(null);
                setCoinSuccessData(null);
                handleResetCustomer();
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active-press"
            >
              Done (Auto-closing in 2s)
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* POPUP PAYMENT MODAL (CASH, UPI, CASH + UPI) */}
      {/* ========================================================= */}
      {isPaymentModalOpen && (
        <div 
          onClick={() => setIsPaymentModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-scale-up"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-sm font-black uppercase tracking-wider text-slate-900 block">
                  Payment Collection
                </span>
                <span className="text-xxs text-slate-400 font-medium">
                  Select payment mode to finalize admission
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Bill Summary Strip */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xxs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Payable
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {selectedZone === 'TRAMPOLINE' ? `${adultCount + childCount} Player(s) • ${selectedDuration} MIN` : `${totalSelectedCoins} Game Tokens`}
                </span>
              </div>
              <span className="text-3xl font-black font-mono text-[#D94949]">
                ₹{finalAmount}
              </span>
            </div>

            {/* 3 Big Payment Mode Selectors */}
            <div className="space-y-2">
              <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider block">
                Choose Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-3.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="h-5 w-5" />
                  <span>CASH</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`py-3.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    paymentMethod === 'UPI'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="h-5 w-5" />
                  <span>UPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH_AND_UPI')}
                  className={`py-3.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    paymentMethod === 'CASH_AND_UPI'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  <span>CASH + UPI</span>
                </button>
              </div>
            </div>

            {/* Split Breakdown Details */}
            {paymentMethod === 'CASH_AND_UPI' && (
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between text-xxs font-bold">
                  <span className="text-slate-600 uppercase">Split Breakdown</span>
                  <span className={splitMismatch ? 'text-rose-600' : 'text-[#009966]'}>
                    {splitMismatch ? `Mismatch: ₹${cashSplitAmount + upiSplitAmount} / ₹${finalAmount}` : `Exact Match ₹${finalAmount}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cash Portion (₹)</label>
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">UPI Portion (₹)</label>
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

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isPending || splitMismatch}
                className="flex-1 py-3.5 bg-[#D94949] hover:bg-[#C53B3B] disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active-press uppercase tracking-wider"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>PROCESSING...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>CONFIRM & PAY ₹{finalAmount}</span>
                  </>
                )}
              </button>
            </div>
          </div>
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
      <form onSubmit={handleOpenPaymentModal} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Clean 2-Step Form */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* SECTION: ZONE SWITCHER (TRAMPOLINE vs COIN GAMES) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xxs font-bold text-slate-500 uppercase tracking-wider block">
                Select Transaction Mode
              </span>
              <span className="text-xxs font-semibold text-slate-400">
                {selectedZone === 'TRAMPOLINE' ? 'Timed Session Admission' : 'Product / Token Purchase'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectZone('TRAMPOLINE')}
                className={`py-3.5 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  selectedZone === 'TRAMPOLINE'
                    ? 'bg-[#D94949] text-white border-[#D94949] shadow-xs ring-2 ring-[#D94949]/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Activity className="h-4 w-4" />
                <span>TRAMPOLINE</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectZone('COIN_GAMES')}
                className={`py-3.5 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
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

          {/* ========================================================================= */}
          {/* MODE A: TRAMPOLINE SESSION WORKFLOW (CLEAN 2 STEPS) */}
          {/* ========================================================================= */}
          {selectedZone === 'TRAMPOLINE' && (
            <div className="space-y-5 animate-fade-in">
              {/* STEP 01: CUSTOMER DISCOVERY */}
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
                        className="bg-transparent text-xs text-slate-900 outline-none w-full font-semibold placeholder-slate-400 font-mono"
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

              {/* STEP 02: TRAMPOLINE PLAYERS & DURATION */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-50 text-[#D94949] font-black text-xxs flex items-center justify-center border border-rose-100">
                      02
                    </span>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Trampoline Players & Duration
                    </span>
                  </div>
                </div>

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

                {/* Optional Grip Socks */}
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
                          Anti-slip safety socks for trampoline jumpers
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
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE B: COIN GAMES (CLEAN 2 STEPS) */}
          {/* ========================================================================= */}
          {selectedZone === 'COIN_GAMES' && (
            <div className="space-y-5 animate-fade-in">
              {/* STEP 01: CUSTOMER (OPTIONAL / FAST WALK-IN) */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-50 text-[#D94949] font-black text-xxs flex items-center justify-center border border-rose-100">
                      01
                    </span>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Customer (Optional / Walk-in)
                    </span>
                  </div>
                  {hasSearched && (
                    <button
                      type="button"
                      onClick={handleResetCustomer}
                      className="text-xxs font-bold text-[#D94949] hover:text-[#C53B3B] hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Reset Customer</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider block">
                    Customer Mobile (Optional - Enter 10-digits to link)
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 focus-within:bg-white focus-within:border-[#D94949] focus-within:ring-2 focus-within:ring-[#D94949]/15 transition-all">
                      <Search className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="e.g. 9876543210 (Leave blank for generic Walk-in)"
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
                        className="bg-transparent text-xs text-slate-900 outline-none w-full font-semibold placeholder-slate-400 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {hasSearched && isExistingCustomer && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs text-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-[#009966]" />
                      <span className="font-bold text-slate-900">{customerName}</span>
                      <span className="text-slate-400 font-mono">({mobileNumber})</span>
                    </div>
                    <span className="text-xxs font-mono text-[#009966] bg-white border border-emerald-200 px-2 py-0.5 rounded">
                      {customerCode}
                    </span>
                  </div>
                )}

                {hasSearched && !isExistingCustomer && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Customer Name (optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none w-full"
                    />
                  </div>
                )}
              </div>

              {/* STEP 02: TOKEN PACKAGES */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-50 text-[#D94949] font-black text-xxs flex items-center justify-center border border-rose-100">
                      02
                    </span>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Select Token Packages
                    </span>
                  </div>
                  {totalSelectedCoins > 0 && (
                    <span className="text-xxs font-bold text-[#009966] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 font-mono">
                      <Coins className="h-3 w-3" />
                      <span>{totalSelectedCoins} TOKENS SELECTED</span>
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
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-rose-50/40 border-[#D94949] shadow-xxs ring-1 ring-[#D94949]/20'
                            : 'bg-slate-50/70 hover:bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        {/* Header: Name + Price */}
                        <div
                          onClick={() => handleIncrementCoin(pkg.id)}
                          className="flex items-center justify-between cursor-pointer select-none"
                        >
                          <div>
                            <span className={`text-xs font-black uppercase tracking-wide block ${isSelected ? 'text-[#D94949]' : 'text-slate-800'}`}>
                              {pkg.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {pkg.description}
                            </span>
                          </div>

                          <span className={`text-sm font-black font-mono ${isSelected ? 'text-[#D94949]' : 'text-slate-900'}`}>
                            ₹{pkg.price}
                          </span>
                        </div>

                        {/* Stepper Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                          <span className="text-xxs text-slate-500 font-bold uppercase">
                            Qty
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Decrease ${pkg.name}`}
                              onClick={() => handleDecrementCoin(pkg.id)}
                              disabled={qty === 0}
                              className="h-7 w-7 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center text-slate-700 font-bold transition-all cursor-pointer shadow-xxs active-press"
                            >
                              <Minus className="h-3 w-3" />
                            </button>

                            <span className="font-mono font-bold text-xs text-slate-900 w-6 text-center tabular-nums">
                              {qty}
                            </span>

                            <button
                              type="button"
                              aria-label={`Increase ${pkg.name}`}
                              onClick={() => handleIncrementCoin(pkg.id)}
                              className="h-7 w-7 rounded-lg bg-white border border-slate-200/80 hover:bg-rose-50 hover:border-[#D94949]/30 hover:text-[#D94949] flex items-center justify-center text-slate-700 font-bold transition-all cursor-pointer shadow-xxs active-press"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: SUMMARY & LIVE ACTIVE TRAMPOLINE SESSIONS */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5 sticky top-6">
          {/* 1. ORDER / SALE SUMMARY CARD */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {selectedZone === 'TRAMPOLINE' ? 'Session Summary' : 'Coin Sale Summary'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                NO GST
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Item Type</span>
                <span className="font-bold text-slate-900">
                  {selectedZone === 'TRAMPOLINE' ? 'Trampoline Zone Admission' : 'Coin Game Tokens'}
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
                    <span className="font-bold text-slate-900">{selectedDuration} MIN</span>
                  </div>
                  {socksCount > 0 && (
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                      <span>Grip Socks ({socksCount} × ₹70)</span>
                      <span className="font-bold text-slate-900 font-mono">₹{socksAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900 font-mono">₹{trampolineSubtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#009966] font-bold">
                      <span>Offer Discount</span>
                      <span className="font-mono">-₹{discountAmount}</span>
                    </div>
                  )}
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
                        <Coins className="h-3.5 w-3.5 text-amber-600" />
                        <span>{totalSelectedCoins} Coins</span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Promo Offer Code (Optional) Inside Session Summary */}
            {selectedZone === 'TRAMPOLINE' && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Promo Offer Code (Optional)
                </span>

                {appliedOffer ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[#009966]">
                      <Tag className="h-3.5 w-3.5 text-[#009966] shrink-0" />
                      <span className="text-xs">{appliedOffer.code}</span>
                      <span className="font-semibold text-emerald-700 text-[10px]">(-₹{appliedOffer.discount} OFF)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveOffer}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
                      title="Remove Offer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Enter coupon code..."
                      value={offerInput}
                      onChange={(e) => {
                        setOfferInput(e.target.value.toUpperCase());
                        setOfferError(null);
                      }}
                      className="flex-1 min-w-0 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-bold uppercase text-slate-900 outline-none focus:bg-white focus:border-[#D94949] transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleApplyOffer}
                      disabled={validateOfferMutation.isPending || !offerInput.trim()}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xxs shrink-0"
                    >
                      {validateOfferMutation.isPending ? '...' : 'Apply'}
                    </button>
                  </div>
                )}

                {offerError && <p className="text-[10px] text-rose-600 font-semibold">{offerError}</p>}
              </div>
            )}

            {/* Total Grand Price */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Total Payable</span>
                <span className="text-3xl font-black text-[#D94949] tracking-tight font-mono tabular-nums">
                  ₹{finalAmount}
                </span>
              </div>
            </div>

            {/* Primary Action Button -> OPENS PAYMENT MODAL */}
            <button
              type="submit"
              disabled={
                isPending ||
                (selectedZone === 'TRAMPOLINE' && (!mobileNumber || (adultCount === 0 && childCount === 0))) ||
                (selectedZone === 'COIN_GAMES' && totalCoinPackageCount === 0)
              }
              className="w-full py-4 bg-[#D94949] hover:bg-[#C53B3B] disabled:opacity-50 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer active-press uppercase tracking-wide"
            >
              {selectedZone === 'TRAMPOLINE' ? (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>PROCEED TO PAYMENT (₹{finalAmount})</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  <span>PROCEED TO SELL ({totalSelectedCoins} TOKENS — ₹{finalAmount})</span>
                </>
              )}
            </button>
          </div>

          {/* 2. LIVE ACTIVE TRAMPOLINE SESSIONS FEED (EXCLUSIVELY TRAMPOLINE) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#009966] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#009966]"></span>
                </span>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Active Trampoline Sessions ({activeSessions?.length || 0})
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

            {/* Active Sessions List (Oldest First) */}
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {sortedActiveSessions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Activity className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                  <span>No active trampoline jumpers right now</span>
                </div>
              ) : (
                sortedActiveSessions.map((session: any) => {
                  const entryTime = new Date(session.entryTime).getTime();
                  const now = currentTime ? currentTime.getTime() : new Date().getTime();
                  const totalElapsedSec = Math.max(0, Math.floor((now - entryTime) / 1000));
                  
                  const elapsedMin = Math.floor(totalElapsedSec / 60);
                  const elapsedSec = totalElapsedSec % 60;
                  
                  const totalDurationMin = session.duration || session.pricing?.duration || 30;
                  const purchasedSec = totalDurationMin * 60;
                  const isOvertime = totalDurationMin > 0 && totalElapsedSec > purchasedSec;
                  
                  const elapsedStr = `${String(elapsedMin).padStart(2, '0')}:${String(elapsedSec).padStart(2, '0')}`;
                  const purchasedStr = `${String(totalDurationMin).padStart(2, '0')}:00`;
                  const isCheckingOut = checkingOutId === session.id;

                  return (
                    <div
                      key={session.id}
                      className={`p-3 rounded-xl border transition-all shadow-xxs space-y-2.5 ${
                        isOvertime
                          ? 'bg-rose-50/60 border-rose-200 ring-1 ring-rose-300'
                          : 'bg-slate-50/70 hover:bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      {/* Top Row: Customer Name, Code & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {session.customer?.name || 'Walk-in Guest'}
                          </span>
                          <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded shrink-0">
                            {session.customer?.customerCode || `ID-${session.sessionId}`}
                          </span>
                        </div>

                        <StatusBadge
                          status={isOvertime ? 'OVERTIME' : 'PLAYING'}
                          showDot
                          size="sm"
                        />
                      </div>

                      {/* Bottom Row: Details, Prominent Timer & Checkout Button (Clean single alignment, no dividing line) */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xxs text-slate-600 font-bold">
                            {session.adultCount > 0 ? `${session.adultCount}A` : ''}
                            {session.adultCount > 0 && session.childCount > 0 ? ' + ' : ''}
                            {session.childCount > 0 ? `${session.childCount}C` : ''}
                            {!session.adultCount && !session.childCount ? `${session.guestCount || 1} Guest` : ''}
                            {' · '}{totalDurationMin}m
                          </div>
                          <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
                            ₹{Number(session.grandTotal || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* Prominent Live Timer Pill */}
                        <div
                          className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono shadow-xxs shrink-0 ${
                            isOvertime
                              ? 'bg-rose-50 border-rose-300 text-[#D94949] ring-1 ring-rose-300/50 animate-pulse'
                              : 'bg-emerald-50 border-emerald-200 text-[#009966]'
                          }`}
                        >
                          <Clock className={`h-4 w-4 ${isOvertime ? 'text-[#D94949]' : 'text-[#009966]'}`} />
                          <span className={`text-sm font-black tracking-tight tabular-nums ${isOvertime ? 'text-[#D94949]' : 'text-[#009966]'}`}>
                            {elapsedStr}
                          </span>
                          <span className={`text-xs font-bold ${isOvertime ? 'text-rose-400' : 'text-emerald-500'}`}>/{purchasedStr}</span>
                        </div>

                        {/* Checkout Button */}
                        <button
                          type="button"
                          onClick={() => checkoutSessionMutation.mutate(session.id)}
                          disabled={isCheckingOut}
                          className="px-2.5 py-1.5 bg-[#009966] hover:bg-[#008055] disabled:opacity-50 text-white font-bold text-xxs rounded-lg transition-all flex items-center gap-1 shadow-xxs cursor-pointer active-press uppercase shrink-0"
                        >
                          {isCheckingOut ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Checkout</span>
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
