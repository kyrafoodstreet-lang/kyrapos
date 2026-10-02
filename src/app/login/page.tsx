'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff } from 'lucide-react';
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
      alwaysLogin: true,
    },
  });

  const alwaysLogin = watch('alwaysLogin', true);

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50/70 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-6 bg-white border border-slate-200/80 p-8 rounded-2xl shadow-sm">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 text-[#D94949] font-black mb-1 border border-rose-100">
            K
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Kyra POS
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Sign in to start your restaurant shift
          </p>
        </div>
        
        {error && (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-600 border border-rose-100 font-medium animate-fade-in">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-3.5">
            <div>
              <label htmlFor="email" className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="block w-full rounded-xl border border-slate-200/90 px-3.5 py-2.5 text-slate-800 placeholder-slate-400 bg-slate-50/50 sm:text-xs font-semibold focus:bg-white focus:border-[#D94949] focus:ring-2 focus:ring-[#D94949]/15 focus:outline-none transition-all"
                placeholder="cashier@kyra.com"
              />
              {errors.email ? <p className="mt-1 text-xxs text-rose-600 font-semibold">{errors.email.message?.toString()}</p> : null}
            </div>

            <div>
              <label htmlFor="password" className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="block w-full rounded-xl border border-slate-200/90 pl-3.5 pr-10 py-2.5 text-slate-800 placeholder-slate-400 bg-slate-50/50 sm:text-xs font-semibold focus:bg-white focus:border-[#D94949] focus:ring-2 focus:ring-[#D94949]/15 focus:outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password ? <p className="mt-1 text-xxs text-rose-600 font-semibold">{errors.password.message?.toString()}</p> : null}
            </div>

            {/* Always Login / Keep Me Logged In Option */}
            <div className="pt-1">
              <label
                htmlFor="alwaysLogin"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 transition-colors cursor-pointer select-none group"
              >
                <div className="flex flex-col pr-2">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900 transition-colors flex items-center gap-1.5">
                    <span>Always Login</span>
                    <span className="text-xxs px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      Persistent
                    </span>
                  </span>
                  <span className="text-xxs text-slate-450 font-medium">
                    Do not log out until I explicitly sign out
                  </span>
                </div>
                <input
                  id="alwaysLogin"
                  type="checkbox"
                  {...register('alwaysLogin')}
                  className="w-4 h-4 rounded border-slate-300 text-[#D94949] focus:ring-[#D94949] accent-[#D94949] cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 bg-[#D94949] hover:bg-[#C53B3B] text-white text-xs font-bold rounded-xl active-press transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
