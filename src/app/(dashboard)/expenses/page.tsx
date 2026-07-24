'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import {
  Plus,
  Loader,
  X,
  Wallet,
  AlertCircle,
  FileCheck,
  TrendingDown,
  Info
} from 'lucide-react';

const expenseSchema = z.object({
  category: z.enum(['VEGETABLES', 'MILK', 'GAS', 'CLEANING', 'PETROL', 'MISCELLANEOUS']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero'),
  notes: z.string().optional(),
  date: z.string().optional(), // ISO date string
});

type ExpenseSchema = z.infer<typeof expenseSchema>;

interface Expense {
  id: string;
  category: 'VEGETABLES' | 'MILK' | 'GAS' | 'CLEANING' | 'PETROL' | 'MISCELLANEOUS';
  amount: string;
  notes: string | null;
  date: string;
  user: { name: string; role: string };
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);

  // Fetch Expenses
  const { data: expenses = [], isLoading, error } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => (await api.get('/expenses')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(expenseSchema),
  });

  // Create Expense Mutation
  const expenseMutation = useMutation({
    mutationFn: async (data: ExpenseSchema) => {
      return (await api.post('/expenses', {
        ...data,
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowDialog(false);
      reset();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to record expense.');
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'VEGETABLES':
        return 'bg-emerald-50 text-emerald-800 border-emerald-250';
      case 'MILK':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'GAS':
        return 'bg-amber-50 text-amber-805 border-amber-200';
      case 'CLEANING':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'PETROL':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

  return (
    <div className="space-y-6 text-slate-700 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800 tracking-tight">Operational Expense Tracker</h2>
          <p className="text-xxs text-slate-450 mt-0.5 font-medium">Record and monitor shop expenses like gas, vegetables, milk, fuel, etc.</p>
        </div>
        <button
          onClick={() => {
            reset({ category: 'VEGETABLES', amount: 0, notes: '', date: new Date().toISOString().split('T')[0] });
            setShowDialog(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold text-xxs rounded-lg shadow-sm active-press transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Log Expense</span>
        </button>
      </div>

      {/* KPI expense summary header */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Logged Expenses</span>
          <h3 className="text-xl font-semibold text-slate-900">₹{totalExpenses.toFixed(2)}</h3>
        </div>
        <div className="h-11 w-11 bg-primary-light rounded-lg flex items-center justify-center border border-primary/10">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Expenses List table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        {expenses.length === 0 ? (
          <div className="text-center p-8 text-slate-450 text-xs font-medium">
            No expenses logged in this system.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                <th className="px-6 py-3">Expense Category</th>
                <th className="px-6 py-3">Logged By</th>
                <th className="px-6 py-3">Description Notes</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50 font-medium">
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xxs font-semibold border uppercase tracking-wider ${getCategoryColor(e.category)}`}>
                      {e.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{e.user.name}</div>
                    <span className="text-xxs text-slate-400 uppercase font-semibold">{e.user.role}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-550 max-w-sm truncate">{e.notes || '-'}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">₹{Number(e.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-slate-400 text-right text-xxs font-semibold">
                    {new Date(e.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE EXPENSE DIALOG (Sliding side panel instead of popup) */}
      {showDialog && (
        <>
          {/* Light Backdrop Overlay */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-xxs"
            onClick={() => setShowDialog(false)}
          />
          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col space-y-6 animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Log Restaurant Expense</h3>
                <p className="text-xxs text-slate-400 font-medium mt-0.5">Declare active cashier shift cash expenses</p>
              </div>
              <button 
                onClick={() => setShowDialog(false)} 
                className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((data) => expenseMutation.mutate(data))} className="space-y-4 text-slate-705 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-semibold text-slate-455 uppercase mb-1">
                      Expense Category
                    </label>
                    <select
                      {...register('category')}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:bg-white text-slate-805"
                    >
                      <option value="VEGETABLES">Vegetables</option>
                      <option value="MILK">Milk</option>
                      <option value="GAS">Gas</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="PETROL">Petrol</option>
                      <option value="MISCELLANEOUS">Miscellaneous</option>
                    </select>
                    {errors.category ? <p className="mt-1 text-xs text-rose-600">{errors.category.message?.toString()}</p> : null}
                  </div>

                  <div>
                    <label className="block text-xxs font-semibold text-slate-455 uppercase mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      {...register('date')}
                      className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:bg-white text-slate-805"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xxs font-semibold text-slate-450 uppercase mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('amount')}
                    className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white text-slate-805"
                    placeholder="0.00"
                  />
                  {errors.amount ? <p className="mt-1 text-xs text-rose-600">{errors.amount.message?.toString()}</p> : null}
                </div>

                <div>
                  <label className="block text-xxs font-semibold text-slate-455 uppercase mb-1">
                    Description Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:bg-white h-20 text-slate-805"
                    placeholder="e.g. Milk purchase, vegetable vendor bill, etc."
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={expenseMutation.isPending}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-lg active-press transition-colors shadow-sm cursor-pointer"
                >
                  {expenseMutation.isPending ? 'Logging expense...' : 'Confirm Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
