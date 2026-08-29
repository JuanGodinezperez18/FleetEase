/**
 * @fileoverview Tests de credit-creation.ts.
 *
 * Cubre las dos correcciones aplicadas:
 * 1. checkCreditAvailability: la regla de "1 crédito activo por vehículo
 *    y por cliente" ahora vive en un solo lugar, usada tanto por el
 *    formulario completo (/dashboard/credits) como por la acción rápida
 *    del dashboard (antes esta última no validaba nada).
 * 2. buildCreditData: el cálculo de totalAmount/remainingBalance/etc,
 *    antes duplicado (y desincronizado) entre ambos flujos.
 */
import { checkCreditAvailability, buildCreditData, buildVehicleCreditLockPayload, buildVehicleCreditUnlockPayload } from '@/lib/credit-creation';
import type { ExistingCreditLike } from '@/lib/credit-creation';

const activeCredit = (overrides: Partial<ExistingCreditLike> = {}): ExistingCreditLike => ({
  id: 'credit-existing',
  vehicleId: 'vehicle-1',
  clientId: 'client-1',
  status: 'active',
  isDeleted: false,
  ...overrides,
});

describe('checkCreditAvailability', () => {
  it('permite crear un crédito cuando no hay conflictos', () => {
    const result = checkCreditAvailability([], { vehicleId: 'v-new', clientId: 'c-new' });
    expect(result.available).toBe(true);
  });

  it('rechaza si el vehículo ya tiene un crédito activo', () => {
    const credits = [activeCredit({ vehicleId: 'v-taken' })];
    const result = checkCreditAvailability(credits, { vehicleId: 'v-taken', clientId: 'c-new' });
    expect(result.available).toBe(false);
    expect(result.error).toMatch(/vehículo ya tiene un crédito activo/i);
  });

  it('rechaza si el cliente ya tiene un crédito activo', () => {
    const credits = [activeCredit({ clientId: 'c-taken' })];
    const result = checkCreditAvailability(credits, { vehicleId: 'v-new', clientId: 'c-taken' });
    expect(result.available).toBe(false);
    expect(result.error).toMatch(/cliente ya tiene un crédito activo/i);
  });

  it('ignora créditos cancelados/completados/eliminados al validar', () => {
    const credits = [
      activeCredit({ vehicleId: 'v-1', clientId: 'c-1', status: 'completed' }),
      activeCredit({ vehicleId: 'v-1', clientId: 'c-1', status: 'cancelled' }),
      activeCredit({ vehicleId: 'v-1', clientId: 'c-1', status: 'active', isDeleted: true }),
    ];
    const result = checkCreditAvailability(credits, { vehicleId: 'v-1', clientId: 'c-1' });
    expect(result.available).toBe(true);
  });

  it('excluye el propio crédito al editar (excludeCreditId)', () => {
    const credits = [activeCredit({ id: 'credit-being-edited', vehicleId: 'v-1', clientId: 'c-1' })];
    const result = checkCreditAvailability(credits, {
      vehicleId: 'v-1',
      clientId: 'c-1',
      excludeCreditId: 'credit-being-edited',
    });
    expect(result.available).toBe(true);
  });

  it('sigue bloqueando si otro crédito activo distinto del editado ocupa el vehículo', () => {
    const credits = [
      activeCredit({ id: 'credit-being-edited', vehicleId: 'v-1', clientId: 'c-1' }),
      activeCredit({ id: 'credit-other', vehicleId: 'v-2', clientId: 'c-1' }),
    ];
    // Editando credit-being-edited pero intentando moverlo al vehículo v-2,
    // que ya está tomado por otro crédito activo (credit-other).
    const result = checkCreditAvailability(credits, {
      vehicleId: 'v-2',
      clientId: 'c-1',
      excludeCreditId: 'credit-being-edited',
    });
    expect(result.available).toBe(false);
    expect(result.error).toMatch(/vehículo/i);
  });
});

describe('buildCreditData', () => {
  const baseInput = {
    clientId: 'client-1',
    vehicleId: 'vehicle-1',
    startDate: '2026-09-01',
    weeklyPayment: 500,
    numberOfPayments: 20,
  };

  it('calcula totalAmount = weeklyPayment * numberOfPayments', () => {
    const result = buildCreditData(baseInput, 'company-1');
    expect(result.totalAmount).toBe(10000);
    expect(result.remainingBalance).toBe(10000);
    expect(result.paidAmount).toBe(0);
    expect(result.paymentsMade).toBe(0);
    expect(result.status).toBe('active');
  });

  it('acepta weeklyPayment/numberOfPayments como strings (input crudo de formulario)', () => {
    const result = buildCreditData({ ...baseInput, weeklyPayment: '500', numberOfPayments: '20' } as any, 'company-1');
    expect(result.totalAmount).toBe(10000);
  });

  it('usa companyId del propio dato si viene, sin recurrir al fallback', () => {
    const result = buildCreditData({ ...baseInput, companyId: 'company-from-form' }, 'company-fallback');
    expect(result.companyId).toBe('company-from-form');
  });

  it('usa el fallback de companyId cuando el dato no trae uno', () => {
    const result = buildCreditData(baseInput, 'company-fallback');
    expect(result.companyId).toBe('company-fallback');
  });

  it('lanza un error claro si no hay companyId en ningún lado', () => {
    expect(() => buildCreditData(baseInput, null)).toThrow(/empresa/i);
    expect(() => buildCreditData(baseInput, undefined)).toThrow(/empresa/i);
  });

  it('conserva createdAt original al editar, en vez de sobrescribirlo', () => {
    const originalCreatedAt = '2026-01-15T00:00:00.000Z';
    const result = buildCreditData(baseInput, 'company-1', originalCreatedAt);
    expect(result.createdAt).toBe(originalCreatedAt);
  });

  it('genera createdAt nuevo cuando no se pasa uno (creación, no edición)', () => {
    const before = Date.now();
    const result = buildCreditData(baseInput, 'company-1');
    const createdAtTime = new Date(result.createdAt).getTime();
    expect(createdAtTime).toBeGreaterThanOrEqual(before);
  });

  it('trata weeklyPayment/numberOfPayments inválidos (NaN) como 0, no como error silencioso', () => {
    const result = buildCreditData({ ...baseInput, weeklyPayment: 'abc' } as any, 'company-1');
    expect(result.weeklyPayment).toBe(0);
    expect(result.totalAmount).toBe(0);
  });
});

describe('buildVehicleCreditLockPayload / buildVehicleCreditUnlockPayload', () => {
  it('el payload de bloqueo fija clientId, status=rented y las banderas de crédito', () => {
    const result = buildVehicleCreditLockPayload('client-1', 'credit-1', '2026-08-29T00:00:00.000Z');
    expect(result).toEqual({
      clientId: 'client-1',
      status: 'rented',
      lockedByCredit: true,
      associatedCreditId: 'credit-1',
      updatedAt: '2026-08-29T00:00:00.000Z',
    });
  });

  it('el payload de desbloqueo limpia clientId, revierte status y apaga las banderas', () => {
    const result = buildVehicleCreditUnlockPayload('2026-08-29T00:00:00.000Z');
    expect(result).toEqual({
      clientId: null,
      status: 'active',
      lockedByCredit: false,
      associatedCreditId: null,
      updatedAt: '2026-08-29T00:00:00.000Z',
    });
  });

  it('genera un timestamp propio si no se pasa uno', () => {
    const before = Date.now();
    const lock = buildVehicleCreditLockPayload('client-1', 'credit-1');
    const unlock = buildVehicleCreditUnlockPayload();
    expect(new Date(lock.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(unlock.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
  });
});
