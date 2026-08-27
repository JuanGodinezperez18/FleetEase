"use client";

/**
 * @fileoverview Wrapper del Data Provider de Supabase.
 * Compatibilidad con las páginas que usan useClients().
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useData } from '@/contexts/data-provider-supabase';
import type { Client, Credit } from '@/types';

interface ClientsContextValue {
  clients: Client[];
  credits: Credit[];
  loading: boolean;
  refreshClients: () => Promise<void>;
  addClient: (data: Partial<Client>) => Promise<Client>;
  updateClient: (data: Partial<Client> & { id: string }) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
}

const ClientsContext = createContext<ClientsContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
  companyId: string | null;
  isSuperAdmin: boolean;
}

export const ClientsProvider = ({ children }: Props) => {
  const data = useData();

  const value: ClientsContextValue = {
    clients: data.allClients,
    credits: data.credits,
    loading: data.loadingData,
    refreshClients: data.refreshData,
    addClient: data.addClient,
    updateClient: ({ id, ...rest }) => data.updateClient(id, rest),
    deleteClient: data.deleteClient,
  };

  return (
    <ClientsContext.Provider value={value}>
      {children}
    </ClientsContext.Provider>
  );
};

export const useClients = () => {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error('useClients debe usarse dentro de ClientsProvider');
  return ctx;
};
