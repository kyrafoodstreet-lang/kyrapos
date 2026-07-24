'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  Users,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface PartyHall {
  id: string;
  name: string;
  capacity: number;
  baseRent: string | number;
  description: string | null;
  isActive: boolean;
}

export default function PartyHallSettings() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<PartyHall | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [baseRent, setBaseRent] = useState(10000);
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch Halls
  const { data: halls, isLoading } = useQuery<PartyHall[]>({
    queryKey: ['partyHalls'],
    queryFn: async () => (await api.get('/party-hall/halls')).data,
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/party-hall/halls', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partyHalls'] });
      queryClient.invalidateQueries({ queryKey: ['partyHallDashboardStats'] });
      closeModal();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create hall');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => 
      (await api.put(`/party-hall/halls/${id}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partyHalls'] });
      queryClient.invalidateQueries({ queryKey: ['partyHallDashboardStats'] });
      closeModal();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to update hall');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/party-hall/halls/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partyHalls'] });
      queryClient.invalidateQueries({ queryKey: ['partyHallDashboardStats'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete hall');
    }
  });

  // Modal Handlers
  const openCreateModal = () => {
    if (!isAdmin) {
      alert('Only Admins can register new halls.');
      return;
    }
    setEditingHall(null);
    setName('');
    setCapacity(100);
    setBaseRent(10000);
    setDescription('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (hall: PartyHall) => {
    setEditingHall(hall);
    setName(hall.name);
    setCapacity(hall.capacity);
    setBaseRent(Number(hall.baseRent));
    setDescription(hall.description || '');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHall(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Name is required');
      return;
    }

    const payload = {
      name,
      capacity: Number(capacity),
      baseRent: Number(baseRent),
      description: description || null,
    };

    if (editingHall) {
      updateMutation.mutate({ id: editingHall.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (!isAdmin) {
      alert('Only Admins can delete halls.');
      return;
    }
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

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
            <span>Banquet Halls Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure banquet halls, capacity thresholds, and base rent rates.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Party Hall</span>
          </button>
        )}
      </div>

      {/* Grid of Halls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {halls?.map((hall) => (
          <div key={hall.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800 text-sm">{hall.name}</h3>
                <span className="text-xxs font-bold bg-purple-50 text-purple-650 px-2 py-0.5 rounded-full border border-purple-100">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 min-h-[36px]">
                {hall.description || 'No description provided.'}
              </p>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
                <div className="space-y-1">
                  <span className="text-xxs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>Max Capacity</span>
                  </span>
                  <div className="font-semibold text-slate-800">{hall.capacity} guests</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xxs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>Base Rent</span>
                  </span>
                  <div className="font-bold text-slate-800">₹{Number(hall.baseRent).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3.5">
              <button
                onClick={() => openEditModal(hall)}
                className="p-1.5 hover:bg-purple-50 text-purple-600 hover:text-purple-700 rounded-lg border border-purple-100 transition-colors flex items-center gap-1 text-xxs font-semibold"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(hall.id, hall.name)}
                  className="p-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-lg border border-rose-100 transition-colors flex items-center gap-1 text-xxs font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {halls?.length === 0 && (
          <div className="col-span-full bg-white p-12 text-center border border-slate-200 rounded-2xl">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">No banquet halls registered yet.</p>
            {isAdmin && (
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl transition-all"
              >
                Create Your First Hall
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm">
                {editingHall ? 'Edit Banquet Hall' : 'Add Banquet Hall'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-650 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Hall Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grand Ballroom"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Capacity (Guests)</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Base Rent (₹)</label>
                  <input
                    type="number"
                    value={baseRent}
                    onChange={(e) => setBaseRent(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-bold text-slate-450 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the hall amenities, seating designs..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3.5 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-400 text-white font-semibold text-xs rounded-xl shadow-xs hover:shadow transition-all"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
