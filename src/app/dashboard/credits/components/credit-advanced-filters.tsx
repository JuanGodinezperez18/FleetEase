"use client";

import React from "react";
import type { CreditSearchFilters } from "@/hooks/use-credits-search";
import type { Client, Vehicle } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, X, DollarSign, BarChart, Activity, Percent, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CreditAdvancedFiltersProps {
  filters: CreditSearchFilters;
  onFilterChange: (key: keyof CreditSearchFilters, value: any) => void;
  onReset: () => void;
  onSearch: (query: string) => void;
  totalResults: number;
  clients: Client[];
  vehicles: Vehicle[];
  isLoading?: boolean;
}

const behaviorOptions = [
  { value: "all", label: "Todo comportamiento" },
  { value: "Puntual", label: "Puntual" },
  { value: "Ligero Retraso", label: "Ligero retraso" },
  { value: "Retraso Severo", label: "Retraso severo" },
];

const statusOptions = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "completed", label: "Completado" },
  { value: "defaulted", label: "Incumplido" },
  { value: "inactive", label: "Inactivo" },
];

export const CreditAdvancedFilters: React.FC<CreditAdvancedFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  onSearch,
  totalResults,
  clients,
  vehicles,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.paymentBehavior !== "all") count++;
    if (filters.status !== "all") count++;
    if (filters.clientId !== "all") count++;
    if (filters.progressRange.min !== 0 || filters.progressRange.max !== 100) count++;
    if (filters.balanceRange.min !== 0 || filters.balanceRange.max !== 500000) count++;
    return count;
  }, [filters]);

  const handleProgressSliderChange = (values: number[]) => {
    onFilterChange("progressRange", { min: values[0], max: values[1] });
  };

  const handleBalanceSliderChange = (values: number[]) => {
    onFilterChange("balanceRange", { min: values[0], max: values[1] });
  };

  return (
    <section className="fe-filter-surface">
      <div className="fe-filter-header">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-white/35" strokeWidth={1.75} />
          <h2 className="font-heading text-base font-semibold text-white">Filtros</h2>
          {activeFiltersCount > 0 && (
            <span className="rounded-full border border-[#d7ff3f]/20 bg-[#d7ff3f]/10 px-2 py-0.5 text-[10px] font-semibold text-[#d7ff3f]">
              {activeFiltersCount} activo{activeFiltersCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-white/50">
          {totalResults} resultado{totalResults !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="fe-filter-body space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" strokeWidth={1.75} />
          <Input
            placeholder="Buscar por cliente, placa..."
            onChange={e => onSearch(e.target.value)}
            className="pl-10"
            defaultValue={filters.query}
          />
        </div>

        <div className="fe-filter-grid">
          <Select value={filters.status} onValueChange={value => onFilterChange("status", value)}>
            <SelectTrigger className="fe-filter-control">
              <div className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-white/40" strokeWidth={1.75} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.paymentBehavior} onValueChange={value => onFilterChange("paymentBehavior", value)}>
            <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
              <div className="flex items-center gap-1">
                <BarChart className="h-3.5 w-3.5 text-white/40" strokeWidth={1.75} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {behaviorOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={value => onFilterChange("clientId", value)} value={filters.clientId || "all"}>
            <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-white/40" strokeWidth={1.75} />
                <SelectValue placeholder="Clientes" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients
                .filter(c => c.status === "active" && !c.isDeleted)
                .sort((a, b) => `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`))
                .map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstname} {client.lastname}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="fe-filter-control w-full border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <Filter className="mr-2 h-4 w-4" strokeWidth={1.75} />
            {isExpanded ? "Ocultar" : "Más filtros"}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-6 border-t border-white/[0.06] pt-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center text-xs font-medium text-white/50">
                  <Percent className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                  Progreso
                </label>
                <Slider
                  defaultValue={[filters.progressRange.min, filters.progressRange.max]}
                  max={100}
                  min={0}
                  step={5}
                  onValueCommit={handleProgressSliderChange}
                />
                <div className="mt-1 flex justify-between text-[11px] text-white/35">
                  <span>{filters.progressRange.min}%</span>
                  <span>{filters.progressRange.max}%</span>
                </div>
              </div>
              <div>
                <label className="mb-2 flex items-center text-xs font-medium text-white/50">
                  <DollarSign className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                  Saldo pendiente
                </label>
                <Slider
                  defaultValue={[filters.balanceRange.min, filters.balanceRange.max]}
                  max={500000}
                  min={0}
                  step={10000}
                  onValueCommit={handleBalanceSliderChange}
                />
                <div className="mt-1 flex justify-between text-[11px] text-white/35">
                  <span>{formatCurrency(filters.balanceRange.min)}</span>
                  <span>{formatCurrency(filters.balanceRange.max)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-3">
          <Button
            variant="ghost"
            onClick={onReset}
            disabled={activeFiltersCount === 0}
            className="text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Limpiar filtros
          </Button>
        </div>
      </div>
    </section>
  );
};
