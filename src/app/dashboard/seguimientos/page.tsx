// app/dashboard/seguimientos/page.tsx
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/contexts/data-provider';
import { collection, query, where, orderBy, getDocs, limit, startAfter, Query, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera, MapPin, Calendar, User, Car, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Seguimiento {
  id: string;
  vehicleId: string;
  clientId: string;
  userId: string;
  clientName: string;
  vehicleAlias: string;
  photoUrl: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  createdBy: string;
  companyId: string;
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

  const loadSeguimientos = useCallback(async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);

      let q: Query<DocumentData> = query(
        collection(db, 'seguimientos'),
        where('companyId', '==', currentUser.companyId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Seguimiento[];

      setSeguimientos(data);
    } catch (error) {
      console.error('Error cargando seguimientos:', error);
      toast.error('Error al cargar seguimientos');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.companyId]);

  useEffect(() => {
    if (currentUser?.companyId) {
      loadSeguimientos();
    }
  }, [loadSeguimientos, currentUser?.companyId]);

  const filteredSeguimientos = useMemo(() => {
    return seguimientos.filter(seg => {
      const matchesSearch =
        seg.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seg.vehicleAlias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seg.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesVehicle = selectedVehicle === 'all' || seg.vehicleId === selectedVehicle;

      return matchesSearch && matchesVehicle;
    });
  }, [seguimientos, searchTerm, selectedVehicle]);

  const paginatedSeguimientos = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredSeguimientos.slice(start, end);
  }, [filteredSeguimientos, page]);

  const totalPages = Math.ceil(filteredSeguimientos.length / ITEMS_PER_PAGE);

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
    } catch (error) {
      toast.error('Error al descargar imagen');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seguimientos</h1>
          <p className="text-muted-foreground">Historial fotográfico de vehículos</p>
        </div>
        <Button onClick={loadSeguimientos} variant="outline">
          <Camera className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, vehículo o descripción..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={selectedVehicle} onValueChange={(value) => {
              setSelectedVehicle(value);
              setPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por vehículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los vehículos</SelectItem>
                {vehicles?.filter(v => !v.isDeleted).map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.alias || v.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Seguimientos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-64 w-full" />
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : paginatedSeguimientos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No se encontraron seguimientos</p>
            <p className="text-muted-foreground text-center">
              {searchTerm || selectedVehicle !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Los seguimientos fotográficos aparecerán aquí'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedSeguimientos.map((seg) => (
              <Card key={seg.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div
                  className="relative h-48 bg-gray-100 group"
                  onClick={() => setSelectedImage(seg)}
                >
                  <Image
                    src={seg.photoUrl}
                    alt={`Seguimiento de ${seg.vehicleAlias}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      <Car className="h-3 w-3 mr-1" />
                      {seg.vehicleAlias}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(seg.createdAt), 'dd MMM', { locale: es })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">{seg.clientName}</span>
                  </div>

                  {seg.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {seg.description}
                    </p>
                  )}

                  {seg.latitude && seg.longitude && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGoogleMaps(seg.latitude!, seg.longitude!);
                      }}
                    >
                      <MapPin className="h-3 w-3 mr-2" />
                      Ver ubicación
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal de imagen */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalles del Seguimiento</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={selectedImage.photoUrl}
                  alt="Seguimiento"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vehículo</p>
                  <p className="text-lg font-semibold">{selectedImage.vehicleAlias}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                  <p className="text-lg font-semibold">{selectedImage.clientName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(selectedImage.createdAt), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
                {selectedImage.latitude && selectedImage.longitude && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ubicación</p>
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => openGoogleMaps(selectedImage.latitude!, selectedImage.longitude!)}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Ver en mapa
                    </Button>
                  </div>
                )}
              </div>

              {selectedImage.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Descripción</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedImage.description}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => downloadImage(
                    selectedImage.photoUrl,
                    `seguimiento_${selectedImage.vehicleAlias}_${format(new Date(selectedImage.createdAt), 'yyyyMMdd')}.jpg`
                  )}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
                {selectedImage.latitude && selectedImage.longitude && (
                  <Button
                    variant="outline"
                    onClick={() => openGoogleMaps(selectedImage.latitude!, selectedImage.longitude!)}
                    className="flex-1"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
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
