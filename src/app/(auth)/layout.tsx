
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useRouter } from 'next/navigation';
import { GlobalLoader } from '@/components/common/GlobalLoader';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la carga ha terminado y SÍ hay un usuario, redirigir al dashboard.
    if (!loading && currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, loading, router]);

  // Mientras se verifica el estado de autenticación, mostrar un loader.
  if (loading) {
    return <GlobalLoader />;
  }

  // Si ya hay un usuario, no renderizar nada mientras se redirige para evitar flashes.
  if (currentUser) {
    return <GlobalLoader />;
  }

  // Si no está cargando y no hay usuario, muestra las páginas de autenticación.
  return <>{children}</>;
}
