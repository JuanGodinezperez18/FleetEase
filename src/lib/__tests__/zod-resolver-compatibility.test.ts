import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Regression guard: invalid values must reach the form's validation feedback.
describe('Zod v4 resolver compatibility', () => {
  it('returns field validation errors instead of throwing for invalid form values', async () => {
    const schema = z.object({
      firstname: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
    });

    const result = await zodResolver(schema)({ firstname: '' }, undefined, {
      criteriaMode: 'firstError',
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(result.errors.firstname?.message).toBe(
      'El nombre debe tener al menos 2 caracteres.',
    );
    expect(result.values).toEqual({});
  });

  it('returns validated values for valid form data', async () => {
    const schema = z.object({
      firstname: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
    });

    const result = await zodResolver(schema)({ firstname: 'Juan' }, undefined, {
      criteriaMode: 'firstError',
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ firstname: 'Juan' });
  });
});
