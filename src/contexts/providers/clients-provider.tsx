"use client";

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientService, creditService, db } from '@/lib/firestore-services';
import type { Client, Credit } from '@/types';
import { logger } from '@/lib/logger';
import { collection, doc, getDocs, query, runTransaction, where, writeBatch } from 'firebase/firestore';

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

export const ClientsProvider = ({ children, companyId, isSuperAdmin }: Props) => {
  const queryClient = useQueryClient();

  const clientsQuery = useQuery({
    queryKey: ['clients', companyId, isSuperAdmin],
    queryFn: () => clientService.getAll().then(list => {
      if (isSuperAdmin && !companyId) return list;
      if (!companyId) return [];
      return list.filter(c => (c as any).companyId === companyId);
    }),
    staleTime: 5 * 60 * 1000,
  });

  const creditsQuery = useQuery({
    queryKey: ['credits', companyId, isSuperAdmin],
    queryFn: () => creditService.getAll().then(list => {
      if (isSuperAdmin && !companyId) return list;
      if (!companyId) return [];
      return list.filter(c => (c as any).companyId === companyId);
    }),
    staleTime: 5 * 60 * 1000,
  });

  const refreshClients = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (error) {
      logger.error('[ClientsProvider] Error refrescando clientes', error as Error);
    }
  };

  const addClient = useMutation({
    mutationFn: async (data: Partial<Client>) => {
      const newClient = await clientService.add(data as any);

      if (data.assignedVehicleId && data.companyId) {
        await runTransaction(db, async (transaction) => {
          const assignmentRef = doc(collection(db, 'vehicleAssignmentLogs'));
          const now = new Date().toISOString();
          transaction.set(assignmentRef, {
            vehicleId: data.assignedVehicleId!,
            clientId: newClient.id,
            companyId: data.companyId,
            assignedAt: now,
            startDate: now,
            assignedBy: (data as any).createdBy || 'system',
            createdAt: now,
          });

          const vehicleRef = doc(db, 'vehicles', data.assignedVehicleId!);
          transaction.update(vehicleRef, {
            clientId: newClient.id,
            status: 'rented',
            updatedAt: now,
          });
        });

        await queryClient.invalidateQueries({ queryKey: ['vehicleAssignmentLogs'] });
        await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }

      return newClient;
    },
    onSuccess: () => refreshClients(),
    onError: (error) => logger.error('[ClientsProvider] Error al crear cliente', error as Error),
  });

  const updateClient = useMutation({
    mutationFn: async (data: Partial<Client> & { id: string }) => {
      const clients = (queryClient.getQueryData(['clients', companyId, isSuperAdmin]) as Client[] | undefined) || [];
      const previousClient = clients.find(c => c.id === data.id);
      const previousVehicleId = previousClient?.assignedVehicleId;
      const newVehicleId = data.assignedVehicleId;
      const now = new Date().toISOString();

      await clientService.update(data.id, data);

      if (previousVehicleId !== newVehicleId) {
        // cerrar asignación anterior
        if (previousVehicleId) {
          const logsQuery = query(
            collection(db, 'vehicleAssignmentLogs'),
            where('vehicleId', '==', previousVehicleId),
            where('clientId', '==', data.id)
          );
          const logsSnapshot = await getDocs(logsQuery);
          const batch = writeBatch(db);
          logsSnapshot.docs.forEach(logDoc => {
            const logData = logDoc.data();
            if (!logData.endDate && !logData.unassignedAt) {
              batch.update(logDoc.ref, {
                endDate: now,
                unassignedAt: now,
              });
            }
          });

          const prevVehicleRef = doc(db, 'vehicles', previousVehicleId);
          batch.update(prevVehicleRef, {
            clientId: null,
            status: 'active',
            updatedAt: now,
          });
          await batch.commit();
        }

        // crear nueva asignación
        if (newVehicleId && (data.companyId || previousClient?.companyId)) {
          const batch = writeBatch(db);
          const assignmentRef = doc(collection(db, 'vehicleAssignmentLogs'));
          batch.set(assignmentRef, {
            vehicleId: newVehicleId,
            clientId: data.id,
            companyId: data.companyId || previousClient?.companyId,
            assignedAt: now,
            startDate: now,
            assignedBy: (data as any).updatedBy || 'system',
            createdAt: now,
          });

          const newVehicleRef = doc(db, 'vehicles', newVehicleId);
          batch.update(newVehicleRef, {
            clientId: data.id,
            status: 'rented',
            updatedAt: now,
          });

          await batch.commit();
        }

        await queryClient.invalidateQueries({ queryKey: ['vehicleAssignmentLogs'] });
        await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }
    },
    onSuccess: () => refreshClients(),
    onError: (error) => logger.error('[ClientsProvider] Error al actualizar cliente', error as Error),
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => clientService.softDelete(id),
    onSuccess: () => refreshClients(),
    onError: (error) => logger.error('[ClientsProvider] Error al eliminar cliente', error as Error),
  });

  const value = useMemo(() => ({
    clients: clientsQuery.data || [],
    credits: creditsQuery.data || [],
    loading: clientsQuery.isLoading || creditsQuery.isLoading,
    refreshClients,
    addClient: (data: Partial<Client>) => addClient.mutateAsync(data),
    updateClient: (data: Partial<Client> & { id: string }) => updateClient.mutateAsync(data),
    deleteClient: (id: string) => deleteClient.mutateAsync(id),
  }), [
    clientsQuery.data,
    creditsQuery.data,
    clientsQuery.isLoading,
    creditsQuery.isLoading,
    addClient,
    updateClient,
    deleteClient,
  ]);

  if (clientsQuery.isLoading && creditsQuery.isLoading) return null;

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
