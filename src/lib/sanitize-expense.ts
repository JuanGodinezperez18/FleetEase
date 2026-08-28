/**
 * @fileoverview Sanitización del payload del formulario de gastos.
 *
 * `concept` (por línea de gasto) y `description` son texto libre que el
 * usuario escribe y que luego se renderiza en tablas, en el modal de
 * evidencia de gastos y en el historial de kilometraje (cuando el log
 * proviene de un gasto). Se sanitiza aquí, en el punto de entrada, para
 * que quede protegido sin importar dónde se muestre o exporte después.
 *
 * Extraída de expenses/page.tsx#handleSubmit para poder probarla sin
 * montar el formulario completo (react-hook-form + contexts).
 */

import { sanitizeUserInput } from '@/lib/validators';

export interface ExpenseLineItemInput {
  concept: string;
  amount: number;
}

export interface SanitizableExpenseFormData {
  items: ExpenseLineItemInput[];
  description?: string;
  [key: string]: unknown;
}

/**
 * Devuelve una copia de `data` con `concept` de cada línea y `description`
 * pasados por sanitizeUserInput. No muta el objeto de entrada.
 */
export function sanitizeExpenseFormData<T extends SanitizableExpenseFormData>(
  data: T
): T & { items: ExpenseLineItemInput[]; description: string | undefined } {
  const sanitizedItems = data.items.map(item => ({
    ...item,
    concept: sanitizeUserInput(item.concept),
  }));
  const sanitizedDescription = data.description
    ? sanitizeUserInput(data.description)
    : undefined;

  return { ...data, items: sanitizedItems, description: sanitizedDescription };
}
