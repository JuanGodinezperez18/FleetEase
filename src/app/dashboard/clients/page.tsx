"use client";

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, MoreHorizontal, Eye, Edit, Trash2, FileText, Filter, User, Car, Phone, Banknote } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import type { Client, Company, Vehicle, ClientWithMetrics } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { FormModal } from '@/components/common/form-modal';
import { ClientForm, type ClientFormValues } from './components/client-form';
import { ClientOffboardingDialog, type ClientOffboardingResult } from '@/components/dashboard/client-offboarding-dialog';
import { offboardClientWithWriteOff } from '@/lib/client-offboarding';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getColumns } from './columns';
import { toast } from 'sonner';
import { useAdvancedClientSearch } from '@/hooks/use-advanced-client-search';
import { ClientDashboard } from './components/client-dashboard';
import { AdvancedSearchPanel } from './components/advanced-filters';
import { useExportData, type ExportOptions } from '@/hooks/use-export-data';
import { ClientListModal } from '@/components/dashboard/components/client-list-modal';
import { sanitizeAndFormatData, formatCurrency } from '@/lib/utils';
import { useDOMSafeModal } from '@/components/common/dom-safe-wrapper';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RowSelectionState } from '@tanstack/react-table';
import { useAuth } from '@/contexts/auth-provider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useStorage, type StorageFolderPath } from '@/hooks/use-storage';
import { ExportDialog } from './components/export-dialog';
import {
  PaymentRiskBadge,
  LicenseStatusBadge,
} from '@/components/clients/client-status-badges';

const ClientMobileCard = ({
  client,
  onEdit,
  onDelete,
  onNavigate,
}: {
  client: any;
  onEdit: (c: Client) => void;
  onDelete: (c: Client) => void;
  onNavigate: (path: string) => void;
}) => {
  const name = `${client.firstname || ''} ${client.lastname || ''}`.trim();
  const balance = Number(client.balance) || 0;
  const plate = client.assignedVehiclePlate || client.vehiclePlate || null;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(`/dashboard/clients/${client.id}/transactions`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(`/dashboard/clients/${client.id}/transactions`);
        }
      }}
      className="group relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_14px_40px_rgba(0,0,0,.2)] transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        {client.photoUrl && typeof client.photoUrl === 'string' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={client.photoUrl}
            alt={name}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
            <User className="h-5 w-5" strokeWidth={1.75} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-heading text-base font-semibold tracking-tight text-white">
                {name || 'Sin nombre'}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <PaymentRiskBadge level={client.paymentBehavior} />
                <LicenseStatusBadge status={client.licenseStatus} />
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Acciones del cliente"
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem onSelect={() => onEdit(client)} onClick={(e) => e.stopPropagation()}>
                  <Edit className="mr-2 h-4 w-4" strokeWidth={1.75} /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/clients/${client.id}/documents`)} onClick={(e) => e.stopPropagation()}>
                  <FileText className="mr-2 h-4 w-4" strokeWidth={1.75} /> Documentos
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/clients/${client.id}/transactions`)} onClick={(e) => e.stopPropagation()}>
                  <Eye className="mr-2 h-4 w-4" strokeWidth={1.75} /> Transacciones
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(client)} onClick={(e) => e.stopPropagation()}>
                  <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.75} /> Dar de baja
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
              <span className={balance > 0 ? 'font-semibold text-rose-300' : 'text-white/70'}>
                {formatCurrency(balance)}
              </span>
            </span>
            {plate && (
              <span className="inline-flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
                <span className="font-medium text-white/70">{plate}</span>
              </span>
            )}
            {client.phone && (
              <span className="inline-flex items-center gap-1.5 truncate">
                <Phone className="h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
                {client.phone}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

// NOTE: Full page body continues in follow-up commit if needed.
// Temporary bridge: re-export logic requires full handlers - see restore.
export { default } from './page-body';
