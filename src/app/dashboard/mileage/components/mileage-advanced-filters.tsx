"use client";

import React from "react";
import type { MileageSearchFilters } from "@/hooks/use-mileage-search";
import type { Company } from "@/types";
import { useAuth } from "@/contexts/auth-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, X, Wrench, Building, Gauge } from "lucide-react";

interface MileageAdvancedFiltersProps {
  filters: MileageSearchFilters;
  onFilterChange: (key: keyof MileageSearchFilters, value: any) => void;
  onReset: () => void;
  onSearch: (query: string) => void;
  totalResults: number;
  companies: Company[];
  isLoading?: boolean;
}

const statusOptions = [
  { value: "all", label: "Todos los estados" },
  { value: "urgent", label: "Urgente" },
  { value: "upcoming", label: "Próximo" },
  { value: "good", label: "Bueno" },
];

export const MileageAdvancedFilters: React.FC<MileageAdvancedFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  onSearch,
  totalResults,
  companies,
}) => {
  const { currentUser } = useAuth();

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.maintenanceStatus !== "all") count++;
    if (currentUser?.role === "superAdmin" && filters.companyId !== "all") count++;
    if (filters.mileageRange.min !== 0 || filters.mileageRange.max !== 500000) count++;
    return count;
  }, [filters, currentUser]);

  const handleMileageSliderChange = (values: number[]) => {
    onFilterChange("mileageRange", { min: values[0], max: values[1] });
  };

  return (
    <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
          {totalResults} vehículo{totalResults !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" strokeWidth={1.75} />
            <Input
              placeholder="Buscar por marca, modelo, placa..."
              onChange={e => onSearch(e.target.value)}
              className="border-white/10 bg-white/[0.03] pl-10 text-white"
              defaultValue={filters.query}
            />
          </div>

          <Select value={filters.maintenanceStatus} onValueChange={value => onFilterChange("maintenanceStatus", value)}>
            <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
              <div className="flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5 text-white/40" strokeWidth={1.75} />
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
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-white/[0.06] pt-4 md:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center text-xs font-medium text-white/50">
              <Gauge className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              Rango de kilometraje
            </label>
            <Slider
              defaultValue={[filters.mileageRange.min, filters.mileageRange.max]}
              max={500000}
              min={0}
              step={10000}
              onValueCommit={handleMileageSliderChange}
            />
            <div className="mt-1 flex justify-between text-[11px] text-white/35">
              <span>{filters.mileageRange.min.toLocaleString()} km</span>
              <span>{filters.mileageRange.max.toLocaleString()} km</span>
            </div>
          </div>

          {currentUser?.role === "superAdmin" && (
            <div>
              <label className="mb-2 flex items-center text-xs font-medium text-white/50">
                <Building className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                Empresa
              </label>
              <Select value={filters.companyId} onValueChange={value => onFilterChange("companyId", value)}>
                <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las empresas</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

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
