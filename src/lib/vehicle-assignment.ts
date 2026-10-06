/**
 * @fileoverview Lógica pura del submódulo de Asignaciones de vehículos.
 *
 * vehicle_assignment_logs ya existía en la base de datos (con RLS de
 * SELECT/INSERT ya configurado) y se leía para calcular la "fecha
 * inteligente" de asignación, pero NADA en la app insertaba filas ahí -
 * no había forma de registrar una asignación nueva ni de consultar el
 * historial. Este módulo arma esos registros y resuelve la pregunta que
 * motivó el submódulo: "¿quién tenía esta unidad asignada en tal fecha?"
 * (para poder identificar al responsable de una multa).
 */

export interface AssignmentLogLike {
  id: string;
  vehicleId: string;
  clientId: string | null;
  assignedAt: string;
  unassignedAt?: string | null;
}

/**
 * Encuentra qué cliente tenía asignado un vehículo en una fecha dada.
 * Una asignación "cubre" una fecha si assignedAt <= fecha, y
 * (unassignedAt es null [sigue activa] o unassignedAt > fecha).
 *
 * Si hay más de una asignación que técnicamente cubre la fecha (no
 * debería pasar si las asignaciones no se solapan, pero los datos
 * existentes podrían tener huecos), devuelve la más reciente por
 * assignedAt.
 */
export function findAssignmentAtDate(
  logs: AssignmentLogLike[],
  vehicleId: string,
  date: string
): AssignmentLogLike | null {
  // Treat the selected value as a calendar day, not as midnight.
  // This matters because assignment records are stored with a time
  // component (historical captures are normalized to noon local time).
  const dayStart = new Date(`${date}T00:00:00`).getTime();
  const nextDayStart = dayStart + 24 * 60 * 60 * 1000;

  const covering = logs.filter(log => {
    if (log.vehicleId !== vehicleId) return false;

    const assignedTime = new Date(log.assignedAt).getTime();
    if (Number.isNaN(assignedTime) || assignedTime >= nextDayStart) return false;

    if (!log.unassignedAt) return true;

    const unassignedTime = new Date(log.unassignedAt).getTime();
    if (Number.isNaN(unassignedTime)) return false;

    // The assignment must overlap the selected calendar day.
    return unassignedTime > dayStart;
  });

  if (covering.length === 0) return null;

  return covering.reduce((latest, current) =>
    new Date(current.assignedAt).getTime() > new Date(latest.assignedAt).getTime() ? current : latest
  );
}

export interface VehicleLockStatus {
  lockedByCredit?: boolean | null;
}

export interface AssignmentAvailabilityResult {
  available: boolean;
  error?: string;
}

/**
 * Antes de crear una asignación general (renta), hay que asegurarse de
 * que el vehículo no esté comprometido de otra forma:
 * - Si está bloqueado por un crédito activo, ese sistema es dueño del
 *   vehículo (ver módulo de Créditos) - no se puede asignar por encima.
 * - Si ya tiene una asignación abierta con OTRO cliente, hay que
 *   finalizar esa primero explícitamente (no se sobreescribe en
 *   silencio, para no perder el historial de quién lo tenía).
 * Reasignar al MISMO cliente que ya lo tiene abierto sí se permite
 * (ej. se vuelve a "entregar" tras un service, con nuevas fotos/odómetro).
 */
export function checkVehicleAssignmentAvailability(
  vehicle: VehicleLockStatus,
  openAssignments: AssignmentLogLike[],
  clientId: string
): AssignmentAvailabilityResult {
  if (vehicle.lockedByCredit) {
    return { available: false, error: 'Este vehículo está bloqueado por un crédito activo y no se puede asignar desde aquí.' };
  }

  const openWithOtherClient = openAssignments.find(log => log.clientId && log.clientId !== clientId);
  if (openWithOtherClient) {
    return { available: false, error: 'Este vehículo ya tiene una asignación activa con otro cliente. Finalízala primero.' };
  }

  return { available: true };
}

/**
 * Compara solo el día calendario (YYYY-MM-DD) para evitar problemas de zona horaria.
 * Devuelve true si `candidate` es el mismo día o posterior a `reference`.
 */
export function isDateOnOrAfter(candidate: string, reference: string): boolean {
  const candidateDay = candidate.slice(0, 10);
  const referenceDay = reference.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidateDay) || !/^\d{4}-\d{2}-\d{2}$/.test(referenceDay)) {
    return false;
  }
  return candidateDay >= referenceDay;
}

export interface EntityCreationDates {
  vehicleCreatedAt?: string | null;
  clientCreatedAt?: string | null;
}

/**
 * La fecha de asignación no puede ser anterior a la fecha de registro
 * del vehículo ni del cliente. Evita historiales inconsistentes
 * (asignaciones "en el pasado" antes de que existieran en el sistema).
 */
export function checkAssignmentDateAgainstEntityCreation(
  assignedAt: string,
  entity: EntityCreationDates
): AssignmentAvailabilityResult {
  if (entity.vehicleCreatedAt && !isDateOnOrAfter(assignedAt, entity.vehicleCreatedAt)) {
    return {
      available: false,
      error: `La fecha de asignación no puede ser anterior a la fecha de registro del vehículo (${entity.vehicleCreatedAt.slice(0, 10)}).`,
    };
  }

  if (entity.clientCreatedAt && !isDateOnOrAfter(assignedAt, entity.clientCreatedAt)) {
    return {
      available: false,
      error: `La fecha de asignación no puede ser anterior a la fecha de registro del cliente (${entity.clientCreatedAt.slice(0, 10)}).`,
    };
  }

  return { available: true };
}

export interface NewAssignmentInput {
  vehicleId: string;
  clientId: string;
  assignedBy: string;
  companyId: string;
  odometerReading?: number | null;
  fuelLevel?: string | null;
  conditionNotes?: string | null;
  photos?: Record<string, string> | null;
  reason?: string | null;
  assignedAt?: string;
}

export interface AssignmentLogInsertPayload {
  vehicleId: string;
  clientId: string;
  companyId: string;
  assignedBy: string;
  assignedAt: string;
  unassignedAt: null;
  odometerReading: number | null;
  fuelLevel: string | null;
  conditionNotes: string | null;
  photos: Record<string, string> | null;
  reason: string | null;
}

/** Arma el registro a insertar para una nueva asignación. */
export function buildAssignmentLogPayload(
  input: NewAssignmentInput,
  timestamp?: string
): AssignmentLogInsertPayload {
  return {
    vehicleId: input.vehicleId,
    clientId: input.clientId,
    companyId: input.companyId,
    assignedBy: input.assignedBy,
    assignedAt: input.assignedAt || timestamp || new Date().toISOString(),
    unassignedAt: null,
    odometerReading: input.odometerReading ?? null,
    fuelLevel: input.fuelLevel ?? null,
    conditionNotes: input.conditionNotes ?? null,
    photos: input.photos ?? null,
    reason: input.reason ?? null,
  };
}

/**
 * Dado el historial de un vehículo, encuentra la(s) asignación(es) que
 * siguen abiertas (sin unassigned_at) - deben cerrarse antes de crear
 * una nueva, para que el historial no quede con asignaciones
 * solapadas (lo que rompería findAssignmentAtDate para multas).
 */
export function findOpenAssignments(
  logs: AssignmentLogLike[],
  vehicleId: string
): AssignmentLogLike[] {
  return logs.filter(log => log.vehicleId === vehicleId && !log.unassignedAt);
}
