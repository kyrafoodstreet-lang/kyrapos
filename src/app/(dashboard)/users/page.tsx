'use client';

import React, { useState } from 'react';
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

const roleBadge = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return { bg: 'bg-slate-900 text-white border-slate-800', icon: ShieldAlert };
    case 'MANAGER':
      return { bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: ShieldCheck };
    case 'CASHIER':
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Shield };
    default:
      return { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Shield };
  }
};

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

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
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete user');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
      setFormError('Name and email are required');
      return;
    }

    if (editingUser) {
      const data: any = { name: formName, email: formEmail, role: formRole };
      if (formPassword.trim()) data.password = formPassword;
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      if (!formPassword.trim()) {
        setFormError('Password is required for new users');
        return;
      }
      createMutation.mutate({
        email: formEmail,
        name: formName,
        password: formPassword,
        role: formRole,
      });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Redirect non-admin users
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Access Denied</p>
          <p className="text-xs text-slate-400">Only administrators can manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-700 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100/80 text-[#D94949] flex items-center justify-center font-bold shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
              User Management
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage system access roles, cashiers, kitchen staff, and security credentials.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:bg-white focus:border-[#D94949] focus:ring-2 focus:ring-[#D94949]/15 text-slate-900 transition-all"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#D94949] hover:bg-[#C53B3B] text-white font-bold text-xs rounded-xl shadow-2xs transition-all active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-4 m-4 bg-red-50 text-red-700 rounded-xl border border-red-150 flex items-center gap-3 text-xs">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load users.</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-medium">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const badge = roleBadge(user.role);
                  const RoleIcon = badge.icon;
                  const isSelf = user.id === currentUser?.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 font-semibold flex items-center justify-center text-xs border border-slate-200">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 text-xs">{user.name}</span>
                            {isSelf && (
                              <span className="ml-2 text-xxs text-primary font-semibold">(You)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">{user.email}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xxs font-semibold rounded-full border ${badge.bg}`}>
                          <RoleIcon className="h-3 w-3" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => {
                            if (!isSelf) {
                              toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive });
                            }
                          }}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xxs font-semibold rounded-full border transition-colors cursor-pointer ${
                            user.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          } ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {user.isActive ? (
                            <><UserCheck className="h-3 w-3" /> Active</>
                          ) : (
                            <><UserX className="h-3 w-3" /> Inactive</>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary-light rounded-lg transition-all cursor-pointer"
                            title="Edit User"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* Create / Edit Modal (Sliding side panel instead of popup) */}
      {showModal && (
        <>
          {/* Light Backdrop Overlay */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-xxs"
            onClick={closeModal}
          />
          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col space-y-6 animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {editingUser ? 'Edit User Details' : 'Create New User'}
                </h3>
                <p className="text-xxs text-slate-400 font-medium mt-0.5">Manage credentials and roles for restaurant staff</p>
              </div>
              <button 
                onClick={closeModal} 
                className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xxs font-semibold text-slate-450 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-805 focus:outline-none focus:bg-white"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xxs font-semibold text-slate-455 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-805 focus:outline-none focus:bg-white"
                    placeholder="user@kyra.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xxs font-semibold text-slate-450 uppercase mb-1">
                    {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-805 focus:outline-none focus:bg-white"
                    placeholder={editingUser ? '••••••••' : 'Enter password'}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xxs font-semibold text-slate-455 uppercase mb-1">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((role) => {
                      const badge = roleBadge(role);
                      const RIcon = badge.icon;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setFormRole(role)}
                          className={`flex items-center justify-center gap-1.5 py-2 text-xxs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                            formRole === role
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'text-slate-555 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <RIcon className="h-3.5 w-3.5" />
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formError && (
                  <p className="text-xxs text-red-650 font-semibold">{formError}</p>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-lg active-press transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingUser
                    ? 'Save Changes'
                    : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Delete User</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <span className="font-semibold text-slate-700">{deletingUser.name}</span>?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingUser.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
