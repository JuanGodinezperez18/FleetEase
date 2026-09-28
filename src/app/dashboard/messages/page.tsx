"use client";

import React, { useMemo } from 'react';
import { useData } from '@/hooks/use-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Users, Briefcase } from 'lucide-react';
import { MessageSender } from './components/message-sender';

export default function MessagesPage() {
  const { clients, partners, vehicles, companies, users, clientMetrics } = useData();

  const clientOptions = useMemo(() =>
    clients.filter(c => !c.isDeleted && c.status === 'active').map(c => ({
      value: c.id,
      label: `${c.firstname} ${c.lastname}`,
    })), [clients]);

  const partnerOptions = useMemo(() =>
    partners.filter(p => !p.isDeleted).map(p => ({
      value: p.id,
      label: p.name,
    })), [partners]);

  const userOptions = useMemo(() =>
    users.filter(u => !u.isDeleted).map(u => ({
      value: u.uid,
      label: u.name,
    })), [users]);

  return (
    <div className="fe-page-shell space-y-5 sm:space-y-6">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fe-text-faint)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)] shadow-[0_0_12px_var(--fe-lime)]" />
              Operación
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-[var(--fe-text)] sm:text-3xl">
              Mensajería
            </h1>
            <p className="mt-1 text-sm text-[var(--fe-text-muted)]">
              Comunicaciones personalizadas a clientes, socios y usuarios
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--fe-lime)]/15 bg-[var(--fe-lime)]/[0.08] text-[var(--fe-lime)]">
            <Send className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </header>

        <section className="fe-panel-bg overflow-hidden rounded-[14px] shadow-[0_18px_50px_rgba(0,0,0,.16)]">
          <div className="p-4 sm:p-5">
            <Tabs defaultValue="clients">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-[16px] border border-[color:var(--fe-border)] bg-[var(--fe-bg)] p-1">
                <TabsTrigger value="clients" className="rounded-xl text-xs text-[var(--fe-text-secondary)] data-[state=active]:bg-[var(--fe-lime)] data-[state=active]:text-[var(--fe-ink)]">
                  <Users className="mr-1.5 h-4 w-4" strokeWidth={1.75} />Clientes
                </TabsTrigger>
                <TabsTrigger value="partners" className="rounded-xl text-xs text-[var(--fe-text-secondary)] data-[state=active]:bg-[var(--fe-lime)] data-[state=active]:text-[var(--fe-ink)]">
                  <Briefcase className="mr-1.5 h-4 w-4" strokeWidth={1.75} />Socios
                </TabsTrigger>
                <TabsTrigger value="users" className="rounded-xl text-xs text-[var(--fe-text-secondary)] data-[state=active]:bg-[var(--fe-lime)] data-[state=active]:text-[var(--fe-ink)]">
                  <Users className="mr-1.5 h-4 w-4" strokeWidth={1.75} />Usuarios
                </TabsTrigger>
              </TabsList>
              <TabsContent value="clients" className="pt-4">
                <MessageSender
                  type="cliente"
                  options={clientOptions}
                  allClients={clients}
                  allPartners={partners}
                  allVehicles={vehicles}
                  allCompanies={companies}
                  clientMetrics={clientMetrics}
                />
              </TabsContent>
              <TabsContent value="partners" className="pt-4">
                <MessageSender
                  type="socio"
                  options={partnerOptions}
                  allClients={clients}
                  allPartners={partners}
                  allVehicles={vehicles}
                  allCompanies={companies}
                  clientMetrics={clientMetrics}
                />
              </TabsContent>
              <TabsContent value="users" className="pt-4">
                <MessageSender
                  type="usuario"
                  options={userOptions}
                  allClients={clients}
                  allPartners={partners}
                  allVehicles={vehicles}
                  allCompanies={companies}
                  clientMetrics={clientMetrics}
                />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </div>
  );
}
