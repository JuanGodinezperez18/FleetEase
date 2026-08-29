/**
 * @fileoverview Tests de vehicle-assignment.ts.
 *
 * Cubre el caso de uso central del submódulo: dado el historial de
 * asignaciones de un vehículo, poder responder "¿quién lo tenía asignado
 * en tal fecha?" (para identificar al responsable de una multa), además
 * de la validación de disponibilidad y el armado del registro de alta.
 */
import {
  findAssignmentAtDate,
  buildAssignmentLogPayload,
  findOpenAssignments,
  checkVehicleAssignmentAvailability,
} from '@/lib/vehicle-assignment';
import type { AssignmentLogLike } from '@/lib/vehicle-assignment';

describe('findAssignmentAtDate', () => {
  const logs: AssignmentLogLike[] = [
    { id: 'log-1', vehicleId: 'v-1', clientId: 'client-a', assignedAt: '2026-01-01T00:00:00.000Z', unassignedAt: '2026-03-01T00:00:00.000Z' },
    { id: 'log-2', vehicleId: 'v-1', clientId: 'client-b', assignedAt: '2026-03-01T00:00:00.000Z', unassignedAt: '2026-06-01T00:00:00.000Z' },
    { id: 'log-3', vehicleId: 'v-1', clientId: 'client-c', assignedAt: '2026-06-01T00:00:00.000Z', unassignedAt: null },
  ];

  it('caso de uso central (multas): encuentra qué cliente tenía el vehículo en una fecha dentro de un rango cerrado', () => {
    const result = findAssignmentAtDate(logs, 'v-1', '2026-04-15T00:00:00.000Z');
    expect(result?.clientId).toBe('client-b');
  });

  it('encuentra la asignación activa (unassignedAt=null) para una fecha posterior a su inicio', () => {
    const result = findAssignmentAtDate(logs, 'v-1', '2026-08-01T00:00:00.000Z');
    expect(result?.clientId).toBe('client-c');
  });

  it('devuelve null si la fecha es anterior a cualquier asignación registrada', () => {
    const result = findAssignmentAtDate(logs, 'v-1', '2025-12-01T00:00:00.000Z');
    expect(result).toBeNull();
  });

  it('devuelve null si no hay asignaciones para ese vehículo', () => {
    const result = findAssignmentAtDate(logs, 'v-999', '2026-04-15T00:00:00.000Z');
    expect(result).toBeNull();
  });

  it('la fecha exacta de assignedAt SÍ cuenta como cubierta (límite inclusivo de inicio)', () => {
    const result = findAssignmentAtDate(logs, 'v-1', '2026-03-01T00:00:00.000Z');
    expect(result?.clientId).toBe('client-b');
  });

  it('la fecha exacta de unassignedAt NO cuenta como cubierta por esa asignación (límite exclusivo de fin)', () => {
    // A las 2026-03-01T00:00:00.000Z log-1 ya terminó (unassignedAt),
    // así que esa fecha exacta debe resolver a log-2, no a log-1.
    const result = findAssignmentAtDate(logs, 'v-1', '2026-03-01T00:00:00.000Z');
    expect(result?.id).toBe('log-2');
  });

  it('si hubiera solape de datos, devuelve la asignación más reciente que cubre la fecha', () => {
    const overlapping: AssignmentLogLike[] = [
      { id: 'old', vehicleId: 'v-1', clientId: 'client-a', assignedAt: '2026-01-01T00:00:00.000Z', unassignedAt: null },
      { id: 'new', vehicleId: 'v-1', clientId: 'client-b', assignedAt: '2026-02-01T00:00:00.000Z', unassignedAt: null },
    ];
    const result = findAssignmentAtDate(overlapping, 'v-1', '2026-03-01T00:00:00.000Z');
    expect(result?.id).toBe('new');
  });
});

describe('findOpenAssignments', () => {
  it('devuelve solo las asignaciones sin unassignedAt de ese vehículo', () => {
    const logs: AssignmentLogLike[] = [
      { id: 'log-1', vehicleId: 'v-1', clientId: 'client-a', assignedAt: '2026-01-01', unassignedAt: '2026-02-01' },
      { id: 'log-2', vehicleId: 'v-1', clientId: 'client-b', assignedAt: '2026-02-01', unassignedAt: null },
      { id: 'log-3', vehicleId: 'v-2', clientId: 'client-c', assignedAt: '2026-01-01', unassignedAt: null },
    ];
    const result = findOpenAssignments(logs, 'v-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('log-2');
  });

  it('devuelve un arreglo vacío si no hay ninguna abierta', () => {
    const logs: AssignmentLogLike[] = [
      { id: 'log-1', vehicleId: 'v-1', clientId: 'client-a', assignedAt: '2026-01-01', unassignedAt: '2026-02-01' },
    ];
    expect(findOpenAssignments(logs, 'v-1')).toHaveLength(0);
  });
});

describe('checkVehicleAssignmentAvailability', () => {
  it('rechaza un vehículo bloqueado por crédito', () => {
    const result = checkVehicleAssignmentAvailability({ lockedByCredit: true }, [], 'client-1');
    expect(result.available).toBe(false);
    expect(result.error).toMatch(/crédito activo/i);
  });

  it('rechaza si ya tiene una asignación abierta con otro cliente', () => {
    const openLogs: AssignmentLogLike[] = [
      { id: 'log-1', vehicleId: 'v-1', clientId: 'client-other', assignedAt: '2026-01-01', unassignedAt: null },
    ];
    const result = checkVehicleAssignmentAvailability({ lockedByCredit: false }, openLogs, 'client-1');
    expect(result.available).toBe(false);
    expect(result.error).toMatch(/otro cliente/i);
  });

  it('permite reasignar (re-entrega) al MISMO cliente que ya lo tiene abierto', () => {
    const openLogs: AssignmentLogLike[] = [
      { id: 'log-1', vehicleId: 'v-1', clientId: 'client-1', assignedAt: '2026-01-01', unassignedAt: null },
    ];
    const result = checkVehicleAssignmentAvailability({ lockedByCredit: false }, openLogs, 'client-1');
    expect(result.available).toBe(true);
  });

  it('permite asignar un vehículo sin bloqueos ni asignaciones abiertas', () => {
    const result = checkVehicleAssignmentAvailability({ lockedByCredit: false }, [], 'client-1');
    expect(result.available).toBe(true);
  });

  it('permite asignar cuando lockedByCredit es undefined/null (vehículo nunca tuvo crédito)', () => {
    const result = checkVehicleAssignmentAvailability({}, [], 'client-1');
    expect(result.available).toBe(true);
  });
});

describe('buildAssignmentLogPayload', () => {
  const baseInput = {
    vehicleId: 'v-1',
    clientId: 'client-1',
    assignedBy: 'user-1',
    companyId: 'company-1',
  };

  it('arma el payload con unassignedAt=null (asignación recién abierta)', () => {
    const result = buildAssignmentLogPayload(baseInput, '2026-08-29T00:00:00.000Z');
    expect(result.unassignedAt).toBeNull();
    expect(result.assignedAt).toBe('2026-08-29T00:00:00.000Z');
  });

  it('usa null para los campos opcionales de entrega no provistos, no undefined', () => {
    const result = buildAssignmentLogPayload(baseInput);
    expect(result.odometerReading).toBeNull();
    expect(result.fuelLevel).toBeNull();
    expect(result.conditionNotes).toBeNull();
    expect(result.photos).toBeNull();
    expect(result.reason).toBeNull();
  });

  it('conserva los campos de entrega cuando sí se proveen', () => {
    const result = buildAssignmentLogPayload({
      ...baseInput,
      odometerReading: 45000,
      fuelLevel: '3/4',
      conditionNotes: 'Rayón en puerta trasera derecha',
      photos: { front: 'https://example.com/front.jpg' },
      reason: 'Renta semanal',
    });
    expect(result.odometerReading).toBe(45000);
    expect(result.fuelLevel).toBe('3/4');
    expect(result.conditionNotes).toBe('Rayón en puerta trasera derecha');
    expect(result.photos).toEqual({ front: 'https://example.com/front.jpg' });
    expect(result.reason).toBe('Renta semanal');
  });

  it('genera un timestamp propio si no se pasa uno', () => {
    const before = Date.now();
    const result = buildAssignmentLogPayload(baseInput);
    expect(new Date(result.assignedAt).getTime()).toBeGreaterThanOrEqual(before);
  });
});
