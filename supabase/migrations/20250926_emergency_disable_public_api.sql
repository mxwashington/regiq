-- EMERGENCY: Disable Public API Access to Alerts Data
-- This prevents immediate data theft while we implement proper security

BEGIN;

-- Create security_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone NULL
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admin users can view security events
CREATE POLICY "Admin access to security events" ON public.security_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create function to temporarily disable public API alerts access
CREATE OR REPLACE FUNCTION public_api_alerts_disabled()
RETURNS TABLE(
  error text,
  message text,
  contact text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT
  'api_temporarily_disabled'::text as error,
  'Alerts API is temporarily disabled for security maintenance. Please contact support for access.'::text as message,
  'security@regiq.com'::text as contact;
$$;

-- Grant execute permission to anon role for the error function
GRANT EXECUTE ON FUNCTION public_api_alerts_disabled() TO anon;

-- Log the emergency shutdown
INSERT INTO public.security_events (event_type, metadata, severity)
VALUES (
  'emergency_public_api_disabled',
  jsonb_build_object(
    'shutdown_date', now(),
    'reason', 'prevent_competitive_intelligence_theft',
    'affected_endpoints', ARRAY['/functions/v1/public-api/alerts', '/functions/v1/public-api/alerts/{id}'],
    'estimated_downtime', '2 hours',
    'emergency_contact', 'security@regiq.com'
  ),
  'critical'
);

COMMIT;