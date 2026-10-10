'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Search as SearchBar } from '@/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Camera,
  MapPin,
  User,
  Car,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MetricCard } from '@/components/dashboard/components/MetricCard';
import { TrackingModal } from '@/components/camera/tracking-modal';

interface Seguimiento {
  id: string;
  vehicle_id: string;
  client_id: string | null;
  user_id: string | null;
  client_name?: string;
  vehicle_alias?: string;
  photo_url: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timestamp: string;
  created_by: string;
  company_id: string;
}

const ITEMS_PER_PAGE = 12;

export default function SeguimientosPage() {
  const { currentUser } = useAuth();
  const { vehicles, clients } = useData();

  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<Seguimiento | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isVehiclePickerOpen, setIsVehiclePickerOpen] = useState(false);
  const [inspectionVehicleId, setInspectionVehicleId] = useState('');

  const loadSeguimientos = useCallback(async () => {
    if (!currentUser?.companyId) return;
    const companyId = currentUser.companyId;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seguimientos')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data || []) as Array<{
        id: string;
        vehicle_id: string;
        client_id: string | null;
        company_id: string | null;
        created_by: string;
        notes: string | null;
        photo_url: string | null;
        latitude: number | null;
        longitude: number | null;
        timestamp: string;
      }>;
      const mapped = rows.map((row) => {
        const vehicle = vehicles?.find(v => v.id === row.vehicle_id);
        const client = clients?.find(c => c.id === row.client_id);
        return {
          id: row.id,
          vehicle_id: row.vehicle_id,
          client_id: row.client_id,
          user_id: row.created_by,
          client_name: client ? `${client.firstname} ${client.lastname}`.trim() : 'Desconocido',
          vehicle_alias: vehicle?.alias || vehicle?.plate || 'Desconocido',
          photo_url: row.photo_url || '',
          description: row.notes,
          latitude: row.latitude,
          longitude: row.longitude,
          timestamp: row.timestamp,
          created_by: row.created_by,
          company_id: row.company_id || companyId,
        };
      });
      setSeguimientos(mapped);
    } catch (error) {
      console.error('Error cargando seguimientos:', error);
      toast.error('Error al cargar seguimientos');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.companyId, vehicles, clients]);

  useEffect(() => {
    if (currentUser?.companyId) loadSeguimientos();
  }, [loadSeguimientos, currentUser?.companyId]);

  const filteredSeguimientos = useMemo(() => {
    return seguimientos.filter(seg => {
      const vehicle = vehicles?.find(v => v.id === seg.vehicle_id);
      const client = clients?.find(c => c.id === seg.client_id);
      const vehicleAlias = vehicle?.alias || vehicle?.plate || 'Desconocido';
      const clientName = client ? `${client.firstname} ${client.lastname}` : 'Desconocido';
      const matchesSearch =
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicleAlias.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seg.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVehicle = selectedVehicle === 'all' || seg.vehicle_id === selectedVehicle;
      return matchesSearch && matchesVehicle;
    });
  }, [seguimientos, searchTerm, selectedVehicle, vehicles, clients]);

  const paginatedSeguimientos = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredSeguimientos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSeguimientos, page]);

  const totalPages = Math.ceil(filteredSeguimientos.length / ITEMS_PER_PAGE) || 1;
  const inspectionVehicle = vehicles?.find(vehicle => vehicle.id === inspectionVehicleId && !vehicle.isDeleted);
  const activeVehicles = vehicles?.filter(vehicle => !vehicle.isDeleted) ?? [];

  const weeklyIssues = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    return seguimientos.flatMap(seg => {
      if (new Date(seg.timestamp) < since || !seg.description?.includes('INSPECCIÓN FÍSICA')) return [];
      return seg.description
        .split('\n')
        .filter(line => line.startsWith('- ') && line.includes(': No'))
        .map((line, index) => ({
          id: `${seg.id}-${index}`,
          vehicle: seg.vehicle_alias || 'Vehículo',
          timestamp: seg.timestamp,
          issue: line.replace(/^-\s*/, ''),
        }));
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [seguimientos]);

  const stats = useMemo(() => {
    const withLocation = seguimientos.filter(s => s.latitude && s.longitude).length;
    const uniqueVehicles = new Set(seguimientos.map(s => s.vehicle_id)).size;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = seguimientos.filter(s => new Date(s.timestamp) >= today).length;
    return {
      total: seguimientos.length,
      withLocation,
      uniqueVehicles,
      todayCount,
    };
  }, [seguimientos]);

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Imagen descargada');
    } catch {
      toast.error('Error al descargar imagen');
    }
  };

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="fe-module-header">
          <div>
            <div className="fe-module-eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Operación
            </div>
            <h1 className="fe-module-title">
              Seguimientos fotográficos
            </h1>
            <p className="fe-module-subtitle">Inspecciones, fotografías y fallas reportadas de la flota</p>
            <p className="mt-2 text-xs text-white/45">Elige el vehículo al iniciar cada inspección.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <div className="flex h-12 w-12 items-center justify-center self-start rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f] sm:self-auto">
              <Camera className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <Button
              onClick={() => {
                if (activeVehicles.length === 0) {
                  toast.error('Primero debes registrar un vehículo activo.');
                  return;
                }
                setInspectionVehicleId('');
                setIsVehiclePickerOpen(true);
              }}
              className="h-11 w-full rounded-xl bg-[#d7ff3f] text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90 sm:w-auto"
            >
              <Camera className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Nueva inspección
            </Button>
            <Button
              onClick={loadSeguimientos}
              variant="outline"
              className="h-11 w-full rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white sm:w-auto"
            >
              <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Actualizar
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total"
            value={String(stats.total)}
            description="Registros"
            icon={<Camera className="h-5 w-5" strokeWidth={1.75} />}
          />
          <MetricCard
            title="Hoy"
            value={String(stats.todayCount)}
            description="Capturas del día"
            icon={<ImageIcon className="h-5 w-5" strokeWidth={1.75} />}
          />
          <MetricCard
            title="Vehículos"
            value={String(stats.uniqueVehicles)}
            description="Con seguimiento"
            icon={<Car className="h-5 w-5" strokeWidth={1.75} />}
          />
          <MetricCard
            title="Con ubicación"
            value={String(stats.withLocation)}
            description="GPS disponible"
            icon={<MapPin className="h-5 w-5" strokeWidth={1.75} />}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 sm:flex-row sm:items-center sm:p-5">
          <SearchBar
            placeholder="Buscar cliente, vehículo o descripción..."
            value={searchTerm}
            onValueChange={v => {
              setSearchTerm(v);
              setPage(1);
            }}
            width={280}
          />
          <Select
            value={selectedVehicle}
            onValueChange={value => {
              setSelectedVehicle(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full border-white/10 bg-white/[0.03] text-white sm:w-[220px]">
              <SelectValue placeholder="Vehículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los vehículos</SelectItem>
              {vehicles
                ?.filter(v => !v.isDeleted)
                .map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.alias || v.plate}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <section className="space-y-3 rounded-[14px] border border-amber-400/15 bg-amber-400/[0.035] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Hallazgos de los últimos 7 días</h2>
              <p className="mt-1 text-xs text-white/45">Fallas detectadas en las inspecciones recientes. Confirma su reparación antes de considerarlas atendidas.</p>
            </div>
            <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">{weeklyIssues.length}</span>
          </div>
          {weeklyIssues.length === 0 ? (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-white/45">No hay fallas registradas en las inspecciones de los últimos 7 días.</p>
          ) : (
            <div className="space-y-2">
              {weeklyIssues.map(issue => (
                <article key={issue.id} className="flex flex-col gap-1.5 rounded-lg border border-white/[0.07] bg-black/10 p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-white/85">{issue.issue}</p>
                    <p className="mt-1 text-xs text-white/45">{issue.vehicle}</p>
                  </div>
                  <time className="shrink-0 text-[11px] text-white/35">{format(new Date(issue.timestamp), 'dd MMM yyyy, HH:mm', { locale: es })}</time>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117]"
              >
                <div className="h-44 animate-pulse bg-white/[0.04]" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : paginatedSeguimientos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[14px] border border-white/[0.07] bg-[#0e1117] py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-white/30">
              <Camera className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading text-lg font-semibold text-white">Sin seguimientos</h3>
            <p className="mt-1 max-w-sm text-sm text-white/40">
              {searchTerm || selectedVehicle !== 'all'
                ? 'Ajusta los filtros de búsqueda'
                : 'Las fotos de seguimiento aparecerán aquí'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedSeguimientos.map(seg => {
                const vehicle = vehicles?.find(v => v.id === seg.vehicle_id);
                const client = clients?.find(c => c.id === seg.client_id);
                const vehicleAlias = vehicle?.alias || vehicle?.plate || 'Desconocido';
                const clientName = client
                  ? `${client.firstname} ${client.lastname}`
                  : 'Desconocido';
                return (
                  <article
                    key={seg.id}
                    className="group overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] transition-colors hover:border-white/[0.12]"
                  >
                    <button
                      type="button"
                      className="relative block h-44 w-full overflow-hidden bg-white/[0.03]"
                      onClick={() => setSelectedImage({ ...seg, vehicle_alias: vehicleAlias, client_name: clientName })}
                    >
                      <Image
                        src={seg.photo_url}
                        alt={`Seguimiento de ${vehicleAlias}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                        <Camera
                          className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          strokeWidth={1.75}
                        />
                      </div>
                    </button>
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                          <Car className="h-3 w-3" strokeWidth={1.75} />
                          {vehicleAlias}
                        </span>
                        <span className="text-[11px] text-white/35">
                          {format(new Date(seg.timestamp), 'dd MMM', { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/45">
                        <User className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{clientName}</span>
                      </div>
                      {seg.description && (
                        <p className="line-clamp-2 text-xs text-white/35">{seg.description}</p>
                      )}
                      {seg.latitude != null && seg.longitude != null && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-full rounded-lg text-xs text-white/50 hover:bg-white/[0.06] hover:text-white"
                          onClick={e => {
                            e.stopPropagation();
                            openGoogleMaps(seg.latitude!, seg.longitude!);
                          }}
                        >
                          <MapPin className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                          Ver ubicación
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                </Button>
                <span className="text-sm text-white/50">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={isVehiclePickerOpen} onOpenChange={setIsVehiclePickerOpen}>
        <DialogContent className="border-white/10 bg-[#0e1117] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar vehículo</DialogTitle>
            <DialogDescription className="text-white/55">
              Elige el vehículo que vas a inspeccionar. La inspección quedará registrada en ese vehículo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={inspectionVehicleId} onValueChange={setInspectionVehicleId}>
              <SelectTrigger className="w-full border-white/10 bg-white/[0.03] text-white">
                <SelectValue placeholder="Selecciona un vehículo" />
              </SelectTrigger>
              <SelectContent>
                {activeVehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.alias || vehicle.plate || 'Vehículo sin nombre'}{vehicle.plate && vehicle.alias ? ` · ${vehicle.plate}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsVehiclePickerOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!inspectionVehicle}
                onClick={() => {
                  if (!inspectionVehicle) return;
                  setIsVehiclePickerOpen(false);
                  setIsTrackingOpen(true);
                }}
                className="bg-[#d7ff3f] text-[#080a0f] hover:bg-[#d7ff3f]/90"
              >
                Continuar inspección
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {inspectionVehicle && (
        <TrackingModal
          open={isTrackingOpen}
          onClose={() => {
            setIsTrackingOpen(false);
            void loadSeguimientos();
          }}
          vehicleId={inspectionVehicle.id}
          vehicleName={inspectionVehicle.alias || inspectionVehicle.plate || 'Vehículo'}
        />
      )}

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl border-white/10 bg-[#0e1117] text-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Detalle del seguimiento</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="relative h-72 overflow-hidden rounded-[16px] bg-white/[0.03] sm:h-96">
                <Image
                  src={selectedImage.photo_url}
                  alt="Seguimiento"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Vehículo</p>
                  <p className="mt-0.5 font-heading text-base font-semibold text-white">
                    {selectedImage.vehicle_alias}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Cliente</p>
                  <p className="mt-0.5 font-heading text-base font-semibold text-white">
                    {selectedImage.client_name}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Fecha</p>
                  <p className="mt-0.5 text-sm text-white/80">
                    {format(new Date(selectedImage.timestamp), "dd 'de' MMMM, yyyy 'a las' HH:mm", {
                      locale: es,
                    })}
                  </p>
                </div>
                {selectedImage.latitude != null && selectedImage.longitude != null && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                      Ubicación
                    </p>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-[#d7ff3f] hover:text-[#d7ff3f]/80"
                      onClick={() =>
                        openGoogleMaps(selectedImage.latitude!, selectedImage.longitude!)
                      }
                    >
                      <MapPin className="mr-1 h-4 w-4" strokeWidth={1.75} />
                      Ver en mapa
                    </Button>
                  </div>
                )}
              </div>

              {selectedImage.description && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                    Descripción
                  </p>
                  <p className="rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-white/60">
                    {selectedImage.description}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() =>
                    downloadImage(
                      selectedImage.photo_url,
                      `seguimiento_${selectedImage.vehicle_alias}_${format(
                        new Date(selectedImage.timestamp),
                        'yyyyMMdd'
                      )}.jpg`
                    )
                  }
                  className="h-11 flex-1 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
                >
                  <Download className="mr-2 h-4 w-4" strokeWidth={1.75} />
                  Descargar
                </Button>
                {selectedImage.latitude != null && selectedImage.longitude != null && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      openGoogleMaps(selectedImage.latitude!, selectedImage.longitude!)
                    }
                    className="h-11 flex-1 rounded-xl border-white/10 bg-transparent text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                  >
                    <MapPin className="mr-2 h-4 w-4" strokeWidth={1.75} />
                    Abrir en Maps
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
