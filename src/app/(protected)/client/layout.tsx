
// app/(client)/layout.tsx
import { ClientSidebar } from '@/components/layout/client-sidebar';
import { Header } from '@/components/layout/header';
import { PortalRoleGuard } from '@/components/common/portal-role-guard';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalRoleGuard portal="client">
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ClientSidebar />

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
