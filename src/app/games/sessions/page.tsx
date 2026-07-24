'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Play,
  CheckCircle,
  Clock,
  DollarSign,
  Search,
  Eye,
  Info,
  Calendar,
  User,
  PlusCircle,
  FileText,
  AlertTriangle,
  MapPin,
  ClipboardList
} from 'lucide-react';

interface Session {
  id: string;
  sessionId: number;
  customerId: string;
  gameId: string;
  pricingId: string;
  guestCount: number;
  entryTime: string;
  exitTime: string | null;
  status: string;
  notes: string | null;
  originalPrice: number;
  discount: number;
  extraCharges: number;
  gst: number;
  grandTotal: number;
  overrideUser: string | null;
  overrideReason: string | null;
  customer: {
    name: string;
    mobile: string;
  };
  game: {
    name: string;
  };
  pricing: {
    name: string;
    duration: number;
    price: string;
  };
}

export default function GameSessions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  // Tab: 'active' or 'completed'
  const activeTab = searchParams.get('tab') === 'completed' ? 'completed' : 'active';
  const [searchTerm, setSearchTerm] = useState('');

  // Inspector & Checkout States
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Checkout inputs
  const [extraCharges, setExtraCharges] = useState(0);
  const [closingDiscount, setClosingDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Real-time ticking state for active duration updates
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // 1. Fetch Sessions
  const { data: activeSessions, isLoading: loadingActive } = useQuery<Session[]>({
    queryKey: ['gamesActiveSessions'],
    queryFn: async () => (await api.get('/games/sessions/active')).data,
  });

  const { data: completedSessions, isLoading: loadingCompleted } = useQuery<Session[]>({
    queryKey: ['gamesCompletedSessions'],
    queryFn: async () => (await api.get('/games/sessions/completed')).data,
  });

  // 2. Fetch Session Details
  const { data: sessionDetails, refetch: refetchDetails } = useQuery<any>({
    queryKey: ['gamesSessionDetails', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return null;
      return (await api.get(`/games/sessions/${selectedSessionId}`)).data;
    },
    enabled: !!selectedSessionId,
  });

  // Mutate Checkout
  const checkoutMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.put(`/games/sessions/${selectedSessionId}/close`, payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamesActiveSessions'] });
      queryClient.invalidateQueries({ queryKey: ['gamesCompletedSessions'] });
      queryClient.invalidateQueries({ queryKey: ['gamesDashboardStats'] });
      setIsCheckoutOpen(false);
      setSelectedSessionId(null);
    },
  });

  const handleTabChange = (tab: 'active' | 'completed') => {
    router.push(`/games/sessions?tab=${tab}`);
  };

  const getDurationString = (entryStr: string, exitStr: string | null) => {
    const entry = new Date(entryStr);
    const exit = exitStr ? new Date(exitStr) : now;
    const diffMins = Math.max(1, Math.round((exit.getTime() - entry.getTime()) / 1000 / 60));
    return `${diffMins} mins`;
  };

  const getOvertimeMinutes = (s: Session) => {
    const entry = new Date(s.entryTime);
    const exit = s.exitTime ? new Date(s.exitTime) : now;
    const elapsed = Math.max(1, Math.round((exit.getTime() - entry.getTime()) / 1000 / 60));
    const limit = s.pricing.duration;
    if (limit > 0 && elapsed > limit) {
      return elapsed - limit;
    }
    return 0;
  };

  const openCheckout = (s: Session) => {
    setSelectedSessionId(s.id);
    // calculate default overtime charges
    const overtime = getOvertimeMinutes(s);
    let defaultExtra = 0;
    if (overtime > 5 && s.pricing.duration > 0) {
      const baseRate = Number(s.pricing.price) / s.pricing.duration;
      defaultExtra = Math.round(baseRate * overtime);
    }
    
    setExtraCharges(defaultExtra);
    setClosingDiscount(0);
    
    // grandTotal estimate
    const subtotal = Number(s.originalPrice) - Number(s.discount) + defaultExtra;
    const gstRate = Math.round(subtotal * 0.18);
    const netTotal = subtotal + gstRate;
    
    // paid advance estimate
    const advancePaid = netTotal; // in typical setups, we assume advance. Let's load details properly
    setAmountPaid(0); // will be loaded in detail slider if needed
    setIsCheckoutOpen(true);
  };

  // Adjust calculator totals dynamically on state change
  const activeSessionTarget = activeSessions?.find((s) => s.id === selectedSessionId);
  const checkoutOriginalPrice = activeSessionTarget ? Number(activeSessionTarget.originalPrice) : 0;
  const checkoutPrevDiscount = activeSessionTarget ? Number(activeSessionTarget.discount) : 0;
  const checkoutSubtotal = Math.max(0, checkoutOriginalPrice - checkoutPrevDiscount - closingDiscount + extraCharges);
  const checkoutGst = Math.round(checkoutSubtotal * 0.18);
  const checkoutGrandTotal = checkoutSubtotal + checkoutGst;

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkoutMutation.mutate({
      extraCharges,
      discount: closingDiscount,
      amountPaid,
      paymentMethod,
    });
  };

  const currentList = activeTab === 'active' ? activeSessions : completedSessions;
  const filteredSessions = currentList?.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.sessionId.toString().includes(term) ||
      s.customer.name.toLowerCase().includes(term) ||
      s.customer.mobile.includes(term) ||
      s.game.name.toLowerCase().includes(term)
    );
  });

  const isLoading = activeTab === 'active' ? loadingActive : loadingCompleted;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-5.5 w-5.5 text-blue-600" />
            <span>Games Sessions Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit and track live active player sessions, print invoices, and checkout completed player sessions.
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-xs shrink-0 self-start md:self-auto">
          <button
            onClick={() => handleTabChange('active')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'active' ? 'bg-white text-blue-650 shadow-xs border border-slate-150' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Active Playtime</span>
          </button>
          <button
            onClick={() => handleTabChange('completed')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'completed' ? 'bg-white text-blue-655 shadow-xs border border-slate-150' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Completed Logs</span>
          </button>
        </div>
      </div>

      {/* Filter and search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by session #, customer name, mobile, game zone..."
          className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder-slate-400"
        />
      </div>

      {/* Table grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-455 font-bold uppercase tracking-wider text-xxs">
                  <th className="px-5 py-3.5">Session ID</th>
                  <th className="px-5 py-3.5">Customer details</th>
                  <th className="px-5 py-3.5">Game Zone</th>
                  <th className="px-5 py-3.5">Package</th>
                  <th className="px-5 py-3.5">Play Timings</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Net Total</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650">
                {filteredSessions?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-medium">
                      No matching sessions registered in this view.
                    </td>
                  </tr>
                ) : (
                  filteredSessions?.map((s) => {
                    const overtime = getOvertimeMinutes(s);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-bold text-slate-800">#{s.sessionId}</td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800">{s.customer.name}</div>
                          <div className="text-xxs text-slate-400">{s.customer.mobile}</div>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-700">{s.game.name}</td>
                        <td className="px-5 py-4">{s.pricing.name}</td>
                        <td className="px-5 py-4">
                          <div>In: {new Date(s.entryTime).toLocaleTimeString(undefined, { timeStyle: 'short' })}</div>
                          {s.exitTime && <div>Out: {new Date(s.exitTime).toLocaleTimeString(undefined, { timeStyle: 'short' })}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-700">{getDurationString(s.entryTime, s.exitTime)}</span>
                          {overtime > 0 && (
                            <span className="block text-[10px] text-amber-600 font-bold">({overtime}m overtime)</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-800">₹{Number(s.grandTotal).toLocaleString()}</td>
                        <td className="px-5 py-4 text-right space-x-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedSessionId(s.id);
                              setIsDetailsOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-slate-700 rounded transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {s.status === 'ACTIVE' && (
                            <button
                              onClick={() => openCheckout(s)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-650 hover:bg-blue-100 rounded border border-blue-100 font-bold text-xxs transition-colors"
                            >
                              Checkout
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Details Inspector Modal */}
      {isDetailsOpen && selectedSessionId && sessionDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Session Inspector #{sessionDetails.sessionId}
              </h4>
              <button
                onClick={() => {
                  setIsDetailsOpen(false);
                  setSelectedSessionId(null);
                }}
                className="text-slate-400 hover:text-slate-650 font-bold text-lg"
              >
                ×
              </button>
            </div>

            {/* Scrollable details contents */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
              {/* Customer information */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Guest Profile</div>
                  <div className="font-bold text-slate-850">{sessionDetails.customer.name}</div>
                  <div className="text-slate-450">{sessionDetails.customer.mobile}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Session Details</div>
                  <div className="font-semibold text-slate-700">Game: {sessionDetails.game.name}</div>
                  <div>Package: {sessionDetails.pricing.name}</div>
                </div>
              </div>

              {/* Timing specifications */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <div className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Timings</div>
                <div className="grid grid-cols-2 gap-2 text-slate-650">
                  <div>Check-in: {new Date(sessionDetails.entryTime).toLocaleString()}</div>
                  {sessionDetails.exitTime && <div>Checkout: {new Date(sessionDetails.exitTime).toLocaleString()}</div>}
                  <div>Total Duration: {getDurationString(sessionDetails.entryTime, sessionDetails.exitTime)}</div>
                </div>
              </div>

              {/* Calculations breakdown */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <div className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Charges Summary</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span>Base Pack Price:</span>
                    <span className="font-semibold">₹{sessionDetails.originalPrice.toLocaleString()}</span>
                  </div>
                  {sessionDetails.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount Overrides:</span>
                      <span>-₹{sessionDetails.discount.toLocaleString()}</span>
                    </div>
                  )}
                  {sessionDetails.extraCharges > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Overtime/Extra Charges:</span>
                      <span>+₹{sessionDetails.extraCharges.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>+₹{sessionDetails.gst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-150 pt-1.5">
                    <span>Net Grand Total:</span>
                    <span>₹{sessionDetails.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Manager Overrides Audit */}
              {sessionDetails.overrideUser && (
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                  <div className="font-bold text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Manager Override Audited</span>
                  </div>
                  <div className="text-xxs text-amber-955/75 leading-relaxed">
                    Override approved by <span className="font-bold">{sessionDetails.overrideUser}</span>.
                    <br />
                    Reason: <span className="italic">"{sessionDetails.overrideReason}"</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setIsDetailsOpen(false);
                  setSelectedSessionId(null);
                }}
                className="px-4 py-2 border border-slate-250 text-slate-650 hover:bg-slate-100 font-semibold text-xs rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Session Slider / Dialog */}
      {isCheckoutOpen && selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-bold text-slate-850 text-xxs uppercase tracking-wider">Close Game Session</h4>
              <button
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setSelectedSessionId(null);
                }}
                className="text-slate-400 hover:text-slate-650 font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
              {activeSessionTarget && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                  <div className="font-bold text-blue-900">{activeSessionTarget.customer.name}</div>
                  <div className="grid grid-cols-2 gap-2 text-xxs text-blue-955/75">
                    <div>Elapsed Playtime: <span className="font-bold text-slate-800">{getDurationString(activeSessionTarget.entryTime, null)}</span></div>
                    <div>Package Limit: <span className="font-semibold text-slate-700">{activeSessionTarget.pricing.duration}m</span></div>
                  </div>
                </div>
              )}

              {/* Overtime & discount inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Overtime Surcharges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={extraCharges}
                    onChange={(e) => setExtraCharges(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:border-blue-500 text-slate-850"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Checkout Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={closingDiscount}
                    onChange={(e) => setClosingDiscount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:border-blue-500 text-slate-850"
                  />
                </div>
              </div>

              {/* Calculator Summary panel */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-slate-550">
                  <span>Grand Total:</span>
                  <span className="font-bold text-slate-800">₹{checkoutGrandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-800 border-t border-slate-200 pt-2">
                  <span>Balance Due:</span>
                  <span className="text-blue-650">₹{checkoutGrandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Balance payment method */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Settlement Method</label>
                <select
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none focus:border-blue-500 text-slate-850"
                >
                  <option value="CASH">Cash Settlement</option>
                  <option value="UPI">UPI Digital Payment</option>
                  <option value="BANK_TRANSFER">Bank NetBanking</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Collected Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  placeholder="Amount collected"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:border-blue-500 text-slate-850"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={checkoutMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition-all"
                >
                  {checkoutMutation.isPending ? 'Processing...' : 'Complete Checkout'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setSelectedSessionId(null);
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
