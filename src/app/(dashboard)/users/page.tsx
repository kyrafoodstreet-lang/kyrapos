'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  X,
  Loader,
  AlertCircle,
  Search,
  UserCheck,
  UserX,
  Mail,
  Lock,
  CheckCircle2,
  Filter,
} from 'lucide-react';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER';
  isActive: boolean;
  createdAt: string;
};

const ROLES = ['ADMIN', 'MANAGER', 'CASHIER'] as const;

const ROLE_CONFIG: Record<
  string,
  { label: string; icon: any; badgeBg: string; badgeBorder: string; badgeText: string; accent: string }
> = {
  ADMIN: {
    label: 'Admin',
    icon: ShieldAlert,
    badgeBg: 'bg-slate-900',
    badgeBorder: 'border-slate-800',
    badgeText: 'text-white',
    accent: '#0f172a',
  },
  MANAGER: {
    label: 'Manager',
    icon: ShieldCheck,
    badgeBg: 'bg-sky-50',
    badgeBorder: 'border-sky-200',
    badgeText: 'text-sky-700',
    accent: '#0284c7',
  },
  CASHIER: {
    label: 'Cashier',
    icon: Shield,
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-700',
    accent: '#059669',
  },
};

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MANAGER' | 'CASHIER'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'ADMIN' | 'MANAGER' | 'CASHIER'>('CASHIER');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const createMutation = useMutation({
    mutationFn: (data: { email: string; name: string; password: string; role: string }) =>
      api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
      setToastMessage({ type: 'success', text: 'New user created successfully.' });
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
      setToastMessage({ type: 'success', text: 'User details updated successfully.' });
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeletingUser(null);
      setToastMessage({ type: 'success', text: 'User removed from system.' });
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => {
      setToastMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete user' });
      setTimeout(() => setToastMessage(null), 4000);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setToastMessage({ type: 'success', text: 'User status toggled.' });
      setTimeout(() => setToastMessage(null), 3000);
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('CASHIER');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword('');
    setFormRole(user.role);
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Full name and email address are required');
      return;
    }

    if (editingUser) {
      const data: any = { name: formName.trim(), email: formEmail.trim(), role: formRole };
      if (formPassword.trim()) data.password = formPassword.trim();
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      if (!formPassword.trim()) {
        setFormError('Password is required for new accounts');
        return;
      }
      createMutation.mutate({
        email: formEmail.trim(),
        name: formName.trim(),
        password: formPassword.trim(),
        role: formRole,
      });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // Counts
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const managerCount = users.filter((u) => u.role === 'MANAGER').length;
  const cashierCount = users.filter((u) => u.role === 'CASHIER').length;

  // Access check
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-base font-black text-slate-900">Access Restricted</h3>
          <p className="text-xs text-slate-500 font-medium">
            Only system administrators have permission to manage staff profiles and roles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-700 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold transition-all animate-in slide-in-from-top duration-200 border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
              : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-200" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-80 transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-50/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-[#D94949] shadow-xs shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  User Management
                </h1>
                <span className="px-2.5 py-0.5 bg-rose-50 text-[#D94949] border border-rose-200 text-[11px] font-black rounded-full">
                  {users.length} Total Users
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Configure team accounts, assign granular POS roles & oversee operator access
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer self-start lg:self-auto"
          >
            <Plus className="h-4 w-4 text-rose-400" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Users */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Accounts
            </span>
            <div className="h-9 w-9 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center border border-slate-200/80">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
            {users.length}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Registered team profiles
          </p>
        </div>

        {/* Admins */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Administrators
            </span>
            <div className="h-9 w-9 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xs">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
            {adminCount}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Full system control & ledger
          </p>
        </div>

        {/* Managers */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Managers
            </span>
            <div className="h-9 w-9 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center border border-sky-200/80">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
            {managerCount}
          </h3>
          <p className="text-[11px] text-sky-700 font-medium mt-1">
            Floor operations & menus
          </p>
        </div>

        {/* Cashiers */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Cashiers & Staff
            </span>
            <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200/80">
              <Shield className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
            {cashierCount}
          </h3>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            POS Billing & Game Shifts
          </p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Role Filters */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-2xs w-full sm:w-auto">
          {(['ALL', 'ADMIN', 'MANAGER', 'CASHIER'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all capitalize cursor-pointer ${
                roleFilter === r
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-9 py-2 text-xs font-medium focus:outline-none focus:bg-white focus:border-slate-900 text-slate-900 transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Users Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader className="h-7 w-7 animate-spin text-rose-500" />
          </div>
        ) : error ? (
          <div className="p-6 m-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 flex items-center gap-3 text-xs font-bold">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to fetch user accounts.</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 px-6 text-slate-400 space-y-3">
            <div className="w-14 h-14 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mx-auto border border-slate-200">
              <Users className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Users Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No staff members match the selected filters or search keyword.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 font-extrabold border-b border-slate-200/80 text-xxs uppercase tracking-wider">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Assigned Role</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((u) => {
                  const roleConfig = ROLE_CONFIG[u.role] || ROLE_CONFIG.CASHIER;
                  const RoleIcon = roleConfig.icon;
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-700 font-black flex items-center justify-center text-xs border border-slate-200 shrink-0">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-xs">{u.name}</span>
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#D94949] border border-rose-200 text-[10px] font-black">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xxs text-slate-400 block font-medium mt-0.5">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}
                        >
                          <RoleIcon className="h-3.5 w-3.5" />
                          <span>{roleConfig.label}</span>
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            if (!isSelf) {
                              toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive });
                            }
                          }}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xxs font-bold rounded-full border transition-all cursor-pointer ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          } ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {u.isActive ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <UserX className="h-3.5 w-3.5" />
                              <span>Disabled</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                            title="Edit User"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Create / Edit Slide-over Drawer */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={closeModal}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl p-6 sm:p-8 flex flex-col justify-between animate-slide-in overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-[#D94949]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">
                      {editingUser ? 'Edit User Profile' : 'Register New User'}
                    </h3>
                    <p className="text-xxs text-slate-400 font-semibold mt-0.5">
                      Assign login credentials & operational permission tier
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xxs font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xxs font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="staff@kyra.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xxs font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    {editingUser ? 'New Password (leave blank to keep current)' : 'Account Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingUser ? '••••••••' : 'Enter secure password'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Role Picker */}
                <div>
                  <label className="block text-xxs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                    Permission Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => {
                      const cfg = ROLE_CONFIG[r];
                      const Icon = cfg.icon;
                      const isSelected = formRole === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormRole(r)}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10'
                              : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-white/10 text-white' : `${cfg.badgeBg} ${cfg.badgeText}`
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-5 mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="user-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl transition shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin text-slate-300" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingUser ? 'Update Profile' : 'Create User'}</span>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 6. Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-200">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Delete User Account</h3>
              <p className="text-xs text-slate-500 font-medium">
                Are you sure you want to delete <span className="font-bold text-slate-800">{deletingUser.name}</span>?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingUser.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
