
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/contexts/data-provider';
import { VehiclesProvider } from '@/contexts/providers/vehicles-provider';
import { ClientsProvider } from '@/contexts/providers/clients-provider';
import { FinancesProvider } from '@/contexts/providers/finances-provider';
import { useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { DashboardDateProvider } from '@/contexts/dashboard-date-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading } = useAuth();
  const { selectedCompanyId } = useData();
  const router = useRouter();

  const isSuperAdmin = currentUser?.role === 'superAdmin';

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  if (loading || !currentUser) {
    return <GlobalLoader />;
  }

  return (
    <DashboardDateProvider>
      <VehiclesProvider companyId={selectedCompanyId} isSuperAdmin={isSuperAdmin}>
        <ClientsProvider companyId={selectedCompanyId} isSuperAdmin={isSuperAdmin}>
          <FinancesProvider companyId={selectedCompanyId} isSuperAdmin={isSuperAdmin}>
            <SidebarLayout>
              {children}
            </SidebarLayout>
          </FinancesProvider>
        </ClientsProvider>
      </VehiclesProvider>
    </DashboardDateProvider>
  );
}
