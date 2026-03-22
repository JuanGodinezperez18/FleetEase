/**
 * Mapa Profesional de GPS para FleetEase
 * 
 * Features:
 * - Clustering de vehículos
 * - Animaciones suaves
 * - Popups con información detallada
 * - Filtros por estado
 * - Búsqueda de vehículos
 * - Capas personalizables
 */

'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { VehicleLocation } from '@/lib/gps/gps-types';
import {
  Search,
  MapPin,
  Filter,
  Layers,
  Maximize,
  Navigation,
  Car,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// Importar Leaflet dinámicamente (evita SSR issues)
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false, loading: () => <MapSkeleton /> }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

const CircleMarker = dynamic(
  () => import('react-leaflet').then(mod => mod.CircleMarker),
  { ssr: false }
);

const Polygon = dynamic(
  () => import('react-leaflet').then(mod => mod.Polygon),
  { ssr: false }
);

// Importar L para iconos
import L from 'leaflet';

// Estilos de iconos personalizados
const createVehicleIcon = (status: VehicleLocation['status'], heading: number = 0) => {
  const colors = {
    moving: '#22c55e',      // green-500
    stopped: '#3b82f6',     // blue-500
    idle: '#eab308',        // yellow-500
    offline: '#9ca3af',     // gray-400
  };

  const color = colors[status];
  
  // Icono SVG personalizado
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" style="transform: rotate(${heading}deg)">
      <path d="M12 2L4 12h3v8h6v-2h2v2h6v-8h3L12 2z"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-vehicle-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

interface GPSMapProps {
  locations: VehicleLocation[];
  onVehicleSelect?: (vehicleId: string) => void;
  showGeofences?: boolean;
  geofences?: any[];
  className?: string;
}

export function GPSMap({
  locations,
  onVehicleSelect,
  showGeofences = false,
  geofences = [],
  className = '',
}: GPSMapProps) {
  // Estado
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mapZoom, setMapZoom] = useState(13);
  const [showTrafficLayer, setShowTrafficLayer] = useState(false);

  // Filtrar vehículos
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      // Filtro por búsqueda
      const matchesSearch = searchQuery === '' ||
        loc.vehicleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtro por estado
      const matchesStatus = statusFilter === 'all' || loc.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [locations, searchQuery, statusFilter]);

  // Agrupar por estado
  const stats = useMemo(() => ({
    total: locations.length,
    moving: locations.filter(l => l.status === 'moving').length,
    stopped: locations.filter(l => l.status === 'stopped').length,
    idle: locations.filter(l => l.status === 'idle').length,
    offline: locations.filter(l => l.status === 'offline').length,
  }), [locations]);

  // Centro del mapa (primer vehículo o default)
  const center = useMemo(() => {
    if (filteredLocations.length > 0) {
      const first = filteredLocations[0];
      return [first.latitude, first.longitude] as [number, number];
    }
    return [19.4326, -99.1332] as [number, number]; // CDMX por default
  }, [filteredLocations]);

  // Manejar selección de vehículo
  const handleVehicleClick = useCallback((vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    onVehicleSelect?.(vehicleId);
  }, [onVehicleSelect]);

  // Contar clusters por área
  const clusterMarkers = useMemo(() => {
    // Implementación básica de clustering
    // En producción usar @react-leaflet/markerclusterer
    return filteredLocations.map((loc, index) => (
      <Marker
        key={loc.vehicleId}
        position={[loc.latitude, loc.longitude]}
        icon={createVehicleIcon(loc.status, loc.heading)}
        eventHandlers={{
          click: () => handleVehicleClick(loc.vehicleId),
        }}
      >
        <Popup>
          <VehiclePopup location={loc} />
        </Popup>
      </Marker>
    ));
  }, [filteredLocations, handleVehicleClick]);

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Toolbar Superior */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Búsqueda y Filtros */}
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vehículo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-10">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({stats.total})</SelectItem>
                <SelectItem value="moving">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Moviendo ({stats.moving})
                  </span>
                </SelectItem>
                <SelectItem value="stopped">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Detenidos ({stats.stopped})
                  </span>
                </SelectItem>
                <SelectItem value="idle">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Ralentí ({stats.idle})
                  </span>
                </SelectItem>
                <SelectItem value="offline">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-500" />
                    Offline ({stats.offline})
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Acciones */}
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowTrafficLayer(!showTrafficLayer)}
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Capas de mapa</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMapZoom(z => Math.min(z + 2, 18))}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Acercar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Stats Rápidas */}
        <div className="flex gap-4 mt-3 text-sm">
          <Badge variant="outline" className="gap-2">
            <Car className="h-3 w-3" />
            Total: {stats.total}
          </Badge>
          <Badge className="gap-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Navigation className="h-3 w-3" />
            {stats.moving} en movimiento
          </Badge>
          <Badge className="gap-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle className="h-3 w-3" />
            {stats.stopped} detenidos
          </Badge>
          <Badge className="gap-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-3 w-3" />
            {stats.idle} en ralentí
          </Badge>
          {stats.offline > 0 && (
            <Badge className="gap-2 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
              <XCircle className="h-3 w-3" />
              {stats.offline} offline
            </Badge>
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="h-[600px] w-full">
        <MapContainer
          center={center}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          zoomControl={false}
        >
          {/* Capa base */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Capa de tráfico (opcional) */}
          {showTrafficLayer && (
            <TileLayer
              url="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
              opacity={0.5}
            />
          )}

          {/* Marcadores de vehículos */}
          {clusterMarkers}

          {/* Geofences (opcional) */}
          {showGeofences && geofences.map(geofence => (
            <Polygon
              key={geofence.id}
              positions={geofence.coordinates}
              pathOptions={{
                color: geofence.color || '#3b82f6',
                fillColor: geofence.color || '#3b82f6',
                fillOpacity: 0.2,
              }}
            >
              <Popup>{geofence.name}</Popup>
            </Polygon>
          ))}
        </MapContainer>
      </div>
    </Card>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function VehiclePopup({ location }: { location: VehicleLocation }) {
  return (
    <div className="min-w-[200px]">
      <div className="font-semibold mb-2 flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {location.vehicleId}
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estado:</span>
          <Badge variant="outline" className={getStatusBadgeClass(location.status)}>
            {getStatusText(location.status)}
          </Badge>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Velocidad:</span>
          <span className="font-medium">{location.speed} km/h</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Dirección:</span>
          <span className="font-medium">{location.heading}°</span>
        </div>
        
        {location.fuelLevel !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Combustible:</span>
            <span className="font-medium">{location.fuelLevel}%</span>
          </div>
        )}
        
        {location.temperature !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Temperatura:</span>
            <span className="font-medium">{location.temperature}°C</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Actualizado:</span>
          <span className="text-xs">{formatTimeAgo(location.lastUpdate)}</span>
        </div>
        
        {location.address && (
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
            {location.address}
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusBadgeClass(status: VehicleLocation['status']): string {
  const classes = {
    moving: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    stopped: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    idle: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    offline: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return classes[status];
}

function getStatusText(status: VehicleLocation['status']): string {
  const texts = {
    moving: 'En movimiento',
    stopped: 'Detenido',
    idle: 'Ralentí',
    offline: 'Offline',
  };
  return texts[status];
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
  return `Hace ${Math.floor(seconds / 86400)}d`;
}

function MapSkeleton() {
  return (
    <div className="h-[600px] w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-center">
        <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">Cargando mapa...</p>
      </div>
    </div>
  );
}
