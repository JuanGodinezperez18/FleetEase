// app/(partner)/inspections/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Eye, Image as ImageIcon, Calendar, Car } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { InspectionViewerModal } from './components/inspection-viewer-modal';

interface Inspection {
  id: string;
  vehicleId: string;
  clientId: string;
  photos: {
    front?: string;
    left?: string;
    right?: string;
    rear?: string;
  };
  timestamp: any;
  expiresAt: any;
  createdBy: string;
}

export default function PartnerInspectionsPage() {
  const { currentUser } = useAuth();
  const { partners, rawVehicles } = useData();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const currentPartner = useMemo(() => {
    return partners.find(p => p.userId === currentUser?.uid);
  }, [partners, currentUser]);

  const partnerVehicleIds = useMemo(() => {
    if (!currentPartner) return [];
    return rawVehicles
      .filter(v => v.partnerId === currentPartner.id)
      .map(v => v.id);
  }, [currentPartner, rawVehicles]);

  // Cargar inspecciones de los vehículos del socio
  useEffect(() => {
    async function loadInspections() {
      if (partnerVehicleIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'vehicleInspections'),
          where('vehicleId', 'in', partnerVehicleIds),
          orderBy('timestamp', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Inspection[];
        
        setInspections(data);
      } catch (error) {
        console.error('Error cargando inspecciones:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInspections();
  }, [partnerVehicleIds]);

  const enrichedInspections = useMemo(() => {
    return inspections.map(inspection => {
      const vehicle = rawVehicles.find(v => v.id === inspection.vehicleId);
      const timestamp = inspection.timestamp?.toDate();
      const expiresAt = inspection.expiresAt?.toDate();
      const isExpired = expiresAt && expiresAt < new Date();
      const daysRemaining = expiresAt ? differenceInDays(expiresAt, new Date()) : 0;
      
      return {
        ...inspection,
        vehicleName: vehicle?.alias || 'Desconocido',
        vehicleModel: vehicle ? `${vehicle.make} ${vehicle.model}` : 'N/A',
        date: timestamp,
        expiresAt,
        isExpired,
        daysRemaining,
        photoCount: Object.values(inspection.photos).filter(Boolean).length,
      };
    });
  }, [inspections, rawVehicles]);

  const filteredInspections = useMemo(() => {
    if (!searchTerm) return enrichedInspections;
    return enrichedInspections.filter(i =>
      i.vehicleName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [enrichedInspections, searchTerm]);

  const handleViewInspection = (inspection: any) => {
    setSelectedInspection(inspection);
    setViewerOpen(true);
  };

  if (!currentPartner) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No se encontró información del socio.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <div>
        <h1 className="text-3xl font-bold">Inspecciones de Mis Vehículos</h1>
        <p className="text-muted-foreground mt-1">
          Revisa el historial de inspecciones visuales
        </p>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por vehículo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Grid de inspecciones */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredInspections.map((inspection) => (
            <motion.div
              key={inspection.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Thumbnail */}
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
                    <Badge variant="outline" className="absolute top-2 right-2 bg-orange-500 text-white border-orange-600">
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
            {searchTerm
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Aún no hay inspecciones registradas para tus vehículos'}
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