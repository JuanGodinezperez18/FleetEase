
// app/(client)/layout.tsx
import { ClientSidebar } from '@/components/layout/client-sidebar';
import { Header } from '@/components/layout/header';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // La validación de rol ahora es manejada exclusivamente por el middleware.
  // El layout asume que si el usuario llegó aquí, tiene el rol correcto.
  return (
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
  );
}