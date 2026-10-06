'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, ShieldCheck, ShieldAlert, Shield, Lock, Mail, ArrowRight, Loader } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  alwaysLogin: z.boolean(),
});

type LoginSchema = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      alwaysLogin: true,
    },
  });

  const fillDemoAccount = (role: 'ADMIN' | 'MANAGER' | 'CASHIER') => {
    if (role === 'ADMIN') {
      setValue('email', 'admin@kyra.com');
      setValue('password', 'adminpassword');
    } else if (role === 'MANAGER') {
      setValue('email', 'manager@kyra.com');
      setValue('password', 'managerpassword');
    } else {
      setValue('email', 'cashier@kyra.com');
      setValue('password', 'cashierpassword');
    }
  };

  const onSubmit = async (data: LoginSchema) => {
    setError(null);
    setLoading(true);
    try {
      const response = await api.post('/auth/login', data);
      const { accessToken, user } = response.data;
      login(user, accessToken, data.alwaysLogin);
      if (user.role === 'CASHIER') {
        router.push('/cashier/dashboard');
      } else if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (user.role === 'MANAGER') {
        router.push('/manager/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-rose-50/30 px-4 py-8 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 bg-white/90 backdrop-blur-md border border-slate-200/90 p-6 sm:p-8 rounded-3xl shadow-xl relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-[#D94949] font-black text-xl mb-1 border border-rose-200 shadow-xs">
            K
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            KYRA POS
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Next-Generation Point of Sale & Entertainment Management
          </p>
        </div>

        {/* Quick Demo Login Chips */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block text-center">
            Quick 1-Click Role Login
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => fillDemoAccount('ADMIN')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 text-xxs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer group"
            >
              <ShieldAlert className="h-3 w-3 text-rose-500 group-hover:text-rose-400" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('MANAGER')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 text-xxs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer group"
            >
              <ShieldCheck className="h-3 w-3 text-sky-500 group-hover:text-sky-400" />
              <span>Manager</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('CASHIER')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 text-xxs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer group"
            >
              <Shield className="h-3 w-3 text-emerald-500 group-hover:text-emerald-400" />
              <span>Cashier</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 p-3.5 text-xs text-rose-700 border border-rose-200 font-bold flex items-center gap-2 animate-fade-in">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-3.5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xxs font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="block w-full rounded-2xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 bg-slate-50 text-xs font-semibold focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
                  placeholder="name@kyra.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xxs text-rose-600 font-bold">{errors.email.message?.toString()}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xxs font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="block w-full rounded-2xl border border-slate-200 pl-10 pr-10 py-2.5 text-slate-900 placeholder-slate-400 bg-slate-50 text-xs font-semibold focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xxs text-rose-600 font-bold">{errors.password.message?.toString()}</p>
              )}
            </div>

            {/* Always Login Option */}
            <div className="pt-1">
              <label
                htmlFor="alwaysLogin"
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 transition-colors cursor-pointer select-none group"
              >
                <div className="flex flex-col pr-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Keep Me Signed In</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      Persistent Session
                    </span>
                  </span>
                  <span className="text-xxs text-slate-400 font-medium">
                    Do not auto-expire session until signed out
                  </span>
                </div>
                <input
                  id="alwaysLogin"
                  type="checkbox"
                  {...register('alwaysLogin')}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl active:scale-[0.99] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin text-slate-300" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to POS Workspace</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
