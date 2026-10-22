#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git checkout origin/master -- src/app/dashboard/finanzas/payments/components/payment-form.tsx

python3 - <<'PY'
from pathlib import Path
import re
text = Path("src/app/dashboard/finanzas/payments/components/payment-form.tsx").read_text()
text = text.replace(
    'import { PaymentHistoryView } from "../history/components/payment-history-view";',
    'import { PaymentHistoryView } from "../history/components/payment-history-view";\nimport { entityExistedOnDate, recordDateOnOrBefore } from "./payment-date-filters";'
)
text = text.replace(
    'clients.filter(c => c.status === "active" && !c.isDeleted)',
    'clients.filter(c => c.status === "active" && !c.isDeleted && entityExistedOnDate(c.createdAt, date))',
    1
)
text = text.replace(
    'partners.filter(p => !p.isDeleted)',
    'partners.filter(p => !p.isDeleted && entityExistedOnDate((p as { createdAt?: string }).createdAt, date))',
    1
)
text = text.replace(
    ': creditEntities;',
    ': creditEntities.filter(c => entityExistedOnDate(c.createdAt, date) || entityExistedOnDate((c as { startDate?: string }).startDate, date));'
)
text = text.replace(
    'r.category !== SECURITY_DEPOSIT_CATEGORY && r.sourceRecordType !== "multa")',
    'r.category !== SECURITY_DEPOSIT_CATEGORY && r.sourceRecordType !== "multa" && recordDateOnOrBefore(r.date, date))'
)
text = text.replace(
    'r.sourceRecordType === "multa" && r.category === "Multa")',
    'r.sourceRecordType === "multa" && r.category === "Multa" && recordDateOnOrBefore(r.date, date))'
)
text = text.replace(
    '[financialRecords, entityId, kind, appliedByTarget]);',
    '[financialRecords, entityId, kind, appliedByTarget, date]);',
    1
)
text = text.replace(
    ").filter(r => r.outstanding > 0.009));",
    ").filter(r => r.outstanding > 0.009 && recordDateOnOrBefore(r.purchaseDate, date));",
    1
)
idx = text.find('kind !== "supplier_payment"')
old_dep = '}, [companyId, kind, entityId, financialRecords]);'
dep_idx = text.find(old_dep, idx)
if dep_idx > 0:
    text = text[:dep_idx] + '}, [companyId, kind, entityId, financialRecords, date]);' + text[dep_idx+len(old_dep):]
marker = '  const selectedCredit = useMemo(() => kind === "credit_payment"'
inject = '  useEffect(() => { setTargetId(""); }, [date]);\n\n  '
if marker in text and 'setTargetId(""); }, [date])' not in text:
    text = text.replace(marker, inject + marker)
text = text.replace(
    '<Label className="text-white/50">Fecha</Label>',
    '<Label className="text-white/50">Fecha del pago <span className="text-white/30">(filtra facturas y entidades)</span></Label>',
    1
)
m = re.search(r'<div className="space-y-2">\s*<Label className="text-white/50">Fecha del pago.*?</div>', text, re.S)
if m:
    date_block = m.group(0)
    text_wo = text[:m.start()] + text[m.end():]
    grid = '<div className="grid gap-5 md:grid-cols-2">'
    insert_at = text_wo.find(grid)
    if insert_at >= 0:
        date_top = date_block.replace('className="space-y-2"', 'className="space-y-2 md:col-span-2"', 1)
        pos = insert_at + len(grid)
        text = text_wo[:pos] + '\n                  ' + date_top + '\n' + text_wo[pos:]
Path("src/app/dashboard/finanzas/payments/components/payment-form.tsx").write_text(text)
print("payment-form.tsx restaurado y parcheado OK")
PY

git add src/app/dashboard/finanzas/payments/components/payment-form.tsx
echo "Listo. Ejecuta:"
echo "  git commit -m 'fix(payments): restaurar payment-form con filtro de fecha'"
echo "  git push"
