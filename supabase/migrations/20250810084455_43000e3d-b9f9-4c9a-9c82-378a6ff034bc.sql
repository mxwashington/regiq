-- Recreate facilities table then enforcement + trigger

CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  facility_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'facilities' AND policyname = 'Organizations manage their facilities'
  ) THEN
    CREATE POLICY "Organizations manage their facilities" ON public.facilities
      FOR ALL
      USING (organization_user_id = auth.uid())
      WITH CHECK (organization_user_id = auth.uid());
  END IF;
END$$;

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

  IF max_facilities > 0 AND current_count >= max_facilities THEN
    RAISE EXCEPTION 'Facility limit (%) reached for your plan. Upgrade to add more facilities.', max_facilities;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_facility_limit'
  ) THEN
    CREATE TRIGGER trg_facility_limit
    BEFORE INSERT ON public.facilities
    FOR EACH ROW EXECUTE FUNCTION public.enforce_facility_limit();
  END IF;
END$$;