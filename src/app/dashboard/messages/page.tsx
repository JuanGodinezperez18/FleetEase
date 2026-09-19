"use client";

import React, { useMemo } from 'react';
import { useData } from '@/hooks/use-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Users, Briefcase } from 'lucide-react';
import { useClientAnalytics } from '@/hooks/use-client-analytics';
import { MessageSender } from './components/message-sender';

export default function MessagesPage() {
  const { clients, partners, vehicles, companies, users } = useData();
  const { clientMetrics } = useClientAnalytics(clients, [], vehicles);

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
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Operaci\u00f3n
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Mensajer\u00eda
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Comunicaciones personalizadas a clientes, socios y usuarios
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
            <Send className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </header>

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="p-4 sm:p-5">
            <Tabs defaultValue="clients">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-[16px] border border-white/[0.07] bg-[#080a0f] p-1">
                <TabsTrigger value="clients" className="rounded-xl text-xs text-white/50 data-[state=active]:bg-[#d7ff3f] data-[state=active]:text-[#080a0f]">
                  <Users className="mr-1.5 h-4 w-4" strokeWidth={1.75} />Clientes
                </TabsTrigger>
                <TabsTrigger value="partners" className="rounded-xl text-xs text-white/50 data-[state=active]:bg-[#d7ff3f] data-[state=active]:text-[#080a0f]">
                  <Briefcase className="mr-1.5 h-4 w-4" strokeWidth={1.75} />Socios
                </TabsTrigger>
                <TabsTrigger value="users" className="rounded-xl text-xs text-white/50 data-[state=active]:bg-[#d7ff3f] data-[state=active]:text-[#080a0f]">
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
