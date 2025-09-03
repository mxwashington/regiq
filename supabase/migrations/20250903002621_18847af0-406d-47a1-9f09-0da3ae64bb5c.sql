-- Fix remaining security warnings: Function Search Path Mutable

-- Update functions to have proper search_path settings for security
-- This prevents SQL injection attacks through search_path manipulation

-- Fix generate_api_key function
DROP FUNCTION IF EXISTS public.generate_api_key();
CREATE OR REPLACE FUNCTION public.generate_api_key()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  key_prefix TEXT := 'regiq_';
  random_part TEXT;
BEGIN
  -- Generate a secure random string
  SELECT encode(gen_random_bytes(32), 'hex') INTO random_part;
  RETURN key_prefix || random_part;
END;
$function$;

-- Fix provision_enterprise_api_key function
DROP FUNCTION IF EXISTS public.provision_enterprise_api_key(uuid);
CREATE OR REPLACE FUNCTION public.provision_enterprise_api_key(target_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  new_api_key TEXT;
  user_subscription_tier TEXT;
BEGIN
  -- Check if user has enterprise subscription
  SELECT subscription_tier INTO user_subscription_tier
  FROM public.subscribers 
  WHERE user_id = target_user_id AND subscribed = true;
  
  IF user_subscription_tier != 'enterprise' THEN
    RAISE EXCEPTION 'User does not have enterprise subscription';
  END IF;
  
  -- Generate new API key
  SELECT generate_api_key() INTO new_api_key;
  
  -- Insert API key record
  INSERT INTO public.api_keys (user_id, key_name, api_key, is_active)
  VALUES (target_user_id, 'Enterprise API Key', new_api_key, true);
  
  RETURN new_api_key;
END;
$function$;

-- Fix revoke_user_api_keys function
DROP FUNCTION IF EXISTS public.revoke_user_api_keys(uuid);
CREATE OR REPLACE FUNCTION public.revoke_user_api_keys(target_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  revoked_count INTEGER;
BEGIN
  -- Deactivate all API keys for the user
  UPDATE public.api_keys 
  SET is_active = false, updated_at = now()
  WHERE user_id = target_user_id AND is_active = true;
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  RETURN revoked_count;
END;
$function$;

-- Fix validate_enterprise_api_key function
DROP FUNCTION IF EXISTS public.validate_enterprise_api_key(text);
CREATE OR REPLACE FUNCTION public.validate_enterprise_api_key(api_key_input text)
 RETURNS TABLE(user_id uuid, is_valid boolean, rate_limit integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  key_record RECORD;
  subscription_record RECORD;
BEGIN
  -- Check if API key exists and is active
  SELECT ak.user_id, ak.is_active, ak.rate_limit_per_hour, ak.usage_count
  INTO key_record
  FROM public.api_keys ak
  WHERE ak.api_key = api_key_input AND ak.is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, false, 0;
    RETURN;
  END IF;
  
  -- Check if user has active enterprise subscription
  SELECT s.subscribed, s.subscription_tier
  INTO subscription_record
  FROM public.subscribers s
  WHERE s.user_id = key_record.user_id;
  
  IF NOT FOUND OR NOT subscription_record.subscribed OR subscription_record.subscription_tier != 'enterprise' THEN
    RETURN QUERY SELECT key_record.user_id, false, 0;
    RETURN;
  END IF;
  
  -- Update last used timestamp and usage count
  UPDATE public.api_keys 
  SET last_used_at = now(), usage_count = usage_count + 1
  WHERE api_key = api_key_input;
  
  RETURN QUERY SELECT key_record.user_id, true, key_record.rate_limit_per_hour;
END;
$function$;

-- Fix handle_subscription_change function
DROP FUNCTION IF EXISTS public.handle_subscription_change();
CREATE OR REPLACE FUNCTION public.handle_subscription_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- If user upgraded to enterprise, provision API key
  IF NEW.subscription_tier = 'enterprise' AND NEW.subscribed = true AND 
     (OLD.subscription_tier IS NULL OR OLD.subscription_tier != 'enterprise' OR NOT OLD.subscribed) THEN
    
    -- Check if user doesn't already have an active API key
    IF NOT EXISTS (SELECT 1 FROM public.api_keys WHERE user_id = NEW.user_id AND is_active = true) THEN
      PERFORM public.provision_enterprise_api_key(NEW.user_id);
    END IF;
    
  -- If user downgraded from enterprise or unsubscribed, revoke API keys
  ELSIF (OLD.subscription_tier = 'enterprise' AND OLD.subscribed = true) AND 
        (NEW.subscription_tier != 'enterprise' OR NOT NEW.subscribed) THEN
    
    PERFORM public.revoke_user_api_keys(NEW.user_id);
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_api_keys_updated_at function
DROP FUNCTION IF EXISTS public.update_api_keys_updated_at();
CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;