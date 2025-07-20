-- Add dismissed_by column to alerts table for user-specific alert clearing
ALTER TABLE public.alerts 
ADD COLUMN dismissed_by uuid[] DEFAULT '{}';

-- Add index for better performance on dismissed alerts queries
CREATE INDEX idx_alerts_dismissed_by ON public.alerts USING gin(dismissed_by);

-- Update RLS policy to allow users to update dismissed_by field
DROP POLICY IF EXISTS "Users can dismiss alerts" ON public.alerts;
CREATE POLICY "Users can dismiss alerts" 
ON public.alerts 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Add function to dismiss alert for user
CREATE OR REPLACE FUNCTION public.dismiss_alert_for_user(alert_id uuid, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.alerts 
  SET dismissed_by = array_append(
    COALESCE(dismissed_by, '{}'),
    user_id
  )
  WHERE id = alert_id
  AND NOT (user_id = ANY(COALESCE(dismissed_by, '{}')));
END;
$function$;

-- Add function to clear all alerts for user  
CREATE OR REPLACE FUNCTION public.clear_all_alerts_for_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.alerts 
  SET dismissed_by = array_append(
    COALESCE(dismissed_by, '{}'),
    user_id
  )
  WHERE NOT (user_id = ANY(COALESCE(dismissed_by, '{}')))
  AND published_date >= now() - interval '30 days';
END;
$function$;