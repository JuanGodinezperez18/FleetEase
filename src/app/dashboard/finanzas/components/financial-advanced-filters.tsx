

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { NativeDateRangePicker } from '@/components/ui/native-date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Briefcase } from 'lucide-react';
import type { Company, Partner } from '@/types';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/auth-provider';

interface FinancialAdvancedFiltersProps {
  companies: Company[];
  partners: Partner[];
  onDateChange: (date: DateRange | undefined) => void;
  onCompanyChange: (companyId: string) => void;
  onPartnerChange: (partnerId: string) => void;
}

export const FinancialAdvancedFilters: React.FC<FinancialAdvancedFiltersProps> = ({
  companies,
  partners,
  onDateChange,
  onCompanyChange,
  onPartnerChange,
}) => {
  const { currentUser } = useAuth();
  const [date, setDate] = React.useState<DateRange | undefined>();

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    onDateChange(newDate);
  };
  
  return (
    <div className="flex flex-wrap items-center gap-4">
      <NativeDateRangePicker date={date} onDateChange={handleDateChange} />

      {currentUser?.role === 'superAdmin' && (
        <Select onValueChange={onCompanyChange} defaultValue="all">
          <SelectTrigger className="w-[220px]">
            <Building className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Todas las Empresas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Empresas</SelectItem>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <Select onValueChange={onPartnerChange} defaultValue="all">
        <SelectTrigger className="w-[220px]">
          <Briefcase className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Todos los Socios" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los Socios</SelectItem>
           <SelectItem value="none">Sin Socio (Interno)</SelectItem>
          {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
};
