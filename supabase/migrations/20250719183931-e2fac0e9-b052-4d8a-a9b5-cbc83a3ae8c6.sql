-- Fix the search_cache table integer overflow issue
-- The created_at field is causing out-of-range errors when storing timestamps

-- Drop the existing constraint that may be causing issues
ALTER TABLE public.search_cache ALTER COLUMN created_at TYPE timestamp with time zone;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON public.search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_search_cache_cache_key ON public.search_cache(cache_key);

-- Update the clean_expired_cache function to be more efficient
CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  DELETE FROM public.search_cache 
  WHERE expires_at < NOW() - INTERVAL '1 hour'
  AND created_at < NOW() - INTERVAL '1 day';
$function$;