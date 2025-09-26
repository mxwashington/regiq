-- RLS Policies for Alerts - Emergency Trial Access + Future Tiered Access
-- Enables immediate data visibility for authenticated users with plan for subscription tiers

BEGIN;

-- Enable RLS on alerts table if not already enabled
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can read alerts" ON public.alerts;
DROP POLICY IF EXISTS "Admin users can modify alerts" ON public.alerts;
DROP POLICY IF EXISTS "emergency_authenticated_access" ON public.alerts;

-- EMERGENCY POLICY: All authenticated users can read alerts
-- This ensures trial users see data immediately while we implement tiered access
CREATE POLICY "emergency_authenticated_access" ON public.alerts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin write access policy
CREATE POLICY "admin_write_access" ON public.alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role has full access (for sync operations)
CREATE POLICY "service_role_full_access" ON public.alerts
  FOR ALL
  USING (current_user = 'service_role');

-- Future tiered access policy (commented out for now)
/*
-- FUTURE: Replace emergency policy with subscription-based access
CREATE POLICY "subscription_based_access" ON public.alerts
  FOR SELECT
  USING (
    -- All authenticated users get basic access
    auth.uid() IS NOT NULL
    AND (
      -- Free tier: last 30 days
      (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid()
          AND (p.subscription_tier IS NULL OR p.subscription_tier = 'free')
        )
        AND alerts.date_published >= (now() - interval '30 days')
      )
      OR
      -- Basic tier: last 90 days
      (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid()
          AND p.subscription_tier = 'basic'
        )
        AND alerts.date_published >= (now() - interval '90 days')
      )
      OR
      -- Pro/Premium tier: full history
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
        AND p.subscription_tier IN ('pro', 'premium', 'enterprise')
      )
      OR
      -- Admins get full access
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
        AND p.is_admin = true
      )
    )
  );
*/

-- Grant necessary permissions
GRANT SELECT ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;

-- Comments for future migration
COMMENT ON POLICY "emergency_authenticated_access" ON public.alerts IS
  'Emergency policy for trial access. Replace with subscription_based_access when subscription tiers are implemented.';

COMMIT;