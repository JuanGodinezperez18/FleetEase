"use client";

import React, { useMemo } from "react";
import { useData } from "@/hooks/use-data";
import { useAuth } from "@/contexts/auth-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building } from "lucide-react";

export function CompanySwitcher() {
  const { companies, selectedCompanyId, setSelectedCompanyId } = useData();
  const { currentUser } = useAuth();

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => a.name.localeCompare(b.name));
  }, [companies]);

  const handleValueChange = (value: string) => {
    setSelectedCompanyId(value === "all" ? null : value);
  };

  const selectedCompanyName = useMemo(() => {
    if (!selectedCompanyId) return "Todas las empresas";
    return companies.find(c => c.id === selectedCompanyId)?.name || "Seleccionar empresa";
  }, [selectedCompanyId, companies]);

  if (currentUser?.role !== "superAdmin") {
    return null;
  }

  return (
    <div className="w-full">
      <Select value={selectedCompanyId || "all"} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2 truncate">
            <Building className="h-4 w-4 shrink-0 text-[var(--fe-text-muted)]" strokeWidth={1.75} />
            <SelectValue asChild>
              <span className="truncate text-sm">{selectedCompanyName}</span>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las empresas</SelectItem>
          {sortedCompanies.map(company => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
