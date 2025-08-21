-- Create API keys table for enterprise users
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own API keys
CREATE POLICY "Users can view own API keys" ON public.api_keys
FOR SELECT
USING (auth.uid() = user_id);

-- Only enterprise users can insert API keys (will be handled by edge functions)
CREATE POLICY "System can manage API keys" ON public.api_keys
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to generate secure API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_prefix TEXT := 'regiq_';
  random_part TEXT;
BEGIN
  -- Generate a secure random string
  SELECT encode(gen_random_bytes(32), 'hex') INTO random_part;
  RETURN key_prefix || random_part;
END;
$$;

-- Function to provision API key for enterprise user
CREATE OR REPLACE FUNCTION public.provision_enterprise_api_key(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to revoke API keys for user
CREATE OR REPLACE FUNCTION public.revoke_user_api_keys(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_api_keys_updated_at();