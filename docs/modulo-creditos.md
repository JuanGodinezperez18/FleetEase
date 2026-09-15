# Módulo de Créditos — lógica funcional y financiera

## Objetivo

El módulo de Créditos administra financiamiento otorgado a un cliente, su vehículo asociado, el calendario de cuotas, pagos parciales/anticipados, saldo pendiente y trazabilidad financiera.

## Regla financiera principal

**Otorgar un crédito NO es cobrar dinero.**

El importe del crédito representa cartera/financiamiento. Por lo tanto:

- `credits.total_amount`: principal/importe total programado del crédito. **No es ingreso cobrado.**
- `credits.paid_amount`: suma acumulada de pagos realmente recibidos.
- `credits.remaining_balance`: saldo pendiente.
- `financial_records` con `credit_granted=true`: registro técnico de "Crédito Otorgado" para trazabilidad/auditoría. **No cuenta como ingreso real ni utilidad.**
- `financial_records` con `type='payment'`, `credit_payment=true` y `payment_kind='credit_payment'`: dinero efectivamente recibido por un pago de crédito. Se contabiliza por el importe real pagado.

## Flujo de creación

1. Validar usuario y empresa.
2. Validar cliente y vehículo pertenecientes a la empresa.
3. Impedir más de un crédito activo para el mismo cliente o vehículo.
4. Calcular `total_amount = weekly_payment × number_of_payments`.
5. Crear el registro del crédito con `paid_amount=0` y `remaining_balance=total_amount`.
6. Crear el calendario de cuotas.
7. Crear el registro técnico `Crédito Otorgado` en Finanzas con `credit_granted=true`.
8. Asociar el vehículo al crédito.

El paso 7 **no genera ingreso cobrado**.

## Flujo de pago

Los pagos de crédito son independientes de las rentas normales y se procesan mediante la función atómica `process_credit_payment_atomic`.

Al registrar un pago:

1. Bloquear/validar el crédito.
2. Validar que el monto sea positivo y no supere el saldo pendiente.
3. Aplicar el importe a las cuotas pendientes en orden.
4. Permitir que un pago cubra una cuota, varias cuotas o parcialmente una cuota.
5. Actualizar `paid_amount`, `remaining_balance`, `payments_made` y estado del crédito.
6. Crear **un movimiento financiero de tipo `payment` por el importe efectivamente recibido**.
7. Relacionar el pago con el crédito y, cuando corresponde, con la cuota.
8. Mantener trazabilidad entre el pago y el registro técnico de Crédito Otorgado.

## Ejemplo

Crédito de 12 × $600 = $7,200.

Al crear:

- Cartera: $7,200
- Cobrado: $0
- Ingreso real: $0

Después de recibir $600:

- Cartera original: $7,200
- Cobrado acumulado: $600
- Saldo: $6,600
- Ingreso cobrado: $600

Después de recibir $2,500 adicionales:

- Cobrado acumulado: $3,100
- Saldo: $4,100
- Ingreso cobrado por pagos: $3,100

Nunca debe aparecer $7,200 como ingreso cobrado solo por haber creado el crédito.

## Separación con pagos normales

El botón flotante y el módulo de Pagos pueden conectar con distintos flujos. No deben fusionarse las reglas de:

- pago de renta/cliente;
- pago de crédito;
- otros movimientos financieros.

Un pago de crédito debe conservar `credit_payment=true` y `payment_kind='credit_payment'`.

## Métricas financieras

`src/lib/financial-metrics.ts` es el módulo canónico para agregaciones.

- `sumIncome()` excluye registros `creditGranted`.
- `sumPayment()` suma pagos reales (`type='payment'`).
- `sumRentalIncome()` excluye Crédito Otorgado y depósitos en garantía.
- `calculateNetProfit()` utiliza ingreso operativo real menos gastos.
- Un nuevo dashboard no debe sumar directamente `financial_records.amount` para obtener ingreso cobrado sin aplicar estas reglas.

## Regla contra doble contabilización

El mismo dinero no debe contarse dos veces.

El registro de Crédito Otorgado sirve para trazabilidad del financiamiento. El pago real es el movimiento de caja/cobranza. La relación entre ambos no convierte el principal en ingreso.

## Cancelación, eliminación y auditoría

Los registros financieros se manejan respetando el modelo de soft-delete y trazabilidad existente. Cancelar o modificar un crédito no debe convertir el principal pendiente en ingreso ni borrar artificialmente los pagos históricos sin una operación explícita y auditable.

## Pruebas obligatorias

El archivo `src/__tests__/lib/credit-financial-rules.test.ts` protege estas invariantes:

1. Crédito Otorgado no cuenta como ingreso.
2. Renta normal sí cuenta como ingreso.
3. Pago de crédito permanece separado como `payment`.
4. Un pago parcial/anticipado cuenta exactamente por el monto recibido.
5. Crear un crédito de $7,200 con $0 pagado produce $0 de ingreso cobrado.

## Invariante de negocio

> **Finanzas representa dinero cobrado, no dinero comprometido o prestado.**

Cualquier cambio futuro al módulo de Créditos, Pagos, Finanzas, Dashboard o analíticas debe conservar esta regla.
