-- FleetEase: keep one authoritative plan-limit trigger per tenant resource.
-- Removes the older private triggers so Free trial expiration and quotas are
-- enforced consistently by public.enforce_company_plan_limits().

DROP TRIGGER IF EXISTS enforce_vehicle_plan_limit ON public.vehicles;
DROP TRIGGER IF EXISTS enforce_user_plan_limit ON public.users;
DROP FUNCTION IF EXISTS private.enforce_vehicle_plan_limit();
DROP FUNCTION IF EXISTS private.enforce_user_plan_limit();

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
      IF vehicle_count >= 2 THEN
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
    -- Platform superadmins do not consume a tenant's user quota.
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

DROP TRIGGER IF EXISTS trg_enforce_company_plan_limits_vehicles ON public.vehicles;
CREATE TRIGGER trg_enforce_company_plan_limits_vehicles
BEFORE INSERT OR UPDATE OF company_id, is_deleted ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.enforce_company_plan_limits();

DROP TRIGGER IF EXISTS trg_enforce_company_plan_limits_users ON public.users;
CREATE TRIGGER trg_enforce_company_plan_limits_users
BEFORE INSERT OR UPDATE OF company_id, role, is_deleted ON public.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_company_plan_limits();
