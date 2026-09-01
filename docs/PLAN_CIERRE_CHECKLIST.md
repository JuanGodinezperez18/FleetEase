# FleetEase — cierre del plan maestro

## Ya en producción (código)
- [x] Offboarding clientes con write-off (UI + RPC)
- [x] Cancelación de créditos no destructiva (UI + cleanup)
- [x] deactivateCredit usa vehicle_id
- [x] Admin APIs con Bearer + roles + company isolation
- [x] Download storage con ACL por empresa
- [x] Helpers hash invitaciones + migración en repo
- [x] Deploy Vercel READY (d407502)

## Aplicar en Supabase (tú o con service role)
1. SQL Editor → pegar `supabase_apply_remaining.sql`
2. SQL Editor → pegar `supabase_storage_rls_apply.sql` (revisa paths si no usas `companies/{uuid}/...`)
3. Confirmar SELECT de privilegios: `anon_can_execute` = false en funciones de trazabilidad

## Pruebas funcionales (con usuario de prueba)
A. Cliente sin deuda → Dar de baja → status inactive, sin write-off de más
B. Cliente con saldo → motivo → write-off + financial_record_links
C. Cancelar crédito → status cancelled + ajuste contable
D. Empresa A no ve datos empresa B
E. Anon no puede ejecutar RPC de offboarding

## Secretos
- [ ] Rotar PAT GitHub usado en el chat
- [ ] Confirmar que SERVICE_ROLE no está en cliente

## Notas
- deleteClient/deleteCredit en provider siguen soft-delete; la UI de clientes/créditos usa offboarding/cancelación.
- Categorías financieras y mileage_logs aún usan DELETE físico (no historial de deuda).
