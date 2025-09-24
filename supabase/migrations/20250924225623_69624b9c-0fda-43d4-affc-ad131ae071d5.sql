-- Simple fix: Just update existing function without SECURITY DEFINER
-- The main function already works without SECURITY DEFINER from our previous attempt

-- Drop CASCADE only the specific functions we created incorrectly
DROP FUNCTION IF EXISTS public.update_api_keys_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_alert_rules_updated_at() CASCADE;