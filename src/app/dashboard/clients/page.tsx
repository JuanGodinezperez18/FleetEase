--- a/src/app/dashboard/clients/page.tsx
+++ b/src/app/dashboard/clients/page.tsx
@@ -2,7 +2,7 @@
 
 import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
 import { Button } from '@/components/ui/button';
-import { PlusCircle, Download, MoreHorizontal, Eye, Edit, Trash2, FileText, Filter } from 'lucide-react';
+import { PlusCircle, Download, Trash2, Filter } from 'lucide-react';
 import { useData } from '@/hooks/use-data';
 import type { Client, Company, Vehicle, ClientWithMetrics } from '@/types';
 import { ResponsiveTable } from '@/components/common/ResponsiveTable';
@@ -29,42 +29,7 @@
 import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
 import { useStorage, type StorageFolderPath } from '@/hooks/use-storage';
 import { ExportDialog } from './components/export-dialog';
-
-const ClientMobileCard = ({ client, onEdit, onDelete, onNavigate }: { client: any, onEdit: (c: Client) => void, onDelete: (c: Client) => void, onNavigate: (path: string) => void }) => (
-  <Card className="p-4">
-    <div className="flex items-start justify-between">
-      <div className="space-y-2">
-        <h3 className="font-medium">{client.firstname} {client.lastname}</h3>
-        <div className="text-sm text-muted-foreground space-y-1">
-          <p>📧 {client.email}</p>
-          <p>📞 {client.phone}</p>
-          <p>💰 Balance: <span className="font-medium">{formatCurrency(client.balance || 0)}</span></p>
-        </div>
-      </div>
-      <DropdownMenu>
-        <DropdownMenuTrigger asChild>
-          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
-            <MoreHorizontal className="h-4 w-4" />
-          </Button>
-        </DropdownMenuTrigger>
-        <DropdownMenuContent align="end">
-            <DropdownMenuItem onSelect={() => onEdit(client)}>
-              <Edit className="mr-2 h-4 w-4" /> Editar
-            </DropdownMenuItem>
-            <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/clients/${client.id}/documents`)}>
-                <FileText className="mr-2 h-4 w-4" /> Ver Documentos
-            </DropdownMenuItem>
-            <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/clients/${client.id}/transactions`)}>
-                <Eye className="mr-2 h-4 w-4" /> Ver Transacciones
-            </DropdownMenuItem>
-            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(client)}>
-                <Trash2 className="mr-2 h-4 w-4" /> Dar de baja
-            </DropdownMenuItem>
-        </DropdownMenuContent>
-      </DropdownMenu>
-    </div>
-  </Card>
-);
+import { ClientMobileCard } from './components/client-mobile-card';
 
 export default function ClientsPage() {
   const router = useRouter();
@@ -472,45 +437,35 @@
   const selectedCount = Object.keys(rowSelection).length;
 
   if (loadingData && !clients.length) {
-    return <p>Cargando clientes...</p>;
+    return (
+      <div className="space-y-4 p-4 sm:p-6">
+        <div className="h-10 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
+        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
+          {[1, 2, 3, 4].map((i) => (
+            <div key={i} className="h-32 animate-pulse rounded-[20px] border border-white/[0.07] bg-[#0e1117]" />
+          ))}
+        </div>
+        <div className="h-64 animate-pulse rounded-[20px] border border-white/[0.07] bg-[#0e1117]" />
+      </div>
+    );
   }
 
   return (
-    <div className="space-y-6">
-        {showDashboard && <ClientDashboard clients={clients} clientMetrics={clientMetrics} onCardClick={handleCardClick} />}
-
-        <Accordion type="single" collapsible className="w-full" defaultValue="filters">
-            <AccordionItem value="filters">
-                <AccordionTrigger className="px-4 py-2 bg-card rounded-t-lg border-b">
-                    <div className="flex items-center gap-2">
-                        <Filter className="w-5 h-5" />
-                        <span className="font-semibold">Búsqueda Avanzada</span>
-                        {activeFiltersCount > 0 && (
-                            <Badge variant="secondary">{activeFiltersCount} activos</Badge>
-                        )}
-                    </div>
-                </AccordionTrigger>
-                <AccordionContent>
-                     <AdvancedSearchPanel
-                        filters={filters}
-                        updateFilter={updateFilter}
-                        resetFilters={resetFilters}
-                        activeFiltersCount={activeFiltersCount}
-                    />
-                </AccordionContent>
-            </AccordionItem>
-        </Accordion>
-        
-        <Card>
-          <CardHeader>
-            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
-              <div>
-                <CardTitle className="text-lg">Gestión de Clientes</CardTitle>
-                <p className="text-sm text-muted-foreground">
-                  Administra la información y el estado de tus clientes. {selectedCount > 0 && `${selectedCount} seleccionado(s).`}
-                </p>
-              </div>
-              <div className="flex items-center gap-2 flex-wrap">
+    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
+      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
+      <div className="relative z-10 space-y-5 sm:space-y-6">
+        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
+          <div>
+            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
+              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
+              Operación
+            </div>
+            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">Clientes</h1>
+            <p className="mt-1 text-sm text-white/40">
+              {selectedCount > 0 ? `${selectedCount} seleccionado(s)` : `${filteredAndSortedClients.length} en esta vista`}
+            </p>
+          </div>
+          <div className="flex flex-wrap items-center gap-2">
                   {selectedCount > 0 ? (
                     <>
                       <Button variant="outline" onClick={() => handleExport({filename: 'seleccion_clientes'})}>
@@ -536,19 +491,47 @@
                         </Button>
                       </ExportDialog>
                       
-                      {showDashboard && (
-                        <Button data-add-button="true" onClick={() => handleOpenModalWithClient()}>
-                          <PlusCircle className="mr-2 h-4 w-4" />
-                          Agregar Cliente
-                        </Button>
-                      )}
+                      <Button
+                        data-add-button="true"
+                        onClick={() => handleOpenModalWithClient()}
+                        className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
+                      >
+                        <PlusCircle className="mr-2 h-4 w-4" strokeWidth={1.75} />
+                        Agregar cliente
+                      </Button>
                     </>
                   )}
+          </div>
+        </header>
+
+        {showDashboard && (
+          <ClientDashboard clients={clients} clientMetrics={clientMetrics} onCardClick={handleCardClick} />
+        )}
+
+        <Accordion type="single" collapsible className="w-full" defaultValue="">
+          <AccordionItem value="filters" className="border-white/[0.07]">
+            <AccordionTrigger className="rounded-2xl border border-white/[0.07] bg-[#0e1117] px-4 py-3 hover:no-underline data-[state=open]:rounded-b-none">
+              <div className="flex items-center gap-2 text-sm text-white/70">
+                <Filter className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
+                <span className="font-semibold">Filtros</span>
+                {activeFiltersCount > 0 && (
+                  <Badge className="border-[#d7ff3f]/20 bg-[#d7ff3f]/10 text-[10px] text-[#d7ff3f]">{activeFiltersCount}</Badge>
+                )}
               </div>
-            </div>
-          </CardHeader>
-          
-          <CardContent>
+            </AccordionTrigger>
+            <AccordionContent className="rounded-b-2xl border border-t-0 border-white/[0.07] bg-[#0e1117] px-3 pb-3">
+              <AdvancedSearchPanel
+                filters={filters}
+                updateFilter={updateFilter}
+                resetFilters={resetFilters}
+                activeFiltersCount={activeFiltersCount}
+              />
+            </AccordionContent>
+          </AccordionItem>
+        </Accordion>
+
+        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
+          <div className="p-4 sm:p-5">
              <ResponsiveTable
               data={filteredAndSortedClients}
               columns={columns}
@@ -557,18 +540,24 @@
               noResultsText="No se encontraron clientes con los filtros aplicados."
               rowSelection={rowSelection}
               setRowSelection={setRowSelection}
-              mobileCardRenderer={(client) => (
-                <ClientMobileCard 
-                  client={client}
-                  onEdit={handleOpenModalWithClient}
-                  onDelete={handleDeleteRequest}
-                  onNavigate={(path) => router.push(path)}
-                />
-              )}
+              mobileCardRenderer={(client) => {
+                const vehicle = client.assignedVehicleId
+                  ? vehicles.find((v) => v.id === client.assignedVehicleId)
+                  : undefined;
+                return (
+                  <ClientMobileCard
+                    client={{ ...client, assignedVehiclePlate: vehicle?.plate }}
+                    onEdit={handleOpenModalWithClient}
+                    onDelete={handleDeleteRequest}
+                    onNavigate={(path) => router.push(path)}
+                  />
+                );
+              }}
             />
-          </CardContent>
-        </Card>
-      
+          </div>
+        </section>
+      </div>
+
       <ClientListModal
         isOpen={isListModalOpen}
         onClose={() => setIsListModalOpen(false)}
