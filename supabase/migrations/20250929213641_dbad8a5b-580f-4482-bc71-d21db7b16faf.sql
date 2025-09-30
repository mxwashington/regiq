-- First, add is_popular column to plans table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'plans' AND column_name = 'is_popular') THEN
        ALTER TABLE public.plans ADD COLUMN is_popular boolean DEFAULT false;
    END IF;
END $$;

-- Update Starter monthly to be free
UPDATE public.plans 
SET 
  price_cents = 0,
  description = 'Perfect for individual users getting started with compliance',
  is_popular = false,
  updated_at = now()
WHERE plan_id = 'starter' AND billing_interval = 'monthly';

-- Add Starter annual (free)
INSERT INTO public.plans (plan_id, name, price_cents, billing_interval, description, is_popular, is_active)
VALUES ('starter_annual', 'Starter', 0, 'yearly', 'Perfect for individual users getting started with compliance', false, true)
ON CONFLICT (id) DO NOTHING;

-- Add Growth monthly ($29)
INSERT INTO public.plans (plan_id, name, price_cents, billing_interval, description, is_popular, is_active)
VALUES ('growth', 'Growth', 2900, 'monthly', 'Ideal for individual compliance professionals and consultants', false, true);

-- Add Growth annual ($278 = 20% off $348)
INSERT INTO public.plans (plan_id, name, price_cents, billing_interval, description, is_popular, is_active)
VALUES ('growth_annual', 'Growth', 27800, 'yearly', 'Ideal for individual compliance professionals and consultants', false, true);

-- Update Professional monthly to $199
UPDATE public.plans
SET
  price_cents = 19900,
  description = 'Enterprise-ready for power users with premium support',
  is_popular = true,
  updated_at = now()
WHERE plan_id = 'professional' AND billing_interval = 'monthly';

-- Add Professional annual ($1910 = 20% off $2388)
INSERT INTO public.plans (plan_id, name, price_cents, billing_interval, description, is_popular, is_active)
VALUES ('professional_annual', 'Professional', 191000, 'yearly', 'Enterprise-ready for power users with premium support', true, true);

-- Add Teams monthly ($49 per seat)
INSERT INTO public.plans (plan_id, name, price_cents, billing_interval, description, is_popular, is_active)
VALUES ('teams', 'Teams', 4900, 'monthly', 'For compliance teams managing multiple sites or departments (per seat, 3 seat minimum)', false, true);

-- Add Teams annual ($470 per seat = 20% off $588)
INSERT INTO public.plans (plan_id, name, price_cents, billing_interval, description, is_popular, is_active)
VALUES ('teams_annual', 'Teams', 47000, 'yearly', 'For compliance teams managing multiple sites or departments (per seat, 3 seat minimum)', false, true);

-- Deactivate old enterprise tier
UPDATE public.plans SET is_active = false WHERE plan_id = 'enterprise';