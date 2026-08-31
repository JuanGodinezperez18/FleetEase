"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useRouter } from 'next/navigation';
import { GlobalLoader } from '@/components/common/GlobalLoader';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) router.replace('/dashboard');
  }, [currentUser, loading, router]);

  if (loading || currentUser) return <GlobalLoader />;

  return <div className="fleetease-auth-modern min-h-screen">{children}</div>;
}
