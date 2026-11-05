import type { FinancialCategory } from '@/types';

export function resolveCreditAdministrationCategory(
  categories: FinancialCategory[], companyId: string,
): FinancialCategory | undefined {
  const matchingExpense = (category: FinancialCategory) => category.type === 'expense' &&
    /administraci[oó]n/.test((category.name || '').toLowerCase());
  const choose = (scoped: FinancialCategory[]) => scoped.find(category =>
    matchingExpense(category) && category.name.toLowerCase().trim() === 'administración de vehículo',
  ) || scoped.find(matchingExpense);
  return choose(categories.filter(category => category.companyId === companyId)) ||
    choose(categories.filter(category => !category.companyId));
}
