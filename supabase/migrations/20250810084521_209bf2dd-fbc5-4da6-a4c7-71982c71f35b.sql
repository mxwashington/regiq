-- Ensure plan columns exist on profiles and backfill from subscribers
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

-- Ensure supplier limit enforcement function/trigger are updated and present
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

  IF max_suppliers > 0 AND current_count >= max_suppliers THEN
    RAISE EXCEPTION 'Supplier watch limit (%) reached for your plan. Upgrade to monitor more suppliers.', max_suppliers;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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