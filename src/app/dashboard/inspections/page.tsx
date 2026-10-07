
// app/(dashboard)/inspections/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/hooks/use-data';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Download, Trash2, Calendar, Car, User, Image as ImageIcon, Filter, X } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { openSafeUrl } from '@/lib/security/safe-url';

interface Inspection {
  id: string;
  vehicle_id: string;
  client_id: string;
  company_id: string;
  photos: {
    front?: string;
    left?: string;
    right?: string;
    rear?: string;
  };
  timestamp: string;
  expires_at: string;
  created_by: string;
}

export default function InspectionsPage() {
  const { rawVehicles, clients } = useData();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Cargar inspecciones
  useEffect(() => {
    async function loadInspections() {
      try {
        const { data, error } = await supabase
          .from('vehicle_inspections')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100);

        if (error) throw error;
        
        setInspections((data || []) as Inspection[]);
      } catch (error) {
        console.error('Error cargando inspecciones:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInspections();
  }, []);

  // Enriquecer inspecciones con datos de vehículos y clientes
  const enrichedInspections = useMemo(() => {
    return inspections.map(inspection => {
      const vehicle = rawVehicles.find(v => v.id === inspection.vehicle_id);
      const client = clients.find(c => c.id === inspection.client_id);
      const timestamp = inspection.timestamp ? new Date(inspection.timestamp) : null;
      const expiresAt = inspection.expires_at ? new Date(inspection.expires_at) : null;
      const isExpired = expiresAt && expiresAt < new Date();
      const daysRemaining = expiresAt ? differenceInDays(expiresAt, new Date()) : 0;
      
      return {
        ...inspection,
        vehicleName: vehicle?.alias || 'Desconocido',
        vehicleModel: vehicle ? `${vehicle.make} ${vehicle.model}` : 'N/A',
        clientName: client ? `${client.firstname} ${client.lastname}` : 'Desconocido',
        date: timestamp,
        expiresAt,
        isExpired,
        daysRemaining,
        photoCount: Object.values(inspection.photos).filter(Boolean).length,
      };
    });
  }, [inspections, rawVehicles, clients]);

  // Filtrar inspecciones
  const filteredInspections = useMemo(() => {
    let filtered = enrichedInspections;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        i =>
          i.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (filterStatus === 'active') {
      filtered = filtered.filter(i => !i.isExpired);
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(i => i.isExpired);
    }

    return filtered;
  }, [enrichedInspections, searchTerm, filterStatus]);

  const {
    page,
    totalPages,
    total,
    from,
    to,
    paginatedItems: paginatedInspections,
    prevPage,
    nextPage,
  } = useClientPagination(filteredInspections);


  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: enrichedInspections.length,
      active: enrichedInspections.filter(i => !i.isExpired).length,
      expired: enrichedInspections.filter(i => i.isExpired).length,
      expiringSoon: enrichedInspections.filter(i => !i.isExpired && i.daysRemaining <= 3).length,
    };
  }, [enrichedInspections]);

  const handleViewInspection = (inspection: any) => {
    setSelectedInspection(inspection);
    setViewerOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando inspecciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Inspecciones de Vehículos</h1>
        <p className="text-muted-foreground mt-1">
          Revisa el historial de inspecciones visuales de la flota
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Inspecciones totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <ImageIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Vigentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <ImageIcon className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">≤ 3 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
            <ImageIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <p className="text-xs text-muted-foreground">Para eliminar</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por vehículo o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Grid de inspecciones */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {paginatedInspections.map((inspection) => (
            <motion.div
              key={inspection.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Thumbnail de la primera foto */}
                <div className="relative h-48 bg-muted">
                  {inspection.photos.front && (
                    <img
                      src={inspection.photos.front}
                      alt="Vista frontal"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {inspection.isExpired && (
                    <Badge variant="destructive" className="absolute top-2 right-2">
                      Expirada
                    </Badge>
                  )}
                  {!inspection.isExpired && inspection.daysRemaining <= 3 && (
                    <Badge variant="secondary" className="absolute top-2 right-2 bg-orange-500 text-white">
                      {inspection.daysRemaining}d restantes
                    </Badge>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{inspection.vehicleName}</h3>
                        <p className="text-sm text-muted-foreground">{inspection.vehicleModel}</p>
                      </div>
                      <Badge variant="outline">{inspection.photoCount}/4</Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{inspection.clientName}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{inspection.date ? format(inspection.date, 'PPp', { locale: es }) : 'N/A'}</span>
                    </div>

                    <Button
                      className="w-full mt-4"
                      variant="outline"
                      onClick={() => handleViewInspection(inspection)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Inspección
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredInspections.length === 0 && (
        <Card className="p-12 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No se encontraron inspecciones</p>
          <p className="text-sm text-muted-foreground">
            {searchTerm || filterStatus !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Aún no hay inspecciones registradas'}
          </p>
        </Card>
      )}

      {/* Modal de visualización */}
      <InspectionViewerModal
        inspection={selectedInspection}
        isOpen={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setSelectedInspection(null);
        }}
      />
    </div>
  );
}

// Modal de visualización de fotos
function InspectionViewerModal({
  inspection,
  isOpen,
  onClose,
}: {
  inspection: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [currentView, setCurrentView] = useState<'front' | 'left' | 'right' | 'rear'>('front');

  if (!inspection) return null;

  const views = [
    { key: 'front', label: 'Frente', url: inspection.photos.front },
    { key: 'left', label: 'Izquierda', url: inspection.photos.left },
    { key: 'right', label: 'Derecha', url: inspection.photos.right },
    { key: 'rear', label: 'Trasera', url: inspection.photos.rear },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{inspection.vehicleName} - Inspección Visual</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {inspection.date ? format(inspection.date, 'PPP', { locale: es }) : 'Fecha desconocida'}
          </p>
        </DialogHeader>

        <Tabs value={currentView} onValueChange={(value: any) => setCurrentView(value)}>
          <TabsList className="grid w-full grid-cols-4">
            {views.map(view => (
              <TabsTrigger key={view.key} value={view.key} disabled={!view.url}>
                {view.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {views.map(view => (
            <TabsContent key={view.key} value={view.key} className="mt-4">
              {view.url ? (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <img
                      src={view.url}
                      alt={`Vista ${view.label}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => openSafeUrl(view.url)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Foto no disponible</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Información adicional */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="font-medium">{inspection.clientName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vehículo</p>
            <p className="font-medium">{inspection.vehicleModel}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fecha de inspección</p>
            <p className="font-medium">
              {inspection.date ? format(inspection.date, 'PPp', { locale: es }) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expira en</p>
            <p className={`font-medium ${inspection.isExpired ? 'text-red-600' : ''}`}>
              {inspection.isExpired
                ? 'Expirada'
                : `${inspection.daysRemaining} días`}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}