-- Update public API to check subscription-based API key access
CREATE OR REPLACE FUNCTION public.validate_enterprise_api_key(api_key_input TEXT)
RETURNS TABLE(user_id UUID, is_valid BOOLEAN, rate_limit INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to manage API keys when subscription changes
CREATE OR REPLACE FUNCTION public.handle_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger for automatic API key management
DROP TRIGGER IF EXISTS handle_subscription_change_trigger ON public.subscribers;
CREATE TRIGGER handle_subscription_change_trigger
AFTER UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_change();