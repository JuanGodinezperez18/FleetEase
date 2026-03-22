

"use client";

import type { AnalyzedNotification } from '@/hooks/use-notifications-analytics';

/**
 * Genera un enlace seguro a la entidad relacionada con una notificación.
 * @param notification La notificación analizada.
 * @returns Una cadena de URL o '#' si no se puede generar un enlace válido.
 */
export const getNotificationLink = (notification: AnalyzedNotification): string => {
  // Validar que relatedId exista
  if (!notification.relatedId) {
    return '#';
  }
  
  switch (notification.type) {
    case 'maintenance_mileage':
    case 'maintenance_date':
    case 'insurance_expiry':
    case 'mileage_log_pending':
      return `/dashboard/vehicles/${notification.relatedId}`;
      
    case 'driver_payment_pending':
    case 'license_expiry':
      return `/dashboard/clients/${notification.relatedId}/transactions`;
      
    default:
      // Fallback para otros tipos de notificaciones
      if (notification.relatedEntityType === 'Client') {
        return `/dashboard/clients/${notification.relatedId}`;
      }
      if (notification.relatedEntityType === 'Vehicle') {
        return `/dashboard/vehicles/${notification.relatedId}`;
      }
      return '#';
  }
};
