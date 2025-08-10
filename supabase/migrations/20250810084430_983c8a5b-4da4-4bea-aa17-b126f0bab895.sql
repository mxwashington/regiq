-- Fix RAISE placeholders in enforcement functions

CREATE OR REPLACE FUNCTION public.enforce_facility_limit()
RETURNS trigger AS $$
DECLARE
  current_count INTEGER;
  max_facilities INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.facilities
  WHERE organization_user_id = NEW.organization_user_id;

  SELECT COALESCE((plan_limits->>'facilities')::INTEGER, 1) INTO max_facilities
  FROM public.profiles
  WHERE user_id = NEW.organization_user_id;

  -- Negative or zero means unlimited
  IF max_facilities > 0 AND current_count >= max_facilities THEN
    RAISE EXCEPTION 'Facility limit (%) reached for your plan. Upgrade to add more facilities.', max_facilities;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.enforce_supplier_watch_limit()
RETURNS trigger AS $$
DECLARE
  current_count INTEGER;
  max_suppliers INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.supplier_watches
  WHERE user_id = NEW.user_id;

  SELECT COALESCE((plan_limits->>'suppliers')::INTEGER, 25) INTO max_suppliers
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Negative or zero means unlimited
  IF max_suppliers > 0 AND current_count >= max_suppliers THEN
    RAISE EXCEPTION 'Supplier watch limit (%) reached for your plan. Upgrade to monitor more suppliers.', max_suppliers;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Ensure triggers exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_facility_limit'
  ) THEN
    CREATE TRIGGER trg_facility_limit
    BEFORE INSERT ON public.facilities
    FOR EACH ROW EXECUTE FUNCTION public.enforce_facility_limit();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_supplier_watch_limit'
  ) THEN
    CREATE TRIGGER trg_supplier_watch_limit
    BEFORE INSERT ON public.supplier_watches
    FOR EACH ROW EXECUTE FUNCTION public.enforce_supplier_watch_limit();
  END IF;
END$$;