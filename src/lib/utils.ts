import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Vehicle } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value: number): string => {
  if (typeof value !== 'number' || !isFinite(value)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);
};

export const formatNumber = (value: number): string => {
  if (typeof value !== 'number' || !isFinite(value)) {
    return '0';
  }
  return new Intl.NumberFormat('es-MX').format(value);
}

export const sanitizeAndFormatData = (data: any): any => {
  const sanitized: Record<string, any> = {};
  for (const key in data) {
    const value = data[key];

    // Omitir completamente las claves con valor undefined
    if (value === undefined) {
      continue;
    }

    // Los Select usan @none como sentinel visual. Nunca debe llegar a
    // Supabase porque algunos campos (por ejemplo assigned_vehicle_id)
    // son UUID y PostgreSQL no puede castear "@none" a uuid.
    if (value === '@none') {
      sanitized[key] = null;
      continue;
    }

    // Convertir strings vacíos a null para campos que no son obligatorios.
    if (value === '') {
      sanitized[key] = null;
      continue;
    }

    sanitized[key] = value;
  }
  return sanitized;
};


export const getStatusVariant = (status: Vehicle['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'active':
        case 'rented':
            return 'default';
        case 'maintenance':
            return 'secondary';
        case 'sold':
        case 'inactive':
            return 'destructive';
        default:
            return 'outline';
    }
};

export function formatTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const infallibleNormalizeDate = (date: unknown): Date | null => {
  if (!date) return null;

  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }

  if (typeof date === 'number') {
    const d = new Date(date);
    if (!isNaN(d.getTime())) return d;
  }

  if (typeof date === 'string') {
    // Try ISO format first, which is the most reliable
    let d = new Date(date);
    if (!isNaN(d.getTime())) return d;

    // Try common formats like MM/DD/YYYY or DD/MM/YYYY
    const parts = date.split(/[-/]/);
    if (parts.length === 3) {
      const [p1, p2, p3] = parts.map(Number);
      // DD/MM/YYYY
      d = new Date(p3, p2 - 1, p1);
      if (!isNaN(d.getTime()) && d.getDate() === p1) return d;
      // MM/DD/YYYY
      d = new Date(p3, p1 - 1, p2);
      if (!isNaN(d.getTime()) && d.getDate() === p2) return d;
    }
  }

  return null;
};
