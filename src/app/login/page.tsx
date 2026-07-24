'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginSchema = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchema) => {
    setError(null);
    setLoading(true);
    try {
      const response = await api.post('/auth/login', data);
      const { accessToken, user } = response.data;
      login(user, accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-6 bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800">
            Kyra POS
          </h2>
          <p className="text-xs text-slate-450 font-medium">
            Sign in to start your restaurant shift
          </p>
        </div>
        
        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600 border border-rose-100 font-medium">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-850 placeholder-slate-400 bg-white sm:text-xs font-medium focus:outline-none"
                placeholder="cashier@kyra.com"
              />
              {errors.email ? <p className="mt-1 text-xxs text-rose-600 font-semibold">{errors.email.message?.toString()}</p> : null}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-550 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-850 placeholder-slate-400 bg-white sm:text-xs font-medium focus:outline-none"
                placeholder="••••••••"
              />
              {errors.password ? <p className="mt-1 text-xxs text-rose-600 font-semibold">{errors.password.message?.toString()}</p> : null}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg active-press transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
