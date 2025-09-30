-- ============================================================================
-- PRICING CORRECTION MIGRATION
-- Fixes annual pricing to equal exactly 10x monthly pricing
-- Adds per-seat billing metadata for Teams tier
-- ============================================================================

-- Step 1: Verify all required plans exist (fail fast if missing)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE plan_id = 'starter') THEN
    RAISE EXCEPTION 'Missing required plan: starter';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE plan_id = 'growth') THEN
    RAISE EXCEPTION 'Missing required plan: growth';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE plan_id = 'professional') THEN
    RAISE EXCEPTION 'Missing required plan: professional';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE plan_id = 'teams') THEN
    RAISE EXCEPTION 'Missing required plan: teams';
  END IF;
  
  RAISE NOTICE '✓ All required plans exist';
END $$;

-- Step 2: Add new columns for Teams tier metadata
-- ============================================================================
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS min_seats INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS per_seat_pricing BOOLEAN DEFAULT false;

-- Step 3: Fix annual pricing to equal exactly 10x monthly
-- ============================================================================
-- Growth: $29/mo → $290/yr (currently $278)
UPDATE public.plans 
SET 
  price_cents = 29000,  -- $290.00 in cents (10x $29)
  updated_at = now()
WHERE plan_id = 'growth_annual';

-- Professional: $199/mo → $1990/yr (currently $1910)
UPDATE public.plans 
SET 
  price_cents = 199000,  -- $1,990.00 in cents (10x $199)
  updated_at = now()
WHERE plan_id = 'professional_annual';

-- Teams: $49/seat/mo → $490/seat/yr (currently $470)
UPDATE public.plans 
SET 
  price_cents = 49000,  -- $490.00 in cents per seat (10x $49)
  updated_at = now()
WHERE plan_id = 'teams_annual';

-- Step 4: Update Teams tier metadata
-- ============================================================================
UPDATE public.plans 
SET 
  min_seats = 3,
  per_seat_pricing = true,
  updated_at = now()
WHERE plan_id IN ('teams', 'teams_annual');

-- Step 5: Ensure is_popular flags are correct
-- ============================================================================
-- Only Professional tiers should be marked as popular
UPDATE public.plans 
SET is_popular = false 
WHERE plan_id NOT IN ('professional', 'professional_annual');

UPDATE public.plans 
SET is_popular = true 
WHERE plan_id IN ('professional', 'professional_annual');

-- Step 6: Verification block that FAILS migration if pricing is wrong
-- ============================================================================
DO $$
DECLARE
  growth_monthly INTEGER;
  growth_annual INTEGER;
  prof_monthly INTEGER;
  prof_annual INTEGER;
  teams_monthly INTEGER;
  teams_annual INTEGER;
BEGIN
  -- Get current pricing
  SELECT price_cents INTO growth_monthly FROM public.plans WHERE plan_id = 'growth';
  SELECT price_cents INTO growth_annual FROM public.plans WHERE plan_id = 'growth_annual';
  SELECT price_cents INTO prof_monthly FROM public.plans WHERE plan_id = 'professional';
  SELECT price_cents INTO prof_annual FROM public.plans WHERE plan_id = 'professional_annual';
  SELECT price_cents INTO teams_monthly FROM public.plans WHERE plan_id = 'teams';
  SELECT price_cents INTO teams_annual FROM public.plans WHERE plan_id = 'teams_annual';
  
  -- Verify 10x formula
  IF growth_annual != growth_monthly * 10 THEN
    RAISE EXCEPTION 'Growth annual pricing formula failed: % != % * 10', growth_annual, growth_monthly;
  END IF;
  
  IF prof_annual != prof_monthly * 10 THEN
    RAISE EXCEPTION 'Professional annual pricing formula failed: % != % * 10', prof_annual, prof_monthly;
  END IF;
  
  IF teams_annual != teams_monthly * 10 THEN
    RAISE EXCEPTION 'Teams annual pricing formula failed: % != % * 10', teams_annual, teams_monthly;
  END IF;
  
  -- Log success
  RAISE NOTICE '✓ Pricing verification passed:';
  RAISE NOTICE '  Growth: $%/mo → $%/yr (10x)', growth_monthly/100, growth_annual/100;
  RAISE NOTICE '  Professional: $%/mo → $%/yr (10x)', prof_monthly/100, prof_annual/100;
  RAISE NOTICE '  Teams: $%/seat/mo → $%/seat/yr (10x)', teams_monthly/100, teams_annual/100;
END $$;

-- Step 7: Final sanity check - output current state
-- ============================================================================
SELECT 
  plan_id,
  name,
  price_cents / 100.0 AS price_dollars,
  billing_interval,
  is_popular,
  min_seats,
  per_seat_pricing
FROM public.plans 
WHERE is_active = true
ORDER BY 
  CASE 
    WHEN plan_id LIKE 'starter%' THEN 1
    WHEN plan_id LIKE 'growth%' THEN 2
    WHEN plan_id LIKE 'professional%' THEN 3
    WHEN plan_id LIKE 'teams%' THEN 4
    ELSE 5
  END,
  billing_interval;