"use client";

import LegacyExpensesForm, { type ExpensesFormValues as LegacyExpensesFormValues } from "./ExpensesForm";
import type { FinancialRecord, Company, FinancialCategory } from "@/types";

export type ExpensesFormValues = LegacyExpensesFormValues & {
  items: Array<{
    concept: string;
    amount: number;
    quantity?: number;
    unitAmount?: number;
    catalogItemId?: string | null;
    supplierId?: string | null;
    partNumber?: string | null;
    warrantyDays?: number | null;
    warrantyExpiresAt?: string | null;
  }>;
};

interface ExpensesFormProps {
  onSubmit: (data: ExpensesFormValues) => void;
  initialData?: Partial<FinancialRecord> | null;
  companies: Company[];
  expenseCategories: FinancialCategory[];
  isSubmitting: boolean;
  onClose: () => void;
}

export const ExpensesForm = ({ onSubmit, ...props }: ExpensesFormProps) => {
  const handleSubmit = (data: LegacyExpensesFormValues) => {
    const rawItems = (data as unknown as { items?: unknown }).items;

    const items = Array.isArray(rawItems)
      ? (rawItems as Array<Record<string, unknown>>).map((item) => {
          const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
          const enteredAmount = Number(item.amount);
          const enteredUnitAmount = Number(item.unitAmount);

          // La fuente principal es cantidad × importe unitario.
          // Si una fila llega sin importe unitario, conservamos el importe
          // calculado/introducido de la fila para no perderla al guardar.
          const unitAmount = Number.isFinite(enteredUnitAmount) && enteredUnitAmount > 0
            ? enteredUnitAmount
            : (Number.isFinite(enteredAmount) && enteredAmount > 0 ? enteredAmount / quantity : 0);
          const amount = unitAmount > 0
            ? quantity * unitAmount
            : (Number.isFinite(enteredAmount) ? enteredAmount : 0);

          return {
            ...item,
            quantity,
            unitAmount,
            amount,
          };
        }) as ExpensesFormValues["items"]
      : [{ concept: data.description || "Gasto", amount: Number(data.amount) || 0, quantity: 1 }];

    onSubmit({ ...data, items });
  };

  return <LegacyExpensesForm {...props} onSubmit={handleSubmit} />;
};

ExpensesForm.displayName = "ExpensesForm";
