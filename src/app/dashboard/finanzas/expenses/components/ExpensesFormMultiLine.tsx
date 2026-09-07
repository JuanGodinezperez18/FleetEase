"use client";

import { ExpensesForm as LegacyExpensesForm, type ExpensesFormValues as LegacyExpensesFormValues } from "./ExpensesForm";
import type { FinancialRecord, Company, FinancialCategory } from "@/types";

export type ExpensesFormValues = LegacyExpensesFormValues & {
  items: Array<{
    concept: string;
    amount: number;
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
      ? (rawItems as ExpensesFormValues["items"])
      : [{ concept: data.description || "Gasto", amount: Number(data.amount) || 0 }];

    onSubmit({ ...data, items });
  };

  return <LegacyExpensesForm {...props} onSubmit={handleSubmit} />;
};

ExpensesForm.displayName = "ExpensesForm";
