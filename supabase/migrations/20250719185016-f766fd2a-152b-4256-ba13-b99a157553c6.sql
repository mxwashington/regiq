-- Create cookie_consents table that was missing
CREATE TABLE IF NOT EXISTS public.cookie_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL,
  visitor_id text NULL,
  essential boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  functional boolean NOT NULL DEFAULT false,
  ip_address inet NULL,
  user_agent text NULL,
  consent_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + INTERVAL '1 year'),
  
  CONSTRAINT cookie_consents_user_or_visitor_check 
    CHECK (user_id IS NOT NULL OR visitor_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

-- Create policies for cookie consents
CREATE POLICY "Users can manage their own cookie preferences" 
ON public.cookie_consents 
FOR ALL 
USING (
  auth.uid() = user_id OR 
  (user_id IS NULL AND visitor_id IS NOT NULL)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cookie_consents_user_id ON public.cookie_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_visitor_id ON public.cookie_consents(visitor_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_expires_at ON public.cookie_consents(expires_at);

-- Add trigger for updated_at
CREATE TRIGGER update_cookie_consents_updated_at
BEFORE UPDATE ON public.cookie_consents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();