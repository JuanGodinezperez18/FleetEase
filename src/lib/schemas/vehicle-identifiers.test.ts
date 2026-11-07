import { createVehicleIdentifierSchemas } from './vehicle-identifiers';
const vehicles = [{ id: 'old', plate: 'ABC-1234', serialNumber: '1HGCM82633A004352' }];
it('normaliza VIN y placas nuevos conservando letras válidas', () => {
  const s = createVehicleIdentifierSchemas([]);
  expect(s.serialNumber.parse(' 1hgcm82633a00435s ')).toBe('1HGCM82633A00435S');
  expect(s.plate.parse(' abc-123-a ')).toBe('ABC-123-A');
  expect(s.plate.parse('abc1234')).toBe('ABC1234');
});
it.each(['short', '1HGCM82633A00435I', '1HGCM82633A00435O', '1HGCM82633A00435Q'])('rechaza VIN inválido %s', value => {
  expect(createVehicleIdentifierSchemas([]).serialNumber.safeParse(value).success).toBe(false);
});
it.each(['', 'AB', 'ABC/123', 'ABC_123', 'ABCDEFGHIJK', '---ABC---'])('rechaza placa inválida %s', value => {
  expect(createVehicleIdentifierSchemas([]).plate.safeParse(value).success).toBe(false);
});
it('detecta duplicados independientemente de mayúsculas, espacios y guiones de placa', () => {
  const s = createVehicleIdentifierSchemas(vehicles);
  expect(s.plate.safeParse('abc1234').success).toBe(false);
  expect(s.serialNumber.safeParse('1hgcm82633a004352').success).toBe(false);
});
it('conserva identificadores históricos sin modificar y valida sus cambios', () => {
  const legacy = [{ id: 'legacy', plate: 'PLACA/ANTIGUA', serialNumber: 'SERIE-ANTIGUA' }];
  const s = createVehicleIdentifierSchemas(legacy, 'legacy');
  expect(s.plate.parse('PLACA/ANTIGUA')).toBe('PLACA/ANTIGUA');
  expect(s.serialNumber.parse('SERIE-ANTIGUA')).toBe('SERIE-ANTIGUA');
  expect(s.serialNumber.safeParse('OTRA-SERIE').success).toBe(false);
  expect(s.plate.safeParse('OTRA/PLACA').success).toBe(false);
});
it('permite el propio registro pero no otro duplicado', () => {
  expect(createVehicleIdentifierSchemas(vehicles, 'old').plate.parse('ABC-1234')).toBe('ABC-1234');
  expect(createVehicleIdentifierSchemas([...vehicles, { ...vehicles[0], id: 'other' }], 'old').plate.safeParse('ABC-1234').success).toBe(false);
});

it('no bloquea ediciones ajenas al identificador por colisiones canónicas históricas', () => {
  const s = createVehicleIdentifierSchemas([...vehicles, { id: 'compact', plate: 'ABC1234', serialNumber: null }], 'old');
  expect(s.plate.parse('ABC-1234')).toBe('ABC-1234');
  expect(s.plate.safeParse('abc1234').success).toBe(false);
});
it('permite conservar un VIN histórico ausente pero valida su sustitución', () => {
  const s = createVehicleIdentifierSchemas([{ id: 'old', plate: 'ABC-1234', serialNumber: null }], 'old');
  expect(s.serialNumber.parse('')).toBe('');
  expect(s.serialNumber.safeParse('SERIE').success).toBe(false);
});
