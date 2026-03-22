"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormMessage } from '@/components/ui/form';
import { Loader2, MapPin } from 'lucide-react';
import { useLoadScript } from '@react-google-maps/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const libraries: ("places")[] = ["places"];

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: typeof google;
  }
}

const mexicanStates = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
  "Chihuahua", "Coahuila", "Colima", "Ciudad de México", "Durango", "Guanajuato",
  "Guerrero", "Hidalgo", "Jalisco", "México", "Michoacán", "Morelos", "Nayarit",
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

export interface AddressComponents {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface AddressAutocompleteProps {
  values: AddressComponents;
  onChange: (address: AddressComponents) => void;
  errors?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  disabled?: boolean;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  values,
  onChange,
  errors,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [localStreet, setLocalStreet] = useState(values.street || '');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [hasApiError, setHasApiError] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
  });

  // Initialize services when Google Maps is loaded
  // NOTE: Google Maps ha deprecado AutocompleteService y PlacesService a favor de
  // AutocompleteSuggestion y Place respectivamente (Marzo 2025).
  // Las APIs antiguas seguirán funcionando con al menos 12 meses de aviso antes de descontinuarse.
  // Migración futura: https://developers.google.com/maps/documentation/javascript/places-migration-overview
  useEffect(() => {
    if (isLoaded && window.google) {
      try {
        autocompleteRef.current = new window.google.maps.places.AutocompleteService();
        // Create a temporary div for PlacesService (it requires a DOM element)
        const div = document.createElement('div');
        placesServiceRef.current = new window.google.maps.places.PlacesService(div);
      } catch (error) {
        console.warn('Error al inicializar Google Maps Services:', error);
        setHasApiError(true);
      }
    }
  }, [isLoaded]);

  const handlePlaceSelect = useCallback((placeId: string) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId,
        fields: ['address_components', 'formatted_address'],
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.address_components) {
          const addressComponents: AddressComponents = {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'México',
          };

          let streetNumber = '';
          let route = '';

          place.address_components.forEach((component) => {
            const types = component.types;

            if (types.includes('street_number')) {
              streetNumber = component.long_name;
            }
            if (types.includes('route')) {
              route = component.long_name;
            }
            if (types.includes('locality')) {
              addressComponents.city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
              addressComponents.state = component.long_name;
            }
            if (types.includes('postal_code')) {
              addressComponents.zipCode = component.long_name;
            }
            if (types.includes('country')) {
              addressComponents.country = component.long_name;
            }
          });

          // Combinar calle y número
          addressComponents.street = `${route} ${streetNumber}`.trim();
          setLocalStreet(addressComponents.street);

          onChange(addressComponents);
          setShowPredictions(false);
          setPredictions([]);
        }
      }
    );
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newStreet = e.target.value;
    setLocalStreet(newStreet);
    onChange({ ...values, street: newStreet });

    if (!newStreet || !autocompleteRef.current || hasApiError) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    setIsLoadingPredictions(true);
    try {
      autocompleteRef.current.getPlacePredictions(
        {
          input: newStreet,
          componentRestrictions: { country: 'mx' },
          types: ['address'],
        },
        (results, status) => {
          setIsLoadingPredictions(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
            setShowPredictions(true);
          } else {
            setPredictions([]);
            setShowPredictions(false);
            // Si hay un error de API, activar el modo de error
            if (status === window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
              setHasApiError(true);
            }
          }
        }
      );
    } catch (error) {
      console.warn('Error al obtener predicciones de Google Maps:', error);
      setIsLoadingPredictions(false);
      setPredictions([]);
      setShowPredictions(false);
      setHasApiError(true);
    }
  }, [onChange, values, hasApiError]);

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, city: e.target.value });
  };

  const handleStateChange = (newState: string) => {
    onChange({ ...values, state: newState });
  };

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, zipCode: e.target.value });
  };

  // Si hay error de API o error de carga, usar campos manuales
  if (loadError || hasApiError) {
    return (
      <div className="space-y-4">
        <div className="p-3 border border-amber-200 bg-amber-50 rounded-md">
          <p className="text-sm text-amber-800">
            {loadError
              ? 'Error al cargar Google Maps. Usando campos manuales.'
              : 'La API de Google Maps no está disponible (restricciones de dominio). Usando campos manuales.'}
          </p>
        </div>
        <ManualAddressFields
          values={values}
          onChange={onChange}
          errors={errors}
          disabled={disabled}
        />
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Cargando autocompletado de direcciones...</span>
        </div>
        <ManualAddressFields
          values={values}
          onChange={onChange}
          errors={errors}
          disabled={disabled}
        />
      </div>
    );
  }

  if (!apiKey || apiKey === 'TU_GOOGLE_MAPS_API_KEY_AQUI') {
    return (
      <div className="space-y-4">
        <div className="p-3 border border-amber-200 bg-amber-50 rounded-md">
          <p className="text-sm text-amber-800">
            Configure la API Key de Google Maps para habilitar el autocompletado.
          </p>
        </div>
        <ManualAddressFields
          values={values}
          onChange={onChange}
          errors={errors}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Calle y Número
          </div>
        </Label>
        <div className="relative">
          <Input
            ref={inputRef}
            value={localStreet}
            onChange={handleInputChange}
            placeholder="Ej: Av. Insurgentes 123"
            disabled={disabled}
            onFocus={() => predictions.length > 0 && setShowPredictions(true)}
            onBlur={() => {
              // Delay to allow click on prediction
              setTimeout(() => setShowPredictions(false), 200);
            }}
          />
          {isLoadingPredictions && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {showPredictions && predictions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {predictions.map((prediction) => (
                <button
                  key={prediction.place_id}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                  onClick={() => handlePlaceSelect(prediction.place_id)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {prediction.structured_formatting.main_text}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {prediction.structured_formatting.secondary_text}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {errors?.street && (
          <p className="text-sm font-medium text-destructive">{errors.street}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Comience a escribir para ver sugerencias de direcciones
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Ciudad</Label>
          <Input
            value={values.city || ''}
            onChange={handleCityChange}
            placeholder="Ciudad"
            disabled={disabled}
          />
          {errors?.city && (
            <p className="text-sm font-medium text-destructive">{errors.city}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Estado</Label>
          <Select
            onValueChange={handleStateChange}
            value={values.state || ''}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {mexicanStates.map((stateName) => (
                <SelectItem key={stateName} value={stateName}>
                  {stateName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.state && (
            <p className="text-sm font-medium text-destructive">{errors.state}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Código Postal</Label>
          <Input
            value={values.zipCode || ''}
            onChange={handleZipCodeChange}
            placeholder="C.P."
            disabled={disabled}
          />
          {errors?.zipCode && (
            <p className="text-sm font-medium text-destructive">{errors.zipCode}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente auxiliar para campos manuales (cuando Google Maps no está disponible)
const ManualAddressFields: React.FC<AddressAutocompleteProps> = ({
  values,
  onChange,
  errors,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Calle y Número</Label>
        <Input
          value={values.street || ''}
          onChange={(e) => onChange({ ...values, street: e.target.value })}
          placeholder="Ej: Av. Insurgentes 123"
          disabled={disabled}
        />
        {errors?.street && (
          <p className="text-sm font-medium text-destructive">{errors.street}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Ciudad</Label>
          <Input
            value={values.city || ''}
            onChange={(e) => onChange({ ...values, city: e.target.value })}
            placeholder="Ciudad"
            disabled={disabled}
          />
          {errors?.city && (
            <p className="text-sm font-medium text-destructive">{errors.city}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Estado</Label>
          <Select
            onValueChange={(newState) => onChange({ ...values, state: newState })}
            value={values.state || ''}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {mexicanStates.map((stateName) => (
                <SelectItem key={stateName} value={stateName}>
                  {stateName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.state && (
            <p className="text-sm font-medium text-destructive">{errors.state}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Código Postal</Label>
          <Input
            value={values.zipCode || ''}
            onChange={(e) => onChange({ ...values, zipCode: e.target.value })}
            placeholder="C.P."
            disabled={disabled}
          />
          {errors?.zipCode && (
            <p className="text-sm font-medium text-destructive">{errors.zipCode}</p>
          )}
        </div>
      </div>
    </div>
  );
};
