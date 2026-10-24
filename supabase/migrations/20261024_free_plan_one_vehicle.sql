-- FleetEase Free plan: enforce one vehicle and one user at the authoritative tenant trigger.
-- The legacy private.enforce_vehicle_plan_limit() function is no longer attached to the vehicles trigger.
-- Existing vehicle rows are preserved; only future inserts/assignments are constrained.

CREATE OR REPLACE FUNCTION public.enforce_company_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  vehicle_count integer;
  user_count integer;
BEGIN
  IF new.company_id IS NULL OR COALESCE(new.is_deleted, false) THEN
    RETURN new;
  END IF;

  SELECT plan, max_vehicles, max_users, subscription_status, trial_ends_at
    INTO c
  FROM public.companies
  WHERE id = new.company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la compañía.' USING errcode = '23514';
  END IF;

  IF tg_table_name = 'vehicles' THEN
    IF c.plan = 'free'::public.subscription_plan THEN
      IF c.trial_ends_at IS NOT NULL AND c.trial_ends_at <= now() THEN
        RAISE EXCEPTION 'FREE_TRIAL_EXPIRED' USING errcode = 'check_violation';
      END IF;
      SELECT count(*) INTO vehicle_count
      FROM public.vehicles
      WHERE company_id = new.company_id
        AND NOT COALESCE(is_deleted, false)
        AND id <> new.id;
      IF vehicle_count >= 1 THEN
        RAISE EXCEPTION 'FREE_PLAN_VEHICLE_LIMIT' USING errcode = 'check_violation';
      END IF;
    ELSIF c.max_vehicles IS NOT NULL AND c.max_vehicles <> -1 THEN
      SELECT count(*) INTO vehicle_count
      FROM public.vehicles
      WHERE company_id = new.company_id
        AND NOT COALESCE(is_deleted, false)
        AND id <> new.id;
      IF vehicle_count >= c.max_vehicles THEN
        RAISE EXCEPTION 'PLAN_VEHICLE_LIMIT' USING errcode = 'check_violation';
      END IF;
    END IF;
  ELSIF tg_table_name = 'users' THEN
    IF new.role = 'super_admin' THEN
      RETURN new;
    END IF;

    IF c.plan = 'free'::public.subscription_plan THEN
      IF c.trial_ends_at IS NOT NULL AND c.trial_ends_at <= now() THEN
        RAISE EXCEPTION 'FREE_TRIAL_EXPIRED' USING errcode = 'check_violation';
      END IF;
      SELECT count(*) INTO user_count
      FROM public.users
      WHERE company_id = new.company_id
        AND NOT COALESCE(is_deleted, false)
        AND role <> 'super_admin'
        AND id <> new.id;
      IF user_count >= 1 THEN
        RAISE EXCEPTION 'FREE_PLAN_USER_LIMIT' USING errcode = 'check_violation';
      END IF;
    ELSIF c.max_users IS NOT NULL AND c.max_users <> -1 THEN
      SELECT count(*) INTO user_count
      FROM public.users
      WHERE company_id = new.company_id
        AND NOT COALESCE(is_deleted, false)
        AND role <> 'super_admin'
        AND id <> new.id;
      IF user_count >= c.max_users THEN
        RAISE EXCEPTION 'PLAN_USER_LIMIT' USING errcode = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_company_plan_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_company_plan_limits() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_company_plan_limits() FROM authenticated;

-- Align Free tenant metadata without deleting or modifying existing vehicles.
UPDATE public.companies
SET max_vehicles = 1,
    max_users = 1,
    subscription_status = CASE
      WHEN subscription_status IN ('trialing', 'expired') THEN 'active'
      ELSE subscription_status
    END,
    trial_ends_at = NULL,
    updated_at = now()
WHERE plan = 'free'::public.subscription_plan
  AND COALESCE(is_deleted, false) = false;
