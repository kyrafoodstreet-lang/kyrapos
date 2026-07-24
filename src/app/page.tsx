'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
    } else {
      router.replace('/dashboard');
    }
  }, [token, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
        <span className="text-sm font-medium text-slate-500">Loading Kyra POS...</span>
      </div>
    </div>
  );
}
