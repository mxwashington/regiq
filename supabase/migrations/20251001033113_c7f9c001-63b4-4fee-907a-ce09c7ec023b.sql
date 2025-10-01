-- Fix RLS policy on alerts table to ensure admins always have full access
-- Drop the problematic policy that may be blocking admin access
DROP POLICY IF EXISTS "Users can view alerts based on subscription" ON public.alerts;

-- Create improved RLS policy with proper admin access
CREATE POLICY "Users can view alerts based on subscription and role"
ON public.alerts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins can see everything
    is_admin(auth.uid())
    OR
    -- Active subscribers can see all alerts
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.subscription_status = 'active'
    )
    OR
    -- Trial users can only see High/Critical urgency
    (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() 
        AND p.subscription_status = 'trial'
      )
      AND urgency IN ('High', 'Critical')
    )
  )
);

-- Add index to improve query performance
CREATE INDEX IF NOT EXISTS idx_alerts_urgency ON public.alerts(urgency);
CREATE INDEX IF NOT EXISTS idx_alerts_source_published ON public.alerts(source, published_date DESC);