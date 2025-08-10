-- 1) Add plan management to profiles table
-- Use existing public.profiles and subscribers tables

-- Add subscription_plan and plan_limits to profiles if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_plan TEXT CHECK (subscription_plan IN ('starter','professional','enterprise')) DEFAULT 'starter';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan_limits JSONB DEFAULT '{
  "facilities": 1,
  "users": 3,
  "suppliers": 5,
  "queries_per_month": 200,
  "history_months": 6,
  "exports_per_month": 10,
  "api_access": false,
  "sso_enabled": false
}';

-- Map existing subscribers to plans and set appropriate limits
-- Note: subscribers.subscription_tier uses Basic/Premium/Enterprise naming
UPDATE public.profiles p
SET 
  subscription_plan = CASE
    WHEN s.subscription_tier ILIKE 'Enterprise' THEN 'enterprise'
    WHEN s.subscription_tier ILIKE 'Premium' THEN 'professional'
    WHEN s.subscription_tier ILIKE 'Basic' THEN 'starter'
    ELSE COALESCE(p.subscription_plan, 'starter')
  END,
  plan_limits = CASE
    WHEN s.subscription_tier ILIKE 'Enterprise' THEN '{
      "facilities": -1,
      "users": -1,
      "suppliers": -1,
      "queries_per_month": -1,
      "history_months": -1,
      "exports_per_month": -1,
      "api_access": "full",
      "sso_enabled": true
    }'::jsonb
    WHEN s.subscription_tier ILIKE 'Premium' THEN '{
      "facilities": 3,
      "users": 10,
      "suppliers": 25,
      "queries_per_month": 1000,
      "history_months": 12,
      "exports_per_month": -1,
      "api_access": "readonly",
      "sso_enabled": false
    }'::jsonb
    WHEN s.subscription_tier ILIKE 'Basic' THEN '{
      "facilities": 1,
      "users": 3,
      "suppliers": 5,
      "queries_per_month": 200,
      "history_months": 6,
      "exports_per_month": 10,
      "api_access": false,
      "sso_enabled": false
    }'::jsonb
    ELSE p.plan_limits
  END
FROM public.subscribers s
WHERE (s.user_id IS NOT NULL AND s.user_id = p.user_id)
   OR (s.user_id IS NULL AND s.email = p.email);

-- 2) Facilities table (organization-scoped)
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  facility_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- Allow users to fully manage their own org facilities
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

-- 2a) Enforce facility limit by plan
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
    RAISE EXCEPTION 'Facility limit (%%) reached for your plan. Upgrade to add more facilities.', max_facilities;
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

-- 3) Update supplier watch limit enforcement to be plan-aware
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
    RAISE EXCEPTION 'Supplier watch limit (%%) reached for your plan. Upgrade to monitor more suppliers.', max_suppliers;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Ensure trigger exists on supplier_watches insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_supplier_watch_limit'
  ) THEN
    CREATE TRIGGER trg_supplier_watch_limit
    BEFORE INSERT ON public.supplier_watches
    FOR EACH ROW EXECUTE FUNCTION public.enforce_supplier_watch_limit();
  END IF;
END$$;