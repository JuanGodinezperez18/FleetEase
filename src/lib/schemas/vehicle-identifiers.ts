import { z } from 'zod';
import { vinSchema } from './vin';
import { plateSchema } from './fields';

type VehicleIdentifier = { id: string; plate: string; serialNumber?: string | null };
const plateKey = (value: string) => value.replace(/[\s-]/g, '').toUpperCase();
const vinKey = (value: string) => value.replace(/\s/g, '').toUpperCase();

export function createVehicleIdentifierSchemas(vehicles: VehicleIdentifier[], editingId?: string) {
  const original = vehicles.find(vehicle => vehicle.id === editingId);
  return {
    plate: z.string().transform((value, ctx) => {
      if (original && value === original.plate) return value;
      const parsed = plateSchema.safeParse(value);
      if (parsed.success) return parsed.data;
      ctx.addIssue({ code: 'custom', message: parsed.error.issues[0].message });
      return z.NEVER;
    }).refine(value => !vehicles.some(vehicle => vehicle.id !== editingId && (original && value === original.plate ? vehicle.plate === value : plateKey(vehicle.plate) === plateKey(value))),
      'Esta placa ya está registrada.'),
    serialNumber: z.string().transform((value, ctx) => {
      if (original && value === (original.serialNumber ?? '')) return value;
      const parsed = vinSchema.safeParse(value);
      if (parsed.success) return parsed.data;
      ctx.addIssue({ code: 'custom', message: parsed.error.issues[0].message });
      return z.NEVER;
    }).refine(value => !vehicles.some(vehicle => vehicle.id !== editingId && (original && value === (original.serialNumber ?? '') ? vehicle.serialNumber === value : vinKey(vehicle.serialNumber ?? '') === vinKey(value))),
      'Este número de serie ya está registrado.'),
  };
}
