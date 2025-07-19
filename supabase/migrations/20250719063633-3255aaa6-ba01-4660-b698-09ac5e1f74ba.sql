-- Create search cache table for Perplexity results
CREATE TABLE public.search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  query TEXT NOT NULL,
  result_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for cache key lookup
CREATE INDEX idx_search_cache_key ON public.search_cache(cache_key);
CREATE INDEX idx_search_cache_expires ON public.search_cache(expires_at);

-- Create Perplexity searches tracking table
CREATE TABLE public.perplexity_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  search_type TEXT CHECK (search_type IN ('general', 'recalls', 'deadlines', 'guidance')) DEFAULT 'general',
  agencies TEXT[] DEFAULT '{}',
  industry TEXT,
  tokens_used INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for search tracking
ALTER TABLE public.perplexity_searches ENABLE ROW LEVEL SECURITY;

-- Create policies for search tracking
CREATE POLICY "Users can view their own searches" ON public.perplexity_searches
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches" ON public.perplexity_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all searches
CREATE POLICY "Admins can view all searches" ON public.perplexity_searches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.search_cache WHERE expires_at < NOW();
$$;

-- Create index for user searches
CREATE INDEX idx_perplexity_searches_user_date ON public.perplexity_searches(user_id, created_at);
CREATE INDEX idx_perplexity_searches_type ON public.perplexity_searches(search_type);