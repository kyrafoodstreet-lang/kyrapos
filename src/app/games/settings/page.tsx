'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Plus,
  Trash2,
  Gamepad2,
  DollarSign,
  Clock,
  Sparkles,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

interface Game {
  id: string;
  name: string;
  description: string | null;
}

interface Pricing {
  id: string;
  gameId: string;
  name: string;
  duration: number;
  price: string;
  game: {
    name: string;
  };
}

export default function GameSettings() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  // Auth check - bounce cashier
  if (user && user.role === 'CASHIER') {
    router.replace('/games');
    return null;
  }

  // 1. Fetch Games Catalog
  const { data: games, isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ['gamesCatalog'],
    queryFn: async () => (await api.get('/games/catalog')).data,
  });

  // 2. Fetch Pricing packages
  const { data: pricings, isLoading: pricingLoading } = useQuery<Pricing[]>({
    queryKey: ['gamesPricing'],
    queryFn: async () => (await api.get('/games/pricing')).data,
  });

  // Modals / Add State
  const [showGameModal, setShowGameModal] = useState(false);
  const [newGame, setNewGame] = useState({ name: '', description: '' });

  const [showPricingModal, setShowPricingModal] = useState(false);
  const [newPricing, setNewPricing] = useState({ gameId: '', name: '', duration: 30, price: 0 });

  // Mutations
  const createGameMutation = useMutation({
    mutationFn: async (payload: typeof newGame) => api.post('/games/catalog', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamesCatalog'] });
      setShowGameModal(false);
      setNewGame({ name: '', description: '' });
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/games/catalog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamesCatalog'] });
      queryClient.invalidateQueries({ queryKey: ['gamesPricing'] });
    },
  });

  const createPricingMutation = useMutation({
    mutationFn: async (payload: typeof newPricing) => api.post('/games/pricing', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamesPricing'] });
      setShowPricingModal(false);
      setNewPricing({ gameId: '', name: '', duration: 30, price: 0 });
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/games/pricing/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamesPricing'] });
    },
  });

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGame.name.trim()) return;
    createGameMutation.mutate(newGame);
  };

  const handleCreatePricing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPricing.gameId || !newPricing.name.trim() || newPricing.price <= 0) return;
    createPricingMutation.mutate({
      ...newPricing,
      price: Number(newPricing.price),
      duration: Number(newPricing.duration)
    });
  };

  if (gamesLoading || pricingLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-650"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="h-5.5 w-5.5 text-blue-650" />
            <span>Pricing & Game Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure available games, add pricing tiers, durations, and manage flat packages.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Game Catalog Master */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Gamepad2 className="h-4.5 w-4.5 text-blue-650" />
              <span>Game Catalog Master</span>
            </h3>
            <button
              onClick={() => setShowGameModal(true)}
              className="p-1 hover:bg-blue-50 text-blue-600 rounded border border-blue-100 flex items-center gap-1 text-xxs font-bold transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Game</span>
            </button>
          </div>

          <div className="space-y-3.5 pt-1">
            {games?.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">No games defined.</div>
            ) : (
              games?.map((game) => (
                <div key={game.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="max-w-[70%]">
                    <div className="font-bold text-xs text-slate-800">{game.name}</div>
                    {game.description && <p className="text-slate-400 text-xxs truncate mt-0.5">{game.description}</p>}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Deleting this game will invalidate its active pricing configurations. Confirm?')) {
                        deleteGameMutation.mutate(game.id);
                      }
                    }}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Pricing Master */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <DollarSign className="h-4.5 w-4.5 text-blue-650" />
              <span>Pricing & Package Master</span>
            </h3>
            <button
              onClick={() => setShowPricingModal(true)}
              className="p-1 hover:bg-blue-50 text-blue-600 rounded border border-blue-100 flex items-center gap-1 text-xxs font-bold transition-all"
              disabled={!games || games.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Configure Rate</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-455 font-bold uppercase tracking-wider text-xxs bg-slate-50/50">
                  <th className="px-4 py-2.5 rounded-l-lg">Game</th>
                  <th className="px-4 py-2.5">Package Title</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5">Base Rate</th>
                  <th className="px-4 py-2.5 text-right rounded-r-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650">
                {pricings?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No rates configured yet.
                    </td>
                  </tr>
                ) : (
                  pricings?.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50/40">
                      <td className="px-4 py-3 font-semibold text-slate-800">{pr.game.name}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{pr.name}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {pr.duration > 0 ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{pr.duration} mins</span>
                          </span>
                        ) : (
                          <span className="text-xxs px-2 py-0.5 bg-blue-50 text-blue-600 font-semibold rounded">Flat Pkg</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">₹{Number(pr.price).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm('Delete this pricing package?')) {
                              deletePricingMutation.mutate(pr.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Game Modal Dialog */}
      {showGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Create Catalog Game</h4>
              <button onClick={() => setShowGameModal(false)} className="text-slate-400 hover:text-slate-650 font-bold">×</button>
            </div>
            <form onSubmit={handleCreateGame} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Game Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trampoline Park, VR Zone"
                  value={newGame.name}
                  onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-850"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Description</label>
                <textarea
                  placeholder="Safety regulations, guest rules or details..."
                  value={newGame.description}
                  onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-850 h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={createGameMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition-all"
                >
                  {createGameMutation.isPending ? 'Saving...' : 'Add Game'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGameModal(false)}
                  className="px-4 py-2.5 border border-slate-250 hover:bg-slate-50 text-slate-650 font-semibold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Pricing Rate Modal Dialog */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Configure Pricing Package</h4>
              <button onClick={() => setShowPricingModal(false)} className="text-slate-400 hover:text-slate-650 font-bold">×</button>
            </div>
            <form onSubmit={handleCreatePricing} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Select Game</label>
                <select
                  required
                  value={newPricing.gameId}
                  onChange={(e) => setNewPricing({ ...newPricing, gameId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold outline-none focus:border-blue-500 focus:bg-white text-slate-850"
                >
                  <option value="">-- Choose game --</option>
                  {games?.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Package Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 30 Minutes, ₹100 Coin Pack, Unlimited Pass"
                  value={newPricing.name}
                  onChange={(e) => setNewPricing({ ...newPricing, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-850"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newPricing.duration}
                    onChange={(e) => setNewPricing({ ...newPricing, duration: Number(e.target.value) })}
                    placeholder="0 for flat/unlimited"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-850"
                  />
                  <span className="text-[10px] text-slate-400">Set 0 for flat packages</span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-xxs">Base Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPricing.price}
                    onChange={(e) => setNewPricing({ ...newPricing, price: Number(e.target.value) })}
                    placeholder="Price in INR"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-850"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={createPricingMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition-all"
                >
                  {createPricingMutation.isPending ? 'Saving...' : 'Add Pricing'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPricingModal(false)}
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
