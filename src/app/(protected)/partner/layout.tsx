
// app/(partner)/layout.tsx
import { PartnerSidebar } from '@/components/layout/partner-sidebar';
import { Header } from '@/components/layout/header';
import { PortalRoleGuard } from '@/components/common/portal-role-guard';

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalRoleGuard portal="partner">
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <PartnerSidebar />

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
    </PortalRoleGuard>
  );
}
