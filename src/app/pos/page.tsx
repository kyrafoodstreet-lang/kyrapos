'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useCartStore, CartItem, OrderType } from '@/store/cartStore';
import { useShiftStore } from '@/store/shiftStore';
import api from '@/lib/api';
import axios from 'axios';
import {
  Search,
  ShoppingCart,
  Trash2,
  Tag,
  ArrowLeft,
  User,
  Coffee,
  CheckCircle,
  X,
  CreditCard,
  Phone,
  HelpCircle,
  Sparkles,
  ClipboardList,
  Plus
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Dish {
  id: string;
  name: string;
  price: string;
  taxRate: string;
  isAvailable: boolean;
  imageUrl: string | null;
  categoryId: string;
}

export default function PosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const activeShift = useShiftStore((state) => state.activeShift);

  const cart = useCartStore();

  // Local Filter UI States
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Dialog Visibility states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Discount Temporary inputs
  const [tempDiscount, setTempDiscount] = useState(0);
  const [tempDiscountType, setTempDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');

  // Checkout Payment states
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'MIXED'>('CASH');
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);
  const [paymentRef, setPaymentRef] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt printable data
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // Hydration guard
  const [mounted, setMounted] = useState(false);
  const [printAgentStatus, setPrintAgentStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const checkStatus = async () => {
      try {
        await axios.get('http://localhost:4000/health', { timeout: 1200 });
        setPrintAgentStatus('ONLINE');
      } catch (e) {
        setPrintAgentStatus('OFFLINE');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Auto-Print Handler with Local Print Agent integration
  useEffect(() => {
    if (receiptData) {
      const runPrint = async () => {
        try {
          const dateObj = new Date(receiptData.createdAt);
          const formattedDate = dateObj.toLocaleDateString();
          const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const receiptItems = receiptData.items.map((i: any) => ({
            name: i.dish?.name || 'Dish Item',
            quantity: i.quantity,
            price: Number(i.price),
            amount: Number(i.price) * i.quantity,
          }));

          // Group taxes by rate
          const taxGroups: Record<number, number> = {};
          receiptData.items.forEach((i: any) => {
            const rate = Number(i.taxRate || 0);
            const amt = (Number(i.price) * i.quantity) * (rate / 100);
            taxGroups[rate] = (taxGroups[rate] || 0) + amt;
          });

          const taxSummary: any[] = [];
          Object.entries(taxGroups).forEach(([rateStr, amount]) => {
            const rate = Number(rateStr);
            taxSummary.push({
              name: 'CGST',
              rate: rate / 2,
              amount: amount / 2,
            });
            taxSummary.push({
              name: 'SGST',
              rate: rate / 2,
              amount: amount / 2,
            });
          });

          // Fetch configs from local print agent to check if printing is enabled
          const configRes = await axios.get('http://localhost:4000/config', { timeout: 1500 });
          const printConfig = configRes.data;

          if (printConfig && !printConfig.autoPrintEnabled) {
            console.log('Auto-printing is disabled in print agent settings.');
            return;
          }

          const receiptPayload = {
            restaurantName: 'Kyra Cafe',
            restaurantAddress: '1st Cross Road, Bangalore',
            restaurantPhone: '9876543210',
            gstNumber: '29AAAAA1111A1Z1',
            billNumber: receiptData.orderNumber.toString(),
            date: formattedDate,
            time: formattedTime,
            tableNumber: receiptData.tableName || undefined,
            captainName: receiptData.cashier,
            cashierName: receiptData.cashier,
            orderType: receiptData.type,
            items: receiptItems,
            subtotal: Number(receiptData.subtotal),
            discount: Number(receiptData.discountTotal),
            taxSummary,
            grandTotal: Number(receiptData.grandTotal),
            paymentMethod: receiptData.paymentMethod,
            customerName: receiptData.customerName || undefined,
            customerPhone: receiptData.customerPhone || undefined,
            qrCodeUrl: `https://kyrapos.com/verify/${receiptData.orderNumber}`,
          };

          // A. Print Customer Copy
          await axios.post('http://localhost:4000/print/customer', receiptPayload, { timeout: 2000 });

          // B. Print Kitchen Copy (KOT)
          const kotPayload = {
            restaurantName: 'Kyra Cafe',
            orderNumber: receiptData.orderNumber.toString(),
            tableNumber: receiptData.tableName || 'Takeaway',
            captainName: receiptData.cashier,
            items: receiptData.items.map((i: any) => ({
              name: i.dish?.name || 'Dish Item',
              quantity: i.quantity,
              notes: i.notes || undefined,
            })),
            time: formattedTime,
          };
          await axios.post('http://localhost:4000/print/kot', kotPayload, { timeout: 2000 });

        } catch (err) {
          console.warn('Local print agent offline or failed. Falling back to browser printing.', err);
          const checkAndPrint = () => {
            const element = document.getElementById('print-receipt-section');
            if (element) {
              window.print();
            } else {
              setTimeout(checkAndPrint, 100);
            }
          };
          checkAndPrint();
        }
      };

      runPrint();
    }
  }, [receiptData]);

  // Search input ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Customer Search states
  const [isEditingName, setIsEditingName] = useState(false);
  const [searchMessage, setSearchMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);

  const handlePhoneChange = async (val: string) => {
    cart.setCustomerInfo(cart.customerName, val);
    if (val.length >= 5) {
      try {
        const res = await api.get(`/orders/customer/suggestions/${val}`);
        setSuggestions(res.data || []);
        setActiveSuggestionIndex(0);
        setShowSuggestionsDropdown(true);
      } catch (err) {
        console.error(err);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestionsDropdown(false);
    }
  };

  const handleSelectSuggestion = (s: any) => {
    cart.setCustomerInfo(s.customerName, s.customerPhone);
    setSuggestions([]);
    setShowSuggestionsDropdown(false);
    setIsEditingName(true);
    setSearchMessage({ type: 'success', text: `Saved: ${s.customerName}` });
  };

  const handleSearchCustomer = async () => {
    if (!cart.customerPhone) {
      setSearchMessage({ type: 'info', text: 'Enter phone number.' });
      return;
    }
    try {
      const res = await api.get(`/orders/customer/search/${cart.customerPhone}`);
      if (res.data && res.data.found) {
        cart.setCustomerInfo(res.data.customerName, cart.customerPhone);
        setIsEditingName(true);
        setSearchMessage({ type: 'success', text: `Saved: ${res.data.customerName}` });
      } else {
        cart.setCustomerInfo('', cart.customerPhone);
        setIsEditingName(true);
        setSearchMessage({ type: 'info', text: 'Not found. Enter name.' });
        setTimeout(() => {
          const el = document.getElementById('customer-name-input');
          if (el) el.focus();
        }, 100);
      }
    } catch (err) {
      console.error(err);
      cart.setCustomerInfo('', cart.customerPhone);
      setIsEditingName(true);
      setSearchMessage({ type: 'info', text: 'Not found. Enter name.' });
      setTimeout(() => {
        const el = document.getElementById('customer-name-input');
        if (el) el.focus();
      }, 100);
    }
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestionsDropdown && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestionsDropdown(false);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchCustomer();
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      setSearchMessage({ type: 'success', text: `Customer Name set: ${cart.customerName}` });
    }
  };

  // 1. Auth Guard Redirection
  useEffect(() => {
    if (mounted && !token) {
      router.replace('/login');
    }
  }, [token, router, mounted]);

  // 2. Fetch active categories, dishes, tables, held orders
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['activeCategories'],
    queryFn: async () => (await api.get('/categories/active')).data,
    enabled: !!token,
  });

  const { data: dishes = [] } = useQuery<Dish[]>({
    queryKey: ['availableDishes'],
    queryFn: async () => (await api.get('/dishes/available')).data,
    enabled: !!token,
  });



  const { data: heldOrders = [], refetch: refetchHeld } = useQuery<any[]>({
    queryKey: ['heldOrders'],
    queryFn: async () => (await api.get('/orders/held')).data,
    enabled: !!token,
  });

  // 3. Cart Calculations (Moved up to prevent conditional hooks order issues)
  const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const taxTotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity * (item.taxRate / 100)), 0);
  
  let discountTotal = 0;
  if (cart.discountType === 'FLAT') {
    discountTotal = cart.discount;
  } else {
    discountTotal = (subtotal + taxTotal) * (cart.discount / 100);
  }
  const grandTotal = Math.max(0, subtotal + taxTotal - discountTotal);

  // 4. Mutation to Save Held Orders (Moved up to prevent conditional hooks order issues)
  const holdMutation = useMutation({
    mutationFn: async () => {
      // Step A: Create order in database
      const orderRes = await api.post('/orders', {
        tableId: cart.tableId,
        type: cart.orderType,
        items: cart.items.map((i) => ({
          dishId: i.dishId,
          quantity: i.quantity,
          notes: i.notes,
        })),
        discountTotal,
        customerName: cart.customerName || 'Held Order',
        customerPhone: cart.customerPhone || '',
      });
      // Step B: Set isHeld to true on database order
      await api.post(`/orders/${orderRes.data.id}/hold`);
      return orderRes.data;
    },
    onSuccess: () => {
      cart.clearCart();
      queryClient.invalidateQueries({ queryKey: ['heldOrders'] });
      refetchHeld();
      alert('Order placed on Hold successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to hold order');
    }
  });

  // Keyboard Shortcuts Handler
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Focus Search: Press '/' key (unless already focusing an input/textarea)
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // 2. Direct Checkout Submit: Alt + C or F8
      if ((e.altKey && (e.key === 'c' || e.key === 'C')) || e.key === 'F8') {
        e.preventDefault();
        handleDirectCheckoutSubmit();
      }

      // 3. Open/Close Hold Order: Alt + H or F9
      if ((e.altKey && (e.key === 'h' || e.key === 'H')) || e.key === 'F9') {
        e.preventDefault();
        if (cart.items.length > 0) {
          holdMutation.mutate();
        }
      }

      // 4. Open/Close Resume Modal: Alt + R or F10
      if ((e.altKey && (e.key === 'r' || e.key === 'R')) || e.key === 'F10') {
        e.preventDefault();
        setShowHeldModal((prev) => !prev);
      }

      // 5. Open Discount Modal: Alt + D
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setShowDiscountModal((prev) => !prev);
      }

      // 6. Clear Cart: Alt + X
      if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        cart.clearCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mounted, cart, holdMutation, handleDirectCheckoutSubmit]);

  if (!mounted || !token || !user) return null;

  // Shift Block Check
  if (!activeShift) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-md space-y-6">
          <HelpCircle className="h-16 w-16 text-amber-500 mx-auto animate-bounce" />
          <h2 className="text-2xl font-black text-slate-800">Active Shift Required</h2>
          <p className="text-sm text-slate-500">
            You must start your cashier shift with opening cash before billing or modifying orders.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/dashboard" className="px-4 py-2 border rounded-lg hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-all">
              Go to Dashboard
            </Link>
            <Link href="/shifts" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-all active-press">
              Open Shift
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter Dishes
  const filteredDishes = dishes.filter((dish) => {
    const matchesCat = !selectedCatId || dish.categoryId === selectedCatId;
    const matchesSearch = dish.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddDish = (dish: Dish) => {
    cart.addItem({
      dishId: dish.id,
      name: dish.name,
      price: Number(dish.price),
      taxRate: Number(dish.taxRate),
      notes: ''
    });
  };

  const handleApplyDiscount = () => {
    cart.setDiscount(tempDiscount, tempDiscountType);
    setShowDiscountModal(false);
  };

  // 5. Mutation to Resume Held Order
  const resumeOrder = (order: any) => {
    cart.loadCart(order);
    setShowHeldModal(false);
    // Delete held order from hold list in database (by resuming, it goes back to active cashier cart)
    api.post(`/orders/${order.id}/resume`)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['heldOrders'] });
        refetchHeld();
      });
  };


  // Direct Checkout & Payment Handler
  async function handleDirectCheckoutSubmit() {
    if (cart.items.length === 0) return;
    setCheckoutError(null);
    setIsProcessing(true);

    // Validate Mixed payment split
    if (paymentMethod === 'MIXED') {
      const sum = cashAmount + cardAmount + upiAmount;
      if (Math.abs(sum - grandTotal) > 0.05) {
        const errMsg = `Mixed total (₹${sum.toFixed(2)}) must exactly equal Grand Total (₹${grandTotal.toFixed(2)})`;
        setCheckoutError(errMsg);
        setIsProcessing(false);
        alert(errMsg);
        return;
      }
    }

    try {
      // A. Post the order to DB
      const orderResponse = await api.post('/orders', {
        tableId: cart.tableId,
        type: cart.orderType,
        items: cart.items.map((i) => ({
          dishId: i.dishId,
          quantity: i.quantity,
          notes: i.notes,
        })),
        discountTotal,
        customerName: cart.customerName || null,
        customerPhone: cart.customerPhone || null,
      });

      const orderId = orderResponse.data.id;

      // B. Process Payment
      const paymentAmount = grandTotal;
      const paymentDetails = paymentMethod === 'MIXED' 
        ? { cashAmount, cardAmount, upiAmount, reference: paymentRef }
        : { reference: paymentRef };

      const paymentResponse = await api.post(`/orders/${orderId}/payment`, {
        amount: paymentAmount,
        method: paymentMethod,
        details: paymentDetails,
      });

      const completedOrder = paymentResponse.data;

      // C. Display receipt data for print
      setReceiptData({
        orderNumber: completedOrder.orderNumber,
        type: completedOrder.type,
        subtotal: completedOrder.subtotal,
        taxTotal: completedOrder.taxTotal,
        discountTotal: completedOrder.discountTotal,
        grandTotal: completedOrder.grandTotal,
        customerName: completedOrder.customerName,
        customerPhone: completedOrder.customerPhone,
        tableName: completedOrder.table?.number || null,
        createdAt: completedOrder.createdAt,
        items: completedOrder.items,
        cashier: completedOrder.cashier?.name || user?.name || 'Unknown',
        paymentMethod: paymentMethod,
      });

      cart.clearCart();
      setIsProcessing(false);
      // Reset payment values
      setCashAmount(0);
      setCardAmount(0);
      setUpiAmount(0);
      setPaymentRef('');

    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Checkout failed.';
      setCheckoutError(errMsg);
      alert(errMsg);
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* LEFT SECTION: Category Select & Item Cards */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-slate-50 rounded-lg text-slate-650 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <span className="font-semibold text-slate-800 text-base tracking-tight">Kyra Billing POS</span>
          </div>

          {/* Search */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search dishes... (Press / to focus)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:bg-white transition-all text-slate-850"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xxs font-semibold rounded-full border border-emerald-200">
              Shift Active
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <User className="h-4 w-4 text-slate-450" />
              <span className="font-medium">{user.name}</span>
            </div>
          </div>
        </header>

        {/* Categories Bar & Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Categories Sidebar */}
          <aside className="w-48 bg-white border-r border-slate-200 flex flex-col py-4 px-2 overflow-y-auto shrink-0 gap-1">
            <button
              onClick={() => setSelectedCatId(null)}
              className={`w-full text-left px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
                selectedCatId === null 
                  ? 'bg-primary-light text-slate-905 border border-primary/10 shadow-xxs' 
                  : 'text-slate-500 hover:bg-primary-light hover:text-slate-900'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`w-full text-left px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
                  selectedCatId === cat.id 
                    ? 'bg-primary-light text-slate-905 border border-primary/10 shadow-xxs' 
                    : 'text-slate-500 hover:bg-primary-light hover:text-slate-900'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </aside>

          {/* Dish Grid */}
          <main className="flex-1 p-6 overflow-y-auto bg-slate-50">
            {filteredDishes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Coffee className="h-10 w-10 text-slate-300" />
                <span className="text-sm">No dishes match your filters</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                {filteredDishes.map((dish) => (
                  <div
                    key={dish.id}
                    onClick={() => handleAddDish(dish)}
                    className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col shadow-sm cursor-pointer hover:border-primary hover:shadow-md transition-all active-press"
                  >
                    {dish.imageUrl ? (
                      <img 
                        src={dish.imageUrl} 
                        alt={dish.name}
                        className="h-28 w-full object-cover rounded-lg bg-slate-55 shrink-0" 
                      />
                    ) : (
                      <div className="h-28 w-full rounded-lg bg-slate-50 flex items-center justify-center shrink-0 text-slate-300 font-semibold text-xs">
                        {dish.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="mt-3 flex-1 flex flex-col justify-between">
                      <h4 className="font-medium text-xs text-slate-800 line-clamp-2 leading-tight">{dish.name}</h4>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">₹{Number(dish.price).toFixed(2)}</span>
                        <span className="text-xxs font-medium text-slate-400">
                          Tax {Number(dish.taxRate)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* RIGHT SECTION: Cart Sidebar */}
      <div className="w-96 bg-white border-l border-slate-250 flex flex-col h-full shadow-lg">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <span className="font-semibold text-slate-805 flex items-center gap-2">
            <ShoppingCart className="h-4.5 w-4.5 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-slate-800">Active Billing Order</span>
          </span>
          <span className="text-xxs font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-500 border border-slate-200/50">
            {cart.items.length} items
          </span>
        </div>

        {/* Order Type and Customer Settings */}
        <div className="p-4 border-b border-slate-200 space-y-3 shrink-0">
          {/* Order Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['TAKEAWAY', 'DINE_IN'] as OrderType[]).map((type) => (
              <button
                key={type}
                onClick={() => cart.setOrderType(type)}
                className={`py-1.5 text-xxs font-semibold rounded-lg border text-center transition-all ${
                  cart.orderType === type 
                    ? 'bg-primary text-white border-primary shadow-sm' 
                    : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {type === 'DINE_IN' ? 'Dining' : type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Customer Metadata fields */}
          <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cust Phone"
                  value={cart.customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onKeyDown={handlePhoneKeyDown}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xxs text-slate-805 focus:outline-none focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleSearchCustomer}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-primary transition-colors cursor-pointer animate-press"
                  title="Search Customer"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>

                {/* Suggestions Dropdown */}
                {showSuggestionsDropdown && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {suggestions.map((s, idx) => (
                      <div
                        key={s.customerPhone}
                        onClick={() => handleSelectSuggestion(s)}
                        className={`px-3 py-2 text-xxs cursor-pointer flex justify-between transition-colors ${
                          idx === activeSuggestionIndex 
                            ? 'bg-primary-light text-slate-900 font-semibold border-l-2 border-primary' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{s.customerPhone}</span>
                        <span className="text-slate-400 font-normal">{s.customerName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            {/* Customer Name Input (Shown or highlighted when searching/editing) */}
            {(isEditingName || cart.customerName) && (
              <div className="animate-fade-in">
                <input
                  id="customer-name-input"
                  type="text"
                  placeholder="Enter Customer Name"
                  value={cart.customerName}
                  onChange={(e) => cart.setCustomerInfo(e.target.value, cart.customerPhone)}
                  onKeyDown={handleNameKeyDown}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xxs text-slate-805 focus:outline-none focus:bg-white"
                />
              </div>
            )}

            {/* Notification messages */}
            {searchMessage && (
              <p className={`text-xxs font-medium tracking-tight ${
                searchMessage.type === 'success' ? 'text-success font-semibold' : 'text-slate-500'
              }`}>
                {searchMessage.text}
              </p>
            )}
          </div>
        </div>

        {/* Cart Item list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <ShoppingCart className="h-10 w-10 text-slate-200" />
              <span className="text-xs">Billing order cart is empty</span>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.dishId} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-medium text-xs text-slate-800 leading-tight">{item.name}</h5>
                    <span className="text-xxs text-slate-450 font-normal">₹{item.price.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => cart.removeItem(item.dishId)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  {/* Quantity adjustment controls */}
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <button
                      onClick={() => cart.updateQuantity(item.dishId, item.quantity - 1)}
                      className="px-2.5 py-1 text-slate-650 hover:bg-slate-50 font-medium text-xs"
                    >
                      -
                    </button>
                    <span className="px-3 text-xs font-medium text-slate-800 select-none">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => cart.updateQuantity(item.dishId, item.quantity + 1)}
                      className="px-2.5 py-1 text-slate-650 hover:bg-slate-50 font-medium text-xs"
                    >
                      +
                    </button>
                  </div>
                  
                  {/* Item Total price */}
                  <span className="text-xs font-medium text-slate-850">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Calculations Box */}
        <div className="p-4 border-t border-slate-200 bg-white space-y-4 shrink-0">
          <div className="space-y-2 text-xs font-semibold text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-slate-900">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-primary-hover">
              <span className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                <span>Discount</span>
              </span>
              <span>-₹{discountTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (GST)</span>
              <span className="text-slate-900">₹{taxTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-b border-slate-200 py-3 flex justify-between items-center bg-slate-50 px-3 rounded-xl">
            <span className="font-extrabold text-sm text-slate-805">Grand Total</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">₹{grandTotal.toFixed(2)}</span>
          </div>

          {/* Payment Method Selector directly on Cart Panel */}
          <div className="space-y-2">
            <label className="block text-xxs font-bold text-slate-450 uppercase tracking-wider">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['CASH', 'UPI', 'MIXED'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 text-xxs font-bold border text-center rounded-lg transition-all cursor-pointer ${
                    paymentMethod === method 
                      ? 'bg-primary text-white border-primary shadow-sm' 
                      : 'bg-white text-slate-550 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Mixed Payment Details Fields */}
          {paymentMethod === 'MIXED' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5 animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xxxs font-bold text-slate-450 mb-1">CASH</label>
                  <input
                    type="number"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xxs text-slate-850 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xxxs font-bold text-slate-455 mb-1">UPI</label>
                  <input
                    type="number"
                    min="0"
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xxs text-slate-850 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xxs font-bold">
                <span className="text-slate-450">Split Status:</span>
                <span className={Math.abs((cashAmount + cardAmount + upiAmount) - grandTotal) < 0.05 ? 'text-success' : 'text-rose-600'}>
                  ₹{(cashAmount + cardAmount + upiAmount).toFixed(2)} / ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Reference Field for single payment methods */}
          {paymentMethod !== 'MIXED' && (
            <div className="animate-fade-in">
              <input
                type="text"
                placeholder="Transaction Reference (Optional)"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xxs focus:outline-none focus:bg-white text-slate-805"
              />
            </div>
          )}

          {/* Checkout action buttons */}
          <div className="space-y-2">
            <button
              onClick={handleDirectCheckoutSubmit}
              disabled={cart.items.length === 0 || isProcessing}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md transition-all active-press disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center gap-2"
            >
              {isProcessing ? 'Processing billing...' : 'Complete & Print Bill'}
            </button>

            {/* Print Agent Connection Status */}
            <div className="flex items-center justify-between py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xxxs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${printAgentStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                <span className="text-slate-500">
                  {printAgentStatus === 'ONLINE' ? '🟢 Print Agent Connected' : '🔴 Print Agent Offline'}
                </span>
              </span>
              {printAgentStatus !== 'ONLINE' && (
                <a 
                  href="/KyraPrintAgentSetup.exe"
                  download
                  className="text-primary hover:underline font-bold"
                >
                  Download Setup
                </a>
              )}
            </div>

            {/* Quick Actions (Discount, Hold, Resume, Clear) */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <button
                onClick={() => {
                  setTempDiscount(cart.discount);
                  setTempDiscountType(cart.discountType);
                  setShowDiscountModal(true);
                }}
                className="py-1.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-850 rounded-lg text-xxxs font-bold transition-all cursor-pointer"
              >
                Discount
              </button>
              <button
                onClick={() => holdMutation.mutate()}
                disabled={cart.items.length === 0 || holdMutation.isPending}
                className="py-1.5 bg-white border border-warning/30 text-warning hover:bg-amber-50 rounded-lg text-xxxs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Hold
              </button>
              <button
                onClick={() => {
                  refetchHeld();
                  setShowHeldModal(true);
                }}
                className="py-1.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-650 rounded-lg text-xxxs font-bold transition-all cursor-pointer"
              >
                Resume
              </button>
              <button
                onClick={() => cart.clearCart()}
                disabled={cart.items.length === 0}
                className="py-1.5 bg-white border border-destructive/20 text-destructive hover:bg-rose-50 rounded-lg text-xxxs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. DISCOUNT CONFIG MODAL */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-sm">Apply Bill Discount</h3>
              <button onClick={() => setShowDiscountModal(false)} className="text-slate-400 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTempDiscountType('FLAT')}
                  className={`flex-1 py-2 text-xs font-bold text-center border-r ${
                    tempDiscountType === 'FLAT' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Flat Amount (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setTempDiscountType('PERCENT')}
                  className={`flex-1 py-2 text-xs font-bold text-center ${
                    tempDiscountType === 'PERCENT' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Percentage (%)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Discount Value
                </label>
                <input
                  type="number"
                  min="0"
                  value={tempDiscount}
                  onChange={(e) => setTempDiscount(Number(e.target.value))}
                  className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <button
              onClick={handleApplyDiscount}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg active-press shadow-sm"
            >
              Confirm Discount
            </button>
          </div>
        </div>
      )}



      {/* 3. RESUME HELD ORDER SELECTOR MODAL */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border rounded-2xl w-full max-w-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-lg">Resume Held Order Bills</h3>
              <button onClick={() => setShowHeldModal(false)} className="text-slate-400 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 p-1">
              {heldOrders.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-sm">
                  No held bills found.
                </div>
              ) : (
                heldOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shadow-xs hover:border-slate-450 hover:bg-slate-100/50 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">Bill #{order.orderNumber}</span>
                        <span className="text-xxs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black border border-amber-200">
                          {order.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {order.table?.number ? `Table: ${order.table.number} | ` : ''}
                        Items: {order.items.length} | Customer: {order.customerName || 'N/A'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-slate-800 text-xs">₹{Number(order.grandTotal).toFixed(2)}</span>
                      <button
                        onClick={() => resumeOrder(order)}
                        className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white font-semibold text-xxs rounded-lg active-press shadow-sm cursor-pointer"
                      >
                        Resume
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. PRINT-ONLY THERMAL RECEIPT CONTAINER */}
      {receiptData && (() => {
        // Group items by category name
        const itemsByCategory: Record<string, any[]> = {};
        receiptData.items.forEach((item: any) => {
          const catName = item.dish?.category?.name || 'Other';
          if (!itemsByCategory[catName]) {
            itemsByCategory[catName] = [];
          }
          itemsByCategory[catName].push(item);
        });
        const categories = Object.keys(itemsByCategory);

        return (
          <div id="print-receipt-section" className="hidden print:block text-slate-900 bg-white">
            {/* A. Customer Bill */}
            <div style={{ pageBreakAfter: 'always', breakAfter: 'page' }} className="pb-4">
              <div className="text-center mb-4">
                <h2 className="text-base font-black tracking-wide">KYRA POS</h2>
                <p className="text-xxs text-slate-600">Premium Dining Experience</p>
                <p className="text-xxs text-slate-500 mt-1 font-bold">CUSTOMER COPY</p>
                <p className="text-xxs text-slate-500">Order Type: {receiptData.type}</p>
              </div>

              <div className="border-b border-dashed border-slate-400 pb-2 mb-2 space-y-0.5 text-xxs text-slate-700">
                <div className="flex justify-between">
                  <span>Bill No: #{receiptData.orderNumber}</span>
                  <span>Date: {new Date(receiptData.createdAt).toLocaleDateString()}</span>
                </div>
                {receiptData.tableName && (
                  <div>Table: {receiptData.tableName}</div>
                )}
                <div>Cashier: {receiptData.cashier}</div>
                {receiptData.customerName && (
                  <div>Customer: {receiptData.customerName} ({receiptData.customerPhone || 'N/A'})</div>
                )}
              </div>

              {/* Items */}
              <table className="w-full text-xxs mb-2 text-left border-collapse">
                <thead>
                  <tr className="border-b border-dashed border-slate-400 font-bold">
                    <th className="pb-1">Item</th>
                    <th className="pb-1 text-center">Qty</th>
                    <th className="pb-1 text-right">Price</th>
                    <th className="pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-1">
                        <div>{item.dish?.name || 'Dish Item'}</div>
                        {item.notes && <div className="text-xxxs text-slate-500 italic">*{item.notes}</div>}
                      </td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">₹{Number(item.price).toFixed(2)}</td>
                      <td className="py-1 text-right">₹{(Number(item.price) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-xxs text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{Number(receiptData.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span>₹{Number(receiptData.taxTotal).toFixed(2)}</span>
                </div>
                {Number(receiptData.discountTotal) > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>Discount</span>
                    <span>-₹{Number(receiptData.discountTotal).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm border-t border-dashed border-slate-400 pt-1 text-slate-900">
                  <span>Grand Total</span>
                  <span>₹{Number(receiptData.grandTotal).toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-dashed border-slate-400 pt-2 text-center text-xxs text-slate-650">
                <p>Paid via: {receiptData.paymentMethod}</p>
                <p className="mt-1 font-semibold">Thank you! Visit again.</p>
              </div>
            </div>

            {/* B. Kitchen Bills (KOT) Grouped by Category */}
            {categories.map((catName, index) => {
              const catItems = itemsByCategory[catName];
              const isLast = index === categories.length - 1;
              return (
                <div
                  key={catName}
                  style={!isLast ? { pageBreakAfter: 'always', breakAfter: 'page' } : {}}
                  className="pt-4 pb-4 font-mono"
                >
                  <div className="text-center mb-4">
                    <h2 className="text-sm font-black tracking-widest uppercase">KITCHEN ORDER TICKET (KOT)</h2>
                    <p className="text-xs font-black bg-slate-900 text-white py-1 my-1 uppercase rounded">
                      CATEGORY: {catName}
                    </p>
                    <p className="text-xxs text-slate-600 mt-1 font-bold">Bill No: #{receiptData.orderNumber}</p>
                  </div>

                  <div className="border-b border-dashed border-slate-400 pb-2 mb-2 space-y-0.5 text-xxs text-slate-700">
                    <div className="flex justify-between">
                      <span>Date: {new Date(receiptData.createdAt).toLocaleDateString()}</span>
                      <span>Time: {new Date(receiptData.createdAt).toLocaleTimeString()}</span>
                    </div>
                    {receiptData.tableName && (
                      <div className="font-bold text-xs mt-1">Table: {receiptData.tableName}</div>
                    )}
                    <div>Order Type: {receiptData.type}</div>
                    <div>Cashier: {receiptData.cashier}</div>
                  </div>

                  {/* KOT Items List */}
                  <table className="w-full text-xxs mb-2 text-left border-collapse">
                    <thead>
                      <tr className="border-b border-dashed border-slate-400 font-bold">
                        <th className="pb-1">Item Name</th>
                        <th className="pb-1 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catItems.map((item: any) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-2 text-xs font-bold">
                            <div>{item.dish?.name || 'Dish Item'}</div>
                            {item.notes && <div className="text-xxxs text-slate-500 italic">*{item.notes}</div>}
                          </td>
                          <td className="py-2 text-right text-xs font-black">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-4 border-t border-dashed border-slate-400 pt-2 text-center text-xxxs text-slate-500 font-bold uppercase">
                    * Kitchen Copy Only - Do Not Pay *
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
