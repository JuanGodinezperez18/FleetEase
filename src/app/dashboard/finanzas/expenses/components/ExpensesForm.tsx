"use client";

import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFinances } from "@/contexts/providers/finances-provider";
import { useVehicles } from "@/contexts/providers/vehicles-provider";
import { useClients } from "@/contexts/providers/clients-provider";
import { useData } from "@/contexts/data-provider";
import type { FinancialRecord, Company, FinancialCategory } from "@/types";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultipleFileInput } from "@/components/common/multiple-file-input";
import { infallibleNormalizeDate } from "@/lib/date-utils";
import { isClientCreatedOnOrBefore } from "@/lib/filter-clients-by-date";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-provider";
import { Loader2, Plus, PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormModal } from "@/components/common/form-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PARTNER_PAYMENT_CATEGORY_ID } from "@/contexts/finance-constants";

const newCategoryValue = "createNewCategory";
const NONE_SELECT_VALUE = "@none";

const lineSchema = z.object({
  concept: z.string().trim().min(1, "El concepto es obligatorio."),
  amount: z.coerce.number({ invalid_type_error: "El importe debe ser un número." }).positive("El importe debe ser mayor que cero."),
  catalogItemId: z.string().nullable().optional(),
  quantity: z.coerce.number().positive().default(1),
  unitAmount: z.coerce.number().nonnegative().optional(),
  partNumber: z.string().nullable().optional(),
  warrantyDays: z.coerce.number().int().nonnegative().nullable().optional(),
  warrantyExpiresAt: z.string().nullable().optional(),
});

const expenseSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria."),
  clientId: z.preprocess(
    value => value === NONE_SELECT_VALUE ? null : value,
    z.string().uuid().nullable().optional(),
  ),
  vehicleId: z.preprocess(
    value => value === NONE_SELECT_VALUE || value === "" ? null : value,
    z.string().uuid().nullable().optional(),
  ),
  items: z.array(lineSchema).min(1, "Agrega al menos un concepto de gasto."),
  description: z.string().optional(),
  categoryId: z.string().min(1, "La categoría es obligatoria."),
  mileageAtExpense: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : Number(String(val).replace(/\D/g, "")),
    z.number().optional(),
  ),
  evidenceUrls: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
  companyId: z.string().optional().nullable(),
  paymentMethod: z.enum(["company_pays_for_partner", "partner_pays", "company_absorbs"]).default("company_pays_for_partner"),
});

export type ExpensesFormValues = z.infer<typeof expenseSchema>;

interface ExpensesFormProps {
  onSubmit: (data: ExpensesFormValues) => void;
  initialData?: Partial<FinancialRecord> | null;
  companies: Company[];
  expenseCategories: FinancialCategory[];
  isSubmitting: boolean;
  onClose: () => void;
}

export interface ExpensesFormHandles { submit: () => void; }

interface CatalogItem {
  id: string;
  name: string;
  part_number: string | null;
  brand: string | null;
  unit: string;
  default_cost: number | null;
  warranty_days: number | null;
  compatibility: string | null;
}

const emptyLine = () => ({
  concept: "",
  amount: 0,
  catalogItemId: null,
  quantity: 1,
  unitAmount: undefined,
  partNumber: null,
  warrantyDays: null,
  warrantyExpiresAt: null,
});
