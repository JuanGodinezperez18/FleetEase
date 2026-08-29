-- =====================================================
-- 002: Detalles de entrega en vehicle_assignment_logs
-- =====================================================
-- Contexto: se agrega el submódulo "Asignaciones" dentro de Vehículos
-- (historial de qué cliente tuvo cada vehículo y cuándo, usado entre
-- otras cosas para poder ubicar quién tenía la unidad asignada en la
-- fecha de una multa). La tabla vehicle_assignment_logs ya existía
-- (con RLS de SELECT/INSERT ya configurado en 001), pero nunca se
-- insertaba en ella desde la app - este cambio agrega los campos que
-- necesita el formulario de nueva asignación: kilometraje y nivel de
-- combustible al momento de la entrega, notas de condición del
-- vehículo, y las fotos de entrega (mismo patrón jsonb que ya usa
-- vehicle_inspections.photos).

DO $$ BEGIN
IF table_exists('vehicle_assignment_logs') THEN

  ALTER TABLE vehicle_assignment_logs
    ADD COLUMN IF NOT EXISTS odometer_reading numeric,
    ADD COLUMN IF NOT EXISTS fuel_level text,
    ADD COLUMN IF NOT EXISTS condition_notes text,
    ADD COLUMN IF NOT EXISTS photos jsonb;

  -- Historial por vehículo ordenado por fecha: es la consulta central
  -- del submódulo (¿quién tenía este vehículo en tal fecha?).
  CREATE INDEX IF NOT EXISTS idx_vehicle_assignment_logs_vehicle_date
    ON vehicle_assignment_logs (vehicle_id, assigned_at DESC);

  CREATE INDEX IF NOT EXISTS idx_vehicle_assignment_logs_client
    ON vehicle_assignment_logs (client_id);

  -- Antes solo existían políticas de SELECT/INSERT: no había forma de
  -- cerrar una asignación (fijar unassigned_at) sin usar la service role
  -- key. Se agrega UPDATE con el mismo criterio de aislamiento por
  -- empresa que ya usan SELECT/INSERT.
  DROP POLICY IF EXISTS "Users can update assignment logs in their company" ON vehicle_assignment_logs;
  CREATE POLICY "Users can update assignment logs in their company"
    ON vehicle_assignment_logs FOR UPDATE
    USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
    WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

END IF; END $$;
