'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeePerformanceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reports/category-summary');
  }, [router]);

  return (
    <div className="flex h-96 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
    </div>
  );
}
